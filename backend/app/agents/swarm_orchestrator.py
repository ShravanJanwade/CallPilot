"""
Swarm Orchestrator — the brain of CallPilot.
Searches providers → launches parallel calls → tracks results → ranks → pushes live updates.
Includes cross-call intelligence: later calls know about earlier offers.
"""
import asyncio
import uuid
import json
import logging
import httpx
from datetime import datetime
from typing import Optional

from app.config import settings
from app.tools.places_tool import PlacesService
from app.tools.distance_tool import DistanceService
from app.telephony.call_manager import trigger_outbound_call, get_call_number, get_conversation_details
from app.scoring.ranker import rank_results
from app import database as db

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

        # --- DB PERSISTENCE: Save campaigns to database ---
        for campaign in group["campaigns"]:
            try:
                if user_id and user_id != "default" and len(user_id) >= 32:
                    db_campaign = await db.create_campaign({
                        "user_id": user_id,
                        "service_type": campaign["service_type"],
                        "location_address": campaign["location"],
                        "latitude": campaign.get("origin_lat", 0),
                        "longitude": campaign.get("origin_lng", 0),
                        "max_distance": campaign["max_distance"],
                        "max_providers": campaign["max_providers"],
                        "weights": json.dumps(campaign.get("preferences", {})),
                        "agent_config": json.dumps({
                            "name": "Alex",
                            "first_message": "",
                            "system_prompt": None
                        }),
                        "status": "running",
                        "date_range_start": datetime.utcnow().date().isoformat(),
                        "date_range_end": datetime.utcnow().date().isoformat(),
                    })
                    campaign["db_id"] = db_campaign.get("id")
                    logger.info(f"💾 Campaign {campaign['campaign_id']} saved to DB: {campaign['db_id']}")
                else:
                    logger.info(f"📝 Campaign {campaign['campaign_id']} running in memory (no auth)")
            except Exception as e:
                logger.warning(f"⚠️ DB save skipped for campaign: {e}")

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

            # --- DB PERSISTENCE: Cache providers in database ---
            for prov in providers:
                try:
                    db_prov = await db.upsert_provider({
                        "place_id": prov["provider_id"],
                        "name": prov["name"],
                        "phone": prov.get("phone") or prov.get("international_phone") or "",
                        "address": prov.get("address", ""),
                        "category": svc,
                        "latitude": prov.get("lat", 0),
                        "longitude": prov.get("lng", 0),
                        "rating": prov.get("rating"),
                        "total_ratings": prov.get("total_ratings", 0),
                    })
                    prov["db_id"] = db_prov["id"]
                    logger.info(f"💾 Provider saved: {prov['name']} → {db_prov['id']}")
                except Exception as e:
                    logger.warning(f"⚠️ DB upsert failed for provider {prov['name']}: {e}")

            await asyncio.sleep(0.2)

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

            # --- STEP 4: Launch parallel calls (Two Waves) ---
            # Wave 1: Preferred providers (immediate)
            # Wave 2: All others (after 3 seconds, with best offer from wave 1)
            preferred_tasks = []
            other_tasks = []

            for i, prov in enumerate(ordered):
                if prov["name"].lower() in pref_names:
                    preferred_tasks.append((i, prov))
                else:
                    other_tasks.append((i, prov))

            # Launch wave 1
            wave1 = [asyncio.create_task(CampaignManager._make_call(group_id, cid, prov, i, campaign)) for i, prov in preferred_tasks]
            for t in wave1:
                await asyncio.sleep(0.3)

            # Wait a bit for wave 1 to get initial offers
            if wave1 and other_tasks:
                await asyncio.sleep(3)

            # Launch wave 2 — these get cross-call intelligence from wave 1
            wave2 = [asyncio.create_task(CampaignManager._make_call(group_id, cid, prov, i, campaign)) for i, prov in other_tasks]
            for t in wave2:
                await asyncio.sleep(0.3)

            await asyncio.gather(*(wave1 + wave2), return_exceptions=True)

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

            # 💾 Update campaign status in DB
            try:
                db_campaign_id = campaign.get("db_id")
                if db_campaign_id:
                    await db.update_campaign(db_campaign_id, {
                        "status": "completed",
                        "completed_at": datetime.utcnow().isoformat(),
                        "latitude": campaign.get("origin_lat", 0),
                        "longitude": campaign.get("origin_lng", 0),
                    })
                    logger.info(f"💾 Campaign {db_campaign_id} marked completed in DB")
            except Exception as e:
                logger.warning(f"⚠️ DB campaign update failed: {e}")

            await _broadcast(group_id, {
                "type": "campaign_complete", "campaign_id": cid,
                "results": campaign["results"], "best_match": campaign["best_match"],
            })
            logger.info(f"✅ Campaign {cid} done. {len(booked)} bookings.")

        except Exception as e:
            logger.error(f"❌ Campaign {cid} error: {e}", exc_info=True)
            campaign["status"] = "error"

            # 💾 Update campaign status in DB
            try:
                db_campaign_id = campaign.get("db_id")
                if db_campaign_id:
                    await db.update_campaign(db_campaign_id, {
                        "status": "failed",
                        "completed_at": datetime.utcnow().isoformat(),
                    })
            except Exception as db_e:
                logger.warning(f"⚠️ DB campaign error update failed: {db_e}")

            await _broadcast(group_id, {
                "type": "campaign_error", "campaign_id": cid, "error": str(e)
            })

    @staticmethod
    async def handle_user_command(group_id: str, provider_id: str, action: str, message: str = "") -> dict:
        """Handle user command to disconnect or instruct an active call."""
        
        # Find conversation
        conv_id = None
        for cid, mapping in conversation_map.items():
            if mapping["group_id"] == group_id and mapping["provider_id"] == provider_id:
                conv_id = cid
                break
        
        if not conv_id:
            return {"error": "No active call for this provider"}

        if action == "disconnect":
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.delete(
                        f"https://api.elevenlabs.io/v1/convai/conversations/{conv_id}",
                        headers={"xi-api-key": settings.elevenlabs_api_key}
                    )
                    logger.info(f"📞 Disconnect call {conv_id}: {resp.status_code}")
            except Exception as e:
                logger.error(f"Disconnect error: {e}")
            
            # Update status in memory immediately
            group = CampaignManager.get_group(group_id)
            if group:
                for camp in group["campaigns"]:
                    for r in camp["results"]:
                        if r.get("provider_id") == provider_id:
                            r["status"] = "disconnected"

            await _broadcast(group_id, {
                "type": "call_disconnected",
                "provider_id": provider_id,
                "reason": "User disconnected",
            })
            return {"success": True, "action": "disconnected"}
        
        elif action == "instruct":
            await _broadcast(group_id, {
                "type": "user_instruction",
                "provider_id": provider_id,
                "message": message,
            })
            return {"success": True, "action": "instruction_sent"}
            
        return {"error": "Unknown action"}

    @staticmethod
    async def _poll_transcript(group_id: str, campaign_id: str, provider_id: str, conversation_id: str):
        """Poll ElevenLabs every 2s for transcript updates during the call."""
        last_count = 0
        while True:
            await asyncio.sleep(2)
            try:
                details = await get_conversation_details(conversation_id)
                transcript = details.get("transcript", [])
                
                if isinstance(transcript, list) and len(transcript) > last_count:
                    # New transcript entries — send only the new ones
                    new_entries = transcript[last_count:]
                    formatted = []
                    for entry in new_entries:
                        formatted.append({
                            "role": entry.get("role", "unknown"),
                            "message": entry.get("message", ""),
                            "time": entry.get("time_in_call_secs", 0),
                        })
                    
                    await _broadcast(group_id, {
                        "type": "transcript_update",
                        "campaign_id": campaign_id,
                        "provider_id": provider_id,
                        "new_entries": formatted,
                        "total_entries": len(transcript),
                    })
                    last_count = len(transcript)
                
                # Check if call ended
                status = details.get("status", "")
                if status in ["done", "ended", "failed"]:
                    # Send final full transcript
                    all_formatted = [{
                        "role": e.get("role", "unknown"),
                        "message": e.get("message", ""),
                        "time": e.get("time_in_call_secs", 0),
                    } for e in transcript] if isinstance(transcript, list) else []
                    
                    await _broadcast(group_id, {
                        "type": "transcript_final",
                        "campaign_id": campaign_id,
                        "provider_id": provider_id,
                        "transcript": all_formatted,
                    })
                    break
            except Exception as e:
                # logger.warning(f"Transcript poll error: {e}")
                continue

    @staticmethod
    async def _compute_live_score(campaign, provider, offered_slot=None):
        """Compute score in real-time as call progresses."""
        from app.scoring.ranker import compute_score
        
        if offered_slot:
            result = {"offered_slot": offered_slot, "status": "booked"}
        else:
            # Estimate based on what we know
            result = {"offered_slot": None, "status": "negotiating"}
        
        pref_names = [p.get("name", "") for p in campaign.get("preferred_providers", [])]
        score = compute_score(result, provider, campaign["preferences"], pref_names, campaign["max_distance"])
        return score

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

            # Start transcript polling in background
            asyncio.create_task(CampaignManager._poll_transcript(group_id, campaign_id, pid, conv_id))

            # 💾 Persist call to Supabase
            try:
                db_campaign_id = campaign.get("db_id")
                db_provider_id = provider.get("db_id")
                if db_campaign_id and db_provider_id:
                    db_call = await db.create_call({
                        "campaign_id": db_campaign_id,
                        "provider_id": db_provider_id,
                        "status": "connected",
                        "started_at": datetime.utcnow().isoformat(),
                        "transcript": json.dumps([]),
                    })
                    conversation_map[conv_id]["db_call_id"] = db_call["id"]
                    logger.info(f"💾 Call saved to DB: {db_call['id']}")
            except Exception as e:
                logger.warning(f"⚠️ DB call insert failed: {e}")

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

            # 💾 Persist failed call to DB
            try:
                db_campaign_id = campaign.get("db_id")
                db_provider_id = provider.get("db_id")
                if db_campaign_id and db_provider_id:
                    await db.create_call({
                        "campaign_id": db_campaign_id,
                        "provider_id": db_provider_id,
                        "status": "failed",
                        "started_at": datetime.utcnow().isoformat(),
                        "ended_at": datetime.utcnow().isoformat(),
                        "transcript": json.dumps([]),
                    })
            except Exception as e:
                logger.warning(f"⚠️ DB failed-call insert failed: {e}")

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
                    # Fetch transcript
                    transcript = details.get("transcript", [])
                    formatted_transcript = []
                    if isinstance(transcript, list):
                        for t in transcript:
                            formatted_transcript.append({
                                "role": t.get("role", "unknown"),
                                "message": t.get("message", ""),
                                "time": t.get("time_in_call_secs", 0),
                            })

                    if formatted_transcript:
                        await CampaignManager.update_provider_result(campaign_id, provider_id, {
                            "transcript": formatted_transcript,
                        })

                    await _broadcast(group_id, {
                        "type": "call_ended", "campaign_id": campaign_id,
                        "provider_id": provider_id, "conversation_id": conv_id,
                        "transcript": formatted_transcript,
                    })
                    break
            except Exception:
                pass

        if elapsed >= max_wait:
            campaign["results"].append({"provider_id": provider_id, "status": "timeout"})

    @staticmethod
    def _get_best_offer(campaign: dict) -> str:
        """Build a negotiation context string from all current results."""
        booked = [r for r in campaign.get("results", []) if r.get("status") == "booked"]
        
        # Also include slots that were offered but not yet confirmed (from check_calendar calls)
        negotiating = [r for r in campaign.get("results", []) if r.get("offered_slot")]
        
        all_offers = booked + negotiating
        if not all_offers:
            return ""
        
        # Sort by score
        all_offers.sort(key=lambda r: r.get("score", 0), reverse=True)
        best = all_offers[0]
        slot = best.get("offered_slot", {})
        
        parts = []
        parts.append(f"{slot.get('date', '')} at {slot.get('time', '')} at {best.get('provider_name', '')}")
        
        if best.get("score", 0) > 0.7:
            parts.append("This is a strong offer, so only accept something clearly better")
        elif best.get("score", 0) > 0.5:
            parts.append("This is a decent offer but there might be better options")
        
        if len(all_offers) > 1:
            parts.append(f"You have {len(all_offers)} offers total")
        
        return ". ".join(parts)

    @staticmethod
    def get_group(group_id: str):
        return campaign_groups.get(group_id)

    @staticmethod
    async def update_provider_result(campaign_id: str, provider_id: str, result_data: dict) -> Optional[str]:
        """Update the in-memory campaign state with analysis results, then persist to DB."""
        for gid, group in campaign_groups.items():
            for camp in group["campaigns"]:
                if camp["campaign_id"] == campaign_id:
                    existing = next((r for r in camp["results"] if r.get("provider_id") == provider_id), None)
                    if existing:
                        existing.update(result_data)
                    else:
                        res = {"provider_id": provider_id, **result_data}
                        camp["results"].append(res)

                    # 💾 Update call in DB with results
                    try:
                        conv_entry = None
                        for conv_id, ctx in conversation_map.items():
                            if ctx.get("campaign_id") == campaign_id and ctx.get("provider_id") == provider_id:
                                conv_entry = ctx
                                break

                        db_call_id = conv_entry.get("db_call_id") if conv_entry else None
                        if db_call_id:
                            update_data = {
                                "status": result_data.get("status", "completed"),
                                "ended_at": datetime.utcnow().isoformat(),
                            }
                            slot = result_data.get("offered_slot", {})
                            if slot:
                                update_data["offered_slot"] = json.dumps(slot) if isinstance(slot, dict) else str(slot)
                            if result_data.get("score") is not None:
                                update_data["score"] = result_data["score"]
                            if result_data.get("transcript"):
                                update_data["transcript"] = json.dumps(result_data["transcript"])

                            await db.update_call(db_call_id, update_data)
                            logger.info(f"💾 Call {db_call_id} updated in DB: {result_data.get('status')}")
                    except Exception as e:
                        logger.warning(f"⚠️ DB call update failed: {e}")

                    return gid
        return None