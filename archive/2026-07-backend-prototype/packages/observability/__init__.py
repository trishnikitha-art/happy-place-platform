"""Observability — structured logging that ALSO persists to the LogEntry table.

We keep the JSON stdout stream (for future Cloud Logging ingestion) AND an
append-only SQLite table (LogEntry) so the operations dashboard can show the
latest errors, workflow runs, and the business event timeline without ever
touching Google Sheets.

Levels: record() writes both to the Python logger and to the DB (best-effort).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from packages.core import logging as _logging
from packages.core.config import settings

_log = _logging.get_logger("happyplace.obs")


def record(
    log_type: str,
    level: str,
    message: str,
    *,
    ctx: dict[str, Any] | None = None,
    logger_name: str | None = None,
    outbox_id: int | None = None,
    db=None,
) -> None:
    """Emit to stdout logger AND persist a LogEntry (if a session is available)."""
    ctx = ctx or {}
    py_level = getattr(_logging.logging, level.upper(), _logging.logging.INFO)
    _log.log(py_level, message, extra={"ctx": {"log_type": log_type, **ctx}})
    if db is not None:
        try:
            from packages.database.models.logentry import LogEntry

            db.add(
                LogEntry(
                    log_type=log_type,
                    level=level.upper(),
                    logger=logger_name,
                    message=message,
                    ctx=ctx,
                    outbox_id=outbox_id,
                )
            )
            db.commit()
        except Exception as exc:  # never let logging break the request
            _log.warning("log_entry persist failed", extra={"ctx": {"error": str(exc)}})


def recent(db, log_type: str | None = None, level: str | None = None, limit: int = 50) -> list[dict]:
    from packages.database.models.logentry import LogEntry

    q = select(LogEntry)
    if log_type:
        q = q.where(LogEntry.log_type == log_type)
    if level:
        q = q.where(LogEntry.level == level.upper())
    q = q.order_by(LogEntry.id.desc()).limit(limit)
    rows = db.execute(q).scalars().all()
    return [
        {
            "id": r.id,
            "log_type": r.log_type,
            "level": r.level,
            "message": r.message,
            "ctx": r.ctx,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
