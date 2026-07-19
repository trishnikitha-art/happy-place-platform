"""ORM models, organized by business domain for modularity.

All models import `Base` and mixins from packages.database.models.base.
Importing this package ensures every model is registered with the metadata, so
`Base.metadata.create_all(engine)` builds the whole schema.

Schema notes for future PostgreSQL migration:
  * Integer surrogate PKs are portable to Postgres (SERIAL/BIGSERIAL).
  * All datetimes are timezone-aware UTC.
  * JSON columns use SQLAlchemy JSON (maps to JSONB on Postgres) so event
    payloads/metadata move over cleanly.
  * Business state (customers, leads, projects, workflow status, reviews,
    communications) is the system of record HERE. Google (Drive/Calendar/Gmail)
    is the system of record for documents, scheduling, and messages.
"""
from packages.database.models.base import Base, TimestampMixin
from packages.database.models.enums import (
    AppointmentStatus,
    CommunicationChannel,
    LeadSource,
    LeadStatus,
    ProjectStage,
    ReviewStatus,
    Role,
    TaskStatus,
)
from packages.database.models.customer import Customer, Address
from packages.database.models.lead import Lead
from packages.database.models.project import Project, ProjectFolder
from packages.database.models.estimate import Estimate
from packages.database.models.appointment import Appointment
from packages.database.models.photo import Photo
from packages.database.models.document import Document
from packages.database.models.task import Task
from packages.database.models.review import Review
from packages.database.models.communication import Communication
from packages.database.models.service import Service
from packages.database.models.user import User
from packages.database.models.activity import ActivityLog
from packages.database.models.event import EventLog
from packages.database.models.outbox import Outbox
from packages.database.models.logentry import LogEntry
from packages.database.models.configentry import ConfigEntry

__all__ = [
    "Base",
    "TimestampMixin",
    "AppointmentStatus",
    "CommunicationChannel",
    "LeadSource",
    "LeadStatus",
    "ProjectStage",
    "ReviewStatus",
    "Role",
    "TaskStatus",
    "Customer",
    "Address",
    "Lead",
    "Project",
    "ProjectFolder",
    "Estimate",
    "Appointment",
    "Photo",
    "Document",
    "Task",
    "Review",
    "Communication",
    "Service",
    "User",
    "ActivityLog",
    "EventLog",
    "Outbox",
    "LogEntry",
    "ConfigEntry",
]
