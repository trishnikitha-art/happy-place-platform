/**
 * IR Inspector — produces structured views of the IR for understanding.
 *
 * Before generating code, generate understanding. The inspector produces:
 * 1. Symbol table (all symbols grouped by kind)
 * 2. Authority graph (who owns what, who emits what)
 * 3. Mission/state graph (aggregates, events, commands, transitions)
 * 4. Capability dependency graph (capabilities and their contracts)
 * 5. Transformation graph (command → event mappings with guards)
 * 6. Projection graph (read models derived from events)
 */

import type {
  IRDocument,
  Symbol,
  SymbolKind,
  Node,
  Edge,
  Authority,
  Transformation,
  Projection,
  Constraint,
  Type,
} from "../constitution/ir/types";

// ---------------------------------------------------------------------------
// Inspector output types
// ---------------------------------------------------------------------------

export interface SymbolTableEntry {
  readonly name: string;
  readonly kind: SymbolKind;
  readonly type: string;
  readonly nodeId: string | undefined;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SymbolTable {
  readonly byKind: Readonly<Record<SymbolKind, readonly SymbolTableEntry[]>>;
  readonly all: readonly SymbolTableEntry[];
  readonly total: number;
}

export interface AuthorityNode {
  readonly id: string;
  readonly name: string;
  readonly owns: readonly string[];
  readonly emitsFor: readonly string[];
  readonly constraints: readonly string[];
  readonly deterministic: boolean;
}

export interface AuthorityGraph {
  readonly authorities: readonly AuthorityNode[];
  readonly ownershipEdges: readonly { from: string; to: string }[];
  readonly emissionEdges: readonly { from: string; to: string }[];
  readonly unownedEntities: readonly string[];
}

export interface MissionNode {
  readonly name: string;
  readonly nodeId: string;
  readonly events: readonly string[];
  readonly commands: readonly string[];
  readonly guards: readonly string[];
}

export interface MissionGraph {
  readonly missions: readonly MissionNode[];
  readonly eventNodes: readonly string[];
  readonly commandNodes: readonly string[];
  readonly transitionEdges: readonly { from: string; to: string; via: string }[];
}

export interface CapabilityNode {
  readonly name: string;
  readonly nodeId: string;
  readonly versionedName: string;
  readonly contract: readonly string[];
  readonly typeNode: string | undefined;
}

export interface CapabilityGraph {
  readonly capabilities: readonly CapabilityNode[];
  readonly totalOperations: number;
}

export interface TransformationNode {
  readonly id: string;
  readonly kind: string;
  readonly input: string;
  readonly output: string;
  readonly authority: string;
  readonly guards: readonly string[];
  readonly events: readonly string[];
}

export interface TransformationGraph {
  readonly transformations: readonly TransformationNode[];
  readonly byAuthority: Map<string, readonly TransformationNode[]>;
  readonly byAggregate: Map<string, readonly TransformationNode[]>;
}

export interface ProjectionNode {
  readonly id: string;
  readonly source: string;
  readonly query: string;
  readonly fields: readonly string[];
  readonly deterministic: boolean;
}

export interface ProjectionGraph {
  readonly projections: readonly ProjectionNode[];
  readonly total: number;
}

export interface InspectorReport {
  readonly symbolTable: SymbolTable;
  readonly authorityGraph: AuthorityGraph;
  readonly missionGraph: MissionGraph;
  readonly capabilityGraph: CapabilityGraph;
  readonly transformationGraph: TransformationGraph;
  readonly projectionGraph: ProjectionGraph;
  readonly diagnostics: readonly string[];
}

// ---------------------------------------------------------------------------
// Inspector
// ---------------------------------------------------------------------------

export function inspectIR(ir: IRDocument): InspectorReport {
  const diagnostics: string[] = [];

  const symbolTable = buildSymbolTable(ir);
  const authorityGraph = buildAuthorityGraph(ir, diagnostics);
  const missionGraph = buildMissionGraph(ir, diagnostics);
  const capabilityGraph = buildCapabilityGraph(ir);
  const transformationGraph = buildTransformationGraph(ir);
  const projectionGraph = buildProjectionGraph(ir);

  return {
    symbolTable,
    authorityGraph,
    missionGraph,
    capabilityGraph,
    transformationGraph,
    projectionGraph,
    diagnostics,
  };
}

// ---------------------------------------------------------------------------
// Symbol table
// ---------------------------------------------------------------------------

function buildSymbolTable(ir: IRDocument): SymbolTable {
  const byKind = {} as Record<SymbolKind, SymbolTableEntry[]>;

  // Initialize all kinds
  const allKinds: SymbolKind[] = [
    "authority", "type", "aggregate", "event", "command",
    "policy", "capability", "projection", "workflow",
    "constraint", "observation", "claim", "fact",
  ];
  for (const kind of allKinds) byKind[kind] = [];

  const all: SymbolTableEntry[] = [];

  for (const sym of ir.symbols) {
    const node = ir.nodes.find((n) => n.symbol === sym.name);
    const entry: SymbolTableEntry = {
      name: sym.name,
      kind: sym.kind,
      type: sym.type,
      nodeId: node?.id,
      metadata: sym.metadata,
    };
    byKind[sym.kind].push(entry);
    all.push(entry);
  }

  return { byKind, all, total: all.length };
}

// ---------------------------------------------------------------------------
// Authority graph
// ---------------------------------------------------------------------------

function buildAuthorityGraph(ir: IRDocument, diagnostics: string[]): AuthorityGraph {
  const authorities: AuthorityNode[] = ir.authorities.map((a) => ({
    id: a.id,
    name: a.name,
    owns: [...a.owns],
    emitsFor: [...a.emits_for],
    constraints: [...a.constraints],
    deterministic: a.deterministic,
  }));

  const ownershipEdges: { from: string; to: string }[] = [];
  const emissionEdges: { from: string; to: string }[] = [];

  for (const auth of ir.authorities) {
    for (const owned of auth.owns) {
      ownershipEdges.push({ from: auth.id, to: owned });
    }
    for (const emitted of auth.emits_for) {
      emissionEdges.push({ from: auth.id, to: emitted });
    }
  }

  // Find unowned entities
  const ownedEntityIds = new Set(ir.authorities.flatMap((a) => a.owns));
  const unownedEntities = ir.nodes
    .filter((n) => n.kind === "aggregate" && !ownedEntityIds.has(n.id))
    .map((n) => n.id);

  if (unownedEntities.length > 0) {
    diagnostics.push(`WARNING: UNOWNED — ${unownedEntities.length} entities have no owner authority: ${unownedEntities.join(", ")}`);
  }

  return { authorities, ownershipEdges, emissionEdges, unownedEntities };
}

// ---------------------------------------------------------------------------
// Mission/state graph
// ---------------------------------------------------------------------------

function buildMissionGraph(ir: IRDocument, diagnostics: string[]): MissionGraph {
  const missionSymbols = ir.symbols.filter((s) => s.kind === "aggregate" && s.type === "Aggregate");
  const missions: MissionNode[] = missionSymbols.map((sym) => {
    const meta = sym.metadata as Record<string, unknown>;
    return {
      name: sym.name,
      nodeId: `aggregate:${sym.name}`,
      events: Array.isArray(meta.events) ? (meta.events as string[]) : [],
      commands: Array.isArray(meta.commands) ? (meta.commands as string[]) : [],
      guards: Array.isArray(meta.policies) ? (meta.policies as string[]) : [],
    };
  });

  const eventNodes = ir.nodes.filter((n) => n.kind === "event").map((n) => n.id);
  const commandNodes = ir.transformations
    .filter((t) => t.kind === "command")
    .map((t) => t.input)
    .filter((v, i, a) => a.indexOf(v) === i);

  const transitionEdges = ir.transformations
    .filter((t) => t.kind === "command")
    .map((t) => ({ from: t.input, to: t.output, via: t.id }));

  // Check for unreachable states (events with no incoming edges)
  const eventTargets = new Set(transitionEdges.map((e) => e.to));
  const unreachableEvents = eventNodes.filter((e) => !eventTargets.has(e) && !ir.edges.some((ed) => ed.to === e));
  if (unreachableEvents.length > 0) {
    diagnostics.push(`WARNING: ${unreachableEvents.length} events may be unreachable: ${unreachableEvents.join(", ")}`);
  }

  return { missions, eventNodes, commandNodes, transitionEdges };
}

// ---------------------------------------------------------------------------
// Capability graph
// ---------------------------------------------------------------------------

function buildCapabilityGraph(ir: IRDocument): CapabilityGraph {
  const capSymbols = ir.symbols.filter((s) => s.kind === "capability");
  const capabilities: CapabilityNode[] = capSymbols.map((sym) => {
    const meta = sym.metadata as Record<string, unknown>;
    const typeNode = ir.types.find((t) => t.name === `${sym.name}Capability`);
    return {
      name: sym.name,
      nodeId: `capability:${sym.name}`,
      versionedName: String(meta.versioned_name ?? `${sym.name.toLowerCase()}.v1`),
      contract: Array.isArray(meta.contract) ? (meta.contract as string[]) : [],
      typeNode: typeNode?.name,
    };
  });

  const totalOperations = capabilities.reduce((sum, c) => sum + c.contract.length, 0);

  return { capabilities, totalOperations };
}

// ---------------------------------------------------------------------------
// Transformation graph
// ---------------------------------------------------------------------------

function buildTransformationGraph(ir: IRDocument): TransformationGraph {
  const transformations: TransformationNode[] = ir.transformations.map((t) => ({
    id: t.id,
    kind: t.kind,
    input: t.input,
    output: t.output,
    authority: t.authority,
    guards: [...t.guards],
    events: [...t.events],
  }));

  const byAuthority = new Map<string, TransformationNode[]>();
  const byAggregate = new Map<string, TransformationNode[]>();

  for (const t of transformations) {
    // Group by authority
    if (!byAuthority.has(t.authority)) byAuthority.set(t.authority, []);
    byAuthority.get(t.authority)!.push(t);

    // Group by aggregate (extract from input pattern "command:X" → look up aggregate)
    const aggregate = extractAggregateFromTransform(t, ir);
    if (aggregate) {
      if (!byAggregate.has(aggregate)) byAggregate.set(aggregate, []);
      byAggregate.get(aggregate)!.push(t);
    }
  }

  return {
    transformations,
    byAuthority,
    byAggregate,
  };
}

function extractAggregateFromTransform(t: TransformationNode, ir: IRDocument): string | undefined {
  // Transformations are named "transform:Aggregate:Command:Event"
  const parts = t.id.split(":");
  if (parts.length >= 3) return parts[1];
  return undefined;
}

// ---------------------------------------------------------------------------
// Projection graph
// ---------------------------------------------------------------------------

function buildProjectionGraph(ir: IRDocument): ProjectionGraph {
  const projections: ProjectionNode[] = ir.projections.map((p) => ({
    id: p.id,
    source: p.source,
    query: p.query,
    fields: [...p.fields],
    deterministic: p.deterministic,
  }));

  return { projections, total: projections.length };
}

// ---------------------------------------------------------------------------
// Pretty-print inspector report
// ---------------------------------------------------------------------------

export function formatInspectorReport(report: InspectorReport): string {
  const lines: string[] = [];

  lines.push("=== IR INSPECTOR REPORT ===");
  lines.push("");

  // Symbol table
  lines.push("--- SYMBOL TABLE ---");
  lines.push(`Total symbols: ${report.symbolTable.total}`);
  for (const [kind, entries] of Object.entries(report.symbolTable.byKind)) {
    if (entries.length > 0) {
      lines.push(`  ${kind}: ${entries.map((e) => e.name).join(", ")}`);
    }
  }
  lines.push("");

  // Authority graph
  lines.push("--- AUTHORITY GRAPH ---");
  for (const auth of report.authorityGraph.authorities) {
    lines.push(`  ${auth.name}:`);
    lines.push(`    owns: ${auth.owns.join(", ") || "(none)"}`);
    lines.push(`    emits: ${auth.emitsFor.join(", ") || "(none)"}`);
    lines.push(`    deterministic: ${auth.deterministic}`);
  }
  if (report.authorityGraph.unownedEntities.length > 0) {
    lines.push(`  UNOWNED: ${report.authorityGraph.unownedEntities.join(", ")}`);
  }
  lines.push(`  ownership edges: ${report.authorityGraph.ownershipEdges.length}`);
  lines.push(`  emission edges: ${report.authorityGraph.emissionEdges.length}`);
  lines.push("");

  // Mission graph
  lines.push("--- MISSION/STATE GRAPH ---");
  for (const mission of report.missionGraph.missions) {
    lines.push(`  ${mission.name}:`);
    lines.push(`    events: ${mission.events.join(", ")}`);
    lines.push(`    commands: ${mission.commands.join(", ")}`);
    lines.push(`    guards: ${mission.guards.join(", ") || "(none)"}`);
  }
  lines.push(`  transitions: ${report.missionGraph.transitionEdges.length}`);
  lines.push("");

  // Capability graph
  lines.push("--- CAPABILITY GRAPH ---");
  for (const cap of report.capabilityGraph.capabilities) {
    lines.push(`  ${cap.name} (${cap.versionedName}): ${cap.contract.join(", ")}`);
  }
  lines.push(`  total operations: ${report.capabilityGraph.totalOperations}`);
  lines.push("");

  // Transformation graph
  lines.push("--- TRANSFORMATION GRAPH ---");
  for (const [auth, transforms] of report.transformationGraph.byAuthority) {
    lines.push(`  ${auth}: ${transforms.length} transformation(s)`);
  }
  lines.push(`  total transformations: ${report.transformationGraph.transformations.length}`);
  lines.push("");

  // Projection graph
  lines.push("--- PROJECTION GRAPH ---");
  if (report.projectionGraph.projections.length === 0) {
    lines.push("  (none defined in Sprint 1)");
  }
  lines.push("");

  // Diagnostics
  if (report.diagnostics.length > 0) {
    lines.push("--- DIAGNOSTICS ---");
    for (const d of report.diagnostics) {
      lines.push(`  ${d}`);
    }
    lines.push("");
  }

  lines.push("=== END INSPECTOR REPORT ===");
  return lines.join("\n");
}
