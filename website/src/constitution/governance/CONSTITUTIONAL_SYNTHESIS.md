# Constitutional Synthesis — Convergence Document

**Purpose:** Tie the seven P1 specifications into one converged constitutional model. This is the point where discovery ends and normative governance begins.
**Status:** Normative. Resolves remaining ambiguities as governance, not architecture.
**Evidence:** all findings grounded in `primitives/*` and `governance/CONSTITUTIONAL_GOVERNANCE_AUDIT.md`.

---

## 1. Authority Hierarchy (resolved)
```
Provider (owns bytes + customer PII)
   │  Reference (never Copy)
   ▼
HPOS (customer's sovereign system of record; owns operational truth + derived artifacts)
   │  Observation → EvidenceEnvelope
   ▼
PING Runtime (relationship intelligence layer; deterministic execution, replay, authority enforcement)
   │  Observation (never execution input that changes replay)
   ▼
Knowledge Constitution + Hermes (autonomous reasoning; emits Claims, NEVER owns data)
```
- **Provider > HPOS > PING > Knowledge/Hermes** in ownership authority.
- Hermes (reasoning layer) observes and emits `Claim`s with confidence + reasoning + evidence-reference, but **never assumes ownership of customer data**. [E:PII_RETENTION_POLICY.md §8]

## 2. How the Seven Specs Interlock
| Spec | Locks down |
|------|-----------|
| CUSTOMER_IDENTITY | customer sovereignty (Reference, never owned) |
| CONNECTOR | who owns bytes (Reference default, Derived hybrid) |
| EVENT_SCHEMA | immutable canonical envelope (witness, tenant, version) |
| PROJECTION | derived-only, tenant-scoped, content_hash certified |
| DETERMINISM | replay reproducibility (version-pinned witness) |
| PII_RETENTION | privacy + erasure without breaking replay |
| REPLAY_CERTIFICATION | capstone gate (all above → certified or blocked) |

No spec introduces a new primitive. All reuse: Canonical Identity (SHA-256 over identity), AuthorityRef, Evidence/ Witness, Replay, Reference-not-Copy, Lifecycle, Relationships. [E:primitives/CONSTITUTIONAL_PRIMITIVE_CATALOG.md]

## 3. Remaining Ambiguities → Resolved as Governance
- **Tenant isolation (multi-tenant future):** resolved by `tenant` field mandated in EVENT_SCHEMA + Tenant Scope in PROJECTION + zero-cross-tenant-edge in REPLAY_CERTIFICATION. (Single tenant `hp-os` today; policy ready.)
- **Hermes ownership:** resolved — Hermes is a reasoning layer producing `Claim`s; ownership stays with HPOS/Provider. No new authority class.
- **Customer ownership:** resolved — Provider owns; HPOS references; Knowledge observes references only.
- **Replay drift:** resolved — projections are derived + content_hash certified + rebuild deterministic.
- **PII in intelligence:** resolved — Knowledge/Hermes forbidden from ingesting PII bodies or embeddings.

## 4. Long-Term Vision (encoded)
- **HPOS** = the customer's sovereign system of record (operational truth, relationships, derived artifacts).
- **PING** = the relationship intelligence layer (deterministic replay, authority enforcement, capability execution).
- **Hermes** = autonomous reasoning layer (observes, reasons, recommends) without ever owning customer data.
- The product is a **constitutional relationship operating system**, not an AI CRM.

## 5. Ratified Implementation Roadmap (from verified gaps)
| Order | Deliverable | Type |
|------|-------------|------|
| 1 | CUSTOMER_IDENTITY_POLICY | Constitutional Spec ✅ |
| 2 | CONNECTOR_POLICY | Constitutional Spec ✅ |
| 3 | EVENT_SCHEMA_POLICY | Constitutional Spec ✅ |
| 4 | PROJECTION_POLICY | Constitutional Spec ✅ |
| 5 | DETERMINISM_POLICY | Constitutional Spec ✅ |
| 6 | PII_RETENTION_POLICY | Constitutional Spec ✅ |
| 7 | REPLAY_CERTIFICATION_POLICY | Constitutional Spec ✅ |
| 8 | CustomerAuthority implementation | Runtime |
| 9 | Connector normalization | Runtime |
| 10 | Canonical Event Envelope | Runtime |
| 11 | Projection tenant enforcement | Runtime |
| 12 | Deterministic replay certification | Runtime |
| 13 | Media Pipeline vertical certification | End-to-end proof |

Phases A–E (Identity → Connectors → Events → Projection → Knowledge) follow directly.

## 6. Convergence Statement
The constitutional model **converges**. Primitives are complete (0 new required). Ownership, replay, evidence, provider boundaries, and byte ownership are implemented or policy-locked. The only remaining work is **governance formalization (now done)** + **runtime maturity (wiring)** + **product features**. Implementation becomes verification that code conforms to these specifications — not further architecture discovery.

**If** future implementation uncovers a genuinely new primitive or authority not expressible in these specs, that justifies reopening architecture. Based on the evidence, the remaining work is governance + implementation + certification.

---
*This document is the convergence of Stages 1–5 audits + Stage 6 specifications. It is the last investigative artifact; everything after is implementation verified against these specs.*
