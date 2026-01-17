import { useState, useEffect, useCallback } from 'react'
import { AudioDevice } from '../types/audio'

interface UseAudioDevicesReturn {
  devices: AudioDevice[]
  microphoneDevices: AudioDevice[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useAudioDevices(): UseAudioDevicesReturn {
  const [devices, setDevices] = useState<AudioDevice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDevices = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          // Stop the stream immediately
          stream.getTracks().forEach(track => track.stop())
        })
        .catch(() => {
          // Permission denied, but we can still enumerate devices (without labels)
        })

      const deviceList = await navigator.mediaDevices.enumerateDevices()

      const audioDevices: AudioDevice[] = deviceList
        .filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `${device.kind === 'audioinput' ? 'Microphone' : 'Speaker'} (${device.deviceId.slice(0, 8)})`,
          kind: device.kind as 'audioinput' | 'audiooutput'
        }))

      setDevices(audioDevices)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load audio devices'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDevices()

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', loadDevices)

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices)
    }
  }, [loadDevices])

  const microphoneDevices = devices.filter(d => d.kind === 'audioinput')

  return {
    devices,
    microphoneDevices,
    isLoading,
    error,
    refresh: loadDevices
  }
}
