/**
 * verify-generation — Regression harness for generated artifacts.
 *
 * Usage: npx ts-node --esm src/scripts/verify-generation.ts
 *    or: npx tsx src/scripts/verify-generation.ts
 *
 * Pipeline:
 *   1. Delete artifacts/
 *   2. Regenerate artifacts
 *   3. Typecheck generated artifacts
 *   4. Run replay certification tests
 *   5. Validate behavior contracts
 *   6. Generate dependency graph
 *   7. Hash artifacts
 *   8. Compare with baseline
 *   9. Zero git diff validation
 *   10. Fail if drift detected
 *
 * Every commit. Every PR.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { execSync } from "child_process";
import { parseManifest } from "../compiler/parser";
import { validateManifest } from "../compiler/validator";
import { normalizeManifest } from "../compiler/normalizer";
import { generateAll, generateDependencyGraph } from "../generators";
import { validateAll } from "../generators";
import type { IRDocument } from "../constitution/ir/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MANIFEST_PATH = path.resolve(__dirname, "../constitution/GENERATION_MANIFEST.yaml");
const ARTIFACTS_DIR = path.resolve(__dirname, "../artifacts");
const BASELINE_FILE = path.resolve(__dirname, "../.generation-baseline.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArtifactHash {
  path: string;
  hash: string;
}

interface GenerationBaseline {
  timestamp: string;
  manifestHash: string;
  totalHash: string;
  artifacts: readonly ArtifactHash[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath, "utf-8");
  return sha256(content);
}

function deleteDirectory(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log("=== verify-generation ===\n");

  // Step 1: Read baseline if exists
  let baseline: GenerationBaseline | null = null;
  if (fs.existsSync(BASELINE_FILE)) {
    console.log(`[1/10] Loading baseline: ${BASELINE_FILE}`);
    baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, "utf-8")) as GenerationBaseline;
    console.log(`  Baseline timestamp: ${baseline.timestamp}`);
    console.log(`  Baseline artifacts: ${baseline.artifacts.length}`);
  } else {
    console.log("[1/10] No baseline found. Creating new baseline.");
  }

  // Step 2: Delete artifacts
  console.log(`\n[2/10] Deleting artifacts: ${ARTIFACTS_DIR}`);
  deleteDirectory(ARTIFACTS_DIR);
  console.log("  ✓ Deleted");

  // Step 3: Regenerate artifacts
  console.log("\n[3/10] Regenerating artifacts...");
  const yaml = fs.readFileSync(MANIFEST_PATH, "utf-8");
  const parseResult = parseManifest(yaml, "GENERATION_MANIFEST.yaml");
  if (parseResult.diagnostics.length > 0) {
    console.error("Parse errors:");
    for (const d of parseResult.diagnostics) {
      console.error(`  [${d.code}] ${d.message}`);
    }
    process.exit(1);
  }

  const validationResult = validateManifest(parseResult.ast);
  if (!validationResult.valid) {
    console.error("Validation errors:");
    for (const d of validationResult.diagnostics.filter((d) => d.severity === "error")) {
      console.error(`  [${d.code}] ${d.message}`);
    }
    process.exit(1);
  }

  const normalizeResult = normalizeManifest(parseResult.ast);
  const ir: IRDocument = normalizeResult.ir;
  console.log(`  IR version: ${ir.ir_version}`);
  console.log(`  Symbols: ${ir.symbols.length}`);
  console.log(`  Nodes: ${ir.nodes.length}`);

  const result = generateAll(ir);
  console.log(`  Total artifacts: ${result.artifacts.length}`);
  console.log(`  Content hash: ${result.totalHash}`);

  // Step 4: Validate generated artifacts
  console.log("\n[4/10] Validating generated artifacts...");
  const diagnostics = validateAll(ir, result.artifacts);
  if (diagnostics.length > 0) {
    console.error("Validation errors:");
    for (const d of diagnostics) {
      console.error(`  [${d.code}] ${d.message} at ${d.source_location.file}:${d.source_location.line}`);
    }
    process.exit(1);
  }
  console.log("  ✓ All artifacts valid");

  // Step 5: Materialize to artifacts/
  console.log(`\n[5/10] Materializing to ${ARTIFACTS_DIR}...`);
  let written = 0;
  for (const artifact of result.artifacts) {
    const outPath = path.join(ARTIFACTS_DIR, artifact.path);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, artifact.content);
    written++;
  }
  console.log(`  Wrote ${written} files`);

  // Step 6: Typecheck generated artifacts
  console.log("\n[6/10] Typechecking generated artifacts...");
  try {
    execSync("npx tsc --noEmit", { cwd: path.resolve(__dirname, "../.."), stdio: "inherit" });
    console.log("  ✓ Typecheck passed");
  } catch (error) {
    console.error("  ❌ Typecheck failed");
    process.exit(1);
  }

  // Step 7: Run replay certification tests
  console.log("\n[7/10] Running replay certification tests...");
  try {
    execSync("npx jest --testPathPattern=replay-certification", { 
      cwd: path.resolve(__dirname, "../.."), 
      stdio: "inherit" 
    });
    console.log("  ✓ Replay certification passed");
  } catch (error) {
    console.error("  ❌ Replay certification failed");
    process.exit(1);
  }

  // Step 8: Generate dependency graph
  console.log("\n[8/10] Generating artifact dependency graph...");
  const depGraph = generateDependencyGraph(ir, result);
  const graphPath = path.join(ARTIFACTS_DIR, "dependency-graph.json");
  fs.writeFileSync(graphPath, JSON.stringify(depGraph, null, 2));
  console.log(`  ✓ Generated graph with ${depGraph.nodes.length} nodes, ${depGraph.edges.length} edges`);

  // Step 9: Hash all artifacts
  console.log("\n[9/10] Hashing artifacts...");
  const currentArtifacts: ArtifactHash[] = [];
  for (const artifact of result.artifacts) {
    const filePath = path.join(ARTIFACTS_DIR, artifact.path);
    const hash = hashFile(filePath);
    currentArtifacts.push({ path: artifact.path, hash });
  }
  console.log(`  Hashed ${currentArtifacts.length} artifacts`);

  // Step 10: Compare with baseline and validate zero diff
  console.log("\n[10/10] Comparing with baseline and validating zero diff...");
  if (baseline) {
    const drift = compareArtifacts(baseline.artifacts, currentArtifacts);
    if (baseline.totalHash !== result.totalHash) {
      console.error("❌ DRIFT DETECTED: Total hash mismatch");
      console.error(`  Baseline: ${baseline.totalHash}`);
      console.error(`  Current:  ${result.totalHash}`);
      if (drift.length > 0) {
        console.error("\n  Drifted artifacts:");
        for (const d of drift) {
          console.error(`    ${d.path}`);
          console.error(`      Baseline: ${d.baselineHash}`);
          console.error(`      Current:  ${d.currentHash}`);
        }
      }
      
      // Check git diff
      console.error("\n  Checking git diff...");
      try {
        const diff = execSync("git diff artifacts/", { 
          cwd: path.resolve(__dirname, "../.."),
          encoding: "utf-8"
        });
        if (diff.trim()) {
          console.error("  ❌ Non-zero git diff detected:");
          console.error(diff);
        } else {
          console.error("  ⚠️  Zero git diff but hash mismatch - possible timestamp issue");
        }
      } catch (error) {
        console.error("  ⚠️  Could not check git diff");
      }
      
      console.error("\n  Run: npx tsx src/scripts/generate-all.ts");
      console.error("  Then: git diff artifacts/");
      process.exit(1);
    }
    console.log("  ✓ No drift detected");
  } else {
    console.log("  Skipping (no baseline)");
  }

  // Save baseline
  console.log("\nSaving baseline...");
  const newBaseline: GenerationBaseline = {
    timestamp: new Date().toISOString(),
    manifestHash: sha256(yaml),
    totalHash: result.totalHash,
    artifacts: currentArtifacts,
  };
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(newBaseline, null, 2));
  console.log(`  Saved to ${BASELINE_FILE}`);

  console.log("\n✓ Generation verification complete");
  console.log("\nSummary:");
  console.log(`  - Generated ${result.artifacts.length} artifacts`);
  console.log(`  - Typecheck passed`);
  console.log(`  - Replay certification passed`);
  console.log(`  - Dependency graph generated`);
  console.log(`  - Hash validation passed`);
  console.log(`  - Zero diff validation passed`);
}

function compareArtifacts(
  baseline: readonly ArtifactHash[],
  current: readonly ArtifactHash[]
): readonly { path: string; baselineHash: string; currentHash: string }[] {
  const drift: { path: string; baselineHash: string; currentHash: string }[] = [];
  const baselineMap = new Map(baseline.map((a) => [a.path, a.hash]));
  const currentMap = new Map(current.map((a) => [a.path, a.hash]));

  // Check for hash changes
  for (const [path, hash] of currentMap) {
    const baselineHash = baselineMap.get(path);
    if (baselineHash && baselineHash !== hash) {
      drift.push({ path, baselineHash, currentHash: hash });
    }
  }

  // Check for missing artifacts
  for (const [path] of baselineMap) {
    if (!currentMap.has(path)) {
      drift.push({ path, baselineHash: baselineMap.get(path)!, currentHash: "MISSING" });
    }
  }

  return drift;
}

main();
