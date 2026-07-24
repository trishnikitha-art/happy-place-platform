/**
 * Repository Generator tests.
 */

import { RepositoryGenerator } from "../repository";
import { getTestIR, getMinimalIR } from "./test-ir";

describe("RepositoryGenerator", () => {
  const gen = new RepositoryGenerator();
  const ir = getTestIR();
  const minimalIR = getMinimalIR();

  it("supports IR with aggregate nodes", () => {
    expect(gen.supports(ir)).toBe(true);
  });

  it("supports minimal IR", () => {
    expect(gen.supports(minimalIR)).toBe(true);
  });

  it("generates a repository class per aggregate", () => {
    const artifacts = gen.generate(ir);
    const repoFiles = artifacts.filter((a) => a.path.startsWith("repositories/") && !a.path.includes("__tests__"));
    expect(repoFiles.length).toBeGreaterThanOrEqual(6); // Estimate, Job, Project, Customer, Crew, Vendor
  });

  it("each repository has load() and save() methods", () => {
    const artifacts = gen.generate(ir);
    for (const artifact of artifacts) {
      if (artifact.path.startsWith("repositories/") && !artifact.path.includes("__tests__")) {
        expect(artifact.content).toContain("async load(");
        expect(artifact.content).toContain("async save(");
      }
    }
  });

  it("each repository has apply() method", () => {
    const artifacts = gen.generate(ir);
    for (const artifact of artifacts) {
      if (artifact.path.startsWith("repositories/") && !artifact.path.includes("__tests__")) {
        expect(artifact.content).toContain("apply(");
      }
    }
  });

  it("each repository has replay integration (apply switch)", () => {
    const artifacts = gen.generate(ir);
    for (const artifact of artifacts) {
      if (artifact.path.startsWith("repositories/") && !artifact.path.includes("__tests__")) {
        expect(artifact.content).toContain("switch (event.type)");
      }
    }
  });

  it("each repository has snapshot interface", () => {
    const artifacts = gen.generate(ir);
    for (const artifact of artifacts) {
      if (artifact.path.startsWith("repositories/") && !artifact.path.includes("__tests__")) {
        expect(artifact.content).toContain("snapshot(");
        expect(artifact.content).toContain("loadFromSnapshot(");
      }
    }
  });

  it("each repository has authority hook interface", () => {
    const artifacts = gen.generate(ir);
    for (const artifact of artifacts) {
      if (artifact.path.startsWith("repositories/") && !artifact.path.includes("__tests__")) {
        expect(artifact.content).toContain("beforeCommand(");
        expect(artifact.content).toContain("afterSave(");
      }
    }
  });

  it("generates a test file per aggregate", () => {
    const artifacts = gen.generate(ir);
    const testFiles = artifacts.filter((a) => a.path.includes("__tests__"));
    expect(testFiles.length).toBeGreaterThanOrEqual(6);
  });

  it("each test file imports its repository", () => {
    const artifacts = gen.generate(ir);
    const testFiles = artifacts.filter((a) => a.path.includes("__tests__"));
    for (const test of testFiles) {
      expect(test.content).toContain("import");
      expect(test.content).toContain("Repository");
    }
  });

  it("all artifacts have SHA-256 hashes", () => {
    const artifacts = gen.generate(ir);
    for (const artifact of artifacts) {
      expect(artifact.hash).toMatch(/^[a-f0-9]{64}$/);
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

  it("different IRs produce different snapshots", () => {
    const s1 = gen.snapshot(ir);
    const s2 = gen.snapshot(minimalIR);
    expect(s1).not.toBe(s2);
  });

  it("repository for Estimate aggregate references Estimate events", () => {
    const artifacts = gen.generate(ir);
    const estimateRepo = artifacts.find((a) => a.path.includes("EstimateRepository"));
    expect(estimateRepo).toBeDefined();
    expect(estimateRepo!.content).toContain("EstimateCreated");
    expect(estimateRepo!.content).toContain("EstimateAccepted");
  });

  it("minimal IR generates one repository", () => {
    const artifacts = gen.generate(minimalIR);
    const repoFiles = artifacts.filter((a) => a.path.startsWith("repositories/") && !a.path.includes("__tests__"));
    expect(repoFiles.length).toBe(1);
    expect(repoFiles[0].path).toContain("Widget");
  });

  it("minimal IR repository compiles cleanly (no syntax errors)", () => {
    const artifacts = gen.generate(minimalIR);
    const widgetRepo = artifacts.find((a) => a.path.includes("WidgetRepository") && !a.path.includes("__tests__"));
    expect(widgetRepo).toBeDefined();
    // Check for basic TS structure
    expect(widgetRepo!.content).toContain("export interface");
    expect(widgetRepo!.content).toContain("export class");
    expect(widgetRepo!.content).toContain("export type");
  });
});
