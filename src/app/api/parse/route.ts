import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

// Force Node.js runtime (required for fs operations, not supported in Edge)
export const runtime = "nodejs";

// Vercel serverless function config
export const maxDuration = 30; // seconds
import {
  ApiModel,
  ApiItem,
  ApiNameMixin,
  ApiReleaseTagMixin,
  ApiDocumentedItem,
  ApiDeclaredItem,
  ApiParameterListMixin,
  ApiTypeParameterListMixin,
  ApiReturnTypeMixin,
  ApiOptionalMixin,
  ApiReadonlyMixin,
  ApiStaticMixin,
  ApiAbstractMixin,
  ApiProtectedMixin,
  ApiPropertyItem,
  ApiTypeAlias,
  ApiVariable,
  ApiClass,
  ApiInterface,
  ReleaseTag,
  ApiItemContainerMixin,
  ApiExportedMixin,
  ApiInitializerMixin,
} from "@microsoft/api-extractor-model";
import type {
  ApiNode,
  BreadcrumbItem,
  ParameterInfo,
  TypeParameterInfo,
  ParseResult,
  JsModelView,
  JsValue,
} from "@/types/api-extractor";

// Security constants
const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB max payload

let nodeIdCounter = 0;

function generateNodeId(): string {
  return `node-${++nodeIdCounter}`;
}

function getReleaseTagName(releaseTag: ReleaseTag): string | undefined {
  switch (releaseTag) {
    case ReleaseTag.Public:
      return "Public";
    case ReleaseTag.Beta:
      return "Beta";
    case ReleaseTag.Alpha:
      return "Alpha";
    case ReleaseTag.Internal:
      return "Internal";
    default:
      return undefined;
  }
}

function extractDocComment(item: ApiItem): string | undefined {
  if (item instanceof ApiDocumentedItem && item.tsdocComment) {
    const summary = item.tsdocComment.summarySection;
    if (summary) {
      // Extract plain text from the summary nodes
      let text = "";
      const extractText = (node: unknown): void => {
        if (node && typeof node === "object") {
          if ("text" in node && typeof (node as { text: unknown }).text === "string") {
            text += (node as { text: string }).text;
          }
          if ("nodes" in node && Array.isArray((node as { nodes: unknown[] }).nodes)) {
            for (const child of (node as { nodes: unknown[] }).nodes) {
              extractText(child);
            }
          }
        }
      };
      extractText(summary);
      return text.trim() || undefined;
    }
  }
  return undefined;
}

function extractExcerpt(item: ApiItem): string | undefined {
  if (item instanceof ApiDeclaredItem) {
    return item.excerpt.text.trim() || undefined;
  }
  return undefined;
}

function extractParameters(item: ApiItem): ParameterInfo[] | undefined {
  if (ApiParameterListMixin.isBaseClassOf(item) && item.parameters.length > 0) {
    return item.parameters.map((param) => ({
      name: param.name,
      type: param.parameterTypeExcerpt.text.trim(),
      isOptional: param.isOptional,
    }));
  }
  return undefined;
}

function extractTypeParameters(item: ApiItem): TypeParameterInfo[] | undefined {
  if (ApiTypeParameterListMixin.isBaseClassOf(item) && item.typeParameters.length > 0) {
    return item.typeParameters.map((tp) => ({
      name: tp.name,
      constraint: tp.constraintExcerpt.text.trim() || undefined,
      defaultType: tp.defaultTypeExcerpt.text.trim() || undefined,
    }));
  }
  return undefined;
}

function extractReturnType(item: ApiItem): string | undefined {
  if (ApiReturnTypeMixin.isBaseClassOf(item)) {
    return item.returnTypeExcerpt.text.trim() || undefined;
  }
  return undefined;
}

/**
 * Convert a JS value to a serializable JsValue representation
 */
function toJsValue(value: unknown, seen: WeakSet<object>, depth: number = 0): JsValue {
  // Prevent infinite recursion
  if (depth > 5) {
    return { type: "string", value: "[max depth reached]" };
  }

  if (value === undefined) {
    return { type: "undefined" };
  }
  if (value === null) {
    return { type: "null" };
  }
  if (typeof value === "string") {
    return { type: "string", value };
  }
  if (typeof value === "number") {
    return { type: "number", value };
  }
  if (typeof value === "boolean") {
    return { type: "boolean", value };
  }
  if (typeof value === "function") {
    return { type: "function", value: "[Function]" };
  }
  if (Array.isArray(value)) {
    // Check for circular reference
    if (seen.has(value)) {
      return { type: "circular", value: "[Circular Array]" };
    }
    seen.add(value);
    return {
      type: "array",
      value: value.map((v) => toJsValue(v, seen, depth + 1)),
      length: value.length,
    };
  }
  if (typeof value === "object") {
    // Check for circular reference
    if (seen.has(value)) {
      return { type: "circular", value: "[Circular Object]" };
    }
    seen.add(value);

    // Special handling for common API Extractor types
    const obj = value as Record<string, unknown>;

    // If it has a 'text' property (like Excerpt), extract it simply
    if ("text" in obj && typeof obj.text === "string") {
      return {
        type: "object",
        value: {
          text: { type: "string", value: obj.text },
          isEmpty: toJsValue(obj.isEmpty, seen, depth + 1),
        },
      };
    }

    // For Parameter objects
    if ("name" in obj && "parameterTypeExcerpt" in obj) {
      return {
        type: "object",
        value: {
          name: toJsValue(obj.name, seen, depth + 1),
          parameterTypeExcerpt: toJsValue(obj.parameterTypeExcerpt, seen, depth + 1),
          isOptional: toJsValue(obj.isOptional, seen, depth + 1),
        },
      };
    }

    // For TypeParameter objects
    if ("name" in obj && "constraintExcerpt" in obj) {
      return {
        type: "object",
        value: {
          name: toJsValue(obj.name, seen, depth + 1),
          constraintExcerpt: toJsValue(obj.constraintExcerpt, seen, depth + 1),
          defaultTypeExcerpt: toJsValue(obj.defaultTypeExcerpt, seen, depth + 1),
          isOptional: toJsValue(obj.isOptional, seen, depth + 1),
        },
      };
    }

    // Generic object - extract enumerable properties
    const result: Record<string, JsValue> = {};
    try {
      const keys = Object.keys(obj).slice(0, 20); // Limit keys to prevent huge objects
      for (const key of keys) {
        try {
          result[key] = toJsValue(obj[key], seen, depth + 1);
        } catch {
          result[key] = { type: "string", value: "[Error reading property]" };
        }
      }
      if (Object.keys(obj).length > 20) {
        result["..."] = {
          type: "string",
          value: `[${Object.keys(obj).length - 20} more properties]`,
        };
      }
    } catch {
      return { type: "string", value: "[Object]" };
    }
    return { type: "object", value: result };
  }
  return { type: "string", value: String(value) };
}

/**
 * Extract comprehensive JS model from an ApiItem
 */
function extractJsModel(item: ApiItem): JsModelView {
  const mixins: string[] = [];
  const properties: Record<string, JsValue> = {};
  const seen = new WeakSet<object>();

  // Check each mixin and extract its properties
  if (ApiNameMixin.isBaseClassOf(item)) {
    mixins.push("ApiNameMixin");
    properties["name"] = toJsValue(item.name, seen);
  } else {
    properties["name"] = { type: "undefined" };
  }

  if (ApiReleaseTagMixin.isBaseClassOf(item)) {
    mixins.push("ApiReleaseTagMixin");
    properties["releaseTag"] = toJsValue(getReleaseTagName(item.releaseTag), seen);
  } else {
    properties["releaseTag"] = { type: "undefined" };
  }

  if (ApiParameterListMixin.isBaseClassOf(item)) {
    mixins.push("ApiParameterListMixin");
    properties["parameters"] = toJsValue(
      item.parameters.map((p) => ({
        name: p.name,
        type: p.parameterTypeExcerpt.text,
        isOptional: p.isOptional,
      })),
      seen
    );
    properties["overloadIndex"] = toJsValue(item.overloadIndex, seen);
  } else {
    properties["parameters"] = { type: "undefined" };
    properties["overloadIndex"] = { type: "undefined" };
  }

  if (ApiTypeParameterListMixin.isBaseClassOf(item)) {
    mixins.push("ApiTypeParameterListMixin");
    properties["typeParameters"] = toJsValue(
      item.typeParameters.map((tp) => ({
        name: tp.name,
        constraint: tp.constraintExcerpt.text || undefined,
        defaultType: tp.defaultTypeExcerpt.text || undefined,
        isOptional: tp.isOptional,
      })),
      seen
    );
  } else {
    properties["typeParameters"] = { type: "undefined" };
  }

  if (ApiReturnTypeMixin.isBaseClassOf(item)) {
    mixins.push("ApiReturnTypeMixin");
    properties["returnTypeExcerpt"] = toJsValue(
      {
        text: item.returnTypeExcerpt.text,
        isEmpty: item.returnTypeExcerpt.isEmpty,
      },
      seen
    );
  } else {
    properties["returnTypeExcerpt"] = { type: "undefined" };
  }

  if (ApiOptionalMixin.isBaseClassOf(item)) {
    mixins.push("ApiOptionalMixin");
    properties["isOptional"] = toJsValue(item.isOptional, seen);
  } else {
    properties["isOptional"] = { type: "undefined" };
  }

  if (ApiReadonlyMixin.isBaseClassOf(item)) {
    mixins.push("ApiReadonlyMixin");
    properties["isReadonly"] = toJsValue(item.isReadonly, seen);
  } else {
    properties["isReadonly"] = { type: "undefined" };
  }

  if (ApiStaticMixin.isBaseClassOf(item)) {
    mixins.push("ApiStaticMixin");
    properties["isStatic"] = toJsValue(item.isStatic, seen);
  } else {
    properties["isStatic"] = { type: "undefined" };
  }

  if (ApiAbstractMixin.isBaseClassOf(item)) {
    mixins.push("ApiAbstractMixin");
    properties["isAbstract"] = toJsValue(item.isAbstract, seen);
  } else {
    properties["isAbstract"] = { type: "undefined" };
  }

  if (ApiProtectedMixin.isBaseClassOf(item)) {
    mixins.push("ApiProtectedMixin");
    properties["isProtected"] = toJsValue(item.isProtected, seen);
  } else {
    properties["isProtected"] = { type: "undefined" };
  }

  if (ApiExportedMixin.isBaseClassOf(item)) {
    mixins.push("ApiExportedMixin");
    properties["isExported"] = toJsValue(item.isExported, seen);
  } else {
    properties["isExported"] = { type: "undefined" };
  }

  if (ApiInitializerMixin.isBaseClassOf(item)) {
    mixins.push("ApiInitializerMixin");
    properties["initializerExcerpt"] = toJsValue(
      item.initializerExcerpt
        ? {
            text: item.initializerExcerpt.text,
            isEmpty: item.initializerExcerpt.isEmpty,
          }
        : undefined,
      seen
    );
  } else {
    properties["initializerExcerpt"] = { type: "undefined" };
  }

  if (ApiItemContainerMixin.isBaseClassOf(item)) {
    mixins.push("ApiItemContainerMixin");
    properties["members"] = toJsValue(
      item.members.map((m) => ({
        kind: m.kind,
        displayName: ApiNameMixin.isBaseClassOf(m) ? m.name : `(${m.kind})`,
      })),
      seen
    );
    properties["preserveMemberOrder"] = toJsValue(item.preserveMemberOrder, seen);
  } else {
    properties["members"] = { type: "undefined" };
    properties["preserveMemberOrder"] = { type: "undefined" };
  }

  // Base ApiItem properties
  properties["kind"] = toJsValue(item.kind, seen);
  properties["canonicalReference"] = toJsValue(item.canonicalReference.toString(), seen);
  properties["containerKey"] = toJsValue(item.containerKey, seen);

  // ApiDocumentedItem
  if (item instanceof ApiDocumentedItem) {
    mixins.push("ApiDocumentedItem");
    properties["tsdocComment"] = item.tsdocComment
      ? toJsValue(
          {
            hasSummary: !!item.tsdocComment.summarySection,
            hasRemarks: !!item.tsdocComment.remarksBlock,
            hasReturns: !!item.tsdocComment.returnsBlock,
            hasDeprecated: !!item.tsdocComment.deprecatedBlock,
            paramCount: item.tsdocComment.params.count,
            typeParamCount: item.tsdocComment.typeParams.count,
          },
          seen
        )
      : { type: "undefined" };
  } else {
    properties["tsdocComment"] = { type: "undefined" };
  }

  // ApiDeclaredItem
  if (item instanceof ApiDeclaredItem) {
    mixins.push("ApiDeclaredItem");
    properties["excerpt"] = toJsValue(
      { text: item.excerpt.text, isEmpty: item.excerpt.isEmpty },
      seen
    );
    properties["excerptTokens"] = toJsValue(
      item.excerptTokens.map((t) => ({ kind: t.kind, text: t.text })),
      seen
    );
    properties["fileUrlPath"] = toJsValue(item.fileUrlPath, seen);
  } else {
    properties["excerpt"] = { type: "undefined" };
    properties["excerptTokens"] = { type: "undefined" };
    properties["fileUrlPath"] = { type: "undefined" };
  }

  // Class-specific
  if (item instanceof ApiClass) {
    properties["extendsType"] = item.extendsType
      ? toJsValue({ text: item.extendsType.excerpt.text }, seen)
      : { type: "undefined" };
    properties["implementsTypes"] = toJsValue(
      item.implementsTypes.map((t) => ({ text: t.excerpt.text })),
      seen
    );
  }

  // Interface-specific
  if (item instanceof ApiInterface) {
    properties["extendsTypes"] = toJsValue(
      item.extendsTypes.map((t) => ({ text: t.excerpt.text })),
      seen
    );
  }

  // Property-specific
  if (item instanceof ApiPropertyItem) {
    properties["propertyTypeExcerpt"] = toJsValue(
      {
        text: item.propertyTypeExcerpt.text,
        isEmpty: item.propertyTypeExcerpt.isEmpty,
      },
      seen
    );
    properties["isEventProperty"] = toJsValue(item.isEventProperty, seen);
  }

  // Variable-specific
  if (item instanceof ApiVariable) {
    properties["variableTypeExcerpt"] = toJsValue(
      {
        text: item.variableTypeExcerpt.text,
        isEmpty: item.variableTypeExcerpt.isEmpty,
      },
      seen
    );
  }

  // TypeAlias-specific
  if (item instanceof ApiTypeAlias) {
    properties["typeExcerpt"] = toJsValue(
      { text: item.typeExcerpt.text, isEmpty: item.typeExcerpt.isEmpty },
      seen
    );
  }

  return { mixins, properties };
}

function serializeApiItem(
  item: ApiItem,
  breadcrumb: BreadcrumbItem[],
  rawJsonMap: Map<string, Record<string, unknown>>
): ApiNode {
  const id = generateNodeId();
  const name = ApiNameMixin.isBaseClassOf(item) ? item.name : "";
  const kind = item.kind;

  // Build current breadcrumb
  const currentBreadcrumb: BreadcrumbItem[] = [
    ...breadcrumb,
    { id, name: name || `(${kind})`, kind },
  ];

  // Extract release tag
  let releaseTag: string | undefined;
  if (ApiReleaseTagMixin.isBaseClassOf(item)) {
    releaseTag = getReleaseTagName(item.releaseTag);
  }

  // Extract modifiers
  const isOptional = ApiOptionalMixin.isBaseClassOf(item) ? item.isOptional : undefined;
  const isReadonly = ApiReadonlyMixin.isBaseClassOf(item) ? item.isReadonly : undefined;
  const isStatic = ApiStaticMixin.isBaseClassOf(item) ? item.isStatic : undefined;
  const isAbstract = ApiAbstractMixin.isBaseClassOf(item) ? item.isAbstract : undefined;
  const isProtected = ApiProtectedMixin.isBaseClassOf(item) ? item.isProtected : undefined;

  // Extract property/variable types
  let propertyType: string | undefined;
  let variableType: string | undefined;
  let typeAliasType: string | undefined;

  if (item instanceof ApiPropertyItem) {
    propertyType = item.propertyTypeExcerpt.text.trim() || undefined;
  }
  if (item instanceof ApiVariable) {
    variableType = item.variableTypeExcerpt.text.trim() || undefined;
  }
  if (item instanceof ApiTypeAlias) {
    typeAliasType = item.typeExcerpt.text.trim() || undefined;
  }

  // Extract inheritance for classes
  let extendsType: string | undefined;
  let implementsTypes: string[] | undefined;

  if (item instanceof ApiClass) {
    if (item.extendsType) {
      extendsType = item.extendsType.excerpt.text.trim() || undefined;
    }
    if (item.implementsTypes.length > 0) {
      implementsTypes = item.implementsTypes.map((t) => t.excerpt.text.trim());
    }
  }

  // Extract inheritance for interfaces
  let extendsTypes: string[] | undefined;
  if (item instanceof ApiInterface && item.extendsTypes.length > 0) {
    extendsTypes = item.extendsTypes.map((t) => t.excerpt.text.trim());
  }

  // Get raw JSON for this item
  const canonicalRef = item.canonicalReference.toString();
  const rawJson = rawJsonMap.get(canonicalRef);

  // Extract comprehensive JS model
  const jsModel = extractJsModel(item);

  // Process children
  const children: ApiNode[] = [];
  for (const member of item.members) {
    children.push(serializeApiItem(member, currentBreadcrumb, rawJsonMap));
  }

  return {
    id,
    kind,
    name,
    canonicalReference: canonicalRef,
    releaseTag,
    docComment: extractDocComment(item),
    excerpt: extractExcerpt(item),
    parameters: extractParameters(item),
    typeParameters: extractTypeParameters(item),
    returnType: extractReturnType(item),
    isOptional,
    isReadonly,
    isStatic,
    isAbstract,
    isProtected,
    extendsType,
    implementsTypes,
    extendsTypes,
    propertyType,
    variableType,
    typeAliasType,
    children,
    breadcrumb: currentBreadcrumb,
    rawJson,
    jsModel,
  };
}

function buildRawJsonMap(
  jsonObj: Record<string, unknown>,
  map: Map<string, Record<string, unknown>>
): void {
  if (typeof jsonObj !== "object" || jsonObj === null) return;

  const canonicalReference = jsonObj.canonicalReference as string | undefined;
  if (canonicalReference) {
    map.set(canonicalReference, jsonObj);
  }

  const members = jsonObj.members as Record<string, unknown>[] | undefined;
  if (Array.isArray(members)) {
    for (const member of members) {
      buildRawJsonMap(member, map);
    }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ParseResult>> {
  let tempPath: string | null = null;

  try {
    // Check content length header for early rejection
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `Payload too large. Maximum size is ${MAX_PAYLOAD_SIZE / 1024 / 1024}MB`,
        },
        { status: 413 }
      );
    }

    const body = await request.json();
    const jsonString = body.json as string;

    if (!jsonString || typeof jsonString !== "string") {
      return NextResponse.json({
        success: false,
        error: "No JSON string provided",
      });
    }

    // Validate payload size
    if (jsonString.length > MAX_PAYLOAD_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `Payload too large. Maximum size is ${MAX_PAYLOAD_SIZE / 1024 / 1024}MB`,
        },
        { status: 413 }
      );
    }

    // Parse the JSON string to validate and build raw JSON map
    let jsonObj: Record<string, unknown>;
    try {
      jsonObj = JSON.parse(jsonString);
    } catch {
      return NextResponse.json({
        success: false,
        error: "Invalid JSON: Parse error",
      });
    }

    // Validate it looks like an API Extractor file
    if (!jsonObj.metadata || !jsonObj.kind) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API Extractor JSON: missing "metadata" or "kind" field',
      });
    }

    // Build a map of canonical references to raw JSON objects
    const rawJsonMap = new Map<string, Record<string, unknown>>();
    buildRawJsonMap(jsonObj, rawJsonMap);

    // Reset node counter for each parse
    nodeIdCounter = 0;

    // Write to a temporary file with unique UUID to prevent collisions
    const uniqueId = randomUUID();
    tempPath = join(tmpdir(), `api-extractor-${uniqueId}.api.json`);
    writeFileSync(tempPath, jsonString, "utf-8");

    // Load using the API Extractor Model library
    const apiModel = new ApiModel();
    const apiPackage = apiModel.loadPackage(tempPath);

    // Serialize the package to our ApiNode structure
    const rootNode = serializeApiItem(apiPackage, [], rawJsonMap);

    return NextResponse.json({
      success: true,
      data: rootNode,
    });
  } catch (error) {
    // Log full error server-side for debugging
    console.error("Parse error:", error);

    // Return sanitized error message to client
    return NextResponse.json({
      success: false,
      error: "Failed to parse API Extractor JSON. Please ensure the file is valid.",
    });
  } finally {
    // Clean up temp file
    if (tempPath) {
      try {
        unlinkSync(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
