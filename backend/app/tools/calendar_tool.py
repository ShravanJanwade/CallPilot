"""
Google Calendar integration for CallPilot.
Handles: checking availability and creating events.

Setup:
1. Enable Google Calendar API in Google Cloud Console
2. Create OAuth 2.0 credentials (Desktop app type works for dev)
3. Download JSON → save as backend/credentials/google_creds.json
4. First run will open browser for OAuth consent → creates token.json
"""
import os
import logging
from datetime import datetime, timedelta
from typing import Optional

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request as GoogleAuthRequest
from googleapiclient.discovery import build

from app.config import settings

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar"]
TOKEN_PATH = "credentials/token.json"


class CalendarService:
    def __init__(self):
        self.service = None
        self._authenticate()

    def _authenticate(self):
        """Authenticate with Google Calendar API using OAuth 2.0."""
        creds = None

        # Load existing token
        if os.path.exists(TOKEN_PATH):
            creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

        # Refresh or get new token
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                logger.info("🔄 Refreshing Google Calendar token...")
                creds.refresh(GoogleAuthRequest())
            else:
                logger.info("🔐 Starting Google Calendar OAuth flow...")
                creds_path = settings.google_calendar_credentials_path
                if not os.path.exists(creds_path):
                    raise FileNotFoundError(
                        f"Google credentials not found at {creds_path}. "
                        "Download OAuth 2.0 credentials from Google Cloud Console."
                    )
                flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
                creds = flow.run_local_server(port=0)

            # Save token for next time
            os.makedirs(os.path.dirname(TOKEN_PATH), exist_ok=True)
            with open(TOKEN_PATH, "w") as token_file:
                token_file.write(creds.to_json())
            logger.info("✅ Google Calendar token saved.")

        self.service = build("calendar", "v3", credentials=creds)
        logger.info("✅ Google Calendar service initialized.")

    def check_availability(self, date_str: str, time_str: str,
                           duration_minutes: int = 60) -> bool:
        """
        Check if the user is free at the given date/time.
        Returns True if available, False if there's a conflict.
        """
        try:
            start_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
            end_dt = start_dt + timedelta(minutes=duration_minutes)

            # Query Google Calendar for events in this time range
            events_result = self.service.events().list(
                calendarId="primary",
                timeMin=start_dt.isoformat() + "Z",
                timeMax=end_dt.isoformat() + "Z",
                singleEvents=True,
                orderBy="startTime"
            ).execute()

            events = events_result.get("items", [])

            if events:
                event_names = [e.get("summary", "Busy") for e in events]
                logger.info(f"📅 Conflict found: {event_names}")
                return False
            else:
                logger.info(f"📅 No conflicts — user is free at {date_str} {time_str}")
                return True

        except ValueError as e:
            logger.error(f"❌ Date/time parse error: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ Calendar API error: {e}")
            raise

    def create_event(self, summary: str, date_str: str, time_str: str,
                     duration_minutes: int = 60,
                     description: str = "") -> Optional[str]:
        """
        Create a Google Calendar event. Returns the event ID.
        """
        try:
            start_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
            end_dt = start_dt + timedelta(minutes=duration_minutes)

            event = {
                "summary": summary,
                "description": description,
                "start": {
                    "dateTime": start_dt.isoformat(),
                    "timeZone": "America/New_York",  # Adjust to your timezone
                },
                "end": {
                    "dateTime": end_dt.isoformat(),
                    "timeZone": "America/New_York",
                },
                "reminders": {
                    "useDefault": False,
                    "overrides": [
                        {"method": "popup", "minutes": 30},
                    ],
                },
            }

            created_event = self.service.events().insert(
                calendarId="primary", body=event
            ).execute()

            event_id = created_event.get("id")
            event_link = created_event.get("htmlLink")
            logger.info(f"📆 Event created: {event_link}")
            return event_id

        except ValueError as e:
            logger.error(f"❌ Date/time parse error: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ Calendar create error: {e}")
            raise