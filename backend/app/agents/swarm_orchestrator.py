"""
Swarm Orchestrator — manages parallel outbound calling campaigns.
Searches providers, triggers calls, tracks results, pushes WebSocket updates.
"""
import asyncio
import uuid
import logging
from datetime import datetime
from typing import Optional

from app.tools.places_tool import PlacesService
from app.tools.distance_tool import DistanceService
from app.telephony.call_manager import trigger_outbound_call, get_call_number, get_conversation_details
# from app.scoring.ranker import compute_score # ranker module not requested, assuming it exists or skipping for now if not critical
from app.routes.ws import broadcast

logger = logging.getLogger(__name__)

# In-memory campaign store (replace with DB for production)
campaign_groups: dict = {}
# Maps conversation_id → (group_id, campaign_id, provider_id)
conversation_map: dict = {}

places_service = PlacesService()
distance_service = DistanceService()


class CampaignManager:
    
    @staticmethod
    async def start_campaign_group(request: dict, user_id: str = "default") -> dict:
        """
        Start a campaign group. One group can contain multiple service types.
        Each service type gets its own campaign with parallel calls.
        """
        group_id = f"grp_{uuid.uuid4().hex[:12]}"
        
        group = {
            "group_id": group_id,
            "user_id": user_id,
            "status": "running",
            "campaigns": [],
            "created_at": datetime.utcnow().isoformat(),
        }
        
        service_types = request.get("service_types", [])
        if isinstance(service_types, str):
            service_types = [service_types]
        
        location = request.get("location", "Boston, MA")
        max_distance = request.get("max_distance_miles", 10)
        max_providers = request.get("max_providers_per_type", 3)
        preferred_date = request.get("preferred_date", "this week")
        preferences = request.get("preferences", {})
        preferred_providers = request.get("preferred_providers", [])
        
        for svc_type in service_types:
            campaign_id = f"camp_{uuid.uuid4().hex[:12]}"
            campaign = {
                "campaign_id": campaign_id,
                "group_id": group_id,
                "service_type": svc_type,
                "location": location,
                "max_distance": max_distance,
                "max_providers": max_providers,
                "preferred_date": preferred_date,
                "preferences": preferences,
                "preferred_providers": preferred_providers,
                "status": "searching",
                "providers": [],
                "results": [],
                "best_match": None,
            }
            group["campaigns"].append(campaign)
        
        campaign_groups[group_id] = group
        
        # Launch campaigns in parallel (non-blocking)
        for campaign in group["campaigns"]:
            asyncio.create_task(
                CampaignManager._run_campaign(group_id, campaign)
            )
        
        return group
    
    @staticmethod
    async def _run_campaign(group_id: str, campaign: dict):
        """Run a single campaign: search → score → call → collect results."""
        campaign_id = campaign["campaign_id"]
        
        try:
            # Step 1: Search for providers
            logger.info(f"🔍 Searching for {campaign['service_type']} near {campaign['location']}")
            
            await broadcast(group_id, {
                "type": "campaign_status",
                "campaign_id": campaign_id,
                "status": "searching",
                "message": f"Searching for {campaign['service_type']} providers..."
            })
            
            providers = await places_service.search_providers(
                category=campaign["service_type"],
                location=campaign["location"],
                radius_miles=campaign["max_distance"]
            )
            
            if not providers:
                campaign["status"] = "no_providers"
                await broadcast(group_id, {
                    "type": "campaign_status",
                    "campaign_id": campaign_id,
                    "status": "no_providers",
                    "message": f"No {campaign['service_type']} providers found nearby."
                })
                return
            
            # Step 2: Get distances
            logger.info(f"📏 Getting distances for {len(providers)} providers")
            
            # Geocode the user's location for distance calculation
            import httpx
            from app.config import settings
            geo_url = "https://maps.googleapis.com/maps/api/geocode/json"
            async with httpx.AsyncClient() as client:
                geo_resp = await client.get(geo_url, params={
                    "address": campaign["location"],
                    "key": settings.google_maps_api_key
                })
                geo_data = geo_resp.json()
                if geo_data.get("results"):
                    origin_lat = geo_data["results"][0]["geometry"]["location"]["lat"]
                    origin_lng = geo_data["results"][0]["geometry"]["location"]["lng"]
                else:
                    origin_lat, origin_lng = 42.3601, -71.0589  # Default Boston
            
            destinations = [
                {"lat": p["lat"], "lng": p["lng"], "provider_id": p["place_id"]}
                for p in providers
            ]
            distances = await distance_service.get_distances(origin_lat, origin_lng, destinations)
            
            # Attach distances to providers
            for p in providers:
                dist_info = distances.get(p["place_id"], {})
                p["distance_miles"] = dist_info.get("distance_miles", 999)
                p["travel_minutes"] = dist_info.get("duration_minutes", 999)
                p["distance_text"] = dist_info.get("distance_text", "")
                p["duration_text"] = dist_info.get("duration_text", "")
                p["provider_id"] = p["place_id"]  # Use place_id as provider_id
            
            # Filter by max distance
            providers = [p for p in providers if p["distance_miles"] <= campaign["max_distance"]]
            
            # Step 3: Sort by initial score and take top N
            providers.sort(key=lambda p: (-p.get("rating", 0), p.get("distance_miles", 999)))
            providers = providers[:campaign["max_providers"]]
            
            campaign["providers"] = providers
            
            # Push providers to frontend
            await broadcast(group_id, {
                "type": "providers_found",
                "campaign_id": campaign_id,
                "providers": providers,
                "origin": {"lat": origin_lat, "lng": origin_lng}
            })
            
            # Step 4: Launch parallel calls
            campaign["status"] = "calling"
            await broadcast(group_id, {
                "type": "campaign_status",
                "campaign_id": campaign_id,
                "status": "calling",
                "message": f"Calling {len(providers)} {campaign['service_type']} providers..."
            })
            
            call_tasks = []
            for i, provider in enumerate(providers):
                task = asyncio.create_task(
                    CampaignManager._make_call(group_id, campaign_id, provider, i, campaign)
                )
                call_tasks.append(task)
                # Small delay between calls to avoid rate limits
                await asyncio.sleep(1)
            
            # Wait for all calls to complete (with timeout)
            await asyncio.gather(*call_tasks, return_exceptions=True)
            
            # Step 5: Compute final rankings
            campaign["status"] = "completed"
            
            # Rank by score
            booked = [r for r in campaign["results"] if r.get("status") == "booked"]
            if booked:
                booked.sort(key=lambda r: r.get("score", 0), reverse=True)
                campaign["best_match"] = booked[0]
            
            await broadcast(group_id, {
                "type": "campaign_complete",
                "campaign_id": campaign_id,
                "results": campaign["results"],
                "best_match": campaign["best_match"],
            })
            
            logger.info(f"✅ Campaign {campaign_id} complete. {len(booked)} bookings found.")
            
        except Exception as e:
            logger.error(f"❌ Campaign {campaign_id} error: {e}", exc_info=True)
            campaign["status"] = "error"
            await broadcast(group_id, {
                "type": "campaign_error",
                "campaign_id": campaign_id,
                "error": str(e)
            })
    
    @staticmethod
    async def _make_call(group_id: str, campaign_id: str, provider: dict, index: int, campaign: dict):
        """Trigger a single outbound call to a provider."""
        provider_id = provider["provider_id"]
        provider_name = provider["name"]
        real_phone = provider.get("international_phone") or provider.get("phone", "")
        
        if not real_phone:
            logger.warning(f"⚠️ No phone number for {provider_name}, skipping")
            await broadcast(group_id, {
                "type": "call_skipped",
                "campaign_id": campaign_id,
                "provider_id": provider_id,
                "provider_name": provider_name,
                "reason": "No phone number available"
            })
            return
        
        # Get actual number to call (safe or real)
        call_number = get_call_number(index, real_phone)
        
        # Push "call starting" to frontend
        await broadcast(group_id, {
            "type": "call_started",
            "campaign_id": campaign_id,
            "provider_id": provider_id,
            "provider_name": provider_name,
            "provider_rating": provider.get("rating", 0),
            "provider_distance": provider.get("distance_miles", 0),
            "call_number": call_number,
        })
        
        # Build dynamic variables for the agent
        dynamic_vars = {
            "campaign_id": campaign_id,
            "provider_id": provider_id,
            "provider_name": provider_name,
            "service_type": campaign["service_type"],
            "preferred_date": campaign.get("preferred_date", "this week"),
            "agent_name": "Alex",
            "current_best_offer": CampaignManager._get_current_best_offer(campaign),
        }
        
        # Trigger the call
        result = await trigger_outbound_call(call_number, dynamic_vars)
        
        if result["success"]:
            conversation_id = result["conversation_id"]
            
            # Store mapping so tool webhooks can find this campaign
            conversation_map[conversation_id] = {
                "group_id": group_id,
                "campaign_id": campaign_id,
                "provider_id": provider_id,
            }
            
            await broadcast(group_id, {
                "type": "call_connected",
                "campaign_id": campaign_id,
                "provider_id": provider_id,
                "conversation_id": conversation_id,
            })
            
            # Wait for call to complete (poll for status)
            # The tool webhooks will update the campaign state in real-time
            # But we also poll to detect when the call ends
            await CampaignManager._wait_for_call_completion(
                group_id, campaign_id, provider_id, conversation_id, campaign
            )
        else:
            logger.error(f"❌ Failed to call {provider_name}: {result.get('error')}")
            await broadcast(group_id, {
                "type": "call_failed",
                "campaign_id": campaign_id,
                "provider_id": provider_id,
                "provider_name": provider_name,
                "error": result.get("error", "Unknown error"),
            })
            campaign["results"].append({
                "provider_id": provider_id,
                "provider_name": provider_name,
                "status": "failed",
                "error": result.get("error"),
            })
    
    @staticmethod
    async def _wait_for_call_completion(
        group_id: str, campaign_id: str, provider_id: str,
        conversation_id: str, campaign: dict
    ):
        """Poll ElevenLabs to detect when a call ends, then fetch transcript."""
        max_wait = 180  # 3 minutes max
        poll_interval = 5  # Check every 5 seconds
        elapsed = 0
        
        while elapsed < max_wait:
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval
            
            # Check if tool webhooks already updated this provider's status
            existing = next(
                (r for r in campaign["results"] if r["provider_id"] == provider_id),
                None
            )
            if existing and existing.get("status") in ["booked", "no_availability"]:
                logger.info(f"✅ Call to {provider_id} already resolved via webhook")
                break
            
            # Poll ElevenLabs for conversation status
            try:
                details = await get_conversation_details(conversation_id)
                status = details.get("status", "")
                
                if status in ["done", "ended", "failed"]:
                    logger.info(f"📞 Call {conversation_id} ended with status: {status}")
                    
                    # If no webhook fired, create a result from the conversation data
                    if not existing:
                        transcript = details.get("transcript", "")
                        campaign["results"].append({
                            "provider_id": provider_id,
                            "provider_name": next(
                                (p["name"] for p in campaign["providers"] if p["provider_id"] == provider_id),
                                "Unknown"
                            ),
                            "status": "completed",
                            "conversation_id": conversation_id,
                            "transcript": transcript,
                        })
                    
                    await broadcast(group_id, {
                        "type": "call_ended",
                        "campaign_id": campaign_id,
                        "provider_id": provider_id,
                        "conversation_id": conversation_id,
                        "transcript": details.get("transcript", ""),
                    })
                    break
                    
            except Exception as e:
                logger.warning(f"⚠️ Poll error for {conversation_id}: {e}")
        
        if elapsed >= max_wait:
            logger.warning(f"⏰ Call {conversation_id} timed out")
            campaign["results"].append({
                "provider_id": provider_id,
                "status": "timeout",
            })
    
    @staticmethod
    def _get_current_best_offer(campaign: dict) -> str:
        """Get the best offer so far for cross-call intelligence."""
        booked = [r for r in campaign.get("results", []) if r.get("status") == "booked"]
        if booked:
            best = booked[0]
            return f"{best.get('offered_slot', {}).get('date', '')} at {best.get('offered_slot', {}).get('time', '')} at {best.get('provider_name', '')}"
        return ""
    
    @staticmethod
    def get_campaign_group(group_id: str) -> Optional[dict]:
        return campaign_groups.get(group_id)
    
    @staticmethod
    def update_provider_result(campaign_id: str, provider_id: str, result_data: dict):
        """Called by tool webhooks to update a provider's status."""
        for group in campaign_groups.values():
            for campaign in group["campaigns"]:
                if campaign["campaign_id"] == campaign_id:
                    # Update or add result
                    existing = next(
                        (r for r in campaign["results"] if r["provider_id"] == provider_id),
                        None
                    )
                    if existing:
                        existing.update(result_data)
                    else:
                        result_data["provider_id"] = provider_id
                        campaign["results"].append(result_data)
                    return
