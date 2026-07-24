# Knowledge Consumption Matrix (Stage 8)

**Frozen spec:** Knowledge recommends. Knowledge never edits. Knowledge returns: Recommendations, Confidence, Evidence, Mission candidates, Improvement opportunities. HPOS executes.

**Status:** Knowledge Constitution is a **separate ownership domain, not yet built** [Backlog]. This matrix maps where its outputs *naturally enter* HPOS — using capabilities that already exist.

---

## Where Recommendations Enter HPOS

| HPOS Surface | Existing Injection Point [Observed] | Knowledge Output | Entry Form |
|--------------|--------------------------------------|------------------|-----------|
| **Marketing** | `seo.ts`, `gallery-presets.v1.json` | Content/SEO recommendations | Config proposal → human approve |
| **Pricing** | `services.v1.json` `capabilities` | Price/assumption recommendations | Pricing object update (human approve) |
| **Media** | `media.v1.json` (roles, eligibility) | Tag/eligibility recommendations | Photo-librarian wrap (auto, low-risk) |
| **SEO** | `seo.ts` | Keyword/structure recommendations | Config proposal |
| **Scheduling** | Google Calendar [Asserted] | Optimal-slot recommendations | Calendar event reference |
| **Operations** | `projects.v1.json` status | Workflow improvements | Mission candidate |
| **Estimator** | `services.v1.json` capabilities | Estimate drafting aid | Proposal (human approve) |
| **Customer Experience** | Reviews `reviews.v1.json` | Follow-up/review-request timing | Mission candidate |

---

## Knowledge Return Shape → HPOS Handling

| Knowledge Returns | HPOS Action | Gate |
|-------------------|------------|------|
| Recommendation | Apply to config/canonical object | Human approval for pricing/marketing; auto for media tags |
| Confidence | Stored on object `evidence` | Below threshold → defer |
| Evidence | Attached to recommendation | Always retained (provenance) |
| Mission candidate | Queued for HPOS execution | Human approval |
| Improvement opportunity | Logged to Knowledge Config | Informational |

---

## Key Findings

1. **HPOS already has the injection surfaces** — pricing rules, SEO config, media roles, feature flags are the natural destinations for Knowledge recommendations. No new storage needed.
2. **Knowledge never writes HPOS** — it returns proposals; HPOS (human-gated) applies them. Matches "Knowledge recommends / HPOS executes."
3. **Photo-librarian (Media) is the lowest-risk first consumer** — tags/eligibility are reversible and high-value; ideal first Knowledge module.
4. **No Replace.** Knowledge consumption is a **Wrap** over existing config authorities.

**Classification:** all Knowledge entry points = **Wrap** (over existing config). Knowledge itself = **Backlog** (separate domain, out of Stage 1 scope).
