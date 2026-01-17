import base64
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import numpy as np

from core.transcriber import transcriber

router = APIRouter()

@router.websocket("/ws/transcribe")
async def websocket_transcribe(websocket: WebSocket):
    """
    WebSocket endpoint for real-time transcription.

    Protocol:
    - Client sends: {"type": "audio", "audio": "<base64 float32 PCM>", "sample_rate": 16000}
    - Client sends: {"type": "stop"} to finalize
    - Server sends: {"text": "...", "is_final": false/true, "segments": [...]}
    """
    await websocket.accept()

    if not transcriber.is_loaded:
        await websocket.send_json({
            "error": "Model not loaded",
            "code": "MODEL_NOT_READY"
        })
        await websocket.close()
        return

    accumulated_audio: list[np.ndarray] = []
    last_partial_text = ""

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "audio")

            if msg_type == "stop":
                # Final transcription of all accumulated audio
                if accumulated_audio:
                    full_audio = np.concatenate(accumulated_audio)
                    result = await transcriber.transcribe_audio(full_audio)

                    await websocket.send_json({
                        "text": result.full_text,
                        "segments": [
                            {
                                "text": seg.text,
                                "start": seg.start,
                                "end": seg.end
                            }
                            for seg in result.segments
                        ],
                        "is_final": True,
                        "duration": result.duration
                    })
                else:
                    await websocket.send_json({
                        "text": "",
                        "segments": [],
                        "is_final": True,
                        "duration": 0
                    })
                break

            elif msg_type == "audio":
                # Decode and accumulate audio chunk
                audio_b64 = data.get("audio")
                if audio_b64:
                    audio_bytes = base64.b64decode(audio_b64)
                    audio_chunk = np.frombuffer(audio_bytes, dtype=np.float32)
                    accumulated_audio.append(audio_chunk)

                    # Send partial transcription every ~2 seconds of audio
                    # (assuming 16kHz sample rate and ~0.5s chunks = 8000 samples)
                    total_samples = sum(len(chunk) for chunk in accumulated_audio)
                    if total_samples >= 32000:  # ~2 seconds at 16kHz
                        # Transcribe recent audio for partial result
                        recent_audio = np.concatenate(accumulated_audio[-8:])  # Last ~4 seconds
                        result = await transcriber.transcribe_audio(recent_audio)

                        # Only send if text has changed
                        if result.full_text != last_partial_text:
                            last_partial_text = result.full_text
                            await websocket.send_json({
                                "text": result.full_text,
                                "is_final": False
                            })

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "error": str(e),
                "code": "TRANSCRIPTION_ERROR"
            })
        except:
            pass
