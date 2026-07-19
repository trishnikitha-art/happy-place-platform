"""Provider contracts — the adapter boundaries.

Business logic and the outbox job handlers depend ONLY on these abstract
interfaces, never on Google's SDK. Concrete implementations live under
packages/integrations/{google,microsoft365,caldav,...}. Swapping a provider is a
configuration + one new module — zero changes to workflows, services, or UI.

This is what makes the platform reusable: a plumbing company using Microsoft
365 instead of Google Workspace is just a different adapter.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any


class DriveProvider(ABC):
    @abstractmethod
    async def get_or_create_folder(self, name: str, parent_id: str | None = None) -> dict:
        ...

    @abstractmethod
    async def create_folders(self, names: list[str], parent_id: str | None = None) -> dict[str, dict]:
        ...

    @abstractmethod
    async def upload_file(self, filename: str, content: bytes, parent_id: str, mime_type: str = "application/octet-stream") -> dict:
        ...


class CalendarProvider(ABC):
    @abstractmethod
    async def create_event(
        self,
        summary: str,
        start: datetime,
        end: datetime | None = None,
        description: str | None = None,
        location: str | None = None,
        attendees: list[str] | None = None,
    ) -> dict:
        ...

    @abstractmethod
    async def update_event(self, event_id: str, **fields: Any) -> dict:
        ...

    @abstractmethod
    async def delete_event(self, event_id: str) -> None:
        ...


class MailProvider(ABC):
    @abstractmethod
    async def send(self, to: str, subject: str, body_html: str, body_text: str | None = None, from_alias: str | None = None) -> dict:
        ...


class ContactsProvider(ABC):
    @abstractmethod
    async def create_contact(self, name: str, email: str | None = None, phone: str | None = None) -> dict:
        ...

    @abstractmethod
    async def list_contacts(self) -> list[dict]:
        ...
