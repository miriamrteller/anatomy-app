import React, { useState } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { SystemCanvas } from './components/SystemCanvas'
import { ChatPanel } from './components/ChatPanel'

export function App(): React.ReactElement {
  const [chatPanelExpanded, setChatPanelExpanded] = useState(false)

  const chatWidth = chatPanelExpanded ? 'w-full sm:w-2/3' : 'w-80'

  return (
    <AppLayout>
      <div className="flex-1 overflow-hidden flex flex-col">
        <SystemCanvas />
      </div>
      <div className={`${chatWidth} flex-shrink-0 transition-all duration-300`}>
        <ChatPanel
          isExpanded={chatPanelExpanded}
          onToggleWidth={() => setChatPanelExpanded(!chatPanelExpanded)}
        />
      </div>
    </AppLayout>
  )
}

export default App
