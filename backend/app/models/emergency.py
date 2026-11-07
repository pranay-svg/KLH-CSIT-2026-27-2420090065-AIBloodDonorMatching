from datetime import datetime, timezone
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
import uuid

class EmergencyLevel(str, Enum):
    ROUTINE = "Routine"
    URGENT = "Urgent"
    CRITICAL = "Critical"

class EmergencyStatus(str, Enum):
    OPEN = "Open"
    MATCHED = "Matched"
    FULFILLED = "Fulfilled"
    CANCELLED = "Cancelled"

class EmergencyRequestBase(BaseModel):
    patient_name: str = Field(...)
    hospital_name: str = Field(...)
    required_blood_group: str = Field(...)
    units_needed: int = Field(default=2, ge=1, le=10)
    emergency_level: EmergencyLevel = Field(default=EmergencyLevel.URGENT)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    contact_person: str = Field(default="Dr. Mehta (Emergency Ward)")
    notes: Optional[str] = Field(default="Emergency trauma admission")

class EmergencyRequestCreate(EmergencyRequestBase):
    pass

class EmergencyUrgencyUpdate(BaseModel):
    emergency_level: EmergencyLevel

class EmergencyStatusUpdate(BaseModel):
    status: EmergencyStatus

class EmergencyRequest(EmergencyRequestBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: EmergencyStatus = Field(default=EmergencyStatus.OPEN)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(populate_by_name=True)
