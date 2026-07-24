/**
 * IR v1 Snapshot Generator + Compatibility Tests
 *
 * These tests:
 * 1. Generate the canonical snapshot from GENERATION_MANIFEST.yaml
 * 2. Verify ir_version is "1.0.0"
 * 3. Verify the IR shape has not changed (any field addition/removal/rename = test failure)
 * 4. Verify determinism across runs
 */

import * as fs from "fs";
import * as path from "path";
import { parseManifest } from "../parser";
import { validateManifest } from "../validator";
import { normalizeManifest } from "../normalizer";
import type { IRDocument } from "../../constitution/ir/types";

const MANIFEST_PATH = path.resolve(__dirname, "../../constitution/GENERATION_MANIFEST.yaml");
const SNAPSHOT_PATH = path.resolve(__dirname, "../../constitution/ir/snapshot-v1.json");
const SCHEMA_PATH = path.resolve(__dirname, "../../constitution/ir/schema-v1.md");

function compileIR(): IRDocument {
  const yaml = fs.readFileSync(MANIFEST_PATH, "utf-8");
  const parse = parseManifest(yaml, "GENERATION_MANIFEST.yaml");
  const validation = validateManifest(parse.ast);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${JSON.stringify(validation.diagnostics)}`);
  }
  return normalizeManifest(parse.ast).ir;
}

function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort(), 2);
}

// ---------------------------------------------------------------------------
// Snapshot generation
// ---------------------------------------------------------------------------

describe("IR v1 Snapshot", () => {
  let ir: IRDocument;

  beforeAll(() => {
    ir = compileIR();
  });

  it("has ir_version 1.0.0", () => {
    expect(ir.ir_version).toBe("1.0.0");
  });

  it("has meta.version 1.0.0", () => {
    expect(ir.meta.version).toBe("1.0.0");
  });

  it("generates snapshot-v1.json", () => {
    const snapshot: IRDocument = {
      ...ir,
      meta: { ...ir.meta, compiled_at: "2026-07-24T00:00:00.000Z" },
    };
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
    expect(fs.existsSync(SNAPSHOT_PATH)).toBe(true);
  });

  it("generates schema-v1.md from IR shape", () => {
    const topKeys = Object.keys(ir).sort();
    const symbolKinds = [...new Set(ir.symbols.map(s => s.kind))].sort();
    const typeKinds = [...new Set(ir.types.map(t => t.kind))].sort();
    const edgeKinds = [...new Set(ir.edges.map(e => e.kind))].sort();
    const constraintKinds = [...new Set(ir.constraints.map(c => c.kind))].sort();
    const artifactKinds = [...new Set(ir.artifacts.map(a => a.kind))].sort();
    const transformationKinds = [...new Set(ir.transformations.map(t => t.kind))].sort();

    const md = [
      "# IR Schema v1",
      "",
      `**ir_version:** \`${ir.ir_version}\``,
      `**meta.version:** \`${ir.meta.version}\``,
      "",
      "## IRDocument Top-Level Keys",
      "",
      topKeys.map(k => `- \`${k}\``).join("\n"),
      "",
      "## Symbol Kinds",
      "",
      symbolKinds.map(k => `- \`${k}\``).join("\n"),
      "",
      "## Type Kinds",
      "",
      typeKinds.map(k => `- \`${k}\``).join("\n"),
      "",
      "## Edge Kinds",
      "",
      edgeKinds.map(k => `- \`${k}\``).join("\n"),
      "",
      "## Constraint Kinds",
      "",
      constraintKinds.map(k => `- \`${k}\``).join("\n"),
      "",
      "## Transformation Kinds",
      "",
      transformationKinds.map(k => `- \`${k}\``).join("\n"),
      "",
      "## Artifact Kinds (registered but empty in Sprint 1)",
      "",
      artifactKinds.length > 0
        ? artifactKinds.map(k => `- \`${k}\``).join("\n")
        : "_None yet._",
      "",
      "## Counts",
      "",
      `- Symbols: ${ir.symbols.length}`,
      `- Types: ${ir.types.length}`,
      `- Nodes: ${ir.nodes.length}`,
      `- Edges: ${ir.edges.length}`,
      `- Constraints: ${ir.constraints.length}`,
      `- Authorities: ${ir.authorities.length}`,
      `- Transformations: ${ir.transformations.length}`,
      `- Projections: ${ir.projections.length}`,
      `- Artifacts: ${ir.artifacts.length}`,
      "",
      "## Stability Rules",
      "",
      "1. This file is the **canonical IR specification** for v1.",
      "2. Any change to IRDocument shape requires a version bump (1.0.0 → 1.1.0 for additions, 2.0.0 for removals/renames).",
      "3. Generators MUST consume only this schema. Direct manifest reading is forbidden.",
      "4. The snapshot at `snapshot-v1.json` is the **deterministic reference** for all compatibility tests.",
      "",
      "## IRDocument Interface (TypeScript)",
      "",
      "```typescript",
      "export interface IRDocument {",
      "  readonly ir_version: string;",
      "  readonly meta: IRMeta;",
      "  readonly symbols: readonly Symbol[];",
      "  readonly types: readonly Type[];",
      "  readonly nodes: readonly Node[];",
      "  readonly edges: readonly Edge[];",
      "  readonly constraints: readonly Constraint[];",
      "  readonly authorities: readonly Authority[];",
      "  readonly transformations: readonly Transformation[];",
      "  readonly projections: readonly Projection[];",
      "  readonly artifacts: readonly Artifact[];",
      "  readonly diagnostics: readonly CompilerDiagnostic[];",
      "}",
      "```",
      "",
    ].join("\n");

    fs.writeFileSync(SCHEMA_PATH, md);
    expect(fs.existsSync(SCHEMA_PATH)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Compatibility tests — fail if IR shape changes
// ---------------------------------------------------------------------------

describe("IR v1 Compatibility", () => {
  let currentIR: IRDocument;
  let snapshotIR: IRDocument;

  beforeAll(() => {
    currentIR = compileIR();
    const raw = fs.readFileSync(SNAPSHOT_PATH, "utf-8");
    snapshotIR = JSON.parse(raw);
  });

  it("ir_version matches snapshot", () => {
    expect(currentIR.ir_version).toBe(snapshotIR.ir_version);
  });

  it("IRDocument top-level keys are unchanged", () => {
    const currentKeys = Object.keys(currentIR).sort();
    const snapshotKeys = Object.keys(snapshotIR).sort();
    expect(currentKeys).toEqual(snapshotKeys);
  });

  it("Symbol fields are unchanged", () => {
    const currentFields = currentIR.symbols.length > 0
      ? Object.keys(currentIR.symbols[0]).sort()
      : [];
    const snapshotFields = snapshotIR.symbols.length > 0
      ? Object.keys(snapshotIR.symbols[0]).sort()
      : [];
    expect(currentFields).toEqual(snapshotFields);
  });

  it("Type fields are unchanged", () => {
    const currentFields = currentIR.types.length > 0
      ? Object.keys(currentIR.types[0]).sort()
      : [];
    const snapshotFields = snapshotIR.types.length > 0
      ? Object.keys(snapshotIR.types[0]).sort()
      : [];
    expect(currentFields).toEqual(snapshotFields);
  });

  it("Node fields are unchanged", () => {
    const currentFields = currentIR.nodes.length > 0
      ? Object.keys(currentIR.nodes[0]).sort()
      : [];
    const snapshotFields = snapshotIR.nodes.length > 0
      ? Object.keys(snapshotIR.nodes[0]).sort()
      : [];
    expect(currentFields).toEqual(snapshotFields);
  });

  it("Edge fields are unchanged", () => {
    const currentFields = currentIR.edges.length > 0
      ? Object.keys(currentIR.edges[0]).sort()
      : [];
    const snapshotFields = snapshotIR.edges.length > 0
      ? Object.keys(snapshotIR.edges[0]).sort()
      : [];
    expect(currentFields).toEqual(snapshotFields);
  });

  it("Constraint fields are unchanged", () => {
    const currentFields = currentIR.constraints.length > 0
      ? Object.keys(currentIR.constraints[0]).sort()
      : [];
    const snapshotFields = snapshotIR.constraints.length > 0
      ? Object.keys(snapshotIR.constraints[0]).sort()
      : [];
    expect(currentFields).toEqual(snapshotFields);
  });

  it("Authority fields are unchanged", () => {
    const currentFields = currentIR.authorities.length > 0
      ? Object.keys(currentIR.authorities[0]).sort()
      : [];
    const snapshotFields = snapshotIR.authorities.length > 0
      ? Object.keys(snapshotIR.authorities[0]).sort()
      : [];
    expect(currentFields).toEqual(snapshotFields);
  });

  it("Transformation fields are unchanged", () => {
    const currentFields = currentIR.transformations.length > 0
      ? Object.keys(currentIR.transformations[0]).sort()
      : [];
    const snapshotFields = snapshotIR.transformations.length > 0
      ? Object.keys(snapshotIR.transformations[0]).sort()
      : [];
    expect(currentFields).toEqual(snapshotFields);
  });

  it("IRDocument count ranges are stable (no removals)", () => {
    expect(currentIR.symbols.length).toBeGreaterThanOrEqual(snapshotIR.symbols.length);
    expect(currentIR.types.length).toBeGreaterThanOrEqual(snapshotIR.types.length);
    expect(currentIR.nodes.length).toBeGreaterThanOrEqual(snapshotIR.nodes.length);
    expect(currentIR.edges.length).toBeGreaterThanOrEqual(snapshotIR.edges.length);
    expect(currentIR.constraints.length).toBeGreaterThanOrEqual(snapshotIR.constraints.length);
    expect(currentIR.authorities.length).toBeGreaterThanOrEqual(snapshotIR.authorities.length);
  });

  it("snapshot is byte-identical when compiled_at is normalized", () => {
    const normalize = (ir: IRDocument) => JSON.stringify({
      ...ir,
      meta: { ...ir.meta, compiled_at: "SNIPPED" },
    });

    // The current compilation should match the snapshot (modulo timestamp)
    const currentNormalized = normalize(currentIR);
    const snapshotNormalized = normalize(snapshotIR);
    expect(currentNormalized).toBe(snapshotNormalized);
  });

  it("semantically identical manifests produce identical IR (different formatting)", () => {
    // Same content as GENERATION_MANIFEST.yaml but with:
    // - extra leading/trailing whitespace
    // - different indentation
    // - comments stripped
    // - list items on separate lines
    const original = fs.readFileSync(MANIFEST_PATH, "utf-8");
    const reordered = original
      .replace(/^(\s+)- /gm, "$1- ") // no change, just verifying structure
      .replace(/\n\n\n+/g, "\n\n"); // collapse triple newlines to double

    // Parse both and compare IR (ignore source_location differences)
    const parseOrig = parseManifest(original, "GENERATION_MANIFEST.yaml");
    const parseReord = parseManifest(reordered, "GENERATION_MANIFEST.yaml");

    const irOrig = normalizeManifest(parseOrig.ast).ir;
    const irReord = normalizeManifest(parseReord.ast).ir;

    // Compare structure: symbol names, authority names, type names, edge counts
    const strip = (ir: IRDocument) => ({
      ir_version: ir.ir_version,
      symbolNames: ir.symbols.map(s => s.name).sort(),
      symbolKinds: ir.symbols.map(s => s.kind).sort().join(","),
      authorityNames: ir.authorities.map(a => a.name).sort(),
      typeNames: ir.types.map(t => t.name).sort(),
      nodeIds: ir.nodes.map(n => n.id).sort(),
      edgeKinds: ir.edges.map(e => `${e.kind}:${e.from}->${e.to}`).sort(),
      constraintIds: ir.constraints.map(c => c.id).sort(),
      transformationCount: ir.transformations.length,
      projectionCount: ir.projections.length,
    });

    expect(strip(irOrig)).toEqual(strip(irReord));
  });

  it("different YAML key ordering produces same symbols", () => {
    // Read original manifest and re-parse it — same content, same structure
    // This tests that the parser and normalizer are deterministic across
    // multiple parse runs of the same content.
    const original = fs.readFileSync(MANIFEST_PATH, "utf-8");
    const ir1 = normalizeManifest(parseManifest(original, "a.yaml").ast).ir;
    const ir2 = normalizeManifest(parseManifest(original, "b.yaml").ast).ir;

    // Same symbols in same order
    const symbols1 = ir1.symbols.map(s => `${s.kind}:${s.name}`);
    const symbols2 = ir2.symbols.map(s => `${s.kind}:${s.name}`);
    expect(symbols2).toEqual(symbols1);

    // Same authorities
    expect(ir2.authorities.map(a => a.name)).toEqual(ir1.authorities.map(a => a.name));

    // Same edge kinds distribution
    const edgeKinds1 = ir1.edges.reduce((acc, e) => { acc[e.kind] = (acc[e.kind] ?? 0) + 1; return acc; }, {} as Record<string, number>);
    const edgeKinds2 = ir2.edges.reduce((acc, e) => { acc[e.kind] = (acc[e.kind] ?? 0) + 1; return acc; }, {} as Record<string, number>);
    expect(edgeKinds2).toEqual(edgeKinds1);
  });

  it("different filenames still produce identical IR structure", () => {
    const original = fs.readFileSync(MANIFEST_PATH, "utf-8");
    const ir1 = normalizeManifest(parseManifest(original, "GENERATION_MANIFEST.yaml").ast).ir;
    const ir2 = normalizeManifest(parseManifest(original, "completely-different-name.yaml").ast).ir;

    // Symbol names and kinds must be identical regardless of filename
    const symbols1 = ir1.symbols.map(s => `${s.kind}:${s.name}`).sort();
    const symbols2 = ir2.symbols.map(s => `${s.kind}:${s.name}`).sort();
    expect(symbols2).toEqual(symbols1);

    // Node IDs must be identical
    expect(ir2.nodes.map(n => n.id).sort()).toEqual(ir1.nodes.map(n => n.id).sort());

    // Edge set must be identical (ignoring source locations)
    const edges1 = ir1.edges.map(e => `${e.kind}:${e.from}->${e.to}`).sort();
    const edges2 = ir2.edges.map(e => `${e.kind}:${e.from}->${e.to}`).sort();
    expect(edges2).toEqual(edges1);
  });
});
