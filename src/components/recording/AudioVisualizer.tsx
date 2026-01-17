import { useEffect, useRef } from 'react'

interface AudioVisualizerProps {
  audioLevel: number
  isRecording: boolean
}

// Helper to draw rounded rectangle (for compatibility)
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
  ctx.fill()
}

export default function AudioVisualizer({ audioLevel, isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const barsRef = useRef<number[]>(new Array(32).fill(0))
  const animationRef = useRef<number | null>(null)
  const audioLevelRef = useRef(audioLevel)
  const isRecordingRef = useRef(isRecording)

  // Update refs when props change
  useEffect(() => {
    audioLevelRef.current = audioLevel
  }, [audioLevel])

  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const width = canvas.width
      const height = canvas.height
      const barCount = barsRef.current.length
      const barWidth = width / barCount - 4
      const barGap = 4

      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Update bars with some randomness based on audio level
      const currentLevel = audioLevelRef.current
      const recording = isRecordingRef.current

      if (recording && currentLevel > 0) {
        for (let i = 0; i < barCount; i++) {
          const targetHeight = currentLevel * height * (0.5 + Math.random() * 0.5)
          barsRef.current[i] += (targetHeight - barsRef.current[i]) * 0.3
        }
      } else {
        // Decay when not recording
        for (let i = 0; i < barCount; i++) {
          barsRef.current[i] *= 0.9
        }
      }

      // Draw bars
      for (let i = 0; i < barCount; i++) {
        const barHeight = Math.max(4, barsRef.current[i])
        const x = i * (barWidth + barGap) + barGap / 2
        const y = (height - barHeight) / 2

        // Create gradient
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight)
        if (recording) {
          gradient.addColorStop(0, '#3b82f6')
          gradient.addColorStop(1, '#60a5fa')
        } else {
          gradient.addColorStop(0, '#d1d5db')
          gradient.addColorStop(1, '#e5e7eb')
        }

        ctx.fillStyle = gradient
        drawRoundedRect(ctx, x, y, barWidth, barHeight, 2)
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, []) // Empty dependency array - animation runs continuously

  return (
    <div className="flex justify-center items-center">
      <canvas
        ref={canvasRef}
        width={600}
        height={120}
        className="w-full max-w-lg h-24"
      />
    </div>
  )
}
