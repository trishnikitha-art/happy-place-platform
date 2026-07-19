"""Notification service — email + (future) SMS/push via automation events.

Always goes through MailService so behavior is configurable per environment
(dev logs, live sends). Templates live here as data, not hardcoded per client.
"""
from __future__ import annotations

from packages.core.config import settings
from packages.core.logging import get_logger
from packages.integrations.google.mail import get_mail_service

log = get_logger("happyplace.notifications")

# Email templates are configuration data. Swap per brand/client without code changes.
TEMPLATES = {
    "lead_confirmation": {
        "subject": "We got your message — let's build your happy place!",
        "html": (
            "<p>Hi {first_name},</p>"
            "<p>Thanks for reaching out to {company_name}. We're so glad you did!</p>"
            "<p>We'll be in touch within one business day to chat about your project. "
            "In the meantime, feel free to reply to this email with any photos or ideas.</p>"
            "<p>— {team_names}</p>"
        ),
    },
    "appointment_proposed": {
        "subject": "Let's pick a time for your estimate",
        "html": (
            "<p>Hi {first_name},</p>"
            "<p>We'd love to stop by and see your space. Here's a suggested time:</p>"
            "<p><strong>{when}</strong></p>"
            "<p>Just reply to confirm or suggest another time that works better.</p>"
        ),
    },
    "project_complete": {
        "subject": "Your project is complete — we hope it makes you happy!",
        "html": (
            "<p>Hi {first_name},</p>"
            "<p>We just wrapped up your project and we couldn't be more pleased with how it turned out.</p>"
            "<p>If you're happy with the work, we'd be thrilled if you left us a review.</p>"
        ),
    },
    "review_request": {
        "subject": "Did we make you happy? We'd love to hear about it",
        "html": (
            "<p>Hi {first_name},</p>"
            "<p>If your experience with us was a good one, would you take a minute to leave a review? "
            "It helps other homeowners find their happy place too.</p>"
        ),
    },
}


async def send_template(template_key: str, to_email: str, **ctx: str) -> dict:
    tpl = TEMPLATES.get(template_key)
    if not tpl:
        raise KeyError(f"unknown template: {template_key}")
    ctx.setdefault("company_name", settings.app_name)
    ctx.setdefault("team_names", "the team")
    html = tpl["html"].format(**ctx)
    mail = get_mail_service()
    return await mail.send(to=to_email, subject=tpl["subject"], body_html=html)


async def send_raw(to_email: str, subject: str, html: str, text: str | None = None) -> dict:
    mail = get_mail_service()
    return await mail.send(to=to_email, subject=subject, body_html=html, body_text=text)
