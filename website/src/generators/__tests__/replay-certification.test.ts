/**
 * Replay Certification Tests — Sprint 3 Phase 3.
 *
 * Proves deterministic replay: same events → same state → same hash.
 * Uses generated runtime code only. No mocks. No handwritten replay logic.
 */

import * as crypto from "crypto";
import { JobRepository } from "../../generated/repositories/JobRepository";
import { EstimateRepository } from "../../generated/repositories/EstimateRepository";
import { ProjectRepository } from "../../generated/repositories/ProjectRepository";
import { dispatchEvent, replayStream } from "../../generated/replay/AggregateDispatch";
import type { JobCreated, CrewAssigned, JobCompleted } from "../../generated/repositories/JobRepository";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(obj: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

function makeEvent<T extends string>(type: T, overrides: Record<string, unknown> = {}): { type: T; [key: string]: unknown } {
  return {
    type,
    aggregateId: "job-1",
    authorityId: "JobAuthority",
    tenantId: "tenant-1",
    replaySequence: 0,
    witnessId: "witness-1",
    correlationId: "corr-1",
    causationId: "cause-1",
    schemaVersion: "1.0.0",
    timestamp: "2026-07-24T00:00:00.000Z",
    contentHash: "hash-1",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test: Deterministic replay — same events produce identical state
// ---------------------------------------------------------------------------

describe("Replay Certification", () => {
  const jobEvents: { type: string; [key: string]: unknown }[] = [
    makeEvent("JobCreated"),
    makeEvent("CrewAssigned"),
    makeEvent("JobCompleted"),
  ];

  it("same event sequence produces identical state (100 runs)", () => {
    const states: unknown[] = [];

    for (let i = 0; i < 100; i++) {
      const state = replayStream(
        { id: "job-1", version: 0, status: "initial", authority: "JobAuthority", events: [] },
        jobEvents,
      );
      states.push(state);
    }

    // Every state must be structurally identical
    const firstHash = sha256(states[0]);
    for (let i = 1; i < states.length; i++) {
      expect(sha256(states[i])).toBe(firstHash);
    }
  });

  it("static apply() produces deterministic version increments", () => {
    const initial = { id: "job-1", version: 0, status: "initial", authority: "JobAuthority", events: [] as unknown[] };

    const s1 = JobRepository.apply(initial, jobEvents[0] as JobCreated);
    const s2 = JobRepository.apply(s1, jobEvents[1] as CrewAssigned);
    const s3 = JobRepository.apply(s2, jobEvents[2] as JobCompleted);

    expect(s1.version).toBe(1);
    expect(s2.version).toBe(2);
    expect(s3.version).toBe(3);
    expect(s3.status).toBe("jobCompleted");
  });

  it("static apply() is pure — original state unchanged", () => {
    const initial = { id: "job-1", version: 0, status: "initial", authority: "JobAuthority", events: [] as unknown[] };
    const original = { ...initial };

    JobRepository.apply(initial, jobEvents[0] as JobCreated);

    expect(initial).toEqual(original);
  });

  it("events accumulate in state", () => {
    const initial = { id: "job-1", version: 0, status: "initial", authority: "JobAuthority", events: [] as unknown[] };

    const s1 = JobRepository.apply(initial, jobEvents[0] as JobCreated);
    const s2 = JobRepository.apply(s1, jobEvents[1] as CrewAssigned);
    const s3 = JobRepository.apply(s2, jobEvents[2] as JobCompleted);

    expect(s1.events).toHaveLength(1);
    expect(s2.events).toHaveLength(2);
    expect(s3.events).toHaveLength(3);
  });

  it("dispatchEvent routes to correct repository", () => {
    const initial = { id: "job-1", version: 0, status: "initial", authority: "JobAuthority", events: [] as unknown[] };

    const s1 = dispatchEvent(initial, jobEvents[0]);
    expect(s1.status).toBe("jobCreated");

    const s2 = dispatchEvent(s1, jobEvents[1]);
    expect(s2.status).toBe("crewAssigned");

    const s3 = dispatchEvent(s2, jobEvents[2]);
    expect(s3.status).toBe("jobCompleted");
  });

  it("dispatchEvent throws on unknown event type", () => {
    const initial = { id: "job-1", version: 0, status: "initial", authority: "JobAuthority", events: [] as unknown[] };

    expect(() => dispatchEvent(initial, { type: "UnknownEvent" })).toThrow("Unknown event type for replay");
  });

  it("replayStream handles empty event list", () => {
    const initial = { id: "job-1", version: 0, status: "initial", authority: "JobAuthority", events: [] as unknown[] };
    const result = replayStream(initial, []);

    expect(result).toEqual(initial);
  });

  it("cross-aggregate dispatch: estimate events route to EstimateRepository", () => {
    const initial = { id: "est-1", version: 0, status: "initial", authority: "EstimateAuthority", events: [] as unknown[] };

    const estCreated = makeEvent("EstimateCreated", { aggregateId: "est-1" });
    const estAccepted = makeEvent("EstimateAccepted", { aggregateId: "est-1" });

    const s1 = dispatchEvent(initial, estCreated);
    expect(s1.status).toBe("estimateCreated");

    const s2 = dispatchEvent(s1, estAccepted);
    expect(s2.status).toBe("estimateAccepted");
  });

  it("cross-aggregate dispatch: project events route to ProjectRepository", () => {
    const initial = { id: "proj-1", version: 0, status: "initial", authority: "ProjectAuthority", events: [] as unknown[] };

    const projCreated = makeEvent("ProjectCreated", { aggregateId: "proj-1" });
    const projCompleted = makeEvent("ProjectCompleted", { aggregateId: "proj-1" });

    const s1 = dispatchEvent(initial, projCreated);
    expect(s1.status).toBe("projectCreated");

    const s2 = dispatchEvent(s1, projCompleted);
    expect(s2.status).toBe("projectCompleted");
  });

  it("replay hash is stable across calls", () => {
    const run = () => {
      const initial = { id: "job-1", version: 0, status: "initial", authority: "JobAuthority", events: [] as unknown[] };
      const state = replayStream(initial, jobEvents);
      return sha256({ version: state.version, status: state.status, eventCount: state.events.length });
    };

    const hashes = Array.from({ length: 50 }, run);
    const unique = new Set(hashes);
    expect(unique.size).toBe(1);
  });

  it("authority field is preserved through replay", () => {
    const initial = { id: "job-1", version: 0, status: "initial", authority: "JobAuthority", events: [] as unknown[] };
    const state = replayStream(initial, jobEvents);

    expect(state.authority).toBe("JobAuthority");
  });

  it("replaying events in different order produces different state", () => {
    const initial = { id: "job-1", version: 0, status: "initial", authority: "JobAuthority", events: [] as unknown[] };

    const forward = replayStream(initial, jobEvents);
    const reversed = replayStream(initial, [...jobEvents].reverse());

    expect(forward.status).not.toBe(reversed.status);
  });
});
