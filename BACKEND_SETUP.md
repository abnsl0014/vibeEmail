# Voice Notes Backend Setup Guide

This document explains how to set up the cloud backend for the Voice Notes Electron app using **Render** (hosting) and **Supabase** (PostgreSQL database).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│           Voice Notes Electron App                       │
│   - Records audio, transcribes locally                   │
│   - Saves to cloud backend after recording               │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────┐
│           Render Backend (Python FastAPI)                │
│   - POST /api/transcripts - Save new transcript          │
│   - GET /api/transcripts - List all transcripts          │
│   - GET /api/transcripts/{id} - Get single transcript    │
└────────────────────┬────────────────────────────────────┘
                     │ PostgreSQL connection
┌────────────────────▼────────────────────────────────────┐
│           Supabase (PostgreSQL Database)                 │
│   - transcripts table                                    │
│   - Managed PostgreSQL hosting                           │
└─────────────────────────────────────────────────────────┘
```

---

## Part 1: Supabase Database Setup

### Step 1: Create Supabase Account & Project

1. Go to https://supabase.com
2. Sign up with GitHub/email
3. Click **"New Project"**:
   - **Name**: `voice-notes-db`
   - **Database password**: (save this securely - you'll need it!)
   - **Region**: Choose closest to you
4. Wait for project provisioning (~2 minutes)

### Step 2: Get Database Connection String

1. Go to **Project Settings → Database**
2. Scroll to **Connection string** section
3. Select **URI** tab
4. Copy the connection string:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual database password

### Step 3: Create Transcripts Table

1. Go to **SQL Editor** in Supabase dashboard
2. Run this query:

```sql
-- Create transcripts table
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  full_text TEXT NOT NULL,
  segments JSONB DEFAULT '[]',
  duration REAL NOT NULL DEFAULT 0,
  audio_source TEXT NOT NULL DEFAULT 'microphone',
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_transcripts_created_at ON transcripts(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transcripts_updated_at
  BEFORE UPDATE ON transcripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Part 2: Deploy Backend to Render

### Step 1: Push to GitHub

1. Create a new GitHub repository (e.g., `voice-notes-api`)
2. Push the `render-backend/` folder contents to it:

```bash
cd render-backend
git init
git add .
git commit -m "Initial backend setup"
git remote add origin https://github.com/YOUR_USERNAME/voice-notes-api.git
git push -u origin main
```

### Step 2: Create Render Account & Deploy

1. Go to https://render.com
2. Sign up with GitHub
3. Click **New → Web Service**
4. Connect your GitHub repository
5. Configure:
   - **Name**: `voice-notes-api`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add Environment Variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Your Supabase connection string from Part 1
7. Click **Create Web Service**

### Step 3: Get Your API URL

After deployment, Render provides a URL like:
```
https://granolaclonebackend.onrender.com
```

---

## Part 3: Connect Electron App to Cloud Backend

### Step 1: Create Environment File

Create `backend/.env` file:

```bash
cp backend/.env.example backend/.env
```

### Step 2: Configure the URL

Edit `backend/.env`:

```
RENDER_API_URL=https://voice-notes-api.onrender.com
```

### Step 3: Restart the App

```bash
npm run dev
```

Now every recording will automatically sync to Supabase via your Render backend!

---

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check - returns `{"status": "ok"}` |
| GET | `/health` | Health status |
| POST | `/api/transcripts` | Create new transcript |
| GET | `/api/transcripts` | List all transcripts (supports `?limit=` and `?offset=`) |
| GET | `/api/transcripts/{id}` | Get single transcript by UUID |
| DELETE | `/api/transcripts/{id}` | Delete transcript |

### Example API Calls

**Create a transcript:**
```bash
curl -X POST https://granolaclonebackend.onrender.com/api/transcripts \
  -H "Content-Type: application/json" \
  -d '{"title": "Meeting Notes", "full_text": "Hello world", "duration": 120}'
```

**List all transcripts:**
```bash
curl https://granolaclonebackend.onrender.com/api/transcripts
```

**Get single transcript:**
```bash
curl https://granolaclonebackend.onrender.com/api/transcripts/UUID-HERE
```

**List with pagination:**
```bash
curl "https://granolaclonebackend.onrender.com/api/transcripts?limit=10&offset=0"
```

---

## Project Structure

```
voice-notes-app/
├── render-backend/           # Cloud backend (deploy to Render)
│   ├── main.py               # FastAPI application
│   ├── requirements.txt      # Python dependencies
│   ├── render.yaml           # Render deployment config
│   └── .env.example          # Environment template
│
├── backend/                  # Local Python backend (transcription)
│   ├── main.py               # FastAPI entry (loads .env)
│   ├── services/
│   │   └── notes_service.py  # Saves locally + syncs to cloud
│   ├── requirements.txt      # Includes aiohttp for cloud sync
│   └── .env                  # RENDER_API_URL config
│
└── electron-app/             # Electron frontend
```

---

## Data Flow

```
Recording Stops
    ↓
handleStopRecording() in RecordingPanel.tsx
    ↓
POST /notes to local Python backend (localhost:8765)
    ↓
notes_service.create_note()
    ├── Save to ~/VoiceNotes/notes/{id}.json (local)
    └── POST to Render backend → Supabase (cloud)
    ↓
External apps can GET transcripts via Render API
```

---

## Verification Checklist

- [ ] Supabase project created
- [ ] `transcripts` table exists with correct columns
- [ ] Render service deployed and running
- [ ] `DATABASE_URL` environment variable set in Render
- [ ] API health check returns `{"status": "ok"}`
- [ ] `backend/.env` file created with `RENDER_API_URL`
- [ ] Test recording syncs to Supabase (check Table Editor)

---

## Troubleshooting

### Backend won't start on Render
- Check that `DATABASE_URL` is correctly set
- Verify Supabase connection string has the correct password

### Cloud sync not working
- Check `backend/.env` has `RENDER_API_URL` set
- Look at Python backend logs for "Cloud sync failed" messages
- Verify Render service is running (not sleeping on free tier)

### Database connection errors
- Supabase may block connections from certain IPs
- Go to Supabase → Project Settings → Database → Connection Pooling
- Use the "Pooler" connection string if direct connection fails

---

## Security Notes

- The Render backend is publicly accessible (no auth)
- For production, consider adding:
  - API key authentication
  - Rate limiting
  - User authentication with Supabase Auth
- Never commit `.env` files to git
