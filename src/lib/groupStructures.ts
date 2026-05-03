/**
 * Group bilateral (left/right) structures for UI display
 * 
 * Purpose: Organize left/right pairs (e.g., "Femur (Left)" and "Femur (Right)")
 * into single grouped entries for cleaner UI presentation.
 * 
 * Example:
 * Input: ["Femur (Right)", "Femur (Left)", "Radius (Right)"]
 * Output: [
 *   { name: "Femur", left: "Femur (Left)", right: "Femur (Right)", displayed: "Femur (L+R)" },
 *   { name: "Radius", left: null, right: "Radius (Right)", displayed: "Radius (Right)" }
 * ]
 */

interface Structure {
  id: string;
  name: string;
  latinName: string;
  system: string;
  category: string;
  svgPathIds: string[];
  aliases: string[];
  metadata?: Record<string, any>;
  description: string;
}

interface GroupedStructure {
  baseName: string;
  left: Structure | null;
  right: Structure | null;
  single: Structure | null; // For non-bilateral structures
  displayName: string;
}

/**
 * Extract base name from bilateral structure name
 * Examples:
 * "Femur (Left)" -> "Femur"
 * "Femur (Right)" -> "Femur"
 * "Tibia" -> "Tibia"
 */
export function extractBaseName(name: string): string {
  return name.replace(/\s*\((Left|Right)\)\s*$/, '').trim();
}

/**
 * Determine the side of a structure
 * Returns 'left', 'right', or 'bilateral' (no suffix)
 */
export function getSide(name: string): 'left' | 'right' | 'bilateral' {
  if (name.includes('(Left)')) return 'left';
  if (name.includes('(Right)')) return 'right';
  return 'bilateral';
}

/**
 * Group structures by bilateral pairs
 * Structures with left/right pairs are grouped together
 * Unpaired or single structures are kept separate
 */
export function groupBilateralStructures(structures: Structure[]): GroupedStructure[] {
  const grouped = new Map<string, GroupedStructure>();

  for (const structure of structures) {
    const baseName = extractBaseName(structure.name);
    const side = getSide(structure.name);

    if (!grouped.has(baseName)) {
      grouped.set(baseName, {
        baseName,
        left: null,
        right: null,
        single: null,
        displayName: baseName,
      });
    }

    const group = grouped.get(baseName)!;

    if (side === 'left') {
      group.left = structure;
    } else if (side === 'right') {
      group.right = structure;
    } else {
      group.single = structure;
    }

    // Update display name based on what's present
    if (group.left && group.right) {
      group.displayName = `${baseName} (L+R)`;
    } else if (group.left) {
      group.displayName = `${baseName} (Left)`;
    } else if (group.right) {
      group.displayName = `${baseName} (Right)`;
    } else if (group.single) {
      group.displayName = baseName;
    }
  }

  // Return in insertion order
  return Array.from(grouped.values());
}

/**
 * Get all SVG IDs from a grouped structure (both sides if bilateral)
 */
export function getGroupedSvgPathIds(group: GroupedStructure): string[] {
  const ids = new Set<string>();

  if (group.left) {
    group.left.svgPathIds.forEach((id) => ids.add(id));
  }
  if (group.right) {
    group.right.svgPathIds.forEach((id) => ids.add(id));
  }
  if (group.single) {
    group.single.svgPathIds.forEach((id) => ids.add(id));
  }

  return Array.from(ids);
}

/**
 * Check if a group is bilateral (has both left and right)
 */
export function isBilateral(group: GroupedStructure): boolean {
  return group.left !== null && group.right !== null;
}
