/**
 * Compiler AST — Immutable abstract syntax tree for the Generation Manifest.
 *
 * The AST is the FIRST intermediate representation produced by the parser.
 * It preserves every lexical and structural detail from the YAML source,
 * including comments and source locations.  The AST is never mutated after
 * creation (Object.freeze in parser).
 *
 * The AST is NOT the IR.  The normalizer transforms AST → IR.
 * The validator reads AST and produces diagnostics only.
 */

import type { SourceLocation } from "./diagnostics";

// ---------------------------------------------------------------------------
// Base AST node — every node has kind + source location
// ---------------------------------------------------------------------------

export interface ASTNodeBase {
  readonly kind: ASTNodeKind;
  readonly source_location: SourceLocation;
}

// ---------------------------------------------------------------------------
// AST node kind discriminant
// ---------------------------------------------------------------------------

export type ASTNodeKind =
  | "manifest"
  | "section"
  | "definition"
  | "field"
  | "list"
  | "reference"
  | "constraint"
  | "map"
  | "scalar";

// ---------------------------------------------------------------------------
// Concrete AST nodes
// ---------------------------------------------------------------------------

/** Root node — the entire manifest document. */
export interface ManifestNode extends ASTNodeBase {
  readonly kind: "manifest";
  readonly manifest: FieldNode;         // manifest.name, manifest.version, etc.
  readonly sections: readonly SectionNode[];
}

/** A top-level section (authorities, identities, missions, etc.). */
export interface SectionNode extends ASTNodeBase {
  readonly kind: "section";
  readonly name: string;                // "authorities", "missions", etc.
  readonly definitions: readonly DefinitionNode[];
}

/** A single definition within a section (one authority, one mission, etc.). */
export interface DefinitionNode extends ASTNodeBase {
  readonly kind: "definition";
  readonly name: string;
  readonly fields: readonly FieldNode[];
  readonly comments: readonly string[];
}

/** A key-value field within a definition. */
export interface FieldNode extends ASTNodeBase {
  readonly kind: "field";
  readonly key: string;
  readonly value: ASTValue;
}

/** An ordered list value. */
export interface ListNode extends ASTNodeBase {
  readonly kind: "list";
  readonly items: readonly ASTValue[];
}

/** A named reference to another definition. */
export interface ReferenceNode extends ASTNodeBase {
  readonly kind: "reference";
  readonly name: string;
  readonly target_section?: string;     // e.g. "authorities" if qualified
}

/** A constraint (guard, policy, requirement). */
export interface ConstraintNode extends ASTNodeBase {
  readonly kind: "constraint";
  readonly name: string;
  readonly predicate: string;
  readonly parameters: Readonly<Record<string, ASTValue>>;
}

/** A map value (inline object). */
export interface MapNode extends ASTNodeBase {
  readonly kind: "map";
  readonly entries: Readonly<Record<string, ASTValue>>;
}

/** A scalar value (string, number, boolean). */
export interface ScalarNode extends ASTNodeBase {
  readonly kind: "scalar";
  readonly value: string | number | boolean;
}

// ---------------------------------------------------------------------------
// AST value union (what a field/list item can be)
// ---------------------------------------------------------------------------

export type ASTValue =
  | ScalarNode
  | ReferenceNode
  | ConstraintNode
  | ListNode
  | MapNode;

// ---------------------------------------------------------------------------
// AST node union
// ---------------------------------------------------------------------------

export type ASTNode =
  | ManifestNode
  | SectionNode
  | DefinitionNode
  | FieldNode
  | ASTValue;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract all definitions from a section by name.
 * Returns empty array if section not found.
 */
export function getDefinitions(root: ManifestNode, sectionName: string): readonly DefinitionNode[] {
  const section = root.sections.find((s) => s.name === sectionName);
  return section?.definitions ?? [];
}

/**
 * Find a field on a definition by key.
 * Returns undefined if not found.
 */
export function getField(def: DefinitionNode, key: string): FieldNode | undefined {
  return def.fields.find((f) => f.key === key);
}

/**
 * Extract string value from a scalar node.
 */
export function scalarValue(node: ASTValue): string | number | boolean | undefined {
  return node.kind === "scalar" ? node.value : undefined;
}

/**
 * Extract all references from a definition's fields.
 */
export function getReferences(def: DefinitionNode): readonly ReferenceNode[] {
  const refs: ReferenceNode[] = [];
  for (const field of def.fields) {
    collectRefs(field.value, refs);
  }
  return refs;
}

function collectRefs(value: ASTValue, acc: ReferenceNode[]): void {
  if (value.kind === "reference") {
    acc.push(value);
  } else if (value.kind === "list") {
    for (const item of value.items) collectRefs(item, acc);
  } else if (value.kind === "map") {
    for (const v of Object.values(value.entries)) collectRefs(v, acc);
  }
}
