/**
 * usePathHighlighting Hook
 *
 * Centralized styling logic for all SVG path highlighting.
 * Single source of truth for hover/click/pulse/glow visual states.
 *
 * Replaces:
 * - updatePathHighlighting() in AnatomySVG
 * - updatePathStyle() in AnatomySVG
 * - Manual style assignments in event listeners
 *
 * Usage:
 * ```tsx
 * const svgRefsMap = useRef<Record<SystemEnum, HTMLDivElement | null>>({} as any);
 * usePathHighlighting({
 *   svgRefsMap,
 *   interaction,
 *   visibleSystems,
 * });
 * ```
 */

import { useEffect } from 'react'
import { Interaction, SystemEnum } from '../types'

// ===== CONSTANTS =====
const PULSE_ANIMATION = 'svgPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
const HIGHLIGHT_OPACITY = 0.8
const DEFAULT_OPACITY = 0.5
const HOVER_SHADOW = 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))'
const CLICK_GLOW = 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.8))'

interface UsePathHighlightingProps {
  /** Map of system → SVG container ref */
  svgRefsMap: React.MutableRefObject<Record<SystemEnum, HTMLDivElement | null>>
  /** Current interaction state (contains pulseIds, glowId, etc.) */
  interaction: Interaction
  /** Which systems are currently visible */
  visibleSystems: Set<SystemEnum>
  /** Current hover state (for visual distinction) */
  isHovering?: boolean
  /** ID of currently hovered path (for hover styling) */
  hoveredId?: string
}

/**
 * Apply visual styles to SVG paths based on interaction state
 *
 * Visual hierarchy (from lowest to highest priority):
 * 1. Default: opacity 0.5, no filter, no animation
 * 2. Hover: opacity 0.8, hover shadow
 * 3. Click glow: opacity 0.8, click glow filter
 * 4. Pulse: opacity animated 0.3→1, pulse animation
 * 5. Both pulse + glow: Pulse takes visual priority (animation is more prominent)
 */
export function usePathHighlighting({
  svgRefsMap,
  interaction,
  visibleSystems,
  isHovering = false,
  hoveredId,
}: UsePathHighlightingProps): void {
  useEffect(() => {
    /**
     * Collect all ancestor data-svg-ids for a path element.
     * This handles nested hierarchies like <g data-svg-id="skull"><g data-svg-id="mandible"><path/></g></g>
     * Returns all matching ancestor IDs so the path can be highlighted if any ancestor is in pulseIds.
     */
    const getAllAncestorIds = (pathElement: SVGPathElement): string[] => {
      const ids: string[] = []
      
      // Check the path element itself first
      const pathDataId = pathElement.getAttribute('data-svg-id')
      if (pathDataId && pathDataId.length > 0) {
        ids.push(pathDataId)
      }
      
      // Then collect all parent groups with data-svg-id
      let parent = pathElement.parentElement as HTMLElement | null
      while (parent) {
        if (parent.tagName.toLowerCase() === 'svg') break

        if (parent.tagName === 'g' || parent.tagName === 'G') {
          const dataSvgId = parent.getAttribute('data-svg-id')
          if (dataSvgId && dataSvgId.length > 0) {
            ids.push(dataSvgId)
          }
        }
        parent = parent.parentElement
      }
      
      return ids
    }

    const debugInfo = {
      timestamp: new Date().toISOString(),
      pulseIds: Array.from(interaction.pulseIds || []),
      glowId: interaction.glowId,
      visibleSystems: Array.from(visibleSystems),
      type: interaction.type,
    };
    console.log('[Hook:usePathHighlighting] Update triggered', debugInfo);
    // Store for debugging
    if (!(window as any).__hookDebugHistory) (window as any).__hookDebugHistory = [];
    (window as any).__hookDebugHistory.push(debugInfo);
    (window as any).__hookDebug = debugInfo;

    let totalPathsProcessed = 0;
    let pathsPulsing = 0;
    let pathsGlowing = 0;

    Object.values(SystemEnum).forEach((system) => {
      const systemContainer = svgRefsMap.current[system]
      if (!systemContainer || !visibleSystems.has(system)) return

      const svg = systemContainer.querySelector('svg')
      if (!svg) return

      const paths = svg.querySelectorAll('path')
      console.log(`[Hook:${system}] Found ${paths.length} paths`);

      paths.forEach((pathElement) => {
        const path = pathElement as SVGPathElement
        const pathId = path.getAttribute('id')
        const ancestorIds = getAllAncestorIds(path)

        totalPathsProcessed++;

        // Check if any ancestor (including self) has a matching glow
        const isGlowed = Boolean(
          (pathId && pathId === interaction.glowId) ||
          ancestorIds.some(id => id === interaction.glowId)
        )

        // Check if any ancestor (including self) is in pulseIds
        const isPulsing = Boolean(
          (pathId && interaction.pulseIds?.has(pathId)) ||
          ancestorIds.some(id => interaction.pulseIds?.has(id))
        )

        // Check if any ancestor (including self) is being hovered
        const isHovered = Boolean(
          isHovering &&
          ((pathId && pathId === hoveredId) ||
            ancestorIds.some(id => id === hoveredId))
        )

        // Log first few paths to understand structure
        if (totalPathsProcessed <= 10) {
          const pathDebug = {
            pathId,
            ancestors: ancestorIds,
            pulse: isPulsing,
            glow: isGlowed,
            hasSkull: ancestorIds.includes('skull'),
            pulseHasSkull: interaction.pulseIds?.has('skull'),
          };
          console.log(`[Hook:path] ${pathId || 'no-id'} | ancestors: ${ancestorIds.join(',')} | pulse: ${isPulsing} | glow: ${isGlowed}`, pathDebug);
          if (!((window as any).__pathDebugSamples)) (window as any).__pathDebugSamples = [];
          (window as any).__pathDebugSamples.push(pathDebug);
        }

        if (isPulsing) pathsPulsing++;
        if (isGlowed) pathsGlowing++;

        if (isPulsing) {
          path.style.fillOpacity = String(HIGHLIGHT_OPACITY)
          path.style.animation = PULSE_ANIMATION
          path.style.filter = 'none'
        } else if (isGlowed) {
          path.style.fillOpacity = String(HIGHLIGHT_OPACITY)
          path.style.filter = CLICK_GLOW
          path.style.animation = 'none'
        } else if (isHovered) {
          path.style.fillOpacity = String(HIGHLIGHT_OPACITY)
          path.style.filter = HOVER_SHADOW
          path.style.animation = 'none'
        } else {
          path.style.fillOpacity = String(DEFAULT_OPACITY)
          path.style.filter = 'none'
          path.style.animation = 'none'
        }
      })
    })

    console.log('[Hook:summary]', {
      totalPaths: totalPathsProcessed,
      pulsing: pathsPulsing,
      glowing: pathsGlowing,
    });
  }, [interaction, visibleSystems, isHovering, hoveredId, svgRefsMap])
}
