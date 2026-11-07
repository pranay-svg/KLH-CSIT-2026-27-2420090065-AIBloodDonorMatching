import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import bcrypt
import jwt
from fastapi import HTTPException, status

from app.config import settings
from app.database import get_db
from app.models.user import UserLogin, UserRegister, UserResponse, UserRole

logger = logging.getLogger("uvicorn.error")


def hash_password(password: str) -> str:
    """Hashes plain password using bcrypt."""
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against hashed password."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generates a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError as e:
        logger.warning(f"JWT decode error: {e}")
        return None


async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Retrieves a user document by email."""
    db = get_db()
    if db is None:
        return None
    return await db.users.find_one({"email": email.lower().strip()})


async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a user document by user ID."""
    db = get_db()
    if db is None:
        return None
    return await db.users.find_one({"id": user_id})


async def register_user(user_in: UserRegister) -> Dict[str, Any]:
    """Registers a new user and provisions linked donor profile if role is DONOR."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")

    email_clean = user_in.email.lower().strip()
    existing = await db.users.find_one({"email": email_clean})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{email_clean}' is already registered."
        )

    user_id = f"user-{uuid.uuid4().hex[:8]}"
    hashed_pwd = hash_password(user_in.password)
    now = datetime.now(timezone.utc)

    linked_donor_id = user_in.donor_id
    # If registering as donor and no existing donor_id provided, create a donor profile in matching pool
    if user_in.role == UserRole.DONOR and not linked_donor_id:
        linked_donor_id = f"donor-{uuid.uuid4().hex[:8]}"
        donor_doc = {
            "id": linked_donor_id,
            "name": user_in.name,
            "blood_group": user_in.blood_group or "O+",
            "age": 28,
            "gender": "Unspecified",
            "phone": user_in.phone or "+91 98000 00000",
            "email": email_clean,
            "latitude": user_in.latitude if user_in.latitude is not None else 12.9716,
            "longitude": user_in.longitude if user_in.longitude is not None else 77.5946,
            "address": user_in.address or "Bengaluru Metro",
            "is_available": True,
            "is_eligible": True,
            "eligibility_status": "Eligible (Newly Registered Donor)",
            "donation_count": 0,
            "days_since_last_donation": 95,
            "historical_acceptance_rate": 0.85,
            "avg_response_time_mins": 10.0,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        await db.donors.insert_one(donor_doc)
        logger.info(f"Created linked donor profile {linked_donor_id} for user {email_clean}")

    user_doc = {
        "id": user_id,
        "email": email_clean,
        "name": user_in.name,
        "role": user_in.role.value,
        "blood_group": user_in.blood_group,
        "phone": user_in.phone,
        "latitude": user_in.latitude if user_in.latitude is not None else 12.9716,
        "longitude": user_in.longitude if user_in.longitude is not None else 77.5946,
        "address": user_in.address or "Bengaluru",
        "donor_id": linked_donor_id,
        "password_hash": hashed_pwd,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }

    await db.users.insert_one(user_doc)
    logger.info(f"Successfully registered new user: {email_clean} (Role: {user_in.role.value})")
    return user_doc


async def authenticate_user(login_data: UserLogin) -> Dict[str, Any]:
    """Authenticates credentials and validates against the expected role."""
    email_clean = login_data.email.lower().strip()
    user = await get_user_by_email(email_clean)

    if not user or not verify_password(login_data.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is currently inactive. Please contact support."
        )

    # Validate portal role alignment if specified
    if login_data.expected_role:
        expected = login_data.expected_role.value if hasattr(login_data.expected_role, "value") else str(login_data.expected_role)
        actual = user.get("role")
        if actual != expected:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied for {expected.capitalize()} Portal. "
                    f"This account is registered as '{actual.capitalize()}'. "
                    f"Please switch to the {actual.capitalize()} portal to login."
                )
            )

    return user


def user_doc_to_response(user: Dict[str, Any]) -> UserResponse:
    """Converts a user dictionary to a UserResponse model."""
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        try:
            created_at = datetime.fromisoformat(created_at)
        except Exception:
            created_at = datetime.now(timezone.utc)
    elif not isinstance(created_at, datetime):
        created_at = datetime.now(timezone.utc)

    updated_at = user.get("updated_at")
    if isinstance(updated_at, str):
        try:
            updated_at = datetime.fromisoformat(updated_at)
        except Exception:
            updated_at = None

    return UserResponse(
        id=user.get("id", str(user.get("_id", ""))),
        email=user["email"],
        name=user["name"],
        role=UserRole(user["role"]),
        blood_group=user.get("blood_group"),
        phone=user.get("phone"),
        latitude=user.get("latitude"),
        longitude=user.get("longitude"),
        address=user.get("address"),
        donor_id=user.get("donor_id"),
        is_active=user.get("is_active", True),
        created_at=created_at,
        updated_at=updated_at
    )


async def get_all_users(role: Optional[str] = None) -> List[UserResponse]:
    """Retrieves all registered users safely formatted as UserResponse models without credentials."""
    db = get_db()
    if db is None:
        return []
    query = {}
    if role:
        query["role"] = role.lower().strip()
    users = await db.users.find(query)
    for u in users:
        if "_id" in u and "id" not in u:
            u["id"] = str(u["_id"])
    return [user_doc_to_response(u) for u in users]


def get_demo_credentials() -> List[Dict[str, Any]]:
    """Returns pre-configured demo credentials for the application portals."""
    return [
        {
            "role": "admin",
            "title": "Hospital / Blood Bank Admin",
            "portal": "Admin Command Center",
            "email": "admin@bloodbank.org",
            "password": "admin123",
            "description": "Full access to live AI MCDM triage, adaptive weights, live map, and telemetry",
            "badge": "Command & Triage"
        },
        {
            "role": "donor",
            "title": "Registered Blood Donor",
            "portal": "Donor Live Room",
            "email": "donor@example.com",
            "password": "donor123",
            "name": "Dr. Aarav Patel (O+)",
            "description": "Donor personal dashboard with live availability toggle, relocate radar, and real-time emergency responder",
            "badge": "Life Saver"
        },
        {
            "role": "user",
            "title": "Patient / Requester",
            "portal": "Patient / Recipient Portal",
            "email": "user@example.com",
            "password": "user123",
            "name": "Siddharth Rao",
            "description": "Emergency blood request submission, live response tracker, and donor availability finder",
            "badge": "Care & Request"
        }
    ]


async def seed_users_if_empty():
    """Seeds default Admin, Donor, and User credentials if database has no users."""
    db = get_db()
    if db is None:
        logger.warning("Database unavailable, cannot seed users.")
        return

    count = await db.users.count_documents({})
    if count > 0:
        logger.info(f"Users collection already contains {count} records. Skipping seed.")
        return

    logger.info("Seeding default multi-role users (Admin, Donor, User)...")
    now = datetime.now(timezone.utc)

    default_users = [
        {
            "id": "user-admin-01",
            "email": "admin@bloodbank.org",
            "name": "Command Center Admin",
            "role": UserRole.ADMIN.value,
            "blood_group": "O+",
            "phone": "+91 80 2299 0000",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "address": "Victoria Hospital Command Wing, Bengaluru",
            "donor_id": None,
            "password_hash": hash_password("admin123"),
            "is_active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": "user-donor-01",
            "email": "donor@example.com",
            "name": "Dr. Aarav Patel",
            "role": UserRole.DONOR.value,
            "blood_group": "O+",
            "phone": "+91 98450 11201",
            "latitude": 12.9722,
            "longitude": 77.5938,
            "address": "MG Road, Central Bengaluru",
            "donor_id": "donor-001",
            "password_hash": hash_password("donor123"),
            "is_active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": "user-patient-01",
            "email": "user@example.com",
            "name": "Siddharth Rao",
            "role": UserRole.USER.value,
            "blood_group": "A+",
            "phone": "+91 98111 22334",
            "latitude": 12.9784,
            "longitude": 77.6408,
            "address": "Indiranagar 100ft Road, Bengaluru",
            "donor_id": None,
            "password_hash": hash_password("user123"),
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
    ]

    for u in default_users:
        await db.users.insert_one(u)

    logger.info(f"Successfully seeded {len(default_users)} default role accounts.")
