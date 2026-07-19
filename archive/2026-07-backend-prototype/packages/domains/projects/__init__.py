"""Project domain service + Drive folder persistence."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from packages.database.models.enums import ProjectStage
from packages.database.models.project import Project, ProjectFolder


class ProjectService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        customer_id: int,
        title: str,
        lead_id: int | None = None,
        description: str | None = None,
        service_type: str | None = None,
        drive_folder_id: str | None = None,
    ) -> Project:
        proj = Project(
            customer_id=customer_id,
            lead_id=lead_id,
            stage=ProjectStage.LEAD,
            title=title,
            description=description,
            service_type=service_type,
            drive_folder_id=drive_folder_id,
        )
        self.db.add(proj)
        self.db.commit()
        self.db.refresh(proj)
        return proj

    def get(self, project_id: int) -> Project | None:
        return self.db.get(Project, project_id)

    def list(self, customer_id: int | None = None, limit: int = 50) -> list[Project]:
        q = select(Project)
        if customer_id:
            q = q.where(Project.customer_id == customer_id)
        return list(self.db.scalars(q.order_by(Project.id.desc()).limit(limit)))

    def set_drive_folder(self, project_id: int, folder_id: str) -> Project | None:
        proj = self.get(project_id)
        if proj:
            proj.drive_folder_id = folder_id
            self.db.commit()
        return proj

    def add_folder(self, project_id: int, folder_type: str, drive_folder_id: str, name: str) -> ProjectFolder:
        rec = ProjectFolder(
            project_id=project_id,
            folder_type=folder_type,
            drive_folder_id=drive_folder_id,
            name=name,
        )
        self.db.add(rec)
        self.db.commit()
        self.db.refresh(rec)
        return rec

    def get_folder(self, project_id: int, folder_type: str) -> ProjectFolder | None:
        return self.db.scalars(
            select(ProjectFolder).where(
                ProjectFolder.project_id == project_id,
                ProjectFolder.folder_type == folder_type,
            )
        ).first()
