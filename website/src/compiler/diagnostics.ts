/**
 * Compiler Diagnostics — Structured error/warning/info model.
 *
 * Every diagnostic carries a machine-readable code, a human-readable message,
 * a source location, and an optional suggested fix.  The same logical error
 * always produces the same code and the same message — determinism is enforced.
 *
 * Diagnostic codes:
 *   E0xx — structural errors (missing required fields, invalid YAML)
 *   E1xx — reference errors (unresolved references, missing targets)
 *   E2xx — authority errors (ambiguous ownership, missing authority)
 *   E3xx — schema errors (invalid types, missing ABI)
 *   W0xx — warnings (deprecated patterns, missing optional metadata)
 *   I0xx — informational (diagnostic provenance)
 */

// ---------------------------------------------------------------------------
// Source location
// ---------------------------------------------------------------------------

export interface SourceLocation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly length: number;
}

// ---------------------------------------------------------------------------
// Severity
// ---------------------------------------------------------------------------

export type DiagnosticSeverity = "error" | "warning" | "info" | "note";

// ---------------------------------------------------------------------------
// Compiler Diagnostic
// ---------------------------------------------------------------------------

export interface CompilerDiagnostic {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly source_location: SourceLocation;
  readonly message: string;
  readonly suggested_fix?: string;
  readonly related_diagnostics?: readonly CompilerDiagnostic[];
}

// ---------------------------------------------------------------------------
// Diagnostic codes — the single registry
// ---------------------------------------------------------------------------

export type ErrorCode =
  | "E001" // Missing required field
  | "E002" // Invalid YAML syntax
  | "E003" // Unexpected node type
  | "E004" // Invalid manifest version
  | "E005" // Missing manifest name
  | "E101" // Unresolved reference
  | "E102" // Circular reference
  | "E103" // Duplicate definition
  | "E200" // Ambiguous authority ownership
  | "E201" // Missing authority declaration
  | "E202" // Authority owns nothing
  | "E300" // Missing capability ABI
  | "E301" // Missing capability version
  | "E302" // Invalid state machine
  | "E303" // Dead state
  | "E304" // Missing transition guard"
  | "E400" // Internal compiler error
  | "W001" // Missing recommended field
  | "W002" // Deprecated pattern
  | "W003" // Incomplete capability contract
  | "W004" // Missing event metadata
  | "I001" // Compiler provenance
  | "I002" // Diagnostic summary";

export type WarningCode = "W001" | "W002" | "W003" | "W004";
export type InfoCode = "I001" | "I002";

// ---------------------------------------------------------------------------
// Diagnostic registry — human-readable descriptions per code
// ---------------------------------------------------------------------------

const DIAGNOSTIC_REGISTRY: Record<string, { severity: DiagnosticSeverity; description: string }> = {
  E001: { severity: "error", description: "Missing required field" },
  E002: { severity: "error", description: "Invalid YAML syntax" },
  E003: { severity: "error", description: "Unexpected node type" },
  E004: { severity: "error", description: "Invalid manifest version" },
  E005: { severity: "error", description: "Missing manifest name" },
  E101: { severity: "error", description: "Unresolved reference" },
  E102: { severity: "error", description: "Circular reference" },
  E103: { severity: "error", description: "Duplicate definition" },
  E200: { severity: "error", description: "Ambiguous authority ownership" },
  E201: { severity: "error", description: "Missing authority declaration" },
  E202: { severity: "error", description: "Authority owns nothing" },
  E300: { severity: "error", description: "Missing capability ABI" },
  E301: { severity: "error", description: "Missing capability version" },
  E302: { severity: "error", description: "Invalid state machine" },
  E303: { severity: "error", description: "Dead state" },
  E304: { severity: "error", description: "Missing transition guard" },
  E400: { severity: "error", description: "Internal compiler error" },
  W001: { severity: "warning", description: "Missing recommended field" },
  W002: { severity: "warning", description: "Deprecated pattern" },
  W003: { severity: "warning", description: "Incomplete capability contract" },
  W004: { severity: "warning", description: "Missing event metadata" },
  I001: { severity: "info", description: "Compiler provenance" },
  I002: { severity: "info", description: "Diagnostic summary" },
};

// ---------------------------------------------------------------------------
// Factory — deterministic diagnostic creation
// ---------------------------------------------------------------------------

export function createDiagnostic(params: {
  code: string;
  source_location: SourceLocation;
  message: string;
  suggested_fix?: string;
  related_diagnostics?: readonly CompilerDiagnostic[];
}): CompilerDiagnostic {
  const reg = DIAGNOSTIC_REGISTRY[params.code];
  return {
    code: params.code,
    severity: reg?.severity ?? "error",
    source_location: params.source_location,
    message: params.message,
    suggested_fix: params.suggested_fix,
    related_diagnostics: params.related_diagnostics,
  };
}

// ---------------------------------------------------------------------------
// Convenience helpers for common error patterns
// ---------------------------------------------------------------------------

export function missingField(
  field: string,
  loc: SourceLocation,
): CompilerDiagnostic {
  return createDiagnostic({
    code: "E001",
    source_location: loc,
    message: `Missing required field: ${field}`,
    suggested_fix: `Add "${field}" to the manifest.`,
  });
}

export function unresolvedReference(
  ref: string,
  loc: SourceLocation,
): CompilerDiagnostic {
  return createDiagnostic({
    code: "E101",
    source_location: loc,
    message: `Unresolved reference: "${ref}"`,
    suggested_fix: `Ensure "${ref}" is defined in the manifest or remove the reference.`,
  });
}

export function ambiguousAuthority(
  entity: string,
  authorities: string[],
  loc: SourceLocation,
): CompilerDiagnostic {
  return createDiagnostic({
    code: "E200",
    source_location: loc,
    message: `Ambiguous authority ownership for "${entity}": candidates are [${authorities.join(", ")}]`,
    suggested_fix: `Add an "owner" field to "${entity}" to disambiguate.`,
  });
}

export function duplicateDefinition(
  name: string,
  loc: SourceLocation,
): CompilerDiagnostic {
  return createDiagnostic({
    code: "E103",
    source_location: loc,
    message: `Duplicate definition: "${name}"`,
    suggested_fix: `Remove or rename the duplicate.`,
  });
}

export function missingAuthority(
  entity: string,
  loc: SourceLocation,
): CompilerDiagnostic {
  return createDiagnostic({
    code: "E201",
    source_location: loc,
    message: `Entity "${entity}" has no declared owner authority.`,
    suggested_fix: `Add "owner: <AuthorityName>" to "${entity}".`,
  });
}

// ---------------------------------------------------------------------------
// Diagnostic collection (accumulator)
// ---------------------------------------------------------------------------

export class DiagnosticCollector {
  private _diagnostics: CompilerDiagnostic[] = [];

  push(diag: CompilerDiagnostic): void {
    this._diagnostics.push(diag);
  }

  pushAll(diags: readonly CompilerDiagnostic[]): void {
    for (const d of diags) this._diagnostics.push(d);
  }

  get diagnostics(): readonly CompilerDiagnostic[] {
    return this._diagnostics;
  }

  get hasErrors(): boolean {
    return this._diagnostics.some((d) => d.severity === "error");
  }

  get errorCount(): number {
    return this._diagnostics.filter((d) => d.severity === "error").length;
  }

  get warningCount(): number {
    return this._diagnostics.filter((d) => d.severity === "warning").length;
  }

  freeze(): readonly CompilerDiagnostic[] {
    return Object.freeze([...this._diagnostics]);
  }
}
