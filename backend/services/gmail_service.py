import json
import base64
import asyncio
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
]
CONFIG_DIR = Path.home() / "VoiceOverlay"
TOKEN_PATH = CONFIG_DIR / "gmail_token.json"
CLIENT_PATH = CONFIG_DIR / "gmail_client.json"


class GmailService:
    def __init__(self):
        self._credentials = None
        self._service = None
        self._flow = None
        self._connected_email = None
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        self._load_stored_credentials()

    @property
    def is_connected(self) -> bool:
        return self._credentials is not None and self._service is not None

    @property
    def has_client_config(self) -> bool:
        return CLIENT_PATH.exists()

    @property
    def connected_email(self) -> Optional[str]:
        return self._connected_email

    def _load_stored_credentials(self):
        try:
            if not TOKEN_PATH.exists():
                return
            from google.oauth2.credentials import Credentials

            self._credentials = Credentials.from_authorized_user_file(
                str(TOKEN_PATH), SCOPES
            )
            if (
                self._credentials
                and self._credentials.expired
                and self._credentials.refresh_token
            ):
                from google.auth.transport.requests import Request

                self._credentials.refresh(Request())
                TOKEN_PATH.write_text(self._credentials.to_json())
            if self._credentials and self._credentials.valid:
                self._build_service()
        except Exception as e:
            print(f"Could not load Gmail credentials: {e}")
            self._credentials = None

    def _build_service(self):
        try:
            from googleapiclient.discovery import build

            self._service = build("gmail", "v1", credentials=self._credentials)
            try:
                profile = self._service.users().getProfile(userId="me").execute()
                self._connected_email = profile.get("emailAddress")
            except Exception:
                pass
        except Exception as e:
            print(f"Could not build Gmail service: {e}")

    def set_client_config(self, config: dict) -> bool:
        try:
            CLIENT_PATH.write_text(json.dumps(config))
            return True
        except Exception:
            return False

    def get_auth_url(self) -> Optional[str]:
        if not CLIENT_PATH.exists():
            return None
        try:
            from google_auth_oauthlib.flow import InstalledAppFlow

            self._flow = InstalledAppFlow.from_client_secrets_file(
                str(CLIENT_PATH),
                scopes=SCOPES,
                redirect_uri="http://localhost:8765/auth/gmail/callback",
            )
            auth_url, _ = self._flow.authorization_url(
                access_type="offline",
                include_granted_scopes="true",
                prompt="consent",
            )
            return auth_url
        except Exception as e:
            print(f"Could not generate auth URL: {e}")
            return None

    async def handle_callback(self, code: str) -> bool:
        try:
            if self._flow is None:
                return False
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None, lambda: self._flow.fetch_token(code=code)
            )
            self._credentials = self._flow.credentials
            TOKEN_PATH.write_text(self._credentials.to_json())
            self._build_service()
            return True
        except Exception as e:
            print(f"Gmail callback error: {e}")
            return False

    def disconnect(self):
        self._credentials = None
        self._service = None
        self._connected_email = None
        if TOKEN_PATH.exists():
            TOKEN_PATH.unlink()

    async def send_email(self, to: str, subject: str, body: str) -> dict:
        if not self.is_connected:
            return {
                "status": "sent",
                "message_id": "demo_" + str(abs(hash(to + subject)))[:8],
                "demo": True,
            }

        try:
            message = MIMEText(body)
            message["to"] = to
            message["subject"] = subject

            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self._service.users()
                .messages()
                .send(userId="me", body={"raw": raw})
                .execute(),
            )
            return {"status": "sent", "message_id": result.get("id", "")}
        except Exception as e:
            return {"status": "error", "error": str(e)}


_gmail_service: Optional[GmailService] = None


def get_gmail_service() -> GmailService:
    global _gmail_service
    if _gmail_service is None:
        _gmail_service = GmailService()
    return _gmail_service
