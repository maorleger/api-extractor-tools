"use client";

import { useViewer } from "@/context/ViewerContext";
import type { ApiNode } from "@/types/api-extractor";

// Icons for different API item kinds
const kindIcons: Record<string, string> = {
  Package: "📦",
  EntryPoint: "🚪",
  Class: "🔷",
  Interface: "🔶",
  Function: "⚡",
  Method: "🔧",
  MethodSignature: "🔧",
  Property: "📝",
  PropertySignature: "📝",
  Variable: "📌",
  TypeAlias: "🏷️",
  Enum: "📋",
  EnumMember: "▪️",
  Constructor: "🔨",
  Namespace: "📁",
  CallSignature: "📞",
  IndexSignature: "🔢",
  ConstructSignature: "🏗️",
  Model: "🌐",
};

// Colors for different API item kinds
const kindColors: Record<string, string> = {
  Package: "text-purple-400",
  EntryPoint: "text-green-400",
  Class: "text-blue-400",
  Interface: "text-yellow-400",
  Function: "text-orange-400",
  Method: "text-cyan-400",
  MethodSignature: "text-cyan-400",
  Property: "text-emerald-400",
  PropertySignature: "text-emerald-400",
  Variable: "text-pink-400",
  TypeAlias: "text-indigo-400",
  Enum: "text-amber-400",
  EnumMember: "text-amber-300",
  Constructor: "text-red-400",
  Namespace: "text-violet-400",
  Model: "text-gray-400",
};

interface TreeNodeProps {
  node: ApiNode;
  depth: number;
}

function TreeNode({ node, depth }: TreeNodeProps) {
  const { selectedNode, setSelectedNode, expandedNodes, toggleNodeExpansion } = useViewer();
  const isSelected = selectedNode?.id === node.id;
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;

  const icon = kindIcons[node.kind] || "📄";
  const colorClass = kindColors[node.kind] || "text-gray-400";

  const handleClick = () => {
    setSelectedNode(node);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeExpansion(node.id);
  };

  return (
    <div>
      <div
        className={`flex cursor-pointer items-center px-2 py-1 transition-colors hover:bg-gray-700/50 ${
          isSelected ? "border-l-2 border-blue-500 bg-blue-900/50" : ""
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/Collapse Toggle */}
        <span
          className={`mr-1 flex h-4 w-4 items-center justify-center text-xs ${
            hasChildren ? "cursor-pointer rounded hover:bg-gray-600" : ""
          }`}
          onClick={hasChildren ? handleToggle : undefined}
        >
          {hasChildren ? (isExpanded ? "▼" : "▶") : ""}
        </span>

        {/* Icon */}
        <span className="mr-2">{icon}</span>

        {/* Name */}
        <span className={`${colorClass} truncate font-medium`}>
          {node.name || `(${node.kind})`}
        </span>

        {/* Kind badge */}
        <span className="ml-2 hidden text-xs text-gray-500 group-hover:inline">{node.kind}</span>

        {/* Release tag badge */}
        {node.releaseTag && node.releaseTag !== "Public" && (
          <span
            className={`ml-2 rounded px-1.5 py-0.5 text-xs ${
              node.releaseTag === "Beta"
                ? "bg-yellow-900/50 text-yellow-400"
                : node.releaseTag === "Alpha"
                  ? "bg-orange-900/50 text-orange-400"
                  : node.releaseTag === "Internal"
                    ? "bg-red-900/50 text-red-400"
                    : "bg-gray-700 text-gray-400"
            }`}
          >
            {node.releaseTag.toLowerCase()}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreeView() {
  const { parsedTree } = useViewer();

  if (!parsedTree) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Parse JSON to view the API tree
      </div>
    );
  }

  return (
    <div className="tree-scrollbar bg-gray-850 h-full overflow-auto">
      <div className="py-2">
        <TreeNode node={parsedTree} depth={0} />
      </div>
    </div>
  );
}
