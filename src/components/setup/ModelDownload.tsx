import { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/appStore'

interface ModelDownloadProps {
  onComplete: () => void
  onSkip: () => void
}

interface DownloadProgress {
  status: string
  file?: string
  downloaded_bytes: number
  total_bytes: number
  percent: number
  speed_mbps: number
  eta_seconds: number
}

export default function ModelDownload({ onComplete, onSkip }: ModelDownloadProps) {
  const { backendStatus, setBackendStatus } = useAppStore()
  const [isDownloading, setIsDownloading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modelStatus, setModelStatus] = useState<{
    isDownloaded: boolean
    isLoaded: boolean
  } | null>(null)

  // Check model status on mount and when backend becomes ready
  useEffect(() => {
    let isMounted = true
    let retryTimeout: ReturnType<typeof setTimeout> | null = null

    const checkStatus = async (retries = 5) => {
      try {
        const response = await fetch(`http://localhost:${backendStatus.port}/model/status`)
        if (response.ok && isMounted) {
          const data = await response.json()
          setModelStatus({
            isDownloaded: data.is_downloaded,
            isLoaded: data.is_loaded
          })
          if (data.is_loaded) {
            setBackendStatus({ ...backendStatus, modelLoaded: true })
          }
          return true
        }
      } catch {
        // Backend might not be ready yet, retry
        if (isMounted && retries > 0) {
          retryTimeout = setTimeout(() => checkStatus(retries - 1), 1000)
        }
      }
      return false
    }

    if (backendStatus.isRunning) {
      checkStatus()
    } else {
      // If backend not running yet, poll until it is
      const pollBackend = async () => {
        try {
          const response = await fetch(`http://localhost:${backendStatus.port}/health`)
          if (response.ok && isMounted) {
            checkStatus()
          } else if (isMounted) {
            retryTimeout = setTimeout(pollBackend, 1000)
          }
        } catch {
          if (isMounted) {
            retryTimeout = setTimeout(pollBackend, 1000)
          }
        }
      }
      pollBackend()
    }

    return () => {
      isMounted = false
      if (retryTimeout) clearTimeout(retryTimeout)
    }
  }, [backendStatus.isRunning, backendStatus.port])

  const startDownload = async () => {
    setIsDownloading(true)
    setError(null)

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/model/download`, {
        method: 'POST'
      })

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.status === 'error') {
              throw new Error(data.message)
            }
            if (data.status === 'complete') {
              setModelStatus({ isDownloaded: true, isLoaded: false })
              await loadModel()
              return
            }
            setProgress(data)
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              throw e
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setIsDownloading(false)
    }
  }

  const loadModel = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/model/load`, {
        method: 'POST'
      })
      if (response.ok) {
        setModelStatus({ isDownloaded: true, isLoaded: true })
        setBackendStatus({ ...backendStatus, modelLoaded: true })
        onComplete()
      } else {
        throw new Error('Failed to load model')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model')
    } finally {
      setIsLoading(false)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatEta = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}m ${secs}s`
  }

  // Already downloaded and loaded
  if (modelStatus?.isLoaded) {
    return (
      <div className="text-center space-y-6">
        <div className="text-6xl">✅</div>
        <h2 className="text-2xl font-bold text-gray-800">Model Ready</h2>
        <p className="text-gray-600">
          The Parakeet speech recognition model is already downloaded and loaded.
        </p>
        <button
          onClick={onComplete}
          className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Continue
        </button>
      </div>
    )
  }

  // Downloaded but not loaded
  if (modelStatus?.isDownloaded && !modelStatus?.isLoaded) {
    return (
      <div className="text-center space-y-6">
        <div className="text-6xl">📦</div>
        <h2 className="text-2xl font-bold text-gray-800">Model Downloaded</h2>
        <p className="text-gray-600">
          The model is downloaded. Click below to load it into memory.
        </p>
        <button
          onClick={loadModel}
          disabled={isLoading}
          className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Load Model'}
        </button>
        {error && (
          <p className="text-red-600">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="text-center space-y-6">
      <div className="text-6xl">📥</div>
      <h2 className="text-2xl font-bold text-gray-800">Download AI Model</h2>
      <p className="text-gray-600 max-w-md mx-auto">
        The Parakeet speech recognition model needs to be downloaded.
        This is a one-time setup (~640 MB).
      </p>

      {isDownloading && progress ? (
        <div className="space-y-4 max-w-md mx-auto">
          <div className="bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="bg-primary-600 h-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>{formatBytes(progress.downloaded_bytes)} / {formatBytes(progress.total_bytes)}</span>
            <span>{progress.percent.toFixed(0)}%</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>{progress.speed_mbps.toFixed(1)} MB/s</span>
            <span>ETA: {formatEta(progress.eta_seconds)}</span>
          </div>
          {progress.file && (
            <p className="text-xs text-gray-400">Downloading: {progress.file}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 max-w-sm mx-auto">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Model:</span>
              <span className="font-medium">Parakeet TDT 0.6B</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-600">Size:</span>
              <span className="font-medium">~640 MB</span>
            </div>
          </div>

          <button
            onClick={startDownload}
            disabled={!backendStatus.isRunning}
            className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {backendStatus.isRunning ? 'Download Model' : 'Waiting for Backend...'}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg max-w-md mx-auto">
          {error}
        </div>
      )}

      <button
        onClick={onSkip}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Skip for now
      </button>
    </div>
  )
}
