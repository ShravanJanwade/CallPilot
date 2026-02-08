
"""
Orchestrator service for managing the swarm of AI agents.
"""
import logging
import asyncio
from typing import List, Dict

from app.routes.ws import broadcast
from app.routes.providers import search_providers
from app.services.elevenlabs_service import trigger_call
from app.config import settings

logger = logging.getLogger(__name__)

async def run_campaign_swarm(
    campaign_id: str, 
    campaigns_db: Dict, 
    service_type: str, 
    lat: float, 
    lng: float,
    max_distance: float = 10.0,
    max_providers: int = 5
):
    """
    Orchestrate the campaign: search providers, filter, and dispatch agents.
    """
    logger.info(f"🤖 Starting swarm orchestrator for {campaign_id}")
    
    # 1. Search for providers
    try:
        # search_providers returns SearchResponse
        search_response = await search_providers(
            category=service_type,
            latitude=lat,
            longitude=lng,
            max_distance=max_distance,
            max_results=max_providers
        )
        target_providers = search_response.providers
        
    except Exception as e:
        logger.error(f"Provider search failed: {e}")
        target_providers = []
        
    # Update Status: Found Providers
    if campaign_id in campaigns_db:
        campaigns_db[campaign_id]["status"] = "in_progress"
        
        # Initialize call records
        initial_calls = []
        for p in target_providers:
            # p is a ProviderResult object
            
            # NOTE: We are relying on `search_providers` returning phone numbers.
            # `search_providers` implementation fetches details to get phone numbers.
            # But if it's missing, we default to placeholder.
            
            initial_calls.append({
                "providerId": p.place_id,
                "providerName": p.name,
                "phoneNumber": p.phone or "No Phone", 
                "status": "queued",
                "transcript": [],
                "latitude": p.latitude,
                "longitude": p.longitude,
                "external_id": None
            })
            
        campaigns_db[campaign_id]["calls"] = initial_calls
        
        # Broadcast
        await broadcast(campaign_id, {
            "type": "campaign_update",
            "campaign": campaigns_db[campaign_id]
        })

    # 2. Dispatch Agents (Parallel Calls)
    # We will launch tasks for each provider
    
    tasks = []
    
    for call_record in campaigns_db[campaign_id]["calls"]:
         tasks.append(
             payload_call(campaign_id, campaigns_db, call_record, service_type)
         )
         
    # Wait for all calls to initiate (not finish)
    await asyncio.gather(*tasks)
    
    logger.info(f"All agents dispatched for campaign {campaign_id}")


async def payload_call(campaign_id: str, campaigns_db: Dict, call_record: Dict, service_type: str):
    """
    Initiate a single call and update the record.
    """
    
    # SAFETY CHECK: In dev mode, maybe don't call real numbers unless explicitly allowed.
    # We will try to use the number from the record.
    phone_number = call_record.get("phoneNumber")
    
    if not phone_number:
        call_record["status"] = "failed"
        return

    # TODO: Phone number formatting to E.164
    # For now, we assume strict user compliance or update later.
    
    # Get agent config
    agent_config = campaigns_db[campaign_id].get("agent_config", {})
    
    try:
        call_record["status"] = "dialing"
        await broadcast(campaign_id, {"type": "campaign_update", "campaign": campaigns_db[campaign_id]})
        
        # Prepare context for the agent
        context_data = {
            "service_type": service_type,
            "provider_name": call_record["providerName"],
            "agent_name": agent_config.get("name", "Alex"),
            "first_message": agent_config.get("first_message"),
            "system_prompt": agent_config.get("system_prompt")
        }
        
        response = await trigger_call(
            phone_number=settings.twilio_phone_number, # TESTING: Safely calling user/verified number
            # phone_number=phone_number, # REAL MODE: Uncomment this to call the actual provider
            
            # TODO: If the ElevenLabs Agent API supports passing overrides for first_message/prompt via variables,
            # we pass them here. Otherwise, the Agent ID determines behavior.
            # Assuming we might have different Agent IDs for different configs, or we use variables.
            
            context_data=context_data
        )
        
        call_id = response.get("call_id")
        call_record["external_id"] = call_id
        call_record["status"] = "ringing"
        
    except Exception as e:
        logger.error(f"Call dispatch failed: {e}")
        call_record["status"] = "failed"
        
    # Broadcast update
    if campaign_id in campaigns_db:
         await broadcast(campaign_id, {
            "type": "campaign_update", 
            "campaign": campaigns_db[campaign_id]
        })
