/**
 * Serializable representation of an API Extractor node for the UI
 */
export interface ApiNode {
  /** Unique identifier for this node */
  id: string;
  /** The kind of API item (Class, Interface, Function, etc.) */
  kind: string;
  /** The name of the item */
  name: string;
  /** Canonical reference string */
  canonicalReference: string;
  /** Release tag (@public, @beta, @alpha, @internal) */
  releaseTag?: string;
  /** Documentation comment summary */
  docComment?: string;
  /** The full excerpt/declaration text */
  excerpt?: string;
  /** Parameters for functions/methods */
  parameters?: ParameterInfo[];
  /** Type parameters for generics */
  typeParameters?: TypeParameterInfo[];
  /** Return type for functions/methods */
  returnType?: string;
  /** Whether the item is optional */
  isOptional?: boolean;
  /** Whether the item is readonly */
  isReadonly?: boolean;
  /** Whether the item is static */
  isStatic?: boolean;
  /** Whether the item is abstract */
  isAbstract?: boolean;
  /** Whether the item is protected */
  isProtected?: boolean;
  /** Extended types for classes */
  extendsType?: string;
  /** Implemented interfaces for classes */
  implementsTypes?: string[];
  /** Extended interfaces for interfaces */
  extendsTypes?: string[];
  /** Property type */
  propertyType?: string;
  /** Variable type */
  variableType?: string;
  /** Type alias type */
  typeAliasType?: string;
  /** Child nodes */
  children: ApiNode[];
  /** Breadcrumb path from root to this node */
  breadcrumb: BreadcrumbItem[];
  /** Raw JSON data for this node (from the original api.json) */
  rawJson?: Record<string, unknown>;
  /** JS Model - comprehensive view of all API properties with actual values */
  jsModel: JsModelView;
}

/**
 * Represents a JS value with explicit type information
 */
export type JsValue =
  | { type: "undefined" }
  | { type: "null" }
  | { type: "string"; value: string }
  | { type: "number"; value: number }
  | { type: "boolean"; value: boolean }
  | { type: "array"; value: JsValue[]; length: number }
  | { type: "object"; value: Record<string, JsValue> }
  | { type: "function"; value: string }
  | { type: "circular"; value: string };

/**
 * Comprehensive view of all API properties from the ApiItem
 */
export interface JsModelView {
  /** Which mixins apply to this item */
  mixins: string[];
  /** All properties extracted from the item */
  properties: Record<string, JsValue>;
}

export interface ParameterInfo {
  name: string;
  type: string;
  isOptional: boolean;
}

export interface TypeParameterInfo {
  name: string;
  constraint?: string;
  defaultType?: string;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
  kind: string;
}

export interface ParseResult {
  success: boolean;
  data?: ApiNode;
  error?: string;
}
