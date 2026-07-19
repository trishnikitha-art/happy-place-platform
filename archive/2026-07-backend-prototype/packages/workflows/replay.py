"""Workflow replay — re-run a business object's automation, idempotently.

If the outbox worker crashed or a Google integration was down, an admin can
replay a lead/project from the operations dashboard. Replay re-publishes the
domain event, which re-enqueues the same outbox jobs. Because the jobs use
get_or_create (Drive), dedup keys (email), and reuse-by-id (calendar event id),
replaying never creates duplicate folders, emails, or appointments.

This is exactly the "Replay Lead #142 -> Create Folder, Email, Calendar, Reminder"
button described for the operations dashboard.
"""
from __future__ import annotations

from typing import Any

from packages.events import Events, bus
from packages.core.logging import get_logger

log = get_logger("happyplace.workflow.replay")


async def replay_lead(db, lead_id: int) -> dict[str, Any]:
    """Re-emit LeadCreated for a lead so automation re-enqueues its jobs."""
    from packages.database.models.lead import Lead

    lead = db.get(Lead, lead_id)
    if lead is None:
        return {"ok": False, "error": "lead not found"}
    event = await bus.emit(Events.LEAD_CREATED, aggregate_type="lead", aggregate_id=lead.id, title=lead.title)
    return {"ok": True, "lead_id": lead.id, "event_id": event["event_id"]}


async def replay_project(db, project_id: int) -> dict[str, Any]:
    from packages.database.models.project import Project

    proj = db.get(Project, project_id)
    if proj is None:
        return {"ok": False, "error": "project not found"}
    event = await bus.emit(Events.PROJECT_STARTED, aggregate_type="project", aggregate_id=proj.id, title=proj.title)
    return {"ok": True, "project_id": proj.id, "event_id": event["event_id"]}


async def replay_event(db, event_type: str, aggregate_type: str, aggregate_id: int, **payload: Any) -> dict:
    event = await bus.emit(event_type, aggregate_type=aggregate_type, aggregate_id=aggregate_id, **payload)
    return {"ok": True, "event_id": event["event_id"]}
