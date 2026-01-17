import { createContext, useContext, useEffect, useRef, useCallback, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { useTranscription } from '../hooks/useTranscription'
import { useRecordingStore } from '../stores/recordingStore'
import { useAppStore } from '../stores/appStore'
import { MeetingMetadata } from '../types/meeting'

interface RecordingContextValue {
  startRecording: (meeting?: MeetingMetadata) => Promise<void>
  stopRecording: () => Promise<void>
  audioLevel: number
  error: string | null
  isTranscribing: boolean
}

const RecordingContext = createContext<RecordingContextValue | null>(null)

export function useRecordingContext() {
  const context = useContext(RecordingContext)
  if (!context) {
    throw new Error('useRecordingContext must be used within a RecordingProvider')
  }
  return context
}

interface RecordingProviderProps {
  children: ReactNode
}

export function RecordingProvider({ children }: RecordingProviderProps) {
  const navigate = useNavigate()
  const { backendStatus } = useAppStore()
  const {
    isRecording,
    audioSource,
    selectedMicId,
    currentMeetingId,
    currentMeetingTitle,
    pendingMeeting,
    stopRequested,
    setIsRecording,
    setLiveTranscript,
    setDuration,
    setCurrentMeeting,
    setPendingMeeting,
    clearStopRequest,
    reset
  } = useRecordingStore()

  const audioCapture = useAudioCapture()
  const transcription = useTranscription(backendStatus.port)

  const recordingStartTimeRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)
  const autoStopTimerRef = useRef<number | null>(null)
  const sendAudioRef = useRef(transcription.sendAudioChunk)
  const isSavingRef = useRef(false)

  // Keep sendAudioRef updated
  useEffect(() => {
    sendAudioRef.current = transcription.sendAudioChunk
  }, [transcription.sendAudioChunk])

  // Update duration timer
  useEffect(() => {
    if (isRecording && recordingStartTimeRef.current) {
      timerRef.current = window.setInterval(() => {
        if (recordingStartTimeRef.current) {
          setDuration((Date.now() - recordingStartTimeRef.current) / 1000)
        }
      }, 100)
    } else {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
    }
  }, [isRecording, setDuration])

  // Update live transcript
  useEffect(() => {
    if (transcription.liveText) {
      setLiveTranscript(transcription.liveText)
    }
  }, [transcription.liveText, setLiveTranscript])

  // Handle audio chunk callback
  const handleAudioChunk = useCallback((chunk: { data: Float32Array; timestamp: number }) => {
    if (sendAudioRef.current) {
      sendAudioRef.current(chunk.data)
    }
  }, [])

  // Register chunk handler
  useEffect(() => {
    audioCapture.onChunk(handleAudioChunk)
  }, [audioCapture.onChunk, handleAudioChunk])

  // Start recording function
  const startRecording = useCallback(async (meeting?: MeetingMetadata) => {
    try {
      reset()

      // Set meeting context if recording for a scheduled meeting
      if (meeting) {
        setCurrentMeeting(meeting.id, meeting.title)
      } else {
        setCurrentMeeting(null, null)
      }

      // Connect to transcription WebSocket
      await transcription.connect()

      // Start audio capture
      await audioCapture.startCapture({
        sampleRate: 16000,
        chunkDuration: 500,
        deviceId: selectedMicId || undefined
      })

      setIsRecording(true)
      recordingStartTimeRef.current = Date.now()

      // Set auto-stop timer if recording for a scheduled meeting with expected duration
      if (meeting?.expected_duration && meeting.expected_duration > 0) {
        console.log(`Setting auto-stop timer for ${meeting.expected_duration}s`)
        autoStopTimerRef.current = window.setTimeout(() => {
          console.log('Auto-stop timer triggered')
          stopRecordingInternal(meeting.id)
        }, meeting.expected_duration * 1000)
      }
    } catch (err) {
      console.error('Failed to start recording:', err)
      transcription.disconnect()
      setCurrentMeeting(null, null)
    }
  }, [reset, transcription, audioCapture, selectedMicId, setIsRecording, setCurrentMeeting])

  // Internal stop recording function
  const stopRecordingInternal = useCallback(async (meetingIdOverride?: string) => {
    if (isSavingRef.current) return
    isSavingRef.current = true

    const meetingId = meetingIdOverride || currentMeetingId
    const meetingTitle = currentMeetingTitle

    // Clear auto-stop timer
    if (autoStopTimerRef.current) {
      window.clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = null
    }

    setIsRecording(false)

    try {
      // Stop audio capture
      audioCapture.stopCapture()

      // Get final transcription
      const result = await transcription.finalize()

      if (result.text) {
        const duration = recordingStartTimeRef.current
          ? (Date.now() - recordingStartTimeRef.current) / 1000
          : 0

        if (meetingId) {
          // Complete the existing meeting with recording data
          const response = await fetch(
            `http://localhost:${backendStatus.port}/meetings/${meetingId}/complete`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: meetingTitle || `Recording ${new Date().toLocaleDateString()}`,
                transcription_text: result.text,
                segments: result.segments,
                duration,
                audio_source: audioSource
              })
            }
          )

          if (response.ok) {
            navigate(`/meetings/${meetingId}`)
          }
        } else {
          // Create a new ad-hoc meeting from recording
          const response = await fetch(
            `http://localhost:${backendStatus.port}/meetings/from-recording`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: `Recording ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
                transcription_text: result.text,
                segments: result.segments,
                duration,
                audio_source: audioSource
              })
            }
          )

          if (response.ok) {
            const meeting = await response.json()
            navigate(`/meetings/${meeting.id}`)
          }
        }
      }
    } catch (err) {
      console.error('Failed to stop recording:', err)
    } finally {
      isSavingRef.current = false
      transcription.disconnect()
      recordingStartTimeRef.current = null
      setCurrentMeeting(null, null)
    }
  }, [currentMeetingId, currentMeetingTitle, audioCapture, transcription, backendStatus.port, audioSource, setIsRecording, setCurrentMeeting, navigate])

  // Public stop recording function
  const stopRecording = useCallback(async () => {
    await stopRecordingInternal()
  }, [stopRecordingInternal])

  // Handle pending meeting - auto-start recording
  useEffect(() => {
    if (pendingMeeting && !isRecording && backendStatus.isRunning && backendStatus.modelLoaded) {
      console.log('Starting recording for pending meeting:', pendingMeeting.title)
      const meeting = pendingMeeting
      setPendingMeeting(null)
      startRecording(meeting)
    }
  }, [pendingMeeting, isRecording, backendStatus.isRunning, backendStatus.modelLoaded, startRecording, setPendingMeeting])

  // Listen for stop requests from store
  useEffect(() => {
    if (stopRequested && isRecording) {
      clearStopRequest()
      stopRecording()
    }
  }, [stopRequested, isRecording, clearStopRequest, stopRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
      if (autoStopTimerRef.current) {
        window.clearTimeout(autoStopTimerRef.current)
      }
    }
  }, [])

  const value: RecordingContextValue = {
    startRecording,
    stopRecording,
    audioLevel: audioCapture.audioLevel,
    error: audioCapture.error || transcription.error || null,
    isTranscribing: transcription.isTranscribing
  }

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  )
}
