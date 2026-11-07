"""
Donor Response Prediction Model Training Module.

ACADEMIC DEMONSTRATION NOTICE:
Trained on synthetic donor behavior data for research and software demonstration.
This model calculates estimated response probabilities for coordination purposes.
It does NOT make clinical transfusion decisions.
"""

import os
import json
import logging
import joblib
import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    classification_report
)

from app.ml.synthetic_data_generator import generate_synthetic_donor_data

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Paths
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATA_PATH = os.path.join(CURRENT_DIR, "data", "synthetic_donor_responses.csv")
DEFAULT_MODEL_PATH = os.path.join(CURRENT_DIR, "donor_response_model.joblib")
DEFAULT_METRICS_PATH = os.path.join(CURRENT_DIR, "model_metrics.json")

NUMERICAL_FEATURES = [
    "distance_km",
    "donation_count",
    "historical_acceptance_rate",
    "avg_response_time_mins",
    "days_since_last_donation",
    "time_of_day",
]

CATEGORICAL_FEATURES = [
    "urgency_level",
]

ALL_FEATURE_COLUMNS = NUMERICAL_FEATURES + CATEGORICAL_FEATURES
TARGET_COLUMN = "responded"


def build_pipeline() -> Pipeline:
    """Builds an explainable Scikit-learn Pipeline with preprocessing and RandomForestClassifier."""
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERICAL_FEATURES),
            ("cat", OneHotEncoder(categories=[["Routine", "Urgent", "Critical"]], handle_unknown="ignore"), CATEGORICAL_FEATURES),
        ]
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=100,
                    max_depth=6,
                    min_samples_split=5,
                    min_samples_leaf=2,
                    random_state=42,
                    class_weight="balanced"
                ),
            ),
        ]
    )
    return pipeline


def train_and_save_model(
    data_path: str = DEFAULT_DATA_PATH,
    model_path: str = DEFAULT_MODEL_PATH,
    metrics_path: str = DEFAULT_METRICS_PATH,
    num_synthetic_samples: int = 1500
) -> dict:
    """
    Loads or generates the synthetic dataset, splits into train/test,
    trains the RandomForestClassifier, calculates honest evaluation metrics,
    and serializes the pipeline using joblib.
    """
    logger.info("Initializing Donor Response ML Model Training...")

    if not os.path.exists(data_path):
        logger.info(f"Synthetic dataset not found at {data_path}. Generating {num_synthetic_samples} samples...")
        df = generate_synthetic_donor_data(num_samples=num_synthetic_samples, output_filepath=data_path)
    else:
        logger.info(f"Loading existing synthetic dataset from {data_path}...")
        df = pd.read_csv(data_path)

    logger.info(f"Loaded dataset: {len(df)} total records. Positive response rate: {df[TARGET_COLUMN].mean():.2%}")

    X = df[ALL_FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]

    # Stratified Train / Test Split (80% train / 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    # Actual Evaluation Metrics on held-out test set
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "precision": round(float(precision_score(y_test, y_pred)), 4),
        "recall": round(float(recall_score(y_test, y_pred)), 4),
        "f1_score": round(float(f1_score(y_test, y_pred)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
        "test_sample_count": len(y_test),
        "train_sample_count": len(y_train),
        "model_type": "RandomForestClassifier",
        "features": ALL_FEATURE_COLUMNS,
    }

    # Save trained pipeline model
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(pipeline, model_path)
    logger.info(f"Saved trained ML model to: {model_path}")

    # Save metrics report
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    logger.info(f"Saved evaluation metrics to: {metrics_path}")

    # MLflow Experiment Tracking Integration
    try:
        import mlflow
        import mlflow.sklearn

        # Configure tracking URI (SQLite database backend for modern MLflow 3.x)
        os.environ.setdefault("MLFLOW_ALLOW_FILE_STORE", "true")
        tracking_uri = os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlflow.db")
        mlflow.set_tracking_uri(tracking_uri)
        mlflow.set_experiment("blood_donor_matching_mlops")

        with mlflow.start_run(run_name="RandomForest_Response_Predictor"):
            mlflow.log_param("model_type", metrics["model_type"])
            mlflow.log_param("n_estimators", 100)
            mlflow.log_param("max_depth", 6)
            mlflow.log_param("min_samples_split", 5)
            mlflow.log_param("min_samples_leaf", 2)
            mlflow.log_param("random_state", 42)
            mlflow.log_param("class_weight", "balanced")
            mlflow.log_param("test_split", 0.20)
            mlflow.log_param("train_sample_count", metrics["train_sample_count"])
            mlflow.log_param("test_sample_count", metrics["test_sample_count"])
            mlflow.log_param("features", ",".join(ALL_FEATURE_COLUMNS))

            mlflow.log_metric("accuracy", metrics["accuracy"])
            mlflow.log_metric("precision", metrics["precision"])
            mlflow.log_metric("recall", metrics["recall"])
            mlflow.log_metric("f1_score", metrics["f1_score"])
            mlflow.log_metric("roc_auc", metrics["roc_auc"])

            mlflow.sklearn.log_model(pipeline, "donor_response_model")
            logger.info("Successfully recorded experiment run and model artifacts to MLflow.")
    except Exception as exc:
        logger.warning(f"MLflow tracking skipped or non-fatal: {exc}")

    print("\n" + "=" * 55)
    print("      DONOR RESPONSE ML MODEL EVALUATION METRICS     ")
    print("=" * 55)
    print(f" Model Type  : {metrics['model_type']} (Explainable Ensemble)")
    print(f" Train Samples: {metrics['train_sample_count']}")
    print(f" Test Samples : {metrics['test_sample_count']}")
    print("-" * 55)
    print(f" Accuracy    : {metrics['accuracy']:.4f} ({metrics['accuracy'] * 100:.2f}%)")
    print(f" Precision   : {metrics['precision']:.4f}")
    print(f" Recall      : {metrics['recall']:.4f}")
    print(f" F1-Score    : {metrics['f1_score']:.4f}")
    print(f" ROC-AUC     : {metrics['roc_auc']:.4f}")
    print("=" * 55 + "\n")

    return metrics


if __name__ == "__main__":
    train_and_save_model()
