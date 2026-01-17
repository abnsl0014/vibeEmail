interface BlackHoleSetupProps {
  onComplete: () => void
  onSkip: () => void
}

export default function BlackHoleSetup({ onComplete, onSkip }: BlackHoleSetupProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-4">🔊</div>
        <h2 className="text-2xl font-bold text-gray-800">System Audio Capture</h2>
        <p className="text-gray-600 mt-2">
          Optional: Set up BlackHole to capture system audio from apps like Zoom, YouTube, etc.
        </p>
      </div>

      <div className="bg-gray-50 rounded-xl p-6 space-y-6">
        {/* Step 1 */}
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
            1
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Install BlackHole</h3>
            <p className="text-sm text-gray-600 mt-1">
              Download and install BlackHole virtual audio driver from:
            </p>
            <a
              href="https://existential.audio/blackhole/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm mt-2"
            >
              existential.audio/blackhole
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
            2
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Create Multi-Output Device</h3>
            <div className="text-sm text-gray-600 mt-1 space-y-2">
              <p>Open <strong>Audio MIDI Setup</strong> (in Applications → Utilities)</p>
              <p>Click the <strong>+</strong> button → Create Multi-Output Device</p>
              <p>Check both <strong>BlackHole 2ch</strong> and your speakers</p>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
            3
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Set as System Output</h3>
            <p className="text-sm text-gray-600 mt-1">
              Right-click the Multi-Output Device → <strong>Use This Device For Sound Output</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex gap-3">
          <span className="text-yellow-600">⚠️</span>
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Note</p>
            <p className="mt-1">
              System audio capture requires this setup. Without it, you can still use microphone capture for voice transcription.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={onSkip}
          className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Skip for Now
        </button>
        <button
          onClick={onComplete}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          I've Set It Up
        </button>
      </div>
    </div>
  )
}
