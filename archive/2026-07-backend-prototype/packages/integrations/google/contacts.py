"""ContactsService — future People API integration (read-only for now).

Defined now so the abstraction is complete; only used once we sync customers
with Google Contacts. Kept minimal and mockable.
"""
from __future__ import annotations

import asyncio
from typing import Any

from packages.core.config import settings
from packages.integrations.google.base import BaseGoogleService, GoogleServiceError


class _ContactsMock(BaseGoogleService):
    service_name = "contacts(mock)"

    def __init__(self) -> None:
        self._contacts: dict[str, dict] = {}

    async def create_contact(self, name: str, email: str | None = None, phone: str | None = None) -> dict:
        cid = f"c_{len(self._contacts)+1}"
        rec = {"id": cid, "name": name, "email": email, "phone": phone}
        self._contacts[cid] = rec
        self._log_call("create_contact", name=name)
        return rec

    async def list_contacts(self) -> list[dict]:
        return list(self._contacts.values())


class _ContactsReal(BaseGoogleService):
    service_name = "contacts"

    def _svc(self):
        from google.oauth2.credentials import Credentials
        import json
        from googleapiclient.discovery import build
        from packages.integrations.google.oauth import _TOKEN_STORE

        data = json.loads(_TOKEN_STORE.read_text()) if _TOKEN_STORE.exists() else {}
        creds = Credentials.from_authorized_user_info(data.get("creds", {}), settings.oauth_scopes)
        return build("people", "v1", credentials=creds)

    async def create_contact(self, name, email=None, phone=None):
        body = {"names": [{"displayName": name}]}
        if email:
            body["emailAddresses"] = [{"value": email}]
        if phone:
            body["phoneNumbers"] = [{"value": phone}]
        try:
            self._log_call("create_contact", name=name)
            res = await asyncio.to_thread(
                self._svc().people().createContact(body=body).execute
            )
            return {"id": res.get("resourceName")}
        except Exception as exc:
            self._log_failure("create_contact", exc, name=name)
            raise GoogleServiceError(str(exc)) from exc

    async def list_contacts(self) -> list[dict]:
        try:
            res = await asyncio.to_thread(
                self._svc().people().connections().list(
                    resourceName="people/me",
                    personFields="names,emailAddresses,phoneNumbers",
                ).execute
            )
            return res.get("connections", [])
        except Exception as exc:
            self._log_failure("list_contacts", exc)
            raise GoogleServiceError(str(exc)) from exc


def get_contacts_service() -> BaseGoogleService:
    return _ContactsMock() if settings.google_use_mock else _ContactsReal()
