import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  toggleOverlay: () => ipcRenderer.invoke('toggle-overlay'),
  hideOverlay: () => ipcRenderer.invoke('hide-overlay'),
  getBackendPort: () => ipcRenderer.invoke('get-backend-port'),

  onOverlayShow: (callback: () => void) => {
    ipcRenderer.on('overlay-show', () => callback())
  },
  onOverlayHide: (callback: () => void) => {
    ipcRenderer.on('overlay-hide', () => callback())
  },
  onBackendReady: (callback: (port: number) => void) => {
    ipcRenderer.on('backend-ready', (_event, port) => callback(port))
  },
})
