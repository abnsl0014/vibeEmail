import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  onBackendReady: (callback: (port: number) => void) => {
    ipcRenderer.on('backend-ready', (_event, port) => callback(port))
  },

  onBackendError: (callback: (error: string) => void) => {
    ipcRenderer.on('backend-error', (_event, error) => callback(error))
  },

  startBackend: (): Promise<number> => {
    return ipcRenderer.invoke('start-backend')
  },

  stopBackend: (): Promise<void> => {
    return ipcRenderer.invoke('stop-backend')
  },

  getAppPath: (): Promise<string> => {
    return ipcRenderer.invoke('get-app-path')
  },

  showSaveDialog: (options: {
    title: string
    defaultPath: string
    filters: Array<{ name: string; extensions: string[] }>
  }): Promise<string | null> => {
    return ipcRenderer.invoke('show-save-dialog', options)
  }
})
