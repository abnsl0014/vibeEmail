interface RecordButtonProps {
  isRecording: boolean
  isLoading: boolean
  disabled: boolean
  onStart: () => void
  onStop: () => void
}

export default function RecordButton({
  isRecording,
  isLoading,
  disabled,
  onStart,
  onStop
}: RecordButtonProps) {
  if (isLoading) {
    return (
      <button
        disabled
        className="flex items-center gap-3 px-8 py-4 bg-gray-400 text-white rounded-full cursor-not-allowed"
      >
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <span className="text-lg font-medium">Saving...</span>
      </button>
    )
  }

  if (isRecording) {
    return (
      <button
        onClick={onStop}
        className="flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors shadow-lg hover:shadow-xl"
      >
        <svg
          className="w-6 h-6"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
        <span className="text-lg font-medium">Stop Recording</span>
      </button>
    )
  }

  return (
    <button
      onClick={onStart}
      disabled={disabled}
      className={`flex items-center gap-3 px-8 py-4 rounded-full transition-colors shadow-lg hover:shadow-xl ${
        disabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-primary-600 hover:bg-primary-700 text-white'
      }`}
    >
      <svg
        className="w-6 h-6"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="6" />
      </svg>
      <span className="text-lg font-medium">Start Recording</span>
    </button>
  )
}
