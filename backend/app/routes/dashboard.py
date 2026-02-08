"""
Dashboard routes — aggregate data for the dashboard view.
Uses Supabase for persistence.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

from app.routes.auth import get_current_user
from app.database import get_campaigns_by_user, get_bookings_by_user, get_user_stats

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
    
    # Get user's campaigns and bookings from Supabase
    user_campaigns = await get_campaigns_by_user(user_id, limit=50)
    user_bookings = await get_bookings_by_user(user_id, limit=20)
    stats_data = await get_user_stats(user_id)
    
    # Calculate stats
    total = len(user_campaigns)
    completed = [c for c in user_campaigns if c.get("status") == "complete"]
    success = stats_data.get("confirmed_bookings", 0)
    success_rate = (success / total * 100) if total > 0 else 0.0
    
    # Calculate average booking time from completed campaigns
    avg_time = None
    if completed:
        times = []
        for c in completed:
            if c.get("started_at") and c.get("completed_at"):
                try:
                    start = datetime.fromisoformat(c["started_at"].replace("Z", "+00:00"))
                    end = datetime.fromisoformat(c["completed_at"].replace("Z", "+00:00"))
                    times.append((end - start).total_seconds())
                except (ValueError, TypeError):
                    pass
        if times:
            avg_time = sum(times) / len(times)
    
    stats = DashboardStats(
        total_bookings=total,
        successful_bookings=success,
        success_rate=round(success_rate, 1),
        avg_booking_time_seconds=avg_time
    )
    
    # Get recent bookings from database
    recent_bookings = []
    for booking in user_bookings[:10]:
        provider = booking.get("providers", {}) or {}
        
        date_str = str(booking.get("appointment_date", "TBD"))
        time_str = str(booking.get("appointment_time", "TBD"))
        
        recent_bookings.append(RecentBooking(
            id=str(booking["id"]),
            provider_name=provider.get("name", "Unknown Provider"),
            service_type=booking.get("service_type", "appointment"),
            date=date_str,
            time=time_str,
            status=booking.get("status", "confirmed"),
            created_at=str(booking.get("created_at", ""))
        ))
    
    return DashboardResponse(
        stats=stats,
        recent_bookings=recent_bookings[:5],
        upcoming_appointments=[]  # TODO: Integrate with Google Calendar
    )
