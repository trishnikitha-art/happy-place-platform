/**
 * Compiler — barrel export.
 */

export type { ASTNode, ASTValue, ASTNodeKind, ManifestNode, SectionNode, DefinitionNode, FieldNode, ScalarNode, ReferenceNode, ListNode, MapNode, ConstraintNode } from "./ast";
export { getDefinitions, getField, scalarValue, getReferences } from "./ast";
export type { CompilerDiagnostic, DiagnosticSeverity, SourceLocation, ErrorCode, WarningCode, InfoCode } from "./diagnostics";
export { createDiagnostic, missingField, unresolvedReference, ambiguousAuthority, duplicateDefinition, missingAuthority, DiagnosticCollector } from "./diagnostics";
export type { ParseResult } from "./parser";
export { parseManifest } from "./parser";
export type { ValidationResult } from "./validator";
export { validateManifest } from "./validator";
export type { NormalizeResult } from "./normalizer";
export { normalizeManifest } from "./normalizer";
