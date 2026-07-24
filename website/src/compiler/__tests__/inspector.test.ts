/**
 * IR Inspector Tests
 *
 * Verifies the inspector produces correct structured views of the IR
 * from GENERATION_MANIFEST.yaml.
 */

import * as fs from "fs";
import * as path from "path";
import { parseManifest } from "../parser";
import { validateManifest } from "../validator";
import { normalizeManifest } from "../normalizer";
import { inspectIR, formatInspectorReport } from "../inspector";
import type { IRDocument } from "../../constitution/ir/types";

const MANIFEST_PATH = path.resolve(__dirname, "../../constitution/GENERATION_MANIFEST.yaml");

function compileIR(): IRDocument {
  const yaml = fs.readFileSync(MANIFEST_PATH, "utf-8");
  const parse = parseManifest(yaml, "GENERATION_MANIFEST.yaml");
  const validation = validateManifest(parse.ast);
  if (!validation.valid) throw new Error("Validation failed");
  return normalizeManifest(parse.ast).ir;
}

describe("IR Inspector", () => {
  let ir: IRDocument;
  let report: ReturnType<typeof inspectIR>;

  beforeAll(() => {
    ir = compileIR();
    report = inspectIR(ir);
  });

  // ---- Symbol Table ----

  describe("Symbol Table", () => {
    it("has correct total count", () => {
      expect(report.symbolTable.total).toBe(ir.symbols.length);
    });

    it("groups symbols by kind", () => {
      const auths = report.symbolTable.byKind.authority;
      expect(auths.length).toBe(5);
      expect(auths.map((s) => s.name)).toContain("MissionAuthority");
      expect(auths.map((s) => s.name)).toContain("IdentityAuthority");
    });

    it("has aggregates", () => {
      const aggs = report.symbolTable.byKind.aggregate;
      expect(aggs.length).toBeGreaterThanOrEqual(3);
      expect(aggs.map((s) => s.name)).toContain("Estimate");
      expect(aggs.map((s) => s.name)).toContain("Job");
      expect(aggs.map((s) => s.name)).toContain("Project");
    });

    it("has capabilities", () => {
      const caps = report.symbolTable.byKind.capability;
      expect(caps.length).toBe(7);
      expect(caps.map((s) => s.name)).toContain("Calendar");
      expect(caps.map((s) => s.name)).toContain("Payments");
    });

    it("has observations, claims, facts", () => {
      expect(report.symbolTable.byKind.observation.length).toBe(3);
      expect(report.symbolTable.byKind.claim.length).toBe(2);
      expect(report.symbolTable.byKind.fact.length).toBe(1);
    });

    it("every symbol has a matching node", () => {
      for (const entry of report.symbolTable.all) {
        expect(entry.nodeId).toBeDefined();
        const node = ir.nodes.find((n) => n.id === entry.nodeId);
        expect(node).toBeDefined();
      }
    });
  });

  // ---- Authority Graph ----

  describe("Authority Graph", () => {
    it("has 5 authorities", () => {
      expect(report.authorityGraph.authorities.length).toBe(5);
    });

    it("MissionAuthority owns Estimate, Job, Project", () => {
      const mission = report.authorityGraph.authorities.find((a) => a.name === "MissionAuthority");
      expect(mission).toBeDefined();
      expect(mission!.owns).toContain("entity:Estimate");
      expect(mission!.owns).toContain("entity:Job");
      expect(mission!.owns).toContain("entity:Project");
    });

    it("IdentityAuthority owns Customer, Crew, Vendor", () => {
      const identity = report.authorityGraph.authorities.find((a) => a.name === "IdentityAuthority");
      expect(identity).toBeDefined();
      expect(identity!.owns).toContain("entity:Customer");
      expect(identity!.owns).toContain("entity:Crew");
      expect(identity!.owns).toContain("entity:Vendor");
    });

    it("all authorities are deterministic", () => {
      for (const auth of report.authorityGraph.authorities) {
        expect(auth.deterministic).toBe(true);
      }
    });

    it("has ownership edges", () => {
      expect(report.authorityGraph.ownershipEdges.length).toBeGreaterThanOrEqual(12);
    });

    it("ObservationAuthority emits Claim events", () => {
      const obs = report.authorityGraph.authorities.find((a) => a.name === "ObservationAuthority");
      expect(obs).toBeDefined();
      expect(obs!.emitsFor).toContain("event:Claim");
    });

    it("reports unowned entities as diagnostics", () => {
      // NeedAppointment, NeedInvoice, NeedCrew, NeedReview are unowned (planning)
      if (report.authorityGraph.unownedEntities.length > 0) {
        expect(report.diagnostics.some((d) => d.includes("UNOWNED"))).toBe(true);
      }
    });
  });

  // ---- Mission Graph ----

  describe("Mission Graph", () => {
    it("has 3 missions (Estimate, Job, Project)", () => {
      expect(report.missionGraph.missions.length).toBe(3);
      const names = report.missionGraph.missions.map((m) => m.name);
      expect(names).toContain("Estimate");
      expect(names).toContain("Job");
      expect(names).toContain("Project");
    });

    it("Estimate has events", () => {
      const est = report.missionGraph.missions.find((m) => m.name === "Estimate");
      expect(est).toBeDefined();
      expect(est!.events).toContain("EstimateCreated");
      expect(est!.events).toContain("EstimateAccepted");
    });

    it("Estimate has commands", () => {
      const est = report.missionGraph.missions.find((m) => m.name === "Estimate");
      expect(est).toBeDefined();
      expect(est!.commands).toContain("Accept");
      expect(est!.commands).toContain("AssignCrew");
      expect(est!.commands).toContain("Complete");
    });

    it("has event nodes", () => {
      expect(report.missionGraph.eventNodes.length).toBeGreaterThanOrEqual(7);
    });

    it("has transition edges", () => {
      expect(report.missionGraph.transitionEdges.length).toBeGreaterThan(0);
    });
  });

  // ---- Capability Graph ----

  describe("Capability Graph", () => {
    it("has 7 capabilities", () => {
      expect(report.capabilityGraph.capabilities.length).toBe(7);
    });

    it("Calendar has versioned name calendar.v1", () => {
      const cal = report.capabilityGraph.capabilities.find((c) => c.name === "Calendar");
      expect(cal).toBeDefined();
      expect(cal!.versionedName).toBe("calendar.v1");
    });

    it("Payments has versioned name payments.v1", () => {
      const pay = report.capabilityGraph.capabilities.find((c) => c.name === "Payments");
      expect(pay).toBeDefined();
      expect(pay!.versionedName).toBe("payments.v1");
    });

    it("all capabilities have versioned names", () => {
      for (const cap of report.capabilityGraph.capabilities) {
        expect(cap.versionedName).toMatch(/^[a-z]+\.v\d+$/);
      }
    });

    it("total operations is sum of all contracts", () => {
      const expected = report.capabilityGraph.capabilities.reduce(
        (sum, c) => sum + c.contract.length, 0
      );
      expect(report.capabilityGraph.totalOperations).toBe(expected);
    });

    it("Storage has 4 operations", () => {
      const storage = report.capabilityGraph.capabilities.find((c) => c.name === "Storage");
      expect(storage).toBeDefined();
      expect(storage!.contract).toEqual(["Acquire", "Mirror", "Canonicalize", "Emit"]);
    });
  });

  // ---- Transformation Graph ----

  describe("Transformation Graph", () => {
    it("has transformations", () => {
      expect(report.transformationGraph.transformations.length).toBeGreaterThan(0);
    });

    it("has command-type transformations", () => {
      const commands = report.transformationGraph.transformations.filter((t) => t.kind === "command");
      expect(commands.length).toBeGreaterThan(0);
    });

    it("transforms have authority references", () => {
      for (const t of report.transformationGraph.transformations) {
        expect(t.authority).toBeDefined();
        expect(t.authority.length).toBeGreaterThan(0);
      }
    });

    it("transforms have input/output", () => {
      for (const t of report.transformationGraph.transformations) {
        expect(t.input).toBeDefined();
        expect(t.output).toBeDefined();
      }
    });
  });

  // ---- Projection Graph ----

  describe("Projection Graph", () => {
    it("has no projections in Sprint 1", () => {
      expect(report.projectionGraph.projections.length).toBe(0);
    });
  });

  // ---- Pretty-print format ----

  describe("formatInspectorReport", () => {
    it("produces readable output", () => {
      const formatted = formatInspectorReport(report);
      expect(formatted).toContain("=== IR INSPECTOR REPORT ===");
      expect(formatted).toContain("SYMBOL TABLE");
      expect(formatted).toContain("AUTHORITY GRAPH");
      expect(formatted).toContain("MISSION/STATE GRAPH");
      expect(formatted).toContain("CAPABILITY GRAPH");
      expect(formatted).toContain("TRANSFORMATION GRAPH");
      expect(formatted).toContain("PROJECTION GRAPH");
      expect(formatted).toContain("MissionAuthority");
      expect(formatted).toContain("calendar.v1");
    });
  });
});
