"use client";

import { useState } from "react";
import { useViewer } from "@/context/ViewerContext";

export default function JsonInput() {
  const [jsonText, setJsonText] = useState("");
  const { parseJson, isLoading, error, parsedTree } = useViewer();

  const handleParse = () => {
    if (jsonText.trim()) {
      parseJson(jsonText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to parse
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleParse();
    }
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor="json-input" className="text-sm font-medium text-gray-300">
          Paste API Extractor JSON
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Ctrl+Enter to parse</span>
          <button
            onClick={handleParse}
            disabled={isLoading || !jsonText.trim()}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
          >
            {isLoading ? "Parsing..." : "Parse"}
          </button>
        </div>
      </div>

      <textarea
        id="json-input"
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder='{"metadata": {...}, "kind": "Package", ...}'
        className={`w-full flex-1 resize-none rounded-lg border bg-gray-800 p-3 font-mono text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          parsedTree ? "min-h-[100px]" : "min-h-[200px]"
        } ${error ? "border-red-500" : "border-gray-600"}`}
        spellCheck={false}
      />

      {error && (
        <div className="mt-2 rounded border border-red-700 bg-red-900/50 p-2 text-sm text-red-300">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
