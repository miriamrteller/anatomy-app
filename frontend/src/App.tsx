import React from 'react'
import { AnatomySVG } from './components/AnatomySVG'
import { SidePanel } from './components/SidePanel'
import { LayerControls } from './components/LayerControls'

// Sample SVG with the necessary data-system attributes
// You'll replace this with the actual Wikimedia skeleton SVG
const sampleSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800">
  <!-- Skeletal System Group -->
  <g id="skeleton" data-system="SKELETAL">
    <path id="skull" data-system="SKELETAL" d="M 200 50 Q 230 50 240 80 Q 240 110 200 110 Q 160 110 160 80 Q 170 50 200 50" fill="none" stroke="black" stroke-width="2"/>
    <path id="spine" data-system="SKELETAL" d="M 200 110 L 200 400" fill="none" stroke="black" stroke-width="3"/>
    <path id="femur-left" data-system="SKELETAL" d="M 160 400 L 140 550" fill="none" stroke="black" stroke-width="2"/>
    <path id="femur-right" data-system="SKELETAL" d="M 240 400 L 260 550" fill="none" stroke="black" stroke-width="2"/>
  </g>
  
  <!-- Muscular System Group -->
  <g id="muscles" data-system="MUSCULAR" opacity="0.3">
    <path id="bicep-left" data-system="MUSCULAR" d="M 140 200 Q 120 150 130 100" fill="none" stroke="red" stroke-width="2"/>
  </g>
</svg>
`.trim()

export function App(): React.ReactElement {
  return (
    <div className="w-full h-screen bg-gray-100 p-4">
      <div className="h-full flex flex-col gap-4">
        {/* Header */}
        <div className="bg-white shadow-md rounded-lg p-4">
          <h1 className="text-3xl font-bold text-gray-900">Anatomy App</h1>
          <p className="text-gray-600">Interactive anatomical structure explorer</p>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex gap-4">
          {/* Left: SVG Canvas */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex-1 bg-white rounded-lg shadow-md overflow-hidden">
              <AnatomySVG svgContent={sampleSVG} />
            </div>
            <LayerControls />
          </div>

          {/* Right: Side Panel */}
          <SidePanel />
        </div>
      </div>
    </div>
  )
}

export default App
