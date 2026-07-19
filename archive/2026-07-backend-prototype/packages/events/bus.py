"""Lightweight, in-process event bus.

Events drive all automation. Publishers emit a domain event; handlers
subscribe by event type. Each event is also persisted to `event_log`
(transactional outbox) so automation is durable and replayable.

Design goals:
  * Every event is just a typed dataclass -> plain dict (AI/JSON friendly).
  * Handlers are independent and individually testable.
  * Swapping to a broker (Pub/Sub, Redis Streams) later means changing only
    the dispatcher, not the events or handlers.
"""
from __future__ import annotations

import abc
import dataclasses
import inspect
import json
import uuid
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone
from typing import Any, Union

from packages.core.logging import log_automation, log_workflow
from packages.database import session_scope

# A handler is sync or async, takes the event dict.
Handler = Callable[[dict], Union[None, Awaitable[None]]]


class EventBus:
    """In-process pub/sub. Register handlers, then emit events."""

    def __init__(self) -> None:
        self._handlers: dict[str, list[Handler]] = {}
        self._all_handlers: list[Handler] = []

    def subscribe(self, event_type: str, handler: Handler) -> None:
        self._handlers.setdefault(event_type, []).append(handler)

    def subscribe_all(self, handler: Handler) -> None:
        """Receive every event (e.g. for logging, metrics, AI observers)."""
        self._all_handlers.append(handler)

    async def emit(
        self,
        event_type: str,
        aggregate_type: str | None = None,
        aggregate_id: int | None = None,
        **payload: Any,
    ) -> dict:
        """Emit an event, persist it to the outbox, then run handlers."""
        event = {
            "event_id": uuid.uuid4().hex,
            "event_type": event_type,
            "aggregate_type": aggregate_type,
            "aggregate_id": aggregate_id,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        }
        self._persist(event)
        log_automation.info(
            "event emitted",
            extra={"ctx": {"event_type": event_type, "aggregate_type": aggregate_type, "aggregate_id": aggregate_id}},
        )
        await self._dispatch(event)
        return event

    def _persist(self, event: dict) -> None:
        # Best-effort durable outbox. Runs inside the app's session.
        try:
            from packages.database.models.event import EventLog
            from packages.database import session_scope

            with session_scope() as db:
                db.add(
                    EventLog(
                        event_type=event["event_type"],
                        aggregate_type=event["aggregate_type"],
                        aggregate_id=event["aggregate_id"],
                        payload=event["payload"],
                        status="pending",
                    )
                )
                db.commit()
        except Exception as exc:  # pragma: no cover - logging only
            log_workflow.warning("event outbox persist failed", extra={"ctx": {"error": str(exc)}})

    async def _dispatch(self, event: dict) -> None:
        handlers = self._handlers.get(event["event_type"], []) + self._all_handlers
        # Provide a DB session so handlers can enqueue outbox jobs transactionally.
        from packages.database import session_scope

        with session_scope() as db:
            for handler in handlers:
                try:
                    if inspect.iscoroutinefunction(handler):
                        await handler(event, db)
                    else:
                        handler(event, db)
                except Exception as exc:  # isolate handler failures
                    log_workflow.error(
                        "event handler failed",
                        extra={"ctx": {"event_type": event["event_type"], "handler": getattr(handler, "__name__", repr(handler)), "error": str(exc)}},
                    )
        # Mark the persisted event as handled (the append-only timeline stays).
        try:
            from packages.database.models.event import EventLog
            from packages.database import session_scope as _gs

            with _gs() as db2:
                row = db2.execute(
                    __import__("sqlalchemy").select(EventLog)
                    .where(EventLog.event_type == event["event_type"])
                    .order_by(EventLog.id.desc())
                    .limit(1)
                ).scalars().first()
                if row is not None:
                    row.status = "handled"
                    db2.commit()
        except Exception:
            pass

    def emit_sync(self, event_type: str, aggregate_type: str | None = None, aggregate_id: int | None = None, **payload: Any) -> dict:
        """Synchronous wrapper for non-async callers (e.g. scripts, tests)."""
        import asyncio

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None
        if loop:
            return asyncio.run(self.emit(event_type, aggregate_type, aggregate_id, **payload))
        # No running loop: run a fresh one.
        return asyncio.run(self.emit(event_type, aggregate_type, aggregate_id, **payload))


# ---- Event type constants (single source of truth) ----
class Events:
    LEAD_CREATED = "LeadCreated"
    PROJECT_FOLDER_CREATED = "ProjectFolderCreated"
    ESTIMATE_REQUESTED = "EstimateRequested"
    ESTIMATE_GENERATED = "EstimateGenerated"
    APPOINTMENT_SCHEDULED = "AppointmentScheduled"
    PROJECT_STARTED = "ProjectStarted"
    PHOTOS_UPLOADED = "PhotosUploaded"
    PROJECT_COMPLETED = "ProjectCompleted"
    REVIEW_REQUESTED = "ReviewRequested"
    REVIEW_RECEIVED = "ReviewReceived"


# Global default bus instance.
bus = EventBus()
