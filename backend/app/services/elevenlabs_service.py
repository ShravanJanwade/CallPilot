"""
Service for interacting with ElevenLabs Conversational AI.
Supports campaign tracking via dynamic variables.
"""
import httpx
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


async def trigger_call(
    phone_number: str,
    agent_id: str = None,
    context_data: dict = None,
    campaign_id: str = None,
    provider_id: str = None
) -> dict:
    """
    Trigger an outbound call using ElevenLabs Conversational AI.
    
    Args:
        phone_number: The destination phone number (E.164 format)
        agent_id: The ElevenLabs Agent ID (defaults to settings)
        context_data: Dictionary of context variables to pass to the agent
        campaign_id: Campaign ID for tracking (passed as dynamic variable)
        provider_id: Provider ID for tracking (passed as dynamic variable)
        
    Returns:
        dict: The API response containing conversation_id
    """
    if not settings.elevenlabs_api_key:
        logger.error("ElevenLabs API Key not configured")
        raise ValueError("ElevenLabs API Key not configured")
        
    agent = agent_id or settings.elevenlabs_agent_id
    if not agent:
        logger.error("ElevenLabs Agent ID not configured")
        raise ValueError("ElevenLabs Agent ID not configured")

    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "Content-Type": "application/json"
    }
    
    # Build dynamic variables for the agent
    # These will be available in the agent's system prompt as {{variable_name}}
    # and can be passed through to tool calls
    dynamic_vars = {}
    
    # Add tracking IDs (critical for webhook routing)
    if campaign_id:
        dynamic_vars["campaign_id"] = campaign_id
    if provider_id:
        dynamic_vars["provider_id"] = provider_id
    
    # Add context data
    if context_data:
        for key, value in context_data.items():
            if value is not None:
                dynamic_vars[key] = str(value)
    
    # Build payload according to ElevenLabs API spec
    # https://elevenlabs.io/docs/conversational-ai/api-reference/create-phone-call
    payload = {
        "agent_id": agent,
        "to_number": phone_number,
    }
    
    # Add from_number if configured (uses Twilio number imported to ElevenLabs)
    if settings.elevenlabs_phone_number_id:
        payload["phone_number_id"] = settings.elevenlabs_phone_number_id
    elif settings.twilio_phone_number:
        payload["from_number"] = settings.twilio_phone_number
    
    # Pass dynamic variables via conversation_initiation_client_data
    if dynamic_vars:
        payload["conversation_initiation_client_data"] = {
            "dynamic_variables": dynamic_vars
        }
    
    logger.info(f"📞 Triggering call to {phone_number} with dynamic vars: {list(dynamic_vars.keys())}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # ElevenLabs Conversational AI phone call endpoint
            # Try the Twilio outbound endpoint first (for Twilio-imported numbers)
            api_url = "https://api.elevenlabs.io/v1/convai/twilio/outbound-call"
            
            response = await client.post(api_url, json=payload, headers=headers)
            
            # If Twilio endpoint fails, try the standard phone-calls endpoint
            if response.status_code == 404:
                logger.info("Twilio endpoint not found, trying standard phone-calls endpoint")
                api_url = "https://api.elevenlabs.io/v1/convai/phone-calls"
                response = await client.post(api_url, json=payload, headers=headers)
            
            response.raise_for_status()
            
            data = response.json()
            conversation_id = data.get("conversation_id") or data.get("call_id")
            
            logger.info(f"✅ Call triggered to {phone_number}: conversation_id={conversation_id}")
            
            return {
                "conversation_id": conversation_id,
                "call_id": data.get("call_id"),
                "status": data.get("status", "initiated"),
                "raw_response": data
            }
            
        except httpx.HTTPStatusError as e:
            error_text = e.response.text if hasattr(e.response, 'text') else str(e)
            logger.error(f"ElevenLabs API Error: {error_text}")
            raise ValueError(f"ElevenLabs API Error: {error_text}")
        except httpx.TimeoutException:
            logger.error("ElevenLabs API timeout")
            raise ValueError("ElevenLabs API timeout - call may have been initiated")
        except Exception as e:
            logger.error(f"Failed to trigger call: {e}")
            raise


async def get_conversation(conversation_id: str) -> Optional[dict]:
    """
    Get conversation details including transcript from ElevenLabs.
    
    Args:
        conversation_id: The conversation ID from a previous call
        
    Returns:
        dict: Conversation details including transcript, or None if not found
    """
    if not settings.elevenlabs_api_key:
        return None
    
    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            api_url = f"https://api.elevenlabs.io/v1/convai/conversations/{conversation_id}"
            response = await client.get(api_url, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.warning(f"Failed to get conversation {conversation_id}: {e}")
            return None


async def get_conversation_transcript(conversation_id: str) -> list[dict]:
    """
    Get the transcript for a conversation.
    
    Args:
        conversation_id: The conversation ID
        
    Returns:
        list: List of transcript entries [{role, message, timestamp}]
    """
    conversation = await get_conversation(conversation_id)
    if not conversation:
        return []
    
    transcript = conversation.get("transcript", [])
    
    # Normalize format
    normalized = []
    for entry in transcript:
        normalized.append({
            "role": entry.get("role", "unknown"),
            "message": entry.get("message", entry.get("text", "")),
            "timestamp": entry.get("timestamp", entry.get("time"))
        })
    
    return normalized
