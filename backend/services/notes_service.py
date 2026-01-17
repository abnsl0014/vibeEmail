import os
import json
import uuid
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional

import aiohttp

# Cloud backend URL (Render deployment)
RENDER_API_URL = os.getenv("RENDER_API_URL", "")


class NotesService:
    """Manages notes storage as JSON files."""

    def __init__(self):
        self._notes_dir = self._default_notes_dir()
        self._ensure_dir()

    def _default_notes_dir(self) -> str:
        return str(Path.home() / "VoiceNotes" / "notes")

    def _ensure_dir(self):
        """Ensure the notes directory exists."""
        Path(self._notes_dir).mkdir(parents=True, exist_ok=True)

    def _get_note_path(self, note_id: str) -> Path:
        """Get the file path for a note."""
        return Path(self._notes_dir) / f"{note_id}.json"

    async def list_notes(self) -> list[dict]:
        """List all notes (metadata only)."""
        loop = asyncio.get_event_loop()

        def _list():
            notes = []
            for file in Path(self._notes_dir).glob("*.json"):
                try:
                    with open(file, 'r') as f:
                        note = json.load(f)
                        # Return metadata only
                        notes.append({
                            "id": note["id"],
                            "title": note["title"],
                            "created_at": note["created_at"],
                            "updated_at": note["updated_at"],
                            "duration": note["duration"],
                            "audio_source": note["audio_source"],
                            "word_count": note["word_count"]
                        })
                except Exception as e:
                    print(f"Error reading note {file}: {e}")

            # Sort by created_at descending
            notes.sort(key=lambda x: x["created_at"], reverse=True)
            return notes

        return await loop.run_in_executor(None, _list)

    async def get_note(self, note_id: str) -> Optional[dict]:
        """Get a full note by ID."""
        loop = asyncio.get_event_loop()

        def _get():
            path = self._get_note_path(note_id)
            if not path.exists():
                return None
            with open(path, 'r') as f:
                return json.load(f)

        return await loop.run_in_executor(None, _get)

    async def create_note(
        self,
        title: str,
        transcription_text: str,
        segments: list[dict],
        duration: float,
        audio_source: str
    ) -> dict:
        """Create a new note."""
        loop = asyncio.get_event_loop()

        def _create():
            note_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat() + "Z"

            # Count words
            word_count = len(transcription_text.split())

            note = {
                "id": note_id,
                "title": title,
                "created_at": now,
                "updated_at": now,
                "duration": duration,
                "audio_source": audio_source,
                "word_count": word_count,
                "transcription": {
                    "full_text": transcription_text,
                    "segments": segments
                }
            }

            path = self._get_note_path(note_id)
            with open(path, 'w') as f:
                json.dump(note, f, indent=2)

            return note

        note = await loop.run_in_executor(None, _create)

        # Sync to cloud backend (non-blocking)
        asyncio.create_task(self._sync_to_cloud(note))

        return note

    async def _sync_to_cloud(self, note: dict):
        """Sync note to cloud backend (Render)."""
        if not RENDER_API_URL:
            return

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{RENDER_API_URL}/api/transcripts",
                    json={
                        "title": note["title"],
                        "full_text": note["transcription"]["full_text"],
                        "segments": note["transcription"]["segments"],
                        "duration": note["duration"],
                        "audio_source": note["audio_source"]
                    },
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status == 200:
                        print(f"Synced to cloud: {note['id']}")
                    else:
                        print(f"Cloud sync failed with status {resp.status}")
        except Exception as e:
            print(f"Cloud sync failed: {e}")

    async def update_note(self, note_id: str, title: Optional[str] = None) -> Optional[dict]:
        """Update a note."""
        loop = asyncio.get_event_loop()

        def _update():
            path = self._get_note_path(note_id)
            if not path.exists():
                return None

            with open(path, 'r') as f:
                note = json.load(f)

            if title is not None:
                note["title"] = title

            note["updated_at"] = datetime.utcnow().isoformat() + "Z"

            with open(path, 'w') as f:
                json.dump(note, f, indent=2)

            return note

        return await loop.run_in_executor(None, _update)

    async def delete_note(self, note_id: str) -> bool:
        """Delete a note."""
        loop = asyncio.get_event_loop()

        def _delete():
            path = self._get_note_path(note_id)
            if not path.exists():
                return False
            path.unlink()
            return True

        return await loop.run_in_executor(None, _delete)


# Singleton instance
notes_service = NotesService()
