# Archive: 2026-07 Backend Prototype

## Why it was archived
This prototype was an **experimental, backend-first** build created before the
platform's architecture was settled. It proved out reliability patterns but was
organized around a single client and mixed concerns that don't fit the
generic, config-driven, frontend-first platform defined in the parent repo.
Rather than carry its structure forward, we **preserve it as reference** and
migrate only the infrastructure that earns its place.

## What should eventually be migrated (after review)
Only infrastructure with clear architectural value:
- **Durable outbox** — `enqueue` / `drain` / `retry_job`, exponential backoff,
  retryable-vs-permanent error classification, dead-letter queue.
- **Retry engine** + error classification.
- **Provider interfaces** — `CalendarProvider`, `DriveProvider`, `MailProvider`,
  `ContactsProvider` (so Google can be swapped for M365/CalDAV).
- **Append-only event log** (`EventLog`) for debugging timelines.
- **Observability** — structured logging persisted to the database (never Sheets).
- **Health checks** + **startup config validation** (fail-fast).
- **Configuration + logging core**.

## What should remain experimental
- Full domain models (customer/lead/project/appointment/...) — reconsider against
  the real backend schema before reuse.
- Workflow engine specifics — keep the *pattern*, re-derive the steps.
- Admin dashboard HTML — rebuild as a proper app when Phase 2 starts.

## Lessons learned
1. **Persist, then publish.** Never call an external API (Gmail/Drive/Calendar)
   inline in a request. Save business state first; run side effects via the outbox.
   A provider outage must never lose a lead.
2. **Make every step idempotent.** Reuse by natural key, `get_or_create` folders,
   dedup emails — so retries and replays never duplicate work.
3. **Mock by default in dev.** `GOOGLE_USE_MOCK=true` lets the whole stack run at $0.
4. **Logs belong in the database**, not a spreadsheet.
5. **Generic names win.** This prototype leaked client names into code; the new
   platform keeps all client specifics in configuration.
6. **Frontend must be decoupled.** Build it against mock services so the backend
   can arrive later without a rewrite.

> Original source preserved here. History (file contents, structure) is intact;
> only heavy local artifacts (`.venv`, caches, `*.db`) were removed.
