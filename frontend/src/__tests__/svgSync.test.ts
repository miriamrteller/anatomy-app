import { describe, it, expect } from 'vitest'

/**
 * SVG Sync Validation Tests
 * 
 * Comprehensive tests for DB ↔ SVG ↔ Frontend sync
 * 
 * These tests ensure:
 * 1. SVG index loads and has _version
 * 2. All structure paths exist in the SVG index
 * 3. No duplicate path ID claims (each SVG path belongs to exactly one structure)
 * 4. Path validation works correctly
 */

describe('SVG Sync Validation', () => {
  it('should load SVG index with _version', async () => {
    const response = await fetch('/svgs-index.json')
    expect(response.ok).toBe(true)
    
    const index = await response.json()
    expect(index._version).toBeDefined()
    expect(typeof index._version).toBe('string')
    expect(Object.keys(index).length).toBeGreaterThan(1) // At least _version + one system
  })

  it('should have valid SVG index structure', async () => {
    const response = await fetch('/svgs-index.json')
    const index = await response.json()

    // Remove _version to check systems
    const { _version, ...systems } = index
    expect(Object.keys(systems).length).toBeGreaterThan(0)

    // Each system should map to path IDs with metadata
    for (const paths of Object.values(systems)) {
      expect(typeof paths).toBe('object')
      if (Object.keys(paths as Record<string, any>).length > 0) {
        // At least one path ID has metadata with viewBox or boundingBox
        const pathMetadata = Object.values(paths as Record<string, any>)[0] as any
        expect(
          pathMetadata.viewBox !== undefined ||
          pathMetadata.boundingBox !== undefined
        ).toBe(true)
      }
    }
  })

  it('should validate all structure paths exist in index', async () => {
    const structs = await fetch('/api/structures/bulk/query?system=SKELETAL')
    expect(structs.ok).toBe(true)
    
    const { data } = await structs.json()
    expect(Array.isArray(data)).toBe(true)

    const indexResp = await fetch('/svgs-index.json')
    const index = await indexResp.json()

    let syncErrors: string[] = []

    for (const struct of data) {
      for (const pathId of struct.svgPathIds) {
        if (!index.SKELETAL || !index.SKELETAL[pathId]) {
          syncErrors.push(
            `Path "${pathId}" from structure "${struct.name}" not found in SVG index`
          )
        }
      }
    }

    if (syncErrors.length > 0) {
      console.error('SVG SYNC ERRORS:', syncErrors)
    }

    expect(syncErrors.length).toBe(0)
  })

  it('should detect duplicate path claims', async () => {
    const structs = await fetch('/api/structures/bulk/query?system=SKELETAL')
    const { data } = await structs.json()

    const pathMap = new Map<string, string>()
    const duplicates: Array<{ pathId: string; structures: string[] }> = []

    for (const struct of data) {
      for (const pathId of struct.svgPathIds) {
        if (pathMap.has(pathId)) {
          const existing = pathMap.get(pathId)!
          const dup = duplicates.find((d) => d.pathId === pathId)

          if (dup) {
            dup.structures.push(struct.name)
          } else {
            duplicates.push({
              pathId,
              structures: [existing, struct.name],
            })
          }
        } else {
          pathMap.set(pathId, struct.name)
        }
      }
    }

    if (duplicates.length > 0) {
      console.error('DUPLICATE PATH IDs:')
      duplicates.forEach(({ pathId, structures: structNames }) => {
        console.error(`  "${pathId}" claimed by: ${structNames.join(', ')}`)
      })
    }

    expect(duplicates.length).toBe(0)
  })

  it('should have svgPathIds as string array', async () => {
    const structs = await fetch('/api/structures/bulk/query?system=SKELETAL')
    const { data } = await structs.json()

    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)

    for (const struct of data) {
      expect(Array.isArray(struct.svgPathIds)).toBe(true)
      
      // Each element should be a string
      for (const pathId of struct.svgPathIds) {
        expect(typeof pathId).toBe('string')
      }
    }
  })

  it('should not have nested svgPaths objects', async () => {
    const structs = await fetch('/api/structures/bulk/query?system=SKELETAL')
    const { data } = await structs.json()

    for (const struct of data) {
      // svgPathIds should be a flat array of strings
      expect(Array.isArray(struct.svgPathIds)).toBe(true)

      // Each element should NOT be an object with id/viewBox properties
      for (const item of struct.svgPathIds) {
        expect(typeof item).toBe('string')
        if (typeof item === 'object') {
          throw new Error(
            `Found nested object in svgPathIds. Expected string array, got: ${JSON.stringify(item)}`
          )
        }
      }
    }
  })

  it('should have valid structure metadata', async () => {
    const structs = await fetch('/api/structures/bulk/query?system=SKELETAL')
    const { data } = await structs.json()

    for (const struct of data) {
      expect(typeof struct.id).toBe('string')
      expect(typeof struct.name).toBe('string')
      expect(typeof struct.latinName).toBe('string')
      expect(typeof struct.system).toBe('string')
      expect(typeof struct.category).toBe('string')
      expect(typeof struct.description).toBe('string')
      expect(struct.system).toBe('SKELETAL')
    }
  })
})
