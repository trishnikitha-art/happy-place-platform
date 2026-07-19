"""Customer domain service — clean intent-named interface."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from packages.database.models.customer import Customer


class CustomerService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        first_name: str,
        last_name: str,
        email: str | None = None,
        phone: str | None = None,
        workspace_email: str | None = None,
        display_name: str | None = None,
        notes: str | None = None,
    ) -> Customer:
        cust = Customer(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            workspace_email=workspace_email,
            display_name=display_name or f"{first_name} {last_name}".strip(),
            notes=notes,
        )
        self.db.add(cust)
        self.db.commit()
        self.db.refresh(cust)
        return cust

    def get(self, customer_id: int) -> Customer | None:
        return self.db.get(Customer, customer_id)

    def get_by_email(self, email: str) -> Customer | None:
        return self.db.scalars(select(Customer).where(Customer.email == email)).first()

    def list(self, limit: int = 50, offset: int = 0) -> list[Customer]:
        return list(self.db.scalars(select(Customer).order_by(Customer.id.desc()).limit(limit).offset(offset)))

    def link_drive_folder(self, customer_id: int, folder_id: str) -> Customer | None:
        cust = self.get(customer_id)
        if cust:
            cust.drive_folder_id = folder_id
            self.db.commit()
        return cust
