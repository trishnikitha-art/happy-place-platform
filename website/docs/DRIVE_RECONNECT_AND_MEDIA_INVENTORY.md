# Drive reconnect and media inventory

Normal authorization requests offline access without forcing Google's consent screen.
The explicit recovery link uses `/api/drive/oauth/authorize?reconsent=1`. Both paths
still require Workbench authentication, browser-bound one-time state, the same Google
subject, and all existing required scopes. No Google credentials or redirect URI changed.

A callback without a new refresh token can update only an active authorization bound
to the current Workbench principal and Google subject, with a decryptable, nonempty
stored refresh token. Redis preserves the latest stored encrypted token atomically.
First authorization, revoked/expired authority, and unusable stored tokens require
fresh consent. A failed callback preserves the previously working browser connection.
Decryptability is local evidence, not proof Google has not revoked a token; an
`invalid_grant` during refresh still revokes authorization and its sessions.

## Idle lifetime and retention

Authenticated Drive operations and successful Drive auth-status checks renew the
same opaque browser cookie and server session to a sliding 30-day idle lifetime.
The atomic transaction checks the session ID, binding, expiration, revocation,
principal, Google subject, authorization status, and current subject index before
writing. The authorization's session index retains the existing 60-day safety TTL.
Encrypted authorization and subject-index retention is 365 days, independently of
browser expiry. Active requests renew that retention. This is an application storage
policy, never a claim about Google's token lifetime. No bulk migration or revival of
expired sessions occurs. Cookie renewal runs in authenticated route-handler contexts.

## Read-only inventory

`scripts/audit-production-media.ts` and the manually dispatched
`production-media-audit` workflow adapt the useful inventory from the historical
`fix/hpp-public-media-authority-20261008` branch. That branch was not merged.

The workflow requires a `production-read-only` environment with dedicated read-only
Redis and R2 credentials named in the workflow. It scans every production media key,
correlates the committed project catalog and live service/brand assignment and gallery
references, and records storage provider and original-object HEAD outcome. These
credentials must be configured before dispatch; writable production credentials are
not a substitute. No application getters that initialize authority are invoked.

Classification separates static paths, legacy Vercel Blob URLs, Drive references,
the configured canonical HTTPS R2 origin, and unknown providers. R2 404, authorization
failure, missing configuration and transport failure remain distinct. A hash or an
unrelated URL never establishes R2 ownership. HEAD alone never authorizes storage
promotion. The inventory does not verify persisted byte hashes or complete renditions
and cannot certify materialization. Unreferenced candidates are not deletion evidence.
The authenticated paginated audit returns every record on each page and a next offset.

## Projection and logging boundaries

Public graph filtering follows explicit project ownership in media records, project
media lists (including malformed nested links), image-node ownership, and graph edges.
Unresolved explicit ownership fails closed; intentional general media with no ownership
declaration remains supported. If all ownership evidence is absent, the graph cannot
infer hidden ownership. Inventory and review are still required before declaring privacy
for those historical records.

Lease tokens remain in Redis ownership/CAS checks, but are removed from logs and
contention responses. Workbench auth-status no longer logs the Cookie header. Google
refresh failures log only their permanent-failure classification, never SDK request
configuration that can contain credentials.

## Acceptance still required

Unit and isolated Redis tests exercise returning callbacks, concurrent token preservation,
expired/revoked/changed session rejection, cookie renewal and provider-aware diagnostics.
They do not prove a fresh production Google consent callback or a production ingest.
Final acceptance requires legitimate authenticated Workbench and Google sessions,
authorized Drive download, Sharp decoding and encoding, persisted R2 byte/rendition
verification, published metadata, CAS assignment and anonymous canonical rendering.
Historical successful materialization evidence remains separate from current-release
acceptance. Custom media domain cutover is not certified by this patch.
