# Business Object Status vs Canonical Object Contract (Stage 6)

**Contract:** 7 fields — `canonicalId`, `owner`, `relationships`, `lifecycle`, `evidence`, `metadata`, `versionHistory`. Defined in `website/src/constitution/canonical-object.ts`. **Never extended.**

**Evidence:** compliance of the 7 instantiated domains was verified by `OBJECT_INSTANTIATION_REPORT.md` (GRAPH-INTEGRITY FAILURES: 0, 69 unique IDs, 0 orphans).

---

## Compliance Classification

| Business Object | Source Authority | Status | Note |
|-----------------|------------------|--------|------|
| Brand | `company.v1.json` + `brand.v1.json` | **Already compliant** | Canonicalized (1 object) |
| Service | `services.v1.json` | **Already compliant** | Canonicalized (13) |
| Project | `projects.v1.json` | **Already compliant** | Canonicalized (6); PII seam deferred (documented) |
| Story | `projects.v1.json` (story block) | **Already compliant** | Canonicalized (6) |
| Media | `media.v1.json` | **Already compliant** | Canonicalized (24); photo-librarian owner |
| Review | `reviews.v1.json` | **Already compliant** | Canonicalized (6); owner = provider |
| Pricing | `services.v1.json` capabilities | **Already compliant** | Canonicalized (13) |
| FAQ | `faq.v1.json` | **Future object** | Config exists; canonicalize later (deferred domain) |
| Cities / Coverage | `cities.v1.json` | **Future object** | Config exists; canonicalize later |
| Materials | `materials.v1.json` | **Future object** | Config exists; canonicalize later |
| SEO | `seo.ts` | **Future object** | Config exists; canonicalize later |
| Customer | *none* | **Future object** (provider-ref) | Build as Reference only |
| Estimate | *none* | **Future object** | Build when estimator matures |
| Warranty / Invoice / Payment / Appointment / Lead / Campaign / ContentAsset / SOP / Location / Supplier | *none* | **Future object** | Deferred domains |

---

## Conclusion

- **7 of the core business objects are Already compliant** — the contract is proven against real data, not theoretical.
- **0 objects require an adapter** to the contract. The contract is sufficient; no redesign needed.
- Remaining objects exist as **config (Future object)** or are **not yet modeled (Future object)**. None require Replacement.
- Assimilation path: canonicalize the deferred config-backed objects (FAQ, Cities, Materials, SEO) using the *same* `instantiate()` path already built — no new abstraction.

**No contract change. Only classify.**
