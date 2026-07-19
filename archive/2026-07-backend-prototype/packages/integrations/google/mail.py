"""MailService — send emails via Gmail API.

In dev mode (MAIL_MODE=dev) emails are rendered and logged, never sent.
This keeps local development safe (no accidental customer emails) while
exercising the full send path for tests.
"""
from __future__ import annotations

import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from packages.core.config import settings
from packages.core.logging import log_google
from packages.integrations.google.base import BaseGoogleService, GoogleServiceError


def _build_mime(to: str, subject: str, body_html: str, body_text: str | None = None, from_alias: str | None = None) -> str:
    msg = MIMEMultipart("alternative")
    msg["To"] = to
    msg["Subject"] = subject
    if from_alias:
        msg["From"] = from_alias
    if body_text:
        msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(body_html, "html"))
    import base64

    return base64.urlsafe_b64encode(msg.as_bytes()).decode()


class _MailMock(BaseGoogleService):
    service_name = "mail(mock)"

    def __init__(self) -> None:
        self.sent: list[dict] = []

    async def send(self, to: str, subject: str, body_html: str, body_text: str | None = None, from_alias: str | None = None) -> dict:
        raw = _build_mime(to, subject, body_html, body_text, from_alias)
        rec = {"to": to, "subject": subject, "message_id": f"dev_{len(self.sent)+1}", "mode": "dev"}
        self.sent.append(rec)
        log_google.info("mail (dev) not sent, logged only", extra={"ctx": {"to": to, "subject": subject}})
        return rec


class _MailReal(BaseGoogleService):
    service_name = "mail"

    def _svc(self):
        from google.oauth2.credentials import Credentials
        import json
        from googleapiclient.discovery import build
        from packages.integrations.google.oauth import _TOKEN_STORE

        data = json.loads(_TOKEN_STORE.read_text()) if _TOKEN_STORE.exists() else {}
        creds = Credentials.from_authorized_user_info(data.get("creds", {}), settings.oauth_scopes)
        return build("gmail", "v1", credentials=creds)

    async def send(self, to, subject, body_html, body_text=None, from_alias=None):
        raw = _build_mime(to, subject, body_html, body_text, from_alias)
        try:
            self._log_call("send", to=to, subject=subject)
            res = await asyncio.to_thread(
                self._svc().users().messages().send(userId="me", body={"raw": raw}).execute
            )
            return {"message_id": res.get("id"), "mode": "live"}
        except Exception as exc:
            self._log_failure("send", exc, to=to)
            raise GoogleServiceError(str(exc)) from exc


def get_mail_service() -> BaseGoogleService:
    if settings.google_use_mock:
        return _MailMock()
    if settings.mail_mode == "dev":
        # Even with real Google client, dev mode logs instead of sending.
        return _MailMock()
    return _MailReal()
