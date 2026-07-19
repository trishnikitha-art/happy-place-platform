"""Webhook receiver (future: Google push notifications, form submissions)."""
from __future__ import annotations

from fastapi import APIRouter, Request

from packages.core.logging import get_logger

log = get_logger("happyplace.webhooks")
router = APIRouter()


@router.post("/google")
async def google_push(request: Request) -> dict:
    body = await request.body()
    log.info("google webhook received", extra={"ctx": {"bytes": len(body)}})
    return {"received": True}
