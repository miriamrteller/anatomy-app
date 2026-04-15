import { useEffect, useState } from 'react'

export interface SvgIndexData {
  viewBox?: string
  boundingBox?: any
}

export interface SvgIndex {
  _version: string
  [system: string]: SvgIndexData | string | Record<string, SvgIndexData>
}

/**
 * useSvgIndex Hook
 * Loads and manages the SVG index from /public/svgs-index.json
 * 
 * The SVG index contains:
 * - _version: ISO timestamp + hash for cache invalidation
 * - [system]: { [pathId]: { viewBox, boundingBox } }
 * 
 * This allows instant validation that a pathId exists in the SVG
 * without needing to parse SVG files or hit the database.
 */
export function useSvgIndex() {
  const [svgIndex, setSvgIndex] = useState<SvgIndex>({ _version: 'not-loaded' })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSvgIndex = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/svgs-index.json')

        if (!response.ok) {
          throw new Error(
            `Failed to load SVG index (HTTP ${response.status}). ` +
            `Run: npm run extract-svg`
          )
        }

        const data: SvgIndex = await response.json()
        setSvgIndex(data)
        console.log('✓ SVG index loaded:', data._version)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        console.error('✗ Failed to load SVG index:', message)
      } finally {
        setIsLoading(false)
      }
    }

    loadSvgIndex()
  }, [])

  /**
   * Get metadata for a specific path ID in a system
   * @param pathId - The SVG element ID (e.g., "FootLeft", "Femur")
   * @param system - The anatomical system (e.g., "SKELETAL")
   * @returns { viewBox, boundingBox } or undefined if not found
   */
  const getPathMetadata = (pathId: string, system: string) => {
    const systemData = svgIndex[system]
    if (typeof systemData === 'string') {
      return undefined
    }
    return (systemData as Record<string, SvgIndexData>)?.[pathId]
  }

  /**
   * Validate that all path IDs exist in the SVG index for a given system
   * @param pathIds - Array of SVG element IDs
   * @param system - The anatomical system
   * @returns { valid: found IDs, missing: not found IDs }
   */
  const validatePathIds = (pathIds: string[], system: string) => {
    const systemPaths = svgIndex[system]
    const systemPathsObj = typeof systemPaths === 'string' ? {} : (systemPaths as Record<string, SvgIndexData>)
    
    return {
      valid: pathIds.filter((id) => id in systemPathsObj),
      missing: pathIds.filter((id) => !(id in systemPathsObj)),
    }
  }

  return {
    svgIndex,
    isLoading,
    error,
    getPathMetadata,
    validatePathIds,
  }
}
