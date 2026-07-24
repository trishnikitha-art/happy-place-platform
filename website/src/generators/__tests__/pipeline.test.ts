/**
 * Pipeline integration tests — full manifest → IR → all generators.
 *
 * Proves the entire Sprint 2 pipeline works end-to-end.
 */

import { parseManifest } from "../../compiler/parser";
import { validateManifest } from "../../compiler/validator";
import { normalizeManifest } from "../../compiler/normalizer";
import { generateAll, validateAll, ALL_GENERATORS } from "../index";
import { getTestIR, getMinimalIR } from "./test-ir";
import * as fs from "fs";
import * as path from "path";

const MANIFEST_PATH = path.resolve(__dirname, "../../constitution/GENERATION_MANIFEST.yaml");

describe("Full Pipeline: Manifest → IR → Generated Runtime", () => {
  it("real manifest compiles through full pipeline", () => {
    const yaml = fs.readFileSync(MANIFEST_PATH, "utf-8");
    const parse = parseManifest(yaml, "GENERATION_MANIFEST.yaml");
    const validation = validateManifest(parse.ast);
    expect(validation.valid).toBe(true);

    const { ir } = normalizeManifest(parse.ast);
    expect(ir.ir_version).toBe("1.0.0");

    const result = generateAll(ir);
    expect(result.artifacts.length).toBeGreaterThan(0);
    expect(result.totalHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates repositories for all aggregates", () => {
    const ir = getTestIR();
    const result = generateAll(ir);

    const repoFiles = result.artifacts.filter(
      (a) => a.path.startsWith("repositories/") && !a.path.includes("__tests__"),
    );
    const aggregateCount = ir.nodes.filter((n) => n.kind === "aggregate").length;
    expect(repoFiles.length).toBe(aggregateCount);
  });

  it("generates events for all event types", () => {
    const ir = getTestIR();
    const result = generateAll(ir);

    const eventFiles = result.artifacts.filter(
      (a) => a.path.startsWith("events/") && a.path.endsWith(".ts"),
    );
    // Envelope + Registry + individual events + factory
    const eventCount = ir.nodes.filter((n) => n.kind === "event").length;
    expect(eventFiles.length).toBeGreaterThanOrEqual(eventCount + 3); // envelope + registry + factory
  });

  it("generates replay maps from IR edges", () => {
    const ir = getTestIR();
    const result = generateAll(ir);

    const replayFiles = result.artifacts.filter((a) => a.path.startsWith("replay/"));
    expect(replayFiles.length).toBe(3); // ReplayMap + ReplayRegistry + AggregateDispatch
  });

  it("generates authority registry from IR authorities", () => {
    const ir = getTestIR();
    const result = generateAll(ir);

    const authFiles = result.artifacts.filter((a) => a.path.startsWith("authorities/"));
    expect(authFiles.length).toBe(3); // Registry + Resolver + Policies
  });

  it("generates projection skeletons for all aggregates", () => {
    const ir = getTestIR();
    const result = generateAll(ir);

    const projFiles = result.artifacts.filter(
      (a) => a.path.startsWith("projections/") && !a.path.endsWith("ProjectionRegistry.ts"),
    );
    const aggregateCount = ir.nodes.filter((n) => n.kind === "aggregate").length;
    expect(projFiles.length).toBe(aggregateCount);
  });

  it("no generated file reads YAML", () => {
    const ir = getTestIR();
    const result = generateAll(ir);

    for (const artifact of result.artifacts) {
      expect(artifact.content).not.toContain("require(\"yaml\")");
      expect(artifact.content).not.toContain("from \"yaml\"");
      expect(artifact.content).not.toContain("import.*yaml");
      expect(artifact.content).not.toContain("parseManifest");
    }
  });

  it("all generated files have deterministic SHA-256 hashes", () => {
    const ir = getTestIR();
    const result = generateAll(ir);

    for (const artifact of result.artifacts) {
      expect(artifact.hash).toMatch(/^[a-f0-9]{64}$/);
      // Recompute and verify
      const crypto = require("crypto");
      const expected = crypto.createHash("sha256").update(artifact.content).digest("hex");
      expect(artifact.hash).toBe(expected);
    }
  });

  it("generateAll is deterministic — same IR produces same artifacts", () => {
    const ir = getTestIR();
    const r1 = generateAll(ir);
    const r2 = generateAll(ir);

    expect(r1.artifacts.length).toBe(r2.artifacts.length);
    expect(r1.totalHash).toBe(r2.totalHash);

    for (let i = 0; i < r1.artifacts.length; i++) {
      expect(r1.artifacts[i].path).toBe(r2.artifacts[i].path);
      expect(r1.artifacts[i].content).toBe(r2.artifacts[i].content);
      expect(r1.artifacts[i].hash).toBe(r2.artifacts[i].hash);
    }
  });

  it("coverage dashboard shows 100% generated for all areas", () => {
    const ir = getTestIR();
    const result = generateAll(ir);

    expect(result.coverage.rows.length).toBe(5);
    for (const row of result.coverage.rows) {
      expect(row.generated).toBe(100);
      expect(row.handwritten).toBe(0);
    }
    expect(result.coverage.overallGenerated).toBe(100);
    expect(result.coverage.overallHandwritten).toBe(0);
  });

  it("validateAll passes with zero errors", () => {
    const ir = getTestIR();
    const result = generateAll(ir);
    const diagnostics = validateAll(ir, result.artifacts);
    expect(diagnostics.filter((d) => d.severity === "error")).toHaveLength(0);
  });

  it("byGenerator map contains entries for all active generators", () => {
    const ir = getTestIR();
    const result = generateAll(ir);

    for (const gen of ALL_GENERATORS) {
      if (gen.supports(ir)) {
        expect(result.byGenerator[gen.name]).toBeDefined();
        expect(result.byGenerator[gen.name].length).toBeGreaterThan(0);
      }
    }
  });

  it("minimal IR compiles through full pipeline", () => {
    const ir = getMinimalIR();
    const result = generateAll(ir);

    expect(result.artifacts.length).toBeGreaterThan(0);
    expect(result.totalHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.coverage.overallGenerated).toBe(100);
  });

  it("total artifact count from real manifest is substantial", () => {
    const ir = getTestIR();
    const result = generateAll(ir);

    // We expect: repos(6*2=12) + events(17+3=20) + replay(3) + authority(3) + projections(7) = ~45
    expect(result.artifacts.length).toBeGreaterThanOrEqual(30);
  });
});
