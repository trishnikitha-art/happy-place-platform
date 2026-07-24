/**
 * Event Generator — IR → Canonical event envelopes.
 *
 * Every event type gets one canonical envelope with:
 *   - AggregateId, AuthorityId, TenantId
 *   - ReplaySequence, WitnessId
 *   - CorrelationId, CausationId
 *   - SchemaVersion, Timestamp/Clock, ContentHash
 *
 * No generator reads YAML. Only IR.
 */

import * as crypto from "crypto";
import type { IRDocument, Node } from "../constitution/ir/types";
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

// ---------------------------------------------------------------------------
// Event Generator
// ---------------------------------------------------------------------------

export class EventGenerator implements Generator {
  readonly name = "EventGenerator";

  supports(ir: IRDocument): boolean {
    return ir.nodes.some((n) => n.kind === "event");
  }

  generate(ir: IRDocument): GeneratedArtifact[] {
    const artifacts: GeneratedArtifact[] = [];

    const eventNodes = ir.nodes.filter((n) => n.kind === "event");

    // Generate the master event envelope type
    const envelopeContent = generateEventEnvelope(eventNodes);
    artifacts.push({
      path: "events/EventEnvelope.ts",
      content: envelopeContent,
      hash: sha256(envelopeContent),
      generator: this.name,
      description: "Canonical event envelope — all events share this structure",
    });

    // Generate the event type registry (discriminated union)
    const registryContent = generateEventRegistry(eventNodes);
    artifacts.push({
      path: "events/EventRegistry.ts",
      content: registryContent,
      hash: sha256(registryContent),
      generator: this.name,
      description: "Event type registry — discriminated union of all event payloads",
    });

    // Generate individual event files
    for (const node of eventNodes) {
      const name = node.symbol || node.id.replace("event:", "");
      const aggregate = (node.properties.aggregate as string) ?? "Unknown";
      const content = generateEventFile(name, aggregate);
      artifacts.push({
        path: `events/${pascalCase(name)}.ts`,
        content,
        hash: sha256(content),
        generator: this.name,
        description: `Canonical event type for ${name}`,
      });
    }

    // Generate event factory
    const factoryContent = generateEventFactory(eventNodes);
    artifacts.push({
      path: "events/createEvent.ts",
      content: factoryContent,
      hash: sha256(factoryContent),
      generator: this.name,
      description: "Type-safe event factory — creates events with generated IDs",
    });

    return artifacts;
  }

  validate(artifacts: GeneratedArtifact[]): CompilerDiagnostic[] {
    const diagnostics: CompilerDiagnostic[] = [];

    for (const artifact of artifacts) {
      if (!artifact.content.includes("export")) {
        diagnostics.push(
          createDiagnostic({
            code: "G200",
            source_location: { file: artifact.path, line: 0, column: 0, length: 0 },
            message: `Generated file ${artifact.path} has no exports`,
          }),
        );
      }
    }

    // Verify envelope has all required fields
    const envelope = artifacts.find((a) => a.path.endsWith("EventEnvelope.ts"));
    if (envelope) {
      const requiredFields = ["aggregateId", "authorityId", "tenantId", "replaySequence", "witnessId", "correlationId", "causationId", "schemaVersion", "timestamp", "contentHash"];
      for (const field of requiredFields) {
        if (!envelope.content.includes(field)) {
          diagnostics.push(
            createDiagnostic({
              code: "G201",
              source_location: { file: envelope.path, line: 0, column: 0, length: 0 },
              message: `EventEnvelope is missing required field: ${field}`,
            }),
          );
        }
      }
    }

    return diagnostics;
  }

  snapshot(ir: IRDocument): string {
    const eventNames = ir.nodes
      .filter((n) => n.kind === "event")
      .map((n) => n.symbol)
      .sort();
    return sha256(JSON.stringify({ generator: this.name, events: eventNames }));
  }
}

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

function generateEventEnvelope(eventNodes: readonly Node[]): string {
  const eventNames = eventNodes.map((n) => pascalCase(n.symbol || n.id.replace("event:", "")));

  return `/**
 * EventEnvelope — canonical event structure.
 *
 * DO NOT EDIT. Generated by EventGenerator from Canonical IR.
 * Every event in the system shares this envelope.
 */

export interface EventEnvelope<T extends string = string, P = unknown> {
  /** Discriminated union key */
  readonly type: T;

  /** Aggregate this event belongs to */
  readonly aggregateId: string;

  /** Authority that emitted this event */
  readonly authorityId: string;

  /** Tenant isolation boundary */
  readonly tenantId: string;

  /** Monotonically increasing replay position */
  readonly replaySequence: number;

  /** Content-hash witness for replay determinism */
  readonly witnessId: string;

  /** Correlation ID for distributed tracing */
  readonly correlationId: string;

  /** Causation ID — the event that caused this one */
  readonly causationId: string;

  /** Schema version for forward compatibility */
  readonly schemaVersion: string;

  /** Lamport timestamp or wall clock (deterministic mode uses replay sequence) */
  readonly timestamp: string;

  /** SHA-256 of the payload for content-addressable storage */
  readonly contentHash: string;

  /** Event-specific payload */
  readonly payload: P;
}

/** All valid event type strings */
export type EventType = ${eventNames.length > 0 ? eventNames.map((n) => `"${n}"`).join(" | ") : "never"};
`;
}

function generateEventRegistry(eventNodes: readonly Node[]): string {
  const eventEntries = eventNodes.map((n) => {
    const name = pascalCase(n.symbol || n.id.replace("event:", ""));
    const aggregate = pascalCase((n.properties.aggregate as string) ?? "Unknown");
    return `  /** Emitted by ${aggregate} */\n  ${name}: { aggregateId: string; authorityId: string; tenantId: string; replaySequence: number; witnessId: string; correlationId: string; causationId: string; schemaVersion: string; timestamp: string; contentHash: string; payload: Record<string, unknown> };`;
  });

  return `/**
 * EventRegistry — type map from event type string to its payload shape.
 *
 * DO NOT EDIT. Generated by EventGenerator from Canonical IR.
 */

${eventEntries.join("\n\n")}

/** Event payload by type */
export type EventPayloadMap = {
${eventNodes.map((n) => {
  const name = pascalCase(n.symbol || n.id.replace("event:", ""));
  return `  "${name}": EventPayloadMap_${name};`;
}).join("\n")}
};

${eventNodes.map((n) => {
  const name = pascalCase(n.symbol || n.id.replace("event:", ""));
  return `interface EventPayloadMap_${name} {
  readonly aggregateId: string;
  readonly authorityId: string;
  readonly tenantId: string;
  readonly replaySequence: number;
  readonly witnessId: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly schemaVersion: string;
  readonly timestamp: string;
  readonly contentHash: string;
  readonly payload: Record<string, unknown>;
}`;
}).join("\n\n")}
`;
}

function generateEventFile(name: string, aggregate: string): string {
  const pascal = pascalCase(name);
  const aggPascal = pascalCase(aggregate);

  return `/**
 * ${pascal} — canonical event type.
 *
 * DO NOT EDIT. Generated by EventGenerator from Canonical IR.
 * Aggregate: ${aggPascal}
 */

export interface ${pascal} {
  readonly type: "${pascal}";
  readonly aggregateId: string;
  readonly authorityId: string;
  readonly tenantId: string;
  readonly replaySequence: number;
  readonly witnessId: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly schemaVersion: string;
  readonly timestamp: string;
  readonly contentHash: string;
  readonly payload: Record<string, unknown>;
}

/** Type guard */
export function is${pascal}(event: { type: string }): event is ${pascal} {
  return event.type === "${pascal}";
}
`;
}

function generateEventFactory(eventNodes: readonly Node[]): string {
  const factoryCases = eventNodes.map((n) => {
    const name = pascalCase(n.symbol || n.id.replace("event:", ""));
    return `  case "${name}":
    return { type: "${name}" as const, ...base } as import("./${name}").${name};`;
  });

  return `/**
 * createEvent — type-safe event factory.
 *
 * DO NOT EDIT. Generated by EventGenerator from Canonical IR.
 * Creates events with deterministic content hashes.
 */

import * as crypto from "crypto";

export interface CreateEventInput {
  readonly aggregateId: string;
  readonly authorityId: string;
  readonly tenantId: string;
  readonly replaySequence: number;
  readonly witnessId: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly schemaVersion?: string;
  readonly timestamp?: string;
  readonly payload?: Record<string, unknown>;
}

function computeContentHash(payload: Record<string, unknown>): string {
  const sorted = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash("sha256").update(sorted).digest("hex");
}

export function createEvent<T extends string>(
  type: T,
  input: CreateEventInput,
): { readonly type: T; readonly aggregateId: string; readonly authorityId: string; readonly tenantId: string; readonly replaySequence: number; readonly witnessId: string; readonly correlationId: string; readonly causationId: string; readonly schemaVersion: string; readonly timestamp: string; readonly contentHash: string; readonly payload: Record<string, unknown> } {
  const payload = input.payload ?? {};
  const base = {
    aggregateId: input.aggregateId,
    authorityId: input.authorityId,
    tenantId: input.tenantId,
    replaySequence: input.replaySequence,
    witnessId: input.witnessId,
    correlationId: input.correlationId,
    causationId: input.causationId,
    schemaVersion: input.schemaVersion ?? "1.0.0",
    timestamp: input.timestamp ?? new Date().toISOString(),
    contentHash: computeContentHash(payload),
    payload,
  };

  return { type, ...base } as any;
}
`;
}
