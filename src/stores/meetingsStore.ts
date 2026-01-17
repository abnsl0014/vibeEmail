import { create } from 'zustand'
import { Meeting, MeetingMetadata, MeetingStatus } from '../types/meeting'

interface MeetingsStoreState {
  // Data
  meetings: MeetingMetadata[]
  upcomingMeetings: MeetingMetadata[]
  pastMeetings: MeetingMetadata[]
  selectedMeeting: Meeting | null

  // Filters
  searchQuery: string
  statusFilter: MeetingStatus | 'all'

  // UI State
  isLoading: boolean
  error: string | null
  isCreating: boolean
  isSyncing: boolean

  // Actions
  setMeetings: (meetings: MeetingMetadata[]) => void
  setUpcomingMeetings: (meetings: MeetingMetadata[]) => void
  setPastMeetings: (meetings: MeetingMetadata[]) => void
  addMeeting: (meeting: MeetingMetadata) => void
  updateMeeting: (id: string, updates: Partial<MeetingMetadata>) => void
  removeMeeting: (id: string) => void
  setSelectedMeeting: (meeting: Meeting | null) => void
  setSearchQuery: (query: string) => void
  setStatusFilter: (status: MeetingStatus | 'all') => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setIsCreating: (creating: boolean) => void
  setIsSyncing: (syncing: boolean) => void
}

export const useMeetingsStore = create<MeetingsStoreState>((set) => ({
  // Initial state
  meetings: [],
  upcomingMeetings: [],
  pastMeetings: [],
  selectedMeeting: null,
  searchQuery: '',
  statusFilter: 'all',
  isLoading: false,
  error: null,
  isCreating: false,
  isSyncing: false,

  // Actions
  setMeetings: (meetings) => set({ meetings }),

  setUpcomingMeetings: (meetings) => set({ upcomingMeetings: meetings }),

  setPastMeetings: (meetings) => set({ pastMeetings: meetings }),

  addMeeting: (meeting) =>
    set((state) => {
      // Add to appropriate list based on status
      if (meeting.status === 'scheduled') {
        return {
          meetings: [meeting, ...state.meetings],
          upcomingMeetings: [meeting, ...state.upcomingMeetings],
        }
      } else {
        return {
          meetings: [meeting, ...state.meetings],
          pastMeetings: [meeting, ...state.pastMeetings],
        }
      }
    }),

  updateMeeting: (id, updates) =>
    set((state) => ({
      meetings: state.meetings.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
      upcomingMeetings: state.upcomingMeetings.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
      pastMeetings: state.pastMeetings.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
      selectedMeeting:
        state.selectedMeeting?.id === id
          ? { ...state.selectedMeeting, ...updates }
          : state.selectedMeeting,
    })),

  removeMeeting: (id) =>
    set((state) => ({
      meetings: state.meetings.filter((m) => m.id !== id),
      upcomingMeetings: state.upcomingMeetings.filter((m) => m.id !== id),
      pastMeetings: state.pastMeetings.filter((m) => m.id !== id),
      selectedMeeting:
        state.selectedMeeting?.id === id ? null : state.selectedMeeting,
    })),

  setSelectedMeeting: (meeting) => set({ selectedMeeting: meeting }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setStatusFilter: (status) => set({ statusFilter: status }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setIsCreating: (creating) => set({ isCreating: creating }),

  setIsSyncing: (syncing) => set({ isSyncing: syncing }),
}))

// Selectors
export const selectFilteredMeetings = (state: MeetingsStoreState) => {
  const { meetings, searchQuery, statusFilter } = state

  return meetings.filter((meeting) => {
    // Filter by search query
    const matchesSearch =
      !searchQuery ||
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase())

    // Filter by status
    const matchesStatus =
      statusFilter === 'all' || meeting.status === statusFilter

    return matchesSearch && matchesStatus
  })
}

export const selectFilteredUpcomingMeetings = (state: MeetingsStoreState) => {
  const { upcomingMeetings, searchQuery } = state

  const filtered = searchQuery
    ? upcomingMeetings.filter((meeting) =>
        meeting.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : upcomingMeetings

  // Separate in-progress and scheduled meetings
  return filtered
}

export const selectInProgressMeetings = (state: MeetingsStoreState) => {
  const { upcomingMeetings, searchQuery } = state

  const inProgress = upcomingMeetings.filter((m) => m.status === 'in_progress')

  if (!searchQuery) return inProgress

  return inProgress.filter((meeting) =>
    meeting.title.toLowerCase().includes(searchQuery.toLowerCase())
  )
}

export const selectScheduledMeetings = (state: MeetingsStoreState) => {
  const { upcomingMeetings, searchQuery } = state

  const scheduled = upcomingMeetings.filter((m) => m.status === 'scheduled')

  if (!searchQuery) return scheduled

  return scheduled.filter((meeting) =>
    meeting.title.toLowerCase().includes(searchQuery.toLowerCase())
  )
}

export const selectFilteredPastMeetings = (state: MeetingsStoreState) => {
  const { pastMeetings, searchQuery } = state

  if (!searchQuery) return pastMeetings

  return pastMeetings.filter((meeting) =>
    meeting.title.toLowerCase().includes(searchQuery.toLowerCase())
  )
}
