# Voice Notes

A macOS Electron app for voice-to-text transcription using NVIDIA Parakeet ASR running locally via parakeet-mlx. Captures microphone audio, transcribes in real-time, and saves notes locally with optional cloud sync.

## Requirements

- **macOS** with Apple Silicon (M1/M2/M3/M4) - Intel Macs not supported
- **Node.js** 18+
- **Python** 3.10+ (3.11 recommended)

## Installation (For Users)

### Option 1: Run from Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/voice-notes-app.git
   cd voice-notes-app
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Set up Python backend**
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   cd ..
   ```

4. **Run the app**
   ```bash
   npm run dev
   ```

5. **First-time setup**
   - The app will guide you through downloading the AI model (~640 MB)
   - Grant microphone permissions when prompted

### Option 2: Download Pre-built Release

> Coming soon - check the [Releases](../../releases) page for DMG downloads.

## How It Works

```
┌─────────────────────────────────────────────────────┐
│              Voice Notes Electron App                │
│                                                      │
│  ┌─────────────┐    ┌─────────────────────────────┐ │
│  │   React UI  │◄──►│  Local Python Backend       │ │
│  │             │    │  - Parakeet ASR Model       │ │
│  │  Recording  │    │  - Real-time transcription  │ │
│  │  Playback   │    │  - WebSocket streaming      │ │
│  │  Notes List │    │  - Local file storage       │ │
│  └─────────────┘    └──────────────┬──────────────┘ │
└─────────────────────────────────────┼───────────────┘
                                      │ Sync (optional)
                              ┌───────▼───────┐
                              │ Cloud Backend │
                              │   (Render)    │
                              │       ↓       │
                              │   Supabase    │
                              └───────────────┘
```

**Local Processing**: All audio transcription happens on your Mac using the Parakeet model. Your voice data never leaves your device.

**Cloud Sync (Optional)**: Transcripts can be synced to a cloud database for access from other devices.

## Features

- Real-time voice-to-text transcription
- 100% local processing - no cloud required for transcription
- Timestamp-based transcript segments
- Notes saved locally in `~/VoiceNotes/notes/`
- Optional cloud sync to Supabase
- System audio capture support (with BlackHole)

## Project Structure

```
voice-notes-app/
├── electron/           # Electron main process
│   └── main.ts         # App entry, spawns Python backend
├── src/                # React frontend
│   ├── components/     # UI components
│   ├── hooks/          # Custom React hooks
│   └── stores/         # Zustand state management
├── backend/            # Local Python backend
│   ├── main.py         # FastAPI server
│   ├── core/           # Parakeet transcription
│   ├── api/            # REST & WebSocket endpoints
│   └── services/       # Notes storage
├── render-backend/     # Cloud backend (for Render deployment)
└── public/             # Static assets
```

## Development

### Running in Development Mode

```bash
# Terminal 1: Start the app (includes backend)
npm run dev
```

### Running Backend Separately

```bash
# Terminal 1: Start Python backend
cd backend
source .venv/bin/activate
python main.py --port 8765

# Terminal 2: Start Electron app
npm run dev
```

### Building for Distribution

```bash
# Build macOS DMG
npm run package
```

Output will be in `dist/` folder.

## Cloud Backend Setup (Optional)

If you want to sync transcripts to the cloud:

1. See [BACKEND_SETUP.md](./BACKEND_SETUP.md) for detailed instructions
2. Deploy the `render-backend/` to Render
3. Set up Supabase database
4. Configure `backend/.env` with your Render URL

## System Audio Capture (Optional)

To transcribe system audio (meetings, videos, etc.):

1. Install [BlackHole](https://existential.audio/blackhole/) (free)
2. Open **Audio MIDI Setup** (built into macOS)
3. Create a **Multi-Output Device** with BlackHole + your speakers
4. Set this as your system output
5. Select "System Audio" in the app

## Tech Stack

- **Frontend**: Electron 28, React 18, TypeScript, Tailwind CSS, Zustand
- **Local Backend**: Python, FastAPI, parakeet-mlx, WebSockets
- **Cloud Backend**: FastAPI, asyncpg, Supabase (PostgreSQL)
- **ASR Model**: mlx-community/parakeet-tdt-0.6b-v2

## Troubleshooting

### "Waiting for Backend..." stuck
- The Python backend may take 10-20 seconds to start on first run
- Check that Python 3.10+ is installed: `python3 --version`
- Ensure virtual environment is set up: `ls backend/.venv`

### Model download fails
- Ensure you have ~1GB free disk space
- Check internet connection
- Try again - downloads resume from where they stopped

### No microphone input
- Grant microphone permission in System Settings → Privacy & Security → Microphone
- Restart the app after granting permission

### Transcription not working
- Ensure the model is downloaded and loaded (green checkmark in setup)
- Check that the correct audio input is selected

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

Built with [Parakeet ASR](https://huggingface.co/nvidia/parakeet-tdt-0.6b) and [MLX](https://github.com/ml-explore/mlx)
