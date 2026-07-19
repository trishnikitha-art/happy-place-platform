"""Outbox engine — enqueue, drain, retry with backoff, dead-letter queue.

Reliability ordering (the non-negotiable):
    Request -> Validate -> Persist -> Commit -> Publish Event
                                                       |
                                                automation enqueues Outbox jobs
                                                       |
                                              background Worker drains them:
                                         attempt -> backoff -> attempt -> ... -> DLQ

Nothing external (Gmail/Calendar/Drive) is touched during the request. A failed
Google call can never lose a lead, estimate, or appointment, because the business
state was already committed before the side-effect was even attempted.
"""
from __future__ import annotations

import asyncio
import traceback
from collections.abc import Awaitable, Callable
from datetime import datetime, timedelta, timezone
from typing import Any

from packages.core.errors import FailureClass, classify
from packages.core import logging as _logging
from packages.database import get_session
from packages.database.models.outbox import Outbox
from packages.observability import record

log = _logging.get_logger("happyplace.outbox")

# job_type -> async handler(payload, db) -> None
_JOB_HANDLERS: dict[str, Callable[[dict, Any], Awaitable[None]]] = {}

BACKOFF_BASE = 2.0  # seconds; attempt n waits BACKOFF_BASE ** n
MAX_ATTEMPTS = 5


def register_job(job_type: str, handler: Callable[[dict, Any], Awaitable[None]]) -> None:
    _JOB_HANDLERS[job_type] = handler


def enqueue_for_event(
    db,
    event: dict,
    job_type: str,
    default_payload: dict | None = None,
    subject: str | None = None,
) -> Outbox:
    """Convenience: enqueue a job keyed to the event's aggregate."""
    payload = dict(default_payload or {})
    return enqueue(
        db,
        job_type,
        payload,
        subject=subject,
        aggregate_type=event.get("aggregate_type"),
        aggregate_id=event.get("aggregate_id"),
    )


def enqueue(
    db,
    job_type: str,
    payload: dict,
    *,
    subject: str | None = None,
    aggregate_type: str | None = None,
    aggregate_id: int | None = None,
    max_attempts: int = MAX_ATTEMPTS,
) -> Outbox:
    """Create a durable outbox job (pending). Persisted in the caller's txn."""
    job = Outbox(
        job_type=job_type,
        payload=payload,
        subject=subject,
        status="pending",
        attempts=0,
        max_attempts=max_attempts,
        next_attempt_at=datetime.now(timezone.utc),
        aggregate_type=aggregate_type,
        aggregate_id=aggregate_id,
    )
    db.add(job)
    db.flush()
    record(
        "system",
        "INFO",
        f"outbox enqueued: {job_type}",
        ctx={"job_id": job.id, "subject": subject, "aggregate_type": aggregate_type, "aggregate_id": aggregate_id},
        db=db,
    )
    return job


def _backoff_delay(attempts: int) -> datetime:
    seconds = BACKOFF_BASE ** attempts
    return datetime.now(timezone.utc) + timedelta(seconds=seconds)


async def _run_job(job: Outbox, db) -> None:
    handler = _JOB_HANDLERS.get(job.job_type)
    if handler is None:
        raise RuntimeError(f"no handler registered for job_type={job.job_type}")
    await handler(job.payload, db)


async def process_one(db) -> bool:
    """Process a single due pending job. Returns True if one was processed."""
    now = datetime.now(timezone.utc)
    job = (
        db.execute(
            __import__("sqlalchemy").select(Outbox)
            .where(Outbox.status == "pending")
            .where(Outbox.next_attempt_at <= now)
            .order_by(Outbox.next_attempt_at.asc())
            .limit(1)
        )
        .scalars()
        .first()
    )
    if job is None:
        return False

    job.status = "running"
    job.attempts += 1
    db.commit()

    try:
        await _run_job(job, db)
        job.status = "completed"
        job.next_attempt_at = datetime.now(timezone.utc)
        record("system", "INFO", f"outbox completed: {job.job_type}", ctx={"job_id": job.id}, db=db)
        db.commit()
        return True
    except Exception as exc:  # noqa: BLE001 - classify and route
        klass = classify(exc)
        job.last_error = f"{type(exc).__name__}: {exc}"
        job.last_error_class = type(exc).__name__
        if klass is FailureClass.PERMANENT or job.attempts >= job.max_attempts:
            job.status = "dead"
            job.permanent_failure = klass is FailureClass.PERMANENT
            record(
                "system",
                "ERROR",
                f"outbox DEAD-LETTER: {job.job_type}",
                ctx={"job_id": job.id, "error": job.last_error, "permanent": job.permanent_failure},
                outbox_id=job.id,
                db=db,
            )
        else:
            job.status = "pending"
            job.next_attempt_at = _backoff_delay(job.attempts)
            record(
                "system",
                "WARNING",
                f"outbox retry scheduled: {job.job_type}",
                ctx={"job_id": job.id, "attempt": job.attempts, "error": job.last_error, "next": job.next_attempt_at.isoformat()},
                outbox_id=job.id,
                db=db,
            )
        db.commit()
        return True


async def drain(db, limit: int = 50) -> int:
    """Process up to `limit` due jobs. Returns count processed."""
    processed = 0
    for _ in range(limit):
        if not await process_one(db):
            break
        processed += 1
    return processed


def retry_job(db, job_id: int) -> bool:
    """Admin 'Retry' button: requeue a dead/canceled job."""
    job = db.get(Outbox, job_id)
    if job is None:
        return False
    job.status = "pending"
    job.next_attempt_at = datetime.now(timezone.utc)
    job.last_error = None
    job.permanent_failure = False
    db.commit()
    record("system", "INFO", "outbox manually retried", ctx={"job_id": job_id}, db=db)
    return True


def dead_letter_count(db) -> int:
    return db.execute(__import__("sqlalchemy").select(__import__("sqlalchemy").func.count()).select_from(Outbox).where(Outbox.status == "dead")).scalar_one()


def pending_count(db) -> int:
    return db.execute(__import__("sqlalchemy").select(__import__("sqlalchemy").func.count()).select_from(Outbox).where(Outbox.status == "pending")).scalar_one()
