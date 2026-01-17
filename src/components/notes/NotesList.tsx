import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import NoteCard from './NoteCard'
import { useNotesStore } from '../../stores/notesStore'
import { useAppStore } from '../../stores/appStore'

export default function NotesList() {
  const { backendStatus } = useAppStore()
  const { notes, setNotes, searchQuery, setSearchQuery, isLoading, setIsLoading, error, setError } = useNotesStore()

  useEffect(() => {
    const fetchNotes = async () => {
      if (!backendStatus.isRunning) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`http://localhost:${backendStatus.port}/notes`)
        if (response.ok) {
          const data = await response.json()
          setNotes(data.notes)
        } else {
          setError('Failed to fetch notes')
        }
      } catch (err) {
        setError('Failed to connect to backend')
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotes()
  }, [backendStatus.isRunning, backendStatus.port, setNotes, setIsLoading, setError])

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Notes</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-64 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Notes list */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-medium text-gray-600 mb-2">
            {notes.length === 0 ? 'No notes yet' : 'No matching notes'}
          </h3>
          <p className="text-gray-500 mb-6">
            {notes.length === 0
              ? 'Start recording to create your first note.'
              : 'Try adjusting your search query.'}
          </p>
          {notes.length === 0 && (
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <span>🎙️</span>
              <span>Start Recording</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  )
}
