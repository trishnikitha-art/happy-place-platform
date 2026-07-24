/**
 * generate-all — Materialize all generator output to disk.
 *
 * Usage: npx ts-node --esm src/scripts/generate-all.ts
 *    or: npx tsx src/scripts/generate-all.ts
 *
 * Pipeline:
 *   GENERATION_MANIFEST.yaml
 *     → Parser → AST → Validator → Normalizer → IR
 *     → RepositoryGenerator
 *     → EventGenerator
 *     → ReplayGenerator
 *     → AuthorityGenerator
 *     → ProjectionGenerator
 *     → src/generated/
 */

import * as fs from "fs";
import * as path from "path";
import { parseManifest } from "../compiler/parser";
import { validateManifest } from "../compiler/validator";
import { normalizeManifest } from "../compiler/normalizer";
import { generateAll, validateAll } from "../generators";
import type { IRDocument } from "../constitution/ir/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MANIFEST_PATH = path.resolve(__dirname, "../constitution/GENERATION_MANIFEST.yaml");
const OUTPUT_DIR = path.resolve(__dirname, "../generated");

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log("=== generate-all ===\n");

  // Step 1: Read manifest
  console.log(`[1/6] Reading manifest: ${MANIFEST_PATH}`);
  const yaml = fs.readFileSync(MANIFEST_PATH, "utf-8");

  // Step 2: Parse
  console.log("[2/6] Parsing YAML → AST...");
  const parseResult = parseManifest(yaml, "GENERATION_MANIFEST.yaml");
  if (parseResult.diagnostics.length > 0) {
    console.error("Parse errors:");
    for (const d of parseResult.diagnostics) {
      console.error(`  [${d.code}] ${d.message}`);
    }
    process.exit(1);
  }
  console.log(`  AST: ${parseResult.ast.sections.length} sections`);

  // Step 3: Validate
  console.log("[3/6] Validating AST...");
  const validationResult = validateManifest(parseResult.ast);
  if (!validationResult.valid) {
    console.error("Validation errors:");
    for (const d of validationResult.diagnostics.filter((d) => d.severity === "error")) {
      console.error(`  [${d.code}] ${d.message}`);
    }
    process.exit(1);
  }
  console.log(`  Diagnostics: ${validationResult.diagnostics.length}`);

  // Step 4: Normalize
  console.log("[4/6] Normalizing AST → Canonical IR...");
  const normalizeResult = normalizeManifest(parseResult.ast);
  const ir: IRDocument = normalizeResult.ir;
  console.log(`  IR version: ${ir.ir_version}`);
  console.log(`  Symbols: ${ir.symbols.length}`);
  console.log(`  Nodes: ${ir.nodes.length}`);
  console.log(`  Edges: ${ir.edges.length}`);
  console.log(`  Authorities: ${ir.authorities.length}`);
  console.log(`  Transformations: ${ir.transformations.length}`);

  // Step 5: Generate
  console.log("[5/6] Running all generators...");
  const result = generateAll(ir);
  console.log(`  Total artifacts: ${result.artifacts.length}`);
  console.log(`  Content hash: ${result.totalHash}`);

  for (const [genName, artifacts] of Object.entries(result.byGenerator)) {
    console.log(`  ${genName}: ${artifacts.length} files`);
  }

  // Step 6: Validate generated output
  console.log("[6/6] Validating generated output...");
  const diagnostics = validateAll(ir, result.artifacts);
  const errors = diagnostics.filter((d) => d.severity === "error");
  if (errors.length > 0) {
    console.error("Generation errors:");
    for (const d of errors) {
      console.error(`  [${d.code}] ${d.message}`);
    }
    process.exit(1);
  }
  console.log(`  Diagnostics: ${diagnostics.length} (0 errors)`);

  // Materialize to disk
  console.log(`\nWriting to ${OUTPUT_DIR}...`);
  let written = 0;
  for (const artifact of result.artifacts) {
    const outPath = path.join(OUTPUT_DIR, artifact.path);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, artifact.content);
    written++;
  }
  console.log(`Wrote ${written} files`);

  // Coverage dashboard
  console.log("\n=== Coverage Dashboard ===\n");
  console.log("Runtime Area          Generated  Handwritten  Generator");
  console.log("─".repeat(75));
  for (const row of result.coverage.rows) {
    const area = row.runtimeArea.padEnd(20);
    const gen = `${row.generated}%`.padEnd(10);
    const hw = `${row.handwritten}%`.padEnd(12);
    console.log(`${area} ${gen} ${hw} ${row.generator}`);
  }
  console.log("─".repeat(75));
  console.log(`${"Overall".padEnd(20)} ${`${result.coverage.overallGenerated}%`.padEnd(10)} ${`${result.coverage.overallHandwritten}%`.padEnd(12)}`);
  console.log("");

  // List all materialized files
  console.log("=== Materialized Files ===\n");
  const dirs = new Map<string, number>();
  for (const artifact of result.artifacts) {
    const dir = artifact.path.split("/")[0];
    dirs.set(dir, (dirs.get(dir) ?? 0) + 1);
  }
  for (const [dir, count] of Array.from(dirs.entries()).sort()) {
    console.log(`  ${dir}/: ${count} files`);
  }

  console.log("\n✓ Generation complete");
}

main();
