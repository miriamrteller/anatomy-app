import React, { useEffect, useState } from 'react'
import { useAnatomyStore } from './stores/anatomy'
import { AnatomySVG } from './components/AnatomySVG'
import { SidePanel } from './components/SidePanel'
import { LayerControls } from './components/LayerControls'

export function App(): React.ReactElement {
  const [svgContent, setSvgContent] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const { isRightPanelOpen, toggleRightPanel, isPanelMinimized } = useAnatomyStore()

  useEffect(() => {
    fetch('/svgs/skeleton.svg')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load SVG')
        return res.text()
      })
      .then(svg => {
        setSvgContent(svg)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="w-full h-screen bg-gray-100 p-4">
      <div className="h-full flex flex-col gap-4">
        {/* Header */}
        <div className="bg-white shadow-md rounded-lg p-4">
          <h1 className="text-3xl font-bold text-gray-900">Anatomy App</h1>
          <p className="text-gray-600">Interactive anatomical structure explorer</p>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex gap-4 relative">
          {/* Left: SVG Canvas */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex-1 bg-white rounded-lg shadow-md overflow-hidden">
              {loading && <div className="flex items-center justify-center h-full">Loading SVG...</div>}
              {error && <div className="flex items-center justify-center h-full text-red-500">Error: {error}</div>}
              {!loading && !error && <AnatomySVG svgContent={svgContent} />}
            </div>
            <LayerControls />
          </div>

          {/* Right: Side Panel - Collapsible with width toggle */}
          {isRightPanelOpen && (
            <div className={`transition-all duration-300 ease-in-out fixed top-20 right-4 h-[calc(100vh-140px)] ${
              isPanelMinimized ? 'w-16' : 'w-80'
            } z-10`}>
              <SidePanel />
            </div>
          )}
          
          {/* Collapse Button - Slides panel off screen */}
          {!isRightPanelOpen && (
            <button
              onClick={toggleRightPanel}
              className="fixed right-4 top-20 h-12 w-12 bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition z-20 rounded-lg shadow-lg"
              title="Open sidebar"
            >
              &lt;
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
