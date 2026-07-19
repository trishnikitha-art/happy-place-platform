"""Durable Outbox — the backbone of reliability.

External side-effects (email, calendar, drive, review requests, AI) are NEVER
called inline during a request. The request path only: validate -> persist ->
commit -> publish a domain event. The event triggers automation which ENQUEUES
an outbox job. A background worker drains the outbox with retry + backoff and a
dead-letter queue. If the worker or Google crashes, nothing is lost: the job
stays pending and is retried (or parked in the dead-letter queue for a human).

This is the single most important reliability pattern in the system.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, String, Integer, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from packages.database.models.base import Base, TimestampMixin


class Outbox(Base, TimestampMixin):
    __tablename__ = "outbox"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Job type, e.g. "send_email", "create_calendar_event", "create_drive_folder".
    job_type: Mapped[str] = mapped_column(String(80), index=True)
    # Free-form payload (to_email, drive parent, etc.). Never secrets.
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    # Human-readable subject, e.g. "Confirmation email to jane@x.com".
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", index=True
    )  # pending|running|completed|dead|canceled
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=5)
    # ISO timestamp of the next permitted attempt (for backoff).
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_error: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    # Set once moved to dead-letter.
    last_error_class: Mapped[str | None] = mapped_column(String(80), nullable=True)
    permanent_failure: Mapped[bool] = mapped_column(Boolean, default=False)
    # Link back to the business object for traceability/replay.
    aggregate_type: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    aggregate_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
