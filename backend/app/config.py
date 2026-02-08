from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # -- App --
    app_name: str = "CallPilot"
    debug: bool = True

    # -- ElevenLabs --
    elevenlabs_api_key: str = ""
    elevenlabs_agent_id: str = ""
    elevenlabs_phone_number_id: str = ""  # Internal ElevenLabs ID for your Twilio number

    # -- Twilio --
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    # -- Google APIs --
    google_calendar_credentials_path: str = "credentials/google_creds.json"
    google_maps_api_key: str = ""
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    google_oauth_redirect_uri: str = "http://localhost:5173/auth/callback"

    # -- Auth --
    jwt_secret: str = ""

    # -- Concurrency --
    max_parallel_calls: int = 15
    call_timeout_seconds: int = 120

    # -- Scoring Weights --
    weight_availability: float = 0.4
    weight_rating: float = 0.3
    weight_distance: float = 0.2
    weight_preference: float = 0.1

    # -- Spam Prevention --
    spam_prevent: bool = True
    safe_test_numbers: str = ""  # Comma-separated

    # -- Webhooks --
    elevenlabs_webhook_secret: str = ""

    @property
    def safe_numbers_list(self) -> list[str]:
        return [n.strip() for n in self.safe_test_numbers.split(",") if n.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"



@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()