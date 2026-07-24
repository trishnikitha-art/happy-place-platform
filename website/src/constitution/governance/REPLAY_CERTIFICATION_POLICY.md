# REPLAY_CERTIFICATION_POLICY — Constitutional Specification (P1)

**Role:** The capstone constitutional document. Certifies the whole model.
**Status:** Normative governance. Enforceable.
**Evidence tags:** [E:file]=committed audit.

---

## 1. Certification Requirements
Every constitutional component certifies against this policy set (CUSTOMER_IDENTITY, CONNECTOR, EVENT_SCHEMA, PROJECTION, DETERMINISM, PII_RETENTION):
- retained `EvidenceEnvelope`s + event log,
- a recorded `witness`,
- reproducible replay.

## 2. Evidence
Certification requires:
- the event log for the certified (`tenant`, `authority`) scope,
- `BuildWitness` (git_commit + registry hashes) per event, [O:constitution/authority/witness_builder.py]
- `EvidenceEnvelope`s from every connector. [E:CONNECTOR_POLICY.md]

## 3. Replay Runs
A certification replay runs the **full** event log for the scope and rebuilds **all** projections. It must be re-runnable and reproducible.

## 4. Acceptance Threshold
Certified when ALL hold:
1. every projection rebuilds identically (`content_hash` match) to last certified state, OR differences fully explained by new events within the same `version`;
2. **zero orphaned references**;
3. **zero cross-tenant edges**;
4. **zero PII retained after erasure**;
5. witness matches certified runtime/registry versions.

## 5. Failure Conditions
- witness mismatch (runtime/registry changed without version bump),
- orphaned reference (relationship `to` unresolved),
- cross-tenant edge (relationship into another `tenant_id`),
- PII body present where Reference required,
- non-deterministic execution path,
- projection row missing required PROJECTION_POLICY §9 fields.

## 6. Witness
Certification records: PING runtime witness (git_commit + registry hashes) + `schema_version` + `authority_policy_version`. [E:DETERMINISM_POLICY.md Model Version]

## 7. Certificate
A certificate = a signed artifact (`canonicalId` of the cert) storing: scope (`tenant`, `authority`), witness triple, result (PASS/FAIL), timestamp. Stored as an `Artifact` in the event store.

## 8. Expiration
A certificate **expires** when any input changes:
- new event beyond the certified window,
- runtime version bump,
- schema evolution,
- authority policy change.
→ re-run certification. Expiry forces continuous re-validation (no stale certification).

## 9. Enforcement
Non-certified component is blocked from promotion to production. Certification is the constitutional gate between "implemented" and "constitutional."

---
*Cross-reference: EVENT_SCHEMA_POLICY (witness), PROJECTION_POLICY (fields), DETERMINISM_POLICY (certification), PII_RETENTION_POLICY (erasure). This is the final spec; all others reduce to it.*
