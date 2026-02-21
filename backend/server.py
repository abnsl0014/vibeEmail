from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    from core.transcriber import transcriber
    from services.intent_service import get_intent_service

    try:
        if transcriber.is_model_downloaded():
            print("ASR model found, loading...")
            await transcriber.load_model()
            print("ASR model loaded!")
        else:
            print("ASR model not downloaded yet.")
    except Exception as e:
        print(f"Could not load ASR model: {e}")

    try:
        intent_svc = get_intent_service()
        if intent_svc.is_model_downloaded():
            print("LLM found, loading...")
            await intent_svc.load_model()
            print("LLM loaded!")
        else:
            print("LLM not downloaded yet.")
    except Exception as e:
        print(f"Could not load LLM: {e}")

    yield
    print("Shutting down Voice Overlay backend...")


app = FastAPI(
    title="Voice Overlay Backend",
    description="Local voice command overlay with email drafting",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.routes import router as api_router
from api.websocket import router as ws_router

app.include_router(api_router)
app.include_router(ws_router)
