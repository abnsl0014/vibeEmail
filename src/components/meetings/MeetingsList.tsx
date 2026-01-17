import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../../stores/appStore'
import {
  useMeetingsStore,
  selectInProgressMeetings,
  selectScheduledMeetings,
  selectFilteredPastMeetings,
} from '../../stores/meetingsStore'
import MeetingCard from './MeetingCard'
import CreateMeetingModal from './CreateMeetingModal'
import CalendarConnect from '../calendar/CalendarConnect'

export default function MeetingsList() {
  const { backendStatus } = useAppStore()
  const {
    upcomingMeetings,
    pastMeetings,
    setUpcomingMeetings,
    setPastMeetings,
    searchQuery,
    setSearchQuery,
    isLoading,
    setIsLoading,
    error,
    setError,
  } = useMeetingsStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)

  // Get filtered meetings
  const inProgressMeetings = useMeetingsStore(selectInProgressMeetings)
  const scheduledMeetings = useMeetingsStore(selectScheduledMeetings)
  const filteredPast = useMeetingsStore(selectFilteredPastMeetings)

  // Fetch meetings function (reusable for refresh)
  const fetchMeetings = useCallback(async () => {
    if (!backendStatus.isRunning) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch upcoming and past meetings in parallel
      const [upcomingRes, pastRes] = await Promise.all([
        fetch(`http://localhost:${backendStatus.port}/meetings/upcoming`),
        fetch(`http://localhost:${backendStatus.port}/meetings/past`),
      ])

      if (upcomingRes.ok) {
        const data = await upcomingRes.json()
        setUpcomingMeetings(data.meetings)
      }

      if (pastRes.ok) {
        const data = await pastRes.json()
        setPastMeetings(data.meetings)
      }
    } catch (err) {
      setError('Failed to load meetings')
      console.error('Error fetching meetings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [backendStatus.isRunning, backendStatus.port, setUpcomingMeetings, setPastMeetings, setIsLoading, setError])

  // Fetch meetings on mount
  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  // Migrate notes to meetings
  const handleMigrate = async () => {
    if (!backendStatus.isRunning) return

    setIsMigrating(true)
    try {
      const response = await fetch(
        `http://localhost:${backendStatus.port}/meetings/migrate`,
        { method: 'POST' }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.migrated > 0) {
          // Refresh the list
          const pastRes = await fetch(
            `http://localhost:${backendStatus.port}/meetings/past`
          )
          if (pastRes.ok) {
            const pastData = await pastRes.json()
            setPastMeetings(pastData.meetings)
          }
        }
      }
    } catch (err) {
      console.error('Migration error:', err)
    } finally {
      setIsMigrating(false)
    }
  }

  // Handle meeting created
  const handleMeetingCreated = () => {
    setShowCreateModal(false)
    // Refresh upcoming meetings
    fetch(`http://localhost:${backendStatus.port}/meetings/upcoming`)
      .then((res) => res.json())
      .then((data) => setUpcomingMeetings(data.meetings))
      .catch(console.error)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
      </div>
    )
  }

  const hasMeetings = upcomingMeetings.length > 0 || pastMeetings.length > 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Meetings</h1>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
            <input
              type="text"
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Google Calendar Integration */}
          <CalendarConnect onSyncComplete={fetchMeetings} />

          {/* New Meeting Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Meeting
          </button>
        </div>
      </div>

      {!hasMeetings ? (
        // Empty state
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">No meetings yet</h2>
          <p className="text-gray-500 mb-6">
            Schedule a meeting or start recording to create your first meeting
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Schedule Meeting
            </button>
            <button
              onClick={handleMigrate}
              disabled={isMigrating}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {isMigrating ? 'Migrating...' : 'Import from Notes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* In-Progress Meetings Section */}
          {inProgressMeetings.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-yellow-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                Recording ({inProgressMeetings.length})
              </h2>
              <div className="space-y-3">
                {inProgressMeetings.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Meetings Section */}
          {scheduledMeetings.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Upcoming ({scheduledMeetings.length})
              </h2>
              <div className="space-y-3">
                {scheduledMeetings.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            </section>
          )}

          {/* Past Meetings Section */}
          {filteredPast.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Past Meetings ({filteredPast.length})
              </h2>
              <div className="space-y-3">
                {filteredPast.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            </section>
          )}

          {/* No search results */}
          {searchQuery && inProgressMeetings.length === 0 && scheduledMeetings.length === 0 && filteredPast.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No meetings matching "{searchQuery}"</p>
            </div>
          )}

          {/* Migration prompt if no past meetings but notes exist */}
          {pastMeetings.length === 0 && (
            <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-blue-800 font-medium">Have existing recordings?</p>
                <p className="text-blue-600 text-sm">Import your notes as past meetings</p>
              </div>
              <button
                onClick={handleMigrate}
                disabled={isMigrating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isMigrating ? 'Importing...' : 'Import Notes'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <CreateMeetingModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleMeetingCreated}
        />
      )}
    </div>
  )
}
