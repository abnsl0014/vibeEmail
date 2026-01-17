import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'
import { Note } from '../../types/note'
import { format } from 'date-fns'

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins === 0) return `${secs} seconds`
  return `${mins} min ${secs} sec`
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default function NoteViewer() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { backendStatus } = useAppStore()

  const [note, setNote] = useState<Note | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    const fetchNote = async () => {
      if (!backendStatus.isRunning || !id) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`http://localhost:${backendStatus.port}/notes/${id}`)
        if (response.ok) {
          const data = await response.json()
          setNote(data)
        } else if (response.status === 404) {
          setError('Note not found')
        } else {
          setError('Failed to fetch note')
        }
      } catch {
        setError('Failed to connect to backend')
      } finally {
        setIsLoading(false)
      }
    }

    fetchNote()
  }, [backendStatus.isRunning, backendStatus.port, id])

  const handleDelete = async () => {
    if (!id) return

    setIsDeleting(true)
    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/notes/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        navigate('/notes')
      } else {
        setError('Failed to delete note')
      }
    } catch {
      setError('Failed to connect to backend')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleCopy = () => {
    if (note) {
      navigator.clipboard.writeText(note.transcription.full_text)
    }
  }

  const handleExport = async () => {
    if (!note || !window.electronAPI) return

    const filePath = await window.electronAPI.showSaveDialog({
      title: 'Export Note',
      defaultPath: `${note.title.replace(/[^a-z0-9]/gi, '_')}.txt`,
      filters: [{ name: 'Text Files', extensions: ['txt'] }]
    })

    if (filePath) {
      // In a real app, we'd write to the file
      // For now, just copy to clipboard
      navigator.clipboard.writeText(note.transcription.full_text)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
        </div>
        <Link
          to="/notes"
          className="mt-4 inline-flex items-center text-primary-600 hover:text-primary-700"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Notes
        </Link>
      </div>
    )
  }

  if (!note) return null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/notes"
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Copy
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Export
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Note content */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Title */}
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-800">{note.title}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
            <span>
              {format(new Date(note.created_at), 'MMMM d, yyyy \'at\' h:mm a')}
            </span>
            <span>|</span>
            <span>{formatDuration(note.duration)}</span>
            <span>|</span>
            <span>{note.word_count.toLocaleString()} words</span>
          </div>
        </div>

        {/* Transcription */}
        <div className="p-6">
          {note.transcription.segments && note.transcription.segments.length > 0 ? (
            <div className="space-y-4">
              {note.transcription.segments.map((segment, index) => (
                <div key={index} className="flex gap-4">
                  <span className="text-xs text-gray-400 font-mono w-12 pt-1 flex-shrink-0">
                    [{formatTimestamp(segment.start)}]
                  </span>
                  <p className="text-gray-700 leading-relaxed">{segment.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {note.transcription.full_text}
            </p>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800">Delete Note?</h3>
            <p className="text-gray-600 mt-2">
              This action cannot be undone. The note will be permanently deleted.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
