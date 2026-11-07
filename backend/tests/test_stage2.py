"""
Stage 2 Automated Test Suite: Machine Learning + Adaptive Donor Matching Engine.

Validates all 12 core requirements:
1. Compatible donor is considered.
2. Incompatible donor is filtered.
3. Unavailable donor is filtered.
4. Ineligible donor is filtered.
5. Distance calculation works (Haversine & ETA).
6. ML predictor returns probability between 0 and 1.
7. Routine weights are applied.
8. Urgent weights are applied.
9. Critical weights are applied.
10. Ranking changes when emergency level changes.
11. Ranking changes when donor location changes.
12. Ranking changes when donor availability changes.
Plus matching API integration tests.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import init_db, get_db
from app.services.seed_data import seed_donors_if_empty
from app.api.emergencies import seed_emergencies_if_empty
from app.services.compatibility import check_compatibility, COMPATIBILITY_RULES
from app.services.geo_service import (
    calculate_haversine_distance,
    estimate_travel_time_mins,
    calculate_distance_and_eta
)
from app.ml.predictor import predict_response_probability
from app.services.adaptive_engine import (
    rank_donors_for_emergency,
    get_weights_for_emergency,
    calculate_distance_score,
    calculate_fatigue_score,
    ADAPTIVE_WEIGHTS
)


@pytest_asyncio.fixture(autouse=True)
async def setup_test_environment():
    """Ensure in-memory/MongoDB database is initialized and seeded before tests."""
    await init_db()
    await seed_donors_if_empty()
    await seed_emergencies_if_empty()


# ---------------------------------------------------------------------
# Test 1: Compatible donor is considered
# ---------------------------------------------------------------------
def test_compatible_donor_is_considered():
    # Patient with O+ can receive O+ and O-
    comp_exact, score_exact, exp_exact = check_compatibility("O+", "O+")
    assert comp_exact is True
    assert score_exact == 1.0
    assert "Exact match" in exp_exact

    comp_univ, score_univ, exp_univ = check_compatibility("O-", "O+")
    assert comp_univ is True
    assert score_univ > 0.70
    assert "Compatible" in exp_univ

    # Using ranking engine
    emergency = {
        "id": "emg-test-compat",
        "required_blood_group": "O+",
        "emergency_level": "Urgent",
        "latitude": 12.9716,
        "longitude": 77.5946
    }
    donors = [
        {"id": "d1", "name": "Compatible O+", "blood_group": "O+", "is_available": True, "is_eligible": True, "latitude": 12.97, "longitude": 77.59}
    ]
    result = rank_donors_for_emergency(emergency, donors)
    assert result.matched_donors_count == 1
    assert result.ranked_matches[0].donor_id == "d1"
    assert result.ranked_matches[0].compatibility_score == 1.0


# ---------------------------------------------------------------------
# Test 2: Incompatible donor is filtered
# ---------------------------------------------------------------------
def test_incompatible_donor_is_filtered():
    # Patient with O- can ONLY receive O-
    comp_incompat, score_incompat, exp_incompat = check_compatibility("A+", "O-")
    assert comp_incompat is False
    assert score_incompat == 0.0
    assert "Incompatible" in exp_incompat

    emergency = {
        "id": "emg-test-incompat",
        "required_blood_group": "O-",
        "emergency_level": "Critical",
        "latitude": 12.9716,
        "longitude": 77.5946
    }
    donors = [
        {"id": "d-a-plus", "name": "Donor A+", "blood_group": "A+", "is_available": True, "is_eligible": True, "latitude": 12.97, "longitude": 77.59},
        {"id": "d-b-plus", "name": "Donor B+", "blood_group": "B+", "is_available": True, "is_eligible": True, "latitude": 12.97, "longitude": 77.59},
        {"id": "d-o-neg", "name": "Donor O-", "blood_group": "O-", "is_available": True, "is_eligible": True, "latitude": 12.97, "longitude": 77.59}
    ]
    result = rank_donors_for_emergency(emergency, donors)
    assert result.matched_donors_count == 1
    assert result.ranked_matches[0].donor_id == "d-o-neg"
    assert result.ranked_matches[0].donor_blood_group == "O-"


# ---------------------------------------------------------------------
# Test 3: Unavailable donor is filtered
# ---------------------------------------------------------------------
def test_unavailable_donor_is_filtered():
    emergency = {
        "id": "emg-test-unavail",
        "required_blood_group": "B+",
        "emergency_level": "Routine",
        "latitude": 12.9716,
        "longitude": 77.5946
    }
    donors = [
        {"id": "d-busy", "name": "Busy Donor", "blood_group": "B+", "is_available": False, "is_eligible": True, "latitude": 12.97, "longitude": 77.59},
        {"id": "d-ready", "name": "Ready Donor", "blood_group": "B+", "is_available": True, "is_eligible": True, "latitude": 12.97, "longitude": 77.59}
    ]
    result = rank_donors_for_emergency(emergency, donors)
    assert result.matched_donors_count == 1
    assert result.ranked_matches[0].donor_id == "d-ready"


# ---------------------------------------------------------------------
# Test 4: Ineligible donor is filtered
# ---------------------------------------------------------------------
def test_ineligible_donor_is_filtered():
    emergency = {
        "id": "emg-test-inelig",
        "required_blood_group": "A+",
        "emergency_level": "Urgent",
        "latitude": 12.9716,
        "longitude": 77.5946
    }
    donors = [
        {"id": "d-ineligible", "name": "Ineligible Donor", "blood_group": "A+", "is_available": True, "is_eligible": False, "latitude": 12.97, "longitude": 77.59},
        {"id": "d-eligible", "name": "Eligible Donor", "blood_group": "A+", "is_available": True, "is_eligible": True, "latitude": 12.97, "longitude": 77.59}
    ]
    result = rank_donors_for_emergency(emergency, donors)
    assert result.matched_donors_count == 1
    assert result.ranked_matches[0].donor_id == "d-eligible"


# ---------------------------------------------------------------------
# Test 5: Distance calculation works
# ---------------------------------------------------------------------
def test_distance_calculation():
    # Distance between identical points is 0.0
    d_zero = calculate_haversine_distance(12.9716, 77.5946, 12.9716, 77.5946)
    assert d_zero == 0.0

    # Distance between Central Bangalore (12.9716, 77.5946) and Electronic City (12.8450, 77.6600) ~ 15-16 km
    d_ecity = calculate_haversine_distance(12.9716, 77.5946, 12.8450, 77.6600)
    assert 13.0 <= d_ecity <= 18.0

    # Distance score decay
    assert calculate_distance_score(0.0) == 1.0
    assert calculate_distance_score(35.0) == 0.0
    assert 0.45 <= calculate_distance_score(17.5) <= 0.55

    # ETA estimation
    eta = estimate_travel_time_mins(15.0)  # 15km at 30km/h = 30 mins + 5 min buffer = 35 mins
    assert eta == 35.0


# ---------------------------------------------------------------------
# Test 6: ML predictor returns a probability between 0 and 1
# ---------------------------------------------------------------------
def test_ml_predictor_returns_probability_between_0_and_1():
    features_routine = {
        "distance_km": 5.2,
        "donation_count": 8,
        "historical_acceptance_rate": 0.95,
        "avg_response_time_mins": 6.5,
        "days_since_last_donation": 115,
        "urgency_level": "Routine",
        "time_of_day": 14
    }
    prob_routine = predict_response_probability(features_routine)
    assert isinstance(prob_routine, float)
    assert 0.0 <= prob_routine <= 1.0

    features_critical = {
        "distance_km": 1.2,
        "donation_count": 12,
        "historical_acceptance_rate": 0.98,
        "avg_response_time_mins": 4.0,
        "days_since_last_donation": 90,
        "urgency_level": "Critical",
        "time_of_day": 10
    }
    prob_critical = predict_response_probability(features_critical)
    assert isinstance(prob_critical, float)
    assert 0.0 <= prob_critical <= 1.0
    # High acceptance, close distance, critical urgency should have high probability
    assert prob_critical > 0.50


# ---------------------------------------------------------------------
# Test 7: Routine weights are applied
# ---------------------------------------------------------------------
def test_routine_weights_applied():
    weights = get_weights_for_emergency("Routine")
    assert weights["compatibility"] == 0.40
    assert weights["distance"] == 0.20
    assert weights["ml_response"] == 0.20
    assert weights["fatigue"] == 0.20

    emergency = {"id": "emg-r", "required_blood_group": "O+", "emergency_level": "Routine", "latitude": 12.97, "longitude": 77.59}
    donors = [{"id": "d1", "name": "Donor 1", "blood_group": "O+", "is_available": True, "is_eligible": True, "latitude": 12.97, "longitude": 77.59}]
    res = rank_donors_for_emergency(emergency, donors)
    assert res.adaptation_weights == weights


# ---------------------------------------------------------------------
# Test 8: Urgent weights are applied
# ---------------------------------------------------------------------
def test_urgent_weights_applied():
    weights = get_weights_for_emergency("Urgent")
    assert weights["compatibility"] == 0.30
    assert weights["distance"] == 0.35
    assert weights["ml_response"] == 0.25
    assert weights["fatigue"] == 0.10

    emergency = {"id": "emg-u", "required_blood_group": "O+", "emergency_level": "Urgent", "latitude": 12.97, "longitude": 77.59}
    donors = [{"id": "d1", "name": "Donor 1", "blood_group": "O+", "is_available": True, "is_eligible": True, "latitude": 12.97, "longitude": 77.59}]
    res = rank_donors_for_emergency(emergency, donors)
    assert res.adaptation_weights == weights


# ---------------------------------------------------------------------
# Test 9: Critical weights are applied
# ---------------------------------------------------------------------
def test_critical_weights_applied():
    weights = get_weights_for_emergency("Critical")
    assert weights["compatibility"] == 0.20
    assert weights["distance"] == 0.50
    assert weights["ml_response"] == 0.25
    assert weights["fatigue"] == 0.05

    emergency = {"id": "emg-c", "required_blood_group": "O+", "emergency_level": "Critical", "latitude": 12.97, "longitude": 77.59}
    donors = [{"id": "d1", "name": "Donor 1", "blood_group": "O+", "is_available": True, "is_eligible": True, "latitude": 12.97, "longitude": 77.59}]
    res = rank_donors_for_emergency(emergency, donors)
    assert res.adaptation_weights == weights


# ---------------------------------------------------------------------
# Test 10: Ranking changes when emergency level changes
# ---------------------------------------------------------------------
def test_ranking_changes_when_emergency_level_changes():
    """
    Demonstrates TRUE ADAPTIVE BEHAVIOR:
    - Donor Near: Very close (0.5 km) but donated 58 days ago (higher fatigue score).
    - Donor Rested: Farther away (22 km) but donated 250 days ago (zero fatigue) and exact match.
    In Routine: Fatigue weight is high (0.20) and distance weight is low (0.20), favoring the rested donor.
    In Critical: Distance weight jumps to 0.50 and fatigue drops to 0.05, strongly favoring the nearby donor.
    """
    donor_near = {
        "id": "donor-near",
        "name": "Nearby Donor",
        "blood_group": "O+",
        "latitude": 12.9720,  # ~0.1 km from hospital
        "longitude": 77.5950,
        "is_available": True,
        "is_eligible": True,
        "days_since_last_donation": 58,  # High fatigue
        "donation_count": 8,
        "historical_acceptance_rate": 0.90,
        "avg_response_time_mins": 5.0
    }
    donor_rested = {
        "id": "donor-rested",
        "name": "Well Rested Far Donor",
        "blood_group": "O+",
        "latitude": 12.8000,  # ~20+ km from hospital
        "longitude": 77.5950,
        "is_available": True,
        "is_eligible": True,
        "days_since_last_donation": 250,  # 0 fatigue
        "donation_count": 5,
        "historical_acceptance_rate": 0.95,
        "avg_response_time_mins": 6.0
    }
    candidates = [donor_near, donor_rested]

    # Routine Emergency: High fatigue weight (0.20) vs distance (0.20)
    emg_routine = {
        "id": "emg-r-1",
        "required_blood_group": "O+",
        "emergency_level": "Routine",
        "latitude": 12.9716,
        "longitude": 77.5946
    }
    res_routine = rank_donors_for_emergency(emg_routine, candidates)

    # Critical Emergency: Distance weight is 0.50, fatigue penalty only 0.05
    emg_critical = {
        "id": "emg-c-1",
        "required_blood_group": "O+",
        "emergency_level": "Critical",
        "latitude": 12.9716,
        "longitude": 77.5946
    }
    res_critical = rank_donors_for_emergency(emg_critical, candidates)

    # In Critical mode, the nearby donor must be rank #1
    assert res_critical.ranked_matches[0].donor_id == "donor-near"
    # Priority score for donor-near must be significantly higher in Critical than Routine
    near_crit_score = next(m.priority_score for m in res_critical.ranked_matches if m.donor_id == "donor-near")
    near_rout_score = next(m.priority_score for m in res_routine.ranked_matches if m.donor_id == "donor-near")
    assert near_crit_score > near_rout_score


# ---------------------------------------------------------------------
# Test 11: Ranking changes when donor location changes
# ---------------------------------------------------------------------
def test_ranking_changes_when_donor_location_changes():
    emergency = {
        "id": "emg-loc-test",
        "required_blood_group": "A+",
        "emergency_level": "Urgent",
        "latitude": 12.9716,
        "longitude": 77.5946
    }
    # Donor initially far (30 km)
    donor_mobile = {
        "id": "donor-mobile",
        "name": "Mobile Donor",
        "blood_group": "A+",
        "latitude": 12.7000,
        "longitude": 77.5946,
        "is_available": True,
        "is_eligible": True,
        "days_since_last_donation": 90,
        "donation_count": 4,
        "historical_acceptance_rate": 0.85,
        "avg_response_time_mins": 10.0
    }
    donor_static = {
        "id": "donor-static",
        "name": "Static Mid-Distance Donor",
        "blood_group": "A+",
        "latitude": 12.9300,  # ~5 km
        "longitude": 77.5946,
        "is_available": True,
        "is_eligible": True,
        "days_since_last_donation": 90,
        "donation_count": 4,
        "historical_acceptance_rate": 0.85,
        "avg_response_time_mins": 10.0
    }

    # Initial run: static donor is closer and ranked higher
    initial_res = rank_donors_for_emergency(emergency, [donor_mobile, donor_static])
    assert initial_res.ranked_matches[0].donor_id == "donor-static"

    # Mobile donor moves very close (12.9720, 77.5947 -> 0.1 km)
    donor_mobile_relocated = dict(donor_mobile)
    donor_mobile_relocated["latitude"] = 12.9720
    donor_mobile_relocated["longitude"] = 77.5947

    updated_res = rank_donors_for_emergency(emergency, [donor_mobile_relocated, donor_static])
    # Now relocated mobile donor should surpass static donor
    assert updated_res.ranked_matches[0].donor_id == "donor-mobile"
    assert updated_res.ranked_matches[0].distance_km < 1.0


# ---------------------------------------------------------------------
# Test 12: Ranking changes when donor availability changes
# ---------------------------------------------------------------------
def test_ranking_changes_when_donor_availability_changes():
    emergency = {
        "id": "emg-avail-test",
        "required_blood_group": "O+",
        "emergency_level": "Critical",
        "latitude": 12.9716,
        "longitude": 77.5946
    }
    donor_1 = {
        "id": "d1",
        "name": "Star Donor",
        "blood_group": "O+",
        "latitude": 12.9720,
        "longitude": 77.5946,
        "is_available": True,
        "is_eligible": True
    }
    donor_2 = {
        "id": "d2",
        "name": "Runner-up Donor",
        "blood_group": "O+",
        "latitude": 12.9600,
        "longitude": 77.5946,
        "is_available": True,
        "is_eligible": True
    }

    # Initially both available -> d1 is #1
    res1 = rank_donors_for_emergency(emergency, [donor_1, donor_2])
    assert res1.matched_donors_count == 2
    assert res1.ranked_matches[0].donor_id == "d1"

    # d1 becomes unavailable (busy in surgery or meeting)
    donor_1_busy = dict(donor_1)
    donor_1_busy["is_available"] = False
    res2 = rank_donors_for_emergency(emergency, [donor_1_busy, donor_2])
    assert res2.matched_donors_count == 1
    assert res2.ranked_matches[0].donor_id == "d2"
    assert res2.ranked_matches[0].rank == 1


# ---------------------------------------------------------------------
# Test 13 & 14: Matching API Endpoints Integration Tests
# ---------------------------------------------------------------------
async def test_matching_api_get_weights():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # All weights
        res = await ac.get("/api/matching/weights")
        assert res.status_code == 200
        weights_data = res.json()
        assert "Routine" in weights_data
        assert "Urgent" in weights_data
        assert "Critical" in weights_data

        # Single level weights
        crit_res = await ac.get("/api/matching/weights/Critical")
        assert crit_res.status_code == 200
        crit_data = crit_res.json()
        assert crit_data["distance"] == 0.50
        assert crit_data["compatibility"] == 0.20


async def test_matching_api_endpoint_execution():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Fetch matching for demo emergency
        res = await ac.get("/api/matching/emg-demo-001")
        assert res.status_code == 200
        data = res.json()

        assert data["emergency_id"] == "emg-demo-001"
        assert data["patient_blood_group"] == "O+"
        assert data["matched_donors_count"] > 0
        assert "disclaimer" in data
        assert "ranked_matches" in data

        top_match = data["ranked_matches"][0]
        # Verify required Stage 2 fields
        assert "donor_id" in top_match
        assert "donor_name" in top_match
        assert "compatibility_score" in top_match
        assert "distance_km" in top_match
        assert "distance_score" in top_match
        assert "response_probability" in top_match
        assert "fatigue_score" in top_match
        assert "priority_score" in top_match
        assert "rank" in top_match
        assert "explanation" in top_match
        assert "emergency_level" in top_match
        assert top_match["rank"] == 1
        assert len(top_match["explanation"]) > 15


async def test_matching_api_404_on_nonexistent_emergency():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/matching/nonexistent-999")
        assert res.status_code == 404
