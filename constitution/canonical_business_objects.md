# HPOS — Canonical Business Object Specification (Phase 1)

Status: FOUNDATION. Defines the universal object contract and the Phase 1 catalog.
Does not implement the graph, knowledge modules, mission engine, runtime, or integrations.
Those are deferred (see §6) so the boundary stays sound.

This document is the constitutional ownership specification for HPOS. It inherits
PING's constitutional kernel verbatim and adds the Happy Place business-object layer
on top. Nothing from PING is lost; the existing `website/src/config/*.json` files
become the seed instances of these objects (see §4).

---

## 0. Inheritance from PING (preservation — nothing lost)

HPOS reuses PING's constitutional primitives. Their *semantics* are copied; their
*implementation* is re-expressed in TypeScript where the runtime lives in TS.
These PING primitives are inherited and MUST NOT be redefined inside HPOS:

| PING primitive | HPOS expression | Audit owner |
|---|---|---|
| Constitution (10 laws) + event/command schemas | `constitution/` + object contract | Shared |
| Canonical Hashing + Witness + Canonical IDs | `canonicalId` (SHA-256 over identity fields) | Shared |
| Replay + Projection engine | version history + derived projections | Shared |
| Command Bus + Aggregate (CQRS/ES) | event-sourced object mutations | Runtime |
| Authority Enforcement | `owner` is exactly one authority | Runtime |
| Capability Leasing | `oauth.v1.json` capability + broker policy | Runtime / KC |
| Provider Transport + Inbox/Observation seam | integrations emit observations | Runtime / Shared |
| Registry Engine | object-type + relationship registries | Shared |
| Artifact Store | `metadata` referenced, not copied | Runtime |

Ownership domains (from the Phase II audit, now locked):
- **Knowledge Constitution** — learning, ontology, evidence synthesis, heuristics, platform policy, self-improvement. Never owns customer execution or raw client records.
- **PING Runtime** — deterministic execution, orchestration, replay, authority enforcement, capability invocation. Never owns long-term learning.
- **Client Systems (Providers)** — customer operational data, payments, communications, financials. Never owned by our platform.

---

## 1. Universal Canonical Business Object Contract

Every HPOS object (Layer A and Layer B) implements exactly seven fields. Each maps
to a PING primitive so the semantics are preserved.

| Field | Definition | PING primitive (preserved) |
|---|---|---|
| `canonicalId` | Content-addressed ID = SHA-256 over the object's constitutional identity fields (excluding infra timestamps) | `constitution/authority/` hashing |
| `owner` | Exactly one constitutional authority for the object class | `authority/` + Knowledge Constitution authority model |
| `relationships` | Typed, authority-scoped, provenance-tracked edges to other objects | `runtime/knowledge/` edge = Claim |
| `lifecycle` | State machine: unknown → observed → verified → trusted → constitutional → historical → archived → forgotten | PING event lifecycle + KC lifecycle |
| `evidence` | Every mutation carries an evidence reference (source + observer + witness + confidence) | `build_witness` + `runtime/evidence/` |
| `metadata` | Business attributes, stored as canonical bytes, referenced not copied | PING artifact bytes model |
| `version` + `versionHistory` | Immutable event stream; version = projection version + snapshot | `storage/postgres/models.py` Snapshot/ProjectionVersion |

Executable TypeScript encoding: `website/src/constitution/canonical-object.ts`
(type-only module; no runtime, no Next.js imports; safe to add without breaking the build).

---

## 2. Layer A — Constitutional / Platform Objects (inherited from PING)

These are NOT Happy Place business data. They are the operating-system layer.
Owners per the Phase II audit. HPOS does not redefine them; it adopts them.

| Object | Owner | Notes |
|---|---|---|
| Evidence | Knowledge Constitution | observation synthesis output |
| Observation | Shared seam / KC | continuous observation entry |
| Capability | Runtime (invoke) / KC (policy) | `oauth.v1.json` is the seed |
| Agent | Runtime (execute) / KC (define) | replaceable workers |
| Mission | KC (generate) / Runtime (consume) | Mission Engine output |
| Policy | Knowledge Constitution (Platform) | `featureFlags.ts` is the seed |
| Knowledge Article | KC (Platform/Business split) | institutional memory |
| Template | HPOS business (asset) / KC (platform) | reusable asset |

---

## 3. Layer B — Happy Place Business Objects (new in HPOS)

Owner classification:
- **HPOS** = truth lives in HPOS (canonical object owned here).
- **Provider-ref** = truth lives in an external system; HPOS holds a reference + observed claims, never raw data.

| Object | Owner | Key relationships | Lifecycle hint |
|---|---|---|---|
| Brand | HPOS (brand authority) | Services, Marketing, Operations | constitutional |
| Service | HPOS | Brand, Projects, Pricing, Marketing | active / retired |
| Project | HPOS | Service, Stories, Media, Reviews, Estimates, Customer | lead → estimate → active → complete → warranty → closed |
| Story | HPOS | Project, Media, Marketing | draft → published → archived |
| Media | HPOS (Photo Librarian authority) | Project, Story, Service, Homepage, Marketing | captured → curated → published → archived |
| Customer | HPOS (+ provider-ref contact) | Projects, Estimates, Reviews, Leads | prospect → active → churned |
| Lead | Provider-ref (CRM/Forms) | Customer, Project, Estimate | new → qualified → won/lost |
| Estimate | HPOS | Project, Customer, Service, Pricing | draft → sent → accepted → converted |
| Review | Provider-ref (Google/FB) | Project, Customer, Service | observed → responded → archived |
| Warranty | HPOS | Project, Customer | active → expired |
| Invoice | Provider-ref (external/acct) | Project, Customer, Payment | issued → paid → void |
| Payment | Provider-ref (Stripe) | Invoice, Customer | pending → succeeded → refunded |
| Appointment | Provider-ref (Google Calendar) | Customer, Project | scheduled → completed → cancelled |
| Location | HPOS | Projects, Coverage Area | active |
| Coverage Area | HPOS | Locations, Services | active |
| Supplier | Provider-ref (later) | Materials | active |
| Material | HPOS / Supplier-ref | Supplier, Pricing, Projects | active |
| Pricing Profile | HPOS | Service, Material, Coverage Area | draft → active → superseded |
| Campaign | HPOS | Marketing, Content Assets, Service | planned → active → complete |
| Content Asset | HPOS | Campaign, Story, Media, Marketing | draft → published → archived |
| FAQ | HPOS | Service, SEO, Marketing | active |
| SOP | HPOS | Operations, Service | active → superseded |

---

## 4. Seed Mapping — existing `src/config/*.json` → canonical objects

The repository already contains the seed data. Each existing file maps to a Layer B
object; the canonical layer wraps it without discarding anything.

| Existing file | Canonical object | Owner | Status |
|---|---|---|---|
| `company.v1.json` | Brand | HPOS | seed |
| `brand.v1.json` | Brand (visual identity) | HPOS | seed (merge with company as one Brand) |
| `services.v1.json` | Service | HPOS | seed |
| `projects.v1.json` | Project | HPOS | seed |
| `media.v1.json` | Media | HPOS (Photo Librarian) | seed |
| `reviews.v1.json` | Review | Provider-ref (Google/FB) | seed (observed) |
| `before-after.v1.json` | Story | HPOS | seed (derived from Project+Media) |
| `faq.v1.json` | FAQ | HPOS | seed |
| `cities.v1.json` | Coverage Area + Location | HPOS | seed |
| `materials.v1.json` | Material | HPOS / Supplier-ref | seed |
| `seo.ts` | Marketing / SEO | HPOS | seed |
| `navigation.v1.json` | Operation/Marketing structure | HPOS | seed (derived) |
| `manifest.v1.json` | Media manifest | HPOS | derived |
| `gallery.json` / `gallery-presets.v1.json` | Media projection | HPOS | derived |
| `oauth.v1.json` | Capability | Runtime / KC | seed (Layer A) |
| `featureFlags.ts` | Policy | KC (Platform) | seed (Layer A) |

Migration of these files into canonical instances is a later, explicit step. This
document only defines the contract they must satisfy.

---

## 5. CEO Principles encoded as invariants

1. **One source of truth** — every object has exactly one `owner` (HPOS or Provider-ref). No duplicated ownership.
2. **Evidence before automation** — every mutation carries `evidence` with a confidence tag.
3. **Small, composable agents** — Layer A objects are specialized, replaceable workers.
4. **Humans set policy; AI executes within policy** — `Policy` (KC) governs; runtime obeys.
5. **Business objects over files** — agents reason about these objects, not `*.json`/folders. The config files are seed data, not the model.
6. **Learning without owning customer data** — Provider-ref objects store references + claims, never raw client records.
7. **Every improvement becomes reusable** — object definitions are versioned and inherited from PING.

---

## 6. Deferred (sound boundary — NOT in this step)

- Phase 2: materialize the constitutional graph as a store (relationships become queryable edges).
- Phase 3: Knowledge Modules (Repository / Marketing / SEO / Photo Librarian / Visual Quality / Customer Journey / Pricing / Local Market / Operations / Financial / Reputation / Competitor Intelligence).
- Phase 4: Mission Engine (Knowledge generates missions; never edits).
- Phase 5: Agent Runtime + Low-Risk Autonomous Actions.
- Live integrations (Google Workspace / Stripe / GitHub) beyond reference pointers.

These require the object layer (this document + `canonical-object.ts`) to exist first.
Deferred to protect the boundary.
