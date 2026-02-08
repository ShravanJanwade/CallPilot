"""
Campaign routes — start calling campaigns and manage provider search.
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
import logging
import asyncio
import random

from app.config import settings
from app.routes.auth import get_current_user
from app.routes.ws import broadcast
from app.routes.providers import search_providers

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory campaign store (replace with database in production)
campaigns_db: dict[str, dict] = {}


# ---- Models ----

class CampaignRequest(BaseModel):
    service_type: str
    description: Optional[str] = ""
    date_range_start: str
    date_range_end: str
    time_preference: str = "any"
    duration: int = 60
    location: str
    latitude: float
    longitude: float
    max_distance: float = 10.0
    weight_availability: float = 40
    weight_rating: float = 30
    weight_distance: float = 20
    weight_preference: float = 10
    max_providers: int = 5
    preferred_providers: List[dict] = []
    agent_name: str = "Alex"
    first_message: str = ""
    system_prompt: Optional[str] = None


class CampaignResponse(BaseModel):
    campaign_id: str
    status: str
    message: str


class CampaignStatus(BaseModel):
    campaign_id: str
    status: str
    calls: List[dict]
    ranked_results: List[dict]
    best_match: Optional[dict] = None
    started_at: str
    completed_at: Optional[str] = None


# ---- Endpoints ----

@router.post("/start", response_model=CampaignResponse)
async def start_campaign(
    request: CampaignRequest, 
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """Start a new calling campaign to book an appointment."""
    
    campaign_id = str(uuid.uuid4())
    
    campaign = {
        "id": campaign_id,
        "user_id": user["id"],
        "service_type": request.service_type,
        "description": request.description,
        "date_range": {
            "start": request.date_range_start,
            "end": request.date_range_end
        },
        "time_preference": request.time_preference,
        "duration": request.duration,
        "location": {
            "address": request.location,
            "lat": request.latitude,
            "lng": request.longitude
        },
        "max_distance": request.max_distance,
        "weights": {
            "availability": request.weight_availability / 100,
            "rating": request.weight_rating / 100,
            "distance": request.weight_distance / 100,
            "preference": request.weight_preference / 100
        },
        "max_providers": request.max_providers,
        "preferred_providers": request.preferred_providers,
        "agent_config": {
            "name": request.agent_name,
            "first_message": request.first_message or f"Hi, my name is {request.agent_name} and I'm calling on behalf of a patient looking to schedule an appointment.",
            "system_prompt": request.system_prompt
        },
        "status": "searching",
        "calls": [],
        "ranked_results": [],
        "best_match": None,
        "started_at": datetime.utcnow().isoformat(),
        "completed_at": None
    }
    
    campaigns_db[campaign_id] = campaign
    
    logger.info(f"🚀 Campaign started: {campaign_id} for user {user['email']}")
    
    # Trigger async swarm
    from app.services.orchestrator import run_campaign_swarm
    background_tasks.add_task(
        run_campaign_swarm, 
        campaign_id,
        campaigns_db, 
        request.service_type,
        request.latitude,
        request.longitude
    )
    
    return CampaignResponse(
        campaign_id=campaign_id,
        status="searching",
        message="Campaign started! Searching for providers..."
    )


@router.get("/{campaign_id}", response_model=CampaignStatus)
async def get_campaign(campaign_id: str, user: dict = Depends(get_current_user)):
    """Get current campaign status."""
    
    campaign = campaigns_db.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this campaign")
    
    return CampaignStatus(
        campaign_id=campaign["id"],
        status=campaign["status"],
        calls=campaign["calls"],
        ranked_results=campaign["ranked_results"],
        best_match=campaign["best_match"],
        started_at=campaign["started_at"],
        completed_at=campaign["completed_at"]
    )


@router.post("/{campaign_id}/cancel")
async def cancel_campaign(campaign_id: str, user: dict = Depends(get_current_user)):
    """Cancel an active campaign."""
    
    campaign = campaigns_db.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this campaign")
    
    campaign["status"] = "cancelled"
    campaign["completed_at"] = datetime.utcnow().isoformat()
    
    logger.info(f"❌ Campaign cancelled: {campaign_id}")
    
    # TODO: Terminate any active calls
    
    return {"message": "Campaign cancelled", "campaign_id": campaign_id}


@router.post("/{campaign_id}/confirm/{provider_id}")
async def confirm_booking(
    campaign_id: str, 
    provider_id: str, 
    user: dict = Depends(get_current_user)
):
    """Confirm a booking with the selected provider."""
    
    campaign = campaigns_db.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Find the provider in results
    confirmed_result = next(
        (r for r in campaign["ranked_results"] if r.get("provider_id") == provider_id),
        None
    )
    
    if not confirmed_result:
        raise HTTPException(status_code=404, detail="Provider not found in results")
    
    # Create booking record
    booking_id = str(uuid.uuid4())
    
    logger.info(f"✅ Booking confirmed: {booking_id} with provider {provider_id}")
    
    return {
        "message": "Booking confirmed!",
        "booking_id": booking_id,
        "provider": confirmed_result
    }
