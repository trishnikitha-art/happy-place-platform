# Capability Inventory & Assimilation Mapping (Stages 1–2)

**Rule:** Default classification = **Preserve**. *Replace* requires explicit evidence (none found).
**Evidence tags:** [Observed] = verified in repo · [Asserted] = context from frozen spec.

---

## Stage 1 — Capability Inventory

| # | Capability | Observed Reality | Canonical Owner | Current Implementation | Consumers | Producers | Confidence |
|---|-----------|-----------------|-----------------|----------------------|-----------|-----------|-----------|
| 1 | Brand | [Observed] `company.v1.json` + `brand.v1.json` | HPOS / brand | JSON config + Next components | Site, SEO | Manual | High |
| 2 | Services | [Observed] `services.v1.json` (13) | HPOS / service | JSON config | Services page, project filter | Manual | High |
| 3 | Projects | [Observed] `projects.v1.json` (6) | HPOS / project | JSON config (status, story, media) | Project pages, gallery | Manual | High |
| 4 | Stories | [Observed] story block in `projects.v1.json` | HPOS / story | JSON config | Project pages | Manual | High |
| 5 | Media | [Observed] `media.v1.json` (24) + `manifest.v1.json` + `IMAGE_CLASSIFICATION.csv` | HPOS / photo-librarian | JSON config + Drive-backed assets | Gallery, hero | Upload + manual classification | High |
| 6 | Reviews | [Observed] `reviews.v1.json` (6) | Provider (Google/FB/manual) | Local JSON copy of manual reviews | Site, trust | Manual entry | High |
| 7 | Pricing | [Observed] derived from `services.v1.json` `capabilities` | HPOS / pricing | JSON config (estimationAuthority, surface types) | Estimator (future) | Manual | High |
| 8 | SEO | [Observed] `seo.ts` | HPOS / seo (Knowledge recommends) | TS config | Pages, sitemap | Manual | High |
| 9 | Cities | [Observed] `cities.v1.json` (4) | HPOS / coverage | JSON config | Service area, SEO | Manual | High |
| 10 | Materials | [Observed] `materials.v1.json` (12) | HPOS / material (+ supplier ref) | JSON config | Estimator (future) | Manual | High |
| 11 | FAQ | [Observed] `faq.v1.json` (8) | HPOS / faq | JSON config | FAQ page | Manual | High |
| 12 | Feature Flags | [Observed] `featureFlags.ts` | HPOS / config | TS module | App runtime | Manual | High |
| 13 | OAuth | [Observed] `oauth.v1.json` | HPOS / admin (provider connection) | JSON config (scopes) | Admin, provider connect | Manual | High |
| 14 | Gallery | [Observed] `gallery.json` + `gallery-presets.v1.json` + Media | HPOS / gallery | JSON config referencing Media | Site | Manual | High |
| 15 | Deployment | [Observed] Vercel + `check-deployment-status.js` | HPOS / infra (Provider: Vercel) | Vercel build + status script | Ops | CI/CD | High |
| 16 | Canonical Objects | [Observed] `src/constitution/objects/` (69) | HPOS (constitutional) | TS modules deriving from config | Future Knowledge/observers | Boot-time derive | High |

**Asserted (not repo-verified by this audit):** Google Workspace workflow, GitHub Edge Observation Runtime, PostgreSQL/Qdrant infrastructure. Treated as context, not *Observed*.

---

## Stage 2 — Assimilation Mapping

| Capability | Classification | Rationale |
|-----------|----------------|-----------|
| Brand | **Preserve** | Already canonicalized (Brand object). No change. |
| Services | **Preserve** | Config + canonicalized. No change. |
| Projects | **Preserve** | Config + canonicalized. PII seam deferred (documented, not a rebuild). |
| Stories | **Preserve** | Canonicalized as Story. No change. |
| Media | **Wrap** | Photo-librarian is the constitutional authority; add observation emitter so uploads become EvidenceEnvelopes. Internals unchanged. |
| Reviews | **Reference** | Provider-owned words. Currently a local copy (duplication risk) → constitutional form stores source id + observed fields only. |
| Pricing | **Preserve** | Canonicalized as Pricing. Knowledge *recommends*; HPOS owns. |
| SEO | **Wrap** | HPOS owns; Knowledge recommends. Wrap recommendation→config proposal. |
| Cities | **Preserve** (Future object) | Config exists; canonicalize later (deferred domain). |
| Materials | **Preserve** (Future object) | Config exists; canonicalize later. |
| FAQ | **Preserve** (Future object) | Config exists; canonicalize later. |
| Feature Flags | **Preserve** | Config module; reuse as Runtime Configuration primitive. |
| OAuth | **Wrap** | Needs control-plane wrap (auth handshake, token storage) — see Admin Surface. |
| Gallery | **Preserve** | References Media; no rebuild. |
| Deployment | **Preserve** | Vercel pipeline intact. |
| Canonical Objects | **Preserve** | Foundation; do not extend contract. |

**Summary:** 11 Preserve · 4 Wrap (Media, SEO, OAuth, + Reviews-as-Reference-wrap) · 1 Reference (Reviews data) · 0 Replace. The architecture is overwhelmingly *already there*.
