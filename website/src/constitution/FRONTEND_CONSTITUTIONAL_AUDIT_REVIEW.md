# READ-ONLY REVIEW — HPP Frontend Constitutional Audit

**Mode:** Read-only. No implementation. No restructuring.
**Basis:** Verified against `happy-place-platform/website/src` this session (route files, `types/reviews.ts`, `lib/google-sheets.ts`, `config/reviews.v1.json`, `AGENTS.md`).
**Companion:** `NEXT_PHASE_PLANNING_REVIEW.md` (backend roadmap this frontend polish depends on).

---

## 1. Verification of the Spec's "Current Constitutional State" Claims

| Spec claim | Verdict | Evidence |
| --- | --- | --- |
| Review Authority architecture | ✅ Confirmed | `types/reviews.ts:113` (ReviewAuthority → ReviewPublisher → Website), `lib/google-sheets.ts:4`, `app/authority-editor/reviews` |
| Canonical data models | ✅ Confirmed | `config/reviews.v1.json`; 69 canonical objects in `constitution/objects/` |
| Generated project pages | ✅ Confirmed | `app/projects/[slug]/page.tsx` |
| Service-driven routing | ✅ Confirmed | `app/services/page.tsx`, `app/services/[slug]/page.tsx` |
| Estimate wizard | ✅ Confirmed | `app/estimate/page.tsx` |
| Reusable component library | ✅ Confirmed | `app/authority-editor/*` (services/projects/reviews/media/customers/estimates editors) |
| Centralized design system | ✅ Confirmed | cedar palette in `globals.css @theme` (per `AGENTS.md`) |
| Photo pipeline (filesystem authority) | ✅ Confirmed | `AGENTS.md` `photo-intake/` → `npm run images` → `gallery.json` |

**Conclusion:** the spec's assessment of current state is accurate. No overstatement detected.

---

## 2. Constitutional Violation Found (must fix before Patch C2/L)

`AGENTS.md` "Known Issues" records that **`layout.tsx` JSON-LD hardcodes `aggregateRating` with `reviewCount: "40"`**.

This directly violates the spec's own rule:
> **Do Not:** hardcode operational content
> **Success Criterion:** *no placeholder operational data remains*

And it blocks Patch C2 ("4.9 Average / 87 Reviews / Live values only") and Patch L (automation visibility) — those require canonical values from `reviews.v1.json` via ReviewAuthority, not a literal `"40"`.

**Action (for the implementer, not this review):** replace the hardcoded `aggregateRating` in `layout.tsx` with values derived from `reviews.v1.json` (the canonical source already consumed by ReviewAuthority). This is a one-line constitutional correction, not a redesign.

---

## 3. Freeze-Compatibility

The spec is **polish-only**:
- No component redesign, no competing UI system, no authority bypass. [E: spec "Do Not" list]
- Every Patch (A–M) is a UX refinement that consumes existing authorities (reviews, projects, services).
- "every page consumes constitutional data authorities only" is the success criterion.

**Verdict:** fully compatible with the frozen constitution. No architectural objection.

---

## 4. Backend Gating — the cross-cutting finding

Patches that surface **live operational data** depend on the backend event pipeline + PING automation (see `NEXT_PHASE_PLANNING_REVIEW.md`, ~60–70% complete):

| Patch | Feasible now? | Gate |
| --- | --- | --- |
| **C3** Live review pipeline | ✅ Yes | `reviews.v1.json` → ReviewAuthority → website already exists; remove placeholder data |
| **B2** Recent Activity | ⚠️ Partial | Project completion data exists in canonical objects; "Yesterday/3 days ago" needs event timestamps from backend |
| **B3** Live estimate queue | ❌ Gated | Requires event pipeline + PING automation (not yet built) |
| **L** Automation visibility | ❌ Gated | Requires PING automation + event pipeline |
| **M** Operational widgets | ❌ Gated | Requires backend automation to exist |

**Implication:** Phases 1–3 of the spec (reviews, trust, estimate UX, navigation, accessibility, performance) are **frontend-only and executable now**. Phase 4 (automation visibility, customer portal, operational widgets) is **backend-gated** — the frontend can ship skeleton/loading states (Patch I) now, but live values arrive only after the next-phase generators + PING automation land.

---

## 5. Patch-Specific Notes (read-only)

- **A (Estimate completion):** UX-only, no constitutional concern. Patch A4 ("first place customers experience HPP automation") should reflect the *real* pipeline (EstimateReceived → Reviewing → Planning → Scheduling) once backend exists.
- **C2 (aggregate):** values must come from `reviews.v1.json`, not hardcoded (ties to §2).
- **H (images):** `next/image` + blur + lazy aligns with existing `photo-intake` pipeline and Image QA gate (AGENTS.md Directive G). ✅
- **J (accessibility):** WCAG AA target is reasonable; verify cedar palette contrast (`evergreen #1F3F3C` on `linen #EDEAE0`) meets AA for body text.
- **K (mobile):** estimate wizard + photo uploads are the highest-risk mobile surfaces; consistent with AGENTS.md mobile review cadence.

---

## 6. Conclusion

The Frontend Constitutional Audit is **accurate and freeze-compatible**. The constitutional backbone it describes is real and verified. Two items require attention:

1. **Fix the hardcoded `reviewCount: "40"` in `layout.tsx`** (constitutional violation of the spec's own "no hardcoded operational content" rule).
2. **Treat Phase 4 (automation visibility) as backend-gated** — it cannot show live data until the next-phase event pipeline + PING automation exist.

Executing Phases 1–3 now raises the frontend toward the spec's 9.5–9.8 target without touching the constitution.

*Read-only review. No code changed.*
