import axios from 'axios'

const API_BASE = 'http://localhost:8765'

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Health check
export async function checkHealth() {
  const response = await api.get('/health')
  return response.data
}

// Model endpoints
export async function getModelStatus() {
  const response = await api.get('/model/status')
  return response.data
}

export async function loadModel() {
  const response = await api.post('/model/load')
  return response.data
}

// Notes endpoints
export async function listNotes() {
  const response = await api.get('/notes')
  return response.data.notes
}

export async function getNote(id: string) {
  const response = await api.get(`/notes/${id}`)
  return response.data
}

export async function createNote(data: {
  title: string
  transcription_text: string
  segments: Array<{ text: string; start: number; end: number }>
  duration: number
  audio_source: string
}) {
  const response = await api.post('/notes', data)
  return response.data
}

export async function deleteNote(id: string) {
  const response = await api.delete(`/notes/${id}`)
  return response.data
}

export async function updateNote(id: string, data: { title?: string }) {
  const response = await api.put(`/notes/${id}`, null, { params: data })
  return response.data
}

// Transcription
export async function transcribeAudio(audioBase64: string, sampleRate: number = 16000) {
  const response = await api.post('/transcribe', {
    audio_base64: audioBase64,
    sample_rate: sampleRate
  })
  return response.data
}
