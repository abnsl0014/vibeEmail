import { useState } from 'react'
import RecordButton from './RecordButton'
import AudioVisualizer from './AudioVisualizer'
import AudioSourceSelector from './AudioSourceSelector'
import RecordingTimer from './RecordingTimer'
import LiveTranscript from '../transcription/LiveTranscript'
import { useRecordingContext } from '../../contexts/RecordingContext'
import { useRecordingStore } from '../../stores/recordingStore'
import { useAppStore } from '../../stores/appStore'

export default function RecordingPanel() {
  const { backendStatus } = useAppStore()
  const {
    isRecording,
    liveTranscript,
    currentMeetingTitle,
  } = useRecordingStore()

  const { startRecording, stopRecording, audioLevel, error, isTranscribing } = useRecordingContext()

  const [isSaving, setIsSaving] = useState(false)

  const handleStartRecording = async () => {
    await startRecording()
  }

  const handleStopRecording = async () => {
    setIsSaving(true)
    try {
      await stopRecording()
    } finally {
      setIsSaving(false)
    }
  }

  const canRecord = backendStatus.isRunning && backendStatus.modelLoaded

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Recording status */}
      <div className="text-center">
        {isRecording ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-3">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse-recording" />
              <span className="text-xl font-medium text-gray-800">Recording...</span>
              <RecordingTimer />
            </div>
            {currentMeetingTitle && (
              <p className="text-sm text-gray-500">
                Meeting: {currentMeetingTitle}
              </p>
            )}
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
          audioLevel={audioLevel}
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
          isTranscribing={isTranscribing}
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}
    </div>
  )
}
