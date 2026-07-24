/**
 * Replay Generator tests.
 */

import { ReplayGenerator } from "../replay";
import { getTestIR, getMinimalIR } from "./test-ir";

describe("ReplayGenerator", () => {
  const gen = new ReplayGenerator();
  const ir = getTestIR();
  const minimalIR = getMinimalIR();

  it("supports IR with emit edges", () => {
    expect(gen.supports(ir)).toBe(true);
  });

  it("generates ReplayMap.ts", () => {
    const artifacts = gen.generate(ir);
    expect(artifacts.some((a) => a.path.endsWith("ReplayMap.ts"))).toBe(true);
  });

  it("ReplayMap has entries for each aggregate that emits events", () => {
    const artifacts = gen.generate(ir);
    const replayMap = artifacts.find((a) => a.path.endsWith("ReplayMap.ts"));
    expect(replayMap).toBeDefined();
    expect(replayMap!.content).toContain("REPLAY_MAP");
    expect(replayMap!.content).toContain("getApplyMethod");
    expect(replayMap!.content).toContain("getEventsForAggregate");
  });

  it("ReplayMap maps Estimate events to apply methods", () => {
    const artifacts = gen.generate(ir);
    const replayMap = artifacts.find((a) => a.path.endsWith("ReplayMap.ts"));
    expect(replayMap!.content).toContain("Estimate");
    expect(replayMap!.content).toContain("EstimateCreated");
    expect(replayMap!.content).toContain("EstimateAccepted");
  });

  it("generates ReplayRegistry.ts", () => {
    const artifacts = gen.generate(ir);
    expect(artifacts.some((a) => a.path.endsWith("ReplayRegistry.ts"))).toBe(true);
  });

  it("ReplayRegistry maps events to aggregates", () => {
    const artifacts = gen.generate(ir);
    const registry = artifacts.find((a) => a.path.endsWith("ReplayRegistry.ts"));
    expect(registry).toBeDefined();
    expect(registry!.content).toContain("EVENT_TO_AGGREGATE");
    expect(registry!.content).toContain("resolveAggregate");
    expect(registry!.content).toContain("isRegistered");
  });

  it("generates AggregateDispatch.ts", () => {
    const artifacts = gen.generate(ir);
    expect(artifacts.some((a) => a.path.endsWith("AggregateDispatch.ts"))).toBe(true);
  });

  it("AggregateDispatch has replayStream function", () => {
    const artifacts = gen.generate(ir);
    const dispatch = artifacts.find((a) => a.path.endsWith("AggregateDispatch.ts"));
    expect(dispatch).toBeDefined();
    expect(dispatch!.content).toContain("export function dispatchEvent");
    expect(dispatch!.content).toContain("export function replayStream");
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

  it("minimal IR generates ReplayMap with Widget mapping", () => {
    const artifacts = gen.generate(minimalIR);
    const replayMap = artifacts.find((a) => a.path.endsWith("ReplayMap.ts"));
    expect(replayMap).toBeDefined();
    expect(replayMap!.content).toContain("Widget");
    expect(replayMap!.content).toContain("WidgetCreated");
  });
});
