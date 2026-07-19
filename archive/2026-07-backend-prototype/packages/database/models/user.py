"""Platform users and roles.

Supports developer login today and future client Workspace login. Roles are
driven by configuration, never hardcoded per person.
"""
from __future__ import annotations

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from packages.database.models.base import Base, TimestampMixin
from packages.database.models.enums import Role


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Google subject id (sub) from the OAuth token — unique per Workspace.
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    picture_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    role: Mapped[Role] = mapped_column(default=Role.OFFICE)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Refresh token stored encrypted at rest in a real deployment.
    google_refresh_token: Mapped[str | None] = mapped_column(String(1024), nullable=True)
