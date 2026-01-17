import { create } from 'zustand'
import { Note, NoteMetadata } from '../types/note'

interface NotesStoreState {
  notes: NoteMetadata[]
  selectedNote: Note | null
  isLoading: boolean
  error: string | null
  searchQuery: string

  setNotes: (notes: NoteMetadata[]) => void
  addNote: (note: NoteMetadata) => void
  removeNote: (id: string) => void
  setSelectedNote: (note: Note | null) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSearchQuery: (query: string) => void
}

export const useNotesStore = create<NotesStoreState>((set) => ({
  notes: [],
  selectedNote: null,
  isLoading: false,
  error: null,
  searchQuery: '',

  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((state) => ({
    notes: [note, ...state.notes]
  })),
  removeNote: (id) => set((state) => ({
    notes: state.notes.filter(n => n.id !== id)
  })),
  setSelectedNote: (note) => set({ selectedNote: note }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setSearchQuery: (query) => set({ searchQuery: query })
}))
