import React, { useState, useMemo } from 'react'
import { useAnatomyStore } from '../stores/anatomy'
import { SystemEnum } from '../types'
import { useSystemSVGs } from '../hooks/useSystemSVGs'

export const HeaderDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)

  const {
    visibleSystems,
    toggleSystem,
    showAllSystems,
    hideAllSystems,
  } = useAnatomyStore()

  const { systems } = useSystemSVGs()

  const availableSystems = useMemo(() => {
    return Object.values(SystemEnum).filter((system) => {
      const sysData = systems[system]
      const isValid =
        sysData &&
        sysData.content.length > 0 &&
        !sysData.error &&
        sysData.content.includes('<svg')
      return isValid
    })
  }, [systems])

  const handleShowAll = () => {
    showAllSystems()
  }

  const handleHideAll = () => {
    hideAllSystems()
  }

  const handleToggleSystem = (system: SystemEnum) => {
    toggleSystem(system)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
      >
        Layers {isOpen ? '▼' : '▶'}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <button
                onClick={handleShowAll}
                className="flex-1 px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
              >
                Show All
              </button>
              <button
                onClick={handleHideAll}
                className="flex-1 px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
              >
                Hide All
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {availableSystems.map((system) => (
                <button
                  key={system}
                  onClick={() => handleToggleSystem(system)}
                  className={`px-3 py-2 rounded text-sm font-medium transition ${
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

            <div className="text-xs text-gray-500 pt-2 border-t">
              {visibleSystems.size} of {availableSystems.length} systems visible
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
