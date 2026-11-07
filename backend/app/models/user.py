from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    ADMIN = "admin"
    DONOR = "donor"
    USER = "user"


class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    role: UserRole
    blood_group: Optional[str] = Field(None, description="Blood Group e.g. O+, A-, B+, etc.")
    phone: Optional[str] = Field(None, description="Contact phone number")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    address: Optional[str] = Field(None, max_length=255)
    donor_id: Optional[str] = Field(None, description="Linked Donor profile ID in matching pool if role is donor")


class UserRegister(UserBase):
    password: str = Field(..., min_length=6, max_length=100, description="Password min 6 characters")


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    expected_role: Optional[UserRole] = Field(None, description="Role expected for the portal login page")


class UserResponse(UserBase):
    id: str
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
