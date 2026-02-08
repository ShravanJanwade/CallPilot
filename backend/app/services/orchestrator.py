"""
Orchestrator service for managing the swarm of AI agents.
Implements spam prevention mode and campaign tracking.
"""
import logging
import asyncio
from typing import Dict
from datetime import datetime

from app.routes.ws import broadcast
from app.routes.providers import search_providers
from app.services.elevenlabs_service import trigger_call
from app.config import settings

logger = logging.getLogger(__name__)

# Global mapping: conversation_id -> {campaign_id, provider_id}
# Used to track which campaign a tool webhook belongs to
conversation_mapping: Dict[str, Dict] = {}


def get_call_number(provider_index: int, real_phone: str) -> str:
    """
    Return the phone number to call based on spam prevention setting.
    
    When spam_prevent is True:
        - Uses safe test numbers in round-robin
        - Shows real provider info in UI but calls test numbers
    
    When spam_prevent is False:
        - Calls the real provider phone number (production mode)
    """
    if settings.spam_prevent and settings.safe_numbers_list:
        safe_number = settings.safe_numbers_list[provider_index % len(settings.safe_numbers_list)]
        logger.info(f"🛡️ Spam prevention: calling safe number {safe_number} instead of {real_phone}")
        return safe_number
    return real_phone


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
    print(f"DEBUG: run_campaign_swarm started for {campaign_id}")
    try:
        logger.info(f"🤖 Starting swarm orchestrator for {campaign_id}")
        
        if settings.spam_prevent:
            logger.info(f"🛡️ Spam prevention mode ACTIVE — calls will go to: {settings.safe_numbers_list}")
        
        # 1. Search for providers
        try:
            search_response = await search_providers(
                category=service_type,
                latitude=lat,
                longitude=lng,
                max_distance=max_distance,
                max_results=max_providers
            )
            target_providers = search_response.providers
            logger.info(f"🔎 Orchestrator found {len(target_providers)} providers for {service_type}")
            print(f"DEBUG: Found {len(target_providers)} providers")
            
        except Exception as e:
            logger.error(f"Provider search failed: {e}")
            print(f"DEBUG: Provider search failed: {e}")
            target_providers = []
            
        # Update Status: Found Providers
        if campaign_id in campaigns_db:
            campaigns_db[campaign_id]["status"] = "calling"
            
            # Initialize call records with additional tracking fields
            initial_calls = []
            for idx, p in enumerate(target_providers):
                provider_id = p.place_id
                
                initial_calls.append({
                    "providerId": provider_id,
                    "providerName": p.name,
                    "phoneNumber": p.phone or "No Phone",
                    "realPhoneNumber": p.phone or "No Phone",  # Store original for display
                    "rating": p.rating,
                    "totalRatings": p.total_ratings,
                    "distanceMiles": p.distance_miles,
                    "status": "queued",
                    "transcript": [],
                    "latitude": p.latitude,
                    "longitude": p.longitude,
                    "conversationId": None,
                    "offeredSlot": None,
                    "bookingConfirmed": False,
                    "score": None,
                    "callStartedAt": None,
                    "callEndedAt": None
                })
                
                # Broadcast provider found event
                await broadcast(campaign_id, {
                    "type": "provider_found",
                    "campaign_id": campaign_id,
                    "provider": {
                        "id": provider_id,
                        "name": p.name,
                        "rating": p.rating,
                        "distance": p.distance_miles,
                        "lat": p.latitude,
                        "lng": p.longitude
                    }
                })
                
            campaigns_db[campaign_id]["calls"] = initial_calls
            
            # Broadcast full update
            await broadcast(campaign_id, {
                "type": "campaign_update",
                "campaign": campaigns_db[campaign_id]
            })

        # 2. Dispatch Agents (Parallel Calls)
        tasks = []
        
        for idx, call_record in enumerate(campaigns_db[campaign_id]["calls"]):
            tasks.append(
                dispatch_call(campaign_id, campaigns_db, call_record, service_type, idx)
            )
            
        # Wait for all calls to initiate (not finish)
        await asyncio.gather(*tasks)
        
        logger.info(f"✅ All agents dispatched for campaign {campaign_id}")
        print(f"DEBUG: All agents dispatched")

    except Exception as e:
        logger.exception(f"CRITICAL: Swarm orchestrator failed: {e}")
        print(f"DEBUG: CRITICAL FAILURE: {e}")


async def dispatch_call(
    campaign_id: str, 
    campaigns_db: Dict, 
    call_record: Dict, 
    service_type: str,
    provider_index: int
):
    """
    Initiate a single call and update the record.
    Implements spam prevention by routing to safe numbers when enabled.
    """
    real_phone = call_record.get("phoneNumber")
    provider_id = call_record.get("providerId")
    provider_name = call_record.get("providerName")
    
    if not real_phone or real_phone == "No Phone":
        call_record["status"] = "failed"
        call_record["failReason"] = "No phone number available"
        await broadcast(campaign_id, {
            "type": "call_failed",
            "campaign_id": campaign_id,
            "provider_id": provider_id,
            "reason": "No phone number"
        })
        return

    # Determine actual number to call (spam prevention)
    actual_number = get_call_number(provider_index, real_phone)
    
    # Get agent config
    agent_config = campaigns_db[campaign_id].get("agent_config", {})
    
    try:
        call_record["status"] = "dialing"
        call_record["callStartedAt"] = datetime.utcnow().isoformat()
        
        await broadcast(campaign_id, {
            "type": "call_started",
            "campaign_id": campaign_id,
            "provider_id": provider_id,
            "provider_name": provider_name
        })
        
        # Prepare context for the agent (passed as dynamic variables)
        context_data = {
            "service_type": service_type,
            "provider_name": provider_name,
            "agent_name": agent_config.get("name", "Alex"),
            "preferred_date": campaigns_db[campaign_id].get("date_range", {}).get("start", "this week")
        }
        
        # Trigger the call with campaign tracking
        response = await trigger_call(
            phone_number=actual_number,
            context_data=context_data,
            campaign_id=campaign_id,
            provider_id=provider_id
        )
        
        # Extract conversation_id for tracking
        conversation_id = response.get("conversation_id") or response.get("call_id")
        call_record["conversationId"] = conversation_id
        call_record["status"] = "ringing"
        
        # Store mapping for tool webhook tracking
        if conversation_id:
            conversation_mapping[conversation_id] = {
                "campaign_id": campaign_id,
                "provider_id": provider_id,
                "provider_name": provider_name
            }
            logger.info(f"📞 Mapped conversation {conversation_id} -> campaign {campaign_id}, provider {provider_id}")
        
        await broadcast(campaign_id, {
            "type": "call_status",
            "campaign_id": campaign_id,
            "provider_id": provider_id,
            "status": "ringing",
            "conversation_id": conversation_id
        })
        
    except Exception as e:
        logger.error(f"Call dispatch failed for {provider_name}: {e}")
        call_record["status"] = "failed"
        call_record["failReason"] = str(e)
        
        await broadcast(campaign_id, {
            "type": "call_failed",
            "campaign_id": campaign_id,
            "provider_id": provider_id,
            "reason": str(e)
        })
        
    # Broadcast full campaign update
    if campaign_id in campaigns_db:
        await broadcast(campaign_id, {
            "type": "campaign_update", 
            "campaign": campaigns_db[campaign_id]
        })


def get_campaign_by_conversation(conversation_id: str) -> Dict | None:
    """
    Look up campaign and provider info by conversation ID.
    Used by tool webhooks to identify which campaign a call belongs to.
    """
    return conversation_mapping.get(conversation_id)


def get_campaign_by_provider_name(provider_name: str, campaigns_db: Dict) -> Dict | None:
    """
    Fallback: find campaign by provider name matching.
    Used when conversation_id is not available.
    """
    for campaign_id, campaign in campaigns_db.items():
        for call in campaign.get("calls", []):
            if call.get("providerName", "").lower() == provider_name.lower():
                return {
                    "campaign_id": campaign_id,
                    "provider_id": call.get("providerId"),
                    "provider_name": provider_name
                }
    return None
