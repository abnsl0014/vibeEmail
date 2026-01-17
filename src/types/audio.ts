export interface AudioDevice {
  deviceId: string
  label: string
  kind: 'audioinput' | 'audiooutput'
}

export interface AudioCaptureConfig {
  sampleRate: number
  chunkDuration: number  // ms
  deviceId?: string
}

export interface AudioChunk {
  data: Float32Array
  timestamp: number
}

export type AudioSource = 'microphone' | 'system' | 'both'

export interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number  // seconds
  audioLevel: number  // 0-1
}
