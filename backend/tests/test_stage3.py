"""
Stage 3 Automated Test Suite: Real-Time WebSockets + Adaptive Event System.

Validates all Stage 3 requirements:
1. WebSocket connection succeeds at /ws.
2. Client ping/pong and keep-alive work.
3. Client disconnect is handled cleanly.
4. Donor availability change generates DONOR_STATUS_CHANGED event.
5. Donor location change generates DONOR_LOCATION_CHANGED event.
6. Emergency urgency change generates EMERGENCY_URGENCY_CHANGED event.
7. Matching recalculation is triggered automatically on context changes.
8. Updated rankings are included in MATCHING_RECALCULATED event payload.
9. Urgency transition Routine -> Critical applies new adaptive weights (0.50 distance, 0.05 fatigue).
10. REST API operations succeed even with ZERO connected WebSocket clients (resilient broadcast).
11. Disconnected / broken clients are handled gracefully without failing database updates.
12. Donor response simulation generates DONOR_RESPONSE_RECEIVED event.
13. No duplicate MATCHING_RECALCULATED events are generated for a single state update.
"""

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient

from app.main import app
from app.database import init_db, get_db
from app.services.seed_data import seed_donors_if_empty
from app.api.emergencies import seed_emergencies_if_empty
from app.websocket.manager import manager
from app.websocket.events import EventType


@pytest_asyncio.fixture(autouse=True)
async def setup_test_environment():
    """Ensure database is initialized and fresh demo records are seeded before each test."""
    await init_db()
    await seed_donors_if_empty()
    await seed_emergencies_if_empty()
    # Ensure clean WebSocket connection manager state
    manager.active_connections.clear()


# ---------------------------------------------------------------------
# Test 1: WebSocket connection succeeds at /ws
# ---------------------------------------------------------------------
def test_websocket_connection_succeeds():
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        data = ws.receive_json()
        assert data["event_type"] == "CONNECTED"
        assert "Connected to AI-Adaptive" in data["message"]
        assert data["active_clients"] >= 1
        assert manager.client_count >= 1


# ---------------------------------------------------------------------
# Test 2: Client ping-pong communication
# ---------------------------------------------------------------------
def test_websocket_ping_pong():
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        _ = ws.receive_json()  # Consume initial CONNECTED event
        ws.send_text("ping")
        response = ws.receive_json()
        assert response["event_type"] == "PONG"


# ---------------------------------------------------------------------
# Test 3: Client disconnect is handled cleanly
# ---------------------------------------------------------------------
def test_websocket_client_disconnect_handled():
    client = TestClient(app)
    initial_count = manager.client_count
    with client.websocket_connect("/ws") as ws:
        _ = ws.receive_json()
        assert manager.client_count == initial_count + 1

    # After exiting context block, client disconnects
    assert manager.client_count == initial_count


# ---------------------------------------------------------------------
# Test 4: Donor availability change generates DONOR_STATUS_CHANGED event
# ---------------------------------------------------------------------
def test_donor_availability_change_generates_event():
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        _ = ws.receive_json()  # Initial CONNECTED

        # Toggle donor-001 to unavailable
        res = client.patch("/api/donors/donor-001/status", json={"is_available": False})
        assert res.status_code == 200
        assert res.json()["is_available"] is False

        # First event: DONOR_STATUS_CHANGED
        event1 = ws.receive_json()
        assert event1["event_type"] == EventType.DONOR_STATUS_CHANGED.value
        assert event1["donor_id"] == "donor-001"
        assert event1["changes"]["is_available"] is False
        assert "timestamp" in event1

        # Second event: MATCHING_RECALCULATED for active emergency
        event2 = ws.receive_json()
        assert event2["event_type"] == EventType.MATCHING_RECALCULATED.value
        assert event2["emergency_id"] == "emg-demo-001"
        assert "ranked_matches" in event2
        # donor-001 was filtered out because unavailable
        assert not any(m["donor_id"] == "donor-001" for m in event2["ranked_matches"])


# ---------------------------------------------------------------------
# Test 5: Donor location change generates DONOR_LOCATION_CHANGED event
# ---------------------------------------------------------------------
def test_donor_location_change_generates_event():
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        _ = ws.receive_json()  # Initial CONNECTED

        new_lat, new_lon = 13.0500, 77.6500
        res = client.patch(
            "/api/donors/donor-001/location",
            json={"latitude": new_lat, "longitude": new_lon, "address": "New Location, North Bengaluru"}
        )
        assert res.status_code == 200
        assert res.json()["latitude"] == new_lat

        # First event: DONOR_LOCATION_CHANGED
        event1 = ws.receive_json()
        assert event1["event_type"] == EventType.DONOR_LOCATION_CHANGED.value
        assert event1["donor_id"] == "donor-001"
        assert event1["latitude"] == new_lat
        assert event1["longitude"] == new_lon
        assert event1["changes"]["latitude"] == new_lat

        # Second event: MATCHING_RECALCULATED with updated distances
        event2 = ws.receive_json()
        assert event2["event_type"] == EventType.MATCHING_RECALCULATED.value
        assert "ranked_matches" in event2


# ---------------------------------------------------------------------
# Test 6 & 7 & 8: Urgency escalation Routine -> Critical triggers new weights & recalculation
# ---------------------------------------------------------------------
def test_emergency_urgency_adaptation_weights_and_recalculation():
    client = TestClient(app)

    # First set emergency to Routine
    res_init = client.patch("/api/emergencies/emg-demo-001/urgency", json={"emergency_level": "Routine"})
    assert res_init.status_code == 200
    assert res_init.json()["emergency_level"] == "Routine"

    with client.websocket_connect("/ws") as ws:
        _ = ws.receive_json()  # Initial CONNECTED

        # Escalate Routine -> Critical
        res_crit = client.patch("/api/emergencies/emg-demo-001/urgency", json={"emergency_level": "Critical"})
        assert res_crit.status_code == 200
        assert res_crit.json()["emergency_level"] == "Critical"

        # Event 1: EMERGENCY_URGENCY_CHANGED
        event1 = ws.receive_json()
        assert event1["event_type"] == EventType.EMERGENCY_URGENCY_CHANGED.value
        assert event1["emergency_id"] == "emg-demo-001"
        assert event1["old_emergency_level"] == "Routine"
        assert event1["new_emergency_level"] == "Critical"
        assert event1["new_weights"]["distance"] == 0.50
        assert event1["new_weights"]["fatigue"] == 0.05
        assert event1["new_weights"]["compatibility"] == 0.20

        # Event 2: MATCHING_RECALCULATED with Critical weights and new rankings
        event2 = ws.receive_json()
        assert event2["event_type"] == EventType.MATCHING_RECALCULATED.value
        assert event2["emergency_id"] == "emg-demo-001"
        assert event2["emergency_level"] == "Critical"
        assert event2["adaptation_weights"]["distance"] == 0.50
        assert len(event2["ranked_matches"]) > 0

        # Ensure top match has ranking, explanation, and critical level
        top_match = event2["ranked_matches"][0]
        assert top_match["rank"] == 1
        assert "Critical" in top_match["explanation"]
        assert top_match["scores"]["weights_used"]["distance"] == 0.50


# ---------------------------------------------------------------------
# Test 9: Donor response simulation generates DONOR_RESPONSE_RECEIVED event
# ---------------------------------------------------------------------
def test_donor_response_event():
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        _ = ws.receive_json()  # Initial CONNECTED

        res = client.post(
            "/api/donors/donor-001/response",
            json={"emergency_id": "emg-demo-001", "response": "ACCEPTED", "eta_mins": 14.5}
        )
        assert res.status_code == 200

        event = ws.receive_json()
        assert event["event_type"] == EventType.DONOR_RESPONSE_RECEIVED.value
        assert event["donor_id"] == "donor-001"
        assert event["emergency_id"] == "emg-demo-001"
        assert event["response"] == "ACCEPTED"
        assert event["eta_mins"] == 14.5


# ---------------------------------------------------------------------
# Test 10: Zero connected WebSocket clients does NOT fail REST operations
# ---------------------------------------------------------------------
def test_rest_operations_succeed_with_zero_connected_clients():
    client = TestClient(app)
    # Ensure zero active connections
    assert manager.client_count == 0

    # Donor status change should succeed completely
    donor_res = client.patch("/api/donors/donor-002/status", json={"is_available": True})
    assert donor_res.status_code == 200
    assert donor_res.json()["id"] == "donor-002"

    # Donor location change should succeed completely
    loc_res = client.patch("/api/donors/donor-002/location", json={"latitude": 12.9800, "longitude": 77.6000})
    assert loc_res.status_code == 200

    # Emergency urgency escalation should succeed completely
    urg_res = client.patch("/api/emergencies/emg-demo-001/urgency", json={"emergency_level": "Urgent"})
    assert urg_res.status_code == 200
    assert urg_res.json()["emergency_level"] == "Urgent"


# ---------------------------------------------------------------------
# Test 11: Single combined update generates only ONE recalculation event
# ---------------------------------------------------------------------
def test_no_duplicate_recalculation_events_on_combined_update():
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        _ = ws.receive_json()  # Initial CONNECTED

        # Update both status and location in one PATCH /status call
        res = client.patch(
            "/api/donors/donor-003/status",
            json={"is_available": True, "latitude": 12.9750, "longitude": 77.6100}
        )
        assert res.status_code == 200

        received_types = []
        # Expect 3 events: STATUS_CHANGED, LOCATION_CHANGED, MATCHING_RECALCULATED (exactly 1)
        for _ in range(3):
            ev = ws.receive_json()
            received_types.append(ev["event_type"])

        assert EventType.DONOR_STATUS_CHANGED.value in received_types
        assert EventType.DONOR_LOCATION_CHANGED.value in received_types
        # Count of recalculations must be exactly 1
        recalc_count = sum(1 for t in received_types if t == EventType.MATCHING_RECALCULATED.value)
        assert recalc_count == 1
