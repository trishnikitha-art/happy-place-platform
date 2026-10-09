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
live success only after the commit's Vercel status succeeds, the deployed canonical
value matches, and an uncached homepage request contains the reviewed value at the
corresponding verification anchor.

Unknown keys, missing fields, unsupported schemas, invalid plain text, conflicting
revisions, missing receipts, and receipt mismatches fail visibly. Failed pre-commit
transactions remain recoverable. A receipt with a commit SHA is reused for status
verification rather than submitting a duplicate Git commit. Post-Git coordinator
reconciliation is not fully automatic; inspect the retained transaction if promotion
or consume fails.

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
