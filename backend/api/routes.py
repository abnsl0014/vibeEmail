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
