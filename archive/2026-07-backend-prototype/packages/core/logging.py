"""Structured logging.

Logs are emitted as JSON by default so they can be ingested by a future
monitoring stack (Cloud Logging, Datadog, etc.) without code changes.
We log: API calls, workflow execution, Google API failures, authentication,
and automation events.
"""
from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any

from packages.core.config import settings


class JsonFormatter(logging.Formatter):
    """Render log records as a single-line JSON object."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": settings.app_name,
            "environment": settings.environment,
        }
        # Pull structured fields stashed via logger.info(..., extra={"ctx": {...}})
        ctx = getattr(record, "ctx", None)
        if isinstance(ctx, dict):
            payload.update(ctx)
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


class TextFormatter(logging.Formatter):
    """Human-friendly formatter for local development."""

    def __init__(self) -> None:
        super().__init__(
            fmt="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
            datefmt="%H:%M:%S",
        )

    def format(self, record: logging.LogRecord) -> str:
        ctx = getattr(record, "ctx", None)
        msg = super().format(record)
        if isinstance(ctx, dict):
            msg = f"{msg}  {ctx}"
        return msg


def get_logger(name: str) -> logging.Logger:
    """Return a configured logger.

    Usage:
        log = get_logger(__name__)
        log.info("Drive folder created", extra={"ctx": {"customer_id": 42, "folder_id": "x"}})
    """
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        JsonFormatter() if settings.log_format == "json" else TextFormatter()
    )
    logger.addHandler(handler)

    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logger.setLevel(level)
    logger.propagate = False
    return logger


# ---- Domain-specific loggers (single place to enable future routing) ----
log_api = get_logger("happyplace.api")
log_workflow = get_logger("happyplace.workflow")
log_google = get_logger("happyplace.google")
log_auth = get_logger("happyplace.auth")
log_automation = get_logger("happyplace.automation")
