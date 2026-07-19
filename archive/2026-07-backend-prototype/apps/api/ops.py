"""Operations API — powers the admin/operations dashboard.

Exposes the exact cards the steering asked for:
  * integration health (Google/Drive/Calendar/Mail/DB)
  * queue status (pending/running/completed/dead) + retry + cancel
  * dead-letter queue + retry button
  * event timeline (LeadCreated, EstimateSent, ...)
  * recent errors / workflow logs (from LogEntry, not Sheets)
  * config (editable values from ConfigEntry)
  * metrics (leads today, emails sent, etc.)
  * replay controls (rerun a lead/project's automation idempotently)
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from packages.database import get_session
from packages.database.models.outbox import Outbox
from packages.database.models.event import EventLog
from packages.database.models.configentry import ConfigEntry
from packages.integrations.health import health_summary
from packages.outbox import engine
from packages.workflows.replay import replay_lead, replay_project

router = APIRouter()


def _count(db, model, **filters):
    q = select(func.count()).select_from(model)
    for k, v in filters.items():
        q = q.where(getattr(model, k) == v)
    return db.execute(q).scalar_one()


@router.get("/health")
async def health(db: Session = Depends(get_session)) -> dict:
    return health_summary()


@router.get("/queue")
async def queue(
    status: str | None = Query(None),
    limit: int = 50,
    db: Session = Depends(get_session),
) -> dict:
    q = select(Outbox)
    if status:
        q = q.where(Outbox.status == status)
    q = q.order_by(Outbox.id.desc()).limit(limit)
    rows = db.execute(q).scalars().all()
    jobs = [
        {
            "id": r.id,
            "job_type": r.job_type,
            "subject": r.subject,
            "status": r.status,
            "attempts": r.attempts,
            "max_attempts": r.max_attempts,
            "next_attempt_at": r.next_attempt_at.isoformat() if r.next_attempt_at else None,
            "last_error": r.last_error,
            "permanent_failure": r.permanent_failure,
            "aggregate_type": r.aggregate_type,
            "aggregate_id": r.aggregate_id,
        }
        for r in rows
    ]
    return {
        "jobs": jobs,
        "summary": {
            "pending": _count(db, Outbox, status="pending"),
            "running": _count(db, Outbox, status="running"),
            "completed": _count(db, Outbox, status="completed"),
            "dead": _count(db, Outbox, status="dead"),
            "canceled": _count(db, Outbox, status="canceled"),
        },
    }


@router.post("/queue/{job_id}/retry")
async def retry(job_id: int, db: Session = Depends(get_session)) -> dict:
    ok = engine.retry_job(db, job_id)
    return {"ok": ok}


@router.post("/queue/{job_id}/cancel")
async def cancel(job_id: int, db: Session = Depends(get_session)) -> dict:
    job = db.get(Outbox, job_id)
    if job is None:
        return {"ok": False}
    job.status = "canceled"
    db.commit()
    return {"ok": True}


@router.get("/events")
async def events(limit: int = 50, db: Session = Depends(get_session)) -> list[dict]:
    q = select(EventLog).order_by(EventLog.id.desc()).limit(limit)
    rows = db.execute(q).scalars().all()
    return [
        {
            "id": r.id,
            "event_type": r.event_type,
            "aggregate_type": r.aggregate_type,
            "aggregate_id": r.aggregate_id,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/logs")
async def logs(
    log_type: str | None = Query(None),
    level: str | None = Query(None),
    limit: int = 50,
    db: Session = Depends(get_session),
) -> list[dict]:
    from packages.observability import recent

    return recent(db, log_type=log_type, level=level, limit=limit)


@router.get("/config")
async def config(db: Session = Depends(get_session)) -> list[dict]:
    rows = db.execute(select(ConfigEntry).order_by(ConfigEntry.category, ConfigEntry.key)).scalars().all()
    return [
        {"key": r.key, "value": r.value, "value_type": r.value_type, "description": r.description, "editable": r.editable, "category": r.category}
        for r in rows
    ]


class ConfigUpdate(BaseModel):
    value: str | None


@router.put("/config/{key}")
async def config_update(key: str, body: ConfigUpdate, db: Session = Depends(get_session)) -> dict:
    row = db.execute(select(ConfigEntry).where(ConfigEntry.key == key)).scalars().first()
    if row is None:
        return {"ok": False, "error": "unknown key"}
    if not row.editable:
        return {"ok": False, "error": "not editable from UI"}
    row.value = body.value
    db.commit()
    return {"ok": True, "key": key, "value": row.value}


@router.get("/metrics")
async def metrics(db: Session = Depends(get_session)) -> dict:
    today = datetime.now(timezone.utc).date()
    leads_today = db.execute(
        select(func.count()).select_from(__import__("packages.database.models.lead", fromlist=["Lead"]).Lead)
        .where(__import__("packages.database.models.lead", fromlist=["Lead"]).Lead.created_at >= today)
    ).scalar_one()
    emails_sent = _count(db, Outbox, job_type="send_email", status="completed")
    completed = _count(db, Outbox, status="completed")
    dead = _count(db, Outbox, status="dead")
    pending = _count(db, Outbox, status="pending")
    return {
        "new_leads_today": leads_today,
        "emails_sent": emails_sent,
        "jobs_completed": completed,
        "jobs_dead": dead,
        "jobs_pending": pending,
    }


@router.post("/replay/lead/{lead_id}")
async def replay_lead_endpoint(lead_id: int, db: Session = Depends(get_session)) -> dict:
    return await replay_lead(db, lead_id)


@router.post("/replay/project/{project_id}")
async def replay_project_endpoint(project_id: int, db: Session = Depends(get_session)) -> dict:
    return await replay_project(db, project_id)
