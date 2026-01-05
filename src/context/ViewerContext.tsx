"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { ApiNode } from "@/types/api-extractor";

interface ViewerContextType {
  /** The parsed API tree */
  parsedTree: ApiNode | null;
  /** Currently selected node */
  selectedNode: ApiNode | null;
  /** Whether parsing is in progress */
  isLoading: boolean;
  /** Error message if parsing failed */
  error: string | null;
  /** Set the parsed tree */
  setParsedTree: (tree: ApiNode | null) => void;
  /** Set the selected node */
  setSelectedNode: (node: ApiNode | null) => void;
  /** Set loading state */
  setIsLoading: (loading: boolean) => void;
  /** Set error message */
  setError: (error: string | null) => void;
  /** Parse JSON input */
  parseJson: (jsonString: string) => Promise<void>;
  /** Map of node IDs to nodes for quick lookup */
  nodeMap: Map<string, ApiNode>;
  /** Navigate to a node by ID */
  navigateToNode: (nodeId: string) => void;
  /** Expanded node IDs in the tree */
  expandedNodes: Set<string>;
  /** Toggle node expansion */
  toggleNodeExpansion: (nodeId: string) => void;
  /** Expand all ancestors of a node */
  expandAncestors: (node: ApiNode) => void;
}

const ViewerContext = createContext<ViewerContextType | undefined>(undefined);

function buildNodeMap(node: ApiNode, map: Map<string, ApiNode>): void {
  map.set(node.id, node);
  for (const child of node.children) {
    buildNodeMap(child, map);
  }
}

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [parsedTree, setParsedTree] = useState<ApiNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<ApiNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodeMap, setNodeMap] = useState<Map<string, ApiNode>>(new Map());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const parseJson = useCallback(async (jsonString: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedNode(null);

    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ json: jsonString }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setParsedTree(result.data);
        const map = new Map<string, ApiNode>();
        buildNodeMap(result.data, map);
        setNodeMap(map);
        // Expand the root node by default
        setExpandedNodes(new Set([result.data.id]));
      } else {
        setError(result.error || "Failed to parse JSON");
        setParsedTree(null);
        setNodeMap(new Map());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setParsedTree(null);
      setNodeMap(new Map());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const navigateToNode = useCallback(
    (nodeId: string) => {
      const node = nodeMap.get(nodeId);
      if (node) {
        setSelectedNode(node);
        // Expand all ancestors
        const ancestorIds = node.breadcrumb.map((b) => b.id);
        setExpandedNodes((prev) => {
          const next = new Set(prev);
          for (const id of ancestorIds) {
            next.add(id);
          }
          return next;
        });
      }
    },
    [nodeMap]
  );

  const toggleNodeExpansion = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const expandAncestors = useCallback((node: ApiNode) => {
    const ancestorIds = node.breadcrumb.map((b) => b.id);
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      for (const id of ancestorIds) {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <ViewerContext.Provider
      value={{
        parsedTree,
        selectedNode,
        isLoading,
        error,
        setParsedTree,
        setSelectedNode,
        setIsLoading,
        setError,
        parseJson,
        nodeMap,
        navigateToNode,
        expandedNodes,
        toggleNodeExpansion,
        expandAncestors,
      }}
    >
      {children}
    </ViewerContext.Provider>
  );
}

export function useViewer(): ViewerContextType {
  const context = useContext(ViewerContext);
  if (context === undefined) {
    throw new Error("useViewer must be used within a ViewerProvider");
  }
  return context;
}
