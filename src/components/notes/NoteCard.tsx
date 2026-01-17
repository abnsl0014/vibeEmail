import { Link } from 'react-router-dom'
import { NoteMetadata } from '../../types/note'
import { format } from 'date-fns'

interface NoteCardProps {
  note: NoteMetadata
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

function getSourceIcon(source: string): string {
  switch (source) {
    case 'microphone':
      return '🎤'
    case 'system':
      return '🔊'
    case 'both':
      return '🎙️'
    default:
      return '🎤'
  }
}

export default function NoteCard({ note }: NoteCardProps) {
  return (
    <Link
      to={`/notes/${note.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-800 truncate">
            {note.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {format(new Date(note.created_at), 'MMM d, yyyy \'at\' h:mm a')}
          </p>
        </div>
        <span className="text-2xl">{getSourceIcon(note.audio_source)}</span>
      </div>

      <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatDuration(note.duration)}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {note.word_count.toLocaleString()} words
        </span>
      </div>
    </Link>
  )
}
