"""Project API — business action: start a project (creates folder set via outbox)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from packages.core.config import settings
from packages.database import get_session
from packages.database.models.enums import ProjectStage
from packages.domains.projects import ProjectService
from packages.events import Events, bus
from packages.outbox import engine
from packages.observability import record

router = APIRouter()


class ProjectStartIn(BaseModel):
    customer_id: int
    title: str
    lead_id: int | None = None
    service_type: str | None = None
    description: str | None = None


@router.post("/start")
async def start_project(payload: ProjectStartIn, db: Session = Depends(get_session)) -> dict:
    """Business action: persist the project, then ENQUEUE the Drive folder set."""
    proj = ProjectService(db).create(**payload.model_dump())
    record("workflow", "INFO", f"project started id={proj.id}", ctx={"project_id": proj.id}, db=db)
    engine.enqueue(
        db,
        "create_drive_folder",
        {"project_id": proj.id, "customer_id": payload.customer_id},
        subject=f"Drive folder for project {proj.id}",
        aggregate_type="project",
        aggregate_id=proj.id,
    )
    await bus.emit(Events.PROJECT_STARTED, aggregate_type="project", aggregate_id=proj.id, title=proj.title)
    return {"project_id": proj.id, "stage": proj.stage.value, "folder_queued": True}


@router.post("/complete")
async def complete_project(project_id: int, db: Session = Depends(get_session)) -> dict:
    proj = ProjectService(db).get(project_id)
    if proj is None:
        return {"ok": False, "error": "project not found"}
    proj.stage = ProjectStage.COMPLETED
    db.commit()
    await bus.emit(Events.PROJECT_COMPLETED, aggregate_type="project", aggregate_id=proj.id, project_id=proj.id)
    return {"project_id": proj.id, "stage": proj.stage.value}
