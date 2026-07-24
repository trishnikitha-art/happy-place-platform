/**
 * Canonical IR Types — Domain-agnostic compiler primitives (IR Snapshot v1).
 *
 * These are the ONLY types the optimizer and generators consume.
 * No Mission, no Identity, no Evidence in the IR — those concepts compile
 * INTO these primitives.
 *
 * Every interface is frozen after creation.  The IR is immutable.
 */

import type { CompilerDiagnostic } from "../../compiler/diagnostics";

// ---------------------------------------------------------------------------
// IR Metadata
// ---------------------------------------------------------------------------

export interface IRMeta {
  readonly version: string;             // "1.0.0"
  readonly source_manifest: string;     // file path
  readonly compiled_at: string;         // ISO-8601
  readonly compiler_version: string;    // semver
}

// ---------------------------------------------------------------------------
// Source location (re-export for convenience)
// ---------------------------------------------------------------------------

export interface SourceLocation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly length: number;
}

// ---------------------------------------------------------------------------
// Symbol — the fundamental named entity
// ---------------------------------------------------------------------------

export type SymbolKind =
  | "authority"
  | "type"
  | "aggregate"
  | "event"
  | "command"
  | "policy"
  | "capability"
  | "projection"
  | "workflow"
  | "constraint"
  | "observation"
  | "claim"
  | "fact";

export interface Symbol {
  readonly name: string;
  readonly kind: SymbolKind;
  readonly type: string;                // canonical type name (e.g. "Aggregate", "Event")
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly source_location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Type — type definition within the IR
// ---------------------------------------------------------------------------

export type TypeKind =
  | "primitive"    // string, number, boolean
  | "enum"         // fixed set of values
  | "struct"       // named fields
  | "reference"    // reference to another type
  | "list"         // ordered collection
  | "map"          // key-value
  | "union";       // discriminated union

export interface TypeField {
  readonly name: string;
  readonly type: string;                // type reference name
  readonly optional: boolean;
  readonly source_location: SourceLocation;
}

export interface Type {
  readonly kind: TypeKind;
  readonly name: string;
  readonly fields?: readonly TypeField[];
  readonly elements?: string;           // for list: element type name
  readonly values?: readonly string[];  // for enum: allowed values
  readonly reference?: string;          // for reference: target type name
  readonly source_location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Node — an instance in the IR graph
// ---------------------------------------------------------------------------

export interface Node {
  readonly id: string;
  readonly kind: SymbolKind;            // reuses SymbolKind for consistency
  readonly symbol: string;              // name of the Symbol this node instantiates
  readonly properties: Readonly<Record<string, unknown>>;
  readonly source_location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Edge — a typed relationship between nodes
// ---------------------------------------------------------------------------

export type EdgeKind =
  | "owns"
  | "emits"
  | "guards"
  | "transforms"
  | "depends_on"
  | "projects_to"
  | "computes"
  | "observes"
  | "claims"
  | "verified_by";

export interface Edge {
  readonly from: string;                // node id
  readonly to: string;                  // node id
  readonly kind: EdgeKind;
  readonly properties: Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Constraint — a guard, policy, or requirement
// ---------------------------------------------------------------------------

export type ConstraintKind =
  | "guard"       // transition guard
  | "policy"      // enforcement rule
  | "requirement" // structural requirement
  | "invariant";  // must always hold

export interface Constraint {
  readonly id: string;
  readonly kind: ConstraintKind;
  readonly predicate: string;           // human-readable predicate
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly scope: string;               // what this constraint applies to
  readonly source_location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Authority — declared ownership
// ---------------------------------------------------------------------------

export interface Authority {
  readonly id: string;
  readonly name: string;
  readonly owns: readonly string[];     // node ids this authority owns
  readonly emits_for: readonly string[]; // node ids this authority emits events for
  readonly constraints: readonly string[]; // constraint ids enforced by this authority
  readonly deterministic: boolean;      // whether this authority is deterministic
  readonly source_location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Transformation — a state change (command → event)
// ---------------------------------------------------------------------------

export interface Transformation {
  readonly id: string;
  readonly kind: "command" | "event" | "projection" | "computation";
  readonly input: string;               // source node id
  readonly output: string;              // target node id
  readonly authority: string;           // authority id that owns this transformation
  readonly guards: readonly string[];   // constraint ids
  readonly events: readonly string[];   // event node ids emitted
  readonly source_location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Projection — a read model derived from events
// ---------------------------------------------------------------------------

export interface Projection {
  readonly id: string;
  readonly source: string;              // node id this projection reads from
  readonly query: string;               // query description
  readonly fields: readonly string[];   // projected field names
  readonly indexes: readonly string[];  // indexed fields
  readonly deterministic: boolean;      // whether this projection is deterministic
  readonly source_location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Artifact — a generated output
// ---------------------------------------------------------------------------

export type ArtifactKind =
  | "repository"
  | "service"
  | "event_type"
  | "api_endpoint"
  | "sdk"
  | "test"
  | "replay_test"
  | "documentation"
  | "projection_handler"
  | "cqrs_handler";

export interface Artifact {
  readonly id: string;
  readonly kind: ArtifactKind;
  readonly type: string;                // concrete type name (e.g. "Repository<Estimate>")
  readonly authority: string;           // authority id
  readonly hash: string;                // SHA-256 of artifact content
  readonly source_location: SourceLocation;
}

// ---------------------------------------------------------------------------
// IR Document — the complete frozen IR
// ---------------------------------------------------------------------------

export interface IRDocument {
  /** Immutable IR version. Must match ir/schema-v1.md. Bump on breaking changes. */
  readonly ir_version: string;
  readonly meta: IRMeta;
  readonly symbols: readonly Symbol[];
  readonly types: readonly Type[];
  readonly nodes: readonly Node[];
  readonly edges: readonly Edge[];
  readonly constraints: readonly Constraint[];
  readonly authorities: readonly Authority[];
  readonly transformations: readonly Transformation[];
  readonly projections: readonly Projection[];
  readonly artifacts: readonly Artifact[];
  readonly diagnostics: readonly CompilerDiagnostic[];
}
