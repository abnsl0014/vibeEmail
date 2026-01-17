import { useState, useRef, useCallback, useEffect } from 'react'
import { AudioChunk } from '../types/audio'

interface AudioCaptureConfig {
  sampleRate?: number
  chunkDuration?: number // ms
  deviceId?: string
}

interface UseAudioCaptureReturn {
  isCapturing: boolean
  audioLevel: number
  startCapture: (config?: AudioCaptureConfig) => Promise<void>
  stopCapture: () => Float32Array | null
  onChunk: (callback: (chunk: AudioChunk) => void) => void
  error: string | null
}

export function useAudioCapture(): UseAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const chunksRef = useRef<Float32Array[]>([])
  const chunkCallbackRef = useRef<((chunk: AudioChunk) => void) | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const startCapture = useCallback(async (config: AudioCaptureConfig = {}) => {
    const { sampleRate = 16000, deviceId } = config

    try {
      setError(null)

      // Request microphone access
      const constraints: MediaStreamConstraints = {
        audio: {
          sampleRate: { ideal: sampleRate },
          channelCount: { exact: 1 },
          echoCancellation: true,
          noiseSuppression: true,
          ...(deviceId && { deviceId: { exact: deviceId } })
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      mediaStreamRef.current = stream

      // Create AudioContext
      const audioContext = new AudioContext({ sampleRate })
      audioContextRef.current = audioContext

      // Load the AudioWorklet module
      await audioContext.audioWorklet.addModule('/recorder.worklet.js')

      // Create source
      const source = audioContext.createMediaStreamSource(stream)

      // Create analyser for level metering
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser

      // Create AudioWorkletNode
      const workletNode = new AudioWorkletNode(audioContext, 'recorder.worklet')
      workletNodeRef.current = workletNode

      // Handle messages from the worklet
      workletNode.port.onmessage = (event) => {
        if (event.data.eventType === 'data') {
          const chunk = event.data.audioBuffer as Float32Array
          chunksRef.current.push(chunk)

          if (chunkCallbackRef.current) {
            chunkCallbackRef.current({
              data: chunk,
              timestamp: Date.now()
            })
          }
        }
      }

      // Connect nodes
      source.connect(analyser)
      source.connect(workletNode)
      workletNode.connect(audioContext.destination)

      // Start level metering
      const updateLevel = () => {
        if (!analyserRef.current) return

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)

        // Calculate average level
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setAudioLevel(average / 255)

        animationFrameRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()

      setIsCapturing(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start capture'
      setError(message)
      throw err
    }
  }, [])

  const stopCapture = useCallback((): Float32Array | null => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    // Disconnect worklet node
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null

    // Combine all chunks
    const allChunks = chunksRef.current
    chunksRef.current = []

    if (allChunks.length === 0) {
      setIsCapturing(false)
      setAudioLevel(0)
      return null
    }

    const totalLength = allChunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const combined = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of allChunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }

    setIsCapturing(false)
    setAudioLevel(0)

    return combined
  }, [])

  const onChunk = useCallback((callback: (chunk: AudioChunk) => void) => {
    chunkCallbackRef.current = callback
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isCapturing) {
        stopCapture()
      }
    }
  }, [isCapturing, stopCapture])

  return {
    isCapturing,
    audioLevel,
    startCapture,
    stopCapture,
    onChunk,
    error
  }
}
