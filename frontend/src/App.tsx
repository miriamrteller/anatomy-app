import React from 'react'
import { useAnatomyStore } from './stores/anatomy'
import { AppLayout } from './components/layout/AppLayout'
import { SystemCanvas } from './components/SystemCanvas'
import { SidePanel } from './components/SidePanel'
import { LayerControls } from './components/LayerControls'

export function App(): React.ReactElement {
  const { isPanelMinimized } = useAnatomyStore()

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col gap-4">
        <SystemCanvas />
        <LayerControls />
      </div>
      <div
        className={`transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden ${
          isPanelMinimized ? 'w-16' : 'w-80'
        }`}
      >
        <SidePanel />
      </div>
    </AppLayout>
  )
}

export default App
