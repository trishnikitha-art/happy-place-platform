import os

os.environ["ENV_FILE"] = ".env.example"
os.environ.setdefault("GOOGLE_USE_MOCK", "true")

from packages.database import init_db, get_session
from packages.database.models import Customer, Lead, Project, Photo, Document, Task, Review, Communication, Service, Outbox, LogEntry, ConfigEntry, EventLog

init_db()
print("init_db OK")

from packages.events import bus, Events
from packages.outbox import engine
from packages.outbox.jobs import register_default_jobs
from packages.integrations.health import health_summary
from packages.integrations.contracts import DriveProvider, CalendarProvider, MailProvider, ContactsProvider
from packages.core.ai import get_ai_service
from packages.core.errors import classify

register_default_jobs()
print("job handlers registered:", sorted(engine._JOB_HANDLERS.keys()))

h = health_summary()
print("health healthy:", h["healthy"], "checks:", len(h["checks"]))

from apps.api.main import app
print("FastAPI app OK, routes:", len(app.routes))

# AI disabled by default
ai = get_ai_service()
print("AI provider:", ai.provider)
