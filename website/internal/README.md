# Internal / Pricing Engine (P2 — the moat)

This directory is **deliberately outside the public marketing site**. Per the
architecture decision (marketing vs. operations separation), the frontend in
`src/` never imports from here. When the backend matures, `/api/estimate`
swaps its mock mailto transport for a call into `pricing/engine.ts`.

## Principles
- **Knowledge, not AI.** Every number comes from versioned, dated, confidence-scored JSON in `knowledge/`.
- **A probability model, not a quote.** Outputs are conservative *ranges* with a confidence score and a risk score. No line items, no hourly rates, no fake precision.
- **Conservative bias.** Ranges lean toward the higher end so the formal estimate tends to meet or beat expectations.
- **Never hard-code prices** in code. All costs live in `knowledge/*.json`.

## Structure
```
pricing/
  types.ts        EstimateEngine interface + Inputs/Outputs + PricingAuthority
  engine.ts       SimpleKnowledgeEngine: composes authorities into a range
knowledge/
  materials/      cedar.json, trex.json, (stain.json, hardware.json, ...)
  labor/          fencing.json, (bathroom.json, deck.json, ...)
  oregoncosts/    permits.json, (wages.json, taxes.json, ...)
```

## Authorities (composition points)
PricingAuthority · MaterialAuthority · LaborAuthority · RegionalAuthority ·
OregonAuthority · InflationAuthority · ComplexityAuthority ·
SeasonalityAuthority · RiskAuthority — each contributes a confidence-weighted
factor to the final range. Stubbed authorities use conservative defaults today
and become their own knowledge files as data is collected.

## Next steps (deferred, its own project)
1. Expand `knowledge/` with real Oregon research (wages, Trex/TimberTech,
   Hardie, LP SmartSide, Sherwin-Williams/Benjamin Moore stain systems,
   demolition/dumpster/concrete/footings).
2. CRM timeline (inquiry → estimate → site visit → approval → completion → follow-up).
3. Review & referral automation (post-project feedback → Google review → photo permission → referral → maintenance reminder).
4. Photo intelligence: recommend strongest photos per service from metadata.
5. Analytics dashboard: conversion, quote acceptance, avg project value, response time.
