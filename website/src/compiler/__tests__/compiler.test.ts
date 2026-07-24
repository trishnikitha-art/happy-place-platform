/**
 * Compiler Golden Tests
 *
 * Proves:
 * 1. Valid manifest parses to immutable AST with source locations
 * 2. Invalid manifest produces structured diagnostics
 * 3. AST → IR normalization is deterministic (same input → byte-identical output)
 * 4. Full pipeline: YAML → AST → Validator → Normalizer → IR
 */

import * as fs from "fs";
import * as path from "path";
import { parseManifest } from "../parser";
import { validateManifest } from "../validator";
import { normalizeManifest } from "../normalizer";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const VALID_MANIFEST = `
manifest:
  name: test-tenant
  version: 1
  generated_from: constitution
  owner: hp-os
  runtime: ping

authorities:
  - name: MissionAuthority
    owns: [Estimate, Job, Project]
    events: [MissionCreated, MissionAccepted]
    commands: [Accept, AssignCrew, Complete]
    policies: [MustHaveCustomer]

identities:
  - Customer
  - Crew

missions:
  - name: Estimate
    owns: [Tasks, Evidence]
    events: [EstimateCreated, EstimateAccepted]
    commands: [Accept]
    policies: [MustHaveCustomer]

evidence:
  - Photo
  - Video

observations:
  - RoofDamage

claims:
  - NeedsReplacement

facts:
  - VerifiedRoofDamage

capabilities:
  - name: Calendar
    contract: [Schedule, Query, Update]
  - name: Payments
    contract: [Charge, Refund, Query]

policies:
  - TenantIsolation
  - Replay
`;

const INVALID_MANIFEST_MISSING_AUTHORITIES = `
manifest:
  name: test-tenant
  version: 1

identities:
  - Customer
`;

const INVALID_MANIFEST_AMBIGUOUS_OWNERSHIP = `
manifest:
  name: test-tenant
  version: 1

authorities:
  - name: AuthA
    owns: [SharedEntity]
  - name: AuthB
    owns: [SharedEntity]

identities:
  - SharedEntity
`;

const MANIFEST_MISSING_NAME = `
manifest:
  version: 1

authorities:
  - name: TestAuth
    owns: [Thing]
`;

const MANIFEST_INVALID_VERSION = `
manifest:
  name: test-tenant
  version: 99

authorities:
  - name: TestAuth
    owns: [Thing]
`;

const YAML_SYNTAX_ERROR = `
manifest:
  name: test-tenant
  version: [broken yaml
  here
`;

// ---------------------------------------------------------------------------
// Parser tests
// ---------------------------------------------------------------------------

describe("Parser", () => {
  it("parses valid manifest into AST", () => {
    const result = parseManifest(VALID_MANIFEST, "test.yaml");

    expect(result.ast.kind).toBe("manifest");
    expect(result.ast.sections.length).toBeGreaterThan(0);
    expect(result.diagnostics.filter(d => d.severity === "error")).toHaveLength(0);
  });

  it("preserves source locations", () => {
    const result = parseManifest(VALID_MANIFEST, "test.yaml");
    const loc = result.ast.source_location;

    expect(loc.file).toBe("test.yaml");
    expect(loc.line).toBeGreaterThan(0);
    expect(loc.column).toBeGreaterThan(0);
  });

  it("extracts all sections", () => {
    const result = parseManifest(VALID_MANIFEST, "test.yaml");
    const sectionNames = result.ast.sections.map(s => s.name);

    expect(sectionNames).toContain("authorities");
    expect(sectionNames).toContain("identities");
    expect(sectionNames).toContain("missions");
    expect(sectionNames).toContain("evidence");
    expect(sectionNames).toContain("observations");
    expect(sectionNames).toContain("claims");
    expect(sectionNames).toContain("facts");
    expect(sectionNames).toContain("capabilities");
    expect(sectionNames).toContain("policies");
  });

  it("returns structured diagnostics for YAML syntax errors", () => {
    const result = parseManifest(YAML_SYNTAX_ERROR, "bad.yaml");
    const errors = result.diagnostics.filter(d => d.severity === "error");

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe("E002");
    expect(errors[0].source_location.file).toBe("bad.yaml");
  });

  it("returns empty manifest on root-not-mapping", () => {
    const result = parseManifest("- just\n- a\n- list\n", "list.yaml");
    expect(result.ast.sections).toHaveLength(0);
    expect(result.diagnostics.some(d => d.code === "E003")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Validator tests
// ---------------------------------------------------------------------------

describe("Validator", () => {
  it("validates a complete manifest", () => {
    const parseResult = parseManifest(VALID_MANIFEST, "test.yaml");
    const validationResult = validateManifest(parseResult.ast);

    expect(validationResult.valid).toBe(true);
    expect(validationResult.diagnostics.filter(d => d.severity === "error")).toHaveLength(0);
  });

  it("reports missing authorities section", () => {
    const parseResult = parseManifest(INVALID_MANIFEST_MISSING_AUTHORITIES, "test.yaml");
    const validationResult = validateManifest(parseResult.ast);

    expect(validationResult.valid).toBe(false);
    expect(validationResult.diagnostics.some(d => d.code === "E201")).toBe(true);
  });

  it("reports missing manifest.name", () => {
    const parseResult = parseManifest(MANIFEST_MISSING_NAME, "test.yaml");
    const validationResult = validateManifest(parseResult.ast);

    expect(validationResult.valid).toBe(false);
    expect(validationResult.diagnostics.some(d => d.code === "E001")).toBe(true);
  });

  it("reports invalid manifest version", () => {
    const parseResult = parseManifest(MANIFEST_INVALID_VERSION, "test.yaml");
    const validationResult = validateManifest(parseResult.ast);

    expect(validationResult.valid).toBe(false);
    expect(validationResult.diagnostics.some(d => d.code === "E004")).toBe(true);
  });

  it("reports missing capability contract", () => {
    const manifest = `
manifest:
  name: test
  version: 1

authorities:
  - name: TestAuth
    owns: [Thing]

capabilities:
  - name: BrokenCapability
`;
    const parseResult = parseManifest(manifest, "test.yaml");
    const validationResult = validateManifest(parseResult.ast);

    expect(validationResult.valid).toBe(false);
    expect(validationResult.diagnostics.some(d => d.code === "E300")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Normalizer tests — determinism is the key property
// ---------------------------------------------------------------------------

describe("Normalizer", () => {
  it("produces valid IR from valid manifest", () => {
    const parseResult = parseManifest(VALID_MANIFEST, "test.yaml");
    const validationResult = validateManifest(parseResult.ast);
    expect(validationResult.valid).toBe(true);

    const normalizeResult = normalizeManifest(parseResult.ast);
    const ir = normalizeResult.ir;

    expect(ir.meta.version).toBe("1.0.0");
    expect(ir.symbols.length).toBeGreaterThan(0);
    expect(ir.types.length).toBeGreaterThan(0);
    expect(ir.nodes.length).toBeGreaterThan(0);
    expect(ir.authorities.length).toBeGreaterThan(0);
  });

  it("is deterministic — same input produces byte-identical IR", () => {
    const parseResult1 = parseManifest(VALID_MANIFEST, "test.yaml");
    const parseResult2 = parseManifest(VALID_MANIFEST, "test.yaml");

    const ir1 = normalizeManifest(parseResult1.ast).ir;
    const ir2 = normalizeManifest(parseResult2.ast).ir;

    // Strip compiled_at (timestamp) for comparison
    const strip = (ir: typeof ir1) => JSON.stringify({
      ...ir,
      meta: { ...ir.meta, compiled_at: "SNIPPED" },
    });

    expect(strip(ir1)).toBe(strip(ir2));
  });

  it("normalizer never rejects a valid AST", () => {
    const parseResult = parseManifest(VALID_MANIFEST, "test.yaml");
    const normalizeResult = normalizeManifest(parseResult.ast);

    // Normalizer should not produce error diagnostics
    const errors = normalizeResult.diagnostics.filter(d => d.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("creates correct authority nodes", () => {
    const parseResult = parseManifest(VALID_MANIFEST, "test.yaml");
    const ir = normalizeManifest(parseResult.ast).ir;

    const authNames = ir.authorities.map(a => a.name);
    expect(authNames).toContain("MissionAuthority");
  });

  it("creates correct edges (authority OWNS entities)", () => {
    const parseResult = parseManifest(VALID_MANIFEST, "test.yaml");
    const ir = normalizeManifest(parseResult.ast).ir;

    const ownsEdges = ir.edges.filter(e => e.kind === "owns");
    expect(ownsEdges.length).toBeGreaterThan(0);

    // MissionAuthority owns Estimate
    const ownsEstimate = ownsEdges.some(
      e => e.from === "auth:MissionAuthority" && e.to === "entity:Estimate"
    );
    expect(ownsEstimate).toBe(true);
  });

  it("creates capability nodes with versioned names", () => {
    const parseResult = parseManifest(VALID_MANIFEST, "test.yaml");
    const ir = normalizeManifest(parseResult.ast).ir;

    const calCap = ir.nodes.find(n => n.id === "capability:Calendar");
    expect(calCap).toBeDefined();
    expect(calCap!.properties.versioned_name).toBe("calendar.v1");
  });

  it("creates policy constraints", () => {
    const parseResult = parseManifest(VALID_MANIFEST, "test.yaml");
    const ir = normalizeManifest(parseResult.ast).ir;

    const policyConstraints = ir.constraints.filter(c => c.kind === "policy");
    expect(policyConstraints.length).toBe(2);
    expect(policyConstraints.map(c => c.id)).toContain("policy:TenantIsolation");
    expect(policyConstraints.map(c => c.id)).toContain("policy:Replay");
  });
});

// ---------------------------------------------------------------------------
// Full pipeline integration test
// ---------------------------------------------------------------------------

describe("Full Pipeline (YAML → AST → Validator → Normalizer → IR)", () => {
  it("end-to-end with the real manifest file", () => {
    const manifestPath = path.resolve(__dirname, "../../constitution/GENERATION_MANIFEST.yaml");
    const yamlContent = fs.readFileSync(manifestPath, "utf-8");

    // Step 1: Parse
    const parseResult = parseManifest(yamlContent, "GENERATION_MANIFEST.yaml");
    expect(parseResult.diagnostics.filter(d => d.severity === "error")).toHaveLength(0);
    expect(parseResult.ast.kind).toBe("manifest");

    // Step 2: Validate
    const validationResult = validateManifest(parseResult.ast);
    expect(validationResult.valid).toBe(true);

    // Step 3: Normalize
    const normalizeResult = normalizeManifest(parseResult.ast);
    const ir = normalizeResult.ir;

    // Verify IR structure
    expect(ir.meta.source_manifest).toBe("GENERATION_MANIFEST.yaml");
    expect(ir.meta.version).toBe("1.0.0");
    expect(ir.symbols.length).toBeGreaterThan(0);
    expect(ir.types.length).toBeGreaterThan(0);
    expect(ir.nodes.length).toBeGreaterThan(0);
    expect(ir.edges.length).toBeGreaterThan(0);
    expect(ir.authorities.length).toBeGreaterThan(0);
    expect(ir.constraints.length).toBeGreaterThan(0);

    // Verify specific authorities
    const authNames = ir.authorities.map(a => a.name);
    expect(authNames).toContain("IdentityAuthority");
    expect(authNames).toContain("MissionAuthority");
    expect(authNames).toContain("EvidenceAuthority");
    expect(authNames).toContain("ObservationAuthority");
    expect(authNames).toContain("FactAuthority");
  });

  it("end-to-end is deterministic across 10 runs", () => {
    const manifestPath = path.resolve(__dirname, "../../constitution/GENERATION_MANIFEST.yaml");
    const yamlContent = fs.readFileSync(manifestPath, "utf-8");

    const results: string[] = [];
    for (let i = 0; i < 10; i++) {
      const parse = parseManifest(yamlContent, "GENERATION_MANIFEST.yaml");
      const ir = normalizeManifest(parse.ast).ir;
      const stripped = JSON.stringify({
        ...ir,
        meta: { ...ir.meta, compiled_at: "SNIPPED" },
      });
      results.push(stripped);
    }

    // All 10 runs must produce byte-identical output
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toBe(results[0]);
    }
  });
});
