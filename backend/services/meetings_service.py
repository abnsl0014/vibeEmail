"""
Meetings service - manages meeting storage and retrieval.
Extends the notes concept with scheduling, summaries, and calendar integration.
"""

import asyncio
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from enum import Enum

import aiohttp

# Cloud backend URL (Render deployment)
RENDER_API_URL = os.getenv("RENDER_API_URL", "")


class MeetingStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MeetingSource(str, Enum):
    MANUAL = "manual"
    GOOGLE_CALENDAR = "google_calendar"
    RECORDING = "recording"


class MeetingsService:
    """Manages meetings storage as JSON files."""

    def __init__(self):
        self.base_dir = Path.home() / "VoiceNotes" / "meetings"
        self.base_dir.mkdir(parents=True, exist_ok=True)

        # Also ensure old notes directory exists for migration
        self.notes_dir = Path.home() / "VoiceNotes" / "notes"

    def _get_meeting_path(self, meeting_id: str) -> Path:
        return self.base_dir / f"{meeting_id}.json"

    async def list_meetings(self, status_filter: Optional[str] = None) -> List[dict]:
        """List all meetings (metadata only), optionally filtered by status."""
        loop = asyncio.get_event_loop()

        def _list():
            meetings = []
            for file_path in self.base_dir.glob("*.json"):
                try:
                    with open(file_path, "r") as f:
                        meeting = json.load(f)

                        # Apply status filter if provided
                        if status_filter and meeting.get("status") != status_filter:
                            continue

                        # Return metadata only (exclude transcription and summary content)
                        meetings.append({
                            "id": meeting["id"],
                            "title": meeting["title"],
                            "scheduled_at": meeting.get("scheduled_at"),
                            "ended_at": meeting.get("ended_at"),
                            "created_at": meeting["created_at"],
                            "updated_at": meeting["updated_at"],
                            "status": meeting.get("status", "completed"),
                            "source": meeting.get("source", "recording"),
                            "duration": meeting.get("duration", 0),
                            "expected_duration": meeting.get("expected_duration"),
                            "auto_record": meeting.get("auto_record", False),
                            "audio_source": meeting.get("audio_source", "microphone"),
                            "word_count": meeting.get("word_count", 0),
                            "has_summary": meeting.get("summary") is not None,
                            "has_transcript": meeting.get("transcription") is not None,
                            "participant_count": len(meeting.get("participants", [])),
                            "calendar_link": meeting.get("calendar_link"),
                        })
                except (json.JSONDecodeError, KeyError) as e:
                    print(f"Error reading meeting {file_path}: {e}")
                    continue

            # Sort: scheduled meetings by scheduled_at (ascending), others by created_at (descending)
            def sort_key(m):
                if m["status"] == "scheduled" and m.get("scheduled_at"):
                    # Future meetings sorted by scheduled time (soonest first)
                    return (0, m["scheduled_at"])
                else:
                    # Past meetings sorted by created_at (newest first)
                    return (1, m.get("created_at", ""))

            meetings.sort(key=sort_key)
            return meetings

        return await loop.run_in_executor(None, _list)

    async def get_meeting(self, meeting_id: str) -> Optional[dict]:
        """Get a single meeting with full data."""
        loop = asyncio.get_event_loop()

        def _get():
            file_path = self._get_meeting_path(meeting_id)
            if not file_path.exists():
                return None
            with open(file_path, "r") as f:
                return json.load(f)

        return await loop.run_in_executor(None, _get)

    async def create_meeting(
        self,
        title: str,
        scheduled_at: Optional[str] = None,
        description: Optional[str] = None,
        location: Optional[str] = None,
        participants: Optional[List[dict]] = None,
        expected_duration: Optional[int] = None,  # seconds
        auto_record: bool = False,
        source: str = "manual",
        status: str = "scheduled",
        calendar_link: Optional[dict] = None,
    ) -> dict:
        """Create a new scheduled meeting."""
        loop = asyncio.get_event_loop()

        def _create():
            meeting_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat() + "Z"

            meeting = {
                "id": meeting_id,
                "title": title,
                "scheduled_at": scheduled_at,
                "ended_at": None,
                "created_at": now,
                "updated_at": now,
                "status": status,
                "source": source,
                "duration": 0,
                "expected_duration": expected_duration,
                "auto_record": auto_record,
                "audio_source": "microphone",
                "word_count": 0,
                "description": description,
                "location": location,
                "participants": participants or [],
                "transcription": None,
                "summary": None,
                "tags": [],
                "notes": None,
                "calendar_link": calendar_link,
            }

            file_path = self._get_meeting_path(meeting_id)
            with open(file_path, "w") as f:
                json.dump(meeting, f, indent=2)

            return meeting

        return await loop.run_in_executor(None, _create)

    async def create_meeting_from_recording(
        self,
        title: str,
        transcription_text: str,
        segments: List[dict],
        duration: float,
        audio_source: str,
    ) -> dict:
        """Create a meeting from a completed recording."""
        loop = asyncio.get_event_loop()

        def _create():
            meeting_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat() + "Z"
            word_count = len(transcription_text.split())

            meeting = {
                "id": meeting_id,
                "title": title,
                "scheduled_at": None,  # Ad-hoc recording
                "ended_at": now,
                "created_at": now,
                "updated_at": now,
                "status": "completed",
                "source": "recording",
                "duration": duration,
                "audio_source": audio_source,
                "word_count": word_count,
                "description": None,
                "location": None,
                "participants": [],
                "transcription": {
                    "full_text": transcription_text,
                    "segments": segments,
                },
                "summary": None,
                "tags": [],
                "notes": None,
                "calendar_link": None,
            }

            file_path = self._get_meeting_path(meeting_id)
            with open(file_path, "w") as f:
                json.dump(meeting, f, indent=2)

            return meeting

        meeting = await loop.run_in_executor(None, _create)

        # Sync to cloud backend (non-blocking)
        asyncio.create_task(self._sync_to_cloud(meeting))

        return meeting

    async def update_meeting(
        self, meeting_id: str, updates: dict
    ) -> Optional[dict]:
        """Update a meeting."""
        loop = asyncio.get_event_loop()

        def _update():
            file_path = self._get_meeting_path(meeting_id)
            if not file_path.exists():
                return None

            with open(file_path, "r") as f:
                meeting = json.load(f)

            # Apply updates
            for key, value in updates.items():
                if key not in ["id", "created_at"]:  # Protect immutable fields
                    meeting[key] = value

            meeting["updated_at"] = datetime.utcnow().isoformat() + "Z"

            with open(file_path, "w") as f:
                json.dump(meeting, f, indent=2)

            return meeting

        return await loop.run_in_executor(None, _update)

    async def delete_meeting(self, meeting_id: str) -> bool:
        """Delete a meeting."""
        loop = asyncio.get_event_loop()

        def _delete():
            file_path = self._get_meeting_path(meeting_id)
            if not file_path.exists():
                return False
            file_path.unlink()
            return True

        return await loop.run_in_executor(None, _delete)

    async def find_by_calendar_event(self, event_id: str, calendar_id: str = None) -> Optional[dict]:
        """Find a meeting by its calendar event ID."""
        meetings = await self.list_meetings()
        for meeting in meetings:
            cal_link = meeting.get("calendar_link") or {}
            if cal_link.get("event_id") == event_id:
                # If calendar_id is provided, also check it matches
                if calendar_id is None or cal_link.get("calendar_id") == calendar_id:
                    return await self.get_meeting(meeting["id"])
        return None

    async def get_upcoming_meetings(self) -> List[dict]:
        """Get all upcoming (scheduled) and in-progress meetings."""
        meetings = await self.list_meetings()
        now = datetime.utcnow().isoformat() + "Z"

        upcoming = []
        for m in meetings:
            # Include in-progress meetings
            if m["status"] == "in_progress":
                upcoming.append(m)
            # Include scheduled meetings (future or past scheduled time)
            elif m["status"] == "scheduled":
                upcoming.append(m)

        # Sort: in-progress first, then by scheduled_at
        def sort_key(m):
            if m["status"] == "in_progress":
                return (0, m.get("scheduled_at") or m.get("created_at", ""))
            return (1, m.get("scheduled_at") or m.get("created_at", ""))

        upcoming.sort(key=sort_key)
        return upcoming

    async def get_past_meetings(self, limit: int = 50) -> List[dict]:
        """Get past (completed) meetings."""
        meetings = await self.list_meetings()
        past = [m for m in meetings if m["status"] in ["completed", "cancelled"]]
        # Sort by ended_at or created_at descending (newest first)
        past.sort(key=lambda m: m.get("ended_at") or m.get("created_at", ""), reverse=True)
        return past[:limit]

    async def start_meeting(self, meeting_id: str) -> Optional[dict]:
        """Mark a scheduled meeting as in progress."""
        return await self.update_meeting(meeting_id, {
            "status": "in_progress",
        })

    async def complete_meeting(
        self,
        meeting_id: str,
        transcription_text: str,
        segments: List[dict],
        duration: float,
        audio_source: str,
    ) -> Optional[dict]:
        """Complete a meeting with recording data."""
        now = datetime.utcnow().isoformat() + "Z"
        word_count = len(transcription_text.split())

        meeting = await self.update_meeting(meeting_id, {
            "status": "completed",
            "ended_at": now,
            "duration": duration,
            "audio_source": audio_source,
            "word_count": word_count,
            "transcription": {
                "full_text": transcription_text,
                "segments": segments,
            },
        })

        if meeting:
            # Sync to cloud backend (non-blocking)
            full_meeting = await self.get_meeting(meeting_id)
            if full_meeting:
                asyncio.create_task(self._sync_to_cloud(full_meeting))

        return meeting

    async def save_summary(
        self,
        meeting_id: str,
        summary: dict,
    ) -> Optional[dict]:
        """Save an AI-generated summary to a meeting."""
        return await self.update_meeting(meeting_id, {
            "summary": summary,
        })

    async def migrate_notes_to_meetings(self) -> int:
        """Migrate existing notes to meetings format."""
        loop = asyncio.get_event_loop()

        def _migrate():
            migrated = 0
            if not self.notes_dir.exists():
                return 0

            for file_path in self.notes_dir.glob("*.json"):
                try:
                    with open(file_path, "r") as f:
                        note = json.load(f)

                    # Check if already migrated
                    meeting_path = self._get_meeting_path(note["id"])
                    if meeting_path.exists():
                        continue

                    # Convert note to meeting format
                    meeting = {
                        "id": note["id"],
                        "title": note["title"],
                        "scheduled_at": None,  # Notes were ad-hoc
                        "ended_at": note.get("created_at"),
                        "created_at": note["created_at"],
                        "updated_at": note.get("updated_at", note["created_at"]),
                        "status": "completed",
                        "source": "recording",
                        "duration": note.get("duration", 0),
                        "audio_source": note.get("audio_source", "microphone"),
                        "word_count": note.get("word_count", 0),
                        "description": None,
                        "location": None,
                        "participants": [],
                        "transcription": note.get("transcription"),
                        "summary": None,
                        "tags": note.get("tags", []),
                        "notes": None,
                        "calendar_link": None,
                    }

                    with open(meeting_path, "w") as f:
                        json.dump(meeting, f, indent=2)

                    migrated += 1
                except Exception as e:
                    print(f"Error migrating {file_path}: {e}")
                    continue

            return migrated

        return await loop.run_in_executor(None, _migrate)

    async def _sync_to_cloud(self, meeting: dict):
        """Sync meeting to cloud backend (Render)."""
        if not RENDER_API_URL:
            return

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{RENDER_API_URL}/api/transcripts",
                    json={
                        "title": meeting["title"],
                        "full_text": meeting.get("transcription", {}).get("full_text", ""),
                        "segments": meeting.get("transcription", {}).get("segments", []),
                        "duration": meeting.get("duration", 0),
                        "audio_source": meeting.get("audio_source", "microphone"),
                    },
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    if resp.status == 200:
                        print(f"Synced to cloud: {meeting['id']}")
                    else:
                        print(f"Cloud sync failed with status {resp.status}")
        except Exception as e:
            print(f"Cloud sync failed: {e}")


# Singleton instance
meetings_service = MeetingsService()
