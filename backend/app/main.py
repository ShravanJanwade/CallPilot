from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.config import settings
from app.routes import auth, booking, calendar, campaign, dashboard, providers, settings as settings_routes, ws, tools, telephony, webhooks

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle — initialize clients here."""
    logger.info("🚀 CallPilot starting up...")
    # TODO: Initialize ElevenLabs client, Twilio client, Google API clients
    yield
    logger.info("🛑 CallPilot shutting down...")


app = FastAPI(
    title="CallPilot",
    description="Agentic Voice AI for Autonomous Appointment Scheduling",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routes
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(booking.router, prefix="/api/booking", tags=["Booking"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(campaign.router, prefix="/api/campaign", tags=["Campaign"])
app.include_router(providers.router, prefix="/api/providers", tags=["Providers"])
app.include_router(settings_routes.router, prefix="/api/settings", tags=["Settings"])
app.include_router(tools.router, prefix="/api/tools", tags=["Agent Tools"])
app.include_router(telephony.router, prefix="/api/telephony", tags=["Telephony"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["Webhooks"])

# WebSocket for live transcript streaming
app.include_router(ws.router)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "CallPilot",
        "version": "0.1.0",
    }