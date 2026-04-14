import React from 'react'
import { useAnatomyStore } from '../stores/anatomy'

export const SidePanel: React.FC = () => {
  const { selectedStructure, hoveredStructure } = useAnatomyStore()

  // Show hovered data if available, otherwise selected
  const activeStructure = hoveredStructure || selectedStructure
  const isHovered = hoveredStructure !== null

  if (!activeStructure) {
    return (
      <div className="w-80 bg-white shadow-lg rounded-lg p-6 flex items-center justify-center">
        <p className="text-gray-500 text-center">
          Hover or click a structure to view details
        </p>
      </div>
    )
  }

  return (
    <div
      className={`w-80 bg-white shadow-lg rounded-lg p-6 overflow-y-auto max-h-screen transition-all ${
        isHovered ? 'border-2 border-blue-400 bg-blue-50' : 'border-2 border-gray-200'
      }`}
    >
      <div className="space-y-4">
        {isHovered && (
          <div className="bg-blue-100 px-3 py-1 rounded text-xs text-blue-700 font-semibold mb-2">
            🔍 Hovering
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {activeStructure.name}
          </h2>
          <p className="text-gray-600 italic">{activeStructure.latin_name}</p>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">System</h3>
          <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {activeStructure.system}
          </span>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Description
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {activeStructure.description}
          </p>
        </div>

        {activeStructure.coordinates && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Coordinates
            </h3>
            <div className="bg-gray-50 rounded p-2 text-xs font-mono text-gray-600">
              <p>X: {activeStructure.coordinates.x}</p>
              <p>Y: {activeStructure.coordinates.y}</p>
              <p>Width: {activeStructure.coordinates.width}</p>
              <p>Height: {activeStructure.coordinates.height}</p>
            </div>
          </div>
        )}

        {activeStructure.svg_path_id && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              SVG Path ID
            </h3>
            <p className="text-gray-600 text-sm font-mono bg-gray-50 rounded p-2">
              {activeStructure.svg_path_id}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
