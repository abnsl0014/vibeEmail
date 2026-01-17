import { Link } from 'react-router-dom'
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday, isPast } from 'date-fns'
import { MeetingMetadata } from '../../types/meeting'

interface MeetingCardProps {
  meeting: MeetingMetadata
}

export default function MeetingCard({ meeting }: MeetingCardProps) {
  const isUpcoming = meeting.status === 'scheduled'
  const isInProgress = meeting.status === 'in_progress'
  const isCompleted = meeting.status === 'completed'
  const isCancelled = meeting.status === 'cancelled'

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
  }

  // Format relative time for upcoming meetings
  const formatTimeUntil = (dateStr: string): string => {
    const date = new Date(dateStr)
    return formatDistanceToNow(date, { addSuffix: false })
  }

  // Format date for display
  const formatMeetingDate = (dateStr: string | null): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr)

    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`
    } else if (isTomorrow(date)) {
      return `Tomorrow, ${format(date, 'h:mm a')}`
    } else if (isYesterday(date)) {
      return 'Yesterday'
    } else {
      return format(date, 'MMM d, yyyy')
    }
  }

  // Get status color
  const getStatusColor = (): string => {
    switch (meeting.status) {
      case 'scheduled':
        return 'border-l-blue-500'
      case 'in_progress':
        return 'border-l-red-500'
      case 'completed':
        return 'border-l-green-500'
      case 'cancelled':
        return 'border-l-gray-400'
      default:
        return 'border-l-gray-300'
    }
  }

  // Get source icon
  const getSourceIcon = (): string => {
    switch (meeting.source) {
      case 'google_calendar':
        return '📅'
      case 'manual':
        return '✏️'
      case 'recording':
        return '🎙️'
      default:
        return '📝'
    }
  }

  return (
    <Link
      to={`/meetings/${meeting.id}`}
      className={`block bg-white rounded-xl border border-gray-200 border-l-4 ${getStatusColor()} p-5 hover:shadow-md hover:border-gray-300 transition-all`}
    >
      {isUpcoming ? (
        // Upcoming meeting card
        <div>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 mb-1">
                {formatMeetingDate(meeting.scheduled_at)}
              </p>
              <h3 className="text-lg font-medium text-gray-800 truncate">
                {getSourceIcon()} {meeting.title}
              </h3>
            </div>
            {meeting.scheduled_at && !isPast(new Date(meeting.scheduled_at)) && (
              <span className="ml-4 px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full whitespace-nowrap">
                In {formatTimeUntil(meeting.scheduled_at)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            {meeting.participant_count !== undefined && meeting.participant_count > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {meeting.participant_count} participant{meeting.participant_count !== 1 ? 's' : ''}
              </span>
            )}
            {meeting.calendar_link && (
              <span className="text-blue-600">Google Calendar</span>
            )}
          </div>
        </div>
      ) : isInProgress ? (
        // In-progress meeting card
        <div>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 mb-1">
                {formatMeetingDate(meeting.scheduled_at || meeting.created_at)}
              </p>
              <h3 className="text-lg font-medium text-gray-800 truncate">
                {getSourceIcon()} {meeting.title}
              </h3>
            </div>
            <span className="ml-4 px-3 py-1 bg-red-50 text-red-700 text-sm font-medium rounded-full whitespace-nowrap flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              Recording
            </span>
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            {meeting.participant_count !== undefined && meeting.participant_count > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {meeting.participant_count} participant{meeting.participant_count !== 1 ? 's' : ''}
              </span>
            )}
            <span className="text-red-600 font-medium">In Progress</span>
          </div>
        </div>
      ) : (
        // Past meeting card
        <div>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 mb-1">
                {formatMeetingDate(meeting.created_at)}
              </p>
              <h3 className="text-lg font-medium text-gray-800 truncate">
                {isCompleted ? '✓' : isCancelled ? '✗' : ''} {meeting.title}
              </h3>
            </div>
            {meeting.has_summary && (
              <span className="ml-4 px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full whitespace-nowrap">
                AI Summary
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            {meeting.duration > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDuration(meeting.duration)}
              </span>
            )}
            {meeting.word_count > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {meeting.word_count.toLocaleString()} words
              </span>
            )}
            {meeting.audio_source && (
              <span>
                {meeting.audio_source === 'microphone' && '🎤'}
                {meeting.audio_source === 'system' && '🔊'}
                {meeting.audio_source === 'both' && '🎙️'}
              </span>
            )}
          </div>
        </div>
      )}
    </Link>
  )
}
