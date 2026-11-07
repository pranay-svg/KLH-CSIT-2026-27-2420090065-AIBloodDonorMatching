from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
import uuid

class DonorBase(BaseModel):
    name: str = Field(...)
    blood_group: str = Field(...)
    age: int = Field(..., ge=18, le=65)
    gender: str = Field(...)
    phone: str = Field(...)
    email: str = Field(...)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    address: str = Field(...)
    is_available: bool = Field(default=True)
    is_eligible: bool = Field(default=True)
    eligibility_status: str = Field(default="Eligible (Academic Demo Criteria)")
    donation_count: int = Field(default=0, ge=0)
    days_since_last_donation: int = Field(default=90, ge=0)
    historical_acceptance_rate: float = Field(default=0.85, ge=0.0, le=1.0)
    avg_response_time_mins: float = Field(default=12.5, ge=0.0)

class DonorCreate(DonorBase):
    pass

class DonorUpdate(BaseModel):
    name: Optional[str] = None
    blood_group: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    is_available: Optional[bool] = None
    is_eligible: Optional[bool] = None
    eligibility_status: Optional[str] = None
    donation_count: Optional[int] = None
    days_since_last_donation: Optional[int] = None
    historical_acceptance_rate: Optional[float] = None
    avg_response_time_mins: Optional[float] = None

class DonorStatusUpdate(BaseModel):
    is_available: Optional[bool] = None
    is_eligible: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class Donor(DonorBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(populate_by_name=True)
