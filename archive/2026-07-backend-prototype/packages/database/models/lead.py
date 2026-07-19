"""Lead records (inbound interest before it becomes a project)."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.database.models.base import Base, TimestampMixin
from packages.database.models.enums import LeadSource, LeadStatus


class Lead(Base, TimestampMixin):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id"), index=True, nullable=True
    )
    status: Mapped[LeadStatus] = mapped_column(default=LeadStatus.NEW)
    source: Mapped[LeadSource] = mapped_column(default=LeadSource.WEBSITE)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    service_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    budget_range: Mapped[str | None] = mapped_column(String(100), nullable=True)
    desired_timeline: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # When a lead converts to a project.
    converted_project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id"), nullable=True, index=True
    )
    assigned_to: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )
    next_action: Mapped[str | None] = mapped_column(String(255), nullable=True)
    next_action_due: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    customer: Mapped["Customer | None"] = relationship(back_populates="leads")  # type: ignore[name-defined]
