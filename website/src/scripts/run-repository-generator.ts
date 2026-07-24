/**
 * Run Repository Generator against IR snapshot.
 *
 * This script loads the Canonical IR snapshot and runs the RepositoryGenerator
 * to produce generated repository scaffolding.
 */

import * as fs from "fs";
import * as path from "path";
import { RepositoryGenerator } from "../generators/repository";
import irSnapshot from "../constitution/ir/snapshot-v1.json";
import type { IRDocument } from "../constitution/ir/types";

async function main() {
  console.log("Running Repository Generator against IR snapshot...");
  
  const generator = new RepositoryGenerator();
  const ir = irSnapshot as IRDocument;
  
  console.log(`IR version: ${ir.ir_version}`);
  console.log(`Nodes: ${ir.nodes.length}`);
  console.log(`Edges: ${ir.edges.length}`);
  console.log(`Symbols: ${ir.symbols.length}`);
  console.log(`Authorities: ${ir.authorities.length}`);
  
  const aggregates = ir.nodes.filter((n) => n.kind === "aggregate");
  console.log(`Aggregates found: ${aggregates.length}`);
  aggregates.forEach((agg) => console.log(`  - ${agg.symbol || agg.id}`));
  
  if (!generator.supports(ir)) {
    console.error("Generator does not support this IR");
    process.exit(1);
  }
  
  const artifacts = generator.generate(ir);
  console.log(`\nGenerated ${artifacts.length} artifacts:`);
  artifacts.forEach((artifact) => {
    console.log(`  - ${artifact.path} (${artifact.content.length} bytes)`);
  });

  // Write generated artifacts to disk (generated/repositories/)
  const srcDir = path.resolve(__dirname, "..");
  let written = 0;
  for (const artifact of artifacts) {
    const outPath = path.join(srcDir, artifact.path);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, artifact.content);
    written++;
    console.log(`  wrote ${outPath}`);
  }
  console.log(`\nWrote ${written} artifacts to ${srcDir}`);
  
  const diagnostics = generator.validate(artifacts);
  console.log(`\nValidation: ${diagnostics.length} diagnostics`);
  diagnostics.forEach((diag) => {
    console.log(`  [${diag.code}] ${diag.message}`);
  });
  
  const snapshot = generator.snapshot(ir);
  console.log(`\nGenerator snapshot: ${snapshot}`);
  
  if (diagnostics.length === 0) {
    console.log("\n✓ Generator execution successful");
  } else {
    console.log("\n✗ Generator validation failed");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Generator execution failed:", error);
  process.exit(1);
});
