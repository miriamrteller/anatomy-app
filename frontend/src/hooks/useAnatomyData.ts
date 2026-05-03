// DISABLED: These imports/types are no longer used
// import { useEffect, useState } from 'react'
// import { useAnatomyStore } from '../stores/anatomy'
// import { Structure, SystemEnum } from '../types'
import { useSvgIndex } from './useSvgIndex'

// interface BulkResponse {
//   success: boolean
//   data: Structure[]
//   count: number
//   total: number
//   limit: number
//   offset: number
// }

/**
 * useAnatomyData Hook
 * Manages fetching, caching, and looking up anatomical structures by SVG path ID
 *
 * On mount:
 * - Fetches all structures for SKELETAL system (preload for instant interactions)
 * - Caches structures in Zustand store
 * - Builds lookup map: SVG path ID → Structure (O(1) instant lookup)
 * - Validates all svgPathIds against SVG index (catches sync errors early)
 *
 * Usage:
 * const { getStructureByPathId, loadingState } = useAnatomyData()
 * const structure = getStructureByPathId('FootLeft', 'SKELETAL') // Instant, no API call
 */
export function useAnatomyData() {
  // DISABLED: useAnatomyData hook - system-based caching removed for performance
  // This hook tried to fetch and cache structures by system, but that approach
  // caused multiple API calls and was too heavy. Now using direct API lookups.
  
  const { validatePathIds } = useSvgIndex()
  // const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  /**
   * Fetch structures for a given system and cache them
   * @param system - The anatomical system to fetch (SKELETAL, MUSCULAR, etc.)
   * DISABLED: This functionality is no longer used
   */
  // const fetchStructures = async (system: SystemEnum) => { ... }

  return {
    structures: {},
    loadingState: {},
    error: {},
    getStructureByPathId: () => undefined,
    loadSystem: async () => {},
    fetchStructures: async () => {},
    initialLoadComplete: true,
    validatePathIds,
  }
}

