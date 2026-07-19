"""Documents (estimates, contracts, invoices, warranties)."""
from __future__ import annotations

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.database.models.base import Base, TimestampMixin


class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    category: Mapped[str] = mapped_column(String(50), index=True, default="documents")
    doc_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # estimate|contract|invoice|warranty
    title: Mapped[str] = mapped_column(String(255))
    drive_file_id: Mapped[str] = mapped_column(String(255), index=True)
    filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    project: Mapped["Project"] = relationship(back_populates="documents")  # type: ignore[name-defined]
