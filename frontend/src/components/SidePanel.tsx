import React from 'react'
import { useAnatomyStore } from '../stores/anatomy'

export const SidePanel: React.FC = () => {
  const { selectedStructure } = useAnatomyStore()

  if (!selectedStructure) {
    return (
      <div className="w-80 bg-white shadow-lg rounded-lg p-6 flex items-center justify-center">
        <p className="text-gray-500 text-center">
          Select a structure on the map to view details
        </p>
      </div>
    )
  }

  return (
    <div className="w-80 bg-white shadow-lg rounded-lg p-6 overflow-y-auto max-h-screen">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {selectedStructure.name}
          </h2>
          <p className="text-gray-600 italic">{selectedStructure.latin_name}</p>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">System</h3>
          <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {selectedStructure.system}
          </span>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Description
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {selectedStructure.description}
          </p>
        </div>

        {selectedStructure.coordinates && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Coordinates
            </h3>
            <div className="bg-gray-50 rounded p-2 text-xs font-mono text-gray-600">
              <p>X: {selectedStructure.coordinates.x}</p>
              <p>Y: {selectedStructure.coordinates.y}</p>
              <p>Width: {selectedStructure.coordinates.width}</p>
              <p>Height: {selectedStructure.coordinates.height}</p>
            </div>
          </div>
        )}

        {selectedStructure.svg_path_id && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              SVG Path ID
            </h3>
            <p className="text-gray-600 text-sm font-mono bg-gray-50 rounded p-2">
              {selectedStructure.svg_path_id}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
