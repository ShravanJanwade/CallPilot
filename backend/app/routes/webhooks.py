"""
Webhooks route — Handle post-call webhooks from ElevenLabs.
"""
from fastapi import APIRouter, Request, HTTPException
import logging
from app.routes.ws import broadcast
from app.agents.swarm_orchestrator import campaign_groups

router = APIRouter()
logger = logging.getLogger(__name__)

def find_campaign_by_id(campaign_id: str):
    for group in campaign_groups.values():
        for campaign in group.get("campaigns", []):
            if campaign["campaign_id"] == campaign_id:
                return campaign
    return None

@router.post("/post-call")
async def handle_post_call_webhook(request: Request):
    """
    Handle post-call webhook from ElevenLabs (analysis, transcript, etc.).
    """
    try:
        data = await request.json()
        logger.info(f"📞 ElevenLabs Post-Call Webhook received")
        
        conversation_id = data.get("conversation_id")
        if not conversation_id:
            logger.warning("Webhook missing conversation_id")
            return {"status": "ignored", "reason": "missing_conversation_id"}

        # Find campaign and provider info
        # Try to find by iterating campaigns (fallback)
        mapping = None
        campaign = None
        
        for group in campaign_groups.values():
            for camp in group.get("campaigns", []):
                for res in camp.get("results", []):
                    if res.get("conversation_id") == conversation_id:
                        mapping = {
                            "campaign_id": camp["campaign_id"], 
                            "provider_id": res.get("provider_id")
                        }
                        campaign = camp
                        break
                if mapping: break
            if mapping: break
        
        if not mapping or not campaign:
            return {"status": "ignored", "reason": "unknown_conversation_or_campaign"}

        campaign_id = mapping["campaign_id"]
        provider_id = mapping["provider_id"]

        # Update the specific call record
        call_record = next((r for r in campaign["results"] if r["provider_id"] == provider_id), None)
        
        if call_record:
            # Store full transcript if available
            if "transcript" in data:
                # Convert ElevenLabs transcript format to ours if needed
                # For now, just store it raw or processed
                call_record["full_transcript"] = data["transcript"]
            
            # Store audio URL
            if "recording_url" in data:
                call_record["audioUrl"] = data["recording_url"]
                
            # Update status if analysis indicates success/failure
            if "analysis" in data:
                analysis = data["analysis"]
                call_record["analysis"] = analysis
                
                # Check for successful booking in analysis
                if analysis.get("success"):
                     call_record["status"] = "booked"
                elif analysis.get("failure_reason") == "no_availability":
                     call_record["status"] = "no_availability"
                else:
                     # Only mark complete if not already in terminal state
                     if call_record["status"] not in ["booked", "no_availability", "failed"]:
                        call_record["status"] = "completed"

            # Broadcast update
            await broadcast(campaign_id, {
                "type": "campaign_update",
                "campaign": campaign
            })
            
            logger.info(f"✅ Call record updated from webhook for {provider_id}")

        return {"status": "processed"}

    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing error")
