"use client";

import { useState } from "react";
import { useViewer } from "@/context/ViewerContext";
import type { ApiNode, JsValue } from "@/types/api-extractor";

/**
 * Render a JsValue with proper formatting and colors
 */
function JsValueDisplay({ value, inline = false }: { value: JsValue; inline?: boolean }) {
  switch (value.type) {
    case "undefined":
      return <span className="text-gray-500 italic">undefined</span>;
    case "null":
      return <span className="text-gray-500 italic">null</span>;
    case "string":
      return <span className="text-green-400">"{value.value}"</span>;
    case "number":
      return <span className="text-blue-400">{value.value}</span>;
    case "boolean":
      return <span className="text-yellow-400">{value.value ? "true" : "false"}</span>;
    case "function":
      return <span className="text-purple-400 italic">{value.value}</span>;
    case "circular":
      return <span className="text-red-400 italic">{value.value}</span>;
    case "array":
      if (value.length === 0) {
        return <span className="text-gray-400">[] <span className="text-gray-500 text-xs">(empty)</span></span>;
      }
      if (inline) {
        return <span className="text-gray-400">[{value.length} items]</span>;
      }
      return (
        <div className="ml-4 border-l border-gray-700 pl-2">
          <span className="text-gray-500 text-xs">Array({value.length})</span>
          {value.value.map((item, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-500">[{i}]:</span>
              <JsValueDisplay value={item} inline />
            </div>
          ))}
        </div>
      );
    case "object":
      const keys = Object.keys(value.value);
      if (keys.length === 0) {
        return <span className="text-gray-400">{"{}"}</span>;
      }
      if (inline) {
        // For inline objects, show a condensed version
        if (keys.includes("text")) {
          const textVal = value.value["text"];
          if (textVal.type === "string") {
            return <span className="text-cyan-400">{`{ text: "${textVal.value}" }`}</span>;
          }
        }
        return <span className="text-gray-400">{"{...}"}</span>;
      }
      return (
        <div className="ml-4 border-l border-gray-700 pl-2">
          {keys.map((key) => (
            <div key={key} className="flex gap-2">
              <span className="text-orange-400">{key}:</span>
              <JsValueDisplay value={value.value[key]} inline />
            </div>
          ))}
        </div>
      );
    default:
      return <span className="text-gray-400">unknown</span>;
  }
}

function Breadcrumb({ node }: { node: ApiNode }) {
  const { navigateToNode } = useViewer();

  return (
    <div className="flex items-center flex-wrap gap-1 text-sm">
      {node.breadcrumb.map((item, index) => (
        <span key={item.id} className="flex items-center">
          {index > 0 && <span className="text-gray-500 mx-1">›</span>}
          <button
            onClick={() => navigateToNode(item.id)}
            className="text-blue-400 hover:text-blue-300 hover:underline"
          >
            {item.name || `(${item.kind})`}
          </button>
        </span>
      ))}
    </div>
  );
}

function PropertyRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div className="py-2 border-b border-gray-700">
      <dt className="text-sm font-medium text-gray-400">{label}</dt>
      <dd
        className={`mt-1 text-sm text-gray-200 ${
          mono ? "font-mono bg-gray-800 p-2 rounded overflow-x-auto" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-4 hover:bg-gray-800/50 transition-colors"
      >
        <span className="font-medium text-gray-200">{title}</span>
        <span className="text-gray-500">{isOpen ? "▼" : "▶"}</span>
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function NodeDetails() {
  const { selectedNode } = useViewer();
  const [showRawJson, setShowRawJson] = useState(false);

  if (!selectedNode) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg">Select a node to view details</p>
          <p className="text-sm mt-2">Click on any item in the tree</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto tree-scrollbar">
      {/* Header */}
      <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4">
        <Breadcrumb node={selectedNode} />
        <h2 className="text-xl font-bold mt-2 text-white">
          {selectedNode.name || `(${selectedNode.kind})`}
        </h2>
        <span className="inline-block mt-1 text-sm px-2 py-1 bg-gray-700 rounded text-gray-300">
          {selectedNode.kind}
        </span>
        {selectedNode.releaseTag && (
          <span
            className={`inline-block mt-1 ml-2 text-sm px-2 py-1 rounded ${
              selectedNode.releaseTag === "Public"
                ? "bg-green-900/50 text-green-400"
                : selectedNode.releaseTag === "Beta"
                ? "bg-yellow-900/50 text-yellow-400"
                : selectedNode.releaseTag === "Alpha"
                ? "bg-orange-900/50 text-orange-400"
                : "bg-red-900/50 text-red-400"
            }`}
          >
            @{selectedNode.releaseTag.toLowerCase()}
          </span>
        )}
      </div>

      {/* Content */}
      <div>
        {/* Basic Info */}
        <Section title="Basic Information">
          <dl>
            <PropertyRow
              label="Canonical Reference"
              value={selectedNode.canonicalReference}
              mono
            />
            {selectedNode.docComment && (
              <PropertyRow
                label="Documentation"
                value={selectedNode.docComment}
              />
            )}
          </dl>
        </Section>

        {/* Declaration */}
        {selectedNode.excerpt && (
          <Section title="Declaration">
            <pre className="font-mono text-sm bg-gray-800 p-3 rounded overflow-x-auto text-gray-200 whitespace-pre-wrap">
              {selectedNode.excerpt}
            </pre>
          </Section>
        )}

        {/* Modifiers */}
        {(selectedNode.isOptional ||
          selectedNode.isReadonly ||
          selectedNode.isStatic ||
          selectedNode.isAbstract ||
          selectedNode.isProtected) && (
          <Section title="Modifiers">
            <div className="flex flex-wrap gap-2">
              {selectedNode.isOptional && (
                <span className="px-2 py-1 bg-purple-900/50 text-purple-400 rounded text-sm">
                  optional
                </span>
              )}
              {selectedNode.isReadonly && (
                <span className="px-2 py-1 bg-blue-900/50 text-blue-400 rounded text-sm">
                  readonly
                </span>
              )}
              {selectedNode.isStatic && (
                <span className="px-2 py-1 bg-cyan-900/50 text-cyan-400 rounded text-sm">
                  static
                </span>
              )}
              {selectedNode.isAbstract && (
                <span className="px-2 py-1 bg-orange-900/50 text-orange-400 rounded text-sm">
                  abstract
                </span>
              )}
              {selectedNode.isProtected && (
                <span className="px-2 py-1 bg-yellow-900/50 text-yellow-400 rounded text-sm">
                  protected
                </span>
              )}
            </div>
          </Section>
        )}

        {/* Type Parameters */}
        {selectedNode.typeParameters &&
          selectedNode.typeParameters.length > 0 && (
            <Section title="Type Parameters">
              <div className="space-y-2">
                {selectedNode.typeParameters.map((tp, i) => (
                  <div key={i} className="bg-gray-800 p-2 rounded">
                    <span className="font-mono text-blue-400">{tp.name}</span>
                    {tp.constraint && (
                      <span className="text-gray-400 ml-2">
                        extends{" "}
                        <span className="font-mono text-green-400">
                          {tp.constraint}
                        </span>
                      </span>
                    )}
                    {tp.defaultType && (
                      <span className="text-gray-400 ml-2">
                        ={" "}
                        <span className="font-mono text-yellow-400">
                          {tp.defaultType}
                        </span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

        {/* Parameters */}
        {selectedNode.parameters && selectedNode.parameters.length > 0 && (
          <Section title="Parameters">
            <div className="space-y-2">
              {selectedNode.parameters.map((param, i) => (
                <div
                  key={i}
                  className="bg-gray-800 p-2 rounded flex items-center"
                >
                  <span className="font-mono text-orange-400">
                    {param.name}
                    {param.isOptional && (
                      <span className="text-gray-500">?</span>
                    )}
                  </span>
                  <span className="text-gray-500 mx-2">:</span>
                  <span className="font-mono text-green-400">{param.type}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Return Type */}
        {selectedNode.returnType && (
          <Section title="Return Type">
            <pre className="font-mono text-sm bg-gray-800 p-3 rounded text-green-400">
              {selectedNode.returnType}
            </pre>
          </Section>
        )}

        {/* Type Information */}
        {(selectedNode.propertyType ||
          selectedNode.variableType ||
          selectedNode.typeAliasType) && (
          <Section title="Type">
            <pre className="font-mono text-sm bg-gray-800 p-3 rounded text-green-400 overflow-x-auto whitespace-pre-wrap">
              {selectedNode.propertyType ||
                selectedNode.variableType ||
                selectedNode.typeAliasType}
            </pre>
          </Section>
        )}

        {/* Inheritance */}
        {(selectedNode.extendsType ||
          selectedNode.implementsTypes ||
          selectedNode.extendsTypes) && (
          <Section title="Inheritance">
            <dl>
              {selectedNode.extendsType && (
                <PropertyRow
                  label="Extends"
                  value={selectedNode.extendsType}
                  mono
                />
              )}
              {selectedNode.implementsTypes &&
                selectedNode.implementsTypes.length > 0 && (
                  <PropertyRow
                    label="Implements"
                    value={selectedNode.implementsTypes.join(", ")}
                    mono
                  />
                )}
              {selectedNode.extendsTypes &&
                selectedNode.extendsTypes.length > 0 && (
                  <PropertyRow
                    label="Extends"
                    value={selectedNode.extendsTypes.join(", ")}
                    mono
                  />
                )}
            </dl>
          </Section>
        )}

        {/* Children Summary */}
        {selectedNode.children.length > 0 && (
          <Section
            title={`Members (${selectedNode.children.length})`}
            defaultOpen={false}
          >
            <div className="space-y-1">
              {selectedNode.children.map((child) => (
                <div key={child.id} className="flex items-center text-sm">
                  <span className="text-gray-500 w-24">{child.kind}</span>
                  <span className="text-gray-300">
                    {child.name || `(${child.kind})`}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* JS Model View */}
        <Section title="JS Model" defaultOpen={false}>
          {/* Mixins */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Mixins Applied:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedNode.jsModel.mixins.length > 0 ? (
                selectedNode.jsModel.mixins.map((mixin) => (
                  <span
                    key={mixin}
                    className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-xs font-mono"
                  >
                    {mixin}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 italic text-sm">No mixins</span>
              )}
            </div>
          </div>

          {/* Properties */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">All Properties:</h4>
            <div className="bg-gray-800 rounded p-3 font-mono text-sm overflow-x-auto max-h-[500px] overflow-y-auto">
              {Object.entries(selectedNode.jsModel.properties).map(([key, value]) => (
                <div key={key} className="py-1 border-b border-gray-700 last:border-b-0">
                  <div className="flex gap-2">
                    <span className="text-orange-400 shrink-0">{key}:</span>
                    <div className="flex-1">
                      <JsValueDisplay value={value} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Raw JSON */}
        <Section title="Raw JSON Data" defaultOpen={false}>
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="text-sm text-blue-400 hover:text-blue-300 mb-2"
          >
            {showRawJson ? "Hide" : "Show"} raw JSON
          </button>
          {showRawJson && selectedNode.rawJson && (
            <pre className="font-mono text-xs bg-gray-800 p-3 rounded overflow-x-auto text-gray-300 max-h-96">
              {JSON.stringify(selectedNode.rawJson, null, 2)}
            </pre>
          )}
        </Section>
      </div>
    </div>
  );
}
