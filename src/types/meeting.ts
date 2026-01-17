// Meeting status lifecycle
export type MeetingStatus =
  | 'scheduled'      // Future meeting, not yet started
  | 'in_progress'    // Currently recording/happening
  | 'completed'      // Finished with transcript
  | 'cancelled'      // Cancelled before happening

// Meeting source indicates origin
export type MeetingSource =
  | 'manual'         // Created by user in app
  | 'google_calendar' // Synced from Google Calendar
  | 'recording'      // Auto-created when recording starts

// Participant information (from calendar)
export interface Participant {
  email: string
  name?: string
  response_status?: 'accepted' | 'declined' | 'tentative' | 'needsAction'
}

// Action item extracted from meeting
export interface ActionItem {
  task: string
  assignee?: string | null
  due_date?: string
  completed?: boolean
}

// AI-generated summary structure
export interface MeetingSummary {
  overview: string
  key_points: string[]
  action_items: ActionItem[]
  generated_at: string
  model_used: string
}

// Calendar event linkage
export interface CalendarLink {
  provider: 'google'
  event_id: string
  calendar_id: string
  html_link?: string
  last_synced: string
}

// Transcription segment with timestamps
export interface TranscriptionSegment {
  text: string
  start: number
  end: number
}

// Core meeting metadata (lightweight for list views)
export interface MeetingMetadata {
  id: string
  title: string
  scheduled_at: string | null   // ISO timestamp, null for ad-hoc recordings
  ended_at: string | null       // When meeting ended
  created_at: string
  updated_at: string
  status: MeetingStatus
  source: MeetingSource
  duration: number              // Recording duration in seconds
  expected_duration?: number    // Expected duration in seconds (for auto-stop)
  auto_record?: boolean         // Whether to auto-start recording
  audio_source: 'microphone' | 'system' | 'both'
  word_count: number
  has_summary: boolean
  has_transcript: boolean
  participant_count?: number
  calendar_link?: CalendarLink
}

// Full meeting with all data
export interface Meeting extends MeetingMetadata {
  description?: string
  location?: string
  participants?: Participant[]
  transcription: {
    full_text: string
    segments: TranscriptionSegment[]
  } | null
  summary: MeetingSummary | null
  tags?: string[]
  notes?: string                // User's personal notes
}

// Request types for API
export interface CreateMeetingRequest {
  title: string
  scheduled_at?: string
  description?: string
  location?: string
  participants?: Participant[]
  source?: MeetingSource
}

export interface UpdateMeetingRequest {
  title?: string
  scheduled_at?: string
  description?: string
  status?: MeetingStatus
  notes?: string
  tags?: string[]
}

// Response for creating meeting from recording
export interface RecordingMeetingRequest {
  title: string
  transcription_text: string
  segments: TranscriptionSegment[]
  duration: number
  audio_source: 'microphone' | 'system' | 'both'
}
