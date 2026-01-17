export interface HealthResponse {
  status: 'ok'
  model_loaded: boolean
  model_name: string
}

export interface ModelStatusResponse {
  is_downloaded: boolean
  is_loaded: boolean
  model_name: string
  model_size_mb: number
}

export interface DownloadProgressResponse {
  downloaded_bytes: number
  total_bytes: number
  percent: number
  speed_mbps: number
  eta_seconds: number
}

export interface TranscriptionResponse {
  text: string
  segments: Array<{
    text: string
    start: number
    end: number
  }>
  is_final: boolean
}

export interface WebSocketMessage {
  type: 'audio' | 'stop' | 'error'
  audio?: string  // base64 encoded
  sample_rate?: number
  error?: string
}

export interface BackendStatus {
  isRunning: boolean
  modelLoaded: boolean
  port: number
}
