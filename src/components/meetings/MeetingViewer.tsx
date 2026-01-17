import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useAppStore } from '../../stores/appStore'
import { useMeetingsStore } from '../../stores/meetingsStore'
import { useRecordingStore } from '../../stores/recordingStore'
import { useRecordingContext } from '../../contexts/RecordingContext'
import { Meeting } from '../../types/meeting'

type TabType = 'summary' | 'transcript' | 'notes'

export default function MeetingViewer() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { backendStatus } = useAppStore()
  const { setSelectedMeeting, removeMeeting } = useMeetingsStore()
  const { currentMeetingId, liveTranscript, isRecording } = useRecordingStore()
  const { stopRecording } = useRecordingContext()

  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('summary')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [userNotes, setUserNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  // Check if this meeting is currently being recorded
  const isCurrentlyRecording = isRecording && currentMeetingId === id

  // Fetch meeting data
  useEffect(() => {
    const fetchMeeting = async () => {
      if (!backendStatus.isRunning || !id) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `http://localhost:${backendStatus.port}/meetings/${id}`
        )

        if (!response.ok) {
          if (response.status === 404) {
            setError('Meeting not found')
          } else {
            throw new Error('Failed to load meeting')
          }
          return
        }

        const data = await response.json()
        setMeeting(data)
        setSelectedMeeting(data)
        setUserNotes(data.notes || '')

        // Default to transcript tab if no summary exists
        if (!data.summary && data.transcription) {
          setActiveTab('transcript')
        }
      } catch (err) {
        setError('Failed to load meeting')
        console.error('Error fetching meeting:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMeeting()
  }, [id, backendStatus.isRunning, backendStatus.port, setSelectedMeeting])

  // Handle delete
  const handleDelete = async () => {
    if (!id) return

    setIsDeleting(true)
    try {
      const response = await fetch(
        `http://localhost:${backendStatus.port}/meetings/${id}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        removeMeeting(id)
        navigate('/meetings')
      }
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  // Handle generate summary
  const handleGenerateSummary = async () => {
    if (!id || !meeting?.transcription) return

    setIsGeneratingSummary(true)
    setSummaryError(null)

    console.log('Starting summary generation for meeting:', id)

    try {
      const response = await fetch(
        `http://localhost:${backendStatus.port}/meetings/${id}/summary`,
        { method: 'POST' }
      )

      console.log('Summary response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Summary generated successfully:', result)

        // Refresh meeting data
        const refreshResponse = await fetch(
          `http://localhost:${backendStatus.port}/meetings/${id}`
        )
        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          setMeeting(data)
          setActiveTab('summary')
        }
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        console.error('Summary generation failed:', errorData)
        setSummaryError(errorData.detail || `Failed with status ${response.status}`)
      }
    } catch (err) {
      console.error('Summary generation error:', err)
      setSummaryError(err instanceof Error ? err.message : 'Failed to connect to backend')
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  // Handle save notes
  const handleSaveNotes = async () => {
    if (!id) return

    setIsSavingNotes(true)
    try {
      const response = await fetch(
        `http://localhost:${backendStatus.port}/meetings/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: userNotes }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        setMeeting(data)
      }
    } catch (err) {
      console.error('Save notes error:', err)
    } finally {
      setIsSavingNotes(false)
    }
  }

  // Format timestamp for transcript
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    if (mins < 60) return `${mins} min`
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
  }

  // Get status badge
  const getStatusBadge = () => {
    if (!meeting) return null

    const styles = {
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
    }

    const labels = {
      scheduled: 'Scheduled',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[meeting.status]}`}>
        {labels[meeting.status]}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !meeting) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Link
          to="/meetings"
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error || 'Meeting not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        to="/meetings"
        className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      {/* Meeting Header */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{meeting.title}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                <span>
                  {format(new Date(meeting.created_at), "MMMM d, yyyy 'at' h:mm a")}
                </span>
                {meeting.duration > 0 && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDuration(meeting.duration)}
                  </span>
                )}
                {getStatusBadge()}
              </div>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete meeting"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* Description if exists */}
          {meeting.description && (
            <p className="mt-4 text-gray-600">{meeting.description}</p>
          )}

          {/* Location if exists */}
          {meeting.location && (
            <p className="mt-2 text-sm text-gray-500">
              📍 {meeting.location}
            </p>
          )}
        </div>

        {/* Tabs */}
        {meeting.status === 'completed' && meeting.transcription && (
          <>
            <div className="flex border-b border-gray-200">
              {(['summary', 'transcript', 'notes'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Summary Tab */}
              {activeTab === 'summary' && (
                <div>
                  {meeting.summary ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800">AI Summary</h3>
                        <button
                          onClick={handleGenerateSummary}
                          disabled={isGeneratingSummary}
                          className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                        >
                          {isGeneratingSummary ? 'Generating...' : 'Regenerate'}
                        </button>
                      </div>

                      {/* Overview */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Overview</h4>
                        <p className="text-gray-700">{meeting.summary.overview}</p>
                      </div>

                      {/* Key Points */}
                      {meeting.summary.key_points.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-2">Key Points</h4>
                          <ul className="space-y-2">
                            {meeting.summary.key_points.map((point, index) => (
                              <li key={index} className="flex items-start gap-2 text-gray-700">
                                <span className="text-primary-600 mt-1">•</span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Action Items */}
                      {meeting.summary.action_items.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-2">Action Items</h4>
                          <ul className="space-y-2">
                            {meeting.summary.action_items.map((item, index) => (
                              <li key={index} className="flex items-start gap-2 text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  className="mt-1 rounded border-gray-300"
                                  readOnly
                                />
                                <div>
                                  <span>{item.task}</span>
                                  {item.assignee && (
                                    <span className="text-sm text-gray-500 ml-2">
                                      ({item.assignee})
                                    </span>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <p className="text-xs text-gray-400">
                        Generated by {meeting.summary.model_used} •{' '}
                        {format(new Date(meeting.summary.generated_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">✨</div>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">
                        No summary yet
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Generate an AI summary of this meeting
                      </p>
                      <button
                        onClick={handleGenerateSummary}
                        disabled={isGeneratingSummary}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {isGeneratingSummary ? 'Generating... (this may take a minute)' : 'Generate Summary'}
                      </button>
                      {summaryError && (
                        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                          {summaryError}
                        </div>
                      )}
                      {isGeneratingSummary && (
                        <p className="mt-4 text-sm text-gray-400">
                          First time may take longer as the AI model downloads...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Transcript Tab */}
              {activeTab === 'transcript' && (
                <div>
                  {meeting.transcription.segments.length > 0 ? (
                    <div className="space-y-4">
                      {meeting.transcription.segments.map((segment, index) => (
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
                      {meeting.transcription.full_text}
                    </p>
                  )}
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <textarea
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    placeholder="Add your personal notes about this meeting..."
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {isSavingNotes ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* For scheduled meetings without transcript */}
        {meeting.status === 'scheduled' && (
          <div className="p-6 text-center">
            <div className="text-4xl mb-4">📅</div>
            <p className="text-gray-600">
              This meeting is scheduled. Start recording when the meeting begins.
            </p>
            <Link
              to="/"
              className="mt-4 inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Go to Recording
            </Link>
          </div>
        )}

        {/* For in-progress meetings - show live transcript and stop button */}
        {meeting.status === 'in_progress' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                <h3 className="text-lg font-semibold text-gray-800">Recording in Progress</h3>
              </div>
              {isCurrentlyRecording && (
                <button
                  onClick={() => stopRecording()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  Stop Recording
                </button>
              )}
            </div>

            {isCurrentlyRecording ? (
              <div className="bg-gray-50 rounded-lg p-4 min-h-[200px]">
                <h4 className="text-sm font-medium text-gray-500 mb-3">Live Transcript</h4>
                {liveTranscript ? (
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {liveTranscript}
                  </p>
                ) : (
                  <p className="text-gray-400 italic">Waiting for speech...</p>
                )}
                <p className="text-xs text-gray-400 mt-4 animate-pulse">
                  Transcribing...
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg">
                <p>
                  This meeting is marked as in-progress but recording is not active on this device.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Meeting?</h3>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. The meeting and its transcript will be permanently deleted.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
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
