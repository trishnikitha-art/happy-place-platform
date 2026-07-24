/**
 * Event Generator tests.
 */

import { EventGenerator } from "../events";
import { getTestIR, getMinimalIR } from "./test-ir";

describe("EventGenerator", () => {
  const gen = new EventGenerator();
  const ir = getTestIR();
  const minimalIR = getMinimalIR();

  it("supports IR with event nodes", () => {
    expect(gen.supports(ir)).toBe(true);
  });

  it("generates EventEnvelope.ts", () => {
    const artifacts = gen.generate(ir);
    const envelope = artifacts.find((a) => a.path.endsWith("EventEnvelope.ts"));
    expect(envelope).toBeDefined();
  });

  it("EventEnvelope has all 10 required fields", () => {
    const artifacts = gen.generate(ir);
    const envelope = artifacts.find((a) => a.path.endsWith("EventEnvelope.ts"));
    expect(envelope).toBeDefined();
    const required = ["aggregateId", "authorityId", "tenantId", "replaySequence", "witnessId", "correlationId", "causationId", "schemaVersion", "timestamp", "contentHash"];
    for (const field of required) {
      expect(envelope!.content).toContain(field);
    }
  });

  it("generates EventRegistry.ts", () => {
    const artifacts = gen.generate(ir);
    const registry = artifacts.find((a) => a.path.endsWith("EventRegistry.ts"));
    expect(registry).toBeDefined();
  });

  it("generates one event file per event node", () => {
    const artifacts = gen.generate(ir);
    const eventFiles = artifacts.filter(
      (a) => a.path.startsWith("events/") && !a.path.endsWith("EventEnvelope.ts") && !a.path.endsWith("EventRegistry.ts") && !a.path.includes("createEvent"),
    );
    const eventCount = ir.nodes.filter((n) => n.kind === "event").length;
    expect(eventFiles.length).toBe(eventCount);
  });

  it("each event file has a type guard", () => {
    const artifacts = gen.generate(ir);
    const eventFiles = artifacts.filter(
      (a) => a.path.startsWith("events/") && !a.path.endsWith("EventEnvelope.ts") && !a.path.endsWith("EventRegistry.ts") && !a.path.includes("createEvent"),
    );
    for (const file of eventFiles) {
      expect(file.content).toContain("export function is");
    }
  });

  it("generates createEvent.ts factory", () => {
    const artifacts = gen.generate(ir);
    const factory = artifacts.find((a) => a.path.endsWith("createEvent.ts"));
    expect(factory).toBeDefined();
    expect(factory!.content).toContain("export function createEvent");
  });

  it("factory computes content hashes", () => {
    const artifacts = gen.generate(ir);
    const factory = artifacts.find((a) => a.path.endsWith("createEvent.ts"));
    expect(factory!.content).toContain("computeContentHash");
    expect(factory!.content).toContain("sha256");
  });

  it("all events include all envelope fields", () => {
    const artifacts = gen.generate(ir);
    const eventFiles = artifacts.filter(
      (a) => a.path.startsWith("events/") && a.path.endsWith(".ts") && !a.path.endsWith("EventEnvelope.ts") && !a.path.endsWith("EventRegistry.ts") && !a.path.includes("createEvent"),
    );
    const required = ["aggregateId", "authorityId", "tenantId", "replaySequence", "witnessId", "correlationId", "causationId", "schemaVersion", "timestamp", "contentHash"];
    for (const file of eventFiles) {
      for (const field of required) {
        expect(file.content).toContain(field);
      }
    }
  });

  it("validate() passes for generated output", () => {
    const artifacts = gen.generate(ir);
    const diagnostics = gen.validate(artifacts);
    expect(diagnostics.filter((d) => d.severity === "error")).toHaveLength(0);
  });

  it("snapshot is deterministic", () => {
    const s1 = gen.snapshot(ir);
    const s2 = gen.snapshot(ir);
    expect(s1).toBe(s2);
  });

  it("minimal IR generates envelope + registry + 1 event + factory", () => {
    const artifacts = gen.generate(minimalIR);
    expect(artifacts.some((a) => a.path.endsWith("EventEnvelope.ts"))).toBe(true);
    expect(artifacts.some((a) => a.path.endsWith("EventRegistry.ts"))).toBe(true);
    expect(artifacts.some((a) => a.path.includes("WidgetCreated"))).toBe(true);
    expect(artifacts.some((a) => a.path.endsWith("createEvent.ts"))).toBe(true);
  });
});
