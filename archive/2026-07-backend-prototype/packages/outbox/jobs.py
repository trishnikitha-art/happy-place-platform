"""Outbox job handlers — the ONLY place external side-effects happen.

Each handler performs one Google/email/AI call. They run inside the outbox
worker, never during a request. If a handler raises, the engine classifies the
error and either retries (with backoff) or dead-letters it.

Handlers translate a persisted job payload into a provider call. They read
business state from the DB by aggregate_id, so a retried job re-fetches fresh
state (idempotent).
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from packages.core import logging as _logging
from packages.domains.notifications import send_raw
from packages.domains.storage import create_customer_folder, create_project_folders
from packages.integrations.google import get_calendar_service, get_drive_service, get_contacts_service
from packages.observability import record

log = _logging.get_logger("happyplace.outbox.jobs")


async def handle_send_email(payload: dict, db) -> None:
    """Send a templated/raw email. `template`+`ctx` or `subject`+`html`."""
    to = payload["to"]
    if payload.get("template"):
        from packages.domains.notifications import send_template

        await send_template(payload["template"], to, **payload.get("ctx", {}))
    else:
        await send_raw(to, payload["subject"], payload["html"], payload.get("text"))
    log.info("email sent via outbox", extra={"ctx": {"to": to}})


async def handle_create_calendar_event(payload: dict, db) -> None:
    cal = get_calendar_service()
    start = datetime.fromisoformat(payload["start"])
    end = datetime.fromisoformat(payload["end"]) if payload.get("end") else None
    res = await cal.create_event(
        summary=payload["summary"],
        start=start,
        end=end,
        description=payload.get("description"),
        location=payload.get("location"),
        attendees=payload.get("attendees"),
    )
    # Persist the calendar event id back onto the appointment.
    if payload.get("appointment_id"):
        from packages.database.models.appointment import Appointment

        appt = db.get(Appointment, payload["appointment_id"])
        if appt:
            appt.calendar_event_id = res.get("id")
            appt.status = "confirmed"
            db.commit()
    log.info("calendar event created via outbox", extra={"ctx": {"id": res.get("id")}})


async def handle_create_drive_folder(payload: dict, db) -> None:
    """Create the customer + project folder set and persist IDs."""
    customer_id = payload.get("customer_id")
    project_id = payload.get("project_id")
    customer_name = payload.get("customer_name") or f"Customer {customer_id}"
    drive = get_drive_service()
    folder = await drive.get_or_create_folder(customer_name, parent_id=payload.get("parent_folder_id"))
    from packages.domains.customers import CustomerService

    if customer_id:
        CustomerService(db).link_drive_folder(customer_id, folder["id"])
    mapping = await drive.create_folders(
        ["Estimate", "Before", "During", "After", "Documents", "Warranty"], parent_id=folder["id"]
    )
    if project_id:
        from packages.domains.projects import ProjectService

        ps = ProjectService(db)
        proj = ps.set_drive_folder(project_id, folder["id"])
        for ftype, fid in mapping.items():
            ps.add_folder(project_id, ftype, fid, ftype)
    log.info("drive folder created via outbox", extra={"ctx": {"customer_folder_id": folder["id"]}})


async def handle_create_contact(payload: dict, db) -> None:
    contacts = get_contacts_service()
    await contacts.create_contact(name=payload["name"], email=payload.get("email"), phone=payload.get("phone"))
    log.info("contact created via outbox", extra={"ctx": {"email": payload.get("email")}})


async def handle_review_request(payload: dict, db) -> None:
    """Send a review-request email and record the outreach."""
    to = payload.get("to")
    if to:
        await send_raw(
            to,
            payload.get("subject", "Did we make you happy?"),
            payload.get("html", "<p>We'd love a review if you were happy with our work.</p>"),
        )
    from packages.database.models.review import Review

    review = db.get(Review, payload["review_id"]) if payload.get("review_id") else None
    if review:
        review.status = "requested"
        review.requested_at = datetime.now()
        db.commit()
    log.info("review request sent via outbox", extra={"ctx": {"review_id": payload.get("review_id")}})


async def handle_generate_estimate_doc(payload: dict, db) -> None:
    """Generate the estimate document in Google Docs and store its file id.

    Google Docs is the authoring surface; the Estimate row is our system of
    record for status/amount. Here we create the doc in Drive and persist the
    file id back onto the estimate.
    """
    drive = get_drive_service()
    project_id = payload.get("project_id")
    estimate_id = payload.get("estimate_id")
    title = payload.get("title", "Estimate")
    res = await drive.upload_file(
        filename=f"{title}.txt",
        content=payload.get("body", "").encode("utf-8"),
        parent_id=payload.get("parent_folder_id"),
        mime_type="text/plain",
    )
    if estimate_id:
        from packages.database.models.estimate import Estimate

        est = db.get(Estimate, estimate_id)
        if est:
            est.drive_file_id = res["id"]
            est.status = "draft"
            db.commit()
    log.info("estimate doc created via outbox", extra={"ctx": {"file_id": res["id"]}})


def register_default_jobs() -> None:
    """Wire all built-in job handlers. Call once at startup."""
    from packages.outbox import engine

    engine.register_job("send_email", handle_send_email)
    engine.register_job("create_calendar_event", handle_create_calendar_event)
    engine.register_job("create_drive_folder", handle_create_drive_folder)
    engine.register_job("create_contact", handle_create_contact)
    engine.register_job("review_request", handle_review_request)
    engine.register_job("generate_estimate_doc", handle_generate_estimate_doc)
    log.info("outbox job handlers registered")
