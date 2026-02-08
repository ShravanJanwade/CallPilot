"""
Dashboard routes — aggregate data for the dashboard view.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

from app.routes.auth import get_current_user
from app.routes.campaign import campaigns_db

router = APIRouter()
logger = logging.getLogger(__name__)


# ---- Models ----

class DashboardStats(BaseModel):
    total_bookings: int
    successful_bookings: int
    success_rate: float
    avg_booking_time_seconds: Optional[float] = None


class RecentBooking(BaseModel):
    id: str
    provider_name: str
    service_type: str
    date: str
    time: str
    status: str
    created_at: str


class DashboardResponse(BaseModel):
    stats: DashboardStats
    recent_bookings: List[RecentBooking]
    upcoming_appointments: List[dict]


# ---- Endpoints ----

@router.get("", response_model=DashboardResponse)
async def get_dashboard(user: dict = Depends(get_current_user)):
    """Get dashboard data for the current user."""
    
    user_id = user["id"]
    
    # Get user's campaigns
    user_campaigns = [
        c for c in campaigns_db.values() 
        if c.get("user_id") == user_id
    ]
    
    # Calculate stats
    completed = [c for c in user_campaigns if c.get("status") == "complete"]
    successful = [c for c in completed if c.get("best_match") is not None]
    
    total = len(user_campaigns)
    success = len(successful)
    success_rate = (success / total * 100) if total > 0 else 0.0
    
    # Calculate average booking time
    avg_time = None
    if successful:
        times = []
        for c in successful:
            if c.get("started_at") and c.get("completed_at"):
                start = datetime.fromisoformat(c["started_at"].replace("Z", "+00:00"))
                end = datetime.fromisoformat(c["completed_at"].replace("Z", "+00:00"))
                times.append((end - start).total_seconds())
        if times:
            avg_time = sum(times) / len(times)
    
    stats = DashboardStats(
        total_bookings=total,
        successful_bookings=success,
        success_rate=round(success_rate, 1),
        avg_booking_time_seconds=avg_time
    )
    
    # Get recent bookings (last 10 completed campaigns with bookings)
    recent_bookings = []
    for campaign in sorted(user_campaigns, key=lambda c: c.get("started_at", ""), reverse=True)[:10]:
        best_match = campaign.get("best_match")
        if best_match:
            offered_slot = best_match.get("offered_slot", {})
            slot_time = offered_slot.get("start", "")
            
            if slot_time:
                slot_dt = datetime.fromisoformat(slot_time.replace("Z", "+00:00"))
                date_str = slot_dt.strftime("%Y-%m-%d")
                time_str = slot_dt.strftime("%I:%M %p")
            else:
                date_str = "TBD"
                time_str = "TBD"
            
            recent_bookings.append(RecentBooking(
                id=campaign["id"],
                provider_name=best_match.get("provider_name", "Unknown"),
                service_type=campaign.get("service_type", "appointment"),
                date=date_str,
                time=time_str,
                status="confirmed",
                created_at=campaign.get("started_at", "")
            ))
        elif campaign.get("status") == "complete":
            recent_bookings.append(RecentBooking(
                id=campaign["id"],
                provider_name="No provider booked",
                service_type=campaign.get("service_type", "appointment"),
                date="N/A",
                time="N/A",
                status="no_match",
                created_at=campaign.get("started_at", "")
            ))
    
    return DashboardResponse(
        stats=stats,
        recent_bookings=recent_bookings[:5],
        upcoming_appointments=[]  # TODO: Integrate with Google Calendar
    )
