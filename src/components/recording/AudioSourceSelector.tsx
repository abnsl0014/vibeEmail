import { useAudioDevices } from '../../hooks/useAudioDevices'
import { useRecordingStore } from '../../stores/recordingStore'

export default function AudioSourceSelector() {
  const { microphoneDevices, isLoading } = useAudioDevices()
  const { audioSource, selectedMicId, setAudioSource, setSelectedMicId } = useRecordingStore()

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      {/* Source type toggle */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setAudioSource('microphone')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            audioSource === 'microphone'
              ? 'bg-white shadow text-primary-700'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <span>🎤</span>
          <span className="text-sm font-medium">Mic</span>
        </button>
        <button
          onClick={() => setAudioSource('system')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            audioSource === 'system'
              ? 'bg-white shadow text-primary-700'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <span>🔊</span>
          <span className="text-sm font-medium">System</span>
        </button>
        <button
          onClick={() => setAudioSource('both')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            audioSource === 'both'
              ? 'bg-white shadow text-primary-700'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <span>🎙️</span>
          <span className="text-sm font-medium">Both</span>
        </button>
      </div>

      {/* Device selector */}
      {(audioSource === 'microphone' || audioSource === 'both') && (
        <select
          value={selectedMicId || ''}
          onChange={(e) => setSelectedMicId(e.target.value || null)}
          disabled={isLoading}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Default Microphone</option>
          {microphoneDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      )}

      {audioSource === 'system' && (
        <p className="text-sm text-gray-500">
          Requires BlackHole virtual audio driver
        </p>
      )}
    </div>
  )
}
