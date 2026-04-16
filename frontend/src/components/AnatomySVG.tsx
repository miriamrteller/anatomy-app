import React, { useCallback, useRef, useEffect, useState } from "react";
import { useAnatomyStore } from "../stores/anatomy";
import { SystemEnum } from "../types";
import { StructureInfoPanel } from "./StructureInfoPanel";

interface AnatomySVGProps {
  systems: Record<SystemEnum, string>;
}

// ===== CONSTANTS =====
const PULSE_ANIMATION = "svgPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite";
const HIGHLIGHT_OPACITY = 0.8;
const DEFAULT_OPACITY = 0.5;
const HOVER_SHADOW = "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))";

const CLICK_LOCK_DURATION = 3000; // 3 seconds

export const AnatomySVG: React.FC<AnatomySVGProps> = ({ systems }) => {
  const svgRefsMap = useRef<Record<SystemEnum, HTMLDivElement | null>>(
    {} as any,
  );
  const clickLockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isClickLockedRef = useRef<boolean>(false);
  const clickLockedPathRef = useRef<SVGPathElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  const {
    setSelectedStructure,
    setHoveredStructure,
    selectedStructure,
    hoveredStructure,
    visibleSystems,
    highlightedIds,
    clearHighlight,
  } = useAnatomyStore();

  // ===== HELPER FUNCTIONS =====

  /**
   * Find the group ID for a path element by walking up the DOM
   * Prioritizes parent group IDs (like FemurRight) over path IDs
   * Returns the path's own ID as fallback if no parent group found
   */
  const getGroupId = useCallback(
    (pathElement: SVGPathElement): string | null => {
      // Walk up to find a parent group with a meaningful ID
      let parent = pathElement.parentElement as HTMLElement | null;
      while (parent) {
        // Stop if we've reached the SVG element (by tag name)
        if (parent.tagName.toLowerCase() === "svg") break;

        if (parent.tagName === "g" || parent.tagName === "G") {
          const id = parent.getAttribute("id");
          // Accept non-generic IDs (avoid g123, g1511, etc and path1, path2, etc)
          if (id && !/^(?:g|path)\d+$/.test(id)) {
            return id;
          }
        }
        parent = parent.parentElement;
      }

      // Fallback to path's own ID if it's not generic
      const pathId = pathElement.getAttribute("id");
      if (pathId && !/^(?:g|path)\d+$/.test(pathId)) {
        return pathId;
      }

      return null;
    },
    [],
  );

  /**
   * Fetch structure data for a given group ID and system
   */
  const fetchStructureData = useCallback(
    async (groupId: string, system: SystemEnum) => {
      try {
        const response = await fetch(
          `/api/structures/by-svg-path/lookup?pathIds=${groupId}&system=${system}`,
        );
        if (response.ok) {
          const data = await response.json();
          return data.data?.[0] || null;
        }
      } catch (err) {
        console.error("Error fetching structure:", err);
      }
      return null;
    },
    [],
  );

  /**
   * Update path styling based on highlight and hover state
   */
  const updatePathStyle = useCallback(
    (path: SVGPathElement, isHovered: boolean, isHighlighted: boolean) => {
      if (isHovered) {
        path.style.fillOpacity = String(HIGHLIGHT_OPACITY);
        path.style.filter = HOVER_SHADOW;
      } else if (isHighlighted) {
        path.style.fillOpacity = String(HIGHLIGHT_OPACITY);
        path.style.animation = PULSE_ANIMATION;
        path.style.filter = "none";
      } else {
        path.style.fillOpacity = String(DEFAULT_OPACITY);
        path.style.animation = "none";
        path.style.filter = "none";
      }
    },
    [],
  );

  /**
   * Update path visibility based on visible systems
   */
  const updatePathVisibility = useCallback((): void => {
    Object.values(SystemEnum).forEach((system) => {
      const systemContainer = svgRefsMap.current[system];
      if (!systemContainer) return;

      const svg = systemContainer.querySelector("svg");
      if (!svg) return;

      const paths = svg.querySelectorAll("path");
      paths.forEach((path) => {
        path.style.visibility = visibleSystems.has(system)
          ? "visible"
          : "hidden";
      });
    });
  }, [visibleSystems]);

  /**
   * Update highlighting for all paths based on chat highlights.
   * Handles both:
   * - Path IDs: Direct <path id="femur-left" />
   * - Group IDs: <g id="FemurLeft"><path .../><path .../></g>
   * 
   * Logs missing IDs to console for debugging SVG/DB mismatches.
   */
  const updatePathHighlighting = useCallback((): void => {
    const missingIds: string[] = [];

    Object.values(SystemEnum).forEach((system) => {
      const systemContainer = svgRefsMap.current[system];
      if (!systemContainer) return;

      const svg = systemContainer.querySelector("svg");
      if (!svg) return;

      // First, clear all highlighting from paths not in highlightedIds
      const allPaths = svg.querySelectorAll("path");
      allPaths.forEach((path) => {
        const pathId = path.getAttribute("id");
        const parentGroupId = getGroupId(path as SVGPathElement);
        
        // Check if this path or its parent group is highlighted
        const isHighlighted = Boolean(
          (pathId && highlightedIds.has(pathId)) || 
          (parentGroupId && highlightedIds.has(parentGroupId))
        );

        if (!isHighlighted && path.style.animation !== "none") {
          // Only reset if it was animated (avoid overwriting hover states)
          updatePathStyle(path as SVGPathElement, false, false);
        }
      });

      // Now apply highlighting for each ID in highlightedIds
      highlightedIds.forEach((id) => {
        // Try to find element by ID
        const element = svg.getElementById(id);
        
        if (!element) {
          missingIds.push(id);
          return;
        }

        // If it's a group, highlight all paths within it
        if (element.tagName === "g" || element.tagName === "G") {
          const pathsInGroup = element.querySelectorAll("path");
          pathsInGroup.forEach((path) => {
            path.style.animation = PULSE_ANIMATION;
            path.style.fillOpacity = String(HIGHLIGHT_OPACITY);
          });
        } 
        // If it's a path, highlight it directly
        else if (element.tagName === "path" || element.tagName === "PATH") {
          const pathElement = element as SVGPathElement;
          pathElement.style.animation = PULSE_ANIMATION;
          pathElement.style.fillOpacity = String(HIGHLIGHT_OPACITY);
        }
      });
    });

    // Log missing IDs for debugging
    if (missingIds.length > 0) {
      console.warn(
        `[AnatomySVG Highlighting] ${missingIds.length} highlighted IDs not found in SVG. Missing IDs:`,
        missingIds
      );
    }
  }, [highlightedIds, updatePathStyle, getGroupId]);

  /**
   * Attach interactive event listeners to all paths in SVG
   */
  const attachEventListeners = useCallback((): void => {
    Object.values(SystemEnum).forEach((system) => {
      const systemContainer = svgRefsMap.current[system];
      if (!systemContainer) return;

      const svg = systemContainer.querySelector("svg");
      if (!svg) return;

      const paths = svg.querySelectorAll("path");

      paths.forEach((path) => {
        const pathElement = path as SVGPathElement;
        const groupId = getGroupId(pathElement);

        // Skip paths without a valid ID
        if (!groupId) return;

        // Set up visual feedback
        pathElement.style.cursor = "pointer";
        pathElement.style.transition = "all 200ms ease";
        pathElement.style.transformOrigin = "center";

        // Mouseenter: fetch and show structure data
        pathElement.addEventListener("mouseenter", async () => {
          // If click-locked on a different path, show hover glow but keep info panel locked
          if (isClickLockedRef.current && clickLockedPathRef.current !== pathElement) {
            // Apply hover styling without updating the info panel
            const pathId = pathElement.getAttribute("id");
            const isHighlighted = Boolean(pathId && highlightedIds.has(pathId));
            updatePathStyle(pathElement, true, isHighlighted);
            return;
          }

          // If click-locked on this same path, don't change anything
          if (isClickLockedRef.current && clickLockedPathRef.current === pathElement) {
            return;
          }

          // Normal hover (not click-locked)
          const pathId = pathElement.getAttribute("id");
          const isHighlighted = Boolean(pathId && highlightedIds.has(pathId));
          updatePathStyle(pathElement, true, isHighlighted);

          const structure = await fetchStructureData(groupId, system);
          if (structure) {
            setHoveredStructure(structure);
          }
        });

        // Mouseleave: restore previous state (unless click-locked)
        pathElement.addEventListener("mouseleave", () => {
          // Skip if this path is currently click-locked
          if (isClickLockedRef.current && clickLockedPathRef.current === pathElement) {
            return;
          }
          
          const pathId = pathElement.getAttribute("id");
          const isHighlighted = Boolean(pathId && highlightedIds.has(pathId));
          updatePathStyle(pathElement, false, isHighlighted);
          setHoveredStructure(null);
        });

        // Click: select structure and lock it for a few seconds
        pathElement.addEventListener("click", async (e) => {
          e.stopPropagation();
          const structure = await fetchStructureData(groupId, system);
          if (structure) {
            setSelectedStructure(structure);
            
            // Clear existing timeout if any
            if (clickLockTimeoutRef.current) {
              clearTimeout(clickLockTimeoutRef.current);
            }
            
            // Reset previous locked path styling
            if (clickLockedPathRef.current) {
              const pathId = clickLockedPathRef.current.getAttribute("id");
              const isHighlighted = Boolean(pathId && highlightedIds.has(pathId));
              updatePathStyle(clickLockedPathRef.current, false, isHighlighted);
            }
            
            // Apply hover styling to the clicked path (glow)
            updatePathStyle(pathElement, true, false);
            clickLockedPathRef.current = pathElement;
            
            // Set lock and start timer
            isClickLockedRef.current = true;
            clickLockTimeoutRef.current = setTimeout(() => {
              // Reset the locked path styling when lock expires
              if (clickLockedPathRef.current) {
                const pathId = clickLockedPathRef.current.getAttribute("id");
                const isHighlighted = Boolean(pathId && highlightedIds.has(pathId));
                updatePathStyle(clickLockedPathRef.current, false, isHighlighted);
              }
              isClickLockedRef.current = false;
              clickLockTimeoutRef.current = null;
              clickLockedPathRef.current = null;
            }, CLICK_LOCK_DURATION);
          }
        });
      });
    });
  }, [
    getGroupId,
    fetchStructureData,
    updatePathStyle,
    highlightedIds,
    setHoveredStructure,
    setSelectedStructure,
  ]);

  // ===== EFFECTS =====

  // Initialize SVG after a brief delay to ensure rendering
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Attach event listeners when SVG is ready
  useEffect(() => {
    if (isReady) {
      attachEventListeners();
    }
  }, [isReady, attachEventListeners]);

  // Update visibility when visible systems change
  useEffect(() => {
    updatePathVisibility();
  }, [updatePathVisibility]);

  // Update highlighting when chat highlights change
  useEffect(() => {
    updatePathHighlighting();
  }, [updatePathHighlighting]);

  // Cleanup click lock timeout on unmount
  useEffect(() => {
    return () => {
      if (clickLockTimeoutRef.current) {
        clearTimeout(clickLockTimeoutRef.current);
      }
      clickLockedPathRef.current = null;
    };
  }, []);

  // When click-locked, show selected structure; otherwise show hover or selected
  const activeStructure = isClickLockedRef.current ? selectedStructure : (hoveredStructure || selectedStructure);

  return (
    <div className="relative w-full h-full bg-white rounded-lg shadow overflow-hidden">
      {/* Main SVG container - render all systems as overlays */}
      <div className="absolute inset-0">
        {Object.entries(systems).map(([system]) => (
          <div
            key={system}
            ref={(el) => {
              if (el) svgRefsMap.current[system as SystemEnum] = el;
            }}
            className="w-full h-full"
            style={{
              opacity: visibleSystems.has(system as SystemEnum) ? 1 : 0,
              pointerEvents: visibleSystems.has(system as SystemEnum)
                ? "auto"
                : "none",
              transition: "opacity 200ms ease",
            }}
          >
            <div
              className="w-full h-full"
              dangerouslySetInnerHTML={{
                __html: systems[system as SystemEnum],
              }}
              onClick={() => {
                clearHighlight();
              }}
            />
          </div>
        ))}
      </div>

      {/* Structure info panel */}
      <StructureInfoPanel structure={activeStructure} />

      <style>{`
        @keyframes svgPulse {
          0%, 100% {
            fill-opacity: 0.3;
            filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0));
          }
          50% {
            fill-opacity: 1;
            filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.8));
          }
        }
        svg {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        path {
          pointer-events: auto;
        }
      `}</style>
    </div>
  );
};
