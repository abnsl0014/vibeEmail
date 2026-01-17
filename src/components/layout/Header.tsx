import { useAppStore } from '../../stores/appStore'

export default function Header() {
  const { backendStatus } = useAppStore()

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-end px-6 titlebar-drag-region">
      <div className="flex items-center gap-4 titlebar-no-drag">
        {/* Backend status */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              backendStatus.isRunning
                ? backendStatus.modelLoaded
                  ? 'bg-green-500'
                  : 'bg-yellow-500'
                : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-600">
            {backendStatus.isRunning
              ? backendStatus.modelLoaded
                ? 'Ready'
                : 'Model Loading...'
              : 'Backend Offline'}
          </span>
        </div>
      </div>
    </header>
  )
}
