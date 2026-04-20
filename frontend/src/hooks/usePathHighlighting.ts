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
    const getGroupId = (pathElement: SVGPathElement): string | null => {
      let parent = pathElement.parentElement as HTMLElement | null
      while (parent) {
        if (parent.tagName.toLowerCase() === 'svg') break

        if (parent.tagName === 'g' || parent.tagName === 'G') {
          const dataSvgId = parent.getAttribute('data-svg-id')
          if (dataSvgId && dataSvgId.length > 0) {
            return dataSvgId
          }
        }
        parent = parent.parentElement
      }

      const pathDataId = pathElement.getAttribute('data-svg-id')
      if (pathDataId && pathDataId.length > 0) {
        return pathDataId
      }

      return null
    }

    console.log('[Hook:usePathHighlighting] Update triggered', {
      pulseIds: Array.from(interaction.pulseIds || []),
      glowId: interaction.glowId,
      visibleSystems: Array.from(visibleSystems),
      type: interaction.type,
    });

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
        const parentGroupId = getGroupId(path)

        totalPathsProcessed++;

        const isGlowed = Boolean(
          (pathId && pathId === interaction.glowId) ||
          (parentGroupId && parentGroupId === interaction.glowId)
        )

        const isPulsing = Boolean(
          (pathId && interaction.pulseIds?.has(pathId)) ||
          (parentGroupId && interaction.pulseIds?.has(parentGroupId))
        )

        const isHovered = Boolean(
          isHovering &&
          ((pathId && pathId === hoveredId) ||
            (parentGroupId && parentGroupId === hoveredId))
        )

        // Log first few paths to understand structure
        if (totalPathsProcessed <= 5) {
          console.log(`[Hook:path] ${pathId || 'no-id'} | parent: ${parentGroupId || 'none'} | pulse: ${isPulsing} | glow: ${isGlowed}`);
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
