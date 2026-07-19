"""Photo domain service (before/during/after documentation)."""
from __future__ import annotations

from sqlalchemy.orm import Session

from packages.database.models.photo import Photo


class PhotoService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def register(
        self,
        project_id: int,
        drive_file_id: str,
        category: str = "during",
        filename: str | None = None,
        mime_type: str | None = None,
        caption: str | None = None,
        thumbnail_url: str | None = None,
        taken_at: str | None = None,
    ) -> Photo:
        photo = Photo(
            project_id=project_id,
            drive_file_id=drive_file_id,
            category=category,
            filename=filename,
            mime_type=mime_type,
            caption=caption,
            thumbnail_url=thumbnail_url,
            taken_at=taken_at,
        )
        self.db.add(photo)
        self.db.commit()
        self.db.refresh(photo)
        return photo

    def list(self, project_id: int, category: str | None = None) -> list[Photo]:
        q = self.db.query(Photo).filter(Photo.project_id == project_id)
        if category:
            q = q.filter(Photo.category == category)
        return q.all()
