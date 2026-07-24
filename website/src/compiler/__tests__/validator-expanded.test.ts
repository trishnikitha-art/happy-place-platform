/**
 * Expanded Validator Tests — P2 semantic invariants
 */

import { parseManifest } from "../parser";
import { validateManifest } from "../validator";

function validate(yaml: string) {
  const parse = parseManifest(yaml, "test.yaml");
  return validateManifest(parse.ast);
}

function diagCodes(result: ReturnType<typeof validateManifest>) {
  return result.diagnostics.filter(d => d.severity === "error").map(d => d.code);
}

describe("Expanded Validator", () => {
  // ---- P2: Single authority ownership ----

  it("rejects duplicate ownership (E200)", () => {
    const result = validate(`
manifest:
  name: test
  version: 1

authorities:
  - name: AuthA
    owns: [SharedEntity]
  - name: AuthB
    owns: [SharedEntity]
`);
    expect(result.valid).toBe(false);
    expect(diagCodes(result)).toContain("E200");
  });

  it("allows same entity referenced in different capacities (emits vs owns)", () => {
    const result = validate(`
manifest:
  name: test
  version: 1

authorities:
  - name: AuthA
    owns: [Entity1]
    emits: [Entity2]
  - name: AuthB
    owns: [Entity2]
`);
    expect(result.valid).toBe(true);
  });

  // ---- P2: No duplicate symbols ----

  it("rejects cross-section duplicate symbol names (E103)", () => {
    const result = validate(`
manifest:
  name: test
  version: 1

authorities:
  - name: MyEntity
    owns: [Thing]

identities:
  - MyEntity
`);
    expect(result.valid).toBe(false);
    expect(diagCodes(result)).toContain("E103");
  });

  it("allows same name in same section (e.g., duplicate capability names caught by name dedup)", () => {
    const result = validate(`
manifest:
  name: test
  version: 1

authorities:
  - name: TestAuth
    owns: [Thing]

identities:
  - Customer
`);
    expect(result.valid).toBe(true);
  });

  // ---- P2: Capability versioning ----

  it("warns on non-PascalCase capability names (W001)", () => {
    const result = validate(`
manifest:
  name: test
  version: 1

authorities:
  - name: TestAuth
    owns: [Thing]

capabilities:
  - name: my_lowercase
    contract: [Do]
`);
    expect(result.diagnostics.some(d => d.code === "W001")).toBe(true);
  });

  it("accepts PascalCase capability names", () => {
    const result = validate(`
manifest:
  name: test
  version: 1

authorities:
  - name: TestAuth
    owns: [Thing]

capabilities:
  - name: Calendar
    contract: [Schedule]
`);
    expect(result.diagnostics.filter(d => d.code === "W001")).toHaveLength(0);
  });

  // ---- P2: Unreachable identity nodes ----

  it("warns on identity not owned by any authority (W001)", () => {
    const result = validate(`
manifest:
  name: test
  version: 1

authorities:
  - name: TestAuth
    owns: [Thing]

identities:
  - OrphanIdentity
`);
    expect(result.diagnostics.some(d =>
      d.code === "W001" && d.message.includes("OrphanIdentity")
    )).toBe(true);
  });

  it("no warning when all identities are owned", () => {
    const result = validate(`
manifest:
  name: test
  version: 1

authorities:
  - name: TestAuth
    owns: [Customer]

identities:
  - Customer
`);
    expect(result.diagnostics.filter(d =>
      d.code === "W001" && d.message.includes("not owned")
    )).toHaveLength(0);
  });

  // ---- P2: Duplicate events in mission ----

  it("rejects duplicate events in a mission (E302)", () => {
    const result = validate(`
manifest:
  name: test
  version: 1

authorities:
  - name: TestAuth
    owns: [Thing]

missions:
  - name: MyMission
    owns: [Stuff]
    events: [Foo, Foo]
    commands: [Do]
`);
    expect(result.valid).toBe(false);
    expect(diagCodes(result)).toContain("E302");
  });

  // ---- Existing invariants still hold ----

  it("valid manifest passes all expanded checks", () => {
    const result = validate(`
manifest:
  name: test
  version: 1

authorities:
  - name: TestAuth
    owns: [Customer]

identities:
  - Customer

missions:
  - name: MyMission
    owns: [Stuff]
    events: [Created]
    commands: [Create]

capabilities:
  - name: Calendar
    contract: [Schedule]

policies:
  - Replay
`);
    expect(result.valid).toBe(true);
    expect(result.diagnostics.filter(d => d.severity === "error")).toHaveLength(0);
  });
});
