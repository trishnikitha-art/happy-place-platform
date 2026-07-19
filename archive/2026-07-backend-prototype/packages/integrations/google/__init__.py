"""Google integration layer — single point of contact with Google APIs.

The rest of the application NEVER calls Google APIs directly. It goes through
the service classes in this package (CalendarService, DriveService,
MailService, ContactsService). That indirection lets us:
  * swap in mocks for development/testing (GOOGLE_USE_MOCK=true),
  * replace or extend a provider later with zero business-logic changes,
  * centralize retry/quota/logging for all Google calls.
"""
from packages.core.config import settings
from packages.integrations.google.base import BaseGoogleService, GoogleServiceError
from packages.integrations.google.calendar import get_calendar_service
from packages.integrations.google.contacts import get_contacts_service
from packages.integrations.google.drive import get_drive_service
from packages.integrations.google.mail import get_mail_service
from packages.integrations.google.oauth import GoogleOAuth


class CalendarService(BaseGoogleService):
    """Public calendar adapter. Routes to mock or real at call time."""

    service_name = "calendar"

    def __init__(self) -> None:
        self._impl = get_calendar_service()

    def __getattr__(self, name: str):
        return getattr(self._impl, name)


class DriveService(BaseGoogleService):
    service_name = "drive"

    def __init__(self) -> None:
        self._impl = get_drive_service()

    def __getattr__(self, name: str):
        return getattr(self._impl, name)


class MailService(BaseGoogleService):
    service_name = "mail"

    def __init__(self) -> None:
        self._impl = get_mail_service()

    def __getattr__(self, name: str):
        return getattr(self._impl, name)


class ContactsService(BaseGoogleService):
    service_name = "contacts"

    def __init__(self) -> None:
        self._impl = get_contacts_service()

    def __getattr__(self, name: str):
        return getattr(self._impl, name)


__all__ = [
    "settings",
    "GoogleServiceError",
    "BaseGoogleService",
    "GoogleOAuth",
    "CalendarService",
    "get_calendar_service",
    "DriveService",
    "get_drive_service",
    "MailService",
    "get_mail_service",
    "ContactsService",
    "get_contacts_service",
]
