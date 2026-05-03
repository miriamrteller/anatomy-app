import React from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { SystemCanvas } from './components/SystemCanvas'
import { ChatPanel } from './components/ChatPanel'

export function App(): React.ReactElement {
  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto flex flex-col md:overflow-hidden">
        <SystemCanvas />
      </div>
      <div className="w-full md:w-80 md:flex-shrink-0 transition-all duration-300 md:overflow-hidden flex-shrink-0">
        <ChatPanel />
      </div>
    </AppLayout>
  )
}

export default App
