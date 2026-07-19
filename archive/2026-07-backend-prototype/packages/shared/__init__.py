"""Base classes shared across modules (marker, abstract helpers)."""
from __future__ import annotations

from abc import ABC


class Service(ABC):
    """Marker base for domain services.

    A service exposes a clean, intent-named interface (e.g.
    `appointments.book(...)`, `leads.create(...)`). Modules never call Google
    or the DB directly through business logic — they go through services.
    """
