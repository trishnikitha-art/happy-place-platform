/**
 * Shared IR fixture for generator tests.
 * Produces a minimal but complete IRDocument from the real manifest.
 */

import * as fs from "fs";
import * as path from "path";
import { parseManifest } from "@/compiler/parser";
import { validateManifest } from "@/compiler/validator";
import { normalizeManifest } from "@/compiler/normalizer";
import type { IRDocument } from "@/constitution/ir/types";

const MANIFEST_PATH = path.resolve(__dirname, "../../constitution/GENERATION_MANIFEST.yaml");

let _cachedIR: IRDocument | null = null;

export function getTestIR(): IRDocument {
  if (_cachedIR) return _cachedIR;

  const yaml = fs.readFileSync(MANIFEST_PATH, "utf-8");
  const parse = parseManifest(yaml, "GENERATION_MANIFEST.yaml");
  const validation = validateManifest(parse.ast);
  if (!validation.valid) {
    throw new Error(`Fixture validation failed: ${JSON.stringify(validation.diagnostics)}`);
  }
  _cachedIR = normalizeManifest(parse.ast).ir;
  return _cachedIR;
}

export function getMinimalIR(): IRDocument {
  return {
    ir_version: "1.0.0",
    meta: {
      version: "1.0.0",
      source_manifest: "minimal.yaml",
      compiled_at: "2026-07-24T00:00:00.000Z",
      compiler_version: "0.1.0",
    },
    symbols: [
      { name: "TestAuth", kind: "authority", type: "Authority", metadata: { owns: ["Widget"], emits: ["WidgetCreated"], computes: [], policies: [] }, source_location: { file: "minimal.yaml", line: 1, column: 0, length: 0 } },
      { name: "Widget", kind: "aggregate", type: "Aggregate", metadata: { owns: [], events: ["WidgetCreated"], commands: ["Create"], policies: [] }, source_location: { file: "minimal.yaml", line: 2, column: 0, length: 0 } },
      { name: "WidgetCreated", kind: "event", type: "Event", metadata: { aggregate: "Widget" }, source_location: { file: "minimal.yaml", line: 3, column: 0, length: 0 } },
    ],
    types: [],
    nodes: [
      { id: "auth:TestAuth", kind: "authority", symbol: "TestAuth", properties: {}, source_location: { file: "minimal.yaml", line: 1, column: 0, length: 0 } },
      { id: "aggregate:Widget", kind: "aggregate", symbol: "Widget", properties: { owns: [], events: ["WidgetCreated"], commands: ["Create"] }, source_location: { file: "minimal.yaml", line: 2, column: 0, length: 0 } },
      { id: "event:WidgetCreated", kind: "event", symbol: "WidgetCreated", properties: { aggregate: "Widget" }, source_location: { file: "minimal.yaml", line: 3, column: 0, length: 0 } },
    ],
    edges: [
      { from: "auth:TestAuth", to: "aggregate:Widget", kind: "owns", properties: {} },
      { from: "aggregate:Widget", to: "event:WidgetCreated", kind: "emits", properties: {} },
    ],
    constraints: [],
    authorities: [
      { id: "auth:TestAuth", name: "TestAuth", owns: ["aggregate:Widget"], emits_for: ["event:WidgetCreated"], constraints: [], deterministic: true, source_location: { file: "minimal.yaml", line: 1, column: 0, length: 0 } },
    ],
    transformations: [],
    projections: [],
    artifacts: [],
    diagnostics: [],
  };
}
