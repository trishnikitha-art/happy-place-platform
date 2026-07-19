"""Event outbox / log.

Every domain event emitted on the bus is also persisted here (transactional
outbox pattern) so automation can be replayed and monitored. The `status`
field lets a worker retry failures — this is what makes the event system
durable and AI/automation friendly.
"""
from __future__ import annotations

from sqlalchemy import JSON, String, Integer
from sqlalchemy.orm import Mapped, mapped_column

from packages.database.models.base import Base, TimestampMixin


class EventLog(Base, TimestampMixin):
    __tablename__ = "event_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_type: Mapped[str] = mapped_column(String(100), index=True)
    aggregate_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    aggregate_id: Mapped[int | None] = mapped_column(nullable=True, index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|handled|failed
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str | None] = mapped_column(String(512), nullable=True)
