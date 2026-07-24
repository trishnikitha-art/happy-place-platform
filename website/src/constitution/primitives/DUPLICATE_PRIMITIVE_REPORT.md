# Duplicate Primitive Report (Stage 2)

**Rule:** Find primitives implemented more than once. Classify: **Canonical** (the one true impl) · **Duplicate** (redundant impl) · **Derived** (port of canonical to another layer/repo) · **Incidental** (unrelated coincidental overlap). **No recommendations — evidence only.**

---

## Findings

### D1 — Hashing / Canonical Identity
- **PING [O]:** `constitution/models/event.py` — `event_id = SHA256` over constitutional identity fields.
- **HPOS [O]:** `src/constitution/objects/_sha256.ts` — SHA-256 over JSON `{type,id}` → `canonicalId`.
- **Classification:** **Derived.** Same algorithm (SHA-256 over identity), two language ports (Python / TypeScript). Not harmful, but the algorithm is the *Canonical*; both ports are *Derived* implementations.
- **Evidence:** both files present and read.

### D2 — Projection Engine (TRUE DUPLICATE)
- **PING [O]:** `kernel/projection.py` **and** `runtime/event_sourcing/projections.py` — two projection engines in one repo.
- **Classification:** **Duplicate.** One is redundant. Canonical = a single projection engine; the second is a duplicate implementation.
- **Evidence:** both modules exist; prior audit flagged this as a duplicate subsystem.

### D3 — Knowledge Graph (DUPLICATE + LEAK)
- **PING [O]:** root `knowledge/graph.py` (`add_organization`/`add_repository`/`add_person` — World B Hermes tenant leak) **and** `runtime/knowledge/knowledge_graph.py` (abstract graph).
- **Classification:** **Duplicate** + **Incidental leak.** The root graph is org-specific (not constitutional); the runtime graph is the canonical abstract form.
- **Evidence:** both files present; prior audit identified World B leak.

### D4 — Lifecycle Schema (DERIVED PORT)
- **KC [I]:** 8-state lifecycle (Unknown→Observed→Verified→Trusted→Constitutional→Historical→Archived→Forgotten) from earlier audit.
- **HPOS [O]:** `canonical-object.ts` `LifecycleState` = identical 8 states.
- **Classification:** **Derived.** HPOS ported the KC lifecycle verbatim. Same *Canonical* schema.
- **Evidence:** HPOS enum matches the KC spec states.

### D5 — Evidence / Witness Schema (DERIVED PARALLEL)
- **PING [O]:** `EventEnvelope.build_witness` + `witness_builder.BuildWitness`.
- **HPOS [O]:** `EvidenceRef{source,observer,witness,observedAt,confidence}` + `canonicalId` as witness.
- **Classification:** **Derived** parallel schemas. Same concept (provenance + witness), two shapes.
- **Evidence:** both present.

### D6 — Version Schema (DERIVED PARALLEL)
- **PING [I]:** `ProjectionVersion` (witness).
- **HPOS [O]:** `versionHistory[]{version,witness,changedAt,evidence}`.
- **Classification:** **Derived** parallel.
- **Evidence:** HPOS present; PING inferred from prior audit.

### D7 — Relationship Schema (DERIVED PARALLEL)
- **PING [O]:** `knowledge_graph.py` edges.
- **HPOS [O]:** `Relationship[]{kind,to,authority,witness}`.
- **Classification:** **Derived** parallel (different domains: runtime graph vs business-object graph). Not a true duplicate, but overlapping concept.
- **Evidence:** both present.

### D8 — Configuration Loading (INCIDENTAL)
- **HPOS [O]:** JSON config imported by Next.js.
- **PING [O]:** constitution/config loaded by runtime.
- **Classification:** **Incidental.** Different scopes; not a redundancy worth flagging beyond note.
- **Evidence:** both present.

---

## Summary

| ID | Primitive | Classification |
|----|-----------|----------------|
| D1 | Hashing / Canonical ID | Derived (2 language ports) |
| D2 | Projection engine | **Duplicate** (2 in PING) |
| D3 | Knowledge graph | **Duplicate** + leak |
| D4 | Lifecycle schema | Derived (HPOS←KC) |
| D5 | Evidence/Witness schema | Derived parallel |
| D6 | Version schema | Derived parallel |
| D7 | Relationship schema | Derived parallel |
| D8 | Configuration loading | Incidental |

**No new primitive is required anywhere.** The duplication is *structural* (D2, D3 are real redundancies to eventually collapse; D1, D4–D7 are cross-repo ports that should become shared libraries). This is exactly the "accidental duplication" risk the audit was commissioned to surface — and it is small and bounded.
