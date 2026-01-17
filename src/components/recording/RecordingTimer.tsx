import { useRecordingStore } from '../../stores/recordingStore'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default function RecordingTimer() {
  const { duration } = useRecordingStore()

  return (
    <span className="text-xl font-mono text-gray-700 tabular-nums">
      {formatTime(duration)}
    </span>
  )
}
