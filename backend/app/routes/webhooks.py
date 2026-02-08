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

            # Now awaited since update_provider_result is async
            await CampaignManager.update_provider_result(campaign_id, provider_id, {
                "transcript": formatted,
                "analysis": analysis,
            })

            # --- DB PERSISTENCE: Save transcript to call record ---
            try:
                from app import database as db
                db_call_id = mapping.get("db_call_id")
                if db_call_id:
                    update_data = {
                        "transcript": json.dumps(formatted),
                        "ended_at": json.dumps(metadata.get("ended_at")) if metadata.get("ended_at") else None,
                    }
                    # Calculate duration if we have timing info
                    if formatted:
                        last_time = max((f.get("time", 0) for f in formatted), default=0)
                        if last_time > 0:
                            update_data["duration_seconds"] = int(last_time)

                    await db.update_call(db_call_id, update_data)
                    logger.info(f"💾 Transcript saved to DB for call {db_call_id}")
                else:
                    logger.info(f"📝 No db_call_id for conversation {conv_id}, transcript in memory only")
            except Exception as e:
                logger.warning(f"⚠️ DB transcript save failed: {e}")

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