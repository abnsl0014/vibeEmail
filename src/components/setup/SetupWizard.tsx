import { useState } from 'react'
import ModelDownload from './ModelDownload'
import BlackHoleSetup from './BlackHoleSetup'
import AudioDeviceTest from './AudioDeviceTest'

type SetupStep = 'welcome' | 'model' | 'blackhole' | 'test' | 'complete'

interface SetupWizardProps {
  onComplete: () => void
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('welcome')

  const steps: SetupStep[] = ['welcome', 'model', 'blackhole', 'test', 'complete']
  const currentIndex = steps.indexOf(currentStep)

  const goNext = () => {
    const nextIndex = currentIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex])
    }
  }

  const goBack = () => {
    const prevIndex = currentIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex])
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="text-7xl">🎙️</div>
            <h1 className="text-3xl font-bold text-gray-800">Welcome to Voice Notes</h1>
            <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
              Transform your voice into text with AI-powered transcription running
              locally on your Mac. No internet required for transcription.
            </p>
            <div className="space-y-3 text-left max-w-sm mx-auto pt-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <span className="text-green-500 text-xl">✓</span>
                <span className="text-gray-700">100% Private - All processing on your device</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-blue-500 text-xl">✓</span>
                <span className="text-gray-700">Fast - Optimized for Apple Silicon</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <span className="text-purple-500 text-xl">✓</span>
                <span className="text-gray-700">Accurate - Powered by Parakeet ASR</span>
              </div>
            </div>
            <button
              onClick={goNext}
              className="mt-6 px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-lg"
            >
              Get Started
            </button>
          </div>
        )

      case 'model':
        return <ModelDownload onComplete={goNext} onSkip={goNext} />

      case 'blackhole':
        return <BlackHoleSetup onComplete={goNext} onSkip={goNext} />

      case 'test':
        return <AudioDeviceTest onComplete={goNext} onBack={goBack} />

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="text-7xl">🎉</div>
            <h1 className="text-3xl font-bold text-gray-800">You're All Set!</h1>
            <p className="text-gray-600 max-w-md mx-auto">
              Voice Notes is ready to use. Start recording to transcribe your voice
              into text automatically.
            </p>
            <button
              onClick={onComplete}
              className="mt-6 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg"
            >
              Start Using Voice Notes
            </button>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      {/* Progress indicator */}
      {currentStep !== 'welcome' && currentStep !== 'complete' && (
        <div className="mb-8 flex gap-2">
          {steps.slice(1, -1).map((step, index) => (
            <div
              key={step}
              className={`w-3 h-3 rounded-full transition-colors ${
                index <= currentIndex - 1 ? 'bg-primary-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}

      {/* Step content */}
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        {renderStep()}
      </div>
    </div>
  )
}
