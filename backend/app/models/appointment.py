from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from typing import Optional


class BookingStatus(str, Enum):
    PENDING = "pending"
    CALLING = "calling"
    NEGOTIATING = "negotiating"
    BOOKED = "booked"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TimeSlot(BaseModel):
    start: datetime
    end: datetime
    provider_id: str


class BookingRequest(BaseModel):
    service_type: str = Field(..., example="dentist")
    description: Optional[str] = Field(None, example="Routine cleaning")
    preferred_date_range_start: datetime
    preferred_date_range_end: datetime
    location: str = Field(..., example="Boston, MA")
    max_distance_miles: float = 15.0
    max_providers: int = Field(default=5, le=15)


class BookingResult(BaseModel):
    provider_id: str
    provider_name: str
    status: BookingStatus
    offered_slot: Optional[TimeSlot] = None
    score: Optional[float] = None
    call_duration_seconds: Optional[float] = None
    transcript: Optional[str] = None


class BookingSession(BaseModel):
    session_id: str
    request: BookingRequest
    status: BookingStatus = BookingStatus.PENDING
    results: list[BookingResult] = []
    best_match: Optional[BookingResult] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)