export interface TranscriptionSegment {
  text: string
  start: number  // seconds
  end: number    // seconds
}

export interface NoteMetadata {
  id: string
  title: string
  created_at: string  // ISO 8601 timestamp
  updated_at: string  // ISO 8601 timestamp
  duration: number   // Recording duration in seconds
  audio_source: 'microphone' | 'system' | 'both'
  word_count: number
}

export interface Note extends NoteMetadata {
  transcription: {
    full_text: string
    segments: TranscriptionSegment[]
  }
  tags?: string[]
}

export interface CreateNoteRequest {
  title: string
  transcription: {
    full_text: string
    segments: TranscriptionSegment[]
  }
  duration: number
  audio_source: 'microphone' | 'system' | 'both'
}
