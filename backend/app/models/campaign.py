"""Campaign data models for swarm orchestration."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class CallStatus(str, Enum):
    QUEUED = "queued"
    RINGING = "ringing"
    CONNECTED = "connected"
    NEGOTIATING = "negotiating"
    BOOKED = "booked"
    NO_AVAILABILITY = "no_availability"
    FAILED = "failed"
    TIMEOUT = "timeout"
    SKIPPED = "skipped"


class CampaignStatus(str, Enum):
    SEARCHING = "searching"
    CALLING = "calling"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ERROR = "error"
    NO_PROVIDERS = "no_providers"


class ProviderInfo(BaseModel):
    provider_id: str = ""
    place_id: str = ""
    name: str = ""
    phone: str = ""
    international_phone: str = ""
    address: str = ""
    rating: float = 0.0
    total_reviews: int = 0
    lat: float = 0.0
    lng: float = 0.0
    photo_url: Optional[str] = None
    website: Optional[str] = None
    distance_miles: float = 999.0
    travel_minutes: int = 999
    distance_text: str = ""
    duration_text: str = ""
    open_now: Optional[bool] = None


class ProviderCallResult(BaseModel):
    provider_id: str
    provider_name: str = ""
    status: CallStatus = CallStatus.QUEUED
    conversation_id: Optional[str] = None
    call_sid: Optional[str] = None
    offered_slot: Optional[dict] = None  # {date, time}
    score: Optional[float] = None
    reason: Optional[str] = None  # For no_availability or failed
    error: Optional[str] = None
    transcript: Optional[str] = None
    call_started_at: Optional[str] = None
    call_ended_at: Optional[str] = None


class Campaign(BaseModel):
    campaign_id: str
    group_id: str
    service_type: str
    location: str = "Boston, MA"
    max_distance: float = 10.0
    max_providers: int = 3
    preferred_date: str = "this week"
    preferences: dict = Field(default_factory=lambda: {
        "availability": 0.4, "rating": 0.3, "distance": 0.2, "preference": 0.1
    })
    preferred_providers: list[dict] = Field(default_factory=list)  # [{name, phone}]
    status: CampaignStatus = CampaignStatus.SEARCHING
    providers: list[dict] = Field(default_factory=list)
    results: list[dict] = Field(default_factory=list)
    best_match: Optional[dict] = None
    origin_lat: float = 0.0
    origin_lng: float = 0.0


class CampaignGroup(BaseModel):
    group_id: str
    user_id: str = "default"
    status: str = "running"
    campaigns: list[Campaign] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class CampaignStartRequest(BaseModel):
    service_types: list[str] = Field(..., example=["dentist", "barber"])
    location: str = Field(default="Boston, MA")
    max_distance_miles: float = Field(default=10.0)
    max_providers_per_type: int = Field(default=3, le=15)
    preferred_date: str = Field(default="this week")
    time_preference: str = Field(default="any")  # morning, afternoon, evening, any
    preferences: dict = Field(default_factory=lambda: {
        "availability": 0.4, "rating": 0.3, "distance": 0.2, "preference": 0.1
    })
    preferred_providers: list[dict] = Field(default_factory=list)