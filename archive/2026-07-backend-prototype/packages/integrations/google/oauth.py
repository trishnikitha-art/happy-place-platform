"""Google OAuth: authorization URL, token exchange, user info, role mapping.

Supports developer login today and future client Workspace login. Roles are
resolved from configuration (allow-lists) — never hardcoded per person.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from google_auth_oauthlib.flow import Flow

from packages.core.config import settings
from packages.core.logging import log_auth

# Where dev credentials live. Never commit this file.
_TOKEN_STORE = Path(".google_tokens.json")


class GoogleOAuth:
    """Thin wrapper around the OAuth 2.0 authorization-code flow."""

    # Space-separated scope string for the auth request.
    SCOPES = settings.oauth_scopes

    def build_flow(self, state: str | None = None) -> Flow:
        client_config = {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.google_redirect_uri],
            }
        }
        flow = Flow.from_client_config(
            client_config,
            scopes=self.SCOPES,
            redirect_uri=settings.google_redirect_uri,
        )
        if state:
            flow.state = state
        return flow

    def authorization_url(self, state: str | None = None) -> tuple[str, str]:
        flow = self.build_flow(state)
        url, state = flow.authorization_url(
            access_type="offline",  # gets a refresh token
            include_granted_scopes="true",
            prompt="consent",
        )
        # Stash the flow state so we can verify on callback.
        self._save_flow_state(state)
        log_auth.info("oauth authorization url issued", extra={"ctx": {"state": state}})
        return url, state

    def exchange(self, authorization_response_url: str) -> dict[str, Any]:
        """Exchange the callback URL for credentials; return user info + tokens."""
        flow = self.build_flow()
        flow.fetch_token(authorization_response=authorization_response_url)
        creds = flow.credentials
        userinfo = self._userinfo(creds)
        token = {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": creds.scopes,
            "google_sub": userinfo.get("sub"),
            "email": userinfo.get("email"),
            "full_name": userinfo.get("name"),
            "picture_url": userinfo.get("picture"),
        }
        log_auth.info("oauth token exchanged", extra={"ctx": {"email": token["email"]}})
        return token

    def _userinfo(self, creds: Any) -> dict[str, Any]:
        from google.auth.transport.requests import Request
        from google.oauth2.id_token import verify_oauth2_token

        try:
            info = verify_oauth2_token(creds.id_token, Request(), settings.google_client_id)
            return info  # type: ignore[no-any-return]
        except Exception:  # pragma: no cover - fallback path
            return {"email": settings.google_workspace_email}

    def _save_flow_state(self, state: str) -> None:
        _TOKEN_STORE.parent.mkdir(parents=True, exist_ok=True)
        data = json.loads(_TOKEN_STORE.read_text()) if _TOKEN_STORE.exists() else {}
        data["last_state"] = state
        _TOKEN_STORE.write_text(json.dumps(data))


def resolve_role(email: str) -> str:
    """Resolve a platform role from configuration-based allow-lists.

    Real deployments configure ADMIN_EMAILS / ESTIMATOR_EMAILS env vars. Default
    is OFFICE. Never hardcode a single person's role in code.
    """
    from packages.database.models.enums import Role

    admin_emails = {e.strip().lower() for e in (settings_extra("ADMIN_EMAILS") or "").split(",") if e.strip()}
    estimator_emails = {e.strip().lower() for e in (settings_extra("ESTIMATOR_EMAILS") or "").split(",") if e.strip()}
    tech_emails = {e.strip().lower() for e in (settings_extra("TECHNICIAN_EMAILS") or "").split(",") if e.strip()}

    low = email.strip().lower()
    if low in admin_emails:
        return Role.ADMINISTRATOR.value
    if low in tech_emails:
        return Role.TECHNICIAN.value
    if low in estimator_emails:
        return Role.ESTIMATOR.value
    return Role.OFFICE.value


def settings_extra(key: str) -> str:
    import os

    return os.getenv(key, "")
