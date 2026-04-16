import React, { useState, useEffect } from "react";

interface Structure {
  id: string;
  name: string;
  latinName: string;
  description: string;
  [key: string]: any;
}

interface StructureInfoPanelProps {
  structure: Structure | null;
}

type DescriptionState = "collapsed" | "truncated" | "expanded";

export const StructureInfoPanel: React.FC<StructureInfoPanelProps> = ({
  structure,
}) => {
  const [descriptionState, setDescriptionState] =
    useState<DescriptionState>("expanded");

  // Auto-expand description when a new structure is clicked
  useEffect(() => {
    if (structure) {
      setDescriptionState("expanded");
    }
  }, [structure?.id]);

  if (!structure) return null;

  const getDisplayText = () => {
    if (descriptionState === "collapsed") {
      return null;
    }
    if (descriptionState === "truncated") {
      return structure.description.slice(0, 150) + "...";
    }
    return structure.description;
  };

  return (
    <div className="absolute left-4 top-4 pointer-events-auto z-10 max-w-[calc(100%/3)] max-h-full">
      <div className="text-left bg-white rounded-lg shadow-md border border-gray-200 p-3 flex flex-col" style={{ maxHeight: "70vh" }}>
        <div className="flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-900">
            {structure.name}
          </h3>
          <p className="text-xs text-gray-600 italic mb-2">
            {structure.latinName}
          </p>
        </div>
        
        {descriptionState !== "collapsed" && (
          <div className="border-t border-gray-200 pt-2 mt-2 flex-1 overflow-y-auto min-h-0">
            <p className="text-xs text-gray-700 leading-relaxed">
              {getDisplayText()}
            </p>
          </div>
        )}
        
        <div className="flex-shrink-0 mt-2 flex gap-2">
          {descriptionState === "truncated" ? (
            <>
              <button
                onClick={() => setDescriptionState("expanded")}
                className="flex-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                title="Show full description"
              >
                Show more
              </button>
              <button
                onClick={() => setDescriptionState("collapsed")}
                className="flex-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                title="Hide description"
              >
                Hide
              </button>
            </>
          ) : descriptionState === "expanded" ? (
            <button
              onClick={() => setDescriptionState("truncated")}
              className="w-full text-xs text-blue-600 hover:text-blue-800 transition-colors"
              title="Show less description"
            >
              Show less
            </button>
          ) : (
            <button
              onClick={() => setDescriptionState("truncated")}
              className="w-full text-xs text-blue-600 hover:text-blue-800 transition-colors"
              title="Show description"
            >
              Show description
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
