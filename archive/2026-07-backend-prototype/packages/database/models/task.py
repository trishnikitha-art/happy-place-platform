"""Tasks (internal to-dos, not customer-facing)."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from packages.database.models.base import Base, TimestampMixin
from packages.database.models.enums import TaskStatus


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(default=TaskStatus.TODO)
    due: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    assigned_to: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    # Optional linkage to business objects.
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True, index=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True, index=True)
    lead_id: Mapped[int | None] = mapped_column(ForeignKey("leads.id"), nullable=True, index=True)
