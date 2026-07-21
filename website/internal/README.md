# Internal — Operational Backend (separate from the static marketing site)

Per the architecture decision (marketing vs. operations), **`src/` never imports
from `internal/`**. The public site stays fast, focused, and emotionally
compelling. All operational capability lives here, behind well-defined
interfaces, and matures independently.

## Modules
```
sheets/schema.ts         Typed schema for the 10 operational Sheets (provenance on every row)
reviews/reviewAuthority.ts   ReviewAuthority — single source of truth, no duplicated review text
estimate/learning.ts     Estimate learning loop — collects actuals → competitive insights
estimate/engine.ts       SimpleKnowledgeEngine — conservative probability range (P2)
photo/metadata.ts        Photo v2 rich metadata + score-based selector (P7)
knowledge/               Versioned, dated, confidence-scored cost/permit/seasonal JSON
```

## Operational Sheets (Google Sheets = the DB, P3)
Customers · Projects · Quotes · Reviews · Photo Catalog · Follow Ups ·
Referrals · Estimate Analytics · Material Pricing · Knowledge Base.
Every row carries: `source`, `effectiveDate`, `confidence`, `lastVerified`.

## Review pipeline (P2/P5)
Project Complete → follow-up automation → internal satisfaction check →
Google review request → import → publish. The website reads only `published`
reviews; manual copying from Google is eliminated. `ReviewAuthority` is the
single reference for homepage, reviews page, aggregate rating, and emails.

## Estimate learning (P6)
Each estimate stores planning range + eventual actuals (accepted?, invoice,
profitability, materials, days). Over time this yields insights like
"Cedar fences in Albany average X days" — a genuine moat.

## Photo v2 (P7)
Richer per-image metadata (materials, techniques, mood, hero/homepage/gallery
scores, focal point). `selectByScore()` lets the homepage become score-driven
instead of hardcoded, once scores are populated — no regression in the meantime.

## Knowledge base (P10)
Versioned, dated, confidence-scored: Materials · Labor · Oregon Building
Practices · Permit Guidance · Supplier Costs · Seasonal Adjustments ·
Historical Estimates · Completed Projects · Confidence Models.
The engine can explain *why* it arrived at a planning range while showing the
customer only a simple estimate.

## Auth
OAuth lives in `src/lib/google.ts` (ACTIVE). The internal/ auth stub was deleted —
it was superseded by the active implementation. When Google features beyond Gmail
Send are activated, scopes are added to `src/lib/google.ts` at that time.
