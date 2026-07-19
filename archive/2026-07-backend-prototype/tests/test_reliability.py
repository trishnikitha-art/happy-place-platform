"""Integration tests for the reliability core:

  * outbox worker drains a job and completes it (with mock Google)
  * retryable failure -> backoff -> eventually dead-letter (no infinite loop)
  * permanent failure -> immediate dead-letter
  * lead workflow is request-only (persists, emits event) and idempotent
  * domain events are appended to the EventLog (timeline)
  * config validation / health runs

These use the in-memory Google mocks (GOOGLE_USE_MOCK=true) and a fresh
SQLite file per test, so they run with $0 cost and no network.
"""
from __future__ import annotations

import os
import tempfile

os.environ.setdefault("ENV_FILE", ".env.example")
os.environ.setdefault("GOOGLE_USE_MOCK", "true")

import pytest
import pytest_asyncio
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session

from packages.database.models.base import Base
from packages.database import init_db as _init_db  # noqa
from packages.outbox import engine
from packages.outbox.jobs import register_default_jobs


@pytest.fixture()
def db():
    """Fresh SQLite DB per test, also installed as the global engine so the
    event bus / outbox worker operate on the same database."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    eng = create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False}, future=True)
    Base.metadata.create_all(eng)
    from packages.database import set_engine

    set_engine(eng)
    TestingSession = sessionmaker(bind=eng, expire_on_commit=False)
    s = TestingSession()
    try:
        yield s
    finally:
        s.close()
        eng.dispose()
        os.remove(path)


@pytest.fixture(autouse=True)
def _register():
    register_default_jobs()
    yield


@pytest.mark.asyncio
async def test_outbox_completes_send_email(db):
    job = engine.enqueue(db, "send_email", {"to": "jane@example.com", "subject": "Hi", "html": "<p>hi</p>"},
                            subject="test")
    db.commit()
    assert job.status == "pending"
    processed = await engine.drain(db, limit=5)
    assert processed == 1
    db.refresh(job)
    assert job.status == "completed"


@pytest.mark.asyncio
async def test_retryable_failure_goes_to_dead_letter(db, monkeypatch):
    # Force the email handler to raise a retryable error (timeout-like).
    from packages.outbox import jobs

    async def boom(payload, db):
        raise TimeoutError("google timed out")

    monkeypatch.setitem(engine._JOB_HANDLERS, "send_email", boom)
    job = engine.enqueue(db, "send_email", {"to": "x@y.com", "subject": "s", "html": "h"}, max_attempts=3)
    db.commit()
    # Drain several times to simulate the worker looping with backoff.
    total = 0
    for _ in range(10):
        n = await engine.drain(db, limit=5)
        total += n
        if n == 0:
            break
    db.refresh(job)
    assert job.status == "dead"
    assert job.attempts == 3
    assert total >= 3


@pytest.mark.asyncio
async def test_permanent_failure_dead_letters_immediately(db, monkeypatch):
    from packages.outbox import jobs

    async def perm(payload, db):
        raise ValueError("invalid_email: malformed address")

    monkeypatch.setitem(engine._JOB_HANDLERS, "send_email", perm)
    job = engine.enqueue(db, "send_email", {"to": "bad", "subject": "s", "html": "h"}, max_attempts=5)
    db.commit()
    await engine.drain(db, limit=5)
    db.refresh(job)
    assert job.status == "dead"
    assert job.attempts == 1  # no retries on permanent


@pytest.mark.asyncio
async def test_admin_retry_requeues_dead_job(db, monkeypatch):
    from packages.outbox import jobs

    async def perm(payload, db):
        raise ValueError("invalid_email")

    monkeypatch.setitem(engine._JOB_HANDLERS, "send_email", perm)
    job = engine.enqueue(db, "send_email", {"to": "bad", "subject": "s", "html": "h"})
    db.commit()
    await engine.drain(db, limit=5)
    db.refresh(job)
    assert job.status == "dead"
    # Admin hits "Retry"
    ok = engine.retry_job(db, job.id)
    assert ok
    db.refresh(job)
    assert job.status == "pending"
    assert job.last_error is None


@pytest.mark.asyncio
async def test_lead_workflow_is_request_only_and_idempotent(db):
    """Lead workflow persists + emits; never calls Drive inline."""
    from packages.workflows.lead_workflow import run_lead_workflow
    from packages.database.models.lead import Lead
    from packages.database.models.customer import Customer
    from packages.database.models.event import EventLog
    from sqlalchemy import select

    r1 = await run_lead_workflow(db, title="Deck build", first_name="Jane", last_name="Doe", email="jane@example.com")
    assert r1["lead"] is not None
    lead_id = r1["lead"].id
    # Re-run with same input -> duplicate detected, no second lead.
    r2 = await run_lead_workflow(db, title="Deck build", first_name="Jane", last_name="Doe", email="jane@example.com")
    assert r2.get("duplicate") is True
    assert r2["lead"].id == lead_id
    # Exactly one LeadCreated event in the timeline.
    events = db.execute(select(EventLog).where(EventLog.event_type == "LeadCreated")).scalars().all()
    assert len(events) == 1
    # Exactly one customer (reused by email).
    custs = db.execute(select(Customer)).scalars().all()
    assert len(custs) == 1


@pytest.mark.asyncio
async def test_lead_creation_enqueues_outbox_jobs(db):
    """Automation must enqueue side-effects (email/contact/drive), not call them."""
    from packages.workflows.lead_workflow import run_lead_workflow
    from packages.database.models.outbox import Outbox
    from packages.events.automation import register_automations
    from packages.events import bus
    from sqlalchemy import select

    register_automations()
    await run_lead_workflow(db, title="Fence", first_name="Bob", last_name="Smith", email="bob@example.com")
    jobs = db.execute(select(Outbox)).scalars().all()
    types = {j.job_type for j in jobs}
    assert "send_email" in types
    assert "create_drive_folder" in types
    assert "create_contact" in types
    # No job should have been executed inline (all still pending here).
    assert all(j.status == "pending" for j in jobs)


def test_health_runs(db):
    from packages.integrations.health import health_summary

    h = health_summary()
    assert "checks" in h
    assert "healthy" in h


def test_ai_disabled_by_default(db):
    from packages.core.ai import get_ai_service

    ai = get_ai_service()
    assert ai.provider == "disabled"
