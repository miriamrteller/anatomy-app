import React, { useState } from "react";

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
    useState<DescriptionState>("truncated");

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

  const getButtonText = () => {
    switch (descriptionState) {
      case "collapsed":
        return "Show description";
      case "truncated":
        return "Show more";
      case "expanded":
        return "Show less";
    }
  };

  const handleToggle = () => {
    if (descriptionState === "collapsed") {
      setDescriptionState("truncated");
    } else if (descriptionState === "truncated") {
      setDescriptionState("expanded");
    } else {
      setDescriptionState("collapsed");
    }
  };

  return (
    <div className="absolute left-4 top-4 pointer-events-auto z-10 max-w-[calc(100%/3)]">
      <div className="text-left bg-white rounded-lg shadow-md border border-gray-200 p-3 max-h-96 overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-900">
          {structure.name}
        </h3>
        <p className="text-xs text-gray-600 italic mb-2">
          {structure.latinName}
        </p>
        {descriptionState !== "collapsed" && (
          <div className="border-t border-gray-200 pt-2 mt-2">
            <p className="text-xs text-gray-700 leading-relaxed">
              {getDisplayText()}
            </p>
          </div>
        )}
        <button
          onClick={handleToggle}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
          title="Toggle description"
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  );
};
