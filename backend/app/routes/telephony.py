
"""
Telephony routes — Handle webhooks from Twilio/ElevenLabs.
"""
from fastapi import APIRouter, Request, HTTPException
import logging
from app.routes.ws import broadcast
from app.routes.campaign import campaigns_db

router = APIRouter()
logger = logging.getLogger(__name__)

# TODO: In a real app, we need to map Call SIDs (from telephony) to Campaign/Provider IDs.
# Since we don't have a persistent DB with "Call" records, we'll iterate active campaigns to find the call.
# This is O(N) but fine for a prototype.

def find_campaign_and_call_by_call_id(call_id: str):
    for c_id, campaign in campaigns_db.items():
        if "calls" in campaign:
            for call in campaign["calls"]:
                # We need to store the 'call_id' or 'external_id' on the call record when we start it
                if call.get("external_id") == call_id:
                    return c_id, campaign, call
    return None, None, None

@router.post("/webhook/elevenlabs/status")
async def handle_elevenlabs_status(request: Request):
    """
    Handle status updates from ElevenLabs.
    """
    data = await request.json()
    logger.info(f"📞 ElevenLabs Webhook: {data}")
    
    call_id = data.get("call_id")
    status = data.get("status") # e.g. "success", "failure", "analyzing"
    
    if not call_id:
        return {"status": "ignored", "reason": "no_call_id"}
        
    campaign_id, campaign, call = find_campaign_and_call_by_call_id(call_id)
    
    if not call:
        logger.warning(f"Received webhook for unknown call_id: {call_id}")
        return {"status": "ignored", "reason": "unknown_call"}
        
    # Map ElevenLabs status to our status
    # This depends on exact ElevenLabs webhook payload
    # Let's assume some common ones:
    if status == "connected":
        call["status"] = "connected"
    elif status == "ended":
        # Check analysis for "success" boolean if available
        analysis = data.get("analysis", {})
        success = analysis.get("success")
        
        if success == "true" or success is True:
             call["status"] = "booked"
        elif success == "false" or success is False:
             call["status"] = "no_availability"
        else:
             call["status"] = "completed"
             
        # Transcript handling?
        transcript_summary = analysis.get("transcript_summary")
        if transcript_summary:
             # Append a system note
             call["transcript"].append({"role": "system", "text": f"Summary: {transcript_summary}"})

    # Broadcast update
    await broadcast(campaign_id, {
        "type": "campaign_update",
        "campaign": campaign
    })
    
    return {"status": "ok"}

@router.post("/webhook/twilio/status")
async def handle_twilio_status(request: Request):
    """
    Handle call status updates from Twilio (if using Twilio directly).
    """
    form_data = await request.form()
    call_sid = form_data.get("CallSid")
    call_status = form_data.get("CallStatus") # queued, ringing, in-progress, completed, busy, failed
    
    logger.info(f"📱 Twilio Webhook: {call_sid} - {call_status}")
    
    # Logic similar to above...
    # Update call status
    
    return {"status": "ok"}
