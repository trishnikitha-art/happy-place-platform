"""Error classification for the retry engine.

Every external failure is classified as RETRYABLE or PERMANENT so the worker
treats them differently:
  * RETRYABLE  -> backoff + retry (Google timeout, network error, 429/503, 5xx)
  * PERMANENT  -> dead-letter immediately (invalid email, missing customer,
                  malformed payload, 4xx client errors)

This prevents infinite retries on errors that will never succeed.
"""
from __future__ import annotations

from enum import Enum
from typing import Any


class FailureClass(str, Enum):
    RETRYABLE = "retryable"
    PERMANENT = "permanent"


def classify(exc: Exception) -> FailureClass:
    """Best-effort classification of a Google/HTTP failure."""
    name = type(exc).__name__
    msg = str(exc).lower()
    # Permanent-looking client errors (4xx other than 429).
    if "invalid" in msg or "not found" in msg and "404" not in msg:
        if any(c in msg for c in ("invalid_email", "invalid_grant", "no such", "does not exist", "missing")):
            return FailureClass.PERMANENT
    # Explicit Google API error codes.
    for attr in ("status_code", "resp", "code"):
        code = getattr(exc, attr, None)
        if isinstance(code, int):
            if 400 <= code < 500 and code != 429:
                return FailureClass.PERMANENT
            if code >= 500 or code == 429:
                return FailureClass.RETRYABLE
    if any(t in name for t in ("Timeout", "Connection", "Transport", "ServerError", "BrokenPipe", "Reset")):
        return FailureClass.RETRYABLE
    if "rate" in msg or "quota" in msg or "429" in msg or "503" in msg or "timeout" in msg:
        return FailureClass.RETRYABLE
    if "invalid" in msg or "bad request" in msg or "400" in msg:
        return FailureClass.PERMANENT
    # Default: retryable, because losing a job is worse than retrying.
    return FailureClass.RETRYABLE
