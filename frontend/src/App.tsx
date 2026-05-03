import React from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { SystemCanvas } from './components/SystemCanvas'
import { ChatPanel } from './components/ChatPanel'

export function App(): React.ReactElement {
  return (
    <AppLayout>
      <div className="flex-1 overflow-hidden flex flex-col">
        <SystemCanvas />
      </div>
      <div className="w-80 flex-shrink-0 transition-all duration-300">
        <ChatPanel />
      </div>
    </AppLayout>
  )
}

export default App
