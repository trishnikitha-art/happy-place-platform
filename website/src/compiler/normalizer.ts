/**
 * Normalizer — transforms a valid AST into the Canonical IR.
 *
 * Responsibilities:
 *   1. Resolve cross-references to canonical IDs
 *   2. Apply defaults for optional fields
 *   3. Infer authority from mutation ownership
 *   4. Generate canonical events from state transitions
 *   5. Lower policies to Constraint nodes
 *   6. Build workflow DAGs
 *   7. Freeze all output (Object.freeze)
 *
 * Non-responsibilities:
 *   - Validation (AST is already validated)
 *   - Rejection (AST is valid)
 *   - Optimization (Sprint 2)
 */

import type { ManifestNode, DefinitionNode, FieldNode, ASTValue } from "./ast";
import { getField, scalarValue, getDefinitions } from "./ast";
import type {
  IRDocument,
  IRMeta,
  Symbol,
  SymbolKind,
  Type,
  Node,
  Edge,
  Constraint,
  Authority,
  Transformation,
  Projection,
  Artifact,
  SourceLocation as IRSourceLocation,
} from "../constitution/ir/types";
import type { CompilerDiagnostic } from "./diagnostics";
import { DiagnosticCollector, createDiagnostic } from "./diagnostics";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface NormalizeResult {
  readonly ir: IRDocument;
  readonly diagnostics: readonly CompilerDiagnostic[];
}

/**
 * Normalize a valid AST into the Canonical IR.
 * AST must have passed validation (validator returns valid: true).
 * Never throws.  Never rejects.
 */
export function normalizeManifest(ast: ManifestNode): NormalizeResult {
  const collector = new DiagnosticCollector();

  const meta: IRMeta = buildMeta(ast);
  const symbols: Symbol[] = [];
  const types: Type[] = [];
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const constraints: Constraint[] = [];
  const authorities: Authority[] = [];
  const transformations: Transformation[] = [];
  const projections: Projection[] = [];
  const artifacts: Artifact[] = [];

  // Build symbols from each section
  buildAuthoritySymbols(ast, symbols, nodes, edges, authorities, collector);
  buildIdentityTypes(ast, types, nodes, edges);
  buildMissionSymbols(ast, symbols, types, nodes, edges, transformations, collector);
  buildEvidenceTypes(ast, types, nodes);
  buildObservationClaims(ast, symbols, nodes, edges);
  buildCapabilitySymbols(ast, symbols, types, nodes, edges, collector);
  buildPolicyConstraints(ast, constraints, edges, collector);
  buildWorkflowTransformations(ast, transformations, edges, collector);
  buildProjections(ast, projections, nodes, edges);

  // Freeze everything
  const ir: IRDocument = {
    ir_version: "1.0.0",
    meta,
    symbols: Object.freeze(symbols),
    types: Object.freeze(types),
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    constraints: Object.freeze(constraints),
    authorities: Object.freeze(authorities),
    transformations: Object.freeze(transformations),
    projections: Object.freeze(projections),
    artifacts: Object.freeze(artifacts),
    diagnostics: collector.freeze(),
  };

  return { ir, diagnostics: collector.freeze() };
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

function buildMeta(ast: ManifestNode): IRMeta {
  const manifest = ast.manifest;
  const mapVal = manifest.value;
  let name = "unknown";
  let version = 1;

  if (mapVal.kind === "map") {
    const nameVal = scalarValue(mapVal.entries["name"]);
    if (typeof nameVal === "string") name = nameVal;

    const verVal = scalarValue(mapVal.entries["version"]);
    if (typeof verVal === "number") version = verVal;
  }

  return {
    version: "1.0.0",
    source_manifest: "GENERATION_MANIFEST.yaml",
    compiled_at: new Date().toISOString(),
    compiler_version: "0.1.0",
  };
}

// ---------------------------------------------------------------------------
// Authorities
// ---------------------------------------------------------------------------

function buildAuthoritySymbols(
  ast: ManifestNode,
  symbols: Symbol[],
  nodes: Node[],
  edges: Edge[],
  authorities: Authority[],
  collector: DiagnosticCollector,
): void {
  const section = ast.sections.find((s) => s.name === "authorities");
  if (!section) return;

  for (const def of section.definitions) {
    const name = getFieldName(def, "name") ?? def.name;
    if (!name) continue;

    const owns = getListField(def, "owns");
    const emits = getListField(def, "emits");
    const computes = getListField(def, "computes");
    const policies = getListField(def, "policies");

    // Create Symbol
    const sym: Symbol = {
      name,
      kind: "authority",
      type: "Authority",
      metadata: { owns, emits, computes, policies },
      source_location: toIRLocation(def.source_location),
    };
    symbols.push(sym);

    // Create Node
    const nodeId = `auth:${name}`;
    const node: Node = {
      id: nodeId,
      kind: "authority",
      symbol: name,
      properties: { owns, emits, computes },
      source_location: toIRLocation(def.source_location),
    };
    nodes.push(node);

    // Create Authority
    const auth: Authority = {
      id: nodeId,
      name,
      owns: owns.map((o) => `entity:${o}`),
      emits_for: emits.map((e) => `event:${e}`),
      constraints: policies.map((p) => `policy:${p}`),
      deterministic: true,
      source_location: toIRLocation(def.source_location),
    };
    authorities.push(auth);

    // Create edges: authority OWNS entities
    for (const owned of owns) {
      edges.push({
        from: nodeId,
        to: `entity:${owned}`,
        kind: "owns",
        properties: {},
      });
    }

    // Create edges: authority EMITS events
    for (const event of emits) {
      edges.push({
        from: nodeId,
        to: `event:${event}`,
        kind: "emits",
        properties: {},
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Identities → Types
// ---------------------------------------------------------------------------

function buildIdentityTypes(
  ast: ManifestNode,
  types: Type[],
  nodes: Node[],
  edges: Edge[],
): void {
  const section = ast.sections.find((s) => s.name === "identities");
  if (!section) return;

  for (const def of section.definitions) {
    const name = def.name;
    if (!name) continue;

    // Each identity becomes a Type (struct with minimal fields)
    const type: Type = {
      kind: "struct",
      name,
      fields: [
        { name: "id", type: "string", optional: false, source_location: toIRLocation(def.source_location) },
        { name: "name", type: "string", optional: false, source_location: toIRLocation(def.source_location) },
      ],
      source_location: toIRLocation(def.source_location),
    };
    types.push(type);

    // Each identity becomes a Node
    const nodeId = `entity:${name}`;
    const node: Node = {
      id: nodeId,
      kind: "aggregate",
      symbol: name,
      properties: { kind: "identity" },
      source_location: toIRLocation(def.source_location),
    };
    nodes.push(node);
  }
}

// ---------------------------------------------------------------------------
// Missions → Symbols + Transformations
// ---------------------------------------------------------------------------

function buildMissionSymbols(
  ast: ManifestNode,
  symbols: Symbol[],
  types: Type[],
  nodes: Node[],
  edges: Edge[],
  transformations: Transformation[],
  collector: DiagnosticCollector,
): void {
  const section = ast.sections.find((s) => s.name === "missions");
  if (!section) return;

  for (const def of section.definitions) {
    const name = getFieldName(def, "name") ?? def.name;
    if (!name) continue;

    const owns = getListField(def, "owns");
    const events = getListField(def, "events");
    const commands = getListField(def, "commands");
    const policies = getListField(def, "policies");

    // Symbol
    symbols.push({
      name,
      kind: "aggregate",
      type: "Aggregate",
      metadata: { owns, events, commands, policies },
      source_location: toIRLocation(def.source_location),
    });

    // Type
    types.push({
      kind: "struct",
      name,
      fields: [
        { name: "id", type: "string", optional: false, source_location: toIRLocation(def.source_location) },
        { name: "status", type: "string", optional: false, source_location: toIRLocation(def.source_location) },
      ],
      source_location: toIRLocation(def.source_location),
    });

    // Node
    const nodeId = `aggregate:${name}`;
    nodes.push({
      id: nodeId,
      kind: "aggregate",
      symbol: name,
      properties: { owns, events, commands },
      source_location: toIRLocation(def.source_location),
    });

    // Event nodes + edges
    for (const event of events) {
      const eventNodeId = `event:${event}`;
      nodes.push({
        id: eventNodeId,
        kind: "event",
        symbol: event,
        properties: { aggregate: name },
        source_location: toIRLocation(def.source_location),
      });
      symbols.push({
        name: event,
        kind: "event",
        type: "Event",
        metadata: { aggregate: name },
        source_location: toIRLocation(def.source_location),
      });
      edges.push({
        from: nodeId,
        to: eventNodeId,
        kind: "emits",
        properties: {},
      });
    }

    // Command → Event transformations
    for (const command of commands) {
      for (const event of events) {
        transformations.push({
          id: `transform:${name}:${command}:${event}`,
          kind: "command",
          input: `command:${command}`,
          output: `event:${event}`,
          authority: `auth:${name}Authority`,
          guards: policies.map((p) => `policy:${p}`),
          events: [`event:${event}`],
          source_location: toIRLocation(def.source_location),
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Evidence → Types
// ---------------------------------------------------------------------------

function buildEvidenceTypes(
  ast: ManifestNode,
  types: Type[],
  nodes: Node[],
): void {
  const section = ast.sections.find((s) => s.name === "evidence");
  if (!section) return;

  for (const def of section.definitions) {
    const name = def.name;
    if (!name) continue;

    types.push({
      kind: "struct",
      name,
      fields: [
        { name: "id", type: "string", optional: false, source_location: toIRLocation(def.source_location) },
        { name: "url", type: "string", optional: false, source_location: toIRLocation(def.source_location) },
        { name: "mimeType", type: "string", optional: false, source_location: toIRLocation(def.source_location) },
      ],
      source_location: toIRLocation(def.source_location),
    });

    nodes.push({
      id: `entity:${name}`,
      kind: "aggregate",
      symbol: name,
      properties: { kind: "evidence" },
      source_location: toIRLocation(def.source_location),
    });
  }
}

// ---------------------------------------------------------------------------
// Observations / Claims / Facts → Symbols + Nodes
// ---------------------------------------------------------------------------

function buildObservationClaims(
  ast: ManifestNode,
  symbols: Symbol[],
  nodes: Node[],
  edges: Edge[],
): void {
  for (const [sectionName, symbolKind] of [
    ["observations", "observation" as SymbolKind],
    ["claims", "claim" as SymbolKind],
    ["facts", "fact" as SymbolKind],
  ] as const) {
    const section = ast.sections.find((s) => s.name === sectionName);
    if (!section) continue;

    for (const def of section.definitions) {
      const name = def.name;
      if (!name) continue;

      symbols.push({
        name,
        kind: symbolKind,
        type: symbolKind.charAt(0).toUpperCase() + symbolKind.slice(1),
        metadata: {},
        source_location: toIRLocation(def.source_location),
      });

      nodes.push({
        id: `entity:${name}`,
        kind: symbolKind,
        symbol: name,
        properties: {},
        source_location: toIRLocation(def.source_location),
      });
    }
  }

  // Observation → Claim edges
  const observations = ast.sections.find((s) => s.name === "observations");
  const claims = ast.sections.find((s) => s.name === "claims");
  if (observations && claims) {
    for (const obs of observations.definitions) {
      for (const claim of claims.definitions) {
        edges.push({
          from: `entity:${obs.name}`,
          to: `entity:${claim.name}`,
          kind: "claims",
          properties: {},
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Capabilities → Symbols + Types
// ---------------------------------------------------------------------------

function buildCapabilitySymbols(
  ast: ManifestNode,
  symbols: Symbol[],
  types: Type[],
  nodes: Node[],
  edges: Edge[],
  collector: DiagnosticCollector,
): void {
  const section = ast.sections.find((s) => s.name === "capabilities");
  if (!section) return;

  for (const def of section.definitions) {
    const name = getFieldName(def, "name") ?? def.name;
    if (!name) continue;

    const contract = getListField(def, "contract");

    // Symbol
    symbols.push({
      name,
      kind: "capability",
      type: "Capability",
      metadata: { contract, versioned_name: `${name.toLowerCase()}.v1` },
      source_location: toIRLocation(def.source_location),
    });

    // Type
    types.push({
      kind: "struct",
      name: `${name}Capability`,
      fields: contract.map((op) => ({
        name: op.toLowerCase(),
        type: "function",
        optional: false,
        source_location: toIRLocation(def.source_location),
      })),
      source_location: toIRLocation(def.source_location),
    });

    // Node
    const nodeId = `capability:${name}`;
    nodes.push({
      id: nodeId,
      kind: "capability",
      symbol: name,
      properties: { contract, versioned_name: `${name.toLowerCase()}.v1` },
      source_location: toIRLocation(def.source_location),
    });
  }
}

// ---------------------------------------------------------------------------
// Policies → Constraints
// ---------------------------------------------------------------------------

function buildPolicyConstraints(
  ast: ManifestNode,
  constraints: Constraint[],
  edges: Edge[],
  collector: DiagnosticCollector,
): void {
  const section = ast.sections.find((s) => s.name === "policies");
  if (!section) return;

  for (const def of section.definitions) {
    const name = def.name;
    if (!name) continue;

    const constraint: Constraint = {
      id: `policy:${name}`,
      kind: "policy",
      predicate: `policy:${name}`,
      parameters: {},
      scope: "global",
      source_location: toIRLocation(def.source_location),
    };
    constraints.push(constraint);

    edges.push({
      from: `policy:${name}`,
      to: "root",
      kind: "guards",
      properties: { policy: name },
    });
  }
}

// ---------------------------------------------------------------------------
// Workflows → Transformations (planning section)
// ---------------------------------------------------------------------------

function buildWorkflowTransformations(
  ast: ManifestNode,
  transformations: Transformation[],
  edges: Edge[],
  collector: DiagnosticCollector,
): void {
  const section = ast.sections.find((s) => s.name === "planning");
  if (!section) return;

  const def = section.definitions[0];
  if (!def) return;

  // planning.tenant_emits → events
  const emitsField = getField(def, "tenant_emits");
  if (emitsField && emitsField.value.kind === "list") {
    for (const item of emitsField.value.items) {
      const eventName = item.kind === "scalar" ? String(item.value) : "";
      if (eventName) {
        const eventId = `event:${eventName}`;
        const existing = transformationById(transformations, `transform:planning:${eventName}`);
        if (!existing) {
          transformations.push({
            id: `transform:planning:${eventName}`,
            kind: "event",
            input: `aggregate:${eventName}`,
            output: eventId,
            authority: "auth:MissionAuthority",
            guards: [],
            events: [eventId],
            source_location: toIRLocation(def.source_location),
          });
        }
        // Planning events do NOT create aggregate→event emits edges.
        // They only produce transformations (the replay generator needs
        // a matching aggregate node + repository to dispatch, and planning
        // events have neither).
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Projections (empty for Sprint 1 — generated in Sprint 2)
// ---------------------------------------------------------------------------

function buildProjections(
  ast: ManifestNode,
  projections: Projection[],
  nodes: Node[],
  edges: Edge[],
): void {
  // No projections in Sprint 1 — the optimizer/generators handle this
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFieldName(def: DefinitionNode, key: string): string | undefined {
  const field = getField(def, key);
  if (!field) return undefined;
  const val = scalarValue(field.value);
  return typeof val === "string" ? val : undefined;
}

function getListField(def: DefinitionNode, key: string): string[] {
  const field = getField(def, key);
  if (!field || field.value.kind !== "list") return [];
  return field.value.items
    .filter((item): item is import("./ast").ScalarNode => item.kind === "scalar")
    .map((item) => String(item.value));
}

function toIRLocation(loc: import("./diagnostics").SourceLocation): IRSourceLocation {
  return { file: loc.file, line: loc.line, column: loc.column, length: loc.length };
}

function transformationById(transformations: Transformation[], id: string): Transformation | undefined {
  return transformations.find((t) => t.id === id);
}
