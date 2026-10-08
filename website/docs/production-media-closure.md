# Production media closure — 2026-10-08

This patch has local regression evidence. The complete production
Drive → R2 → gallery → Save → deploy → public image chain remains unproven.

## Authority contract

`isPublishedMediaAsset()` is a structural discriminator. Reading a stored record
does not make it assignable. `isPubliclyComplete()` is the final eligibility
predicate used by public resolution, the Workbench published list and deployment
verification. Hero, portrait, service-card and gallery assignment paths consume
the public resolver before accepting a mutation.

Static records must match a committed manifest asset's content hash and complete
variant mapping. Release image QA verifies those files exist. R2 records bind the
original object's address to the claimed hash and require
the full materialization shape and authenticated object existence plus anonymous
image access for all variant URLs, including required responsive widths. Missing
configuration, private/redirecting URLs, malformed records and failed probes
remain ineligible. `storage=blob` is rejected.

A SHA-shaped hash and an HTTP HEAD response do not prove a byte match. Explicit
`verifyPhysicalBytes` audits additionally download and hash the original. The
inventory records `contentByteMatch=not-audited`; it cannot justify a repair.

Gallery drops carry the parent's iframe generation. Slots consume only validated
operations; malformed native payloads preserve the bridge and project fallback.
The parent retains queue/acceptance authority and existing CAS, visibility and
batch Save behavior.

## Checked locally

- 499 default-suite tests passed; 8 existing tests remain skipped.
- 9 OAuth unit tests passed.
- 67 integration tests passed against a disposable real Redis 7.4 service via
  its Upstash-compatible HTTP transport. Lua, concurrency, encrypted credential
  storage, TTL and batch assignment executed against Redis, not a Redis mock.
  Google consent, tokens and the production account were not established by these tests.
- TypeScript and the optimized Next production build passed.
- Image QA passed: 234 files and 156 referenced image paths. It still reports
  existing manifest-age and placeholder warnings.
- Headless Chromium: 12 semantic drop cases; native local and Drive panel drops
  at center/edge/empty space; Hide/Save and Add/Save; 9 batch/retry/reload checks;
  public routes at 390/768/1280/1440px. Auth, Drive, persistence and deployment in
  the Workbench checks use isolated fixtures.
- The inventory CLI was exercised against a local Redis HTTP fixture. Duplicate
  scan entries were deduplicated; only GET and SCAN were issued; five records were
  classified. This is not a production count.
- The configured ESLint command is not coverage of these changed TypeScript
  files: the existing configuration ignores them.

## Production prerequisites and proof still required

The user-provided production Workbench password succeeded (HTTP 200). Runtime
configuration reports KV, encryption, Google client ID/secret/redirect URI,
Workbench and Blob variables present. Actual Redis PING succeeds. The deployed
commit and current remote main both report `a4c2837ada1d23680025589a6b5444df268f06c2`.
`bcb8e0f` is an ancestor of that main; saved media commit `a4c2837` is preserved.

OAuth initiation creates Redis state and the CSRF cookie, then redirects to
Google with the correct production callback. Google accepts the handoff and
requires account sign-in in the fresh test session. A Workbench login does not
create a Drive session. Existing production inventory reports two active
Google authorizations and six valid Drive sessions; it does not grant this
fresh browser access to those sessions. No existing session was impersonated.

Production inventory enumerated 130 records: 110 static, 19 legacy Blob records,
and one Drive source reference. The deployed inspection route skipped all 110
static records, failed exact accounting and classified the reference as missing
a hash. This patch fixes those diagnostic defects, deduplicates enumeration,
keeps transport/auth errors distinct from 404, and adds authenticated variable
presence flags. Static catalogue matching is explicitly not byte verification.

All 11 production effective galleries match their saved deployment baseline,
including Repairs revision 14 with its former final hero photo now first.
A background Chromium session on the actual production Workbench also exercised
last-to-first, first-to-last and nearby native pointer gestures. All four
gestures received real parent acknowledgements and stayed in one unsaved queue.
The original UI order was restored; Save/deploy were not invoked. This proves
production interaction, separately from the read-only persisted-order check.
110 records appear in the current published list; only 27 match the proposed
strict catalogue contract. Anonymous HEAD checked 101 distinct static image
URLs: 94 image responses and seven failures. The 83 catalogue discrepancies
include 70 non-SHA hash values; classification alone cannot approve, rewrite
or delete them. **These authority changes remain held in draft.** No production
media record was repaired, deleted or quarantined. R2 environment presence and
its actual bucket/public-origin mapping remain unverified by available routes.

A local HTTP test-server launch was rejected by automatic approval review with
only "blocked by policy". TypeScript, build, unit and real Redis integration
checks ran. Remote CI HTTP results must be recorded separately.

1. Obtain authenticated Vercel/Cloudflare access, determine the bucket's actual
   public address, and prove an uploaded object is anonymously accessible before
   setting `R2_PUBLIC_BASE_URL`. Do not infer it from an S3 endpoint.
2. Use the actual production account's consent flow. Prove callback Google `sub`,
   authorization ID, Workbench session binding, auth/status, discovery, My Drive
   and Shared Drive. An environment refresh token is not a production session.
3. Observe/force refresh through the application and prove the encrypted update
   retains the same authorization ID and subsequent Drive requests succeed.
4. Run the read-only inventory. Log-occurrence counts are not record counts.
   Investigate ambiguous records and orphan candidates; do not delete or rewrite
   them from classification alone. Confirm original/rendition byte and reference
   evidence before any separate repair.
5. Prove the real end-to-end gallery flow and negative cases before merging or
   declaring production complete.

## CI credential boundary

Regular CI now provisions an ephemeral Redis service and a pinned
`hiett/serverless-redis-http` transport. It uses test-only OAuth configuration,
Workbench password, encryption keys and a run/attempt-scoped namespace. No
Vercel Production or repository production credential is consumed. A real Redis
PING is required before tests or cleanup. This replaces the unprovisioned
`CI_*` secret requirement; production variables were never evidence of GitHub
Actions configuration. Google API consent is still a separate production proof.

The Tailwind compatibility layer aliases foreground, muted-foreground, muted,
card and destructive to the existing brand tokens through `@theme inline`.
Existing usages are preserved; generated CSS and dark-mode bindings are checked.

The separate manually dispatched `production-media-audit` workflow uses the
`production-read-only` environment, a Redis read-only token and R2 object-read
credentials. Configure its `PRODUCTION_*` secrets and verified public-base URL
variable in that environment. Provider permissions must actually be read-only;
secret names alone do not establish permission scope.

The audit tool also requires those dedicated read-only credentials when invoked
locally. It scans actual production media keys, records unique IDs, physical
observations and public eligibility, and outputs no raw metadata/credentials.
It has no mutation mode. Repair tooling and write credentials remain separate.
