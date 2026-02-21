import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, HTMLResponse
from pydantic import BaseModel
from typing import Optional

from core.transcriber import transcriber
from services.model_manager import model_manager
from services.intent_service import get_intent_service
from services.email_drafter import get_email_drafter
from services.gmail_service import get_gmail_service

router = APIRouter()


# ─── Health ───────────────────────────────────────────────
@router.get("/health")
async def health():
    intent_svc = get_intent_service()
    return {
        "status": "ok",
        "asr_loaded": transcriber.is_loaded,
        "llm_loaded": intent_svc.is_loaded,
    }


# ─── Models ───────────────────────────────────────────────
@router.get("/models/status")
async def models_status():
    intent_svc = get_intent_service()
    return {
        "asr": {
            "downloaded": transcriber.is_model_downloaded(),
            "loaded": transcriber.is_loaded,
            "name": transcriber.MODEL_ID,
            "size_mb": 2300,
        },
        "llm": {
            "downloaded": intent_svc.is_model_downloaded(),
            "loaded": intent_svc.is_loaded,
            "name": intent_svc.MODEL_NAME,
            "size_mb": 680,
        },
    }


@router.post("/models/download")
async def download_models():
    async def progress_stream():
        try:
            async for progress in model_manager.download_all_models():
                yield f"data: {json.dumps(progress)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(progress_stream(), media_type="text/event-stream")


@router.post("/models/load")
async def load_models():
    errors = []
    try:
        await transcriber.load_model()
    except Exception as e:
        errors.append(f"ASR: {e}")
    try:
        intent_svc = get_intent_service()
        await intent_svc.load_model()
    except Exception as e:
        errors.append(f"LLM: {e}")
    if errors:
        raise HTTPException(status_code=500, detail="; ".join(errors))
    return {"status": "ok", "message": "Models loaded"}


# ─── Intent Parsing ───────────────────────────────────────
class IntentRequest(BaseModel):
    text: str


@router.post("/intent/parse")
async def parse_intent(req: IntentRequest):
    intent_svc = get_intent_service()
    result = await intent_svc.parse_intent(req.text)
    return result


# ─── Email Drafting ───────────────────────────────────────
class DraftRequest(BaseModel):
    action: str = "email"
    to: Optional[str] = None
    subject: Optional[str] = None
    body_hint: Optional[str] = None


@router.post("/email/draft")
async def draft_email(req: DraftRequest):
    drafter = get_email_drafter()
    result = await drafter.draft_email(
        to=req.to or "", subject=req.subject or "", body_hint=req.body_hint or ""
    )
    return result


# ─── Gmail ────────────────────────────────────────────────
@router.get("/gmail/status")
async def gmail_status():
    gmail = get_gmail_service()
    return {
        "connected": gmail.is_connected,
        "has_client_config": gmail.has_client_config,
        "email": gmail.connected_email,
    }


class ClientConfigRequest(BaseModel):
    client_config: dict


@router.post("/gmail/client-config")
async def set_gmail_client_config(req: ClientConfigRequest):
    gmail = get_gmail_service()
    success = gmail.set_client_config(req.client_config)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid client configuration")
    return {"status": "ok", "message": "Client config saved"}


@router.get("/auth/gmail/url")
async def get_gmail_auth_url():
    gmail = get_gmail_service()
    url = gmail.get_auth_url()
    if not url:
        raise HTTPException(
            status_code=400, detail="Gmail client not configured"
        )
    return {"auth_url": url}


@router.get("/auth/gmail/callback")
async def gmail_auth_callback(code: str):
    gmail = get_gmail_service()
    success = await gmail.handle_callback(code)
    if not success:
        raise HTTPException(status_code=400, detail="Authentication failed")
    return HTMLResponse(
        """<html><body>
        <script>
            window.opener?.postMessage({type:'GMAIL_AUTH_SUCCESS'},'*');
            window.close();
        </script>
        <p>Authentication successful! You can close this window.</p>
        </body></html>"""
    )


@router.post("/auth/gmail/disconnect")
async def gmail_disconnect():
    gmail = get_gmail_service()
    gmail.disconnect()
    return {"status": "ok", "message": "Gmail disconnected"}


# ─── Send Email ───────────────────────────────────────────
class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body: str


@router.post("/email/send")
async def send_email(req: SendEmailRequest):
    gmail = get_gmail_service()
    result = await gmail.send_email(req.to, req.subject, req.body)
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("error", "Send failed"))
    return result
