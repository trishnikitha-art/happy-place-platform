/**
 * Generator Contract — shared interface for all code generators.
 *
 * Every generator consumes IRDocument and emits GeneratedArtifact[].
 * No generator reads YAML. Only IR.
 */

import type { IRDocument } from "../constitution/ir/types";
import type { CompilerDiagnostic } from "../compiler/diagnostics";

// ---------------------------------------------------------------------------
// Generated artifact
// ---------------------------------------------------------------------------

export interface GeneratedArtifact {
  /** Relative path (e.g. "repositories/MissionRepository.ts") */
  readonly path: string;
  /** Full file content */
  readonly content: string;
  /** SHA-256 of content */
  readonly hash: string;
  /** Generator that produced this */
  readonly generator: string;
  /** Human-readable description */
  readonly description: string;
}

// ---------------------------------------------------------------------------
// Generator interface
// ---------------------------------------------------------------------------

export interface Generator {
  /** Human-readable name */
  readonly name: string;

  /** Can this generator handle the given IR? */
  supports(ir: IRDocument): boolean;

  /** Generate artifacts from IR */
  generate(ir: IRDocument): GeneratedArtifact[];

  /** Validate generated output; return diagnostics */
  validate(artifacts: GeneratedArtifact[]): CompilerDiagnostic[];

  /** Snapshot hash for determinism checking */
  snapshot(ir: IRDocument): string;
}

// ---------------------------------------------------------------------------
// Coverage tracking
// ---------------------------------------------------------------------------

export interface CoverageRow {
  readonly runtimeArea: string;
  readonly generated: number;   // percentage 0-100
  readonly handwritten: number; // percentage 0-100
  readonly generator: string;
}

export interface CoverageDashboard {
  readonly rows: readonly CoverageRow[];
  readonly overallGenerated: number;
  readonly overallHandwritten: number;
}
