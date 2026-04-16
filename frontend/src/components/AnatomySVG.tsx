import React, { useCallback, useRef, useEffect, useState } from "react";
import { useAnatomyStore } from "../stores/anatomy";
import { SystemEnum, Structure } from "../types";
import { StructureInfoPanel } from "./StructureInfoPanel";
import { useInteractionExpiry } from "../hooks/useInteractionExpiry";
import { InteractionDefaults } from "../lib/interaction";
import { fetchWithRetry } from "../lib/fetch";

interface AnatomySVGProps {
  systems: Record<SystemEnum, string>;
}

// ===== CONSTANTS =====
const PULSE_ANIMATION = "svgPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite";
const HIGHLIGHT_OPACITY = 0.8;
const DEFAULT_OPACITY = 0.5;
const HOVER_SHADOW = "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))";
const CLICK_GLOW = "drop-shadow(0 0 12px rgba(59, 130, 246, 0.8))";

export const AnatomySVG: React.FC<AnatomySVGProps> = ({ systems }) => {
  const svgRefsMap = useRef<Record<SystemEnum, HTMLDivElement | null>>(
    {} as any,
  );
  const structureCacheRef = useRef<Map<string, Structure | null>>(new Map());
  const fetchPromisesRef = useRef<Map<string, Promise<Structure | null>>>(new Map());
  const [isReady, setIsReady] = useState(false);

  const {
    interaction,
    setInteraction,
    visibleSystems,
    highlightedIds,
    clearHighlight,
  } = useAnatomyStore();

  // ===== Set up interaction expiry polling =====
  useInteractionExpiry();

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
   * Uses in-memory cache to avoid duplicate lookups
   * Deduplicates in-flight requests to prevent cascading API calls
   * Retries up to 3 times on failure with exponential backoff
   */
  const fetchStructureData = useCallback(
    async (groupId: string, system: SystemEnum) => {
      const cacheKey = `${system}:${groupId}`;
      
      // Return cached result if available
      if (structureCacheRef.current.has(cacheKey)) {
        return structureCacheRef.current.get(cacheKey) || null;
      }
      
      // Return in-flight promise if already fetching for this key
      if (fetchPromisesRef.current.has(cacheKey)) {
        return fetchPromisesRef.current.get(cacheKey)!;
      }
      
      // Create the fetch promise
      const fetchPromise = (async () => {
        try {
          const response = await fetchWithRetry(
            `/api/structures/by-svg-path/lookup?pathIds=${groupId}&system=${system}`,
            {},
            3  // max 3 retries
          );
          if (response.ok) {
            const data = await response.json();
            const structure = data.data?.[0] || null;
            
            // Cache the result
            structureCacheRef.current.set(cacheKey, structure);
            return structure;
          }
        } catch (err) {
          console.error("Error fetching structure:", err);
        }
        
        // Cache null result too to avoid repeated failed requests
        structureCacheRef.current.set(cacheKey, null);
        return null;
      })();
      
      // Store the promise to deduplicate concurrent requests
      fetchPromisesRef.current.set(cacheKey, fetchPromise);
      
      // Clean up the promise from tracking map after it resolves
      fetchPromise.finally(() => {
        fetchPromisesRef.current.delete(cacheKey);
      });
      
      return fetchPromise;
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
   * Update highlighting for all paths based on chat highlights and interaction sourceIds.
   * Also applies click glow for click-locked interactions.
   * Handles both:
   * - Path IDs: Direct <path id="femur-left" />
   * - Group IDs: <g id="FemurLeft"><path .../><path .../></g>
   * 
   * Logs missing IDs to console for debugging SVG/DB mismatches.
   */
  const updatePathHighlighting = useCallback((): void => {
    const missingIds: string[] = [];
    
    // Combine both chat highlights and interaction source IDs
    const allHighlightedIds = new Set([
      ...highlightedIds,
      ...interaction.sourceIds,
    ]);
    
    // Get click-locked structure's svgPathIds for click glow
    const clickLockedIds = interaction.type === 'click-locked' && interaction.structure
      ? new Set(interaction.structure.svgPathIds)
      : new Set<string>();

    Object.values(SystemEnum).forEach((system) => {
      const systemContainer = svgRefsMap.current[system];
      if (!systemContainer) return;

      const svg = systemContainer.querySelector("svg");
      if (!svg) return;

      // First, clear all highlighting from paths
      const allPaths = svg.querySelectorAll("path");
      allPaths.forEach((path) => {
        const pathId = path.getAttribute("id");
        const parentGroupId = getGroupId(path as SVGPathElement);
        
        // Check if this path should have highlighting or click glow
        const isHighlighted = Boolean(
          (pathId && allHighlightedIds.has(pathId)) || 
          (parentGroupId && allHighlightedIds.has(parentGroupId))
        );
        const isClickLocked = Boolean(
          (pathId && clickLockedIds.has(pathId)) ||
          (parentGroupId && clickLockedIds.has(parentGroupId))
        );

        // Only reset if it won't have new styling applied
        if (!isHighlighted && !isClickLocked && path.style.animation !== "none") {
          updatePathStyle(path as SVGPathElement, false, false);
        }
      });

      // Apply pulse highlighting for chat results
      allHighlightedIds.forEach((id) => {
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
      
      // Apply click glow for click-locked structures
      clickLockedIds.forEach((id) => {
        const element = svg.getElementById(id);
        
        if (!element) {
          missingIds.push(id);
          return;
        }

        // If it's a group, apply click glow to all paths within it
        if (element.tagName === "g" || element.tagName === "G") {
          const pathsInGroup = element.querySelectorAll("path");
          pathsInGroup.forEach((path) => {
            path.style.fillOpacity = String(HIGHLIGHT_OPACITY);
            path.style.filter = CLICK_GLOW;
            path.style.animation = "none";
          });
        } 
        // If it's a path, apply click glow directly
        else if (element.tagName === "path" || element.tagName === "PATH") {
          const pathElement = element as SVGPathElement;
          pathElement.style.fillOpacity = String(HIGHLIGHT_OPACITY);
          pathElement.style.filter = CLICK_GLOW;
          pathElement.style.animation = "none";
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
  }, [highlightedIds, interaction.sourceIds, interaction.type, interaction.structure, updatePathStyle, getGroupId]);

  /**
   * Attach interactive event listeners to all paths in SVG
   * 
   * Event flow:
   * - Mouseenter: Hover over a path → show structure in interaction.structure (if not chat-result)
   * - Mouseleave: Leave the path → clear interaction if type was 'hover'
   * - Click: Click a path → set interaction to click-locked for 3 seconds
   *   (unless there's an active chat-result, in which case chat takes precedence)
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

        // Mouseenter: Fetch and show structure data (unless blocked by chat-result or click-lock)
        pathElement.addEventListener("mouseenter", async () => {
          const store = useAnatomyStore.getState();
          
          // DISABLE HOVER DURING ACTIVE CHAT
          // Prevents user interactions from conflicting with agent-driven highlighting
          if (store.isStreamingChat) {
            pathElement.style.cursor = "wait";
            return; // Skip all hover processing
          }
          
          // Don't update panel if there's an active chat result or click-locked interaction
          if (store.interaction.type === "chat-result" || store.interaction.type === "click-locked") {
            const pathId = pathElement.getAttribute("id");
            const isHighlighted = Boolean(
              pathId && (highlightedIds.has(pathId) || store.interaction.sourceIds.includes(pathId))
            );
            
            // Apply click glow when hovering over click-locked structure
            if (store.interaction.type === "click-locked") {
              pathElement.style.fillOpacity = String(HIGHLIGHT_OPACITY);
              pathElement.style.filter = CLICK_GLOW;
              pathElement.style.animation = "none";
            } else {
              // Chat result: use normal hover styling
              updatePathStyle(pathElement, true, isHighlighted);
            }
            return;
          }

          // Normal hover: fetch structure and show in panel
          pathElement.style.cursor = "pointer";
          const pathId = pathElement.getAttribute("id");
          const isHighlighted = Boolean(pathId && highlightedIds.has(pathId));
          updatePathStyle(pathElement, true, isHighlighted);

          const structure = await fetchStructureData(groupId, system);
          if (structure) {
            setInteraction({
              type: "hover",
              structure,
              sourceId: groupId,
              sourceIds: [],
            });
          }
        });

        // Mouseleave: Clear hover interaction (unless click-locked or chat-result)
        pathElement.addEventListener("mouseleave", () => {
          const store = useAnatomyStore.getState();
          
          // Only clear if we're currently hovering
          if (store.interaction.type === "hover") {
            setInteraction(InteractionDefaults.NONE as any);
          }

          const pathId = pathElement.getAttribute("id");
          const isHighlighted = Boolean(
            pathId && (highlightedIds.has(pathId) || store.interaction.sourceIds.includes(pathId))
          );
          updatePathStyle(pathElement, false, isHighlighted);
        });

        // Click: Lock structure until a new interaction occurs
        pathElement.addEventListener("click", async (e) => {
          e.stopPropagation();
          const store = useAnatomyStore.getState();
          
          // DISABLE CLICK DURING ACTIVE CHAT
          // Prevents user clicks from interfering with agent control
          if (store.isStreamingChat) {
            return; // Skip click processing
          }
          
          const structure = await fetchStructureData(groupId, system);
          if (structure) {
            // Clear any previous chat highlights to prevent pulse from restarting
            useAnatomyStore.getState().clearHighlight();
            
            // Set interaction to click-locked (persists until new interaction)
            // No pulse on click - pulse only appears on chat results
            setInteraction({
              type: "click-locked",
              structure,
              sourceId: groupId,
              sourceIds: [],
            });
          }
        });
      });
    });
  }, [getGroupId, fetchStructureData, setInteraction, highlightedIds, updatePathStyle]);

  // ===== EFFECTS =====

  // Initialize SVG after a brief delay to ensure rendering
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

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

  // Update highlighting when chat highlights or interaction sourceIds change
  useEffect(() => {
    updatePathHighlighting();
  }, [updatePathHighlighting]);

  // Display the current interaction's structure (or nothing if none)
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
      <StructureInfoPanel structure={interaction.structure} />

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
