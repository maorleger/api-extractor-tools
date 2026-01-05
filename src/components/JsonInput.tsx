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
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor="json-input"
          className="text-sm font-medium text-gray-300"
        >
          Paste API Extractor JSON
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Ctrl+Enter to parse</span>
          <button
            onClick={handleParse}
            disabled={isLoading || !jsonText.trim()}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 
                       disabled:cursor-not-allowed text-white text-sm font-medium 
                       rounded transition-colors"
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
        className={`flex-1 w-full p-3 bg-gray-800 border rounded-lg font-mono text-sm
                    text-gray-100 placeholder-gray-500 resize-none focus:outline-none 
                    focus:ring-2 focus:ring-blue-500 ${
                      parsedTree ? "min-h-[100px]" : "min-h-[200px]"
                    } ${error ? "border-red-500" : "border-gray-600"}`}
        spellCheck={false}
      />

      {error && (
        <div className="mt-2 p-2 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
