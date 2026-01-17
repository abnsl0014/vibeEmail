"""
Google Calendar Integration Service.
Handles OAuth flow and syncing calendar events to meetings.
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List
from pathlib import Path

# Google OAuth libraries (will be lazily imported)
_google_auth = None
_google_auth_oauthlib = None
_googleapiclient = None

# OAuth configuration
SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
CLIENT_SECRETS_FILE = 'google_client_secret.json'
TOKEN_FILE = 'google_token.json'

class CalendarService:
    """Service for Google Calendar integration."""

    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = data_dir or Path.home() / 'VoiceNotes'
        self.credentials_path = self.data_dir / TOKEN_FILE
        self._credentials = None
        self._service = None
        self._client_config = None

    @property
    def is_connected(self) -> bool:
        """Check if Google Calendar is connected."""
        return self._credentials is not None and self._credentials.valid

    @property
    def has_client_config(self) -> bool:
        """Check if OAuth client configuration exists."""
        client_secret_path = self.data_dir / CLIENT_SECRETS_FILE
        return client_secret_path.exists()

    def _load_google_libs(self):
        """Lazily load Google libraries."""
        global _google_auth, _google_auth_oauthlib, _googleapiclient

        if _google_auth is None:
            from google.oauth2.credentials import Credentials
            from google.auth.transport.requests import Request
            _google_auth = {'Credentials': Credentials, 'Request': Request}

        if _google_auth_oauthlib is None:
            from google_auth_oauthlib.flow import InstalledAppFlow
            _google_auth_oauthlib = {'InstalledAppFlow': InstalledAppFlow}

        if _googleapiclient is None:
            from googleapiclient.discovery import build
            _googleapiclient = {'build': build}

    def set_client_config(self, client_config: dict) -> bool:
        """
        Set the OAuth client configuration.
        Users must provide their own Google Cloud OAuth credentials.
        """
        try:
            # Validate required fields
            if 'installed' not in client_config and 'web' not in client_config:
                return False

            config = client_config.get('installed') or client_config.get('web')
            required_fields = ['client_id', 'client_secret']
            if not all(field in config for field in required_fields):
                return False

            # Save the client config
            self.data_dir.mkdir(parents=True, exist_ok=True)
            client_secret_path = self.data_dir / CLIENT_SECRETS_FILE
            with open(client_secret_path, 'w') as f:
                json.dump(client_config, f)

            self._client_config = client_config
            return True

        except Exception as e:
            print(f"Error saving client config: {e}")
            return False

    async def load_credentials(self) -> bool:
        """Load saved credentials if they exist."""
        try:
            if not self.credentials_path.exists():
                return False

            self._load_google_libs()

            with open(self.credentials_path, 'r') as f:
                token_data = json.load(f)

            self._credentials = _google_auth['Credentials'].from_authorized_user_info(
                token_data, SCOPES
            )

            # Refresh if expired
            if self._credentials.expired and self._credentials.refresh_token:
                self._credentials.refresh(_google_auth['Request']())
                await self._save_credentials()

            return self._credentials.valid

        except Exception as e:
            print(f"Error loading credentials: {e}")
            self._credentials = None
            return False

    async def _save_credentials(self):
        """Save credentials to file."""
        if self._credentials:
            self.data_dir.mkdir(parents=True, exist_ok=True)
            with open(self.credentials_path, 'w') as f:
                f.write(self._credentials.to_json())

    def get_auth_url(self, redirect_uri: str = 'http://localhost:8765/auth/google/callback') -> Optional[str]:
        """
        Get the OAuth authorization URL.
        Returns None if client config is not set.
        """
        try:
            self._load_google_libs()

            client_secret_path = self.data_dir / CLIENT_SECRETS_FILE
            if not client_secret_path.exists():
                return None

            flow = _google_auth_oauthlib['InstalledAppFlow'].from_client_secrets_file(
                str(client_secret_path),
                SCOPES,
                redirect_uri=redirect_uri
            )

            auth_url, _ = flow.authorization_url(
                access_type='offline',
                include_granted_scopes='true',
                prompt='consent'
            )

            return auth_url

        except Exception as e:
            print(f"Error generating auth URL: {e}")
            return None

    async def handle_callback(self, code: str, redirect_uri: str = 'http://localhost:8765/auth/google/callback') -> bool:
        """Handle the OAuth callback with authorization code."""
        try:
            self._load_google_libs()

            client_secret_path = self.data_dir / CLIENT_SECRETS_FILE
            if not client_secret_path.exists():
                return False

            flow = _google_auth_oauthlib['InstalledAppFlow'].from_client_secrets_file(
                str(client_secret_path),
                SCOPES,
                redirect_uri=redirect_uri
            )

            flow.fetch_token(code=code)
            self._credentials = flow.credentials

            await self._save_credentials()
            return True

        except Exception as e:
            print(f"Error handling OAuth callback: {e}")
            return False

    async def disconnect(self) -> bool:
        """Disconnect Google Calendar (revoke and delete credentials)."""
        try:
            # Delete the token file
            if self.credentials_path.exists():
                self.credentials_path.unlink()

            self._credentials = None
            self._service = None
            return True

        except Exception as e:
            print(f"Error disconnecting: {e}")
            return False

    def _get_service(self):
        """Get or create the Calendar API service."""
        if not self._credentials:
            raise ValueError("Not authenticated with Google Calendar")

        if self._service is None:
            self._load_google_libs()
            self._service = _googleapiclient['build'](
                'calendar', 'v3', credentials=self._credentials
            )

        return self._service

    async def list_calendars(self) -> List[dict]:
        """List available calendars."""
        try:
            service = self._get_service()

            # Run in thread pool since googleapiclient is not async
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: service.calendarList().list().execute()
            )

            calendars = []
            for calendar in result.get('items', []):
                calendars.append({
                    'id': calendar['id'],
                    'name': calendar.get('summary', 'Untitled'),
                    'primary': calendar.get('primary', False),
                    'color': calendar.get('backgroundColor', '#4285f4'),
                    'access_role': calendar.get('accessRole', 'reader'),
                })

            return calendars

        except Exception as e:
            print(f"Error listing calendars: {e}")
            return []

    async def get_upcoming_events(
        self,
        calendar_id: str = 'primary',
        days_ahead: int = 7,
        max_results: int = 50
    ) -> List[dict]:
        """Get upcoming events from a calendar."""
        try:
            service = self._get_service()

            now = datetime.utcnow()
            time_min = now.isoformat() + 'Z'
            time_max = (now + timedelta(days=days_ahead)).isoformat() + 'Z'

            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: service.events().list(
                    calendarId=calendar_id,
                    timeMin=time_min,
                    timeMax=time_max,
                    maxResults=max_results,
                    singleEvents=True,
                    orderBy='startTime'
                ).execute()
            )

            events = []
            for event in result.get('items', []):
                # Skip all-day events (no specific time)
                start = event['start'].get('dateTime')
                if not start:
                    continue

                events.append({
                    'id': event['id'],
                    'calendar_id': calendar_id,
                    'title': event.get('summary', 'Untitled'),
                    'description': event.get('description'),
                    'location': event.get('location'),
                    'start': start,
                    'end': event['end'].get('dateTime'),
                    'html_link': event.get('htmlLink'),
                    'organizer': event.get('organizer', {}).get('email'),
                    'attendees': [
                        {
                            'email': a.get('email'),
                            'name': a.get('displayName'),
                            'response_status': a.get('responseStatus'),
                        }
                        for a in event.get('attendees', [])
                    ],
                    'conference_link': self._extract_conference_link(event),
                })

            return events

        except Exception as e:
            print(f"Error getting events: {e}")
            return []

    def _extract_conference_link(self, event: dict) -> Optional[str]:
        """Extract video conference link from event."""
        # Check conferenceData (Google Meet, etc.)
        conf_data = event.get('conferenceData')
        if conf_data:
            entry_points = conf_data.get('entryPoints', [])
            for entry in entry_points:
                if entry.get('entryPointType') == 'video':
                    return entry.get('uri')

        # Check for links in description
        description = event.get('description', '')
        if description:
            # Simple detection of common video links
            import re
            patterns = [
                r'(https?://[^\s]*zoom\.us[^\s]*)',
                r'(https?://meet\.google\.com[^\s]*)',
                r'(https?://teams\.microsoft\.com[^\s]*)',
            ]
            for pattern in patterns:
                match = re.search(pattern, description)
                if match:
                    return match.group(1)

        return None

    async def sync_events_to_meetings(
        self,
        calendar_id: str = 'primary',
        days_ahead: int = 7
    ) -> List[dict]:
        """
        Sync calendar events to meetings.
        Returns list of created/updated meeting data.
        """
        from services.meetings_service import meetings_service

        events = await self.get_upcoming_events(calendar_id, days_ahead)
        synced_meetings = []

        for event in events:
            # Check if meeting already exists for this event
            meeting = await meetings_service.find_by_calendar_event(
                event['id'], calendar_id
            )

            calendar_link = {
                'provider': 'google',
                'event_id': event['id'],
                'calendar_id': calendar_id,
                'html_link': event.get('html_link'),
                'last_synced': datetime.utcnow().isoformat(),
            }

            if meeting:
                # Update existing meeting
                updated = await meetings_service.update_meeting(
                    meeting['id'],
                    {
                        'title': event['title'],
                        'scheduled_at': event['start'],
                        'description': event.get('description'),
                        'location': event.get('location') or event.get('conference_link'),
                        'calendar_link': calendar_link,
                        'participants': event.get('attendees'),
                    }
                )
                synced_meetings.append(updated)
            else:
                # Create new meeting
                created = await meetings_service.create_meeting(
                    title=event['title'],
                    scheduled_at=event['start'],
                    description=event.get('description'),
                    location=event.get('location') or event.get('conference_link'),
                    participants=event.get('attendees'),
                    source='google_calendar',
                    calendar_link=calendar_link,
                )
                synced_meetings.append(created)

        return synced_meetings


# Singleton instance
_calendar_service: Optional[CalendarService] = None

def get_calendar_service() -> CalendarService:
    """Get the singleton CalendarService instance."""
    global _calendar_service
    if _calendar_service is None:
        _calendar_service = CalendarService()
    return _calendar_service
