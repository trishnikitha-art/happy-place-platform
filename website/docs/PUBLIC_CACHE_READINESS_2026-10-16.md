# Public rendering and cache readiness — October 16, 2026

Scope: six-file reconciliation on `codex/hpp-discovery-main-20261016`, based on verified main `0ad33343bdb4d1880aae731530bb5158ed29cc54`. The original isolated patch was based on `bec816bba99505af5c08a821c9c5ead8d512c880`, seven commits ahead of main. Those separate release commits are excluded here. Merge requires fresh review/checks and a verified automatic-production deployment hold; PRODUCTION remains HOLD. Google profile/review links were explicitly skipped. No production KV, R2, deployment or email writes are authorized by this investigation.

## Implemented prerequisite

Public HomePage no longer reads `searchParams`, Workbench sessions or staging receipts. Its four hero fields use the existing `TextCopy`/`TextPreviewProvider` path, preserving one editable marker per field, heading/link structure, copy authority and the same real homepage in the Workbench. The existing authenticated `/workbench/preview` route is the only staged-text entry; it validates staging/state and supplies the existing provider. No second page, preview authority or cache is introduced.

Shared HTML/data caching is **not enabled**. `force-dynamic` remains while public media depends on mutable runtime publication authority. Client hydration is not the reason for this restriction.

## Public dependency map

| Surface | Runtime dependencies |
| --- | --- |
| Every page | Root layout resolves homepage hero assignment/media again for business JSON-LD. |
| Home | Hero in metadata/body, owner portrait, five service assignments, review data/statistics, two featured projects and full media/gallery resolution. |
| Our Work | Public project list, each project's role media and effective gallery. |
| Services and detail | Service assignments/media; detail resolves featured and related projects, including repeated project resolution. |
| Project detail | Metadata/body independently resolve project role media/gallery. |
| Reviews | Bundled reviews/statistics plus the layout hero dependency. |

Project resolution already deduplicates promises within a batch. That does not deduplicate independent metadata/layout/body calls. The public media gate checks publication/placement, rejects Drive references and incomplete/stale records, and verifies required persisted R2 objects. Static-build/development fallback inputs differ from runtime KV inputs; build-time rendering cannot be assumed to preserve runtime assignments.

At this bundled baseline there are 11 projects, four public projects, two featured projects, 13 services, five homepage services, 25 media records and zero reviews. One media record uses R2. Its required object list causes up to 16 HEAD probes per successful gate invocation, including a repeated original check. These are source counts, not current production inventory or latency measurements.

## Invalidation participants

| Authority / effect | Existing writers that must participate |
| --- | --- |
| Assignments | Single CAS, atomic batch, direct deletion, cleanup/quarantine, brand/service/Workbench callers and reconciliation endpoints in `assignment-store.ts`. |
| Runtime promotion | Independent Lua/batch promotion in `deployment-transaction.ts`, invoked after retained Git verification by `/api/admin/deploy`. Redis atomicity does not make deployment or cache invalidation atomic. |
| Galleries and visibility | Independent CAS/Lua mutations, bootstrap/initialization, gallery/card/before-after edits and separate gallery/visibility revisions. |
| Publication and deployed content | Content/text staging and Git deployment change archive/hidden/draft state, ordering, copy, baseline assignments and placement policy. |
| Media records | Save/update/delete, ingestion/rematerialization, recovery/bootstrap/quarantine, cleanup/reconciliation, including raw Redis writes outside the ordinary helpers. |
| Persisted objects and configuration | R2 upload/deletion/maintenance, required renditions, canonical public origin/bucket and gate contract. |
| Maintenance scripts | Legacy bootstrap, restore, repair, synchronization and cleanup scripts bypass ordinary application writers. Reconcile or retire them explicitly before claiming complete invalidation. |

`getEffectiveProjectGallery()` currently self-initializes a missing production visibility record with Redis SET NX. A public GET reaching that branch is not guaranteed read-only. The old performance harness hardcodes the production origin and immediately fetches Home, so it was **not rerun** under the production-mutation hold.

An assignment reader also returns null after some Redis failures, and media resolvers can return null on infrastructure/proof failure. Wrapping those functions could cache absence/fallback. Conversely, caching a previously valid media result can retain an image after withdrawal or failed physical verification. Next.js ISR can keep the last successful output after revalidation fails; throwing does not universally guarantee a fresh 503.

## Acceptance criteria before any shared cache

1. Identify the existing namespace and deployed publication/content version in every key. Preview/Test/Production and old/new deployment inputs must never mix. A tag is an invalidation label, not a unique cache key.
2. Define the freshness and withdrawal contract explicitly. Keep preview/session data outside shared caches. Cache only the permitted public projection, never unpublished source references or an earlier gate approval as perpetual authority.
3. Account for every writer above, including promotion and maintenance. Invalidation must follow successful commit; failure is visible/recoverable. An older in-flight read must not repopulate an invalidated generation.
4. Prove healthy, absent, hidden, archived, stale, malformed and incomplete-rendition cases with a production-semantics fixture backend whose writer methods reject. Verify changed assignments/visibility/media and cross-environment/version isolation.
5. Test Redis outage, physical-object loss, failed invalidation, concurrent publish/withdraw and deployment rollback. Require the defined public outcome; do not silently weaken withdrawal semantics to obtain cache hits.
6. Compare repeated exact-input cold/warm requests and target/control routes. Retain headers, authority/HEAD call counts, response identity, LCP element and lab/field distinctions. A cache response header alone does not certify correctness or performance.

## Retained measurement evidence

The existing October 10 baseline and comparison reports and raw traces were inspected offline. Recalculation from the preserved Chrome network logs confirms median mobile-cold Home response-header completion of **2454.44 ms at `ef64922` → 1153.40 ms at `93febdc`** after previously shipped concurrent reads. Cold/warm here describe browser resource caches; server/CDN state was uncontrolled. This is historical evidence for another patch, not a current baseline or a caching improvement claim.

Original reports: `PERFORMANCE_BASELINE_2026-10-10.md` and `PERFORMANCE_COMPARISON_2026-10-10.md`. Recomputed samples, file digests and exact source groups are retained in this chat's `artifacts/hpp-discovery-20261016/offline-waterfall-review.json`.

The narrow next measured candidate is request-scoped repeated hero/media resolution, preserving next-request freshness. React 18.3.1 does not provide the stable React 19 `cache` API; do not add an unverified request cache, process-global promise map, new authority or framework upgrade just to implement this idea. Shared immutable bundled-review statistics offer little benefit while the review manifest is empty.

## Crawler implementation

Generated policy allows public portfolio/sitemap entries, excludes `/workbench`, `/api`, `/admin` and existing private roots, explicitly repeats those exclusions for OAI-SearchBot/PerplexityBot, and blocks GPTBot. This is crawl preference only; authentication remains the private access boundary. The original isolated base already allowed public projects; current main still excludes them. This reconciliation removes that exclusion without importing the held release PR sitemap or estimate changes. Main contact CTAs and sitemap remain unchanged.

Targeted tests render the real homepage through the existing text provider, reject anonymous/stale/unverified previews, and evaluate Next-generated robots against the sitemap and private route inventory. Exact test/build results and working-input identity are retained separately; local checks do not establish a deployed result.

Historical verification of the original bec816bb-based working patch, not fresh proof for this main-based reconciliation, on Node 24.19.0: 42 targeted tests passed; full Jest passed 1,155 tests with 26 existing skips; typecheck, lint, image QA and the production-mode build exited 0. Image QA retains existing stale-manifest/placeholder warnings. A loopback-only production-mode server with test namespace, no provider credentials and explicit `DEV_MODE_SKIP_KV` passed nine HTTP checks: robots/sitemap status and policy, public draft-query isolation, private preview redirect and private text API denial. This fixture bypasses runtime KV/R2 authority and is **not** a current production TTFB/LCP baseline or a real owner-session proof. Google item 3 remains skipped. Historical counts do not certify the current source. No production deployment is authorized.

## Fresh main-based reconciliation verification

On the six-file working tree based on `0ad33343bdb4d1880aae731530bb5158ed29cc54` (with no PR #6 commits), the current gate passed: 42 targeted tests; full Jest 1,113 passed and 26 existing skips (72 passed suites, four skipped); TypeScript, ESLint, image-reference tests, image QA, and the production-mode Next.js build all exited 0. Image QA still reports the existing stale-manifest and placeholder warnings. The exact commands, generated build inputs and output hashes are retained in the adjacent `main-reconciliation` evidence directory.

A local production-mode server with `DEV_MODE_SKIP_KV`, a test namespace, and no provider credentials passed ten HTTP assertions for robots/sitemap, crawler policy, public homepage copy, private preview redirect, private text API denial, and main's `/contact` sitemap entry. Next.js includes the requested query string in router bootstrap metadata; the HomePage component does not receive or read that query, and it performs no text-receipt lookup. The HTTP fixture confirms no staged receipt copy appears in the response. The preview route redirects anonymous users to `/workbench/login`. These local checks do not prove production KV/R2 authority, production cache safety, or live-session behavior. Shared caching remains disabled.

## Primary framework references

- [Next.js 15 caching](https://nextjs.org/docs/15/app/guides/caching)
- [Next.js 15 unstable_cache](https://nextjs.org/docs/15/app/api-reference/functions/unstable_cache)
- [ISR error and revalidation behavior](https://nextjs.org/docs/15/app/guides/incremental-static-regeneration)
- [Vercel cache response headers](https://vercel.com/docs/headers/response-headers#x-vercel-cache)
