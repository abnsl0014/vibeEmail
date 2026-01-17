import { useState, useRef, useCallback } from 'react'
import { TranscriptionSegment } from '../types/note'

interface UseTranscriptionReturn {
  isConnected: boolean
  isTranscribing: boolean
  liveText: string
  segments: TranscriptionSegment[]
  connect: () => Promise<void>
  disconnect: () => void
  sendAudioChunk: (audioData: Float32Array) => void
  finalize: () => Promise<{ text: string; segments: TranscriptionSegment[] }>
  error: string | null
}

export function useTranscription(port: number = 8765): UseTranscriptionReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [liveText, setLiveText] = useState('')
  const [segments, setSegments] = useState<TranscriptionSegment[]>([])
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const finalizeResolveRef = useRef<((result: { text: string; segments: TranscriptionSegment[] }) => void) | null>(null)

  const connect = useCallback(async () => {
    return new Promise<void>((resolve, reject) => {
      try {
        const ws = new WebSocket(`ws://localhost:${port}/ws/transcribe`)
        wsRef.current = ws

        ws.onopen = () => {
          setIsConnected(true)
          setError(null)
          resolve()
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            if (data.error) {
              setError(data.error)
              return
            }

            if (data.is_final) {
              // Final transcription received
              const result = {
                text: data.text || '',
                segments: (data.segments || []).map((s: { text: string; start: number; end: number }) => ({
                  text: s.text,
                  start: s.start,
                  end: s.end
                }))
              }

              setSegments(result.segments)
              setIsTranscribing(false)

              if (finalizeResolveRef.current) {
                finalizeResolveRef.current(result)
                finalizeResolveRef.current = null
              }
            } else {
              // Partial transcription
              setLiveText(data.text || '')
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e)
          }
        }

        ws.onerror = (event) => {
          console.error('WebSocket error:', event)
          setError('WebSocket connection error')
          reject(new Error('WebSocket connection error'))
        }

        ws.onclose = () => {
          setIsConnected(false)
          setIsTranscribing(false)
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to connect'
        setError(message)
        reject(e)
      }
    })
  }, [port])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setIsTranscribing(false)
    setLiveText('')
    setSegments([])
  }, [])

  const sendAudioChunk = useCallback((audioData: Float32Array) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    setIsTranscribing(true)

    // Convert Float32Array to base64
    const bytes = new Uint8Array(audioData.buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)

    wsRef.current.send(JSON.stringify({
      type: 'audio',
      audio: base64,
      sample_rate: 16000
    }))
  }, [])

  const finalize = useCallback(async (): Promise<{ text: string; segments: TranscriptionSegment[] }> => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'))
        return
      }

      finalizeResolveRef.current = resolve

      wsRef.current.send(JSON.stringify({
        type: 'stop'
      }))

      // Timeout after 30 seconds
      setTimeout(() => {
        if (finalizeResolveRef.current) {
          finalizeResolveRef.current = null
          reject(new Error('Transcription timeout'))
        }
      }, 30000)
    })
  }, [])

  return {
    isConnected,
    isTranscribing,
    liveText,
    segments,
    connect,
    disconnect,
    sendAudioChunk,
    finalize,
    error
  }
}
