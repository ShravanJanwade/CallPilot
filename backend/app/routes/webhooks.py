"""Post-call webhook — ElevenLabs sends transcript after each call ends."""
from fastapi import APIRouter, Request
import logging
import json
import asyncio

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/post-call")
async def handle_post_call(request: Request):
    """
    ElevenLabs posts here after every call ends.
    Contains conversation_id, transcript, analysis, metadata.
    """
    try:
        raw = await request.body()
        data = json.loads(raw.decode("utf-8", errors="replace"))
        logger.info(f"📞 Post-call webhook received")

        conv_id = data.get("conversation_id", "")
        transcript = data.get("transcript", [])
        analysis = data.get("analysis", {})
        metadata = data.get("metadata", {})

        logger.info(f"📞 Conversation: {conv_id}, transcript entries: {len(transcript) if isinstance(transcript, list) else 'N/A'}")

        # Look up which campaign this belongs to
        from app.agents.swarm_orchestrator import conversation_map, CampaignManager
        from app.routes.ws import broadcast

        mapping = conversation_map.get(conv_id)
        if mapping:
            group_id = mapping["group_id"]
            campaign_id = mapping["campaign_id"]
            provider_id = mapping["provider_id"]

            # Format transcript for frontend
            formatted = []
            if isinstance(transcript, list):
                for entry in transcript:
                    formatted.append({
                        "role": entry.get("role", "unknown"),
                        "message": entry.get("message", ""),
                        "time": entry.get("time_in_call_secs", 0),
                    })
            elif isinstance(transcript, str):
                formatted = [{"role": "system", "message": transcript, "time": 0}]

            CampaignManager.update_provider_result(campaign_id, provider_id, {
                "transcript": formatted,
                "analysis": analysis,
            })

            asyncio.create_task(broadcast(group_id, {
                "type": "transcript_loaded",
                "campaign_id": campaign_id,
                "provider_id": provider_id,
                "transcript": formatted,
            }))

            logger.info(f"✅ Transcript stored for {provider_id} in campaign {campaign_id}")
        else:
            logger.warning(f"⚠️ No campaign mapping for conversation {conv_id}")

    except Exception as e:
        logger.error(f"❌ Post-call webhook error: {e}", exc_info=True)

    # Always return 200 to prevent ElevenLabs from retrying
    return {"status": "ok"}