from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """All environment variables in one place."""

    # -- App --
    app_name: str = "CallPilot"
    debug: bool = True

    # -- ElevenLabs --
    elevenlabs_api_key: str = ""
    elevenlabs_agent_id: str = ""  # Conversational AI agent ID
    elevenlabs_phone_number_id: str = ""  # Twilio phone number imported to ElevenLabs

    # -- Twilio --
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""  # Your Twilio outbound number

    # -- Google APIs --
    google_calendar_credentials_path: str = "credentials/google_creds.json"
    google_maps_api_key: str = ""
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    google_oauth_redirect_uri: str = "http://localhost:5173/auth/callback"

    # -- JWT --
    jwt_secret: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    # -- Concurrency --
    max_parallel_calls: int = 15  # Swarm mode cap
    call_timeout_seconds: int = 120  # Max duration per call

    # -- Scoring Weights (user-adjustable defaults) --
    weight_availability: float = 0.4
    weight_rating: float = 0.3
    weight_distance: float = 0.2
    weight_preference: float = 0.1

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"



@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()