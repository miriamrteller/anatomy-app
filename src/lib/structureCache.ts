import { db } from './db';

interface CachedStructure {
  id: string;
  name: string;
  aliases: string[];
  svgPathIds: string[];
}

// Singleton cache
let structureCache: Map<string, CachedStructure> | null = null;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize cache on first use (lazy loading)
 * Prevents blocking startup if DB is slow
 */
async function initializeCache(): Promise<void> {
  if (structureCache) return; // Already initialized
  if (initializationPromise) return initializationPromise; // Already initializing

  initializationPromise = (async () => {
    try {
      const structures = await db.structure.findMany({
        where: { category: 'BONE' },
        select: { id: true, name: true, aliases: true, svgPathIds: true },
      });

      structureCache = new Map();

      // Index by exact name (case-insensitive)
      structures.forEach((structure: typeof structures[number]) => {
        const nameLower = structure.name.toLowerCase();
        if (!structureCache!.has(nameLower)) {
          structureCache!.set(nameLower, structure);
        }

        // Also extract main word from compound names (e.g., "femur" from "Femur (Left)")
        const mainWord = structure.name.split('(')[0].trim().toLowerCase();
        if (mainWord && mainWord !== nameLower && !structureCache!.has(mainWord)) {
          structureCache!.set(mainWord, structure);
        }

        // Also index each alias
        structure.aliases.forEach((alias: string) => {
          const aliasLower = alias.toLowerCase();
          if (!structureCache!.has(aliasLower)) {
            structureCache!.set(aliasLower, structure);
          }
        });
      });

      console.log(`✅ Loaded ${structures.length} bone structures into cache`);
    } catch (error) {
      console.error('❌ Failed to initialize structure cache:', error);
      structureCache = new Map(); // Empty cache on error
    }
  })();

  return initializationPromise;
}

/**
 * Find structures by searching the question text
 * Returns all matching structures (no duplicates)
 * 
 * Strategy:
 * 1. Check for exact index matches (full name, aliases)
 * 2. Check for partial matches in all structure names
 * This ensures bilateral bones like "Femur (Left)" and "Femur (Right)" 
 * are both found when searching for "femur"
 */
export async function findStructureInQuestion(
  question: string
): Promise<CachedStructure[]> {
  await initializeCache();

  const lowerQuestion = question.toLowerCase();
  const foundIds = new Set<string>();
  const results: CachedStructure[] = [];

  // Strategy 1: Check each cached search term (exact and full name matches)
  for (const [searchTerm, structure] of structureCache!) {
    if (lowerQuestion.includes(searchTerm) && !foundIds.has(structure.id)) {
      results.push(structure);
      foundIds.add(structure.id);
    }
  }

  // Strategy 2: Search all structure names for partial matches
  // This ensures bilateral bones are found (e.g., "femur" finds both Left and Right)
  for (const [_, structure] of structureCache!) {
    if (foundIds.has(structure.id)) continue; // Already found
    
    // Check if question contains main bone name (e.g., "femur" from "Femur (Left)")
    const mainWord = structure.name.split('(')[0].trim().toLowerCase();
    if (mainWord && lowerQuestion.includes(mainWord)) {
      results.push(structure);
      foundIds.add(structure.id);
    }
  }

  return results;
}

/**
 * Direct lookup by name (exact or partial match)
 */
export async function findStructureByName(
  name: string
): Promise<CachedStructure | null> {
  await initializeCache();

  const nameLower = name.toLowerCase();

  // Exact match first
  if (structureCache!.has(nameLower)) {
    return structureCache!.get(nameLower) || null;
  }

  // Partial match (contains)
  for (const [key, structure] of structureCache!) {
    if (key.includes(nameLower) || nameLower.includes(key)) {
      return structure;
    }
  }

  return null;
}

/**
 * For debugging: Get all cached structures
 */
export async function getCachedStructureCount(): Promise<number> {
  await initializeCache();
  return structureCache?.size || 0;
}

export async function clearCache(): Promise<void> {
  structureCache = null;
  initializationPromise = null;
}
