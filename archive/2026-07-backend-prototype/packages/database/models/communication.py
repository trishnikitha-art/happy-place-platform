"""Communication log — every email/SMS/call related to a customer or project.

Durable record of outreach. The message content lives in Gmail; this is our
index of what was sent, when, and why (so we never message blindly).
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from packages.database.models.base import Base, TimestampMixin


class Communication(Base, TimestampMixin):
    __tablename__ = "communications"

    id: Mapped[int] = mapped_column(primary_key=True)
    direction: Mapped[str] = mapped_column(String(10), default="outbound")  # inbound|outbound
    channel: Mapped[str] = mapped_column(String(20), default="email")  # email|sms|call|note
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True, index=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True, index=True)
    lead_id: Mapped[int | None] = mapped_column(ForeignKey("leads.id"), nullable=True, index=True)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Snippet / body reference. Full body stays in Gmail (system of record).
    snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Google message id (Gmail is system of record for the actual message).
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="sent")  # sent|delivered|failed|received
