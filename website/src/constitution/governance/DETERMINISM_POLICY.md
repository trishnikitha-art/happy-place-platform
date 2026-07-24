# DETERMINISM_POLICY — Constitutional Specification (P1)

**Role:** The replay constitution.
**Status:** Normative governance. Enforceable.
**Evidence tags:** [E:file]=committed audit · [O]=observed.

---

## 1. Deterministic
Given the same (event log, runtime version, schema version, authority policy version), replay yields **identical** state — bit-for-bit `content_hash` match on every projection row.

## 2. Allowed
- Non-determinism from provider data is captured as an **Observation** (evidence) at a point in time, then frozen as an event. Replay uses the observed snapshot, not live provider state.
- Planning context is **version-pinned** at execution (Law 0: planning never executes; Law 1: execution never replans). [O:constitution/laws.py]
- Knowledge may evolve and emit new recommendations → applied as NEW events → new replay state. Historical replay is unaffected.

## 3. Forbidden
- Execution MUST NOT read live provider state at replay time.
- Knowledge model updates MUST NOT alter an already-replayed historical state.
- No non-deterministic execution path (e.g., `sleep`-based simulation in production). [E:primitives/RUNTIME_PRIMITIVE_CATALOG.md simulated executor]

## 4. Provider Variability
Provider changes (Stripe rewrites an event, Google deletes a calendar event) are handled by **re-observation** → new `EvidenceEnvelope` → new event. Replay of the historical window uses the snapshot at observation time; the change appears as a forward event, never as a retroactive mutation.

## 5. Model Version
Replay pins three versions in the witness: **PING runtime version** + **schema version** + **authority policy version**. A change to any requires a version bump; replay of an old window uses the old triple. [O:constitution/authority/witness_builder.py BuildWitness]

## 6. Fallback
If a capability is unavailable, execution records a `capability_failed` event and stops. Replay shows the failure; it does **not** silently succeed or retry non-deterministically.

## 7. Replay Certification
A replay run is certified when its witness matches (git_commit + registry hashes) and its produced state equals the prior certified state — OR every difference is fully explained by new events within the same schema/policy version. (See REPLAY_CERTIFICATION_POLICY.)

## 8. Failure Conditions
- witness mismatch (runtime/registry changed without version bump),
- missing event in the log,
- authority policy change without version bump,
- non-deterministic execution path detected,
- projection `content_hash` diverges from certified state without a new-event explanation.

## 9. Enforcement
Any replay failing §8 is NON-CERTIFIED; the divergence is recorded as an `anomaly` event for investigation. Determinism is the constitutional floor for all execution.

---
*Cross-reference: EVENT_SCHEMA_POLICY (version/witness), PROJECTION_POLICY (content_hash), REPLAY_CERTIFICATION_POLICY (certification).*
