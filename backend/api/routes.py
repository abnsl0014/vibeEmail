import os
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import numpy as np

from core.transcriber import transcriber
from services.model_manager import model_manager
from services.notes_service import notes_service
from services.meetings_service import meetings_service
from services.summary_service import get_summary_service, MODEL_NAME as SUMMARY_MODEL_NAME
from services.calendar_service import get_calendar_service

router = APIRouter()

# Pydantic models
class ModelStatusResponse(BaseModel):
    is_downloaded: bool
    is_loaded: bool
    model_name: str
    model_size_mb: float

class TranscriptionRequest(BaseModel):
    audio_base64: str
    sample_rate: int = 16000

class TranscriptionResponse(BaseModel):
    text: str
    segments: list[dict]
    duration: float

class NoteCreateRequest(BaseModel):
    title: str
    transcription_text: str
    segments: list[dict]
    duration: float
    audio_source: str

class NoteResponse(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    duration: float
    audio_source: str
    word_count: int
    transcription: dict

# Meeting Pydantic models
class ParticipantModel(BaseModel):
    email: str
    name: Optional[str] = None
    response_status: Optional[str] = None

class CalendarLinkModel(BaseModel):
    provider: str = "google"
    event_id: str
    calendar_id: str
    html_link: Optional[str] = None
    last_synced: str

class MeetingCreateRequest(BaseModel):
    title: str
    scheduled_at: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    participants: Optional[list[ParticipantModel]] = None
    expected_duration: Optional[int] = None  # seconds
    auto_record: bool = False
    source: str = "manual"

class MeetingFromRecordingRequest(BaseModel):
    title: str
    transcription_text: str
    segments: list[dict]
    duration: float
    audio_source: str

class MeetingUpdateRequest(BaseModel):
    title: Optional[str] = None
    scheduled_at: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[list[str]] = None

# Model endpoints
@router.get("/model/status")
async def get_model_status() -> ModelStatusResponse:
    """Get the current model status."""
    return ModelStatusResponse(
        is_downloaded=transcriber.is_model_downloaded(),
        is_loaded=transcriber.is_loaded,
        model_name=transcriber.MODEL_ID,
        model_size_mb=640.0  # Approximate size
    )

@router.post("/model/download")
async def download_model():
    """Download the model with progress streaming."""
    async def progress_stream():
        try:
            async for progress in model_manager.download_model():
                yield f"data: {json.dumps(progress)}\n\n"
            yield f"data: {json.dumps({'status': 'complete'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        progress_stream(),
        media_type="text/event-stream"
    )

@router.post("/model/load")
async def load_model():
    """Load the model into memory."""
    try:
        await transcriber.load_model()
        return {"status": "ok", "message": "Model loaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Transcription endpoints
@router.post("/transcribe")
async def transcribe_audio(request: TranscriptionRequest) -> TranscriptionResponse:
    """Transcribe base64 encoded audio."""
    if not transcriber.is_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        import base64
        audio_bytes = base64.b64decode(request.audio_base64)
        audio_data = np.frombuffer(audio_bytes, dtype=np.float32)

        result = await transcriber.transcribe_audio(audio_data, request.sample_rate)

        return TranscriptionResponse(
            text=result.full_text,
            segments=[
                {"text": s.text, "start": s.start, "end": s.end}
                for s in result.segments
            ],
            duration=result.duration
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcribe/file")
async def transcribe_file(file: UploadFile = File(...)):
    """Transcribe an uploaded audio file."""
    if not transcriber.is_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        from scipy.io import wavfile
        import io

        content = await file.read()
        sample_rate, audio_data = wavfile.read(io.BytesIO(content))

        # Convert to float32
        if audio_data.dtype == np.int16:
            audio_data = audio_data.astype(np.float32) / 32768.0
        elif audio_data.dtype == np.int32:
            audio_data = audio_data.astype(np.float32) / 2147483648.0

        # Convert stereo to mono if needed
        if len(audio_data.shape) > 1:
            audio_data = audio_data.mean(axis=1)

        result = await transcriber.transcribe_audio(audio_data, sample_rate)

        return TranscriptionResponse(
            text=result.full_text,
            segments=[
                {"text": s.text, "start": s.start, "end": s.end}
                for s in result.segments
            ],
            duration=result.duration
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Notes endpoints
@router.get("/notes")
async def list_notes():
    """List all saved notes."""
    try:
        notes = await notes_service.list_notes()
        return {"notes": notes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notes/{note_id}")
async def get_note(note_id: str):
    """Get a specific note by ID."""
    try:
        note = await notes_service.get_note(note_id)
        if note is None:
            raise HTTPException(status_code=404, detail="Note not found")
        return note
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/notes")
async def create_note(request: NoteCreateRequest):
    """Create a new note."""
    try:
        note = await notes_service.create_note(
            title=request.title,
            transcription_text=request.transcription_text,
            segments=request.segments,
            duration=request.duration,
            audio_source=request.audio_source
        )
        return note
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/notes/{note_id}")
async def delete_note(note_id: str):
    """Delete a note."""
    try:
        success = await notes_service.delete_note(note_id)
        if not success:
            raise HTTPException(status_code=404, detail="Note not found")
        return {"status": "ok", "message": "Note deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/notes/{note_id}")
async def update_note(note_id: str, title: Optional[str] = None):
    """Update a note's title."""
    try:
        note = await notes_service.update_note(note_id, title=title)
        if note is None:
            raise HTTPException(status_code=404, detail="Note not found")
        return note
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== MEETINGS ENDPOINTS ==============

@router.get("/meetings")
async def list_meetings(status: Optional[str] = None):
    """List all meetings with optional status filter."""
    try:
        meetings = await meetings_service.list_meetings(status_filter=status)
        return {"meetings": meetings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/meetings/upcoming")
async def get_upcoming_meetings():
    """Get all upcoming (scheduled) meetings."""
    try:
        meetings = await meetings_service.get_upcoming_meetings()
        return {"meetings": meetings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/meetings/past")
async def get_past_meetings(limit: int = 50):
    """Get past (completed) meetings."""
    try:
        meetings = await meetings_service.get_past_meetings(limit=limit)
        return {"meetings": meetings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/meetings/{meeting_id}")
async def get_meeting(meeting_id: str):
    """Get a specific meeting by ID."""
    try:
        meeting = await meetings_service.get_meeting(meeting_id)
        if meeting is None:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return meeting
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/meetings")
async def create_meeting(request: MeetingCreateRequest):
    """Create a new scheduled meeting."""
    try:
        participants = None
        if request.participants:
            participants = [p.model_dump() for p in request.participants]

        meeting = await meetings_service.create_meeting(
            title=request.title,
            scheduled_at=request.scheduled_at,
            description=request.description,
            location=request.location,
            participants=participants,
            expected_duration=request.expected_duration,
            auto_record=request.auto_record,
            source=request.source,
        )
        return meeting
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/meetings/from-recording")
async def create_meeting_from_recording(request: MeetingFromRecordingRequest):
    """Create a meeting from a completed recording."""
    try:
        meeting = await meetings_service.create_meeting_from_recording(
            title=request.title,
            transcription_text=request.transcription_text,
            segments=request.segments,
            duration=request.duration,
            audio_source=request.audio_source,
        )
        return meeting
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/meetings/{meeting_id}")
async def update_meeting(meeting_id: str, request: MeetingUpdateRequest):
    """Update a meeting."""
    try:
        updates = {k: v for k, v in request.model_dump().items() if v is not None}
        meeting = await meetings_service.update_meeting(meeting_id, updates)
        if meeting is None:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return meeting
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str):
    """Delete a meeting."""
    try:
        success = await meetings_service.delete_meeting(meeting_id)
        if not success:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return {"status": "ok", "message": "Meeting deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/meetings/{meeting_id}/start")
async def start_meeting(meeting_id: str):
    """Mark a scheduled meeting as in progress."""
    try:
        meeting = await meetings_service.start_meeting(meeting_id)
        if meeting is None:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return meeting
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/meetings/{meeting_id}/complete")
async def complete_meeting(meeting_id: str, request: MeetingFromRecordingRequest):
    """Complete a meeting with recording data."""
    try:
        meeting = await meetings_service.complete_meeting(
            meeting_id=meeting_id,
            transcription_text=request.transcription_text,
            segments=request.segments,
            duration=request.duration,
            audio_source=request.audio_source,
        )
        if meeting is None:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return meeting
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/meetings/migrate")
async def migrate_notes_to_meetings():
    """Migrate existing notes to meetings format."""
    try:
        count = await meetings_service.migrate_notes_to_meetings()
        return {"status": "ok", "migrated": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== AI SUMMARY ENDPOINTS ==============

@router.get("/summary/status")
async def get_summary_status():
    """Get the AI summary model status."""
    summary_service = get_summary_service()
    return {
        "is_loaded": summary_service.is_loaded,
        "is_loading": summary_service.is_loading,
        "model_name": SUMMARY_MODEL_NAME
    }


@router.post("/summary/load")
async def load_summary_model():
    """Load the AI summary model."""
    summary_service = get_summary_service()
    try:
        success = await summary_service.load_model()
        if success:
            return {"status": "ok", "message": "Summary model loaded"}
        else:
            raise HTTPException(status_code=500, detail="Failed to load summary model")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/meetings/{meeting_id}/summary")
async def generate_meeting_summary(meeting_id: str):
    """Generate an AI summary for a meeting."""
    summary_service = get_summary_service()

    # Get the meeting
    meeting = await meetings_service.get_meeting(meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Check if meeting has a transcript
    transcription = meeting.get("transcription")
    if not transcription or not transcription.get("full_text"):
        raise HTTPException(status_code=400, detail="Meeting has no transcript to summarize")

    try:
        # Generate summary
        summary = await summary_service.generate_summary(
            transcript=transcription["full_text"],
            title=meeting.get("title", "")
        )

        if summary is None:
            raise HTTPException(status_code=500, detail="Failed to generate summary")

        # Update meeting with summary
        updated_meeting = await meetings_service.update_meeting(
            meeting_id,
            {
                "summary": summary,
                "has_summary": True
            }
        )

        return {
            "status": "ok",
            "summary": summary,
            "meeting": updated_meeting
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== GOOGLE CALENDAR ENDPOINTS ==============

class CalendarClientConfig(BaseModel):
    client_config: dict

class CalendarSyncRequest(BaseModel):
    calendar_id: str = "primary"
    days_ahead: int = 7


@router.get("/calendar/status")
async def get_calendar_status():
    """Get Google Calendar connection status."""
    calendar_service = get_calendar_service()
    await calendar_service.load_credentials()

    return {
        "is_connected": calendar_service.is_connected,
        "has_client_config": calendar_service.has_client_config,
    }


@router.post("/calendar/client-config")
async def set_calendar_client_config(request: CalendarClientConfig):
    """Set the Google OAuth client configuration."""
    calendar_service = get_calendar_service()

    success = calendar_service.set_client_config(request.client_config)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid client configuration")

    return {"status": "ok", "message": "Client configuration saved"}


@router.get("/auth/google/url")
async def get_google_auth_url():
    """Get the Google OAuth authorization URL."""
    calendar_service = get_calendar_service()

    auth_url = calendar_service.get_auth_url()
    if not auth_url:
        raise HTTPException(
            status_code=400,
            detail="Google OAuth client not configured. Please set client config first."
        )

    return {"auth_url": auth_url}


@router.get("/auth/google/callback")
async def google_auth_callback(code: str):
    """Handle the Google OAuth callback."""
    calendar_service = get_calendar_service()

    success = await calendar_service.handle_callback(code)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to authenticate with Google")

    # Return HTML that closes the window and notifies parent
    return """
    <html>
    <body>
        <script>
            window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
            window.close();
        </script>
        <p>Authentication successful! You can close this window.</p>
    </body>
    </html>
    """


@router.post("/auth/google/disconnect")
async def disconnect_google():
    """Disconnect Google Calendar."""
    calendar_service = get_calendar_service()

    success = await calendar_service.disconnect()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to disconnect")

    return {"status": "ok", "message": "Google Calendar disconnected"}


@router.get("/calendar/list")
async def list_calendars():
    """List available Google Calendars."""
    calendar_service = get_calendar_service()

    if not await calendar_service.load_credentials():
        raise HTTPException(status_code=401, detail="Not connected to Google Calendar")

    calendars = await calendar_service.list_calendars()
    return {"calendars": calendars}


@router.get("/calendar/events")
async def get_calendar_events(calendar_id: str = "primary", days_ahead: int = 7):
    """Get upcoming events from a calendar."""
    calendar_service = get_calendar_service()

    if not await calendar_service.load_credentials():
        raise HTTPException(status_code=401, detail="Not connected to Google Calendar")

    events = await calendar_service.get_upcoming_events(calendar_id, days_ahead)
    return {"events": events}


@router.post("/calendar/sync")
async def sync_calendar(request: CalendarSyncRequest):
    """Sync calendar events to meetings."""
    calendar_service = get_calendar_service()

    if not await calendar_service.load_credentials():
        raise HTTPException(status_code=401, detail="Not connected to Google Calendar")

    try:
        synced = await calendar_service.sync_events_to_meetings(
            request.calendar_id,
            request.days_ahead
        )
        return {
            "status": "ok",
            "synced_count": len(synced),
            "meetings": synced
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
