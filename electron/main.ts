import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron'
import path from 'path'
import { spawn, ChildProcess } from 'child_process'

let overlayWindow: BrowserWindow | null = null
let pythonProcess: ChildProcess | null = null
const BACKEND_PORT = 8765
let isOverlayVisible = false

function isDev(): boolean {
  return !app.isPackaged
}

function getBackendDir(): string {
  if (isDev()) return path.join(__dirname, '..', 'backend')
  return path.join(process.resourcesPath, 'backend')
}

async function startPythonBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    const backendDir = getBackendDir()
    const mainScript = path.join(backendDir, 'main.py')

    pythonProcess = spawn('python3', [mainScript, '--port', String(BACKEND_PORT)], {
      cwd: backendDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })

    let started = false

    const checkOutput = (data: Buffer) => {
      const output = data.toString()
      console.log('[Python]', output)
      if (
        !started &&
        (output.includes('Uvicorn running') || output.includes('Application startup complete'))
      ) {
        started = true
        overlayWindow?.webContents.send('backend-ready', BACKEND_PORT)
        resolve()
      }
    }

    pythonProcess.stdout?.on('data', checkOutput)
    pythonProcess.stderr?.on('data', checkOutput)

    pythonProcess.on('error', (err) => {
      console.error('Backend startup error:', err)
      reject(err)
    })

    pythonProcess.on('exit', (code) => {
      if (!started) reject(new Error(`Backend exited with code ${code}`))
    })

    setTimeout(() => {
      if (!started) reject(new Error('Backend startup timeout'))
    }, 60000)
  })
}

async function stopPythonBackend(): Promise<void> {
  if (!pythonProcess) return
  pythonProcess.kill('SIGTERM')
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      pythonProcess?.kill('SIGKILL')
      resolve()
    }, 5000)
    pythonProcess?.on('exit', () => {
      clearTimeout(timeout)
      resolve()
    })
  })
  pythonProcess = null
}

function createOverlayWindow(): void {
  const display = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = display.workAreaSize

  const overlayWidth = 520
  const overlayHeight = 500

  overlayWindow = new BrowserWindow({
    width: overlayWidth,
    height: overlayHeight,
    x: Math.round((screenWidth - overlayWidth) / 2),
    y: screenHeight - overlayHeight - 80,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlayWindow.setIgnoreMouseEvents(false)

  if (isDev()) {
    overlayWindow.loadURL('http://localhost:5173')
  } else {
    overlayWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  overlayWindow.hide()
  overlayWindow.on('closed', () => {
    overlayWindow = null
  })
}

function toggleOverlay(): void {
  if (!overlayWindow) return
  if (isOverlayVisible) {
    overlayWindow.webContents.send('overlay-hide')
    overlayWindow.hide()
    isOverlayVisible = false
  } else {
    overlayWindow.show()
    overlayWindow.webContents.send('overlay-show')
    isOverlayVisible = true
  }
}

function hideOverlay(): void {
  if (!overlayWindow || !isOverlayVisible) return
  overlayWindow.webContents.send('overlay-hide')
  overlayWindow.hide()
  isOverlayVisible = false
}

// IPC Handlers
ipcMain.handle('toggle-overlay', () => toggleOverlay())
ipcMain.handle('hide-overlay', () => hideOverlay())
ipcMain.handle('get-backend-port', () => BACKEND_PORT)

app.whenReady().then(async () => {
  // Hide dock icon on macOS
  if (process.platform === 'darwin') {
    app.dock.hide()
  }

  createOverlayWindow()

  // Register F1 global shortcut
  globalShortcut.register('F1', toggleOverlay)

  // Register Escape to dismiss
  globalShortcut.register('Escape', hideOverlay)

  // Start Python backend
  try {
    await startPythonBackend()
    console.log('Python backend started successfully')
  } catch (err) {
    console.error('Failed to start backend:', err)
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('before-quit', async () => {
  await stopPythonBackend()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
