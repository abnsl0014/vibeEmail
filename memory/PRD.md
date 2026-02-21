# Voice Overlay - Product Requirements Document

## Original Problem Statement
Build a lightweight, always-available voice command overlay for macOS. User presses F1, speaks a command, sees a preview, and hits Send. MVP: Email only. 100% local AI using Apple Silicon (MLX). Minimal overlay UI. Self-contained Electron app with downloadable models.

## Architecture
- **Desktop Shell**: Electron 28+ (transparent overlay, frameless, always-on-top)
- **Frontend**: React 18 + TypeScript + Tailwind CSS (Vite build)
- **Backend**: Python 3.11+ FastAPI + Uvicorn
- **ASR**: Parakeet-MLX (parakeet-tdt-0.6b-v2) - ~2.3GB
- **LLM**: mlx-lm (Llama 3.2 1B Instruct 4-bit) - ~680MB
- **Email**: Gmail API (OAuth 2.0)
- **Audio**: Web Audio API + AudioWorklet (16kHz, mono)

## User Personas
- **Primary**: Productivity-focused professional who wants to fire off emails via voice without context switching
- **Use case**: Press F1, say "Email Sarah about rescheduling the meeting to Friday", review, send

## Core Requirements (Static)
1. F1 global shortcut to toggle overlay
2. Voice recording with real-time waveform display
3. Speech-to-text transcription (local Parakeet ASR)
4. Intent parsing (local Llama 3.2 1B)
5. Email draft generation (local Llama 3.2 1B)
6. Email card UI for review/edit (To, Subject, Body)
7. Gmail OAuth + send via Gmail API
8. Setup wizard (Welcome → Model Download → Gmail Connect → Ready)
9. 6 overlay states: hidden, listening, processing, email_card, sending, success, error

## What's Been Implemented (Jan 2026)

### Backend (FastAPI)
- [x] server.py - Main FastAPI app with lifespan model loading
- [x] api/routes.py - All REST endpoints (/health, /models/*, /intent/parse, /email/*, /gmail/*, /auth/gmail/*)
- [x] api/websocket.py - WebSocket transcription endpoint
- [x] core/transcriber.py - Parakeet ASR wrapper with mock fallback
- [x] services/intent_service.py - LLM intent parsing with mock fallback
- [x] services/email_drafter.py - LLM email composition with mock fallback
- [x] services/gmail_service.py - Gmail OAuth + send with demo fallback
- [x] services/model_manager.py - Dual model download with SSE progress

### Frontend (React)
- [x] Setup Wizard (4 steps: Welcome, Models, Gmail, Ready)
- [x] Overlay components (ListeningPill, ProcessingPill, EmailCard, SuccessPill, ErrorCard)
- [x] PillWaveform (15 animated bars driven by audio level)
- [x] OverlayContainer (state machine controller)
- [x] Zustand stores (overlayStore, appStore)
- [x] API service client
- [x] Web preview mode (simulated desktop with overlay)

### Electron
- [x] main.ts - Transparent overlay window, F1 shortcut, Python backend lifecycle
- [x] preload.ts - IPC bridge (toggle, hide, backend port)

### Testing Results (Iteration 1)
- Backend: 100% (8/8 API endpoints working)
- Frontend: 100% (All UI flows and integrations working)
- All overlay states verified: hidden → listening → processing → email_card → sending → success

## Prioritized Backlog

### P0 (Critical)
- [ ] Real audio capture integration with WebSocket transcription
- [ ] Electron build/packaging for macOS distribution

### P1 (Important)
- [ ] Real-time partial transcription display during listening
- [ ] Contact lookup / auto-complete for "To" field
- [ ] Error handling for model loading failures

### P2 (Nice to Have)
- [ ] Windows support
- [ ] Calendar action support
- [ ] Messaging action support
- [ ] Tray icon / menu bar integration
- [ ] Settings panel (shortcut customization, model selection)

## Next Tasks
1. Test on actual macOS with Apple Silicon (model loading, ASR, LLM)
2. Build Electron distribution package (.dmg)
3. Implement real-time WebSocket audio streaming
4. Add contact auto-complete for email recipients
