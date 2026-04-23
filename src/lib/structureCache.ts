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
      structures.forEach((structure) => {
        const nameLower = structure.name.toLowerCase();
        if (!structureCache!.has(nameLower)) {
          structureCache!.set(nameLower, structure);
        }

        // Also index each alias
        structure.aliases.forEach((alias) => {
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
 * Find a structure by searching the question text
 * Returns first match or null
 */
export async function findStructureInQuestion(
  question: string
): Promise<CachedStructure | null> {
  await initializeCache();

  const lowerQuestion = question.toLowerCase();

  // Strategy: Check each cached search term and see if it appears in the question
  for (const [searchTerm, structure] of structureCache!) {
    if (lowerQuestion.includes(searchTerm)) {
      return structure;
    }
  }

  return null;
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
