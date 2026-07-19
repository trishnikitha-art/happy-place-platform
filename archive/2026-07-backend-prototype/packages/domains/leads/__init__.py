"""Lead domain service."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from packages.database.models.enums import LeadSource, LeadStatus
from packages.database.models.lead import Lead


class LeadService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        title: str,
        customer_id: int | None = None,
        source: LeadSource = LeadSource.WEBSITE,
        description: str | None = None,
        service_type: str | None = None,
        budget_range: str | None = None,
        desired_timeline: str | None = None,
    ) -> Lead:
        lead = Lead(
            title=title,
            customer_id=customer_id,
            status=LeadStatus.NEW,
            source=source,
            description=description,
            service_type=service_type,
            budget_range=budget_range,
            desired_timeline=desired_timeline,
        )
        self.db.add(lead)
        self.db.commit()
        self.db.refresh(lead)
        return lead

    def get(self, lead_id: int) -> Lead | None:
        return self.db.get(Lead, lead_id)

    def list(self, status: LeadStatus | None = None, limit: int = 50) -> list[Lead]:
        q = select(Lead)
        if status:
            q = q.where(Lead.status == status)
        return list(self.db.scalars(q.order_by(Lead.id.desc()).limit(limit)))

    def update_status(self, lead_id: int, status: LeadStatus) -> Lead | None:
        lead = self.get(lead_id)
        if lead:
            lead.status = status
            self.db.commit()
        return lead
