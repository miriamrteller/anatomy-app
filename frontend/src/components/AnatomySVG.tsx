import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useAnatomyStore } from '../stores/anatomy'
import { useAnatomyData } from '../hooks/useAnatomyData'
import { Structure, SystemEnum } from '../types'

interface AnatomySVGProps {
  systems: Record<SystemEnum, string>
}

export const AnatomySVG: React.FC<AnatomySVGProps> = ({ systems }) => {
  const svgRefsMap = useRef<Record<SystemEnum, HTMLDivElement | null>>({} as any)
  const [error, setError] = useState<string | null>(null)

  const {
    setSelectedStructure,
    setHoveredStructure,
    visibleSystems,
    highlightedIds,
    clearHighlight,
  } = useAnatomyStore()

  // NEW: Use the anatomy data hook for instant cache lookups
  const { getStructureByPathId, initialLoadComplete, loadingState } = useAnatomyData()

  /**
   * Get structure by SVG path ID (instant cache lookup, no API call)
   * Falls back to multiple systems if not found in primary system
   */
  const getStructureFromCache = (pathId: string): Structure | undefined => {
    // Try each visible system
    for (const system of visibleSystems) {
      const structure = getStructureByPathId(pathId, system)
      if (structure) {
        console.log(`✓ Found structure in cache (${system}):`, structure.name, `for pathId:`, pathId)
        return structure
      }
    }
    // If not found in visible systems, search all systems
    for (const system of Object.values(SystemEnum)) {
      const structure = getStructureByPathId(pathId, system)
      if (structure) {
        console.log(`✓ Found structure in fallback cache (${system}):`, structure.name, `for pathId:`, pathId)
        return structure
      }
    }
    console.warn(`✗ Structure not found in cache for pathId: "${pathId}", visible systems:`, Array.from(visibleSystems))
    return undefined
  }

  const attachEventListeners = useCallback((): void => {
    // Skip if data not yet loaded
    if (!initialLoadComplete) {
      console.log('⏳ Waiting for anatomy data to load...')
      return
    }

    // Attach listeners to all visible system SVGs
    Object.values(SystemEnum).forEach((system) => {
      const systemContainer = svgRefsMap.current[system]
      if (!systemContainer) return

      const svg = systemContainer.querySelector('svg')
      if (!svg) return

      const paths = svg.querySelectorAll('path[id]')

      paths.forEach((path) => {
        // Get the meaningful ID from parent <g> element, not the path itself
        const pathElement = path as SVGPathElement
        let groupElement = pathElement.parentElement as SVGGElement | null
        let groupId: string | null = null

        // Walk up the DOM to find a <g> with an ID that exists in our cache
        // (Skip generic IDs like g123, g1511, etc. and find the actual bone group)
        while (groupElement && groupElement !== svg) {
          if (groupElement.tagName === 'g' || groupElement.tagName === 'G') {
            const id = groupElement.getAttribute('id')
            if (id && !id.match(/^g\d+$/)) {
              // Found a non-generic ID (not just g followed by numbers)
              groupId = id
              console.log(`✓ Found anatomical group ID: "${groupId}"`)
              break
            }
          }
          groupElement = groupElement.parentElement as SVGGElement | null
        }

        if (!groupId) {
          console.log(`⚠ Skipping path - no anatomical parent group ID found (only found generic g### IDs)`)
          return // Skip paths without a meaningful parent group ID
        }

        pathElement.style.cursor = 'pointer'
        pathElement.style.transition = 'all 200ms ease'
        pathElement.style.transformOrigin = 'center'

        // Clone to remove old listeners
        const newPath = pathElement.cloneNode(true) as SVGPathElement
        pathElement.parentNode?.replaceChild(newPath, pathElement)

        const pathId = newPath.getAttribute('id')
        const updatedPath = svg.querySelector(`path[id="${pathId}"]`) as SVGPathElement
        if (!updatedPath) return

        // INSTANT: mouseenter - lookup from cache using parent group ID (no API call)
        updatedPath.addEventListener('mouseenter', () => {
          updatedPath.style.fillOpacity = '0.8'
          updatedPath.style.filter = 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))'

          const structure = getStructureFromCache(groupId)
          if (structure) {
            setHoveredStructure(structure)
          } else {
            console.warn(`Structure not found for group ID: ${groupId}`)
          }
        })

        // mouseleave
        updatedPath.addEventListener('mouseleave', () => {
          updatedPath.style.fillOpacity = '0.5'
          updatedPath.style.filter = 'none'
          setHoveredStructure(null)
        })

        // INSTANT: click - lookup from cache using parent group ID (no API call)
        updatedPath.addEventListener('click', (e) => {
          e.stopPropagation()

          const structure = getStructureFromCache(groupId)
          if (structure) {
            setSelectedStructure(structure)
          } else {
            setError(`Structure not found for: ${groupId}`)
            setSelectedStructure(null)
          }
        })
      })
    })
  }, [initialLoadComplete, getStructureByPathId, setSelectedStructure, setHoveredStructure])

  const isSystemVisible = (path: SVGPathElement): boolean => {
    const dataSystem = path.getAttribute('data-system')
    if (!dataSystem) return true
    return visibleSystems.has(dataSystem as any)
  }

  const updatePathVisibility = (): void => {
    Object.values(SystemEnum).forEach((system) => {
      const systemContainer = svgRefsMap.current[system]
      if (!systemContainer) return

      const svg = systemContainer.querySelector('svg')
      if (!svg) return

      const paths = svg.querySelectorAll('path')
      paths.forEach((path) => {
        const isVisible = isSystemVisible(path)
        path.style.visibility = isVisible ? 'visible' : 'hidden'
      })
    })
  }

  React.useEffect(() => {
    updatePathVisibility()
  }, [visibleSystems])

  React.useEffect(() => {
    Object.values(SystemEnum).forEach((system) => {
      const systemContainer = svgRefsMap.current[system]
      if (!systemContainer) return

      const svg = systemContainer.querySelector('svg')
      if (!svg) return

      const paths = svg.querySelectorAll('path')
      paths.forEach((path) => {
        const pathId = path.getAttribute('id')
        if (pathId && highlightedIds.has(pathId)) {
          path.style.animation = 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          path.style.fillOpacity = '0.8'
        }
      })
    })
  }, [highlightedIds])

  useEffect(() => {
    attachEventListeners()
  }, [systems, attachEventListeners, initialLoadComplete])

  // Show loading state while data is being fetched
  if (!initialLoadComplete || loadingState[SystemEnum.SKELETAL] === 'LOADING') {
    return (
      <div className="relative w-full h-full bg-white rounded-lg shadow flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-2">Loading anatomical data...</div>
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-white rounded-lg shadow">
      {error && (
        <div className="absolute top-4 left-4 bg-red-100 text-red-700 px-4 py-2 rounded z-50">
          {error}
        </div>
      )}

      {/* Main SVG container - render all systems as overlays */}
      <div className="absolute inset-0">
        {Object.entries(systems).map(([system]) => (
          <div
            key={system}
            ref={(el) => {
              if (el) svgRefsMap.current[system as SystemEnum] = el
            }}
            className="w-full h-full"
            style={{
              opacity: visibleSystems.has(system as SystemEnum) ? 1 : 0,
              pointerEvents: visibleSystems.has(system as SystemEnum) ? 'auto' : 'none',
              transition: 'opacity 200ms ease',
            }}
          >
            <div
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: systems[system as SystemEnum] }}
              onClick={() => clearHighlight()}
            />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            fill-opacity: 0.8;
          }
          50% {
            fill-opacity: 1;
          }
        }
        svg {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        path {
          pointer-events: auto;
        }
      `}</style>
    </div>
  )
}
