"""Projects API router."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from packages.database import get_session
from packages.domains.projects import ProjectService

router = APIRouter()


class ProjectIn(BaseModel):
    customer_id: int
    title: str
    lead_id: int | None = None
    description: str | None = None
    service_type: str | None = None


@router.post("/")
async def create_project(payload: ProjectIn, db: Session = Depends(get_session)) -> dict:
    proj = ProjectService(db).create(**payload.model_dump())
    return {"id": proj.id, "title": proj.title, "stage": proj.stage.value}


@router.get("/")
async def list_projects(customer_id: int | None = None, db: Session = Depends(get_session)) -> list[dict]:
    return [{"id": p.id, "title": p.title, "stage": p.stage.value, "drive_folder_id": p.drive_folder_id} for p in ProjectService(db).list(customer_id=customer_id)]
