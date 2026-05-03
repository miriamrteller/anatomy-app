import React from 'react'
import { useAnatomyStore } from '../stores/anatomy'
import { getSide } from '../lib/groupStructures'

interface SidePanelProps {
  onToggle?: () => void
}

/**
 * Helper: Check if a structure has bilateral pair highlighted
 * Returns badge info for display
 */
function isBilateralHighlighted(
  highlightedIds: Set<string>,
  currentSvgIds: string[]
): boolean {
  // Check if any SVG ID from this structure is highlighted
  return currentSvgIds.some((id) => highlightedIds.has(id))
}

export const SidePanel: React.FC<SidePanelProps> = () => {
  const { interaction, isPanelMinimized, togglePanelMinimize, highlightedIds } =
    useAnatomyStore()

  // Show structure from interaction if available
  const activeStructure = interaction.structure
  const isHovered = interaction.type === 'hover'

  // Check if both left and right versions are highlighted
  const isBilateral = activeStructure
    ? isBilateralHighlighted(highlightedIds, activeStructure.svgPathIds || [])
    : false
  
  const side = activeStructure ? getSide(activeStructure.name) : null

  return (
    <div className="h-full bg-white shadow-lg rounded-lg overflow-hidden flex flex-col">
      {/* Header with toggle button */}
      <div className="flex items-center justify-between h-12 px-3 border-b border-gray-200 flex-shrink-0">
        <button
          onClick={togglePanelMinimize}
          className="text-gray-600 hover:text-blue-600 font-bold text-lg transition"
          title="Toggle panel width"
        >
          {isPanelMinimized ? '<' : '>'}
        </button>
        {!isPanelMinimized && isHovered && <span className="text-xs text-blue-700 font-semibold ml-auto">🔍 Hovering</span>}
      </div>
      
      {/* Content */}
      {!isPanelMinimized ? (
        <div className="flex-1 overflow-y-auto p-4">
          {!activeStructure ? (
            <p className="text-gray-500 text-sm">
              Hover or click a structure to view details
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">
                    {activeStructure.name}
                  </h2>
                  {isBilateral && side && (
                    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-semibold">
                      {side === 'Left' || side === 'Right' ? side : 'Bilateral'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 italic">{activeStructure.latinName}</p>
              </div>

              <div className="border-t pt-3">
                <h3 className="text-xs font-semibold text-gray-700 mb-1">System</h3>
                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                  {activeStructure.system}
                </span>
              </div>

              <div className="border-t pt-3">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">
                  Description
                </h3>
                <p className="text-gray-600 text-xs leading-relaxed">
                  {activeStructure.description}
                </p>
              </div>

              {activeStructure.coordinates && (
                <div className="border-t pt-3">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">
                    Coordinates
                  </h3>
                  <div className="bg-gray-50 rounded p-2 text-xs font-mono text-gray-600 space-y-1">
                    <p>X: {activeStructure.coordinates.x}</p>
                    <p>Y: {activeStructure.coordinates.y}</p>
                    <p>W: {activeStructure.coordinates.width}</p>
                    <p>H: {activeStructure.coordinates.height}</p>
                  </div>
                </div>
              )}

              {activeStructure.svgPathIds && activeStructure.svgPathIds.length > 0 && (
                <div className="border-t pt-3">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">
                    SVG Paths ({activeStructure.svgPathIds.length})
                  </h3>
                  <div className="text-gray-600 text-xs font-mono bg-gray-50 rounded p-2 space-y-1">
                    {activeStructure.svgPathIds.map((pathId, idx) => (
                      <p key={idx}>{pathId}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-start pt-4 space-y-2">
          {activeStructure && (
            <div className="text-xl" title={`${activeStructure.name}`}>
              ℹ️
            </div>
          )}
        </div>
      )}
    </div>
  )
}
