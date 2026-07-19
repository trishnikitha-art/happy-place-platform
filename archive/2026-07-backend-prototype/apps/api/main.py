"""API application — the business-action HTTP layer (not the admin UI).

Boot order (fail-fast):
  1. validate config (DB, Google, env vars) — abort before serving traffic
  2. init DB (create tables)
  3. register outbox job handlers + event automations
  4. start the background outbox worker (drains side-effects with retry/DLQ)
"""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from packages.core.config import settings
from packages.core.logging import get_logger, log_api
from packages.database import init_db
from packages.integrations.health import fail_fast
from packages.outbox import engine
from packages.outbox.jobs import register_default_jobs
from packages.events import bus, Events

log = get_logger("happyplace.app")


async def _worker_loop() -> None:
    """Background outbox worker. Drains pending jobs forever with backoff."""
    from packages.database import get_session

    while True:
        try:
            with get_session() as db:
                processed = await engine.drain(db, limit=20)
            if processed == 0:
                await asyncio.sleep(2)
        except Exception as exc:  # worker must never die
            log.error("outbox worker error", extra={"ctx": {"error": str(exc)}})
            await asyncio.sleep(5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log_api.info("starting up", extra={"ctx": {"environment": settings.environment}})
    fail_fast()  # abort now if misconfigured
    init_db()
    register_default_jobs()
    from packages.events.automation import register_automations

    register_automations()
    asyncio.create_task(_worker_loop())
    log_api.info("ready", extra={"ctx": {"mock": settings.google_use_mock}})
    yield
    log_api.info("shutting down")


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:8001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from apps.api import appointments, auth, customers, estimate, leads, ops, project, review  # noqa: E402

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(leads.router, prefix="/api/leads", tags=["leads"])
app.include_router(customers.router, prefix="/api/customers", tags=["customers"])
app.include_router(project.router, prefix="/api/projects", tags=["projects"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["appointments"])
app.include_router(estimate.router, prefix="/api/estimates", tags=["estimates"])
app.include_router(review.router, prefix="/api/reviews", tags=["reviews"])
app.include_router(ops.router, prefix="/ops/api", tags=["ops"])

# Operations / admin dashboard (separate UI, same process).
from apps.admin import app as admin_app  # noqa: E402

app.mount("/ops", admin_app, name="ops-ui")


@app.get("/health")
async def health() -> dict:
    from packages.integrations.health import health_summary

    return health_summary()
