import React, { useMemo } from "react";
import { useSystemSVGs } from "../hooks/useSystemSVGs";
import { AnatomySVG } from "./AnatomySVG";
import { SystemEnum } from "../types";

/**
 * SystemCanvas component that handles loading and rendering all body system SVGs.
 * Composes the useSystemSVGs hook with the AnatomySVG component.
 * Manages multi-system loading state and error display.
 */
export const SystemCanvas: React.FC = () => {
  const { systems, allLoading, anyError } = useSystemSVGs();

  // Extract just the content from each system's data
  const systemContents = useMemo(() => {
    const contents: Record<SystemEnum, string> = {} as any;
    Object.entries(systems).forEach(([system, data]) => {
      contents[system as SystemEnum] = data.content;
    });
    return contents;
  }, [systems]);

  return (
    <div className="flex-1 flex flex-col gap-4">
      <div className="flex-1 bg-white rounded-lg shadow-md overflow-hidden">
        {allLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-600">Loading anatomical systems...</div>
            </div>
          </div>
        )}
        {anyError && !allLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-600 mb-2">
                Error loading one or more systems
              </p>
              <p className="text-sm text-gray-600">
                Please refresh the page to try again
              </p>
            </div>
          </div>
        )}
        {!allLoading && !anyError && <AnatomySVG systems={systemContents} />}
      </div>
    </div>
  );
};
