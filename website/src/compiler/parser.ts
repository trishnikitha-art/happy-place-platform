/**
 * YAML Parser — reads GENERATION_MANIFEST.yaml into an immutable AST.
 */

import * as YAML from "yaml";
import { isMap, isSeq, isScalar, isNode } from "yaml";
import type { Node as YAMLNode } from "yaml";
import type {
  ASTValue,
  ManifestNode,
  SectionNode,
  DefinitionNode,
  FieldNode,
} from "./ast";
import type { SourceLocation } from "./diagnostics";
import { DiagnosticCollector, createDiagnostic } from "./diagnostics";
import type { CompilerDiagnostic } from "./diagnostics";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ParseResult {
  readonly ast: ManifestNode;
  readonly diagnostics: readonly CompilerDiagnostic[];
}

export function parseManifest(input: string, filename: string): ParseResult {
  const collector = new DiagnosticCollector();
  const lineCounter = new YAML.LineCounter();

  let yamlDoc: YAML.Document<YAMLNode, true>;
  try {
    yamlDoc = YAML.parseDocument(input, {
      keepSourceTokens: true,
      lineCounter,
      prettyErrors: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    collector.push(createDiagnostic({
      code: "E002",
      source_location: { file: filename, line: 1, column: 1, length: input.length },
      message: `Invalid YAML syntax: ${msg}`,
    }));
    return { ast: emptyManifest(filename), diagnostics: collector.freeze() };
  }

  for (const err of yamlDoc.errors) {
    const lp = err.linePos?.[0];
    collector.push(createDiagnostic({
      code: "E002",
      source_location: { file: filename, line: lp?.line ?? 1, column: lp?.col ?? 1, length: 1 },
      message: `YAML parse error: ${err.message}`,
    }));
  }

  const root = yamlDoc.contents;
  if (!root || !isMap(root)) {
    collector.push(createDiagnostic({
      code: "E003",
      source_location: { file: filename, line: 1, column: 1, length: 1 },
      message: "Manifest root must be a YAML mapping",
    }));
    return { ast: emptyManifest(filename), diagnostics: collector.freeze() };
  }

  return { ast: buildManifestNode(root, filename, lineCounter), diagnostics: collector.freeze() };
}

// ---------------------------------------------------------------------------
// Cast helpers — yaml library uses `unknown` generics, we know the structure
// ---------------------------------------------------------------------------

function asNode(val: unknown): YAMLNode | undefined {
  return val as YAMLNode | undefined;
}

function asMap(node: YAMLNode): YAML.YAMLMap {
  return node as unknown as YAML.YAMLMap;
}

// ---------------------------------------------------------------------------
// Internal AST builders
// ---------------------------------------------------------------------------

function buildManifestNode(
  map: YAML.YAMLMap,
  filename: string,
  lc: YAML.LineCounter,
): ManifestNode {
  const loc = nodeLocation(map, filename, lc);

  const manifestPair = map.items.find(
    (p) => isScalar(p.key) && p.key.value === "manifest",
  );

  let manifest: FieldNode;
  if (manifestPair && isMap(manifestPair.value)) {
    const entries: Record<string, ASTValue> = {};
    const inner = asMap(asNode(manifestPair.value)!);
    for (const item of inner.items) {
      if (isScalar(item.key)) {
        entries[String(item.key.value)] = buildValue(asNode(item.value), filename, lc);
      }
    }
    manifest = { kind: "field", key: "manifest", value: { kind: "map", entries, source_location: loc }, source_location: loc };
  } else {
    manifest = { kind: "field", key: "manifest", value: { kind: "map", entries: {}, source_location: loc }, source_location: loc };
  }

  const sections: SectionNode[] = [];
  for (const item of map.items) {
    if (isScalar(item.key) && String(item.key.value) !== "manifest") {
      const sectionName = String(item.key.value);
      const keyNode = asNode(item.key);
      const sectionLoc = keyNode ? nodeLocation(keyNode, filename, lc) : loc;
      sections.push({
        kind: "section",
        name: sectionName,
        definitions: buildDefinitions(asNode(item.value), filename, lc),
        source_location: sectionLoc,
      });
    }
  }

  return { kind: "manifest", manifest, sections, source_location: loc };
}

function buildDefinitions(
  node: YAMLNode | undefined,
  filename: string,
  lc: YAML.LineCounter,
): readonly DefinitionNode[] {
  if (!node) return [];
  if (isSeq(node)) {
    return node.items
      .filter((item): item is YAMLNode => item != null && isNode(item))
      .map((item) => buildDefinition(item, filename, lc));
  }
  if (isMap(node)) {
    return [buildDefinition(node, filename, lc)];
  }
  return [];
}

function buildDefinition(node: YAMLNode, filename: string, lc: YAML.LineCounter): DefinitionNode {
  const loc = nodeLocation(node, filename, lc);
  const comments = extractComments(node);

  if (isMap(node)) {
    const fields: FieldNode[] = [];
    let defName = "";

    for (const item of node.items) {
      if (isScalar(item.key) && String(item.key.value) === "name") {
        defName = String(item.value ?? "");
      }
    }
    if (!defName && node.items.length > 0 && isScalar(node.items[0].key)) {
      defName = String(node.items[0].key.value);
    }
    for (const item of node.items) {
      fields.push(buildField(item, filename, lc));
    }
    return { kind: "definition", name: defName, fields, comments, source_location: loc };
  }

  if (isScalar(node)) {
    return { kind: "definition", name: String(node.value ?? ""), fields: [], comments, source_location: loc };
  }

  return { kind: "definition", name: "", fields: [], comments, source_location: loc };
}

function buildField(
  item: YAML.Pair,
  filename: string,
  lc: YAML.LineCounter,
): FieldNode {
  const key = isScalar(item.key) ? String(item.key.value) : "unknown";
  const keyNode = asNode(item.key);
  const loc = keyNode ? nodeLocation(keyNode, filename, lc) : { file: filename, line: 0, column: 0, length: 0 };
  const value = buildValue(asNode(item.value), filename, lc);
  return { kind: "field", key, value, source_location: loc };
}

function buildValue(node: YAMLNode | undefined, filename: string, lc: YAML.LineCounter): ASTValue {
  if (!node) {
    return { kind: "scalar", value: "", source_location: { file: filename, line: 0, column: 0, length: 0 } };
  }

  const loc = nodeLocation(node, filename, lc);

  if (isScalar(node)) {
    const val = node.value;
    if (typeof val === "boolean") return { kind: "scalar", value: val, source_location: loc };
    if (typeof val === "number") return { kind: "scalar", value: val, source_location: loc };
    return { kind: "scalar", value: String(val ?? ""), source_location: loc };
  }

  if (isSeq(node)) {
    const items = node.items
      .filter((item): item is YAMLNode => item != null && isNode(item))
      .map((item) => buildValue(item, filename, lc));
    return { kind: "list", items, source_location: loc };
  }

  if (isMap(node)) {
    const entries: Record<string, ASTValue> = {};
    for (const item of node.items) {
      if (isScalar(item.key)) {
        entries[String(item.key.value)] = buildValue(asNode(item.value), filename, lc);
      }
    }
    return { kind: "map", entries, source_location: loc };
  }

  return { kind: "scalar", value: "", source_location: loc };
}

// ---------------------------------------------------------------------------
// Source location extraction
// ---------------------------------------------------------------------------

function nodeLocation(node: YAMLNode, filename: string, lc: YAML.LineCounter): SourceLocation {
  if (isNode(node) && node.range) {
    const startOffset = node.range[0];
    const endOffset = node.range[2];
    const startPos = lc.linePos(startOffset);
    return { file: filename, line: startPos.line, column: startPos.col, length: endOffset - startOffset };
  }
  return { file: filename, line: 1, column: 1, length: 0 };
}

function extractComments(node: YAMLNode): readonly string[] {
  const comments: string[] = [];
  if (node.comment) comments.push(node.comment);
  if (node.commentBefore) comments.push(node.commentBefore);
  return comments;
}

function emptyManifest(filename: string): ManifestNode {
  const loc: SourceLocation = { file: filename, line: 1, column: 1, length: 0 };
  return {
    kind: "manifest",
    manifest: { kind: "field", key: "manifest", value: { kind: "map", entries: {}, source_location: loc }, source_location: loc },
    sections: [],
    source_location: loc,
  };
}
