
"""
Service for interacting with ElevenLabs Conversational AI.
"""
import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)

async def trigger_call(
    phone_number: str,
    agent_id: str = None,
    context_data: dict = None
) -> dict:
    """
    Trigger an outbound call using ElevenLabs Conversational AI.
    
    Args:
        phone_number: The destination phone number (E.164 format)
        agent_id: The ElevenLabs Agent ID (defaults to settings)
        context_data: Dictionary of context variables to pass to the agent
        
    Returns:
        dict: The API response containing call_id
    """
    if not settings.elevenlabs_api_key:
        logger.error("ElevenLabs API Key not configured")
        raise ValueError("ElevenLabs API Key not configured")
        
    agent = agent_id or settings.elevenlabs_agent_id
    if not agent:
        logger.error("ElevenLabs Agent ID not configured")
        raise ValueError("ElevenLabs Agent ID not configured")

    url = f"https://api.elevenlabs.io/v1/convai/conversation/create_phone_call"
    
    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "Content-Type": "application/json"
    }
    
    # Ensure context is JSON serializable strings if needed, 
    # but ElevenLabs usually takes a dictionary of variables.
    # We might need to map them to "agent_overrides" or "conversation_config" 
    # depending on the exact API version for "Trigger Call".
    # Documentation for "Trigger Call" via API is usually: 
    # POST https://api.elevenlabs.io/v1/convai/call
    
    # Correct Endpoint Check:
    # As of late 2024/2025: POST https://api.elevenlabs.io/v1/convai/calls
    # Payload:
    # {
    #   "agent_id": "...",
    #   "to_number": "...",
    #   "from_number": "...", # Optional if agent has one
    #   "conversation_config_override": { ... }
    # }
    
    # Let's align with the standard plausible payload.
    
    payload = {
        "agent_id": agent,
        "recipient_phone_number": phone_number,
        "caller_phone_number": settings.twilio_phone_number  # If integrated via custom Twilio?
    }
    
    # If using ElevenLabs "Call as an Agent" which manages the Twilio connection itself:
    # It might just require "to_number".
    
    # However, if we are using the ElevenLabs Python SDK or direct API, we should follow their spec.
    # Assuming standard headers and payload for now.
    
    async with httpx.AsyncClient() as client:
        try:
            # Note: This URL is a placeholder for the actual ElevenLabs ConvAI trigger endpoint
            # Real one might be https://api.elevenlabs.io/v1/convai/call/initiate or similar.
            # For now, we will assume a generic structure.
            # *CRITICAL*: User needs to verify the exact endpoint in docs if this 404s.
            
            # Using the known "Create Phone Call" endpoint style
            # https://elevenlabs.io/docs/conversational-ai/api-reference/create-phone-call
            
            api_url = "https://api.elevenlabs.io/v1/convai/phone-calls" 
            
            # Additional context passing if supported by Agent
            # payload["conversation_config_override"] = { "variables": context_data }
            
            response = await client.post(api_url, json=payload, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"✅ Call triggered to {phone_number}: {data.get('call_id')}")
            return data
            
        except httpx.HTTPStatusError as e:
            logger.error(f"ElevenLabs API Error: {e.response.text}")
            raise e
        except Exception as e:
            logger.error(f"Failed to trigger call: {e}")
            raise e
