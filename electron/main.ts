import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { spawn, ChildProcess } from 'child_process'

let mainWindow: BrowserWindow | null = null
let pythonProcess: ChildProcess | null = null
const BACKEND_PORT = 8765

function isDev(): boolean {
  return !app.isPackaged
}

function getBackendDir(): string {
  if (isDev()) {
    return path.join(__dirname, '..', 'backend')
  }
  return path.join(process.resourcesPath, 'backend')
}

function getPythonPath(): string {
  const backendDir = getBackendDir()
  if (isDev()) {
    // Use Python from virtual environment in development
    return path.join(backendDir, '.venv', 'bin', 'python')
  }
  // In production, use system Python or bundled Python
  return 'python3'
}

async function startPythonBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    const backendDir = getBackendDir()
    const pythonPath = getPythonPath()
    const mainScript = path.join(backendDir, 'main.py')

    console.log(`Starting Python backend from: ${mainScript}`)

    pythonProcess = spawn(pythonPath, [mainScript, '--port', String(BACKEND_PORT)], {
      cwd: backendDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1'
      }
    })

    let started = false

    pythonProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      console.log('[Python]', output)

      if (!started && (output.includes('Uvicorn running') || output.includes('Application startup complete'))) {
        started = true
        mainWindow?.webContents.send('backend-ready', BACKEND_PORT)
        resolve()
      }
    })

    pythonProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString()
      console.log('[Python stderr]', output)

      // Uvicorn logs to stderr by default
      if (!started && (output.includes('Uvicorn running') || output.includes('Application startup complete'))) {
        started = true
        mainWindow?.webContents.send('backend-ready', BACKEND_PORT)
        resolve()
      }
    })

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python backend:', error)
      mainWindow?.webContents.send('backend-error', error.message)
      reject(error)
    })

    pythonProcess.on('exit', (code) => {
      console.log(`Python backend exited with code ${code}`)
      if (!started) {
        reject(new Error(`Python process exited with code ${code}`))
      }
    })

    // Timeout for startup
    setTimeout(() => {
      if (!started) {
        reject(new Error('Python backend failed to start within timeout'))
      }
    }, 30000)
  })
}

async function stopPythonBackend(): Promise<void> {
  if (pythonProcess) {
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
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 20 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#ffffff',
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev()) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC Handlers
ipcMain.handle('start-backend', async () => {
  try {
    await startPythonBackend()
    return BACKEND_PORT
  } catch (error) {
    throw error
  }
})

ipcMain.handle('stop-backend', async () => {
  await stopPythonBackend()
})

ipcMain.handle('get-app-path', () => {
  return app.getPath('userData')
})

ipcMain.handle('show-save-dialog', async (_event, options) => {
  const result = await dialog.showSaveDialog(mainWindow!, options)
  return result.canceled ? null : result.filePath
})

// App lifecycle
app.whenReady().then(async () => {
  createWindow()

  // Try to start the backend
  try {
    await startPythonBackend()
  } catch (error) {
    console.error('Failed to start backend on app ready:', error)
    // Don't block the app from starting
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await stopPythonBackend()
})
