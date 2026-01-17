import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  const navItems = [
    { to: '/', icon: '🎙️', label: 'Record' },
    { to: '/notes', icon: '📝', label: 'Notes' },
  ]

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Title bar drag region */}
      <div className="h-12 titlebar-drag-region flex items-center justify-center border-b border-gray-100">
        <h1 className="text-lg font-semibold text-gray-800">Voice Notes</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors titlebar-no-drag ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          Powered by Parakeet ASR
        </p>
      </div>
    </aside>
  )
}
