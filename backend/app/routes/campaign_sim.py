import logging
import asyncio
import random
from app.routes.ws import broadcast

logger = logging.getLogger(__name__)

async def run_campaign_simulation(campaign_id: str, campaigns_db: dict, service_type: str, lat: float, lng: float):
    """Simulate the campaign execution (Swarm Orchestrator Mock)."""
    logger.info(f"🤖 Starting swarm simulation for {campaign_id}")
    
    # 1. Searching for providers
    await asyncio.sleep(2)
    
    # Mock search or real search? Let's use real search logic but mocked for speed/reliability if no API key
    # For now, let's just generate mock providers if search fails or to ensure results
    providers = [
        {"place_id": "mock1", "name": "Downtown Dental", "rating": 4.8, "distance_miles": 1.2, "status": "ringing"},
        {"place_id": "mock2", "name": "City Health Clinic", "rating": 4.5, "distance_miles": 2.5, "status": "ringing"},
        {"place_id": "mock3", "name": "Westside Specialists", "rating": 4.9, "distance_miles": 3.1, "status": "ringing"},
    ]
    
    # Update local DB
    if campaign_id in campaigns_db:
        campaigns_db[campaign_id]["status"] = "in_progress"
        # Initialize calls
        initial_calls = []
        for p in providers:
            initial_calls.append({
                "providerId": p["place_id"],
                "providerName": p["name"],
                "status": "ringing",
                "transcript": [],
                "latitude": lat + (random.random() - 0.5) * 0.05,
                "longitude": lng + (random.random() - 0.5) * 0.05
            })
        campaigns_db[campaign_id]["calls"] = initial_calls
        
        # Broadcast update
        await broadcast(campaign_id, {
            "type": "campaign_update",
            "campaign": campaigns_db[campaign_id]
        })
        
    # 2. Simulate Calls
    for _ in range(3):
        await asyncio.sleep(3)
        if campaign_id not in campaigns_db or campaigns_db[campaign_id]["status"] == "cancelled":
            break
            
        # Update random call
        call_idx = random.randint(0, len(providers) - 1)
        call = campaigns_db[campaign_id]["calls"][call_idx]
        
        statuses = ["connected", "negotiating", "booked", "no_availability", "completed"]
        current_status_idx = statuses.index(call.get("status", "ringing")) if call.get("status") in statuses else -1
        
        if current_status_idx < len(statuses) - 1:
            new_status = statuses[current_status_idx + 1]
            if new_status == "completed":
                # Determine final outcome
                outcome = random.choice(["booked", "no_availability"])
                new_status = outcome
                
            call["status"] = new_status
            
            # Add transcript line
            messages = [
                "Hello, I'd like to book an appointment.",
                "Sure, what time works for you?",
                "Do you have anything next Tuesday?",
                "Let me check... yes, 2pm is available."
            ]
            call["transcript"].append({
                "role": "assistant" if len(call["transcript"]) % 2 == 0 else "user",
                "text": random.choice(messages)
            })
            
            await broadcast(campaign_id, {
                "type": "campaign_update",
                "campaign": campaigns_db[campaign_id]
            })

    # 3. Finish
    await asyncio.sleep(2)
    if campaign_id in campaigns_db:
        campaigns_db[campaign_id]["status"] = "complete"
        
        # Generate ranked results
        campaigns_db[campaign_id]["ranked_results"] = [
            {
                "provider_id": c["providerId"],
                "name": c["providerName"],
                "score": 95 if c["status"] == "booked" else 50,
                "availability": ["Tue 2:00 PM"] if c["status"] == "booked" else [],
                "rating": 4.8,
                "distance": "1.2 miles"
            } for c in campaigns_db[campaign_id]["calls"] if c["status"] in ["booked", "negotiating"]
        ]
        
        if campaigns_db[campaign_id]["ranked_results"]:
            campaigns_db[campaign_id]["best_match"] = campaigns_db[campaign_id]["ranked_results"][0]
            
        await broadcast(campaign_id, {
            "type": "campaign_update",
            "campaign": campaigns_db[campaign_id]
        })
