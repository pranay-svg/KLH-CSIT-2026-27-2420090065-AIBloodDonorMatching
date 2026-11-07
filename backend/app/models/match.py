from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict
import uuid

class ScoreBreakdown(BaseModel):
    compatibility_score: float = Field(..., description="0-1.0 (or 0-100) based on ABO/Rh match")
    proximity_score: float = Field(..., description="0-1.0 (or 0-100) based on distance decay")
    response_probability: float = Field(..., description="0-1.0 predicted by ML model")
    fatigue_penalty: float = Field(default=0.0, description="Penalty for recently donated/contacted donors")
    weights_used: Dict[str, float] = Field(default_factory=dict, description="Active weights for this emergency level")

class MatchResult(BaseModel):
    donor_id: str
    donor_name: str
    donor_blood_group: str
    compatibility_score: float
    distance_km: float
    distance_score: float
    response_probability: float
    fatigue_score: float
    priority_score: float
    rank: int
    explanation: str
    emergency_level: str
    phone: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    estimated_arrival_mins: Optional[float] = None
    is_available: bool = True
    is_eligible: bool = True
    eligibility_status: Optional[str] = "Eligible"
    total_priority_score: Optional[float] = None
    match_tier: Optional[str] = None
    scores: Optional[ScoreBreakdown] = None
    recommendation_summary: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)

class MatchResponse(BaseModel):
    emergency_id: str
    emergency_level: str
    patient_blood_group: str
    units_needed: int
    total_evaluated: int
    matched_donors_count: int
    adaptation_weights: Dict[str, float]
    ranked_matches: List[MatchResult]
    disclaimer: str = Field(
        default="Academic Demonstration / Donor Coordination System: Not a clinical transfusion decision. Authorized personnel must verify biological compatibility and clinical eligibility."
    )
    hospital_name: Optional[str] = None
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(populate_by_name=True)

class AdaptationEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    trigger_type: str = Field(..., description="EMERGENCY_ESCALATION, DONOR_STATUS_CHANGE, MOBILITY_UPDATE")
    emergency_id: Optional[str] = None
    description: str
    previous_emergency_level: Optional[str] = None
    new_emergency_level: Optional[str] = None
    weights_applied: Dict[str, float] = Field(default_factory=dict)
    ranked_donors_count: int = 0

    model_config = ConfigDict(populate_by_name=True)
