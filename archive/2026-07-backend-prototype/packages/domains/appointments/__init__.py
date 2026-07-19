"""Appointment domain service (estimates, site visits, work sessions)."""
from __future__ import annotations

from datetime import datetime
from sqlalchemy.orm import Session

from packages.database.models.appointment import Appointment
from packages.database.models.enums import AppointmentStatus


class AppointmentService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def book(
        self,
        customer_id: int,
        title: str,
        start_time: datetime,
        end_time: datetime | None = None,
        project_id: int | None = None,
        lead_id: int | None = None,
        location: str | None = None,
        notes: str | None = None,
        calendar_event_id: str | None = None,
    ) -> Appointment:
        appt = Appointment(
            customer_id=customer_id,
            title=title,
            start_time=start_time,
            end_time=end_time,
            project_id=project_id,
            lead_id=lead_id,
            location=location,
            notes=notes,
            status=AppointmentStatus.PROPOSED,
            calendar_event_id=calendar_event_id,
        )
        self.db.add(appt)
        self.db.commit()
        self.db.refresh(appt)
        return appt

    def get(self, appointment_id: int) -> Appointment | None:
        return self.db.get(Appointment, appointment_id)

    def link_calendar_event(self, appointment_id: int, calendar_event_id: str) -> Appointment | None:
        appt = self.get(appointment_id)
        if appt:
            appt.calendar_event_id = calendar_event_id
            appt.status = AppointmentStatus.CONFIRMED
            self.db.commit()
        return appt

    def list(self, customer_id: int | None = None, limit: int = 50) -> list[Appointment]:
        q = self.db.query(Appointment)
        if customer_id:
            q = q.filter(Appointment.customer_id == customer_id)
        return q.order_by(Appointment.start_time.desc()).limit(limit).all()
