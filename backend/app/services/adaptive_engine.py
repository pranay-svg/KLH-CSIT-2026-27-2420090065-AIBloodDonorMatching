"""
Adaptive Multi-Criteria Decision Making (MCDM) Donor Matching Engine.

ACADEMIC DEMONSTRATION NOTICE:
This engine ranks blood donors using context-aware adaptive weighting (MCDM)
for academic research and software demonstration.
It does NOT make clinical transfusion decisions. Final biological eligibility
and transfusion decisions must always be verified by authorized clinical personnel.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

from app.services.compatibility import check_compatibility
from app.services.geo_service import calculate_distance_and_eta, calculate_haversine_distance, estimate_travel_time_mins
from app.ml.predictor import predict_response_probability
from app.models.match import MatchResult, MatchResponse, ScoreBreakdown

logger = logging.getLogger(__name__)

# Configurable Initial Demonstration Weights by Emergency Level
# Criteria: compatibility, distance, ml_response, fatigue
ADAPTIVE_WEIGHTS: Dict[str, Dict[str, float]] = {
    "Routine": {
        "compatibility": 0.40,
        "distance": 0.20,
        "ml_response": 0.20,
        "fatigue": 0.20,
    },
    "Urgent": {
        "compatibility": 0.30,
        "distance": 0.35,
        "ml_response": 0.25,
        "fatigue": 0.10,
    },
    "Critical": {
        "compatibility": 0.20,
        "distance": 0.50,
        "ml_response": 0.25,
        "fatigue": 0.05,
    },
}

# Configurable Parameters
MAX_SERVICE_RADIUS_KM = 35.0  # Distance at which distance_score decays to 0.0
MIN_DONATION_INTERVAL_DAYS = 56  # Standard whole-blood recovery window (max fatigue if < 56)
FULL_RECOVERY_DAYS = 180  # Days after which fatigue score reaches 0.0


def get_weights_for_emergency(emergency_level: str) -> Dict[str, float]:
    """Returns the configurable adaptive weights dictionary for the requested emergency level."""
    normalized_level = emergency_level.strip().capitalize()
    return ADAPTIVE_WEIGHTS.get(normalized_level, ADAPTIVE_WEIGHTS["Urgent"]).copy()


def calculate_distance_score(distance_km: float, max_radius: float = MAX_SERVICE_RADIUS_KM) -> float:
    """
    Computes normalized proximity score [0.0 - 1.0] using linear decay.
    0 km -> 1.0
    17.5 km -> 0.5
    >= 35 km -> 0.0
    """
    if distance_km <= 0:
        return 1.0
    if distance_km >= max_radius:
        return 0.0
    score = 1.0 - (distance_km / max_radius)
    return round(float(score), 4)


def calculate_fatigue_score(
    days_since_last_donation: int,
    min_interval: int = MIN_DONATION_INTERVAL_DAYS,
    full_recovery: int = FULL_RECOVERY_DAYS
) -> float:
    """
    Computes normalized fatigue score [0.0 - 1.0].
    Higher fatigue means the donor donated recently and should be given a penalty
    to protect donor welfare and prevent volunteer fatigue.
    - days <= 56: fatigue = 1.0 (maximum fatigue)
    - days >= 180: fatigue = 0.0 (fully rested)
    - in between: linear decrease
    """
    if days_since_last_donation <= min_interval:
        return 1.0
    if days_since_last_donation >= full_recovery:
        return 0.0
    
    # Scale from 1.0 (at min_interval) down to 0.0 (at full_recovery)
    fatigue = (full_recovery - days_since_last_donation) / (full_recovery - min_interval)
    return round(float(fatigue), 4)


def generate_recommendation_explanation(
    rank: int,
    emergency_level: str,
    donor_name: str,
    donor_blood_group: str,
    recipient_blood_group: str,
    compatibility_score: float,
    compat_explanation: str,
    distance_km: float,
    estimated_arrival_mins: float,
    response_prob: float,
    fatigue_score: float,
    priority_score: float
) -> str:
    """
    Constructs an explainable, human-readable rationale for the assigned donor ranking.
    Ensures complete transparency of AI and MCDM factors without black-box decisions.
    """
    level = emergency_level.capitalize()

    # Proximity descriptor
    if distance_km <= 5.0:
        prox_text = f"close to hospital ({distance_km:.1f} km, ~{estimated_arrival_mins:.0f}m ETA)"
    elif distance_km <= 15.0:
        prox_text = f"within moderate range ({distance_km:.1f} km, ~{estimated_arrival_mins:.0f}m ETA)"
    else:
        prox_text = f"farther from hospital ({distance_km:.1f} km, ~{estimated_arrival_mins:.0f}m ETA)"

    # ML response descriptor
    if response_prob >= 0.70:
        ml_text = f"high predicted response probability ({response_prob:.1%})"
    elif response_prob >= 0.50:
        ml_text = f"moderate predicted response probability ({response_prob:.1%})"
    else:
        ml_text = f"lower predicted response probability ({response_prob:.1%})"

    # Compatibility descriptor
    if compatibility_score >= 1.0:
        comp_text = f"exact ABO/Rh match ({donor_blood_group})"
    else:
        comp_text = f"compatible alternative ({donor_blood_group} for {recipient_blood_group})"

    # Fatigue / recovery descriptor
    if fatigue_score <= 0.15:
        fatigue_text = "optimal rest recovery (no fatigue)"
    elif fatigue_score <= 0.50:
        fatigue_text = "sufficient rest recovery"
    else:
        fatigue_text = "recent donation fatigue penalty"

    if rank == 1:
        if level == "Critical":
            return (
                f"Ranked #1 (Top Recommendation) for Critical Emergency: Strongly prioritized due to {prox_text} "
                f"and {ml_text}. Biologically verified {comp_text} with {fatigue_text}."
            )
        elif level == "Routine":
            return (
                f"Ranked #1 (Top Recommendation) for Routine Request: Prioritizes donor fairness and biological suitability "
                f"with {comp_text}, {fatigue_text}, and {prox_text}."
            )
        else:
            return (
                f"Ranked #1 (Top Recommendation) for Urgent Emergency: Highest priority match with {comp_text}, "
                f"{prox_text}, and {ml_text}."
            )
    elif rank <= 3:
        return (
            f"Ranked #{rank} (Top Tier) under {level} triage: Recommended because the donor is available, compatible ({donor_blood_group}), "
            f"{prox_text}, with {ml_text}."
        )
    elif rank <= 6:
        return (
            f"Ranked #{rank} (Secondary) under {level} triage: Suitable backup candidate with {comp_text}, "
            f"{prox_text}, and {ml_text}."
        )
    else:
        return (
            f"Rank #{rank} (Standby) under {level} triage: Rank decreased because the donor is {prox_text} "
            f"and has {ml_text}."
        )


def rank_donors_for_emergency(
    emergency: Dict[str, Any],
    donors: List[Dict[str, Any]],
    override_weights: Optional[Dict[str, float]] = None
) -> MatchResponse:
    """
    Core Adaptive MCDM Engine.

    Steps:
    1. Filter out unavailable, ineligible, or incompatible donors.
    2. Normalize Compatibility, Distance, ML Response Probability, and Fatigue scores.
    3. Retrieve adaptive weights for emergency level (Routine, Urgent, Critical).
    4. Compute multi-criteria priority score.
    5. Sort and assign ranks.
    6. Generate explainable AI summaries.
    """
    emergency_id = str(emergency.get("id", emergency.get("_id", "unknown")))
    emergency_level = str(emergency.get("emergency_level", "Urgent")).capitalize()
    req_blood_group = str(emergency.get("required_blood_group", "O+")).strip().upper()
    hospital_lat = float(emergency.get("latitude", 12.9716))
    hospital_lon = float(emergency.get("longitude", 77.5946))
    hospital_name = emergency.get("hospital_name", "Hospital Emergency Ward")
    units_needed = int(emergency.get("units_needed", 2))

    # Active weights
    weights = override_weights or get_weights_for_emergency(emergency_level)
    w_comp = weights.get("compatibility", 0.30)
    w_dist = weights.get("distance", 0.35)
    w_ml = weights.get("ml_response", 0.25)
    w_fatigue = weights.get("fatigue", 0.10)

    total_evaluated = len(donors)
    candidate_matches = []

    for donor in donors:
        # Step 1: Basic Requirements Filtering
        # Filter 1: Donor is available
        if not donor.get("is_available", True):
            continue

        # Filter 2: Donor is medically eligible
        if not donor.get("is_eligible", True):
            continue

        # Filter 3: Configured compatibility check
        donor_blood_group = str(donor.get("blood_group", "")).strip().upper()
        compatible, comp_score, comp_explanation = check_compatibility(
            donor_blood_group=donor_blood_group,
            recipient_blood_group=req_blood_group
        )
        if not compatible:
            continue

        # Step 2: Calculate Geographic Distance and ETA
        donor_lat = float(donor.get("latitude", 0.0))
        donor_lon = float(donor.get("longitude", 0.0))
        distance_km, eta_mins = calculate_distance_and_eta(
            hospital_lat, hospital_lon, donor_lat, donor_lon
        )
        dist_score = calculate_distance_score(distance_km)

        # Step 3: Calculate ML Response Probability
        days_since_donation = int(donor.get("days_since_last_donation", 90))
        ml_features = {
            "distance_km": distance_km,
            "donation_count": int(donor.get("donation_count", 3)),
            "historical_acceptance_rate": float(donor.get("historical_acceptance_rate", 0.85)),
            "avg_response_time_mins": float(donor.get("avg_response_time_mins", 12.0)),
            "days_since_last_donation": days_since_donation,
            "urgency_level": emergency_level,
            "time_of_day": datetime.now().hour,
        }
        response_prob = predict_response_probability(ml_features)

        # Step 4: Calculate Fatigue / Recency Score
        fatigue_score = calculate_fatigue_score(days_since_donation)

        # Step 5: Multi-Criteria Priority Score Formula
        # priority_score = compatibility_weight * compatibility_score
        #                + distance_weight * distance_score
        #                + ml_weight * response_probability
        #                - fatigue_weight * fatigue_score
        raw_priority = (
            w_comp * comp_score
            + w_dist * dist_score
            + w_ml * response_prob
            - w_fatigue * fatigue_score
        )
        # Normalize and bound priority score [0.0 - 1.0]
        priority_score = max(0.0, min(1.0, raw_priority))
        priority_score = round(priority_score, 4)

        candidate_matches.append({
            "donor_id": str(donor.get("id", donor.get("_id", "unknown"))),
            "donor_name": donor.get("name", "Anonymous Donor"),
            "donor_blood_group": donor_blood_group,
            "phone": donor.get("phone", ""),
            "latitude": donor_lat,
            "longitude": donor_lon,
            "distance_km": distance_km,
            "estimated_arrival_mins": eta_mins,
            "compatibility_score": comp_score,
            "compat_explanation": comp_explanation,
            "distance_score": dist_score,
            "response_probability": response_prob,
            "fatigue_score": fatigue_score,
            "priority_score": priority_score,
            "days_since_last_donation": days_since_donation,
        })

    # Step 6: Rank donors (Descending priority_score, tie-broken by distance ascending, then response_prob descending)
    candidate_matches.sort(
        key=lambda x: (x["priority_score"], -x["distance_km"], x["response_probability"]),
        reverse=True
    )

    ranked_results: List[MatchResult] = []
    for rank_idx, match in enumerate(candidate_matches, start=1):
        # Tier assignment
        if rank_idx <= 3:
            match_tier = "Top Recommendation"
        elif rank_idx <= 6:
            match_tier = "Secondary Recommendation"
        else:
            match_tier = "Standby"

        explanation = generate_recommendation_explanation(
            rank=rank_idx,
            emergency_level=emergency_level,
            donor_name=match["donor_name"],
            donor_blood_group=match["donor_blood_group"],
            recipient_blood_group=req_blood_group,
            compatibility_score=match["compatibility_score"],
            compat_explanation=match["compat_explanation"],
            distance_km=match["distance_km"],
            estimated_arrival_mins=match["estimated_arrival_mins"],
            response_prob=match["response_probability"],
            fatigue_score=match["fatigue_score"],
            priority_score=match["priority_score"]
        )

        score_breakdown = ScoreBreakdown(
            compatibility_score=match["compatibility_score"],
            proximity_score=match["distance_score"],
            response_probability=match["response_probability"],
            fatigue_penalty=round(match["fatigue_score"] * w_fatigue, 4),
            weights_used=weights
        )

        ranked_results.append(
            MatchResult(
                donor_id=match["donor_id"],
                donor_name=match["donor_name"],
                donor_blood_group=match["donor_blood_group"],
                compatibility_score=match["compatibility_score"],
                distance_km=match["distance_km"],
                distance_score=match["distance_score"],
                response_probability=match["response_probability"],
                fatigue_score=match["fatigue_score"],
                priority_score=match["priority_score"],
                rank=rank_idx,
                explanation=explanation,
                emergency_level=emergency_level,
                phone=match["phone"],
                latitude=match["latitude"],
                longitude=match["longitude"],
                estimated_arrival_mins=match["estimated_arrival_mins"],
                is_available=True,
                is_eligible=True,
                eligibility_status="Verified (Academic Demo Criteria)",
                total_priority_score=round(match["priority_score"] * 100.0, 2),
                match_tier=match_tier,
                scores=score_breakdown,
                recommendation_summary=explanation
            )
        )

    return MatchResponse(
        emergency_id=emergency_id,
        emergency_level=emergency_level,
        patient_blood_group=req_blood_group,
        units_needed=units_needed,
        total_evaluated=total_evaluated,
        matched_donors_count=len(ranked_results),
        adaptation_weights=weights,
        ranked_matches=ranked_results,
        hospital_name=hospital_name
    )
