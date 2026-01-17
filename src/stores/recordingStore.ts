import { create } from 'zustand'
import { AudioSource, RecordingState } from '../types/audio'
import { TranscriptionSegment } from '../types/note'

interface RecordingStoreState extends RecordingState {
  audioSource: AudioSource
  selectedMicId: string | null
  selectedSystemAudioId: string | null
  liveTranscript: string
  segments: TranscriptionSegment[]

  setIsRecording: (recording: boolean) => void
  setIsPaused: (paused: boolean) => void
  setDuration: (duration: number) => void
  setAudioLevel: (level: number) => void
  setAudioSource: (source: AudioSource) => void
  setSelectedMicId: (id: string | null) => void
  setSelectedSystemAudioId: (id: string | null) => void
  setLiveTranscript: (text: string) => void
  addSegment: (segment: TranscriptionSegment) => void
  clearSegments: () => void
  reset: () => void
}

const initialState = {
  isRecording: false,
  isPaused: false,
  duration: 0,
  audioLevel: 0,
  audioSource: 'microphone' as AudioSource,
  selectedMicId: null,
  selectedSystemAudioId: null,
  liveTranscript: '',
  segments: [] as TranscriptionSegment[]
}

export const useRecordingStore = create<RecordingStoreState>((set) => ({
  ...initialState,

  setIsRecording: (recording) => set({ isRecording: recording }),
  setIsPaused: (paused) => set({ isPaused: paused }),
  setDuration: (duration) => set({ duration }),
  setAudioLevel: (level) => set({ audioLevel: level }),
  setAudioSource: (source) => set({ audioSource: source }),
  setSelectedMicId: (id) => set({ selectedMicId: id }),
  setSelectedSystemAudioId: (id) => set({ selectedSystemAudioId: id }),
  setLiveTranscript: (text) => set({ liveTranscript: text }),
  addSegment: (segment) => set((state) => ({
    segments: [...state.segments, segment]
  })),
  clearSegments: () => set({ segments: [], liveTranscript: '' }),
  reset: () => set(initialState)
}))
