"""Review records — requests sent and responses received.

System of record for review outreach. The actual public review lives on
Google Business Profile / a 3rd party; we track the lifecycle here.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from packages.database.models.base import Base, TimestampMixin


class Review(Base, TimestampMixin):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True, index=True)
    # requested | responded | published | declined
    status: Mapped[str] = mapped_column(String(30), default="requested")
    channel: Mapped[str] = mapped_column(String(30), default="google")  # google|yelp|facebook
    requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rating: Mapped[int | None] = mapped_column(nullable=True)  # 1-5
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    # id of the review on the external platform (if known)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Whether we have permission to show it publicly (for the website).
    approved_for_public: Mapped[bool] = mapped_column(default=False)
