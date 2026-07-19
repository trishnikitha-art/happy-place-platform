"""Appointments API — business action: book (persist, then schedule via outbox)."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from packages.domains.appointments import AppointmentService
from packages.core.config import settings
from packages.events import Events, bus
from packages.observability import record
from packages.outbox import engine
from packages.database import get_session

router = APIRouter()


class AppointmentIn(BaseModel):
    customer_id: int
    title: str
    start_time: datetime
    end_time: datetime | None = None
    project_id: int | None = None
    lead_id: int | None = None
    location: str | None = None
    notes: str | None = None


@router.post("/book")
async def book_appointment(payload: AppointmentIn, db: Session = Depends(get_session)) -> dict:
    """Business action: persist the appointment, then ENQUEUE the calendar event.

    The calendar event is NOT created inline — it runs in the outbox worker with
    retry + dead-letter. So a Google Calendar outage can never lose the booking.
    """
    appt = AppointmentService(db).book(**payload.model_dump())
    record("workflow", "INFO", f"appointment booked id={appt.id}", ctx={"appointment_id": appt.id}, db=db)
    # Enqueue the actual calendar creation.
    engine.enqueue(
        db,
        "create_calendar_event",
        {
            "appointment_id": appt.id,
            "summary": appt.title,
            "start": appt.start_time.isoformat(),
            "end": appt.end_time.isoformat() if appt.end_time else None,
            "location": appt.location,
            "description": appt.notes,
        },
        subject=f"Calendar: {appt.title}",
        aggregate_type="appointment",
        aggregate_id=appt.id,
    )
    # Domain event for any other automation.
    await bus.emit(Events.APPOINTMENT_SCHEDULED, aggregate_type="appointment", aggregate_id=appt.id, title=appt.title)
    return {"id": appt.id, "title": appt.title, "status": appt.status.value, "calendar_queued": True}


@router.get("/")
async def list_appointments(customer_id: int | None = None, db: Session = Depends(get_session)) -> list[dict]:
    rows = AppointmentService(db).list(customer_id=customer_id)
    return [{"id": a.id, "title": a.title, "start": a.start_time.isoformat(), "status": a.status.value, "calendar_event_id": a.calendar_event_id} for a in rows]
