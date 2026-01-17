import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import RecordingPanel from './components/recording/RecordingPanel'
import NotesList from './components/notes/NotesList'
import NoteViewer from './components/notes/NoteViewer'
import SetupWizard from './components/setup/SetupWizard'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { useAppStore } from './stores/appStore'

function AppContent() {
  const { isSetupComplete, setSetupComplete, setBackendStatus } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check backend health with retries
    const checkBackendHealth = async (port: number, maxRetries = 10, delay = 1000): Promise<boolean> => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fetch(`http://localhost:${port}/health`)
          if (response.ok) {
            const data = await response.json()
            setBackendStatus({
              isRunning: true,
              modelLoaded: data.model_loaded,
              port
            })
            return true
          }
        } catch {
          // Backend not ready yet, will retry
          console.log(`Backend health check attempt ${i + 1}/${maxRetries} failed, retrying...`)
        }
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
      return false
    }

    // Check if setup has been completed
    const checkSetup = async () => {
      try {
        // Check local storage for setup completion
        const setupDone = localStorage.getItem('voice-notes-setup-complete')
        if (setupDone === 'true') {
          setSetupComplete(true)
        }

        // Check backend status with retries
        const backendReady = await checkBackendHealth(8765)
        if (!backendReady) {
          // Backend not running after retries
          setBackendStatus({
            isRunning: false,
            modelLoaded: false,
            port: 8765
          })
        }
      } catch {
        setBackendStatus({
          isRunning: false,
          modelLoaded: false,
          port: 8765
        })
      } finally {
        setIsLoading(false)
      }
    }

    checkSetup()

    // Listen for backend ready event from Electron
    if (window.electronAPI) {
      window.electronAPI.onBackendReady(async (port: number) => {
        // When backend signals ready, verify with health check
        console.log('Backend ready signal received, checking health...')
        await checkBackendHealth(port, 5, 500)
      })
    }
  }, [setSetupComplete, setBackendStatus])

  const handleSetupComplete = () => {
    localStorage.setItem('voice-notes-setup-complete', 'true')
    setSetupComplete(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Voice Notes...</p>
        </div>
      </div>
    )
  }

  if (!isSetupComplete) {
    return <SetupWizard onComplete={handleSetupComplete} />
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<RecordingPanel />} />
          <Route path="/notes" element={<NotesList />} />
          <Route path="/notes/:id" element={<NoteViewer />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}

export default App
