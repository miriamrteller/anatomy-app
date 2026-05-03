/**
 * Bilateral bone grouping utilities
 * Used to group Left/Right bone pairs for UI display
 */

export interface Structure {
  id: string;
  name: string;
  latinName?: string;
  system?: string;
}

/**
 * Extract the base name from a structure name
 * Example: "Femur (Left)" → "Femur"
 * Example: "Femur (Right)" → "Femur"
 */
export function extractBaseName(name: string): string {
  return name.split('(')[0].trim();
}

/**
 * Determine if a structure is part of a bilateral pair
 * Returns the base name if true, null otherwise
 */
export function getBilateralBase(name: string): string | null {
  const normalized = name.toLowerCase();
  if (normalized.includes('(left)') || normalized.includes('(right)')) {
    return extractBaseName(name);
  }
  return null;
}

/**
 * Get the side (Left or Right) from a structure name
 * Example: "Femur (Left)" → "Left"
 * Example: "Femur (Right)" → "Right"
 * Example: "Sternum" → null
 */
export function getSide(name: string): 'Left' | 'Right' | null {
  if (name.includes('(Left)')) return 'Left';
  if (name.includes('(Right)')) return 'Right';
  return null;
}

/**
 * Check if a structure has a bilateral pair
 * Given a target structure name, determine if it's a bilateral structure
 */
export function isBilateral(targetName: string): boolean {
  const baseName = getBilateralBase(targetName)
  return baseName !== null
}

/**
 * Get the bilateral status for display
 * Returns: "Left", "Right", "Bilateral (L+R)", or null
 */
export function getBilateralStatus(
  highlightedNames: Set<string>
): string | null {
  if (highlightedNames.size === 0) return null;

  // Get the first highlighted structure to determine base name
  const firstHighlighted = Array.from(highlightedNames)[0];
  const baseName = getBilateralBase(firstHighlighted);

  if (!baseName) {
    // Not a bilateral structure
    return null;
  }

  const hasLeft = highlightedNames.has(`${baseName} (Left)`);
  const hasRight = highlightedNames.has(`${baseName} (Right)`);

  if (hasLeft && hasRight) {
    return 'Bilateral (L+R)';
  } else if (hasLeft) {
    return 'Left';
  } else if (hasRight) {
    return 'Right';
  }

  return null;
}

/**
 * Group bilateral structures for display
 * Combines Left/Right pairs into a single grouped entry
 */
export function groupBilateralStructures(structures: Structure[]) {
  const grouped = new Map<string, { base: Structure; sides: Set<'Left' | 'Right'> }>();

  for (const structure of structures) {
    const baseName = getBilateralBase(structure.name);

    if (baseName) {
      const side = getSide(structure.name);
      if (!grouped.has(baseName)) {
        // Create base entry (use the structure we're processing)
        grouped.set(baseName, {
          base: { ...structure, name: baseName },
          sides: new Set(),
        });
      }

      if (side) {
        grouped.get(baseName)!.sides.add(side);
      }
    } else {
      // Not a bilateral structure, add as-is
      if (!grouped.has(structure.name)) {
        grouped.set(structure.name, {
          base: structure,
          sides: new Set(),
        });
      }
    }
  }

  return grouped;
}

/**
 * Format side indicator for display
 * "L+R", "L", "R", or empty string
 */
export function formatSideIndicator(sides: Set<'Left' | 'Right'>): string {
  if (sides.size === 0) return '';
  if (sides.size === 2) return 'L+R';
  if (sides.has('Left')) return 'L';
  if (sides.has('Right')) return 'R';
  return '';
}
