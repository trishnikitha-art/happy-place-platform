# PROJECTION_POLICY — Constitutional Specification (P1)

**Role:** Governs projections — the largest replay risk.
**Status:** Normative governance. Enforceable. Supports deterministic replay.
**Evidence tags:** [E:file]=committed audit.

---

## 1. Projection Authority
A projection is owned by the authority that defines it:
- PING owns runtime projections (replay consumers).
- HPOS owns business projections (gallery, pages, admin views).
Authority is recorded on every projection row. [E:primitives/RUNTIME_PRIMITIVE_CATALOG.md Projection]

## 2. Tenant Scope
Every projection row MUST carry `tenant_id`. Queries are scoped by tenant. Cross-tenant projection is **forbidden**. [E:governance/CONSTITUTIONAL_GOVERNANCE_AUDIT.md Tenant Isolation]

## 3. Derived Status
Projections are **DERIVED** — fully reconstructable from the event log + witness. They are never a source of truth. (Collapse the duplicate PING projection engine; one canonical projector. [E:primitives/DUPLICATE_PRIMITIVE_REPORT.md D2])

## 4. Rebuild Rules
Any projection may be dropped and rebuilt from the event log. Rebuild is deterministic given (`tenant`, `authority`, `schema_version`). Rebuild MUST reproduce the prior certified `content_hash`.

## 5. TTL
Optional cache TTL for performance. Underlying state is ALWAYS reconstructable from events; TTL expiry never loses truth.

## 6. Deletion
Delete via `tombstone` event. Projection drops the corresponding row. Events are **never** hard-deleted. [E:EVENT_SCHEMA_POLICY.md Replay Constraints]

## 7. Cross Tenant Rules
- A projection row may reference only its own `tenant_id`.
- Relationship edges across tenants are forbidden; cross-tenant linkage uses **provider references**, not tenant data. [E:CUSTOMER_IDENTITY_POLICY.md]
- A projection MUST NOT contain another tenant's `aggregate_id` except as a `provider` reference.

## 8. Embedding Requirements
If embeddings are used (future Knowledge), they are **derived artifacts**:
- content-hashed, `sourceReference` to the original,
- regenerable from source reference,
- embedding version tracked; drift handled by rebuild.
Embeddings are never the source of truth and never retain PII. [E:PII_RETENTION_POLICY.md Knowledge Restrictions]

## 9. Certification
A projection is **certified** when it exposes, on every row:
`tenant_id`, `artifact_id`, `content_hash`, `projection_version`, `derived_from`, `authority`
and is reproducible from replay. No projection exists without those fields.

## 10. Enforcement
A projection row missing any §9 field is non-conforming and MUST be rebuilt (not patched). This eliminates replay drift — the core risk this policy closes.

---
*Cross-reference: EVENT_SCHEMA_POLICY (immutability), DETERMINISM_POLICY (rebuild determinism), REPLAY_CERTIFICATION_POLICY (certification), CONNECTOR_POLICY (derived artifacts).*
