interface LiveTranscriptProps {
  text: string
  isRecording: boolean
  isTranscribing: boolean
}

export default function LiveTranscript({ text, isRecording, isTranscribing }: LiveTranscriptProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Live Transcription
        </h3>
        {isTranscribing && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">Processing...</span>
          </div>
        )}
      </div>

      <div className="min-h-[120px] p-4 bg-gray-50 rounded-lg">
        {text ? (
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {text}
            {isRecording && (
              <span className="inline-block w-0.5 h-5 bg-primary-500 ml-0.5 animate-pulse" />
            )}
          </p>
        ) : (
          <p className="text-gray-400 italic">
            {isRecording
              ? 'Listening... Start speaking to see transcription.'
              : 'Transcribed text will appear here when you start recording.'}
          </p>
        )}
      </div>

      {text && !isRecording && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(text)}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  )
}
