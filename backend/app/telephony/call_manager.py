"""Trigger outbound calls via ElevenLabs Twilio API."""
import httpx
import logging
import os
from app.config import settings

logger = logging.getLogger(__name__)

# Spam prevention
SPAM_PREVENT = os.getenv("SPAM_PREVENT", "true").lower() == "true"
SAFE_TEST_NUMBERS = [n.strip() for n in os.getenv("SAFE_TEST_NUMBERS", "").split(",") if n.strip()]


def get_call_number(provider_index: int, real_phone: str) -> str:
    """Get the number to actually call — real or safe test number."""
    if SPAM_PREVENT and SAFE_TEST_NUMBERS:
        safe_num = SAFE_TEST_NUMBERS[provider_index % len(SAFE_TEST_NUMBERS)]
        logger.info(f"🛡️ SPAM PREVENT ON: Calling {safe_num} instead of {real_phone}")
        return safe_num
    return real_phone


async def trigger_outbound_call(
    to_number: str,
    dynamic_variables: dict
) -> dict:
    """
    Trigger a single outbound call via ElevenLabs Twilio API.
    Returns: {"success": bool, "conversation_id": str, "callSid": str}
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
    
    logger.info(f"📞 Triggering outbound call to {to_number}")
    logger.info(f"📞 Dynamic vars: {dynamic_variables}")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            
            logger.info(f"📞 ElevenLabs response status: {response.status_code}")
            logger.info(f"📞 ElevenLabs response body: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "conversation_id": data.get("conversation_id"),
                    "call_sid": data.get("callSid"),
                }
            else:
                logger.error(f"❌ ElevenLabs call failed: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": response.text,
                    "conversation_id": None,
                    "call_sid": None,
                }
    except Exception as e:
        logger.error(f"❌ Call trigger error: {e}")
        return {
            "success": False,
            "error": str(e),
            "conversation_id": None,
            "call_sid": None,
        }


async def get_conversation_details(conversation_id: str) -> dict:
    """Poll ElevenLabs for conversation transcript and details after call ends."""
    url = f"https://api.elevenlabs.io/v1/convai/conversations/{conversation_id}"
    headers = {"xi-api-key": settings.elevenlabs_api_key}
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"❌ Failed to get conversation {conversation_id}: {response.text}")
                return {}
    except Exception as e:
        logger.error(f"❌ Conversation fetch error: {e}")
        return {}
