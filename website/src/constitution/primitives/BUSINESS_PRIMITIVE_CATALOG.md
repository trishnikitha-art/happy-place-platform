# Business Primitive Catalog (Stage 3 — HPOS)

**Scope:** Long-lived business primitives in Happy Place. **Tagging:** [O]=observed · [I]=inference.
**Status:** Already constitutional = instantiated as canonical object (validated) · Partially = config exists, object pending · Future = not yet modeled.

---

| Business Primitive | Canonical Object | Authority | Lifecycle | Relationships | Consumers | Producers | Status |
|--------------------|-----------------|-----------|-----------|---------------|-----------|-----------|--------|
| **Brand** | Brand [O] | hp-os/brand | constitutional | owns Service, Media | Site, SEO | Manual | **Already** |
| **Service** | Service (13) [O] | hp-os/service | constitutional | ownedBy Brand; contains Project; uses Pricing | Services page | Manual | **Already** |
| **Project** | Project (6) [O] | hp-os/project | constitutional | belongsTo Service; uses Media; contains Story | Project pages, Gallery | Manual | **Already** (PII seam deferred) |
| **Estimate** | *none* | hp-os/pricing (future) | future | usedBy Pricing | Estimator (future) | Manual/future | **Future** |
| **Photo / Media** | Media (24) [O] | hp-os/photo-librarian | constitutional | belongsTo Project/Service; supports Brand | Gallery, Hero | Upload + manual | **Already** |
| **Story** | Story (6) [O] | hp-os/story | constitutional | belongsTo Project; references Media | Project pages | Manual | **Already** |
| **Review** | Review (6) [O] | provider (Google/FB) | constitutional | belongsTo Service | Site, Trust | Manual [O] | **Already** (Reference) |
| **Material** | *config* `materials.v1.json` [O] | hp-os/material (+supplier ref) | future | usedBy Service | Estimator (future) | Manual | **Partially** |
| **FAQ** | *config* `faq.v1.json` (8) [O] | hp-os/faq | future | — | FAQ page | Manual | **Partially** |
| **Pricing Rule** | Pricing (13) [O] | hp-os/pricing | constitutional | belongsTo Service | Estimator | Manual | **Already** |
| **Customer Identity** | *none* | provider (Contacts) [A] | future | — | CRM (future) | Provider | **Future** (Reference) |
| **Project Status** | field on Project [O] | hp-os/project | constitutional (status) | — | Ops | Manual | **Already** (attribute) |
| **Before/After** | Story + Media roles [O] | hp-os/story / photo-librarian | constitutional | references Media | Gallery | Manual | **Already** (as pattern) |
| **Neighborhood** | *config* `cities.v1.json` (4) [O] | hp-os/coverage | future | contains Service area | SEO, Service area | Manual | **Partially** |
| **Campaign** | *none* | hp-os/marketing (future) | future | — | Marketing | Manual/future | **Future** |

---

## Notes

- **7 business primitives are Already constitutional** (Brand, Service, Project, Media, Story, Review, Pricing Rule) — 69 objects validated (GRAPH-INTEGRITY FAILURES: 0).
- **4 are Partially constitutional** (Material, FAQ, Neighborhood/Coverage) — config exists, canonicalization pending (same `instantiate()` path, no new abstraction).
- **4 are Future** (Estimate, Customer Identity, Campaign, and Customer) — not yet modeled; Customer/Customer Identity must be **Reference** (provider-owned), never HPOS-owned.
- **No business primitive requires a new primitive.** All map onto the canonical 7-field contract (Identity, Authority, Relationship, Lifecycle, Evidence, Metadata, Version History).

**Conclusion:** HPOS business primitives are overwhelmingly *already constitutional* or one `instantiate()` call away. Reduction is complete at the business layer.
