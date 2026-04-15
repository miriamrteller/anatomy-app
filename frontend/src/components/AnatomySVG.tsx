import React, { useCallback, useRef, useEffect, useState } from 'react'
import { useAnatomyStore } from '../stores/anatomy'
import { SystemEnum } from '../types'

interface AnatomySVGProps {
  systems: Record<SystemEnum, string>
}

export const AnatomySVG: React.FC<AnatomySVGProps> = ({ systems }) => {
  const svgRefsMap = useRef<Record<SystemEnum, HTMLDivElement | null>>({} as any)
  const [isReady, setIsReady] = useState(false)

  const {
    setSelectedStructure,
    setHoveredStructure,
    visibleSystems,
    highlightedIds,
    clearHighlight,
  } = useAnatomyStore()

  const attachEventListeners = useCallback((): void => {
    // Attach listeners to all visible system SVGs
    Object.values(SystemEnum).forEach((system) => {
      const systemContainer = svgRefsMap.current[system]
      if (!systemContainer) return

      const svg = systemContainer.querySelector('svg')
      if (!svg) return

      const paths = svg.querySelectorAll('path')

      paths.forEach((path) => {
        const pathElement = path as SVGPathElement
        let groupElement = pathElement.parentElement as SVGGElement | null
        let groupId: string | null = null

        // Walk up the DOM to find a <g> with an ID that exists in our data
        // (Skip generic IDs like g123, g1511, etc. and find the actual bone group)
        while (groupElement && groupElement !== svg) {
          if (groupElement.tagName === 'g' || groupElement.tagName === 'G') {
            const id = groupElement.getAttribute('id')
            if (id && !id.match(/^g\d+$/)) {
              // Found a non-generic ID (not just g followed by numbers)
              groupId = id
              break
            }
          }
          groupElement = groupElement.parentElement as SVGGElement | null
        }

        if (!groupId) {
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

        // mouseenter - fetch structure data
        updatedPath.addEventListener('mouseenter', async () => {
          updatedPath.style.fillOpacity = '0.8'
          updatedPath.style.filter = 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))'

          try {
            const response = await fetch(`/api/structures/by-svg-path/lookup?pathIds=${groupId}&system=${system}`)
            if (response.ok) {
              const data = await response.json()
              if (data.data && data.data.length > 0) {
                setHoveredStructure(data.data[0])
              }
            }
          } catch (err) {
            console.error('Error fetching structure:', err)
          }
        })

        // mouseleave
        updatedPath.addEventListener('mouseleave', () => {
          updatedPath.style.fillOpacity = '0.5'
          updatedPath.style.filter = 'none'
          setHoveredStructure(null)
        })

        // click
        updatedPath.addEventListener('click', async (e) => {
          e.stopPropagation()

          try {
            const response = await fetch(`/api/structures/by-svg-path/lookup?pathIds=${groupId}&system=${system}`)
            if (response.ok) {
              const data = await response.json()
              if (data.data && data.data.length > 0) {
                setSelectedStructure(data.data[0])
              }
            }
          } catch (err) {
            console.error('Error fetching structure:', err)
          }
        })
      })
    })
  }, [setSelectedStructure, setHoveredStructure])

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

  useEffect(() => {
    updatePathVisibility()
  }, [visibleSystems])

  useEffect(() => {
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
    if (isReady) {
      attachEventListeners()
    }
  }, [systems, attachEventListeners, isReady])

  // Wait a moment for SVG to render, then attach listeners
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="relative w-full h-full bg-white rounded-lg shadow">
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
