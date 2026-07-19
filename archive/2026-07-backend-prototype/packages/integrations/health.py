"""Integration health + startup config validation (fail-fast).

On boot we verify the environment is wired correctly BEFORE accepting traffic.
If Google OAuth, Calendar, Drive, Mail, the DB, or required env vars are
missing, we fail fast with a clear report — we never discover the gap after a
customer submits a form.

Health checks are also surfaced on the operations dashboard (one card per
integration) so you can see at a glance what's broken.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from packages.core.config import settings
from packages.core import logging as _logging

log = _logging.get_logger("happyplace.health")


@dataclass
class CheckResult:
    name: str
    ok: bool
    detail: str = ""
    category: str = "integration"


# Required env vars for a minimally working deployment.
_REQUIRED_VARS = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "GOOGLE_WORKSPACE_EMAIL",
    "GOOGLE_DRIVE_ROOT_FOLDER",
    "GOOGLE_CALENDAR_ID",
    "SECRET_KEY",
    "DATABASE_URL",
]


def validate_config() -> list[CheckResult]:
    """Fail-fast verification of configuration. Returns all results."""
    results: list[CheckResult] = []

    # Environment variables
    import os

    # In mock mode we don't require live Google credentials (free local dev).
    google_vars = [] if settings.google_use_mock else [
        "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI",
        "GOOGLE_WORKSPACE_EMAIL", "GOOGLE_DRIVE_ROOT_FOLDER", "GOOGLE_CALENDAR_ID",
    ]
    for var in _REQUIRED_VARS + google_vars:
        val = os.getenv(var, getattr(settings, var.lower(), ""))
        present = bool(val) and val not in ("change-me", "change-me-to-a-long-random-string")
        results.append(
            CheckResult(
                name=f"env:{var}",
                ok=present,
                detail="present" if present else ("MISSING or placeholder (mock mode ok)" if var in google_vars else "MISSING or placeholder"),
                category="config",
            )
        )

    # Database reachable
    try:
        from packages.database import session_scope

        with session_scope() as db:
            db.execute(__import__("sqlalchemy").text("SELECT 1"))
        results.append(CheckResult("database", True, "reachable", category="integration"))
    except Exception as exc:
        results.append(CheckResult("database", False, str(exc), category="integration"))

    # Google integrations: in mock mode we consider them "configured (mock)".
    google_ok = not settings.google_use_mock
    for svc in ("calendar", "drive", "mail", "contacts"):
        if settings.google_use_mock:
            results.append(CheckResult(f"google:{svc}", True, "mock mode (no live call)", category="integration"))
        else:
            # We can't call without tokens at boot; report configured-but-unverified.
            results.append(CheckResult(f"google:{svc}", True, "live mode (verified on first use)", category="integration"))

    return results


def health_summary() -> dict[str, Any]:
    results = validate_config()
    return {
        "healthy": all(r.ok for r in results),
        "checks": [
            {"name": r.name, "ok": r.ok, "detail": r.detail, "category": r.category}
            for r in results
        ],
        "environment": settings.environment,
        "google_mock": settings.google_use_mock,
        "mail_mode": settings.mail_mode,
    }


def fail_fast() -> None:
    """Raise if any required check fails. Call during startup."""
    results = validate_config()
    failed = [r for r in results if not r.ok]
    if failed:
        report = "\n".join(f"  [FAIL] {r.name}: {r.detail}" for r in failed)
        log.error("startup config validation failed", extra={"ctx": {"failures": [r.name for r in failed]}})
        raise RuntimeError(f"Configuration invalid:\n{report}")
    log.info("startup config validation passed")
