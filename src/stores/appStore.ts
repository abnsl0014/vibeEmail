import { create } from 'zustand'
import { BackendStatus } from '../types/api'

interface AppState {
  isSetupComplete: boolean
  backendStatus: BackendStatus
  currentView: 'recording' | 'notes' | 'settings'
  setSetupComplete: (complete: boolean) => void
  setBackendStatus: (status: BackendStatus) => void
  setCurrentView: (view: 'recording' | 'notes' | 'settings') => void
}

export const useAppStore = create<AppState>((set) => ({
  isSetupComplete: false,
  backendStatus: {
    isRunning: false,
    modelLoaded: false,
    port: 8765
  },
  currentView: 'recording',

  setSetupComplete: (complete) => set({ isSetupComplete: complete }),
  setBackendStatus: (status) => set({ backendStatus: status }),
  setCurrentView: (view) => set({ currentView: view })
}))
