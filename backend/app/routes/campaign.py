from fastapi import APIRouter, BackgroundTasks
from app.agents.swarm_orchestrator import CampaignManager
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/start")
async def start_campaign(request: dict):
    """Start a new campaign group."""
    logger.info(f"🚀 Starting campaign: {request}")
    group = await CampaignManager.start_campaign_group(request)
    return {"group_id": group["group_id"], "status": "started", "campaigns": len(group["campaigns"])}


@router.get("/{group_id}")
async def get_campaign(group_id: str):
    """Get campaign group status."""
    group = CampaignManager.get_campaign_group(group_id)
    if not group:
        return {"error": "Campaign not found"}
    return group


@router.post("/{group_id}/cancel")
async def cancel_campaign(group_id: str):
    """Cancel a running campaign."""
    group = CampaignManager.get_campaign_group(group_id)
    if group:
        group["status"] = "cancelled"
        for campaign in group["campaigns"]:
            campaign["status"] = "cancelled"
    return {"status": "cancelled"}
