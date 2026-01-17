import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import RecordButton from './RecordButton'
import AudioVisualizer from './AudioVisualizer'
import AudioSourceSelector from './AudioSourceSelector'
import RecordingTimer from './RecordingTimer'
import LiveTranscript from '../transcription/LiveTranscript'
import { useAudioCapture } from '../../hooks/useAudioCapture'
import { useTranscription } from '../../hooks/useTranscription'
import { useRecordingStore } from '../../stores/recordingStore'
import { useAppStore } from '../../stores/appStore'

export default function RecordingPanel() {
  const navigate = useNavigate()
  const { backendStatus } = useAppStore()
  const {
    isRecording,
    audioSource,
    selectedMicId,
    liveTranscript,
    setIsRecording,
    setLiveTranscript,
    setDuration,
    reset
  } = useRecordingStore()

  const [isSaving, setIsSaving] = useState(false)
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const audioCapture = useAudioCapture()
  const transcription = useTranscription(backendStatus.port)

  const timerRef = useRef<number | null>(null)
  const sendAudioRef = useRef(transcription.sendAudioChunk)

  // Keep sendAudioRef updated
  useEffect(() => {
    sendAudioRef.current = transcription.sendAudioChunk
  }, [transcription.sendAudioChunk])

  // Update duration timer
  useEffect(() => {
    if (isRecording && recordingStartTime) {
      timerRef.current = window.setInterval(() => {
        setDuration((Date.now() - recordingStartTime) / 1000)
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
  }, [isRecording, recordingStartTime, setDuration])

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

  const handleStartRecording = async () => {
    try {
      setLocalError(null)
      reset()

      // Connect to transcription WebSocket
      await transcription.connect()

      // Start audio capture
      await audioCapture.startCapture({
        sampleRate: 16000,
        chunkDuration: 500,
        deviceId: selectedMicId || undefined
      })

      setIsRecording(true)
      setRecordingStartTime(Date.now())
    } catch (err) {
      console.error('Failed to start recording:', err)
      setLocalError(err instanceof Error ? err.message : 'Failed to start recording')
      transcription.disconnect()
    }
  }

  const handleStopRecording = async () => {
    setIsRecording(false)
    setIsSaving(true)

    try {
      // Stop audio capture
      audioCapture.stopCapture()

      // Get final transcription
      const result = await transcription.finalize()

      // Save the note
      if (result.text) {
        const response = await fetch(`http://localhost:${backendStatus.port}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Recording ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
            transcription_text: result.text,
            segments: result.segments,
            duration: recordingStartTime ? (Date.now() - recordingStartTime) / 1000 : 0,
            audio_source: audioSource
          })
        })

        if (response.ok) {
          const note = await response.json()
          navigate(`/notes/${note.id}`)
        }
      }
    } catch (err) {
      console.error('Failed to stop recording:', err)
    } finally {
      setIsSaving(false)
      transcription.disconnect()
      setRecordingStartTime(null)
    }
  }

  const canRecord = backendStatus.isRunning && backendStatus.modelLoaded

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Recording status */}
      <div className="text-center">
        {isRecording ? (
          <div className="flex items-center justify-center gap-3">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse-recording" />
            <span className="text-xl font-medium text-gray-800">Recording...</span>
            <RecordingTimer />
          </div>
        ) : (
          <h2 className="text-xl font-medium text-gray-600">
            {canRecord ? 'Ready to Record' : 'Waiting for Backend...'}
          </h2>
        )}
      </div>

      {/* Visualizer */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <AudioVisualizer
          audioLevel={audioCapture.audioLevel}
          isRecording={isRecording}
        />
      </div>

      {/* Record button */}
      <div className="flex justify-center">
        <RecordButton
          isRecording={isRecording}
          isLoading={isSaving}
          disabled={!canRecord}
          onStart={handleStartRecording}
          onStop={handleStopRecording}
        />
      </div>

      {/* Audio source selector */}
      {!isRecording && (
        <div className="flex justify-center">
          <AudioSourceSelector />
        </div>
      )}

      {/* Live transcription */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <LiveTranscript
          text={liveTranscript}
          isRecording={isRecording}
          isTranscribing={transcription.isTranscribing}
        />
      </div>

      {/* Error display */}
      {(audioCapture.error || transcription.error || localError) && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {audioCapture.error || transcription.error || localError}
        </div>
      )}
    </div>
  )
}
