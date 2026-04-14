import React, { useState, useCallback } from 'react'
import { useAnatomyStore } from '../stores/anatomy'
import { Structure } from '../types'

interface AnatomySVGProps {
  svgContent: string
}

export const AnatomySVG: React.FC<AnatomySVGProps> = ({ svgContent }) => {
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

  const handlePathMouseEnter = async (
    pathId: string,
    element: SVGPathElement
  ): Promise<void> => {
    // Visual feedback: scale and highlight
    element.style.fillOpacity = '0.8'
    element.style.filter = 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))'

    // Fetch and display bone data on hover
    const structure = await fetchStructureData(pathId)
    if (structure) {
      setHoveredStructure(structure)
    }
  }

  const handlePathMouseLeave = (element: SVGPathElement): void => {
    element.style.fillOpacity = '0.5'
    element.style.filter = 'none'
    setHoveredStructure(null)
  }

  const handlePathClick = async (pathId: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const structure = await fetchStructureData(pathId)
      if (structure) {
        setSelectedStructure(structure)
      } else {
        setError('Structure not found')
        setSelectedStructure(null)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSVGLoad = (event: React.SyntheticEvent<SVGSVGElement>): void => {
    const svg = event.currentTarget
    const paths = svg.querySelectorAll('path')

    paths.forEach((path) => {
      const pathId = path.getAttribute('id')
      if (pathId) {
        path.style.cursor = 'pointer'
        path.style.transition = 'all 200ms ease'
        path.style.transformOrigin = 'center'

        const pathElement = path as SVGPathElement

        path.addEventListener('mouseenter', () => {
          void handlePathMouseEnter(pathId, pathElement)
        })

        path.addEventListener('mouseleave', () => {
          handlePathMouseLeave(pathElement)
        })

        path.addEventListener('click', (e) => {
          e.stopPropagation()
          void handlePathClick(pathId)
        })
      }
    })
  }

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
      <svg
        viewBox="0 0 1000 1000"
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: svgContent }}
        onLoad={handleSVGLoad}
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
