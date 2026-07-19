"""Uploaded photos (before/during/after job documentation)."""
from __future__ import annotations

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.database.models.base import Base, TimestampMixin


class Photo(Base, TimestampMixin):
    __tablename__ = "photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    # which subfolder it lives in: before | during | after | estimate | documents
    category: Mapped[str] = mapped_column(String(50), index=True, default="during")
    # The actual Drive file id (source of truth — never the URL alone).
    drive_file_id: Mapped[str] = mapped_column(String(255), index=True)
    filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    taken_at: Mapped[str | None] = mapped_column(String(20), nullable=True)  # ISO date

    project: Mapped["Project"] = relationship(back_populates="photos")  # type: ignore[name-defined]
