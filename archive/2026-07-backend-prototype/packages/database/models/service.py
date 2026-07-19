"""Service catalog — the reusable list of services a business offers.

Configurable per deployment. A contractor, electrician, or plumber reuses the
same platform; only this catalog (plus branding) changes. This is what makes
the platform reusable across service businesses with zero code edits.
"""
from __future__ import annotations

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from packages.database.models.base import Base, TimestampMixin


class Service(Base, TimestampMixin):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(primary_key=True)
    # stable slug, e.g. "deck-build", "panel-upgrade" — config key not display.
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)  # carpentry|electrical|...
    active: Mapped[bool] = mapped_column(default=True)
    # average duration hint, lead-time, etc. — extension fields for automation.
    default_lead_time_days: Mapped[int | None] = mapped_column(nullable=True)
