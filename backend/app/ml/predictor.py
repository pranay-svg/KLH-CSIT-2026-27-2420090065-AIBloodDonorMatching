"""
Donor Response Predictor Module.

ACADEMIC DEMONSTRATION NOTICE:
Predicts estimated probability of donor dispatch acceptance for coordination purposes.
Does not make clinical transfusion decisions.
"""

import os
import logging
from typing import Dict, Any, Optional
import joblib
import pandas as pd
from datetime import datetime

logger = logging.getLogger(__name__)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(CURRENT_DIR, "donor_response_model.joblib")

_CACHED_MODEL = None


def get_model():
    """Returns the cached ML model pipeline, loading or training it if necessary."""
    global _CACHED_MODEL
    if _CACHED_MODEL is not None:
        return _CACHED_MODEL

    if os.path.exists(MODEL_FILE):
        try:
            _CACHED_MODEL = joblib.load(MODEL_FILE)
            logger.info("Loaded cached Donor Response ML model pipeline.")
            return _CACHED_MODEL
        except Exception as e:
            logger.warning(f"Error loading existing model ({e}). Re-training pipeline...")

    # If model file does not exist or failed to load, train it
    from app.ml.train_model import train_and_save_model
    train_and_save_model()
    _CACHED_MODEL = joblib.load(MODEL_FILE)
    return _CACHED_MODEL


def predict_response_probability(features: Dict[str, Any]) -> float:
    """
    Accepts donor and request features and returns estimated response probability (0.0 to 1.0).

    Expected features:
    - distance_km (float)
    - donation_count (int)
    - historical_acceptance_rate (float)
    - avg_response_time_mins (float)
    - days_since_last_donation (int)
    - urgency_level (str: 'Routine', 'Urgent', or 'Critical')
    - time_of_day (int: 0 to 23, optional - defaults to current UTC/local hour)
    """
    model = get_model()

    time_of_day = features.get("time_of_day")
    if time_of_day is None:
        time_of_day = datetime.now().hour

    urgency_level = str(features.get("urgency_level", "Urgent")).capitalize()
    if urgency_level not in ["Routine", "Urgent", "Critical"]:
        urgency_level = "Urgent"

    feature_row = {
        "distance_km": float(features.get("distance_km", 10.0)),
        "donation_count": int(features.get("donation_count", 3)),
        "historical_acceptance_rate": float(features.get("historical_acceptance_rate", 0.85)),
        "avg_response_time_mins": float(features.get("avg_response_time_mins", 15.0)),
        "days_since_last_donation": int(features.get("days_since_last_donation", 90)),
        "urgency_level": urgency_level,
        "time_of_day": int(time_of_day),
    }

    df_input = pd.DataFrame([feature_row])
    
    try:
        probabilities = model.predict_proba(df_input)
        prob = float(probabilities[0][1])
        # Ensure strict bounds [0.0, 1.0]
        prob = max(0.0, min(1.0, prob))
        return round(prob, 4)
    except Exception as e:
        logger.error(f"Error during ML prediction: {e}. Falling back to heuristic probability.")
        # Safe fallback based on historical rate
        hist_rate = float(features.get("historical_acceptance_rate", 0.75))
        return round(max(0.0, min(1.0, hist_rate)), 4)
