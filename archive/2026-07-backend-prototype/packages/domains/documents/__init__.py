"""Document domain service (estimates, contracts, invoices, warranties)."""
from __future__ import annotations

from sqlalchemy.orm import Session

from packages.database.models.document import Document


class DocumentService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def register(
        self,
        project_id: int,
        drive_file_id: str,
        title: str,
        category: str = "documents",
        doc_type: str | None = None,
        filename: str | None = None,
        mime_type: str | None = None,
        notes: str | None = None,
    ) -> Document:
        doc = Document(
            project_id=project_id,
            drive_file_id=drive_file_id,
            title=title,
            category=category,
            doc_type=doc_type,
            filename=filename,
            mime_type=mime_type,
            notes=notes,
        )
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def list(self, project_id: int) -> list[Document]:
        return self.db.query(Document).filter(Document.project_id == project_id).all()
