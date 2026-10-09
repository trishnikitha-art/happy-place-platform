# Workbench text migration

The homepage headline has passed the production workflow: authenticated edit,
immutable Redis receipt, reload recovery, actual homepage preview, coordinator
commit, successful CI/Vercel deployment, and anonymous homepage verification.
The punctuation-only proof was restored through a second coordinator transaction.
Implementation: `ff4d731`; proof: `3ba07ae`; restoration: `e4a7d6a`.

## Registered fields

All four fields use `src/config/strings.v1.json` and render in `src/app/page.tsx`.
Their `data-text-key` attributes are verification anchors, not editing authority.
The server registry controls allowed keys and lengths; route destinations remain
code-owned. Initial wording is preserved exactly.

| Semantic key | Context | Maximum characters |
| --- | --- | --- |
| homepage.hero.title | Hero heading | 180 |
| homepage.hero.description | Hero introduction | 500 |
| homepage.hero.primaryAction | Contact button label | 80 |
| homepage.hero.secondaryAction | Our Work button label | 80 |

## Authority and deployment

`/api/workbench/text` requires the existing server Workbench session. Its POST
accepts `text.v1`, a known key, exact previous value, expected revision, and proposed
value. It writes the transaction and receipt atomically. A stage response is not
publication. The coordinator pins the Git base, validates revisions, claims the
batch, commits the canonical JSON, verifies the committed content, and consumes
staging through its existing transaction controls. Text has no runtime KV promotion.

`/workbench/preview?textTransaction=...` renders the actual homepage and requires
authentication. The public page reads bundled canonical text. The editor reports
live success only when the intended commit SHA and Vercel deployment ID agree
across the status response, authenticated deployed catalog, and uncached homepage
HTML. Both bundled and rendered values must equal the reviewed receipt. A newer
release with identical text cannot falsely verify the intended deployment.

Unknown keys, missing fields, unsupported schemas, invalid plain text, conflicting
revisions, missing receipts, and receipt mismatches fail visibly. Explicit approval
includes the exact immutable mutation; the coordinator compares it before claiming
and again against staged bytes. The dashboard reads server records for every state,
including committing, committed, failed, consumed, and cancelled.

Cancellation atomically checks the configured Workbench principal and transaction
state, retains a cancelled audit receipt, and removes only its staging key. Claimed
or committed receipts cannot be cancelled. Text-only reconciliation proves commit
reachability from main, transaction identity, exact text/revision, and absence of
semantic media changes before atomically consuming the retained receipt. It never
writes a second Git commit or promotes media. Uncertain claims without positive Git
proof, unreachable commits, or mixed media changes remain retained for investigation.
This is conservative recovery, not automatic rollback of every possible failure.

API failures distinguish invalid input (400), authentication/ownership (401/403),
missing receipts (404), conflicts (409), dependency failures (503), and unexpected
failures (500). Correlation IDs support diagnosis without exposing dependency secrets.
Unsaved text remains browser-local; saving creates durable server staging.

## Repeatable acceptance

`scripts/text-publishing.acceptance.mjs` exports an opt-in phased harness for a
signed-in CUA browser tab. Initialize; stage punctuation; recover from the server
dashboard after clearing the browser receipt; cancel; return to dashboard; stage;
approve; poll publication until live; return to dashboard; stage with `restore:true`;
approve; poll until live; finish. It asserts reload persistence, exact diff, actual
page preview, terminal server receipts, original wording, and no pending transaction.
The opt-in requires `allowLive:true`; CI does not modify production copy. CI tests
immutable approvals, stale/concurrent release rejection, error classification,
positive/negative recovery proofs, and cancellation/claim races in isolated Redis.

## Remaining migration

This is a connected first batch, not complete site-wide coverage. The historical
`STRING_HARVEST.json` contains 84 entries. Its proposed wording and old line numbers
are not current authority; `STRING_EXECUTION_MATRIX.md` was absent at this baseline.
The current AST scan found many additional candidates, including templates and
operator diagnostics. Each remaining field needs explicit semantic mapping,
classification, exact-wording preservation, route-specific actual-page preview,
validation, and verification. Do not globally replace matching English strings.
Interpolation and attributes require explicit contracts before being registered.
Drive OAuth work remains on hold for this text migration.
