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

- 492 default-suite tests passed; 8 existing tests remain skipped.
- 9 OAuth unit tests passed. Real Redis and production Google integration have
  not been established by these tests.
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

The credential file at
`/home/nolan/projects/happy-place-platform/website/.env.local` was actually tried.
Its Google refresh token returned `invalid_grant`; its Workbench password returned
401 from production. It has no R2, Redis, Vercel or Cloudflare credentials.
No production record has been repaired, deleted or quarantined by this pass.

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

Regular CI no longer takes production credentials. Provision six dedicated test
secrets: `CI_KV_REST_API_URL`, `CI_KV_REST_API_TOKEN`, `CI_GOOGLE_CLIENT_ID`,
`CI_GOOGLE_CLIENT_SECRET`, `CI_GOOGLE_REDIRECT_URI`, `CI_ENCRYPTION_KEY`.
Use a separate test database and OAuth client, not renamed production values.
All six were absent in repository secret metadata when checked. The integration
job intentionally fails closed until provisioned; it is not disabled or mocked.

The separate manually dispatched `production-media-audit` workflow uses the
`production-read-only` environment, a Redis read-only token and R2 object-read
credentials. Configure its `PRODUCTION_*` secrets and verified public-base URL
variable in that environment. Provider permissions must actually be read-only;
secret names alone do not establish permission scope.

The audit tool also requires those dedicated read-only credentials when invoked
locally. It scans actual production media keys, records unique IDs, physical
observations and public eligibility, and outputs no raw metadata/credentials.
It has no mutation mode. Repair tooling and write credentials remain separate.
