"""Campaign start/status/cancel/confirm endpoints."""
from fastapi import APIRouter
from app.agents.swarm_orchestrator import CampaignManager
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/start")
async def start_campaign(request: dict):
    """Start a campaign group. Returns immediately; calls happen in background."""
    logger.info(f"🚀 Campaign start request: {request}")
    group = await CampaignManager.start_campaign_group(request)
    return {
        "group_id": group["group_id"],
        "status": "started",
        "campaigns": len(group["campaigns"]),
    }


@router.get("/{group_id}")
async def get_campaign(group_id: str):
    """Get campaign group status with all campaigns and results."""
    group = CampaignManager.get_group(group_id)
    if not group:
        return {"error": "Campaign not found"}
    return group


@router.post("/{group_id}/cancel")
async def cancel_campaign(group_id: str):
    group = CampaignManager.get_group(group_id)
    if group:
        group["status"] = "cancelled"
        for c in group["campaigns"]:
            c["status"] = "cancelled"
    return {"status": "cancelled"}


@router.get("/{group_id}/optimize")
async def optimize_campaign(group_id: str):
    """Run multi-appointment optimization across all campaigns in the group."""
    from app.scoring.optimizer import optimize_appointments
    group = CampaignManager.get_group(group_id)
    if not group:
        return {"error": "Campaign not found"}
    result = optimize_appointments(group)
    logger.info(f"📊 Optimization result: {result}")
    return result


@router.post("/{group_id}/confirm/{provider_id}")
async def confirm_provider(group_id: str, provider_id: str):
    """User confirms a specific provider's booking."""
    group = CampaignManager.get_group(group_id)
    if not group:
        return {"error": "Campaign not found"}
    for camp in group["campaigns"]:
        for r in camp["results"]:
            if r.get("provider_id") == provider_id and r.get("status") == "booked":
                return {
                    "confirmed": True,
                    "provider_name": r.get("provider_name"),
                    "slot": r.get("offered_slot"),
                    "service_type": camp["service_type"],
                }
    return {"confirmed": False, "error": "Booking not found"}