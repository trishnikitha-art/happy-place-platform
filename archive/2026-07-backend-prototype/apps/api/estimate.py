"""Estimate API — business actions: request/send an estimate.

Estimate composition happens in Google Docs (system of record for the doc).
Our Estimate row is the system of record for status/amount. Sending enqueues
doc generation + a notification email via the outbox.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from packages.core.config import settings
from packages.database import get_session
from packages.database.models.enums import LeadStatus
from packages.domains.leads import LeadService
from packages.events import Events, bus
from packages.observability import record
from packages.outbox import engine

router = APIRouter()


class EstimateRequestIn(BaseModel):
    lead_id: int
    project_id: int | None = None
    service_type: str | None = None
    notes: str | None = None


@router.post("/request")
async def request_estimate(payload: EstimateRequestIn, db: Session = Depends(get_session)) -> dict:
    """Business action: open an estimate for a lead/project."""
    from packages.database.models.estimate import Estimate

    est = Estimate(
        lead_id=payload.lead_id,
        project_id=payload.project_id,
        status="draft",
        notes=payload.notes,
    )
    db.add(est)
    db.commit()
    db.refresh(est)
    if payload.lead_id:
        LeadService(db).update_status(payload.lead_id, LeadStatus.ESTIMATING)
    record("workflow", "INFO", f"estimate requested id={est.id}", ctx={"estimate_id": est.id}, db=db)
    await bus.emit(Events.ESTIMATE_REQUESTED, aggregate_type="estimate", aggregate_id=est.id, lead_id=payload.lead_id)
    return {"estimate_id": est.id, "status": est.status}


@router.post("/send")
async def send_estimate(
    estimate_id: int,
    amount_cents: int | None = None,
    body: str | None = None,
    db: Session = Depends(get_session),
) -> dict:
    """Business action: generate the doc (outbox) + mark the estimate sent."""
    from packages.database.models.estimate import Estimate
    from packages.database.models.customer import Customer
    from packages.database.models.lead import Lead

    est = db.get(Estimate, estimate_id)
    if est is None:
        return {"ok": False, "error": "estimate not found"}
    if amount_cents is not None:
        est.amount_cents = amount_cents
    est.status = "sent"
    est.sent_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    db.commit()

    lead = db.get(Lead, est.lead_id) if est.lead_id else None
    cust = db.get(Customer, lead.customer_id) if lead else None
    # Enqueue doc generation in Drive.
    engine.enqueue(
        db,
        "generate_estimate_doc",
        {
            "estimate_id": est.id,
            "project_id": est.project_id,
            "title": f"Estimate #{est.id}",
            "body": body or "Estimate details to be finalized.",
            "parent_folder_id": None,  # resolved at runtime from customer folder
        },
        subject=f"Generate estimate doc #{est.id}",
        aggregate_type="estimate",
        aggregate_id=est.id,
    )
    if cust and cust.email:
        engine.enqueue(
            db,
            "send_email",
            {"to": cust.email, "template": "lead_confirmation", "ctx": {"first_name": cust.first_name}},
            subject=f"Estimate email to {cust.email}",
            aggregate_type="estimate",
            aggregate_id=est.id,
        )
    record("workflow", "INFO", f"estimate sent id={est.id}", ctx={"estimate_id": est.id}, db=db)
    await bus.emit(Events.ESTIMATE_GENERATED, aggregate_type="estimate", aggregate_id=est.id, title=f"Estimate #{est.id}")
    return {"estimate_id": est.id, "status": est.status, "queued": True}
