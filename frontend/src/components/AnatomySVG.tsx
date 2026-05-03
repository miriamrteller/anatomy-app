import React, { useCallback, useRef, useEffect, useState } from "react";
import { useAnatomyStore } from "../stores/anatomy";
import { SystemEnum, Structure } from "../types";
import { StructureInfoPanel } from "./StructureInfoPanel";
import { useInteractionExpiry } from "../hooks/useInteractionExpiry";
import { usePathHighlighting } from "../hooks/usePathHighlighting";
import { fetchWithRetry } from "../lib/fetch";

interface AnatomySVGProps {
  systems: Record<SystemEnum, string>;
}

export const AnatomySVG: React.FC<AnatomySVGProps> = ({ systems }) => {
  const svgRefsMap = useRef<Record<SystemEnum, HTMLDivElement | null>>(
    {} as any,
  );
  const structureCacheRef = useRef<Map<string, Structure | null>>(new Map());
  const fetchPromisesRef = useRef<Map<string, Promise<Structure | null>>>(new Map());
  const [isReady, setIsReady] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const {
    interaction,
    visibleSystems,
    clearInteraction,
  } = useAnatomyStore();

  // ===== Set up interaction expiry polling =====
  useInteractionExpiry();

  // ===== Set up path highlighting (styling) =====
  usePathHighlighting({
    svgRefsMap,
    interaction,
    visibleSystems,
    isHovering: hoveredId !== null,  // True whenever hovering over any path (regardless of click-lock)
    hoveredId: hoveredId ?? undefined,
  });

  // ===== HELPER FUNCTIONS =====

  /**
   * Find the SVG data-id for a path element by walking up the DOM
   * Prioritizes parent group data-svg-id attributes (like femur-left)
   * Returns the path's own data-svg-id as fallback if no parent group found
   */
  const getGroupId = useCallback(
    (pathElement: SVGPathElement): string | null => {
      // Walk up to find a parent group with a data-svg-id attribute
      let parent = pathElement.parentElement as HTMLElement | null;
      while (parent) {
        // Stop if we've reached the SVG element (by tag name)
        if (parent.tagName.toLowerCase() === "svg") break;

        if (parent.tagName === "g" || parent.tagName === "G") {
          const dataSvgId = parent.getAttribute("data-svg-id");
          // Accept non-empty data-svg-id values
          if (dataSvgId && dataSvgId.length > 0) {
            return dataSvgId;
          }
        }
        parent = parent.parentElement;
      }

      // Fallback to path's own data-svg-id if available
      const pathDataId = pathElement.getAttribute("data-svg-id");
      if (pathDataId && pathDataId.length > 0) {
        return pathDataId;
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

      if (structureCacheRef.current.has(cacheKey)) {
        return structureCacheRef.current.get(cacheKey) || null;
      }

      if (fetchPromisesRef.current.has(cacheKey)) {
        return fetchPromisesRef.current.get(cacheKey)!;
      }

      const fetchPromise = (async () => {
        try {
          const response = await fetchWithRetry(
            `/api/structures/by-svg-path/lookup?pathIds=${groupId}`,
            {},
            3
          );
          if (response.ok) {
            const data = await response.json();
            const structure = data.data?.[0] || null;
            structureCacheRef.current.set(cacheKey, structure);
            return structure;
          }
        } catch (err) {
          console.error("Error fetching structure:", err);
        }

        structureCacheRef.current.set(cacheKey, null);
        return null;
      })();

      fetchPromisesRef.current.set(cacheKey, fetchPromise);

      fetchPromise.finally(() => {
        fetchPromisesRef.current.delete(cacheKey);
      });

      return fetchPromise;
    },
    [],
  );

  /**
   * Attach interactive event listeners to all paths in SVG
   *
   * Event flow:
   * - Mouseenter: Hover over a path → show structure in panel (if not blocked by chat)
   * - Mouseleave: Leave the path → clear hover interaction
   * - Click: Click a path → set interaction to click-locked
   *   (unless there's an active chat, in which case click is blocked)
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

        if (!groupId) return;

        pathElement.style.cursor = "pointer";
        pathElement.style.transition = "all 200ms ease";
        pathElement.style.transformOrigin = "center";

        // Mouseenter: Fetch and show structure data
        pathElement.addEventListener("mouseenter", async () => {
          const store = useAnatomyStore.getState();

          // DISABLE HOVER DURING ACTIVE CHAT (read-only interaction)
          if (store.isStreamingChat) {
            pathElement.style.cursor = "wait";
            return;
          }

          pathElement.style.cursor = "pointer";
          setHoveredId(groupId);  // Always track hoveredId for visual feedback

          // Skip info panel update if there's an active click-lock or chat result
          // (keep panel locked on clicked/chat bone, but still show hover glow)
          if (store.interaction.type === "click-locked" || store.interaction.type === "chat-result") {
            return;
          }

          const structure = await fetchStructureData(groupId, system);
          if (structure) {
            store.setInteraction({
              type: "hover",
              structure,
              sourceId: groupId,
            });
          }
        });

        // Mouseleave: Clear hover interaction
        pathElement.addEventListener("mouseleave", () => {
          const store = useAnatomyStore.getState();

          setHoveredId(null);  // Clear visual hover feedback

          // Only clear interaction if we're currently in hover mode
          // (keep click-locked and chat-result states active)
          if (store.interaction.type === "hover") {
            store.clearInteraction();
          }
        });

        // Click: Lock structure
        pathElement.addEventListener("click", async (e) => {
          e.stopPropagation();
          const store = useAnatomyStore.getState();

          // DISABLE CLICK DURING ACTIVE CHAT (prevents state corruption)
          if (store.isStreamingChat) {
            return;
          }

          const structure = await fetchStructureData(groupId, system);
          if (structure) {
            // Clear any previous chat highlights
            store.clearInteraction();

            // Set interaction to click-locked (persistent until new interaction)
            store.setInteraction({
              type: "click-locked",
              structure,
              sourceId: groupId,
            });

            // Set glow for this structure
            store.setInteraction({
              glowId: groupId,
            });
          }
        });
      });
    });
  }, [getGroupId, fetchStructureData]);

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

  // Update path visibility when visible systems change
  useEffect(() => {
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
                clearInteraction();
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
