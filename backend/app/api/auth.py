import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models.user import TokenResponse, UserLogin, UserRegister, UserResponse, UserRole
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    decode_access_token,
    get_all_users,
    get_demo_credentials,
    get_user_by_id,
    register_user,
    user_doc_to_response,
)

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/api/auth", tags=["Authentication & Role Portals"])
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> UserResponse:
    """Dependency to extract and validate current authenticated user from Bearer token."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is expired or invalid. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload["sub"]
    user_doc = await get_user_by_id(user_id)
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authenticated user record not found."
        )

    return user_doc_to_response(user_doc)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserRegister):
    """
    Registers a new user (Admin, Donor, or Patient/User).
    If role is 'donor', creates a corresponding donor record in the active matching pool.
    """
    user_doc = await register_user(user_in)
    token = create_access_token({
        "sub": user_doc["id"],
        "email": user_doc["email"],
        "role": user_doc["role"],
        "donor_id": user_doc.get("donor_id")
    })
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_doc_to_response(user_doc)
    )


@router.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    """
    Authenticates a user with email and password.
    Validates expected_role to ensure users log into their designated portal.
    """
    user_doc = await authenticate_user(login_data)
    token = create_access_token({
        "sub": user_doc["id"],
        "email": user_doc["email"],
        "role": user_doc["role"],
        "donor_id": user_doc.get("donor_id")
    })
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_doc_to_response(user_doc)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    """Validates the current session and returns the active user profile."""
    return current_user


@router.get("/demo-credentials", response_model=List[dict])
async def demo_credentials():
    """Returns pre-configured academic demonstration credentials for Admin, Donor, and User."""
    return get_demo_credentials()


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Returns registered application users.
    Restricted to authenticated administrative personnel.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to administrative users."
        )
    return await get_all_users(role=role)

