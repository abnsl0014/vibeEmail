import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useMeetingScheduler } from '../../hooks/useMeetingScheduler'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  // Meeting scheduler runs globally to monitor upcoming meetings
  useMeetingScheduler()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
