"""Base class + shared helpers for Google service wrappers."""
from __future__ import annotations

from typing import Any

from packages.core.config import settings
from packages.core.logging import log_google


class GoogleServiceError(Exception):
    """Raised when a Google API call fails."""


class BaseGoogleService:
    """Common wiring for every Google service wrapper.

    Subclasses implement an async-friendly interface but the underlying
    google-api-python-client is synchronous; we expose async methods and
    bridge them so the rest of the app can `await` uniformly.
    """

    #: name used in logs/metrics, e.g. "calendar", "drive"
    service_name: str = "google"

    def _log_call(self, method: str, **ctx: Any) -> None:
        log_google.info(f"google call: {self.service_name}.{method}", extra={"ctx": ctx})

    def _log_failure(self, method: str, exc: Exception, **ctx: Any) -> None:
        log_google.error(
            f"google failure: {self.service_name}.{method}",
            extra={"ctx": {"error": str(exc), **ctx}},
        )

    @staticmethod
    def _use_mock() -> bool:
        return settings.google_use_mock
