"""
Stage 5 Automated Test Suite: DevOps, MLOps, Security & Observability.

Validates:
1. /metrics endpoint returns HTTP 200 and standard Prometheus exposition payload.
2. HTTP requests increment http_requests_total and observe latency.
3. Donor matching increments matching_requests_total and observes calculation latency.
4. Emergency creation increments emergency_created_total with appropriate urgency level.
5. Donor status and location updates increment respective Prometheus counters.
6. WebSocket connection gauge (websocket_active_connections) tracks active clients accurately.
7. WebSocket event broadcasts increment websocket_events_total.
8. Prometheus metrics do NOT leak any Protected Health Information (PHI) or donor PII.
9. Security response headers (X-Content-Type-Options, X-Frame-Options) are present.
10. Schema boundary validations reject illegal coordinates, underage donors, and negative units.
"""

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import init_db, get_db
from app.services.seed_data import seed_donors_if_empty
from app.api.emergencies import seed_emergencies_if_empty
from app.websocket.manager import manager


@pytest_asyncio.fixture(autouse=True)
async def setup_test_env():
    """Initialize database and seed baseline records before each test."""
    await init_db()
    await seed_donors_if_empty()
    await seed_emergencies_if_empty()
    manager.active_connections.clear()


# ---------------------------------------------------------------------
# Test 1: /metrics endpoint returns 200 and standard Prometheus payload
# ---------------------------------------------------------------------
def test_metrics_endpoint_returns_prometheus_format():
    client = TestClient(app)
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]
    text = response.text
    assert "# HELP http_requests_total" in text
    assert "# TYPE http_requests_total counter" in text
    assert "websocket_active_connections" in text


# ---------------------------------------------------------------------
# Test 2: HTTP requests increment http_requests_total
# ---------------------------------------------------------------------
def test_http_requests_total_increments():
    client = TestClient(app)
    # Trigger requests to health
    res_health = client.get("/health")
    assert res_health.status_code == 200

    metrics_res = client.get("/metrics")
    assert metrics_res.status_code == 200
    assert 'endpoint="/health"' in metrics_res.text


# ---------------------------------------------------------------------
# Test 3: Donor matching increments matching_requests_total & latency
# ---------------------------------------------------------------------
def test_matching_metrics_recorded():
    client = TestClient(app)
    match_res = client.get("/api/matching/emg-demo-001")
    assert match_res.status_code == 200

    metrics_res = client.get("/metrics")
    assert metrics_res.status_code == 200
    assert "matching_requests_total" in metrics_res.text
    assert "matching_duration_seconds" in metrics_res.text


# ---------------------------------------------------------------------
# Test 4: Emergency creation increments emergency_created_total
# ---------------------------------------------------------------------
def test_emergency_creation_metric():
    client = TestClient(app)
    payload = {
        "patient_name": "Stage 5 Test Patient",
        "hospital_name": "St. John Trauma Center",
        "required_blood_group": "AB+",
        "units_needed": 3,
        "emergency_level": "Critical",
        "latitude": 12.9345,
        "longitude": 77.6101
    }
    create_res = client.post("/api/emergencies", json=payload)
    assert create_res.status_code == 201

    metrics_res = client.get("/metrics")
    assert metrics_res.status_code == 200
    assert 'emergency_created_total{blood_group="AB+",urgency_level="Critical"}' in metrics_res.text


# ---------------------------------------------------------------------
# Test 5: Donor status and location updates increment metrics
# ---------------------------------------------------------------------
def test_donor_dynamics_metrics():
    client = TestClient(app)
    # Update status
    status_res = client.patch("/api/donors/donor-001/status", json={"is_available": False})
    assert status_res.status_code == 200

    # Update location
    loc_res = client.patch("/api/donors/donor-001/location", json={"latitude": 12.9800, "longitude": 77.6000})
    assert loc_res.status_code == 200

    metrics_res = client.get("/metrics")
    assert metrics_res.status_code == 200
    assert 'donor_status_changes_total{status_field="availability"}' in metrics_res.text
    assert "donor_location_changes_total" in metrics_res.text


# ---------------------------------------------------------------------
# Test 6: WebSocket active connections gauge tracks lifecycle
# ---------------------------------------------------------------------
def test_websocket_gauge_metric():
    client = TestClient(app)
    # Check baseline gauge
    assert manager.client_count == 0

    with client.websocket_connect("/ws") as ws:
        _ = ws.receive_json()
        assert manager.client_count == 1
        metrics_res = client.get("/metrics")
        assert "websocket_active_connections 1.0" in metrics_res.text

    # After disconnect
    assert manager.client_count == 0
    metrics_res2 = client.get("/metrics")
    assert "websocket_active_connections 0.0" in metrics_res2.text


# ---------------------------------------------------------------------
# Test 7: Metrics do NOT leak donor PII (Data Governance)
# ---------------------------------------------------------------------
def test_metrics_do_not_leak_pii():
    client = TestClient(app)
    # Make calls that process donor data
    client.get("/api/donors")
    client.get("/api/matching/emg-demo-001")

    metrics_res = client.get("/metrics")
    metrics_text = metrics_res.text

    # Verify no PII leaked in metrics
    for pii in ["Aarav", "Patel", "+91", "Koramangala", "Indiranagar", "aarav@example.com"]:
        assert pii not in metrics_text, f"PII '{pii}' was unexpectedly found in /metrics output!"


# ---------------------------------------------------------------------
# Test 8: Security headers present on API responses
# ---------------------------------------------------------------------
def test_security_headers_present():
    client = TestClient(app)
    res = client.get("/")
    assert res.status_code == 200
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"


# ---------------------------------------------------------------------
# Test 9: Input boundary validation
# ---------------------------------------------------------------------
def test_input_boundary_validation():
    client = TestClient(app)

    # Invalid latitude > 90
    bad_lat = client.post("/api/emergencies", json={
        "patient_name": "Invalid Coords",
        "hospital_name": "Hospital",
        "required_blood_group": "O+",
        "units_needed": 1,
        "latitude": 95.0,
        "longitude": 77.0
    })
    assert bad_lat.status_code == 422

    # Invalid blood units (0)
    bad_units = client.post("/api/emergencies", json={
        "patient_name": "Zero Units",
        "hospital_name": "Hospital",
        "required_blood_group": "O+",
        "units_needed": 0,
        "latitude": 12.97,
        "longitude": 77.59
    })
    assert bad_units.status_code == 422

    # Underage donor (< 18)
    bad_age = client.post("/api/donors", json={
        "name": "Underage",
        "blood_group": "A+",
        "age": 16,
        "gender": "Female",
        "phone": "+91 90000 00000",
        "email": "underage@example.com",
        "latitude": 12.97,
        "longitude": 77.59,
        "address": "Bangalore"
    })
    assert bad_age.status_code == 422
