# EVENT_SCHEMA_POLICY — Constitutional Specification (P1)

**Role:** Freezes the event model. Constitutional law.
**Status:** Normative governance. Enforceable. Supports deterministic replay.
**Evidence tags:** [E:file]=committed audit · [O]=observed.

---

## 1. Canonical Envelope
The canonical envelope = PING `EventEnvelope` (frozen dataclass). [O:constitution/models/event.py] `event_id` = SHA-256 over constitutional identity fields (excluding `recorded_at`/`processed_at`). [E:primitives/CONSTITUTIONAL_PRIMITIVE_CATALOG.md Evidence/Canonical Identity]

## 2. Required Fields
| Field | Rule |
|-------|------|
| `event_id` | SHA-256 over identity fields; immutable |
| `type` | `Domain` \| `Infra` |
| `aggregate_type` | canonical object type |
| `aggregate_id` | `canonicalId` of the object |
| `authority` | `AuthorityRef` (emitter) |
| `tenant` | tenant id (HPOS = single today; field REQUIRED for future isolation) |
| `recorded_at` | timestamp; **excluded from `event_id` hash** |
| `version` | schema version |
| `payload_hash` | SHA-256 of `canonical_payload_bytes` |
| `witness` | `BuildWitness` (git_commit + registry hashes) [O:constitution/authority/witness_builder.py] |

## 3. Artifact Identity
Artifacts reference `contentHash` + `sourceReference` (see CONNECTOR_POLICY). An artifact event carries `artifact_id = SHA-256({type, contentHash, sourceReference})`.

## 4. Content Hash
SHA-256 of payload bytes. Immutable; used for deterministic equality and replay certification.

## 5. Tenant
`tenant` field mandatory on every event. Single tenant (`hp-os`) today; populated to enable TENANT_ISOLATION_POLICY enforcement later. [E:governance/CONSTITUTIONAL_GOVERNANCE_AUDIT.md Tenant Isolation Partial]

## 6. Authority
`authority` must be a valid `AuthorityRef{domain, authority, ref}`. [O:canonical-object.ts] Invalid authority → event rejected at ingest.

## 7. Timestamp
`recorded_at` captured at emit; excluded from `event_id` so the id is content-stable. Never mutated post-record.

## 8. Version
Schema version of the event payload. Enables evolution without breaking replay.

## 9. Schema Evolution
- **Additive only.** New fields OPTIONAL; old events replay under their original `version`.
- Removed fields: deprecated, not required for old versions.
- Consumers MUST ignore unknown fields (forward-compatible).

## 10. Backward Compatibility
A newer runtime MUST replay older events (by `version`) identically. No event is invalidated by a schema bump.

## 11. Replay Constraints
- Events are **immutable**; deletion uses a `tombstone` event, never mutation.
- Replay reconstructs state per (`tenant`, `authority`, `version`) scope.
- Replay is deterministic given the event log + witness (see DETERMINISM_POLICY).

## 12. Enforcement
Any event not satisfying §2–§7 is rejected at ingest. This is the constitutional floor for all HPOS/PING events.

---
*Cross-reference: CONNECTOR_POLICY (emission), DETERMINISM_POLICY (replay), PROJECTION_POLICY (derived-from), REPLAY_CERTIFICATION_POLICY (certification).*
