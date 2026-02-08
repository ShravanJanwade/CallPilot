"""Trigger outbound calls via ElevenLabs Twilio API."""
import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)


def get_call_number(index: int, real_phone: str) -> str:
    """Get the number to actually call — real or safe test number."""
    if settings.spam_prevent and settings.safe_numbers_list:
        safe = settings.safe_numbers_list[index % len(settings.safe_numbers_list)]
        logger.info(f"🛡️ SPAM PREVENT: Calling {safe} instead of {real_phone}")
        return safe
    return real_phone


async def trigger_outbound_call(to_number: str, dynamic_variables: dict) -> dict:
    """
    Trigger a single outbound call via ElevenLabs Twilio API.
    Returns: {success, conversation_id, call_sid} or {success: False, error}
    """
    url = "https://api.elevenlabs.io/v1/convai/twilio/outbound-call"

    payload = {
        "agent_id": settings.elevenlabs_agent_id,
        "agent_phone_number_id": settings.elevenlabs_phone_number_id,
        "to_number": to_number,
        "conversation_initiation_client_data": {
            "dynamic_variables": dynamic_variables
        }
    }

    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "Content-Type": "application/json"
    }

    logger.info(f"📞 Triggering call to {to_number} | agent={settings.elevenlabs_agent_id} | phone_id={settings.elevenlabs_phone_number_id}")
    logger.info(f"📞 Dynamic vars: {dynamic_variables}")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            logger.info(f"📞 ElevenLabs response: {resp.status_code} {resp.text}")

            if resp.status_code == 200:
                data = resp.json()
                return {
                    "success": True,
                    "conversation_id": data.get("conversation_id"),
                    "call_sid": data.get("callSid"),
                }
            else:
                return {"success": False, "error": resp.text, "conversation_id": None, "call_sid": None}
    except Exception as e:
        logger.error(f"❌ Call trigger error: {e}")
        return {"success": False, "error": str(e), "conversation_id": None, "call_sid": None}


async def get_conversation_details(conversation_id: str) -> dict:
    """Poll ElevenLabs for conversation transcript after call ends."""
    url = f"https://api.elevenlabs.io/v1/convai/conversations/{conversation_id}"
    headers = {"xi-api-key": settings.elevenlabs_api_key}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.json()
            logger.error(f"❌ Conversation fetch failed: {resp.status_code} {resp.text}")
            return {}
    except Exception as e:
        logger.error(f"❌ Conversation fetch error: {e}")
        return {}