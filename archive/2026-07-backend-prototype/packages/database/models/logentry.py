"""LogEntry — append-only, human-readable system logs (the audit trail).

Three logical logs live here, distinguished by `log_type`:
  * system  — API calls, integration health, startup checks
  * workflow — workflow/step execution
  * audit   — business events timeline (LeadCreated, EstimateSent, ...)

These are for debugging and the operations dashboard — NOT dumped into Google
Sheets. Office staff see a friendly UI over this table, never raw JSON.
"""
from __future__ import annotations

from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from packages.database.models.base import Base, TimestampMixin


class LogEntry(Base, TimestampMixin):
    __tablename__ = "log_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    log_type: Mapped[str] = mapped_column(String(20), default="system", index=True)  # system|workflow|audit
    level: Mapped[str] = mapped_column(String(10), default="INFO", index=True)
    logger: Mapped[str | None] = mapped_column(String(80), nullable=True)
    message: Mapped[str] = mapped_column(Text)
    # Structured context (customer_id, job_id, integration, ...).
    ctx: Mapped[dict] = mapped_column(JSON, default=dict)
    # Set when this log line corresponds to a failed/outbox job (for the UI).
    outbox_id: Mapped[int | None] = mapped_column(nullable=True, index=True)
