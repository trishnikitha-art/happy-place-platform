# Automation Readiness (Stages 9–10)

**Stage 9:** repetitive workflow classification. **Stage 10:** enterprise maturity rating.
**Ratings:** Implemented · Foundation Exists · Backlog · Unknown.

---

## Stage 9 — Operational Automation Inventory

| Workflow | Current | Classification | Why |
|----------|---------|----------------|-----|
| Photo organization | Manual (IMAGE_CLASSIFICATION.csv) | **Low-Risk Automation** (candidate) | Tags reversible; photo-librarian wrap |
| Project creation | Manual JSON | **Human Assisted** | Structured; template-able |
| Folder creation | Manual (Drive) | **Low-Risk Automation** | Deterministic from project id |
| Estimate drafting | Manual | **Human Approval Required** | Financial; pricing sensitive |
| Proposal generation | Manual | **Human Approval Required** | Customer-facing |
| Review requests | Manual | **Low-Risk Automation** | Templated, gated |
| Media tagging | Manual | **Low-Risk Automation** | Reversible |
| Content generation | Manual | **Human Approval Required** | Brand voice |
| SEO updates | Manual (`seo.ts`) | **Human Approval Required** | Ranking impact |
| Marketing campaigns | Manual | **Human Approval Required** | Spend/brand |

---

## Stage 10 — Enterprise Maturity

| Dimension | Rating | Evidence |
|-----------|--------|----------|
| Identity | **Foundation Exists** | `oauth.v1.json`; no full IdP |
| Ownership | **Implemented** | 69 canonical objects, single explicit owner each |
| Business Objects | **Implemented** | 7 domains canonicalized; more in config |
| Administration | **Foundation Exists** | Config JSON + flags; no unified UI |
| Provider Integration | **Foundation Exists** | Google Workspace [Asserted]; Drive-backed media |
| Configuration | **Implemented** | `featureFlags.ts`, config JSON |
| Automation | **Foundation Exists** | Manual workflows; no execution engine yet |
| Observation | **Foundation Exists** (PING side) | EventEnvelope + Edge Runtime [Asserted]; HPOS emitter missing |
| Replay | **Foundation Exists** (PING side) | Event store + projection; HPOS replay client missing |
| Operational Intelligence | **Backlog** | Knowledge not built |
| Media Management | **Implemented** | Media system + classification + gallery |
| Marketing | **Implemented** | SEO + gallery + FAQs |
| Reporting | **Backlog** | No reporting surface |
| Deployment | **Implemented** | Vercel + status script |

---

## Conclusion

HPOS is **already an enterprise business platform at the data layer** (Ownership, Business Objects, Media, Marketing, Deployment = Implemented/Foundation). The missing maturity is **runtime** (Observation/Replay clients on HPOS side) and **intelligence** (Knowledge) — both are *wraps/adapters*, not rebuilds.

**Recommended next step (minimum, validates PING through a real workflow):**
Assimilate the **Media pipeline** as one vertical slice — Upload → Drive → Edge Observation → EvidenceEnvelope → PING → Media Analysis → Tags → HPOS Gallery. This exercises Observation, Replay, and a Knowledge recommendation (photo-librarian) without exposing PING to the customer, and preserves all existing media work.

**No Replace. Mostly Preserve/Wrap.**
