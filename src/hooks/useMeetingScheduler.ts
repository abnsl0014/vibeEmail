import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { useMeetingsStore } from '../stores/meetingsStore'
import { useRecordingStore } from '../stores/recordingStore'
import { MeetingMetadata } from '../types/meeting'

export function useMeetingScheduler() {
  const navigate = useNavigate()
  const { backendStatus } = useAppStore()
  const { setUpcomingMeetings } = useMeetingsStore()
  const { setPendingMeeting, isRecording } = useRecordingStore()

  const [localMeetings, setLocalMeetings] = useState<MeetingMetadata[]>([])
  const checkIntervalRef = useRef<number | null>(null)
  const autoStopTimersRef = useRef<Map<string, number>>(new Map())
  const startedMeetingsRef = useRef<Set<string>>(new Set())

  // Fetch upcoming meetings
  const fetchMeetings = useCallback(async () => {
    if (!backendStatus.isRunning) return

    try {
      const response = await fetch(
        `http://localhost:${backendStatus.port}/meetings/upcoming`
      )
      if (response.ok) {
        const data = await response.json()
        setLocalMeetings(data.meetings)
        setUpcomingMeetings(data.meetings)
      }
    } catch (err) {
      console.error('Error fetching meetings for scheduler:', err)
    }
  }, [backendStatus.isRunning, backendStatus.port, setUpcomingMeetings])

  // Check for meetings that should start
  const checkMeetings = useCallback(async () => {
    if (!backendStatus.isRunning) return
    // Don't start new meeting if already recording
    if (isRecording) return

    const now = new Date()

    for (const meeting of localMeetings) {
      // Skip if not auto-record or already started
      if (!meeting.auto_record || meeting.status !== 'scheduled') continue
      if (startedMeetingsRef.current.has(meeting.id)) continue

      // Check if scheduled time has arrived
      if (meeting.scheduled_at) {
        const scheduledTime = new Date(meeting.scheduled_at)
        const diffMs = now.getTime() - scheduledTime.getTime()

        // Start if we're within -10s to +60s of scheduled time
        if (diffMs >= -10000 && diffMs <= 60000) {
          console.log(`Auto-starting meeting: ${meeting.title}`)

          // Mark as started to avoid duplicate triggers
          startedMeetingsRef.current.add(meeting.id)

          // Update meeting status to in_progress
          try {
            await fetch(
              `http://localhost:${backendStatus.port}/meetings/${meeting.id}/start`,
              { method: 'POST' }
            )

            // Set pending meeting and navigate to Record page
            // The RecordingPanel will pick up the pending meeting and start recording
            setPendingMeeting(meeting)
            navigate('/')

            // Refresh meetings list
            fetchMeetings()
          } catch (err) {
            console.error('Error starting meeting:', err)
            startedMeetingsRef.current.delete(meeting.id)
          }
        }
      }
    }
  }, [backendStatus.isRunning, backendStatus.port, localMeetings, isRecording, fetchMeetings, setPendingMeeting, navigate])

  // Fetch meetings on mount and periodically
  useEffect(() => {
    if (!backendStatus.isRunning) return

    // Initial fetch
    fetchMeetings()

    // Fetch every 30 seconds to get new meetings
    const fetchInterval = window.setInterval(fetchMeetings, 30000)

    return () => {
      window.clearInterval(fetchInterval)
    }
  }, [backendStatus.isRunning, fetchMeetings])

  // Start the scheduler
  useEffect(() => {
    if (!backendStatus.isRunning) return

    // Check every 10 seconds
    checkIntervalRef.current = window.setInterval(checkMeetings, 10000)

    // Initial check
    checkMeetings()

    return () => {
      if (checkIntervalRef.current) {
        window.clearInterval(checkIntervalRef.current)
      }
      // Clear all auto-stop timers
      autoStopTimersRef.current.forEach((timerId) => {
        window.clearTimeout(timerId)
      })
      autoStopTimersRef.current.clear()
    }
  }, [backendStatus.isRunning, checkMeetings])

  // Function to manually cancel auto-stop for a meeting
  const cancelAutoStop = useCallback((meetingId: string) => {
    const timerId = autoStopTimersRef.current.get(meetingId)
    if (timerId) {
      window.clearTimeout(timerId)
      autoStopTimersRef.current.delete(meetingId)
    }
  }, [])

  // Function to set auto-stop timer (called from RecordingPanel when recording starts)
  const setAutoStop = useCallback((meetingId: string, durationSeconds: number, onStop: () => void) => {
    // Cancel existing timer
    cancelAutoStop(meetingId)

    // Set new timer
    const timerId = window.setTimeout(() => {
      console.log(`Auto-stopping meeting after ${durationSeconds}s`)
      onStop()
      autoStopTimersRef.current.delete(meetingId)
    }, durationSeconds * 1000)

    autoStopTimersRef.current.set(meetingId, timerId)
  }, [cancelAutoStop])

  return {
    cancelAutoStop,
    setAutoStop,
  }
}
