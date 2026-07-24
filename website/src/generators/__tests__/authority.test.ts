/**
 * Authority Generator tests.
 */

import { AuthorityGenerator } from "../authority";
import { getTestIR, getMinimalIR } from "./test-ir";

describe("AuthorityGenerator", () => {
  const gen = new AuthorityGenerator();
  const ir = getTestIR();
  const minimalIR = getMinimalIR();

  it("supports IR with authorities", () => {
    expect(gen.supports(ir)).toBe(true);
  });

  it("generates AuthorityRegistry.ts", () => {
    const artifacts = gen.generate(ir);
    expect(artifacts.some((a) => a.path.endsWith("AuthorityRegistry.ts"))).toBe(true);
  });

  it("AuthorityRegistry has entries for all authorities", () => {
    const artifacts = gen.generate(ir);
    const registry = artifacts.find((a) => a.path.endsWith("AuthorityRegistry.ts"));
    expect(registry).toBeDefined();
    expect(registry!.content).toContain("AUTHORITY_REGISTRY");
    for (const auth of ir.authorities) {
      expect(registry!.content).toContain(auth.name);
    }
  });

  it("AuthorityRegistry entry has owns, emitsFor, constraints", () => {
    const artifacts = gen.generate(ir);
    const registry = artifacts.find((a) => a.path.endsWith("AuthorityRegistry.ts"));
    expect(registry!.content).toContain("owns:");
    expect(registry!.content).toContain("emitsFor:");
    expect(registry!.content).toContain("constraints:");
  });

  it("generates AuthorityResolver.ts", () => {
    const artifacts = gen.generate(ir);
    expect(artifacts.some((a) => a.path.endsWith("AuthorityResolver.ts"))).toBe(true);
  });

  it("AuthorityResolver has ownerOf, whoMayMutate, whoMayObserve", () => {
    const artifacts = gen.generate(ir);
    const resolver = artifacts.find((a) => a.path.endsWith("AuthorityResolver.ts"));
    expect(resolver).toBeDefined();
    expect(resolver!.content).toContain("export function ownerOf");
    expect(resolver!.content).toContain("export function whoMayMutate");
    expect(resolver!.content).toContain("export function whoMayObserve");
    expect(resolver!.content).toContain("export function authorityOfEvent");
    expect(resolver!.content).toContain("export function policiesFor");
  });

  it("generates AuthorityPolicies.ts", () => {
    const artifacts = gen.generate(ir);
    expect(artifacts.some((a) => a.path.endsWith("AuthorityPolicies.ts"))).toBe(true);
  });

  it("AuthorityPolicies has beforeMutation and afterMutation", () => {
    const artifacts = gen.generate(ir);
    const policies = artifacts.find((a) => a.path.endsWith("AuthorityPolicies.ts"));
    expect(policies).toBeDefined();
    expect(policies!.content).toContain("export async function beforeMutation");
    expect(policies!.content).toContain("export async function afterMutation");
    expect(policies!.content).toContain("AUTHORITY_OWNERSHIP");
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

  it("minimal IR generates all 3 files", () => {
    const artifacts = gen.generate(minimalIR);
    expect(artifacts.some((a) => a.path.endsWith("AuthorityRegistry.ts"))).toBe(true);
    expect(artifacts.some((a) => a.path.endsWith("AuthorityResolver.ts"))).toBe(true);
    expect(artifacts.some((a) => a.path.endsWith("AuthorityPolicies.ts"))).toBe(true);
  });

  it("minimal IR AuthorityRegistry contains TestAuth", () => {
    const artifacts = gen.generate(minimalIR);
    const registry = artifacts.find((a) => a.path.endsWith("AuthorityRegistry.ts"));
    expect(registry!.content).toContain("TestAuth");
    expect(registry!.content).toContain("Widget");
  });
});
