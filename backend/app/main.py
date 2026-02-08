from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.routes import booking, providers, ws, tools, campaign, calendar_routes, webhooks

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 CallPilot starting up...")
    logger.info(f"   Agent ID: {settings.elevenlabs_agent_id}")
    logger.info(f"   Phone ID: {settings.elevenlabs_phone_number_id}")
    logger.info(f"   Spam Prevent: {settings.spam_prevent}")
    if settings.spam_prevent:
        logger.info(f"   Safe Numbers: {settings.safe_numbers_list}")
    yield
    logger.info("🛑 CallPilot shutting down...")


app = FastAPI(title="CallPilot", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(booking.router, prefix="/api/booking", tags=["Booking"])
app.include_router(providers.router, prefix="/api/providers", tags=["Providers"])
app.include_router(tools.router, prefix="/api/tools", tags=["Agent Tools"])
app.include_router(campaign.router, prefix="/api/campaign", tags=["Campaign"])
app.include_router(calendar_routes.router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["Webhooks"])
app.include_router(ws.router)


@app.get("/health")
async def health():
    return {
        "status": "healthy", "service": "CallPilot", "version": "0.3.0",
        "phone_id_set": bool(settings.elevenlabs_phone_number_id),
        "spam_prevent": settings.spam_prevent,
    }