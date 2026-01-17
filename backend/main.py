import argparse
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pathlib import Path

# Load .env file if it exists
from dotenv import load_dotenv
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

from api.routes import router as api_router
from api.websocket import router as ws_router
from core.transcriber import transcriber

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Try to load model if already downloaded
    try:
        if transcriber.is_model_downloaded():
            print("Model found, loading...")
            await transcriber.load_model()
            print("Model loaded successfully!")
        else:
            print("Model not downloaded yet. Will download during setup.")
    except Exception as e:
        print(f"Could not load model on startup: {e}")

    yield

    # Shutdown: cleanup if needed
    print("Shutting down...")

app = FastAPI(
    title="Voice Notes Backend",
    description="Local ASR backend using Parakeet-MLX",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for Electron frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router)
app.include_router(ws_router)

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "model_loaded": transcriber.is_loaded,
        "model_name": transcriber.MODEL_ID
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Voice Notes Backend")
    parser.add_argument("--port", type=int, default=8765, help="Port to run the server on")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind to")
    args = parser.parse_args()

    uvicorn.run(app, host=args.host, port=args.port)
