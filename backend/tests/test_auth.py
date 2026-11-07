import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db, get_db
from app.services.seed_data import seed_donors_if_empty
from app.services.auth_service import seed_users_if_empty


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Ensure in-memory database or mongo is initialized and seeded before tests."""
    await init_db()
    await seed_donors_if_empty()
    await seed_users_if_empty()


@pytest.mark.asyncio
async def test_get_demo_credentials():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/auth/demo-credentials")
        assert response.status_code == 200
        creds = response.json()
        assert len(creds) == 3
        roles = {c["role"] for c in creds}
        assert roles == {"admin", "donor", "user"}


@pytest.mark.asyncio
async def test_login_demo_admin():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            json={
                "email": "admin@bloodbank.org",
                "password": "admin123",
                "expected_role": "admin"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "admin@bloodbank.org"


@pytest.mark.asyncio
async def test_login_demo_donor():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            json={
                "email": "donor@example.com",
                "password": "donor123",
                "expected_role": "donor"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "donor"
        assert data["user"]["donor_id"] == "donor-001"


@pytest.mark.asyncio
async def test_login_demo_user():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            json={
                "email": "user@example.com",
                "password": "user123",
                "expected_role": "user"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "user"


@pytest.mark.asyncio
async def test_login_wrong_role_forbidden():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Donor trying to log in at Admin portal
        response = await client.post(
            "/api/auth/login",
            json={
                "email": "donor@example.com",
                "password": "donor123",
                "expected_role": "admin"
            }
        )
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_invalid_password():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            json={
                "email": "admin@bloodbank.org",
                "password": "wrongpassword123"
            }
        )
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_register_new_donor_and_verify_donor_pool():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        reg_payload = {
            "email": "newdonor@test.org",
            "name": "Dr. Kavita Sharma",
            "password": "passcode1234",
            "role": "donor",
            "blood_group": "B+",
            "phone": "+91 99000 88776",
            "latitude": 12.9500,
            "longitude": 77.6000,
            "address": "Jayanagar 4th Block"
        }
        reg_res = await client.post("/api/auth/register", json=reg_payload)
        assert reg_res.status_code == 201
        data = reg_res.json()
        assert "access_token" in data
        assert data["user"]["role"] == "donor"
        donor_id = data["user"]["donor_id"]
        assert donor_id is not None

        # Verify donor is now retrievable in active donor roster
        donor_res = await client.get(f"/api/donors/{donor_id}")
        assert donor_res.status_code == 200
        donor_info = donor_res.json()
        assert donor_info["name"] == "Dr. Kavita Sharma"
        assert donor_info["blood_group"] == "B+"


@pytest.mark.asyncio
async def test_me_endpoint_with_valid_and_invalid_token():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # First log in as admin
        login_res = await client.post(
            "/api/auth/login",
            json={"email": "admin@bloodbank.org", "password": "admin123"}
        )
        token = login_res.json()["access_token"]

        # Call /me with Bearer token
        me_res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "admin@bloodbank.org"

        # Call /me with invalid token
        invalid_res = await client.get("/api/auth/me", headers={"Authorization": "Bearer bad.token.here"})
        assert invalid_res.status_code == 401

        # Call /me without token
        missing_res = await client.get("/api/auth/me")
        assert missing_res.status_code == 401


@pytest.mark.asyncio
async def test_register_validation_errors():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Invalid email and short password (< 6 chars) and short name (< 2 chars)
        invalid_payload = {
            "email": "not-an-email",
            "name": "A",
            "password": "123",
            "role": "user"
        }
        res = await client.post("/api/auth/register", json=invalid_payload)
        assert res.status_code == 422
        body = res.json()
        assert "detail" in body
        assert isinstance(body["detail"], str)
        assert "email" in body["detail"]
        assert "name" in body["detail"]
        assert "password" in body["detail"]
        assert "errors" in body
        assert isinstance(body["errors"], list)
        assert len(body["errors"]) >= 3

        # 2. Missing required fields
        empty_res = await client.post("/api/auth/register", json={})
        assert empty_res.status_code == 422
        empty_body = empty_res.json()
        assert isinstance(empty_body["detail"], str)
        assert len(empty_body["detail"]) > 0


@pytest.mark.asyncio
async def test_list_users_as_admin_and_verify_no_credentials():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Log in as admin
        login_res = await client.post(
            "/api/auth/login",
            json={"email": "admin@bloodbank.org", "password": "admin123", "expected_role": "admin"}
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]

        # 2. Fetch users
        users_res = await client.get("/api/auth/users", headers={"Authorization": f"Bearer {token}"})
        assert users_res.status_code == 200
        users = users_res.json()
        assert len(users) >= 3

        # 3. Verify no credentials or sensitive hashes are present in any user response
        for u in users:
            assert "password" not in u
            assert "password_hash" not in u
            assert "token" not in u
            assert "email" in u
            assert "role" in u
            assert "id" in u


@pytest.mark.asyncio
async def test_list_users_non_admin_forbidden():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Log in as regular user
        login_res = await client.post(
            "/api/auth/login",
            json={"email": "user@example.com", "password": "user123", "expected_role": "user"}
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]

        # 2. Fetch users as non-admin -> should be 403 Forbidden
        users_res = await client.get("/api/auth/users", headers={"Authorization": f"Bearer {token}"})
        assert users_res.status_code == 403

        # 3. Fetch without token -> 401 Unauthorized
        unauth_res = await client.get("/api/auth/users")
        assert unauth_res.status_code == 401


