"""Shared enumerations (portable to Postgres as native enums or VARCHAR)."""
from __future__ import annotations

import enum


class Role(str, enum.Enum):
    """Platform roles. Extensible for future client Workspaces."""

    ADMINISTRATOR = "administrator"
    OFFICE = "office"
    ESTIMATOR = "estimator"
    TECHNICIAN = "technician"  # future


class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    ESTIMATING = "estimating"
    WON = "won"
    LOST = "lost"


class LeadSource(str, enum.Enum):
    WEBSITE = "website"
    REFERRAL = "referral"
    SOCIAL = "social"
    REPEAT = "repeat"
    OTHER = "other"


class ProjectStage(str, enum.Enum):
    LEAD = "lead"
    ESTIMATE = "estimate"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    WARRANTY = "warranty"


class AppointmentStatus(str, enum.Enum):
    PROPOSED = "proposed"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    BLOCKED = "blocked"


class ReviewStatus(str, enum.Enum):
    REQUESTED = "requested"
    RESPONDED = "responded"
    PUBLISHED = "published"
    DECLINED = "declined"


class CommunicationChannel(str, enum.Enum):
    EMAIL = "email"
    SMS = "sms"
    CALL = "call"
    NOTE = "note"
