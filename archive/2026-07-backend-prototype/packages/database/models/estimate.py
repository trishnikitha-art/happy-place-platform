"""Estimate records (the system of record for our business state).

Google Docs/Sheets is the authoring surface; this row is our durable record
of the estimate's status, amount, and the Drive file id of the generated doc.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.database.models.base import Base, TimestampMixin


class Estimate(Base, TimestampMixin):
    __tablename__ = "estimates"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    lead_id: Mapped[int | None] = mapped_column(ForeignKey("leads.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(30), default="draft")  # draft|sent|accepted|declined
    amount_cents: Mapped[int | None] = mapped_column(nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Drive file id of the generated estimate doc (Google is system of record for the doc).
    drive_file_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    project: Mapped["Project"] = relationship(back_populates="estimates")  # type: ignore[name-defined]
