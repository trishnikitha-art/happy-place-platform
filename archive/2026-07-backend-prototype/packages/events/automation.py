"""Automation — event handlers that ENQUEUE outbox jobs (never call Google inline).

This is the reliability boundary: a domain event (LeadCreated, ProjectCompleted,
...) triggers automation that *schedules* side-effects as durable outbox jobs.
The background worker performs the actual Drive/email/calendar calls with
retry + dead-letter. So a Gmail outage can never lose a lead or a confirmation.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from packages.core import logging as _logging
from packages.core.config import settings
from packages.outbox import engine
from packages.observability import record

log = _logging.get_logger("happyplace.automation")


async def on_lead_created(event: dict, db) -> None:
    payload = event.get("payload", {})
    aggregate_id = event.get("aggregate_id")
    # Enqueue: create the contact + (later) the drive folder is created at project start.
    # Confirmation email goes through the outbox, not inline.
    from packages.database.models.lead import Lead
    from packages.database.models.customer import Customer

    lead = db.get(Lead, aggregate_id)
    if not lead:
        return
    cust = db.get(Customer, lead.customer_id)
    if not cust:
        return
    if cust.email:
        engine.enqueue(
            db,
            "send_email",
            {"to": cust.email, "template": "lead_confirmation", "ctx": {"first_name": cust.first_name}},
            subject=f"Confirmation email to {cust.email}",
            aggregate_type="lead",
            aggregate_id=aggregate_id,
        )
    if cust.email or cust.phone:
        engine.enqueue(
            db,
            "create_contact",
            {"name": cust.full_name, "email": cust.email, "phone": cust.phone},
            subject=f"Contact {cust.full_name}",
            aggregate_type="customer",
            aggregate_id=cust.id,
        )
    # Drive folder creation is its own outbox job (idempotent get_or_create).
    engine.enqueue(
        db,
        "create_drive_folder",
        {"customer_id": cust.id, "customer_name": cust.display_name or cust.full_name},
        subject=f"Drive folder for {cust.full_name}",
        aggregate_type="customer",
        aggregate_id=cust.id,
    )
    log.info("automation: lead_created -> enqueued email + contact + drive folder")


async def on_project_folder_created(event: dict, db) -> None:
    # Folder creation is itself done by the outbox; this just logs for the timeline.
    log.info("automation: project folder created", extra={"ctx": {"subfolders": list(event.get("payload", {}).get("subfolders", {}))}})


async def on_appointment_scheduled(event: dict, db) -> None:
    payload = event.get("payload", {})
    # We do NOT auto-book; the office confirms. But we enqueue a suggested-event job.
    when = (datetime.now() + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
    engine.enqueue(
        db,
        "create_calendar_event",
        {
            "summary": payload.get("title", "Estimate visit"),
            "start": when.isoformat(),
            "end": (when + timedelta(hours=1)).isoformat(),
            "appointment_id": event.get("aggregate_id"),
            "description": "Suggested estimate appointment (confirm with customer).",
        },
        subject=f"Calendar: {payload.get('title', 'estimate')}",
        aggregate_type="appointment",
        aggregate_id=event.get("aggregate_id"),
    )
    log.info("automation: appointment_scheduled -> enqueued calendar suggestion")


async def on_estimate_generated(event: dict, db) -> None:
    engine.enqueue(
        db,
        "generate_estimate_doc",
        {
            "estimate_id": event.get("aggregate_id"),
            "project_id": event.get("payload", {}).get("project_id"),
            "title": event.get("payload", {}).get("title", "Estimate"),
            "body": event.get("payload", {}).get("body", "Estimate details."),
            "parent_folder_id": event.get("payload", {}).get("parent_folder_id"),
        },
        subject="Generate estimate doc",
        aggregate_type="estimate",
        aggregate_id=event.get("aggregate_id"),
    )
    log.info("automation: estimate_generated -> enqueued doc generation")


async def on_project_completed(event: dict, db) -> None:
    log.info("automation: project_completed -> will request review")
    # Enqueue a review request after completion.
    await engine.enqueue_for_event(db, event, "review_request", default_payload={})


async def on_review_requested(event: dict, db) -> None:
    payload = event.get("payload", {})
    to = payload.get("to")
    review_id = payload.get("review_id")
    if to or review_id:
        engine.enqueue(
            db,
            "review_request",
            {"to": to, "review_id": review_id, "subject": payload.get("subject"), "html": payload.get("html")},
            subject=f"Review request to {to or review_id}",
            aggregate_type="review",
            aggregate_id=review_id,
        )
    log.info("automation: review_requested -> enqueued review email")


def register_automations() -> None:
    """Wire every event to its handler. Call once at startup."""
    from packages.events import Events, bus

    async def _lead(e, db): await on_lead_created(e, db)
    async def _folder(e, db): await on_project_folder_created(e, db)
    async def _appt(e, db): await on_appointment_scheduled(e, db)
    async def _est(e, db): await on_estimate_generated(e, db)
    async def _proj(e, db): await on_project_completed(e, db)
    async def _rev(e, db): await on_review_requested(e, db)

    bus.subscribe(Events.LEAD_CREATED, _lead)
    bus.subscribe(Events.PROJECT_FOLDER_CREATED, _folder)
    bus.subscribe(Events.APPOINTMENT_SCHEDULED, _appt)
    bus.subscribe(Events.ESTIMATE_GENERATED, _est)
    bus.subscribe(Events.PROJECT_COMPLETED, _proj)
    bus.subscribe(Events.REVIEW_REQUESTED, _rev)
    log.info("automations registered")
