from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.routes import booking, providers, ws, tools

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
app.include_router(booking.router, prefix="/api/booking", tags=["Booking"])
app.include_router(providers.router, prefix="/api/providers", tags=["Providers"])
app.include_router(tools.router, prefix="/api/tools", tags=["Agent Tools"])

# WebSocket for live transcript streaming
app.include_router(ws.router)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "CallPilot",
        "version": "0.1.0",
    }