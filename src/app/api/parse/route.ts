import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
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
} from "@microsoft/api-extractor-model";
import type {
  ApiNode,
  BreadcrumbItem,
  ParameterInfo,
  TypeParameterInfo,
  ParseResult,
} from "@/types/api-extractor";

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
          if (
            "text" in node &&
            typeof (node as { text: unknown }).text === "string"
          ) {
            text += (node as { text: string }).text;
          }
          if (
            "nodes" in node &&
            Array.isArray((node as { nodes: unknown[] }).nodes)
          ) {
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
  if (
    ApiTypeParameterListMixin.isBaseClassOf(item) &&
    item.typeParameters.length > 0
  ) {
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
  const isOptional = ApiOptionalMixin.isBaseClassOf(item)
    ? item.isOptional
    : undefined;
  const isReadonly = ApiReadonlyMixin.isBaseClassOf(item)
    ? item.isReadonly
    : undefined;
  const isStatic = ApiStaticMixin.isBaseClassOf(item)
    ? item.isStatic
    : undefined;
  const isAbstract = ApiAbstractMixin.isBaseClassOf(item)
    ? item.isAbstract
    : undefined;
  const isProtected = ApiProtectedMixin.isBaseClassOf(item)
    ? item.isProtected
    : undefined;

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

export async function POST(
  request: NextRequest
): Promise<NextResponse<ParseResult>> {
  let tempPath: string | null = null;

  try {
    const body = await request.json();
    const jsonString = body.json as string;

    if (!jsonString || typeof jsonString !== "string") {
      return NextResponse.json({
        success: false,
        error: "No JSON string provided",
      });
    }

    // Parse the JSON string to validate and build raw JSON map
    let jsonObj: Record<string, unknown>;
    try {
      jsonObj = JSON.parse(jsonString);
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: `Invalid JSON: ${
          e instanceof Error ? e.message : "Parse error"
        }`,
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

    // Write to a temporary file
    tempPath = join(tmpdir(), `api-extractor-${Date.now()}.api.json`);
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
    console.error("Parse error:", error);
    return NextResponse.json({
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
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
