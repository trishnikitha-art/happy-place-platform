"""Review API — business action: request a review after a happy project."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from packages.database import get_session
from packages.database.models.review import Review
from packages.events import Events, bus
from packages.outbox import engine
from packages.observability import record

router = APIRouter()


class ReviewRequestIn(BaseModel):
    customer_id: int
    project_id: int | None = None
    channel: str = "google"
    to_email: str | None = None


@router.post("/request")
async def request_review(payload: ReviewRequestIn, db: Session = Depends(get_session)) -> dict:
    """Business action: open a review record and ENQUEUE the request email."""
    review = Review(
        customer_id=payload.customer_id,
        project_id=payload.project_id,
        status="requested",
        channel=payload.channel,
        requested_at=datetime.now(timezone.utc),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    engine.enqueue(
        db,
        "review_request",
        {
            "review_id": review.id,
            "to": payload.to_email,
            "subject": "Did we make you happy? We'd love to hear about it",
            "html": "<p>If you were happy with our work, a quick review would mean the world to us.</p>",
        },
        subject=f"Review request to {payload.to_email or review.id}",
        aggregate_type="review",
        aggregate_id=review.id,
    )
    record("workflow", "INFO", f"review requested id={review.id}", ctx={"review_id": review.id}, db=db)
    await bus.emit(Events.REVIEW_REQUESTED, aggregate_type="review", aggregate_id=review.id, review_id=review.id, to=payload.to_email)
    return {"review_id": review.id, "status": review.status, "queued": True}
