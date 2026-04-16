import React, { useCallback, useRef, useEffect, useState } from "react";
import { useAnatomyStore } from "../stores/anatomy";
import { SystemEnum } from "../types";

interface AnatomySVGProps {
  systems: Record<SystemEnum, string>;
}

// ===== CONSTANTS =====
const PULSE_ANIMATION = "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite";
const HIGHLIGHT_OPACITY = 0.8;
const DEFAULT_OPACITY = 0.5;
const HOVER_SHADOW = "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))";

export const AnatomySVG: React.FC<AnatomySVGProps> = ({ systems }) => {
  const svgRefsMap = useRef<Record<SystemEnum, HTMLDivElement | null>>(
    {} as any,
  );
  const [isReady, setIsReady] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

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
   * Update highlighting for all paths based on chat highlights
   */
  const updatePathHighlighting = useCallback((): void => {
    Object.values(SystemEnum).forEach((system) => {
      const systemContainer = svgRefsMap.current[system];
      if (!systemContainer) return;

      const svg = systemContainer.querySelector("svg");
      if (!svg) return;

      const paths = svg.querySelectorAll("path");
      paths.forEach((path) => {
        const pathId = path.getAttribute("id");
        if (pathId && highlightedIds.has(pathId)) {
          path.style.animation = PULSE_ANIMATION;
          path.style.fillOpacity = String(HIGHLIGHT_OPACITY);
        } else if (path.style.animation !== "none") {
          // Only reset if it was animated (avoid overwriting hover states)
          updatePathStyle(path, false, false);
        }
      });
    });
  }, [highlightedIds, updatePathStyle]);

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
          const pathId = pathElement.getAttribute("id");
          const isHighlighted = Boolean(pathId && highlightedIds.has(pathId));
          updatePathStyle(pathElement, true, isHighlighted);

          const structure = await fetchStructureData(groupId, system);
          if (structure) {
            setHoveredStructure(structure);
          }
        });

        // Mouseleave: restore previous state
        pathElement.addEventListener("mouseleave", () => {
          const pathId = pathElement.getAttribute("id");
          const isHighlighted = Boolean(pathId && highlightedIds.has(pathId));
          updatePathStyle(pathElement, false, isHighlighted);
          setHoveredStructure(null);
        });

        // Click: select structure
        pathElement.addEventListener("click", async (e) => {
          e.stopPropagation();
          const structure = await fetchStructureData(groupId, system);
          if (structure) {
            setSelectedStructure(structure);
            setDescriptionExpanded(true)
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

  const activeStructure = hoveredStructure || selectedStructure;

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

      {/* Top-left - structure name and latin name */}
      {selectedStructure && (
        <div className="absolute left-4 top-4 pointer-events-none z-10">
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">
              {selectedStructure.name}
            </h3>
            <p className="text-xs text-gray-600 italic">
              {selectedStructure.latinName}
            </p>
          </div>
        </div>
      )}

      {/* Top-right - read more icon */}
      {selectedStructure && !descriptionExpanded && (
        <div className="absolute right-4 top-4 pointer-events-auto z-10">
          <button
            onClick={() => setDescriptionExpanded(true)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title="Read more"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Top-right - description box */}
      {selectedStructure && descriptionExpanded && (
        <div className="absolute right-4 top-4 pointer-events-auto z-10 bg-white rounded-lg shadow-md border border-gray-200 p-4 max-w-xs max-h-64 flex flex-col">
          <button
            onClick={() => setDescriptionExpanded(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="overflow-y-auto flex-1">
            <p className="text-xs text-gray-700 leading-relaxed">
              {selectedStructure.description}
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            fill-opacity: 0.8;
          }
          50% {
            fill-opacity: 1;
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
