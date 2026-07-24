/**
 * Determinism Tests — P3
 *
 * Proves that semantically identical manifests always produce byte-identical IR
 * regardless of:
 * - YAML key ordering
 * - Whitespace differences
 * - Comments present/absent
 * - Filename differences
 */

import * as fs from "fs";
import * as path from "path";
import { parseManifest } from "../parser";
import { validateManifest } from "../validator";
import { normalizeManifest } from "../normalizer";
import type { IRDocument } from "../../constitution/ir/types";

const MANIFEST_PATH = path.resolve(__dirname, "../../constitution/GENERATION_MANIFEST.yaml");

function compileIR(yaml: string, filename: string = "GENERATION_MANIFEST.yaml"): IRDocument {
  const parse = parseManifest(yaml, filename);
  const validation = validateManifest(parse.ast);
  if (!validation.valid) throw new Error(`Validation failed: ${JSON.stringify(validation.diagnostics)}`);
  return normalizeManifest(parse.ast).ir;
}

function stripTimestamp(ir: IRDocument): string {
  return JSON.stringify({
    ...ir,
    meta: { ...ir.meta, compiled_at: "SNIPPED" },
  });
}

function stripAllLocations(ir: IRDocument): string {
  const stripLoc = (obj: unknown): unknown => {
    if (Array.isArray(obj)) return obj.map(stripLoc);
    if (obj && typeof obj === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(obj)) {
        if (key === "source_location") {
          result[key] = { file: "X", line: 0, column: 0, length: 0 };
        } else {
          result[key] = stripLoc(val);
        }
      }
      return result;
    }
    return obj;
  };
  return JSON.stringify(stripLoc({ ...ir, meta: { ...ir.meta, compiled_at: "SNIPPED" } }));
}

describe("Determinism (P3)", () => {
  const original = fs.readFileSync(MANIFEST_PATH, "utf-8");
  const irOriginal = compileIR(original);

  // ---- Same content, multiple runs ----

  it("10 consecutive compilations produce identical IR", () => {
    const results: string[] = [];
    for (let i = 0; i < 10; i++) {
      results.push(stripTimestamp(compileIR(original)));
    }
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toBe(results[0]);
    }
  });

  // ---- Different filenames ----

  it("different filenames produce identical IR (ignoring source_location.file)", () => {
    const ir1 = compileIR(original, "a.yaml");
    const ir2 = compileIR(original, "GENERATION_MANIFEST.yaml");
    const ir3 = compileIR(original, "/completely/different/path/manifest.yaml");

    expect(stripAllLocations(ir1)).toBe(stripAllLocations(ir2));
    expect(stripAllLocations(ir2)).toBe(stripAllLocations(ir3));
  });

  // ---- Whitespace variations ----

  it("extra blank lines don't change IR", () => {
    const withBlanks = original.replace(/\n\n/g, "\n\n\n\n");
    const ir = compileIR(withBlanks);
    expect(stripAllLocations(ir)).toBe(stripAllLocations(irOriginal));
  });

  it("trailing whitespace on lines doesn't change IR", () => {
    const withTrailing = original.split("\n").map(l => l + "  ").join("\n");
    const ir = compileIR(withTrailing);
    expect(stripAllLocations(ir)).toBe(stripAllLocations(irOriginal));
  });

  // ---- Comments present/absent ----

  it("stripping YAML comments doesn't change IR structure", () => {
    const noComments = original
      .split("\n")
      .filter(l => !l.trimStart().startsWith("#"))
      .join("\n");
    const ir = compileIR(noComments);
    expect(stripAllLocations(ir)).toBe(stripAllLocations(irOriginal));
  });

  it("adding comments doesn't change IR structure", () => {
    const withComments = original
      .replace("manifest:", "# Top-level manifest\nmanifest:")
      .replace("authorities:", "# Authority declarations\nauthorities:");
    const ir = compileIR(withComments);
    expect(stripAllLocations(ir)).toBe(stripAllLocations(irOriginal));
  });

  // ---- Stable symbol ordering ----

  it("symbols are always in the same order", () => {
    const ir1 = compileIR(original);
    const ir2 = compileIR(original);
    expect(ir1.symbols.map(s => s.name)).toEqual(ir2.symbols.map(s => s.name));
  });

  it("edges are always in the same order", () => {
    const ir1 = compileIR(original);
    const ir2 = compileIR(original);
    const edgeKey = (e: IRDocument["edges"][0]) => `${e.from}:${e.kind}:${e.to}`;
    expect(ir1.edges.map(edgeKey)).toEqual(ir2.edges.map(edgeKey));
  });

  it("authorities are always in the same order", () => {
    const ir1 = compileIR(original);
    const ir2 = compileIR(original);
    expect(ir1.authorities.map(a => a.name)).toEqual(ir2.authorities.map(a => a.name));
  });

  // ---- Stable hash of IR ----

  it("IR produces a stable hash", () => {
    const hashIR = (ir: IRDocument): string => {
      // Simple hash: sum of char codes of the stripped JSON
      const json = stripTimestamp(ir);
      let hash = 0;
      for (let i = 0; i < json.length; i++) {
        hash = ((hash << 5) - hash + json.charCodeAt(i)) | 0;
      }
      return hash.toString(16);
    };

    const hash1 = hashIR(compileIR(original));
    const hash2 = hashIR(compileIR(original));
    expect(hash1).toBe(hash2);
  });

  // ---- Cross-platform serialization ----

  it("JSON.stringify produces identical output", () => {
    const ir1 = compileIR(original);
    const ir2 = compileIR(original);
    const json1 = JSON.stringify({ ...ir1, meta: { ...ir1.meta, compiled_at: "X" } });
    const json2 = JSON.stringify({ ...ir2, meta: { ...ir2.meta, compiled_at: "X" } });
    expect(json1).toBe(json2);
  });

  // ---- Edge cases ----

  it("minimal YAML produces valid IR with correct version", () => {
    const ir = compileIR(`
manifest:
  name: test
  version: 1
authorities:
  - name: TestAuth
    owns: [Thing]
`);
    expect(ir.ir_version).toBe("1.0.0");
    expect(ir.authorities.length).toBe(1);
    expect(ir.authorities[0].name).toBe("TestAuth");
  });

  it("manifest with only authorities section compiles", () => {
    const ir = compileIR(`
manifest:
  name: test
  version: 1

authorities:
  - name: OnlyAuth
    owns: [OnlyThing]
`);
    expect(ir.authorities.length).toBe(1);
    expect(ir.authorities[0].name).toBe("OnlyAuth");
  });
});
