"""CalendarService — create/update/cancel events in Google Calendar."""
from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

from packages.core.config import settings
from packages.integrations.google.base import BaseGoogleService, GoogleServiceError


class _CalendarMock(BaseGoogleService):
    service_name = "calendar(mock)"

    def __init__(self) -> None:
        self._events: dict[str, dict] = {}
        self._counter = 0

    def _new_id(self) -> str:
        self._counter += 1
        return f"evt_{self._counter}"

    async def create_event(
        self,
        summary: str,
        start: datetime,
        end: datetime | None = None,
        description: str | None = None,
        location: str | None = None,
        attendees: list[str] | None = None,
    ) -> dict:
        eid = self._new_id()
        rec = {
            "id": eid,
            "summary": summary,
            "start": start.isoformat(),
            "end": (end.isoformat() if end else None),
            "description": description,
            "location": location,
            "attendees": attendees or [],
            "calendar_id": settings.google_calendar_id,
        }
        self._events[eid] = rec
        self._log_call("create_event", summary=summary, id=eid)
        return rec

    async def update_event(self, event_id: str, **fields: Any) -> dict:
        if event_id in self._events:
            self._events[event_id].update(fields)
        return self._events.get(event_id, {"id": event_id})

    async def delete_event(self, event_id: str) -> None:
        self._events.pop(event_id, None)


class _CalendarReal(BaseGoogleService):
    service_name = "calendar"

    def _svc(self):
        from google.oauth2.credentials import Credentials
        import json
        from googleapiclient.discovery import build
        from packages.integrations.google.oauth import _TOKEN_STORE

        data = json.loads(_TOKEN_STORE.read_text()) if _TOKEN_STORE.exists() else {}
        creds = Credentials.from_authorized_user_info(data.get("creds", {}), settings.oauth_scopes)
        return build("calendar", "v3", credentials=creds)

    async def create_event(self, summary, start, end=None, description=None, location=None, attendees=None):
        body = {
            "summary": summary,
            "start": {"dateTime": start.isoformat()},
            "end": {"dateTime": end.isoformat()} if end else {"date": start.date().isoformat()},
            "description": description,
            "location": location,
        }
        if attendees:
            body["attendees"] = [{"email": a} for a in attendees]
        try:
            self._log_call("create_event", summary=summary)
            res = await asyncio.to_thread(
                self._svc().events().insert(calendarId=settings.google_calendar_id, body=body).execute
            )
            return {"id": res["id"], "calendar_id": settings.google_calendar_id}
        except Exception as exc:
            self._log_failure("create_event", exc, summary=summary)
            raise GoogleServiceError(str(exc)) from exc

    async def update_event(self, event_id, **fields):
        try:
            res = await asyncio.to_thread(
                self._svc().events().patch(calendarId=settings.google_calendar_id, eventId=event_id, body=fields).execute
            )
            return {"id": res.get("id")}
        except Exception as exc:
            self._log_failure("update_event", exc, id=event_id)
            raise GoogleServiceError(str(exc)) from exc

    async def delete_event(self, event_id):
        try:
            await asyncio.to_thread(
                self._svc().events().delete(calendarId=settings.google_calendar_id, eventId=event_id).execute
            )
        except Exception as exc:
            self._log_failure("delete_event", exc, id=event_id)
            raise GoogleServiceError(str(exc)) from exc


def get_calendar_service() -> BaseGoogleService:
    return _CalendarMock() if settings.google_use_mock else _CalendarReal()
