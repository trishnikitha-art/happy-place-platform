"""Leads API router (business-action oriented)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from packages.database import get_session
from packages.database.models.enums import LeadSource, LeadStatus
from packages.workflows.lead_workflow import run_lead_workflow

router = APIRouter()


class LeadIn(BaseModel):
    title: str
    first_name: str
    last_name: str
    email: EmailStr | None = None
    phone: str | None = None
    source: LeadSource = LeadSource.WEBSITE
    description: str | None = None
    service_type: str | None = None
    budget_range: str | None = None
    desired_timeline: str | None = None
    notes: str | None = None


@router.post("/create")
async def create_lead(payload: LeadIn, db: Session = Depends(get_session)) -> dict:
    """Business action: capture a new lead and run the lead lifecycle workflow."""
    result = await run_lead_workflow(db, **payload.model_dump())
    lead = result.get("lead")
    return {
        "lead_id": lead.id if lead else None,
        "customer_id": result.get("customer", None) and result["customer"].id,
        "drive": result.get("drive"),
        "suggested_estimate_time": result.get("suggested_estimate_time"),
        "workflow_ok": all(r.ok for r in result.get("_results", [])),
    }


@router.get("/")
async def list_leads(status: LeadStatus | None = None, db: Session = Depends(get_session)) -> list[dict]:
    from packages.domains.leads import LeadService

    leads = LeadService(db).list(status=status)
    return [{"id": l.id, "title": l.title, "status": l.status.value, "customer_id": l.customer_id} for l in leads]
