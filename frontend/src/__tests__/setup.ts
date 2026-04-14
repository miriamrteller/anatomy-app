/**
 * TEST SETUP UTILITIES
 * Provides helpers for testing with real SVG file and bone IDs
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { useAnatomyStore } from '../stores/anatomy'
import { SystemEnum, StructureCategory } from '../types'

// Get __dirname from import.meta.url (ESM compatibility)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Load the real skeleton.svg file from disk
 */
export function loadRealSkeletonSvg(): string {
  const skeletonSvgPath = path.join(__dirname, '../../public/svgs/skeleton.svg')
  console.log('📂 Trying to load skeleton.svg from:', skeletonSvgPath)

  if (!fs.existsSync(skeletonSvgPath)) {
    throw new Error(`❌ skeleton.svg not found at: ${skeletonSvgPath}`)
  }

  const content = fs.readFileSync(skeletonSvgPath, 'utf-8')
  console.log('✓ Loaded skeleton.svg, length:', content.length)
  return content
}

/**
 * Load verified bone IDs from bone-ids.txt
 */
export function loadVerifiedBoneIds(): string[] {
  const boneIdsPath = path.join(__dirname, '../../public/svgs/bone-ids.txt')
  console.log('📂 Trying to load bone-ids.txt from:', boneIdsPath)

  if (!fs.existsSync(boneIdsPath)) {
    throw new Error(`❌ bone-ids.txt not found at: ${boneIdsPath}`)
  }

  const ids = fs.readFileSync(boneIdsPath, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
  
  console.log(`✓ Loaded ${ids.length} bone IDs`)
  return ids
}

/**
 * Get the first verified bone ID (for predictable testing)
 */
export function getFirstVerifiedBoneId(): string {
  const allBoneIds = loadVerifiedBoneIds()

  if (allBoneIds.length === 0) {
    throw new Error(`❌ bone-ids.txt is empty! No bone IDs available.`)
  }

  const firstBoneId = allBoneIds[0]
  console.log(`✓ Using bone ID for testing: "${firstBoneId}"`)

  return firstBoneId
}

/**
 * Create mock systems object { SKELETAL: svgContent, ... }
 */
export function createMockSystems() {
  const skeletonSvg = loadRealSkeletonSvg()

  return {
    SKELETAL: skeletonSvg,       // Real SVG content
    MUSCULAR: '',                // Not available yet
    VASCULAR: '',
    NERVOUS: '',
    ENDOCRINE: ''
  }
}

/**
 * Create expected Structure object for a given bone ID
 */
export function createExpectedStructure(boneId: string) {
  return {
    id: 'database-uuid-here',
    name: `${boneId} Structure`,
    latinName: boneId,
    system: 'SKELETAL',
    category: 'BONE',
    svgPaths: [
      {
        id: boneId,
        viewBox: undefined,
        x: undefined,
        y: undefined,
        width: undefined,
        height: undefined
      }
    ],
    coordinates: undefined,
    aliases: [],
    description: `This is the ${boneId} bone`,
    metadata: {}
  }
}

/**
 * Pre-populate store with test structures so component can lookup by path ID
 * This simulates what would normally come from the API fetch
 */
export function populateStoreWithTestData(): void {
  const boneIds = loadVerifiedBoneIds()

  // Create test structures for all verified bone IDs
  const structures = boneIds.map(boneId => ({
    id: `test-uuid-${boneId}`,
    name: boneId,
    latinName: boneId,
    system: SystemEnum.SKELETAL,
    category: StructureCategory.BONE,
    svgPaths: [
      {
        id: boneId,
        viewBox: undefined,
        x: undefined,
        y: undefined,
        width: undefined,
        height: undefined
      }
    ],
    coordinates: undefined,
    aliases: [],
    description: `Test structure for ${boneId}`,
    metadata: {}
  }))

  // Build SVG path → structure lookup map
  const pathMap: Record<string, any> = {}
  structures.forEach(struct => {
    struct.svgPaths.forEach((svgPath: any) => {
      pathMap[svgPath.id] = struct
    })
  })

  // Populate the Zustand store
  const store = useAnatomyStore.getState()
  store.setStructures(SystemEnum.SKELETAL, structures)
  store.setSvgPathToStructure(SystemEnum.SKELETAL, pathMap)
}

/**
 * Mock fetch for API calls during tests
 * Always returns successful structure data for any lookup request
 */
export function setupFetchMock(): void {
  const boneIds = loadVerifiedBoneIds()

  ;(global as any).fetch = async (url: string) => {
    // Log all fetch calls for debugging
    console.log('FETCH MOCK:', url)

    // If this is a structure lookup request, return data
    if (url.includes('/api/structures/by-svg-path/lookup')) {
      const urlObj = new URL(url, 'http://localhost')
      const pathIds = urlObj.searchParams.get('pathIds')?.split(',') || []
      const system = urlObj.searchParams.get('system') || 'SKELETAL'

      console.log('MOCKING LOOKUP:', { pathIds, system })

      // Return ANY matching bone (just use first one)
      const structure = {
        id: `test-uuid-${pathIds[0] || 'unknown'}`,
        name: pathIds[0] || 'Unknown',
        latinName: pathIds[0] || 'Unknown',
        system,
        category: 'BONE',
        svgPaths: [{ id: pathIds[0] || 'unknown' }],
        coordinates: undefined,
        aliases: [],
        description: `Test structure`,
        metadata: {}
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [structure], count: 1 })
      } as any
    }

    // Log unmocked requests but don't fail
    console.log('UNMOCKED FETCH:', url)
    return {
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' })
    } as any
  }
}
