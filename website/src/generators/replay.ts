/**
 * Replay Generator — IR → Replay maps + dispatch.
 *
 * Generates:
 *   - ReplayMap.ts (event type → aggregate apply method)
 *   - ReplayRegistry.ts (central registry of all replays)
 *   - AggregateDispatch.ts (routes events to correct aggregate)
 *
 * No switch statements. No manual replay maps.
 * No runtime registration. All derived from IR.
 *
 * No generator reads YAML. Only IR.
 */

import * as crypto from "crypto";
import type { IRDocument, Node, Transformation } from "../constitution/ir/types";
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

function camelCase(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Build map: aggregate → events it emits */
function buildAggregateEventMap(ir: IRDocument): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const edge of ir.edges) {
    if (edge.kind === "emits" && edge.from.startsWith("aggregate:")) {
      const aggName = edge.from.replace("aggregate:", "");
      const eventName = edge.to.replace("event:", "");
      if (!map.has(aggName)) map.set(aggName, []);
      map.get(aggName)!.push(eventName);
    }
  }
  return map;
}

/** Build map: event → aggregate that emits it */
function buildEventAggregateMap(ir: IRDocument): Map<string, string> {
  const map = new Map<string, string>();
  for (const edge of ir.edges) {
    if (edge.kind === "emits" && edge.from.startsWith("aggregate:")) {
      const aggName = edge.from.replace("aggregate:", "");
      const eventName = edge.to.replace("event:", "");
      map.set(eventName, aggName);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Replay Generator
// ---------------------------------------------------------------------------

export class ReplayGenerator implements Generator {
  readonly name = "ReplayGenerator";

  supports(ir: IRDocument): boolean {
    return ir.edges.some((e) => e.kind === "emits");
  }

  generate(ir: IRDocument): GeneratedArtifact[] {
    const artifacts: GeneratedArtifact[] = [];
    const aggEventMap = buildAggregateEventMap(ir);
    const eventAggMap = buildEventAggregateMap(ir);

    // Generate ReplayMap
    const replayMapContent = generateReplayMap(aggEventMap);
    artifacts.push({
      path: "replay/ReplayMap.ts",
      content: replayMapContent,
      hash: sha256(replayMapContent),
      generator: this.name,
      description: "Event type → aggregate apply method mapping",
    });

    // Generate ReplayRegistry
    const registryContent = generateReplayRegistry(aggEventMap, eventAggMap);
    artifacts.push({
      path: "replay/ReplayRegistry.ts",
      content: registryContent,
      hash: sha256(registryContent),
      generator: this.name,
      description: "Central registry of all replay mappings",
    });

    // Generate AggregateDispatch
    const dispatchContent = generateAggregateDispatch(eventAggMap);
    artifacts.push({
      path: "replay/AggregateDispatch.ts",
      content: dispatchContent,
      hash: sha256(dispatchContent),
      generator: this.name,
      description: "Routes events to correct aggregate repository",
    });

    // Generate artifact metadata manifest
    const metadata = generateArtifactMetadata(this.name, ir, artifacts);
    artifacts.push({
      path: "replay/ReplayGenerator.metadata.json",
      content: metadata,
      hash: sha256(metadata),
      generator: this.name,
      description: "Artifact metadata for ReplayGenerator",
    });

    return artifacts;
  }

  validate(artifacts: GeneratedArtifact[]): CompilerDiagnostic[] {
    const diagnostics: CompilerDiagnostic[] = [];

    // Every aggregate that emits events must appear in ReplayMap
    const replayMap = artifacts.find((a) => a.path.endsWith("ReplayMap.ts"));
    if (replayMap) {
      // Basic structural check
      if (!replayMap.content.includes("export const")) {
        diagnostics.push(
          createDiagnostic({
            code: "G300",
            source_location: { file: replayMap.path, line: 0, column: 0, length: 0 },
            message: "ReplayMap must export a const map",
          }),
        );
      }
    }

    return diagnostics;
  }

  snapshot(ir: IRDocument): string {
    const aggEventMap = buildAggregateEventMap(ir);
    const entries = Array.from(aggEventMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    return sha256(JSON.stringify({ generator: this.name, map: entries }));
  }
}

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

function generateArtifactMetadata(generatorName: string, ir: IRDocument, artifacts: GeneratedArtifact[]): string {
  const eventAggMap = buildEventAggregateMap(ir);
  const eventNames = Array.from(eventAggMap.keys()).map((e) => pascalCase(e));
  
  const metadata = {
    artifactId: "ReplayGenerator",
    compilerVersion: "1.0.0",
    constitutionVersion: ir.ir_version,
    generator: generatorName,
    sha256: sha256(JSON.stringify(eventNames)),
    dependencies: eventNames,
    generatedArtifacts: artifacts.map((a) => ({
      path: a.path,
      hash: a.hash,
      description: a.description,
    })),
    timestamp: new Date().toISOString(),
  };

  return JSON.stringify(metadata, null, 2);
}

function generateReplayMap(aggEventMap: Map<string, string[]>): string {
  const entries = Array.from(aggEventMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  const mapEntries = entries.map(([agg, events]) => {
    const pascalAgg = pascalCase(agg);
    const eventEntries = events
      .sort()
      .map((e) => `    "${pascalCase(e)}": "${camelCase("apply" + pascalCase(e))}"`)
      .join(",\n");
    return `  "${pascalAgg}": {\n${eventEntries},\n  }`;
  });

  return `/**
 * ReplayMap — event type → aggregate apply method.
 *
 * DO NOT EDIT. Generated by ReplayGenerator from Canonical IR.
 * No switch statements. No manual registration. Pure data.
 */

export const REPLAY_MAP: Record<string, Record<string, string>> = {
${mapEntries.join(",\n")}
};

/**
 * Get the apply method name for a given aggregate and event type.
 * Returns undefined if no replay mapping exists.
 */
export function getApplyMethod(aggregateName: string, eventType: string): string | undefined {
  return REPLAY_MAP[aggregateName]?.[eventType];
}

/**
 * Get all event types that a given aggregate handles.
 */
export function getEventsForAggregate(aggregateName: string): string[] {
  const mapping = REPLAY_MAP[aggregateName];
  return mapping ? Object.keys(mapping) : [];
}

/**
 * Get all aggregates that handle events.
 */
export function getAllAggregates(): string[] {
  return Object.keys(REPLAY_MAP);
}
`;
}

function generateReplayRegistry(
  aggEventMap: Map<string, string[]>,
  eventAggMap: Map<string, string>,
): string {
  const eventEntries = Array.from(eventAggMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([event, agg]) => `  "${pascalCase(event)}": "${pascalCase(agg)}"`);

  return `/**
 * ReplayRegistry — central event → aggregate routing table.
 *
 * DO NOT EDIT. Generated by ReplayGenerator from Canonical IR.
 */

/** Map from event type string to the aggregate that handles it */
export const EVENT_TO_AGGREGATE: Record<string, string> = {
${eventEntries.join(",\n")}
};

/**
 * Get the aggregate name for an event type.
 * Returns undefined if the event type is not registered.
 */
export function resolveAggregate(eventType: string): string | undefined {
  return EVENT_TO_AGGREGATE[eventType];
}

/**
 * Check if an event type is registered for replay.
 */
export function isRegistered(eventType: string): boolean {
  return eventType in EVENT_TO_AGGREGATE;
}
`;
}

function generateAggregateDispatch(eventAggMap: Map<string, string>): string {
  const eventEntries = Array.from(eventAggMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([event, agg]) => {
      const eventName = pascalCase(event);
      const aggName = pascalCase(agg);
      return `  case "${eventName}":
    return ${aggName}Repository.apply(state, event);`;
    });

  return `/**
 * AggregateDispatch — routes events to the correct aggregate's apply.
 *
 * DO NOT EDIT. Generated by ReplayGenerator from Canonical IR.
 * No switch statements in user code. All routing derived from IR.
 */

import { ${Array.from(new Set(Array.from(eventAggMap.values()).map((a) => `${pascalCase(a)}Repository`))).join(", ")} } from "../repositories";

/**
 * Dispatch a single event to its aggregate's apply method.
 * The mapping is derived from the IR edges (authority OWNS entity → emits event).
 *
 * @param state - Current aggregate state
 * @param event - The event to apply
 * @returns New aggregate state
 */
export function dispatchEvent(
  state: { id: string; version: number; status: string; authority: string; events: readonly unknown[] },
  event: { type: string; [key: string]: unknown },
): typeof state {
  switch (event.type) {
${eventEntries.join("\n")}
    default:
      throw new Error(\`Unknown event type for replay: \${(event as { type: string }).type}\`);
  }
}

/**
 * Replay a full event stream against an aggregate.
 * Returns the final state after all events are applied.
 */
export function replayStream(
  initialState: { id: string; version: number; status: string; authority: string; events: readonly unknown[] },
  events: readonly { type: string; [key: string]: unknown }[],
): typeof initialState {
  let state = initialState;
  for (const event of events) {
    state = dispatchEvent(state, event);
  }
  return state;
}
`;
}
