"""Customer records and addresses."""
from __future__ import annotations

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.database.models.base import Base, TimestampMixin


class Address(Base, TimestampMixin):
    __tablename__ = "addresses"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    label: Mapped[str] = mapped_column(String(50), default="service")  # service/billing
    line1: Mapped[str] = mapped_column(String(255))
    line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str] = mapped_column(String(100))
    state: Mapped[str] = mapped_column(String(50))
    postal_code: Mapped[str] = mapped_column(String(20))
    latitude: Mapped[float | None] = mapped_column(nullable=True)
    longitude: Mapped[float | None] = mapped_column(nullable=True)

    customer: Mapped["Customer"] = relationship(back_populates="addresses")


class Customer(Base, TimestampMixin):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Workspace identity — links to Google contacts later; never hardcoded.
    workspace_email: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True)  # folder label
    email: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    preferred_contact: Mapped[str] = mapped_column(String(20), default="email")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Drive customer root folder id (never rely on the folder name alone).
    drive_folder_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)

    addresses: Mapped[list[Address]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )
    leads: Mapped[list["Lead"]] = relationship(back_populates="customer")  # type: ignore[name-defined]
    projects: Mapped[list["Project"]] = relationship(back_populates="customer")  # type: ignore[name-defined]

    @property
    def full_name(self) -> str:
        parts = [self.first_name, self.last_name]
        return " ".join(p for p in parts if p).strip()
