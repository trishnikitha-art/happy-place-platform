"""Database engine + session management.

Uses SQLite for development and PostgreSQL for production — switching is a
single environment variable (DATABASE_URL). Domain modules never import the
engine directly; they receive a session, keeping them portable and testable.

Two session helpers:
  * get_session()  -> FastAPI dependency (generator, yields a Session)
  * session_scope() -> context manager for manual use (`with session_scope() as db:`)
"""
from __future__ import annotations

from collections.abc import Generator, Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from packages.core.config import settings
from packages.core.logging import get_logger

log = get_logger("happyplace.db")

_connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
_engine: Engine = create_engine(
    settings.database_url,
    connect_args=_connect_args,
    pool_pre_ping=True,
    future=True,
)

_SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False, class_=Session)


def get_engine() -> Engine:
    return _engine


def set_engine(engine: Engine) -> None:
    """Swap the global engine (used by tests to point at a temp DB)."""
    global _engine, _SessionLocal
    _engine = engine
    _SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False, class_=Session)


def init_db() -> None:
    """Create all tables. Safe to call on startup (idempotent)."""
    from packages.database import models  # noqa: F401

    Base = __import__("packages.database.models.base", fromlist=["Base"]).Base
    Base.metadata.create_all(_engine)
    log.info("database initialized", extra={"ctx": {"url": _redact(settings.database_url)}})


def _redact(url: str) -> str:
    if "://" in url and "@" in url:
        scheme, rest = url.split("://", 1)
        return f"{scheme}://***:***@{rest.split('@', 1)[1]}"
    return url


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a scoped session and always closes it."""
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope() -> Iterator[Session]:
    """Context manager for manual use: `with session_scope() as db:`."""
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
