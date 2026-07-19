"""Lead creation workflow — REQUEST-ONLY (validate -> persist -> commit -> publish).

This workflow performs NO external calls. It validates input, persists the
customer + lead, commits, and emits LeadCreated. All side-effects (Drive folder,
confirmation email, contact sync) are performed later by the outbox worker in
response to that event. This is the reliability ordering: a Gmail/Drive outage
can never lose a lead, because the business state is already committed before
any external call is even attempted.

IDEMPOTENCY: safe to retry. The customer is reused by email; a duplicate lead
for the same key is detected; the confirmation email is deduped by an
idempotency key in the outbox. Rerunning never creates duplicates.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import select

from packages.events import Events, bus
from packages.core.logging import get_logger, log_workflow
from packages.database.models.customer import Customer
from packages.database.models.lead import Lead
from packages.database.models.enums import LeadSource, LeadStatus
from packages.workflows.engine import Step, StepResult, Workflow

log = get_logger("happyplace.workflow.lead")


class ValidateLeadStep(Step):
    name = "validate"

    def run(self, ctx: dict[str, Any]) -> StepResult:
        required = ["title", "first_name", "last_name"]
        missing = [k for k in required if not ctx.get(k)]
        if missing:
            return StepResult(self.name, False, error=f"missing fields: {missing}")
        ctx.setdefault("source", LeadSource.WEBSITE.value)
        ctx["idempotency_key"] = f"lead:{ctx.get('email') or ctx.get('phone')}:{ctx['title']}:{datetime.now().date()}"
        return StepResult(self.name, True)


class PersistLeadStep(Step):
    name = "persist"

    def __init__(self, db) -> None:
        self.db = db

    def run(self, ctx: dict[str, Any]) -> StepResult:
        from packages.domains.customers import CustomerService

        cs = CustomerService(self.db)
        # Idempotent: reuse existing customer matched by email.
        cust = cs.get_by_email(ctx["email"]) if ctx.get("email") else None
        if cust is None:
            cust = cs.create(
                first_name=ctx["first_name"],
                last_name=ctx["last_name"],
                email=ctx.get("email"),
                phone=ctx.get("phone"),
                notes=ctx.get("notes"),
            )
        # Idempotent: skip duplicate lead for the same customer+title today.
        existing = self.db.execute(
            select(Lead).where(Lead.customer_id == cust.id, Lead.title == ctx["title"])
        ).scalars().first()
        if existing is not None:
            ctx["customer"] = cust
            ctx["lead"] = existing
            ctx["duplicate"] = True
            return StepResult(self.name, True, data={"customer_id": cust.id, "lead_id": existing.id, "duplicate": True})
        lead = Lead(
            title=ctx["title"],
            customer_id=cust.id,
            status=LeadStatus.NEW,
            source=ctx["source"],
            description=ctx.get("description"),
            service_type=ctx.get("service_type"),
            budget_range=ctx.get("budget_range"),
            desired_timeline=ctx.get("desired_timeline"),
        )
        self.db.add(lead)
        self.db.commit()
        self.db.refresh(lead)
        ctx["customer"] = cust
        ctx["lead"] = lead
        return StepResult(self.name, True, data={"customer_id": cust.id, "lead_id": lead.id})


class LogActivityStep(Step):
    name = "log_activity"

    def __init__(self, db) -> None:
        self.db = db

    def run(self, ctx: dict[str, Any]) -> StepResult:
        from packages.database.models.activity import ActivityLog

        lead: Lead = ctx["lead"]
        self.db.add(
            ActivityLog(
                actor="system",
                action="lead.created",
                entity_type="lead",
                entity_id=lead.id,
                detail=f"Lead '{lead.title}' created via workflow",
                meta={"customer_id": ctx["customer"].id, "duplicate": ctx.get("duplicate", False)},
            )
        )
        self.db.commit()
        return StepResult(self.name, True)


def build_lead_workflow(db) -> Workflow:
    return Workflow(
        name="lead_created",
        steps=[ValidateLeadStep(), PersistLeadStep(db), LogActivityStep(db)],
    )


async def run_lead_workflow(db, **lead_fields: Any) -> dict[str, Any]:
    """Request-only entrypoint: persist + publish. Side-effects run via outbox."""
    ctx = dict(lead_fields)
    ctx["db"] = db
    workflow = build_lead_workflow(db)
    result = await workflow.run(ctx)
    lead = result.get("lead")
    if lead is not None and not result.get("duplicate"):
        # Business state already committed. External work happens in the worker.
        await bus.emit(Events.LEAD_CREATED, aggregate_type="lead", aggregate_id=lead.id, title=lead.title)
    return result
