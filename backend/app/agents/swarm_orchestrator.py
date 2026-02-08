"""
Swarm Orchestrator — the brain of CallPilot.
Searches providers → launches parallel calls → tracks results → ranks → pushes live updates.
Includes cross-call intelligence: later calls know about earlier offers.
"""
import asyncio
import uuid
import logging
from datetime import datetime

from app.tools.places_tool import PlacesService
from app.tools.distance_tool import DistanceService
from app.telephony.call_manager import trigger_outbound_call, get_call_number, get_conversation_details
from app.scoring.ranker import rank_results

logger = logging.getLogger(__name__)

# In-memory stores
campaign_groups: dict = {}
conversation_map: dict = {}  # conversation_id → {group_id, campaign_id, provider_id}

places = PlacesService()
distances = DistanceService()


async def _broadcast(room_id: str, message: dict):
    """Safe broadcast — import here to avoid circular imports."""
    try:
        from app.routes.ws import broadcast
        await broadcast(room_id, message)
    except Exception as e:
        logger.warning(f"⚠️ Broadcast failed: {e}")


class CampaignManager:

    @staticmethod
    async def start_campaign_group(request: dict, user_id: str = "default") -> dict:
        group_id = f"grp_{uuid.uuid4().hex[:12]}"
        service_types = request.get("service_types", [])
        if isinstance(service_types, str):
            service_types = [service_types]

        group = {
            "group_id": group_id,
            "user_id": user_id,
            "status": "running",
            "campaigns": [],
            "created_at": datetime.utcnow().isoformat(),
        }

        for svc in service_types:
            cid = f"camp_{uuid.uuid4().hex[:12]}"
            campaign = {
                "campaign_id": cid,
                "group_id": group_id,
                "service_type": svc,
                "location": request.get("location", "Boston, MA"),
                "max_distance": request.get("max_distance_miles", 10),
                "max_providers": request.get("max_providers_per_type", 3),
                "preferred_date": request.get("preferred_date", "this week"),
                "preferences": request.get("preferences", {
                    "availability": 0.4, "rating": 0.3, "distance": 0.2, "preference": 0.1
                }),
                "preferred_providers": request.get("preferred_providers", []),
                "status": "searching",
                "providers": [],
                "results": [],
                "best_match": None,
                "origin_lat": 0, "origin_lng": 0,
            }
            group["campaigns"].append(campaign)

        campaign_groups[group_id] = group

        # Launch all campaigns as background tasks
        for campaign in group["campaigns"]:
            asyncio.create_task(CampaignManager._run_campaign(group_id, campaign))

        return group

    @staticmethod
    async def _run_campaign(group_id: str, campaign: dict):
        cid = campaign["campaign_id"]
        svc = campaign["service_type"]
        try:
            # --- STEP 1: Search providers ---
            await _broadcast(group_id, {
                "type": "campaign_status", "campaign_id": cid,
                "status": "searching", "message": f"Searching for {svc} providers..."
            })

            providers, lat, lng = await places.search_providers(
                category=svc, location=campaign["location"],
                radius_miles=campaign["max_distance"]
            )
            campaign["origin_lat"], campaign["origin_lng"] = lat, lng

            if not providers:
                campaign["status"] = "no_providers"
                await _broadcast(group_id, {
                    "type": "campaign_status", "campaign_id": cid,
                    "status": "no_providers", "message": f"No {svc} providers found."
                })
                return

            # --- STEP 2: Get distances ---
            dests = [{"lat": p["lat"], "lng": p["lng"], "provider_id": p["provider_id"]} for p in providers]
            dist_map = await distances.get_distances(lat, lng, dests)

            for p in providers:
                d = dist_map.get(p["provider_id"], {})
                p["distance_miles"] = d.get("distance_miles", 999)
                p["travel_minutes"] = d.get("duration_minutes", 999)
                p["distance_text"] = d.get("distance_text", "")
                p["duration_text"] = d.get("duration_text", "")

            # Filter + sort + limit
            providers = [p for p in providers if p["distance_miles"] <= campaign["max_distance"]]
            providers.sort(key=lambda p: (-p.get("rating", 0), p.get("distance_miles", 999)))
            providers = providers[:campaign["max_providers"]]
            campaign["providers"] = providers

            await _broadcast(group_id, {
                "type": "providers_found", "campaign_id": cid,
                "providers": providers, "origin": {"lat": lat, "lng": lng}
            })

            # --- STEP 3: Call preferred providers first ---
            pref_names = [pp.get("name", "").lower() for pp in campaign.get("preferred_providers", [])]
            preferred = [p for p in providers if p["name"].lower() in pref_names]
            others = [p for p in providers if p["name"].lower() not in pref_names]
            ordered = preferred + others

            campaign["status"] = "calling"
            await _broadcast(group_id, {
                "type": "campaign_status", "campaign_id": cid,
                "status": "calling", "message": f"Calling {len(ordered)} {svc} providers..."
            })

            # --- STEP 4: Launch parallel calls ---
            tasks = []
            for i, prov in enumerate(ordered):
                t = asyncio.create_task(
                    CampaignManager._make_call(group_id, cid, prov, i, campaign)
                )
                tasks.append(t)
                await asyncio.sleep(1.5)  # Stagger calls slightly

            await asyncio.gather(*tasks, return_exceptions=True)

            # --- STEP 5: Rank results ---
            campaign["status"] = "completed"
            pref_name_list = [pp.get("name", "") for pp in campaign.get("preferred_providers", [])]
            campaign["results"] = rank_results(
                campaign["results"], campaign["providers"],
                campaign["preferences"], pref_name_list, campaign["max_distance"]
            )

            booked = [r for r in campaign["results"] if r.get("status") == "booked"]
            if booked:
                campaign["best_match"] = booked[0]

            await _broadcast(group_id, {
                "type": "campaign_complete", "campaign_id": cid,
                "results": campaign["results"], "best_match": campaign["best_match"],
            })
            logger.info(f"✅ Campaign {cid} done. {len(booked)} bookings.")

        except Exception as e:
            logger.error(f"❌ Campaign {cid} error: {e}", exc_info=True)
            campaign["status"] = "error"
            await _broadcast(group_id, {
                "type": "campaign_error", "campaign_id": cid, "error": str(e)
            })

    @staticmethod
    async def _make_call(group_id: str, campaign_id: str, provider: dict, index: int, campaign: dict):
        pid = provider["provider_id"]
        name = provider["name"]
        real_phone = provider.get("international_phone") or provider.get("phone", "")

        if not real_phone:
            logger.warning(f"⚠️ No phone for {name}, skipping")
            campaign["results"].append({"provider_id": pid, "provider_name": name, "status": "skipped", "reason": "No phone number"})
            await _broadcast(group_id, {
                "type": "call_skipped", "campaign_id": campaign_id,
                "provider_id": pid, "provider_name": name, "reason": "No phone number"
            })
            return

        call_number = get_call_number(index, real_phone)

        await _broadcast(group_id, {
            "type": "call_started", "campaign_id": campaign_id,
            "provider_id": pid, "provider_name": name,
            "provider_rating": provider.get("rating", 0),
            "provider_distance": provider.get("distance_miles", 0),
            "photo_url": provider.get("photo_url"),
        })

        # 🧠 Cross-Call Intelligence: inject current best offer
        current_best = CampaignManager._get_best_offer(campaign)

        dynamic_vars = {
            "campaign_id": campaign_id,
            "provider_id": pid,
            "provider_name": name,
            "service_type": campaign["service_type"],
            "preferred_date": campaign.get("preferred_date", "this week"),
            "agent_name": "Alex",
            "current_best_offer": current_best,
        }

        result = await trigger_outbound_call(call_number, dynamic_vars)

        if result["success"]:
            conv_id = result["conversation_id"]
            conversation_map[conv_id] = {
                "group_id": group_id, "campaign_id": campaign_id, "provider_id": pid
            }
            await _broadcast(group_id, {
                "type": "call_connected", "campaign_id": campaign_id,
                "provider_id": pid, "conversation_id": conv_id,
            })
            await CampaignManager._wait_for_completion(group_id, campaign_id, pid, conv_id, campaign)
        else:
            logger.error(f"❌ Call to {name} failed: {result.get('error')}")
            campaign["results"].append({
                "provider_id": pid, "provider_name": name,
                "status": "failed", "error": result.get("error"),
            })
            await _broadcast(group_id, {
                "type": "call_failed", "campaign_id": campaign_id,
                "provider_id": pid, "provider_name": name, "error": result.get("error", ""),
            })

    @staticmethod
    async def _wait_for_completion(group_id, campaign_id, provider_id, conv_id, campaign):
        """Poll until call ends or tool webhooks resolve the result."""
        max_wait, interval = 180, 5
        elapsed = 0

        while elapsed < max_wait:
            await asyncio.sleep(interval)
            elapsed += interval

            existing = next((r for r in campaign["results"] if r["provider_id"] == provider_id), None)
            if existing and existing.get("status") in ["booked", "no_availability"]:
                break

            try:
                details = await get_conversation_details(conv_id)
                status = details.get("status", "")
                if status in ["done", "ended", "failed"]:
                    if not existing:
                        campaign["results"].append({
                            "provider_id": provider_id,
                            "provider_name": next((p["name"] for p in campaign["providers"] if p["provider_id"] == provider_id), ""),
                            "status": "completed", "conversation_id": conv_id,
                        })
                    await _broadcast(group_id, {
                        "type": "call_ended", "campaign_id": campaign_id,
                        "provider_id": provider_id, "conversation_id": conv_id,
                    })
                    break
            except Exception:
                pass

        if elapsed >= max_wait:
            campaign["results"].append({"provider_id": provider_id, "status": "timeout"})

    @staticmethod
    def _get_best_offer(campaign: dict) -> str:
        """Cross-call intelligence: get best offer so far for negotiation leverage."""
        booked = [r for r in campaign.get("results", []) if r.get("status") == "booked"]
        if booked:
            b = booked[0]
            slot = b.get("offered_slot", {})
            return f"{slot.get('date', '')} at {slot.get('time', '')} at {b.get('provider_name', '')}"
        return ""

    @staticmethod
    def get_group(group_id: str):
        return campaign_groups.get(group_id)

    @staticmethod
    def update_provider_result(campaign_id: str, provider_id: str, result_data: dict):
        """Called by tool webhooks to update a provider's result."""
        for group in campaign_groups.values():
            for camp in group["campaigns"]:
                if camp["campaign_id"] == campaign_id:
                    existing = next((r for r in camp["results"] if r["provider_id"] == provider_id), None)
                    if existing:
                        existing.update(result_data)
                    else:
                        result_data["provider_id"] = provider_id
                        camp["results"].append(result_data)
                    return group["group_id"]
        return None