import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useAnatomyStore } from '../stores/anatomy'
import { Structure } from '../types'

interface AnatomySVGProps {
  svgContent: string
}

export const AnatomySVG: React.FC<AnatomySVGProps> = ({ svgContent }) => {
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const {
    setSelectedStructure,
    setHoveredStructure,
    visibleSystems,
    highlightedIds,
    clearHighlight,
  } = useAnatomyStore()

  const fetchStructureData = useCallback(
    async (pathId: string): Promise<Structure | null> => {
      try {
        const response = await fetch(
          `/api/structures?svg_path_id=${encodeURIComponent(pathId)}`
        )
        if (!response.ok) {
          throw new Error('Failed to fetch structure')
        }
        const data: Structure[] = await response.json()
        return data && data.length > 0 ? data[0] : null
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        return null
      }
    },
    []
  )

  const attachEventListeners = useCallback((): void => {
    if (!svgContainerRef.current) return

    const svg = svgContainerRef.current.querySelector('svg')
    if (!svg) return

    const paths = svg.querySelectorAll('path[id]')
    
    paths.forEach((path) => {
      const pathId = path.getAttribute('id')
      if (!pathId) return

      const pathElement = path as SVGPathElement
      pathElement.style.cursor = 'pointer'
      pathElement.style.transition = 'all 200ms ease'
      pathElement.style.transformOrigin = 'center'

      // Clone to remove old listeners
      const newPath = pathElement.cloneNode(true) as SVGPathElement
      pathElement.parentNode?.replaceChild(newPath, pathElement)

      const updatedPath = svg.querySelector(`path[id="${pathId}"]`) as SVGPathElement
      if (!updatedPath) return

      updatedPath.addEventListener('mouseenter', async () => {
        updatedPath.style.fillOpacity = '0.8'
        updatedPath.style.filter = 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))'
        const structure = await fetchStructureData(pathId)
        if (structure) {
          setHoveredStructure(structure)
        }
      })

      updatedPath.addEventListener('mouseleave', () => {
        updatedPath.style.fillOpacity = '0.5'
        updatedPath.style.filter = 'none'
        setHoveredStructure(null)
      })

      updatedPath.addEventListener('click', async (e) => {
        e.stopPropagation()
        setIsLoading(true)
        setError(null)
        try {
          const response = await fetch(
            `/api/structures?svg_path_id=${encodeURIComponent(pathId)}`
          )
          if (!response.ok) {
            throw new Error('Failed to fetch structure')
          }
          const data: Structure[] = await response.json()
          if (data && data.length > 0) {
            setSelectedStructure(data[0])
          } else {
            setError('Structure not found')
            setSelectedStructure(null)
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
          setError(errorMessage)
          setSelectedStructure(null)
        } finally {
          setIsLoading(false)
        }
      })
    })
  }, [fetchStructureData, setSelectedStructure, setHoveredStructure])

  const isSystemVisible = (path: SVGPathElement): boolean => {
    const dataSystem = path.getAttribute('data-system')
    if (!dataSystem) return true
    return visibleSystems.has(dataSystem as any)
  }

  const updatePathVisibility = (event: React.SyntheticEvent<SVGSVGElement>): void => {
    const svg = event.currentTarget
    const paths = svg.querySelectorAll('path')

    paths.forEach((path) => {
      const isVisible = isSystemVisible(path)
      path.style.visibility = isVisible ? 'visible' : 'hidden'
    })
  }

  React.useEffect(() => {
    const svg = document.querySelector('svg')
    if (svg) {
      updatePathVisibility({ currentTarget: svg } as any)
    }
  }, [visibleSystems])

  React.useEffect(() => {
    const svg = document.querySelector('svg')
    if (svg) {
      const paths = svg.querySelectorAll('path')
      paths.forEach((path) => {
        const pathId = path.getAttribute('id')
        if (pathId && highlightedIds.has(pathId)) {
          path.style.animation = 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          path.style.fillOpacity = '0.8'
        }
      })
    }
  }, [highlightedIds])

  useEffect(() => {
    attachEventListeners()
  }, [svgContent, attachEventListeners])

  return (
    <div className="relative w-full h-full bg-white rounded-lg shadow">
      {error && (
        <div className="absolute top-4 left-4 bg-red-100 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 rounded-lg">
          <div className="text-gray-600">Loading...</div>
        </div>
      )}
      <div
        ref={svgContainerRef}
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: svgContent }}
        onClick={() => clearHighlight()}
      />
      <style>{`
        @keyframes pulse {
          0%, 100% {
            fill-opacity: 0.8;
          }
          50% {
            fill-opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
