"""Projects and their Drive folder structure.

Each project owns a Drive customer folder. Subfolder IDs are stored in the
`project_folders` table so we never rely on folder names alone.
"""
from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.database.models.base import Base, TimestampMixin
from packages.database.models.enums import ProjectStage


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    lead_id: Mapped[int | None] = mapped_column(ForeignKey("leads.id"), nullable=True, index=True)
    stage: Mapped[ProjectStage] = mapped_column(default=ProjectStage.LEAD)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    service_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    contract_value: Mapped[int | None] = mapped_column(nullable=True)  # cents
    start_date: Mapped[str | None] = mapped_column(String(20), nullable=True)  # ISO date
    completion_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Root Drive folder for this project (created under the customer folder).
    drive_folder_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    customer: Mapped["Customer"] = relationship(back_populates="projects")  # type: ignore[name-defined]
    folders: Mapped[list["ProjectFolder"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    photos: Mapped[list["Photo"]] = relationship(back_populates="project")  # type: ignore[name-defined]
    documents: Mapped[list["Document"]] = relationship(back_populates="project")  # type: ignore[name-defined]
    estimates: Mapped[list["Estimate"]] = relationship(back_populates="project")  # type: ignore[name-defined]


# Canonical subfolder names. Stored as `folder_type` for id-based lookups.
PROJECT_FOLDER_TYPES = [
    "estimate",
    "before",
    "during",
    "after",
    "documents",
    "warranty",
]


class ProjectFolder(Base, TimestampMixin):
    __tablename__ = "project_folders"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    # Logical slot, e.g. "estimate", "before", "after", "documents", "warranty".
    folder_type: Mapped[str] = mapped_column(String(50), index=True)
    # Real Google Drive folder id.
    drive_folder_id: Mapped[str] = mapped_column(String(255), index=True)
    name: Mapped[str] = mapped_column(String(200))  # human-readable label snapshot

    project: Mapped[Project] = relationship(back_populates="folders")
