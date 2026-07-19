"""Appointments (estimates, site visits, work sessions)."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.database.models.base import Base, TimestampMixin
from packages.database.models.enums import AppointmentStatus


class Appointment(Base, TimestampMixin):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True, index=True)
    lead_id: Mapped[int | None] = mapped_column(ForeignKey("leads.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    status: Mapped[AppointmentStatus] = mapped_column(default=AppointmentStatus.PROPOSED)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Google Calendar event id (so we can update/cancel the real event later).
    calendar_event_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    assigned_to: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
