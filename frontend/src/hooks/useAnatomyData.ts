import { useEffect, useState } from 'react'
import { useAnatomyStore } from '../stores/anatomy'
import { Structure, SystemEnum } from '../types'

interface BulkResponse {
  data: Structure[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

/**
 * useAnatomyData Hook
 * Manages fetching, caching, and looking up anatomical structures by SVG path ID
 *
 * On mount:
 * - Fetches all structures for SKELETAL system (preload for instant interactions)
 * - Caches structures in Zustand store
 * - Builds lookup map: SVG path ID → Structure (O(1) instant lookup)
 *
 * Usage:
 * const { getStructureByPathId, loadingState } = useAnatomyData()
 * const structure = getStructureByPathId('FootLeft', 'SKELETAL') // Instant, no API call
 */
export function useAnatomyData() {
  const {
    structures,
    setStructures,
    svgPathToStructure,
    setSvgPathToStructure,
    loadingState,
    setLoadingState,
    error,
    setError,
  } = useAnatomyStore()

  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  /**
   * Fetch structures for a given system and cache them
   * @param system - The anatomical system to fetch (SKELETAL, MUSCULAR, etc.)
   */
  const fetchStructures = async (system: SystemEnum) => {
    // Skip if already loaded
    if (structures[system]?.length > 0) {
      return
    }

    setLoadingState(system, 'LOADING')
    try {
      const response = await fetch(
        `/api/structures/bulk/query?system=${system}&limit=1000&offset=0`
      )
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: BulkResponse = await response.json()

      // Store structures in Zustand
      setStructures(system, data.data)

      // Build SVG path ID → structure lookup map for instant O(1) lookup
      const pathMap: Record<string, Structure> = {}
      data.data.forEach((struct) => {
        struct.svgPaths.forEach((svgPath) => {
          pathMap[svgPath.id] = struct
        })
      })
      setSvgPathToStructure(system, pathMap)

      setLoadingState(system, 'IDLE')
      console.log(`✓ Loaded ${data.data.length} structures for ${system} system`)
      console.log(`✓ Built lookup map with ${Object.keys(pathMap).length} SVG path IDs:`, Object.keys(pathMap).slice(0, 10))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(system, message)
      setLoadingState(system, 'ERROR')
      console.error(`Failed to fetch ${system} structures:`, err)
    }
  }

  /**
   * Get a structure by SVG path ID (instant lookup from cache)
   * @param pathId - The SVG element ID (e.g., "FootLeft", "TarsalsLeft")
   * @param system - The anatomical system (SKELETAL, MUSCULAR, etc.)
   * @returns Structure object or undefined if not found
   */
  const getStructureByPathId = (
    pathId: string,
    system: SystemEnum
  ): Structure | undefined => {
    const pathMap = svgPathToStructure[system]
    if (!pathMap) {
      console.warn(`No path map found for system ${system}`)
      return undefined
    }
    return pathMap[pathId]
  }

  /**
   * Fetch structures for a specific system (useful for switching to MUSCULAR, etc.)
   * @param system - The anatomical system to load
   */
  const loadSystem = async (system: SystemEnum) => {
    await fetchStructures(system)
  }

  /**
   * On component mount: fetch SKELETAL system (skeleton is the first/most important system)
   */
  useEffect(() => {
    if (initialLoadComplete) return

    const loadInitialData = async () => {
      console.log('🔄 Initializing anatomy data...')
      await fetchStructures(SystemEnum.SKELETAL)
      setInitialLoadComplete(true)
    }

    loadInitialData()
  }, [])

  return {
    structures,
    loadingState,
    error,
    getStructureByPathId,
    loadSystem,
    fetchStructures,
    initialLoadComplete,
  }
}
