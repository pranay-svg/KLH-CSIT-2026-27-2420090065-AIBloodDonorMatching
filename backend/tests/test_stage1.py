import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db, get_db
from app.services.seed_data import seed_donors_if_empty
from app.api.emergencies import seed_emergencies_if_empty

@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Ensure in-memory database or mongo is initialized and seeded before tests."""
    await init_db()
    await seed_donors_if_empty()
    await seed_emergencies_if_empty()

async def test_root_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "documentation" in data
    assert "disclaimer" in data

async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "database_mode" in data
    assert data["metrics"]["total_donors"] >= 20
    assert data["metrics"]["total_emergencies"] >= 1

async def test_get_donors_list():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/donors")
    assert response.status_code == 200
    donors = response.json()
    assert len(donors) >= 20
    assert any(d["name"] == "Dr. Aarav Patel" for d in donors)

async def test_filter_donors_by_blood_group():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/donors?blood_group=O+")
    assert response.status_code == 200
    donors = response.json()
    assert len(donors) > 0
    assert all(d["blood_group"] == "O+" for d in donors)

async def test_get_single_donor_and_404():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/donors/donor-001")
        assert response.status_code == 200
        assert response.json()["id"] == "donor-001"

        missing_res = await ac.get("/api/donors/nonexistent-999")
        assert missing_res.status_code == 404

async def test_create_update_delete_donor():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create
        new_donor_payload = {
            "name": "Test Donor Alice",
            "blood_group": "B+",
            "age": 25,
            "gender": "Female",
            "phone": "+91 91234 56789",
            "email": "alice.test@example.com",
            "latitude": 12.9800,
            "longitude": 77.6000,
            "address": "Test Residency Road, Bengaluru",
            "is_available": True,
            "is_eligible": True,
            "eligibility_status": "Eligible for testing",
            "donation_count": 2,
            "days_since_last_donation": 90,
            "historical_acceptance_rate": 0.85,
            "avg_response_time_mins": 10.0
        }
        create_res = await ac.post("/api/donors", json=new_donor_payload)
        assert create_res.status_code == 201
        created_donor = create_res.json()
        donor_id = created_donor["id"]
        assert created_donor["name"] == "Test Donor Alice"

        # Update
        update_res = await ac.put(f"/api/donors/{donor_id}", json={"name": "Alice Updated", "age": 26})
        assert update_res.status_code == 200
        assert update_res.json()["name"] == "Alice Updated"
        assert update_res.json()["age"] == 26

        # Patch Status (toggle availability)
        status_res = await ac.patch(f"/api/donors/{donor_id}/status", json={"is_available": False})
        assert status_res.status_code == 200
        assert status_res.json()["is_available"] is False

        # Delete
        delete_res = await ac.delete(f"/api/donors/{donor_id}")
        assert delete_res.status_code == 200

        # Verify 404 after deletion
        get_res = await ac.get(f"/api/donors/{donor_id}")
        assert get_res.status_code == 404

async def test_emergency_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # List emergencies
        list_res = await ac.get("/api/emergencies")
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1

        # Create emergency
        emg_payload = {
            "patient_name": "Emergency Patient Bob",
            "hospital_name": "City Life Care Hospital",
            "required_blood_group": "AB-",
            "units_needed": 3,
            "emergency_level": "Routine",
            "latitude": 12.9500,
            "longitude": 77.6200,
            "contact_person": "Dr. Sen",
            "notes": "Scheduled elective procedure"
        }
        create_res = await ac.post("/api/emergencies", json=emg_payload)
        assert create_res.status_code == 201
        emg_data = create_res.json()
        emg_id = emg_data["id"]
        assert emg_data["emergency_level"] == "Routine"
        assert emg_data["status"] == "Open"

        # Urgency escalation to Critical (Code Red)
        urgency_res = await ac.patch(f"/api/emergencies/{emg_id}/urgency", json={"emergency_level": "Critical"})
        assert urgency_res.status_code == 200
        assert urgency_res.json()["emergency_level"] == "Critical"

        # Status update to Fulfilled
        status_res = await ac.patch(f"/api/emergencies/{emg_id}/status", json={"status": "Fulfilled"})
        assert status_res.status_code == 200
        assert status_res.json()["status"] == "Fulfilled"

        # Delete emergency
        del_res = await ac.delete(f"/api/emergencies/{emg_id}")
        assert del_res.status_code == 200
