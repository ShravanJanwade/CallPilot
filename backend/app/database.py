
from supabase import create_client, Client
from typing import Optional
import logging

from app.config import settings

logger = logging.getLogger(__name__)

_supabase: Optional[Client] = None


def get_supabase() -> Client:
    global _supabase
    
    if _supabase is None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise ValueError(
                "Supabase configuration missing. "
                "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env"
            )
        
        _supabase = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )
        logger.info("✅ Supabase client initialized")
    
    return _supabase



async def get_user_by_email(email: str) -> Optional[dict]:
    supabase = get_supabase()
    result = supabase.table("users").select("*").eq("email", email).execute()
    return result.data[0] if result.data else None


async def get_user_by_id(user_id: str) -> Optional[dict]:
    supabase = get_supabase()
    result = supabase.table("users").select("*").eq("id", user_id).execute()
    return result.data[0] if result.data else None


async def create_user(user_data: dict) -> dict:
    supabase = get_supabase()
    result = supabase.table("users").insert(user_data).execute()
    return result.data[0]


async def update_user(user_id: str, user_data: dict) -> dict:
    supabase = get_supabase()
    result = supabase.table("users").update(user_data).eq("id", user_id).execute()
    return result.data[0] if result.data else None


async def create_campaign(campaign_data: dict) -> dict:
    supabase = get_supabase()
    result = supabase.table("campaigns").insert(campaign_data).execute()
    return result.data[0]


async def get_campaign(campaign_id: str) -> Optional[dict]:
    supabase = get_supabase()
    result = supabase.table("campaigns").select("*").eq("id", campaign_id).execute()
    return result.data[0] if result.data else None


async def get_campaigns_by_user(user_id: str, limit: int = 10) -> list:
    supabase = get_supabase()
    result = (
        supabase.table("campaigns")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


async def update_campaign(campaign_id: str, campaign_data: dict) -> dict:
    supabase = get_supabase()
    result = supabase.table("campaigns").update(campaign_data).eq("id", campaign_id).execute()
    return result.data[0] if result.data else None


async def upsert_provider(provider_data: dict) -> dict:
    supabase = get_supabase()
    result = supabase.table("providers").upsert(
        provider_data, 
        on_conflict="place_id"
    ).execute()
    return result.data[0]


async def get_provider_by_place_id(place_id: str) -> Optional[dict]:
    supabase = get_supabase()
    result = supabase.table("providers").select("*").eq("place_id", place_id).execute()
    return result.data[0] if result.data else None


async def get_provider(provider_id: str) -> Optional[dict]:
    supabase = get_supabase()
    result = supabase.table("providers").select("*").eq("id", provider_id).execute()
    return result.data[0] if result.data else None

async def create_call(call_data: dict) -> dict:
    supabase = get_supabase()
    result = supabase.table("calls").insert(call_data).execute()
    return result.data[0]


async def get_calls_by_campaign(campaign_id: str) -> list:
    supabase = get_supabase()
    result = (
        supabase.table("calls")
        .select("*, providers(*)")
        .eq("campaign_id", campaign_id)
        .execute()
    )
    return result.data


async def update_call(call_id: str, call_data: dict) -> dict:
    supabase = get_supabase()
    result = supabase.table("calls").update(call_data).eq("id", call_id).execute()
    return result.data[0] if result.data else None


async def create_booking(booking_data: dict) -> dict:
    supabase = get_supabase()
    result = supabase.table("bookings").insert(booking_data).execute()
    return result.data[0]


async def get_booking(booking_id: str) -> Optional[dict]:
    supabase = get_supabase()
    result = (
        supabase.table("bookings")
        .select("*, providers(*)")
        .eq("id", booking_id)
        .execute()
    )
    return result.data[0] if result.data else None


async def get_bookings_by_user(user_id: str, limit: int = 20) -> list:
    supabase = get_supabase()
    result = (
        supabase.table("bookings")
        .select("*, providers(*)")
        .eq("user_id", user_id)
        .order("appointment_date", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


async def update_booking(booking_id: str, booking_data: dict) -> dict:
    supabase = get_supabase()
    result = supabase.table("bookings").update(booking_data).eq("id", booking_id).execute()
    return result.data[0] if result.data else None


async def get_user_stats(user_id: str) -> dict:
    supabase = get_supabase()
    
    campaigns = supabase.table("campaigns").select("id", count="exact").eq("user_id", user_id).execute()
    bookings = supabase.table("bookings").select("id", count="exact").eq("user_id", user_id).execute()
    confirmed = supabase.table("bookings").select("id", count="exact").eq("user_id", user_id).eq("status", "confirmed").execute()
    
    return {
        "total_campaigns": campaigns.count or 0,
        "total_bookings": bookings.count or 0,
        "confirmed_bookings": confirmed.count or 0
    }
