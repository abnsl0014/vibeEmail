/// <reference types="vite/client" />

interface ElectronAPI {
  onBackendReady: (callback: (port: number) => void) => void
  onBackendError: (callback: (error: string) => void) => void
  startBackend: () => Promise<number>
  stopBackend: () => Promise<void>
  getAppPath: () => Promise<string>
  showSaveDialog: (options: { title: string; defaultPath: string; filters: Array<{ name: string; extensions: string[] }> }) => Promise<string | null>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
