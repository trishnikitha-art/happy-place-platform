"""Activity log — append-only audit trail of everything that happens.

Prepared for future monitoring and analytics. Every workflow step and
automation event writes here.
"""
from __future__ import annotations

from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from packages.database.models.base import Base, TimestampMixin


class ActivityLog(Base, TimestampMixin):
    __tablename__ = "activity_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor: Mapped[str | None] = mapped_column(String(100), nullable=True)  # user/role/system
    action: Mapped[str] = mapped_column(String(100), index=True)  # e.g. "lead.created"
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[int | None] = mapped_column(nullable=True, index=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
