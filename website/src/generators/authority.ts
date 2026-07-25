/**
 * Authority Generator — IR → Authority registry, resolver, and policies.
 *
 * Generates:
 *   - AuthorityRegistry.ts (maps authority name → owned aggregates + constraints)
 *   - AuthorityResolver.ts (answers: who owns? who may mutate? who may observe?)
 *   - AuthorityPolicies.ts (before/after hooks for mutations)
 *
 * No handwritten authority registration. All derived from IR.
 *
 * No generator reads YAML. Only IR.
 */

import * as crypto from "crypto";
import type { IRDocument, Authority, Constraint, Edge } from "../constitution/ir/types";
import type { Generator, GeneratedArtifact } from "./types";
import type { CompilerDiagnostic } from "../compiler/diagnostics";
import { createDiagnostic } from "../compiler/diagnostics";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function pascalCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Get the human-readable name from a node id (e.g. "auth:MissionAuthority" → "MissionAuthority") */
function nodeToName(id: string): string {
  return id.replace(/^auth:/, "").replace(/^entity:/, "").replace(/^event:/, "").replace(/^policy:/, "");
}

/** Get constraints that apply to a given authority */
function getConstraintsForAuthority(auth: Authority, allConstraints: readonly Constraint[]): Constraint[] {
  return allConstraints.filter((c) => auth.constraints.includes(c.id));
}

/** Get events emitted by an authority's owned entities */
function getEventsForAuthority(auth: Authority, edges: readonly Edge[]): string[] {
  return edges
    .filter((e) => e.kind === "emits" && auth.owns.includes(e.from))
    .map((e) => nodeToName(e.to));
}

// ---------------------------------------------------------------------------
// Authority Generator
// ---------------------------------------------------------------------------

export class AuthorityGenerator implements Generator {
  readonly name = "AuthorityGenerator";

  supports(ir: IRDocument): boolean {
    return ir.authorities.length > 0;
  }

  generate(ir: IRDocument): GeneratedArtifact[] {
    const artifacts: GeneratedArtifact[] = [];

    // Generate AuthorityRegistry
    const registryContent = generateAuthorityRegistry(ir.authorities, ir.constraints);
    artifacts.push({
      path: "authorities/AuthorityRegistry.ts",
      content: registryContent,
      hash: sha256(registryContent),
      generator: this.name,
      description: "Maps authority name → owned aggregates, events, and constraints",
    });

    // Generate AuthorityResolver
    const resolverContent = generateAuthorityResolver(ir.authorities, ir.edges);
    artifacts.push({
      path: "authorities/AuthorityResolver.ts",
      content: resolverContent,
      hash: sha256(resolverContent),
      generator: this.name,
      description: "Answers: who owns? who may mutate? who may observe?",
    });

    // Generate AuthorityPolicies
    const policiesContent = generateAuthorityPolicies(ir.authorities, ir.constraints, ir.edges);
    artifacts.push({
      path: "authorities/AuthorityPolicies.ts",
      content: policiesContent,
      hash: sha256(policiesContent),
      generator: this.name,
      description: "Before/after hooks for authority-guarded mutations",
    });

    // Generate artifact metadata manifest
    const metadata = generateArtifactMetadata(this.name, ir, artifacts);
    artifacts.push({
      path: "authorities/AuthorityGenerator.metadata.json",
      content: metadata,
      hash: sha256(metadata),
      generator: this.name,
      description: "Artifact metadata for AuthorityGenerator",
    });

    return artifacts;
  }

  validate(artifacts: GeneratedArtifact[]): CompilerDiagnostic[] {
    const diagnostics: CompilerDiagnostic[] = [];

    const registry = artifacts.find((a) => a.path.endsWith("AuthorityRegistry.ts"));
    if (registry && !registry.content.includes("export")) {
      diagnostics.push(
        createDiagnostic({
          code: "G400",
          source_location: { file: registry.path, line: 0, column: 0, length: 0 },
          message: "AuthorityRegistry must have exports",
        }),
      );
    }

    return diagnostics;
  }

  snapshot(ir: IRDocument): string {
    const authNames = ir.authorities.map((a) => a.name).sort();
    return sha256(JSON.stringify({ generator: this.name, authorities: authNames }));
  }
}

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

function generateArtifactMetadata(generatorName: string, ir: IRDocument, artifacts: GeneratedArtifact[]): string {
  const authorityNames = ir.authorities.map((a) => a.name);
  
  const metadata = {
    artifactId: "AuthorityGenerator",
    compilerVersion: "1.0.0",
    constitutionVersion: ir.ir_version,
    generator: generatorName,
    sha256: sha256(JSON.stringify(authorityNames)),
    dependencies: authorityNames,
    generatedArtifacts: artifacts.map((a) => ({
      path: a.path,
      hash: a.hash,
      description: a.description,
    })),
    timestamp: new Date().toISOString(),
  };

  return JSON.stringify(metadata, null, 2);
}

function generateAuthorityRegistry(
  authorities: readonly Authority[],
  constraints: readonly Constraint[],
): string {
  const authEntries = authorities.map((auth) => {
    const ownedNames = auth.owns.map(nodeToName);
    const emitsForNames = auth.emits_for.map(nodeToName);
    const constraintNames = getConstraintsForAuthority(auth, constraints).map((c) => nodeToName(c.id));

    return `  "${auth.name}": {
    owns: [${ownedNames.map((n) => `"${n}"`).join(", ")}],
    emitsFor: [${emitsForNames.map((n) => `"${n}"`).join(", ")}],
    constraints: [${constraintNames.map((n) => `"${n}"`).join(", ")}],
    deterministic: ${auth.deterministic},
  }`;
  });

  return `/**
 * AuthorityRegistry — maps authority name → ownership, events, constraints.
 *
 * DO NOT EDIT. Generated by AuthorityGenerator from Canonical IR.
 * No handwritten authority registration.
 */

export interface AuthorityEntry {
  readonly owns: readonly string[];
  readonly emitsFor: readonly string[];
  readonly constraints: readonly string[];
  readonly deterministic: boolean;
}

export const AUTHORITY_REGISTRY: Record<string, AuthorityEntry> = {
${authEntries.join(",\n")}
};

/**
 * Get all authority names.
 */
export function getAuthorityNames(): string[] {
  return Object.keys(AUTHORITY_REGISTRY);
}

/**
 * Get an authority entry by name.
 */
export function getAuthority(name: string): AuthorityEntry | undefined {
  return AUTHORITY_REGISTRY[name];
}
`;
}

function generateAuthorityResolver(
  authorities: readonly Authority[],
  edges: readonly Edge[],
): string {
  // Build reverse maps
  const entityToAuthority = new Map<string, string>();
  for (const auth of authorities) {
    for (const entityId of auth.owns) {
      entityToAuthority.set(nodeToName(entityId), auth.name);
    }
  }

  const eventToAuthority = new Map<string, string>();
  for (const auth of authorities) {
    for (const eventEdge of getEventsForAuthority(auth, edges)) {
      eventToAuthority.set(eventEdge, auth.name);
    }
  }

  return `/**
 * AuthorityResolver — answers ownership and mutation questions.
 *
 * DO NOT EDIT. Generated by AuthorityGenerator from Canonical IR.
 */

import { AUTHORITY_REGISTRY } from "./AuthorityRegistry";

/** Reverse map: entity name → authority name */
const ENTITY_TO_AUTHORITY: Record<string, string> = {
${Array.from(entityToAuthority.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([entity, auth]) => `  "${entity}": "${auth}"`)
  .join(",\n")}
};

/** Reverse map: event name → authority name */
const EVENT_TO_AUTHORITY: Record<string, string> = {
${Array.from(eventToAuthority.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([event, auth]) => `  "${event}": "${auth}"`)
  .join(",\n")}
};

/**
 * Who owns this entity?
 */
export function ownerOf(entityName: string): string | undefined {
  return ENTITY_TO_AUTHORITY[entityName];
}

/**
 * Who may mutate this entity?
 * Returns the authority that owns it, or undefined if unowned.
 */
export function whoMayMutate(entityName: string): string | undefined {
  return ownerOf(entityName);
}

/**
 * Who may observe this entity?
 * Returns the authority that owns it. All authorities may observe all entities.
 * This function enforces the READ_IMPLICITLY policy.
 */
export function whoMayObserve(_entityName: string): string | undefined {
  // All authorities may observe. Returns the owner for provenance tracking.
  return ownerOf(_entityName);
}

/**
 * Which authority emitted this event?
 */
export function authorityOfEvent(eventType: string): string | undefined {
  return EVENT_TO_AUTHORITY[eventType];
}

/**
 * Which policies apply to mutations on this entity?
 */
export function policiesFor(entityName: string): string[] {
  const authName = ownerOf(entityName);
  if (!authName) return [];
  const entry = AUTHORITY_REGISTRY[authName];
  return entry ? [...entry.constraints] : [];
}

/**
 * Does this authority own this entity?
 */
export function isOwnedBy(entityName: string, authorityName: string): boolean {
  return ENTITY_TO_AUTHORITY[entityName] === authorityName;
}
`;
}

function generateAuthorityPolicies(
  authorities: readonly Authority[],
  constraints: readonly Constraint[],
  edges: readonly Edge[],
): string {
  return `/**
 * AuthorityPolicies — before/after hooks for authority-guarded mutations.
 *
 * DO NOT EDIT. Generated by AuthorityGenerator from Canonical IR.
 * Policies are applied as middleware around mutations.
 */

import { AUTHORITY_REGISTRY } from "./AuthorityRegistry";
import { ownerOf, policiesFor } from "./AuthorityResolver";

export interface PolicyContext {
  readonly entityName: string;
  readonly authorityName: string;
  readonly tenantId: string;
  readonly command: string;
  readonly timestamp: string;
}

export interface PolicyResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly policy?: string;
}

/**
 * Evaluate all policies for a mutation.
 * Returns the first rejection, or { allowed: true } if all pass.
 */
export function evaluatePolicies(ctx: PolicyContext): PolicyResult {
  const policies = policiesFor(ctx.entityName);

  for (const policy of policies) {
    const result = evaluatePolicy(policy, ctx);
    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}

/**
 * Evaluate a single policy.
 * Stub implementation — wire to actual policy predicates in production.
 */
function evaluatePolicy(policy: string, ctx: PolicyContext): PolicyResult {
  // All policies pass by default (stub).
  // Wire actual predicates here: MustHaveCustomer, MustHaveProperty, etc.
  void policy;
  void ctx;
  return { allowed: true };
}

/**
 * Hook: called before a mutation is applied.
 * Enforces authority ownership and policy constraints.
 */
export async function beforeMutation(ctx: PolicyContext): Promise<PolicyResult> {
  const owner = ownerOf(ctx.entityName);

  // Authority ownership check
  if (owner && owner !== ctx.authorityName) {
    return {
      allowed: false,
      reason: \`Authority "\${ctx.authorityName}" does not own entity "\${ctx.entityName}". Owner is "\${owner}".\`,
      policy: "AUTHORITY_OWNERSHIP",
    };
  }

  // Policy evaluation
  return evaluatePolicies(ctx);
}

/**
 * Hook: called after a mutation is applied.
 * Stub: no-op. Wire to projections, notifications, witness generation.
 */
export async function afterMutation(_ctx: PolicyContext): Promise<void> {
  // Wire to projections here
}
`;
}
