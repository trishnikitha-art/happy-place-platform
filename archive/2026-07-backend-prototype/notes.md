# Archive notes — 2026-07 Backend Prototype

Snapshot taken: 2026-07. Preserved as a **reference implementation**, not a
starting point. See `README.md` in this folder for the full rationale.

## What was actually built (for reference)
- Python monorepo: `packages/` (core, database, events, integrations, outbox,
  workflows, observability, domains, auth) and `apps/` (api, admin).
- Durable outbox engine with retry + dead-letter.
- Event bus + append-only `EventLog`.
- Google service adapters (Drive/Calendar/Mail/Contacts) with in-memory mocks.
- Request-only workflows (validate → persist → commit → publish).
- Operations/admin dashboard (HTML + FastAPI router).
- pytest suite exercising the outbox/retry/idempotency model.

## Caveats
- Mixed client naming into code (violates the generic-platform rule).
- No frontend; backend-first before the product was defined.
- Domain models are speculative — do not reuse verbatim.
- Admin dashboard was hand-rolled HTML; rebuild properly in Phase 2.

## When to open this folder
Only when implementing the backend (Phase 1+). Copy *patterns*, not files.
