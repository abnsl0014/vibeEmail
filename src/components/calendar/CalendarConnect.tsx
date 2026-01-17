import { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/appStore'

interface CalendarConnectProps {
  onSyncComplete?: () => void
}

export default function CalendarConnect({ onSyncComplete }: CalendarConnectProps) {
  const { backendStatus } = useAppStore()

  const [isConnected, setIsConnected] = useState(false)
  const [hasClientConfig, setHasClientConfig] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [clientConfig, setClientConfig] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Check calendar status on mount
  useEffect(() => {
    const checkStatus = async () => {
      if (!backendStatus.isRunning) return

      try {
        const response = await fetch(
          `http://localhost:${backendStatus.port}/calendar/status`
        )
        if (response.ok) {
          const data = await response.json()
          setIsConnected(data.is_connected)
          setHasClientConfig(data.has_client_config)
        }
      } catch (err) {
        console.error('Error checking calendar status:', err)
      } finally {
        setIsLoading(false)
      }
    }

    checkStatus()

    // Listen for OAuth callback
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsConnected(true)
        setIsConnecting(false)
        // Auto sync after connection
        handleSync()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [backendStatus.isRunning, backendStatus.port])

  // Handle OAuth connection
  const handleConnect = async () => {
    if (!hasClientConfig) {
      setShowSetupModal(true)
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const response = await fetch(
        `http://localhost:${backendStatus.port}/auth/google/url`
      )

      if (!response.ok) {
        throw new Error('Failed to get auth URL')
      }

      const data = await response.json()
      // Open OAuth flow in new window
      window.open(data.auth_url, 'Google Auth', 'width=500,height=600')
    } catch (err) {
      setError('Failed to start Google authentication')
      setIsConnecting(false)
    }
  }

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      const response = await fetch(
        `http://localhost:${backendStatus.port}/auth/google/disconnect`,
        { method: 'POST' }
      )

      if (response.ok) {
        setIsConnected(false)
      }
    } catch (err) {
      console.error('Disconnect error:', err)
    }
  }

  // Handle calendar sync
  const handleSync = async () => {
    setIsSyncing(true)
    setError(null)

    try {
      const response = await fetch(
        `http://localhost:${backendStatus.port}/calendar/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ calendar_id: 'primary', days_ahead: 7 }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        console.log(`Synced ${data.synced_count} events`)
        onSyncComplete?.()
      } else if (response.status === 401) {
        setIsConnected(false)
        setError('Calendar disconnected. Please reconnect.')
      }
    } catch (err) {
      setError('Failed to sync calendar')
    } finally {
      setIsSyncing(false)
    }
  }

  // Save client config
  const handleSaveConfig = async () => {
    setError(null)

    try {
      const config = JSON.parse(clientConfig)

      const response = await fetch(
        `http://localhost:${backendStatus.port}/calendar/client-config`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_config: config }),
        }
      )

      if (response.ok) {
        setHasClientConfig(true)
        setShowSetupModal(false)
        setClientConfig('')
        // Start OAuth flow
        handleConnect()
      } else {
        setError('Invalid client configuration')
      }
    } catch (err) {
      setError('Invalid JSON format')
    }
  }

  if (isLoading) {
    return null
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isSyncing ? 'Syncing...' : 'Sync'}
            </button>
            <button
              onClick={handleDisconnect}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Disconnect Google Calendar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
            </svg>
            {isConnecting ? 'Connecting...' : 'Connect Calendar'}
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}

      {/* Setup Modal for OAuth Client Config */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">
                Setup Google Calendar
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                To connect Google Calendar, you need to provide your own OAuth credentials.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium mb-2">How to get credentials:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to the Google Cloud Console</li>
                  <li>Create a new project or select existing</li>
                  <li>Enable the Google Calendar API</li>
                  <li>Create OAuth 2.0 credentials (Desktop app)</li>
                  <li>Download the JSON file and paste its contents below</li>
                </ol>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Secret JSON
                </label>
                <textarea
                  value={clientConfig}
                  onChange={(e) => setClientConfig(e.target.value)}
                  placeholder='Paste the contents of your client_secret.json file here...'
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowSetupModal(false)
                  setClientConfig('')
                  setError(null)
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={!clientConfig.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
