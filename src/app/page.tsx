"use client";

import { useViewer } from "@/context/ViewerContext";
import JsonInput from "@/components/JsonInput";
import TreeView from "@/components/TreeView";
import NodeDetails from "@/components/NodeDetails";

export default function Home() {
  const { parsedTree } = useViewer();

  return (
    <main className="flex h-screen flex-col">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-800 px-6 py-4">
        <h1 className="text-xl font-bold text-white">API Extractor Viewer</h1>
        <p className="mt-1 text-sm text-gray-400">
          Paste your api.json content to visualize the API structure
        </p>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Input and Tree */}
        <div className="flex w-1/2 flex-col border-r border-gray-700">
          {/* JSON Input */}
          <div className={`${parsedTree ? "h-1/3" : "flex-1"} border-b border-gray-700`}>
            <JsonInput />
          </div>

          {/* Tree View */}
          {parsedTree && (
            <div className="flex-1 overflow-hidden">
              <TreeView />
            </div>
          )}
        </div>

        {/* Right Panel - Node Details */}
        <div className="w-1/2 overflow-hidden">
          <NodeDetails />
        </div>
      </div>
    </main>
  );
}
