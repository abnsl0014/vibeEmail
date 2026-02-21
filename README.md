# Voice Overlay

A lightweight, always-available voice command overlay for macOS. Press F1, speak a command, and the app executes it - starting with email drafting and sending.

## Features

- **100% Local AI** - All speech recognition (Parakeet TDT 0.6B) and language processing (Llama 3.2 1B) runs on-device via Apple Silicon MLX
- **Minimal Overlay UI** - Small pill overlay that stays out of the way. No full windows, no app switching
- **Voice-First** - Press F1, speak "Email Sarah about rescheduling the meeting to Friday", review, and send
- **Gmail Integration** - Send emails directly via Gmail API without leaving your current app
- **MVP: Email only** - Architecture supports future actions (calendar, messaging, etc.)

## Architecture

```
Electron App (Overlay Shell)
├── React Frontend (Overlay UI)
│   ├── Listening Pill (waveform + controls)
│   ├── Processing Pill (drafting indicator)
│   ├── Email Card (To/Subject/Body + Send)
│   ├── Success/Error states
│   └── Setup Wizard (first-run)
├── Python Backend (FastAPI)
│   ├── Parakeet-MLX (ASR - Speech to Text)
│   ├── Llama 3.2 1B (Intent parsing + Email drafting)
│   └── Gmail API (OAuth + Send)
└── Electron Main Process
    ├── Transparent overlay window
    ├── F1 global shortcut
    └── Python backend lifecycle
```

## Requirements

- **macOS** with Apple Silicon (M1/M2/M3/M4)
- **Python 3.11+**
- **Node.js 18+**
- ~3GB disk space for AI models

## Quick Start

### 1. Install dependencies

```bash
# Frontend
npm install

# Backend
cd backend
pip install -r requirements.txt
```

### 2. Gmail Setup (optional)

1. Create a Google Cloud project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the Gmail API
3. Create OAuth 2.0 credentials (Desktop application)
4. Download the client secrets JSON
5. Save it as `~/VoiceOverlay/gmail_client.json`

### 3. Run in development

```bash
npm run dev
```

This starts:
- Vite dev server with React frontend
- Electron window
- Python backend (auto-started by Electron)

### 4. Build for production

```bash
npm run build
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| F1 | Toggle overlay (show/hide) |
| Escape | Dismiss overlay |
| Cmd+Enter | Send email (in email card) |
| Tab | Move between fields |

## Project Structure

```
voice-overlay/
├── electron/
│   ├── main.ts              # Electron main process
│   └── preload.ts           # IPC bridge
├── src/                     # React frontend (TypeScript)
│   ├── components/
│   │   ├── overlay/         # Overlay UI components
│   │   └── setup/           # First-run setup wizard
│   ├── hooks/               # Audio, transcription, overlay hooks
│   ├── stores/              # Zustand state management
│   ├── services/            # API client
│   └── types/               # TypeScript interfaces
├── backend/                 # Python FastAPI backend
│   ├── api/                 # REST + WebSocket endpoints
│   ├── core/                # ASR transcriber
│   └── services/            # LLM, email, Gmail services
├── frontend/                # Web preview (development only)
└── public/
    └── recorder.worklet.js  # AudioWorklet processor
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Backend + model status |
| GET | /models/status | ASR and LLM model details |
| POST | /models/download | SSE stream for model download |
| POST | /models/load | Load models into memory |
| POST | /intent/parse | Parse voice text → intent |
| POST | /email/draft | Generate email from intent |
| POST | /email/send | Send email via Gmail |
| GET | /gmail/status | Gmail connection status |
| GET | /auth/gmail/url | Start OAuth flow |
| GET | /auth/gmail/callback | OAuth callback |

## AI Models

- **Parakeet TDT 0.6B v2** (`mlx-community/parakeet-tdt-0.6b-v2`) - ~2.3GB, speech-to-text
- **Llama 3.2 1B Instruct 4-bit** (`mlx-community/Llama-3.2-1B-Instruct-4bit`) - ~680MB, intent parsing & email drafting

Models are downloaded to `~/VoiceOverlay/model-cache/` on first run.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron 28+ |
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Build Tool | Vite + vite-plugin-electron |
| Backend | Python 3.11+ FastAPI + Uvicorn |
| Speech-to-Text | parakeet-mlx |
| Language Model | mlx-lm (Llama 3.2 1B) |
| Email | Gmail API |
| Audio Capture | Web Audio API + AudioWorklet |
