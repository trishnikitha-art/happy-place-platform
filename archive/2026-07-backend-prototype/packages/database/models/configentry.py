"""ConfigEntry — runtime configuration stored in the database.

Only secrets stay in the environment (.env): OAuth secret, JWT secret, DB
password, encryption key. Everything *operational* (drive root folder, calendar
id, notification email, business hours, counties served, branding) is editable
from the admin UI and persisted here — not by editing .env on a server.

This is what makes client migration a config change, not a code change.
"""
from __future__ import annotations

from sqlalchemy import String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from packages.database.models.base import Base, TimestampMixin


class ConfigEntry(Base, TimestampMixin):
    __tablename__ = "config_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    # dotted key, e.g. "integrations.drive.root_folder", "business.name".
    key: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_type: Mapped[str] = mapped_column(String(20), default="string")  # string|int|bool|json
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # True => this value can be edited from the admin UI (vs env-only).
    editable: Mapped[bool] = mapped_column(Boolean, default=True)
    category: Mapped[str] = mapped_column(String(40), default="general", index=True)
