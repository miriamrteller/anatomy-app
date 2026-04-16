import React, { useState, useEffect } from "react";
import { useAnatomyStore } from "../stores/anatomy";

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
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  
  // Get the first chat source structure from the store
  const chatSourceStructures = useAnatomyStore((state) => state.chatSourceStructures);
  
  // Use first chat source structure if available, otherwise use the passed structure
  const displayStructure = chatSourceStructures?.length > 0 ? chatSourceStructures[0] : structure;

  // Auto-expand description when a new structure is clicked
  useEffect(() => {
    if (displayStructure) {
      setDescriptionState("expanded");
      setIsPanelVisible(true);
    }
  }, [displayStructure?.id]);

  if (!displayStructure || !isPanelVisible) return null;

  const getDisplayText = () => {
    if (descriptionState === "collapsed") {
      return null;
    }
    if (descriptionState === "truncated") {
      return displayStructure.description.slice(0, 150) + "...";
    }
    return displayStructure.description;
  };

  return (
    <div className="absolute left-4 top-4 pointer-events-auto z-10 max-w-[calc(100%/3)]">
      <div className="text-left flex flex-col relative">
        <button
          onClick={() => setIsPanelVisible(false)}
          className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 transition-colors"
          title="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex-shrink-0 pr-6">
          <h3 className="text-sm font-semibold text-gray-900">
            {displayStructure.name}
          </h3>
          <p className="text-xs text-gray-600 italic mb-2">
            {displayStructure.latinName}
          </p>
        </div>
        
        {descriptionState !== "collapsed" && (
          <div className="flex-1 min-h-0 mt-1">
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
