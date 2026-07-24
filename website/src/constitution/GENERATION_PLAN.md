# Tenant OS Generation Plan (strategic pivot)

**Status:** PLAN ONLY. No generated code. Week 1 artifact (manifest) delivered; Weeks 2–4 scoped below.
**Source of truth:** `GENERATION_MANIFEST.yaml` (first-class constitutional artifact) + the 7 committed governance specs.

---

## 1. Strategic shift (condensed from 12 directives)

| Before | After |
|--------|-------|
| Build layers separately (Phase 1→6) | PING Kernel → Constitution → Manifest → Generator → everything below |
| HPOS re-implements runtime | PING owns Replay/Witness/Kernel/Repo/Event-recording/Authorities; Tenant OS adds only Identity/Mission/Evidence/Observation/Policies/Capabilities/Workflows |
| 6 phases | 3 sprints: (1) Constitutional Domain, (2) Capability Registry, (3) Generate everything |
| Hand-written planners | Planning in PING; Tenant OS emits *needs*, PING decides execution |
| Google/Stripe/Jobber referenced in code | Providers = drivers PING loads (like FS→NTFS/EXT4); Tenant OS names only capabilities |
| Services (MissionService…) | Declarative **authorities**; PING generates repos/services/events/APIs/tests |
| Knowledge as separate layer | Removed; Evidence→Observation→Claim→**Fact**, computed by PING at replay |
| Manual services | Generation Manifest → PING generates 80–90% → humans review → deploy |

## 2. Reconciliation with existing work (nothing wasted)

- **7 governance specs (`governance/*.md`)** become the **policy engine** the generator bakes in. The manifest's `policies:` list maps 1:1 to them (TenantIsolation→PROJECTION/REPLAY_CERT, Replay→EVENT_SCHEMA, Witness→DETERMINISM, Authorities/ReferenceNotCopy→CUSTOMER_IDENTITY/CONNECTOR, PIIRetention). They are not discarded — they are now enforced automatically.
- **69 canonical objects already built** (`constitution/objects/`, Phase 1) are the **seed/reference**: Project≈Mission, Media≈Evidence/Photo, Review≈Observation/Claim. The generator will *reproduce* them declaratively from the manifest — stop hand-maintaining them.
- **PING primitives already exist** (verified in prior audits): `EventEnvelope` (hashed event_id), `ReplayEngine` + fuzz harness, `build_witness`, `capability_broker`, outbox. The generator emits against these; no new runtime.
- **`CONSTITUTIONAL_SYNTHESIS.md`** three-domain model is *refined*: the separate "Knowledge Constitution" domain is folded into PING's replay-computed Facts. All other guarantees (replay, witness, tenant isolation, authorities, PII) are preserved.

## 3. Generation Manifest (delivered)

`GENERATION_MANIFEST.yaml` — machine-readable constitution consumable by PING agents directly:
- `authorities` (Identity/Mission/Evidence/Observation/Fact) — declared, not coded.
- `identities`, `missions`, `evidence`, `observations`, `claims`, `facts`.
- `capabilities` as driver interfaces; `providers` mapped separately (never in Tenant OS code).
- `planning`: tenant emits needs, PING decides.
- `event_model`: Command→Authority→Event→Projection, hashed event_id, witness, deterministic replay.
- `policies` linked to the 7 specs.
- `generate`: the artifact types PING produces.

## 4. Generator contract (what PING produces from the manifest)

For each authority/mission/capability, generate: repository (event-sourced), CQRS command/event handlers, projection (with `tenant_id`+`content_hash`), REST+GraphQL API, unit + **replay tests** (the fuzz harness verifies determinism). All generated code must pass the 7 policies by construction (e.g., every projection carries the required fields; every event is content-hashed + witnessed).

## 5. Four-week roadmap

| Week | Deliverable | Reuse / Notes |
|------|-------------|---------------|
| **1** | **Constitutional manifest** — Identity, Mission, Evidence, Observation, Capability contracts, Policies | ✅ DONE: `GENERATION_MANIFEST.yaml` + 7 specs as policy layer |
| **2** | **PING generator** produces repositories, events, APIs, projections, replay tests from manifest | Reuse `EventEnvelope`, `ReplayEngine`, `build_witness`; fix the import blockers (prior audit P0) first so generator output is testable |
| **3** | Plug Google/Stripe/Jobber/Twilio **adapters via Capability Registry** (drivers) | Tenant OS calls `Calendar.Schedule`, never `GoogleCalendar`; PING loads the driver |
| **4** | **End-to-end flow**: Estimate → Mission → Evidence → Observation → Fact → Planner → Capability Broker → Replay → Witness | First constitutional certification slice |

After Week 4 the platform is operational; everything after is incremental capability additions, not foundational engineering.

## 6. Non-goals (explicit)

- No hand-written `MissionService`/`EvidenceService`/`CustomerService`.
- No separate Knowledge layer, planner, or runtime in Tenant OS.
- No provider names inside Tenant OS code.
- No direct state mutation — only Command→Authority→Event→Projection.

## 7. Immediate next step (await go-ahead)

Week 1 is complete (manifest + policy layer committed). **Week 2** begins only after the PING import blockers from the prior audit (circular `authority↔event` import, missing `CanonicalHasher`, Hermes import) are resolved — because the generator's replay tests cannot run until imports are healthy. Recommend fixing P0 as the gate, then running the generator.

---
*This plan supersedes the phased layer-building approach. The 7 governance specs and 69 seed objects are preserved as policy engine + reference seed, not discarded.*
