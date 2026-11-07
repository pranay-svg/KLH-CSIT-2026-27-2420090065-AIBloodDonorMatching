"""
Matching and Adaptive Recommendations Router.

ACADEMIC DEMONSTRATION NOTICE:
Provides decision-support ranking recommendations for hospital/blood bank personnel.
Not a clinical transfusion decision engine.
"""

import time
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Path, Query, status

from app.database import get_db
from app.models.match import MatchResponse
from app.services.adaptive_engine import (
    rank_donors_for_emergency,
    get_weights_for_emergency,
    ADAPTIVE_WEIGHTS
)
from app.metrics import MATCHING_REQUESTS_TOTAL, MATCHING_DURATION_SECONDS

router = APIRouter(prefix="/api/matching", tags=["Donor Matching & Adaptation Engine"])


@router.get("/weights", response_model=Dict[str, Dict[str, float]])
async def get_all_adaptive_weights():
    """
    Returns the configured adaptive Multi-Criteria Decision Making (MCDM) weights
    for all supported emergency levels (Routine, Urgent, Critical).
    """
    return ADAPTIVE_WEIGHTS


@router.get("/weights/{emergency_level}", response_model=Dict[str, float])
async def get_emergency_weights(
    emergency_level: str = Path(..., description="Emergency level: Routine, Urgent, or Critical")
):
    """
    Returns the active MCDM weights for a specific emergency level.
    """
    level_normalized = emergency_level.strip().capitalize()
    if level_normalized not in ADAPTIVE_WEIGHTS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Emergency level '{emergency_level}' not recognized. Must be one of: {list(ADAPTIVE_WEIGHTS.keys())}"
        )
    return get_weights_for_emergency(level_normalized)


@router.get("/{emergency_id}", response_model=MatchResponse)
async def get_matching_recommendations(
    emergency_id: str = Path(..., description="Unique ID of the emergency blood request")
):
    """
    Adaptive Donor Matching & Ranking Endpoint.

    Workflow:
    1. Loads emergency blood request from database.
    2. Loads candidate donor pool.
    3. Evaluates biological compatibility (ABO/Rh matrix).
    4. Computes Haversine distance and transit ETA.
    5. Predicts donor dispatch response probability via Scikit-learn model.
    6. Calculates donor fatigue score from donation recency.
    7. Selects contextual adaptive weights for the emergency level.
    8. Calculates composite MCDM priority score.
    9. Ranks donors and generates explainable recommendation rationale.
    10. Returns ranked MatchResponse payload.
    """
    db = get_db()
    if not db:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection is currently unavailable."
        )

    # 1. Load the emergency request
    emergency = await db.emergencies.find_one({"id": emergency_id})
    if not emergency:
        emergency = await db.emergencies.find_one({"_id": emergency_id})
    if not emergency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Emergency blood request with ID '{emergency_id}' was not found."
        )

    # 2. Load donors from the database
    donors = await db.donors.find({})

    # 3 - 10. Run the Adaptive MCDM Engine with latency and throughput instrumentation
    start_time = time.perf_counter()
    match_response = rank_donors_for_emergency(emergency=emergency, donors=donors)
    calc_duration = time.perf_counter() - start_time

    emg_level = match_response.emergency_level or "Unknown"
    MATCHING_REQUESTS_TOTAL.labels(emergency_level=emg_level).inc()
    MATCHING_DURATION_SECONDS.labels(emergency_level=emg_level).observe(calc_duration)

    return match_response
