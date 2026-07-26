/**
 * Generators — barrel export + coverage dashboard.
 *
 * Every generator consumes only IRDocument.
 * The compiler pipeline is:
 *   Manifest → Parser → AST → Validator → Normalizer → IR → Generators → Artifacts
 */

import * as crypto from "crypto";
import type { IRDocument } from "../constitution/ir/types";
import type { Generator, GeneratedArtifact, CoverageRow, CoverageDashboard } from "./types";
import { RepositoryGenerator } from "./repository";
import { EventGenerator } from "./events";
import { ReplayGenerator } from "./replay";
import { AuthorityGenerator } from "./authority";
import { ProjectionGenerator } from "./projection";
import { WorkflowGenerator } from "./workflow";
import { CapabilityRegistryGenerator } from "./capability-registry";
import { ProviderRegistryGenerator } from "./provider-registry";
import { StateMachineGenerator } from "./state-machine";

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export type { Generator, GeneratedArtifact, CoverageRow, CoverageDashboard } from "./types";
export { RepositoryGenerator } from "./repository";
export { EventGenerator } from "./events";
export { ReplayGenerator } from "./replay";
export { AuthorityGenerator } from "./authority";
export { ProjectionGenerator } from "./projection";
export { WorkflowGenerator } from "./workflow";
export { CapabilityRegistryGenerator } from "./capability-registry";
export { ProviderRegistryGenerator } from "./provider-registry";
export { StateMachineGenerator } from "./state-machine";

// ---------------------------------------------------------------------------
// All generators (ordered by pipeline position)
// ---------------------------------------------------------------------------

export const ALL_GENERATORS: Generator[] = [
  new RepositoryGenerator(),
  new EventGenerator(),
  new ReplayGenerator(),
  new AuthorityGenerator(),
  new ProjectionGenerator(),
  new WorkflowGenerator(),
  new CapabilityRegistryGenerator(),
  new ProviderRegistryGenerator(),
  new StateMachineGenerator(),
];

// ---------------------------------------------------------------------------
// Pipeline runner
// ---------------------------------------------------------------------------

export interface GenerationResult {
  readonly artifacts: readonly GeneratedArtifact[];
  readonly coverage: CoverageDashboard;
  readonly totalHash: string;
  readonly byGenerator: Readonly<Record<string, readonly GeneratedArtifact[]>>;
}

/**
 * Run the full generation pipeline against an IRDocument.
 * Returns all generated artifacts, coverage dashboard, and total content hash.
 */
export function generateAll(ir: IRDocument): GenerationResult {
  const allArtifacts: GeneratedArtifact[] = [];
  const byGenerator: Record<string, GeneratedArtifact[]> = {};

  for (const gen of ALL_GENERATORS) {
    if (!gen.supports(ir)) continue;

    const artifacts = gen.generate(ir);
    byGenerator[gen.name] = artifacts;
    allArtifacts.push(...artifacts);
  }

  // Compute total hash
  const totalHash = crypto
    .createHash("sha256")
    .update(allArtifacts.map((a) => a.hash).sort().join(""))
    .digest("hex");

  const coverage = computeCoverage(ir, allArtifacts);

  return {
    artifacts: allArtifacts,
    coverage,
    totalHash,
    byGenerator,
  };
}

// ---------------------------------------------------------------------------
// Coverage dashboard
// ---------------------------------------------------------------------------

function computeCoverage(ir: IRDocument, artifacts: GeneratedArtifact[]): CoverageDashboard {
  const aggregateCount = ir.nodes.filter((n) => n.kind === "aggregate").length;
  const eventCount = ir.nodes.filter((n) => n.kind === "event").length;
  const authorityCount = ir.authorities.length;

  const repoArtifacts = artifacts.filter((a) => a.generator === "RepositoryGenerator").length;
  const eventArtifacts = artifacts.filter((a) => a.generator === "EventGenerator").length;
  const replayArtifacts = artifacts.filter((a) => a.generator === "ReplayGenerator").length;
  const authArtifacts = artifacts.filter((a) => a.generator === "AuthorityGenerator").length;
  const projArtifacts = artifacts.filter((a) => a.generator === "ProjectionGenerator").length;

  const rows: CoverageRow[] = [
    {
      runtimeArea: "Repositories",
      generated: aggregateCount > 0 ? 100 : 0,
      handwritten: 0,
      generator: "RepositoryGenerator",
    },
    {
      runtimeArea: "Events",
      generated: eventCount > 0 ? 100 : 0,
      handwritten: 0,
      generator: "EventGenerator",
    },
    {
      runtimeArea: "Replay Maps",
      generated: authorityCount > 0 ? 100 : 0,
      handwritten: 0,
      generator: "ReplayGenerator",
    },
    {
      runtimeArea: "Authority Registry",
      generated: authorityCount > 0 ? 100 : 0,
      handwritten: 0,
      generator: "AuthorityGenerator",
    },
    {
      runtimeArea: "Projection Skeletons",
      generated: aggregateCount > 0 ? 100 : 0,
      handwritten: 0,
      generator: "ProjectionGenerator",
    },
  ];

  const totalGenerated = rows.reduce((sum, r) => sum + r.generated, 0);
  const totalHandwritten = rows.reduce((sum, r) => sum + r.handwritten, 0);

  return {
    rows,
    overallGenerated: rows.length > 0 ? Math.round(totalGenerated / rows.length) : 0,
    overallHandwritten: rows.length > 0 ? Math.round(totalHandwritten / rows.length) : 0,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate all generated artifacts across all generators.
 */
export function validateAll(ir: IRDocument, artifacts: readonly GeneratedArtifact[]): import("../compiler/diagnostics").CompilerDiagnostic[] {
  const diagnostics: import("../compiler/diagnostics").CompilerDiagnostic[] = [];

  for (const gen of ALL_GENERATORS) {
    if (!gen.supports(ir)) continue;

    const genArtifacts = artifacts.filter((a) => a.generator === gen.name);
    diagnostics.push(...gen.validate(genArtifacts));
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Artifact Dependency Graph (DAG)
// ---------------------------------------------------------------------------

export interface ArtifactNode {
  readonly id: string;
  readonly path: string;
  readonly generator: string;
  readonly hash: string;
  readonly dependencies: string[];
}

export interface ArtifactDependencyGraph {
  readonly version: string;
  readonly constitutionVersion: string;
  readonly compilerVersion: string;
  readonly nodes: readonly ArtifactNode[];
  readonly edges: readonly { from: string; to: string }[];
}

/**
 * Generate an artifact dependency graph (DAG) from all generated artifacts.
 * This graph represents the relationships between artifacts and can be used by
 * the Oracle for querying and validation.
 */
export function generateDependencyGraph(ir: IRDocument, result: GenerationResult): ArtifactDependencyGraph {
  const nodes: ArtifactNode[] = [];
  const edges: { from: string; to: string }[] = [];
  const nodeMap = new Map<string, ArtifactNode>();

  // Collect all metadata artifacts
  const metadataArtifacts = result.artifacts.filter((a) => a.path.endsWith(".metadata.json"));

  for (const metadata of metadataArtifacts) {
    try {
      const meta = JSON.parse(metadata.content) as {
        artifactId: string;
        dependencies: string[];
        generatedArtifacts: Array<{ path: string; hash: string }>;
      };

      // Add generator node
      const generatorNode: ArtifactNode = {
        id: meta.artifactId,
        path: metadata.path,
        generator: meta.artifactId,
        hash: metadata.hash,
        dependencies: meta.dependencies,
      };
      nodes.push(generatorNode);
      nodeMap.set(meta.artifactId, generatorNode);

      // Add edges from generator to its dependencies
      for (const dep of meta.dependencies) {
        edges.push({ from: meta.artifactId, to: dep });
      }

      // Add generated artifact nodes
      for (const genArtifact of meta.generatedArtifacts) {
        const artifactNode: ArtifactNode = {
          id: genArtifact.path,
          path: genArtifact.path,
          generator: meta.artifactId,
          hash: genArtifact.hash,
          dependencies: [],
        };
        nodes.push(artifactNode);
        nodeMap.set(genArtifact.path, artifactNode);

        // Add edge from generator to artifact
        edges.push({ from: meta.artifactId, to: genArtifact.path });
      }
    } catch (e) {
      // Skip invalid metadata
      console.warn(`Failed to parse metadata: ${metadata.path}`);
    }
  }

  return {
    version: "1.0.0",
    constitutionVersion: ir.ir_version,
    compilerVersion: "1.0.0",
    nodes,
    edges,
  };
}
