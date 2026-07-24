/**
 * Projection Generator tests.
 */

import { ProjectionGenerator } from "../projection";
import { getTestIR, getMinimalIR } from "./test-ir";

describe("ProjectionGenerator", () => {
  const gen = new ProjectionGenerator();
  const ir = getTestIR();
  const minimalIR = getMinimalIR();

  it("supports IR with aggregate nodes", () => {
    expect(gen.supports(ir)).toBe(true);
  });

  it("generates a projection class per aggregate", () => {
    const artifacts = gen.generate(ir);
    const projFiles = artifacts.filter((a) => a.path.startsWith("projections/") && !a.path.endsWith("ProjectionRegistry.ts"));
    expect(projFiles.length).toBeGreaterThanOrEqual(6);
  });

  it("each projection has handle() method", () => {
    const artifacts = gen.generate(ir);
    for (const artifact of artifacts) {
      if (artifact.path.startsWith("projections/") && !artifact.path.endsWith("ProjectionRegistry.ts")) {
        expect(artifact.content).toContain("handle(");
      }
    }
  });

  it("each projection has project() method", () => {
    const artifacts = gen.generate(ir);
    for (const artifact of artifacts) {
      if (artifact.path.startsWith("projections/") && !artifact.path.endsWith("ProjectionRegistry.ts")) {
        expect(artifact.content).toContain("async project(");
      }
    }
  });

  it("each projection has rebuild() method", () => {
    const artifacts = gen.generate(ir);
    for (const artifact of artifacts) {
      if (artifact.path.startsWith("projections/") && !artifact.path.endsWith("ProjectionRegistry.ts")) {
        expect(artifact.content).toContain("async rebuild(");
      }
    }
  });

  it("each projection has tenant isolation (queryIsolated)", () => {
    const artifacts = gen.generate(ir);
    for (const artifact of artifacts) {
      if (artifact.path.startsWith("projections/") && !artifact.path.endsWith("ProjectionRegistry.ts")) {
        expect(artifact.content).toContain("queryIsolated(");
      }
    }
  });

  it("each projection has snapshot/restoreSnapshot", () => {
    const artifacts = gen.generate(ir);
    for (const artifact of artifacts) {
      if (artifact.path.startsWith("projections/") && !artifact.path.endsWith("ProjectionRegistry.ts")) {
        expect(artifact.content).toContain("snapshot()");
        expect(artifact.content).toContain("restoreSnapshot(");
      }
    }
  });

  it("each projection declares indexes", () => {
    const artifacts = gen.generate(ir);
    for (const artifact of artifacts) {
      if (artifact.path.startsWith("projections/") && !artifact.path.endsWith("ProjectionRegistry.ts")) {
        expect(artifact.content).toContain("readonly indexes");
      }
    }
  });

  it("generates ProjectionRegistry.ts", () => {
    const artifacts = gen.generate(ir);
    expect(artifacts.some((a) => a.path.endsWith("ProjectionRegistry.ts"))).toBe(true);
  });

  it("ProjectionRegistry has routeEvent function", () => {
    const artifacts = gen.generate(ir);
    const registry = artifacts.find((a) => a.path.endsWith("ProjectionRegistry.ts"));
    expect(registry).toBeDefined();
    expect(registry!.content).toContain("export async function routeEvent");
    expect(registry!.content).toContain("export function getProjection");
  });

  it("validate() passes", () => {
    const artifacts = gen.generate(ir);
    const diagnostics = gen.validate(artifacts);
    expect(diagnostics.filter((d) => d.severity === "error")).toHaveLength(0);
  });

  it("snapshot is deterministic", () => {
    const s1 = gen.snapshot(ir);
    const s2 = gen.snapshot(ir);
    expect(s1).toBe(s2);
  });

  it("minimal IR generates WidgetProjection + ProjectionRegistry", () => {
    const artifacts = gen.generate(minimalIR);
    expect(artifacts.some((a) => a.path.includes("WidgetProjection"))).toBe(true);
    expect(artifacts.some((a) => a.path.endsWith("ProjectionRegistry.ts"))).toBe(true);
  });
});
