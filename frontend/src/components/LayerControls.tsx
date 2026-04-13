import React from 'react'
import { useAnatomyStore } from '../stores/anatomy'
import { SystemEnum } from '../types'

export const LayerControls: React.FC = () => {
  const { visibleSystems, toggleSystem, showAllSystems, hideAllSystems } =
    useAnatomyStore()

  const systems = Object.values(SystemEnum)

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Body Systems</h2>
        <div className="space-x-2">
          <button
            onClick={showAllSystems}
            className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
          >
            Show All
          </button>
          <button
            onClick={hideAllSystems}
            className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
          >
            Hide All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {systems.map((system) => (
          <button
            key={system}
            onClick={() => toggleSystem(system)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              visibleSystems.has(system)
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-200 text-gray-600 shadow'
            }`}
          >
            <span className="flex items-center justify-center">
              {visibleSystems.has(system) ? '✓' : '○'} {system}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        {visibleSystems.size} of {systems.length} systems visible
      </div>
    </div>
  )
}
