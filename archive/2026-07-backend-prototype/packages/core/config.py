"""Environment-based configuration.

Nothing is hardcoded. Every value comes from the environment (or a .env file).
To move from the development Workspace to a client's production Workspace,
only the environment variables change — never the code.
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, sourced entirely from the environment."""

    model_config = SettingsConfigDict(
        env_file=os.getenv("ENV_FILE", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---- Environment ----
    environment: Literal["development", "staging", "production"] = "development"

    # ---- Application ----
    app_name: str = "Happy Place Backend"
    secret_key: str = "change-me"
    frontend_url: str = "http://localhost:5173"
    log_level: str = "INFO"
    log_format: Literal["json", "text"] = "json"

    # ---- Database ----
    # SQLite for dev; switch to postgresql+psycopg://... for prod.
    # Schema is designed to migrate cleanly (see docs/ARCHITECTURE.md).
    database_url: str = "sqlite:///./happy_place.db"

    # ---- Google Workspace (all dev credentials) ----
    google_project_id: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/callback"
    google_workspace_email: str = ""
    google_drive_root_folder: str = ""
    google_calendar_id: str = "primary"

    # ---- Mail behavior ----
    mail_mode: Literal["dev", "live"] = "dev"  # dev -> logged not sent

    # ---- Google integration mode ----
    # When true, Google services use in-memory mocks (no real API calls).
    google_use_mock: bool = True

    # ---- OAuth scopes (space separated) ----
    oauth_scopes: str = (
        "openid email profile "
        "https://www.googleapis.com/auth/drive "
        "https://www.googleapis.com/auth/calendar "
        "https://www.googleapis.com/auth/gmail.send "
        "https://www.googleapis.com/auth/contacts.readonly"
    )

    @field_validator("oauth_scopes")
    @classmethod
    def _split_scopes(cls, v: str) -> list[str]:
        return [s.strip() for s in v.split() if s.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def oauth_scopes_list(self) -> list[str]:
        # re-exposed for callers that already have a validated instance
        return self.oauth_scopes  # type: ignore[return-value]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (singleton per process)."""
    return Settings()


settings = get_settings()
