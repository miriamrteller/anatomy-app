import React, { useMemo, useEffect, useRef } from "react";
import { useAnatomyStore } from "../stores/anatomy";
import { SystemEnum } from "../types";
import { useSystemSVGs } from "../hooks/useSystemSVGs";

export const LayerControls: React.FC = () => {
  const {
    visibleSystems,
    toggleSystem,
    showAllSystems,
    hideAllSystems,
    isLayerControlsMinimized,
    toggleLayerControlsMinimize,
  } = useAnatomyStore();

  const { systems } = useSystemSVGs();

  // Only show systems that have loaded content successfully (no errors)
  const availableSystems = useMemo(() => {
    const available = Object.values(SystemEnum).filter((system) => {
      const sysData = systems[system];
      const isValid =
        sysData &&
        sysData.content.length > 0 &&
        !sysData.error &&
        sysData.content.includes("<svg");
      return isValid;
    });
    return available;
  }, [systems]);

  const prevCountRef = useRef<number | null>(null);

  // Auto-collapse if only 1 system, auto-expand if 2+
  // Only adjust when system count changes, not when user manually toggles
  useEffect(() => {
    const systemCount = availableSystems.length;

    if (prevCountRef.current === null) {
      // Initial load
      prevCountRef.current = systemCount;
      if (systemCount === 1 && !isLayerControlsMinimized) {
        toggleLayerControlsMinimize();
      } else if (systemCount > 1 && isLayerControlsMinimized) {
        toggleLayerControlsMinimize();
      }
    } else if (prevCountRef.current !== systemCount) {
      // Count changed - adjust state based on new count
      prevCountRef.current = systemCount;
      if (systemCount === 1 && !isLayerControlsMinimized) {
        toggleLayerControlsMinimize();
      } else if (systemCount > 1 && isLayerControlsMinimized) {
        toggleLayerControlsMinimize();
      }
    }
    // Only depend on availableSystems.length, not on isLayerControlsMinimized
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableSystems.length, toggleLayerControlsMinimize]);

  return (
    <div
      className="bg-white shadow-lg rounded-lg w-full transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0"
      style={{
        height: isLayerControlsMinimized ? "2.5rem" : "auto",
      }}
    >
      <div
        className={`h-full flex flex-col ${isLayerControlsMinimized ? "p-2" : "p-4"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <button
            onClick={toggleLayerControlsMinimize}
            className="text-gray-600 hover:text-blue-600 font-bold text-lg transition"
            title="Toggle layer controls"
          >
            {isLayerControlsMinimized ? "∧" : "∨"}
          </button>
          {!isLayerControlsMinimized && (
            <h2 className="text-sm font-bold text-gray-900 ml-2">
              Body Systems
            </h2>
          )}
        </div>

        {/* Content */}
        {!isLayerControlsMinimized ? (
          <>
            <div className="flex items-center justify-end space-x-2 mt-3 mb-3 flex-shrink-0">
              <button
                onClick={showAllSystems}
                className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
              >
                Show All
              </button>
              <button
                onClick={hideAllSystems}
                className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
              >
                Hide All
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {availableSystems.map((system) => (
                <button
                  key={system}
                  onClick={() => toggleSystem(system)}
                  className={`px-3 py-2 rounded text-sm font-medium transition ${
                    visibleSystems.has(system)
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-gray-200 text-gray-600 shadow"
                  }`}
                >
                  <span className="flex items-center justify-center">
                    {visibleSystems.has(system) ? "✓" : "○"} {system}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-3 text-xs text-gray-500 flex-shrink-0">
              {visibleSystems.size} of {availableSystems.length} systems visible
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 mt-2 overflow-x-auto">
            {Array.from(visibleSystems)
              .filter((system) => availableSystems.includes(system))
              .map((system) => (
                <span
                  key={system}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex-shrink-0 cursor-pointer hover:bg-blue-200 transition"
                  onClick={() => toggleSystem(system)}
                  title={`Click to hide ${system}`}
                >
                  {system}
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
