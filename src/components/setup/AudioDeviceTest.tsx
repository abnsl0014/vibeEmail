import { useState, useEffect, useRef } from 'react'
import { useAudioDevices } from '../../hooks/useAudioDevices'
import { useAudioCapture } from '../../hooks/useAudioCapture'

interface AudioDeviceTestProps {
  onComplete: () => void
  onBack: () => void
}

export default function AudioDeviceTest({ onComplete, onBack }: AudioDeviceTestProps) {
  const { microphoneDevices, isLoading } = useAudioDevices()
  const audioCapture = useAudioCapture()

  const [selectedMicId, setSelectedMicId] = useState<string>('')
  const [isTesting, setIsTesting] = useState(false)
  const [micWorking, setMicWorking] = useState<boolean | null>(null)

  const testTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const peakLevelRef = useRef(0)

  useEffect(() => {
    return () => {
      if (testTimeoutRef.current) {
        clearTimeout(testTimeoutRef.current)
      }
      if (audioCapture.isCapturing) {
        audioCapture.stopCapture()
      }
    }
  }, [])

  // Track peak level during test
  useEffect(() => {
    if (isTesting && audioCapture.audioLevel > peakLevelRef.current) {
      peakLevelRef.current = audioCapture.audioLevel
    }
  }, [audioCapture.audioLevel, isTesting])

  const startTest = async () => {
    setIsTesting(true)
    setMicWorking(null)
    peakLevelRef.current = 0

    try {
      await audioCapture.startCapture({
        sampleRate: 16000,
        chunkDuration: 100,
        deviceId: selectedMicId || undefined
      })

      // Test for 3 seconds
      testTimeoutRef.current = setTimeout(() => {
        audioCapture.stopCapture()
        setIsTesting(false)

        // Check if we detected audio
        setMicWorking(peakLevelRef.current > 0.05)
      }, 3000)
    } catch {
      setIsTesting(false)
      setMicWorking(false)
    }
  }

  const stopTest = () => {
    if (testTimeoutRef.current) {
      clearTimeout(testTimeoutRef.current)
    }
    audioCapture.stopCapture()
    setIsTesting(false)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-4">🎤</div>
        <h2 className="text-2xl font-bold text-gray-800">Test Your Audio</h2>
        <p className="text-gray-600 mt-2">
          Let's make sure your microphone is working correctly.
        </p>
      </div>

      {/* Microphone selector */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Select Microphone
        </label>
        <select
          value={selectedMicId}
          onChange={(e) => setSelectedMicId(e.target.value)}
          disabled={isLoading || isTesting}
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Default Microphone</option>
          {microphoneDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </div>

      {/* Audio level visualization */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex items-center justify-center h-24">
          {isTesting ? (
            <div className="flex items-end gap-1 h-full">
              {Array.from({ length: 20 }).map((_, i) => {
                const barHeight = Math.random() * audioCapture.audioLevel * 100
                return (
                  <div
                    key={i}
                    className="w-3 bg-primary-500 rounded-t transition-all duration-75"
                    style={{ height: `${Math.max(4, barHeight)}%` }}
                  />
                )
              })}
            </div>
          ) : (
            <div className="text-gray-400">
              {micWorking === null
                ? 'Click "Test Microphone" to begin'
                : micWorking
                ? '✅ Microphone is working!'
                : '⚠️ No audio detected'}
            </div>
          )}
        </div>

        {isTesting && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Speak into your microphone...
          </p>
        )}
      </div>

      {/* Test button */}
      <div className="flex justify-center">
        {isTesting ? (
          <button
            onClick={stopTest}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Stop Test
          </button>
        ) : (
          <button
            onClick={startTest}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Test Microphone
          </button>
        )}
      </div>

      {/* Result message */}
      {micWorking === false && !isTesting && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <span className="text-yellow-600">⚠️</span>
            <div className="text-sm text-yellow-800">
              <p className="font-medium">No audio detected</p>
              <p className="mt-1">
                Make sure your microphone is connected and not muted. Try selecting a different microphone from the dropdown.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={onComplete}
          disabled={isTesting}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
