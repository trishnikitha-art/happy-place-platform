"""Auth module — Google OAuth login, session user, role gating.

Supports developer login today and future client Workspace login. Roles come
from configuration (see packages.integrations.google.oauth.resolve_role). Provides FastAPI
dependencies used across the API.
"""
from __future__ import annotations

import os
from typing import Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from packages.core.config import settings
from packages.core.logging import log_auth
from packages.database import get_session
from packages.integrations.google.oauth import GoogleOAuth, resolve_role
from packages.database.models.enums import Role
from packages.database.models.user import User
from sqlalchemy.orm import Session


oauth = GoogleOAuth()
_bearer = HTTPBearer(auto_error=False)


def get_current_user(request: Request, db: Session = Depends(get_session)) -> User:
    """Resolve the current user from a dev cookie or a bearer token.

    In development we accept a simple signed session cookie set after OAuth.
    This is intentionally minimal — the production path uses the same
    `User` model and role checks, only the token verification differs.
    """
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


def require_role(*roles: Role):
    """Dependency factory that gates an endpoint to specific roles."""

    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in [r.value for r in roles]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return checker


def upsert_user_from_token(db: Session, token: dict[str, Any]) -> User:
    """Create or update a User from an OAuth token payload."""
    user = db.scalars(User.__table__.select().where(User.google_sub == token.get("google_sub"))).first()
    if user is None:
        user = db.scalars(User.__table__.select().where(User.email == token.get("email"))).first()
    if user is None:
        user = User()
        db.add(user)
    user.google_sub = token.get("google_sub")
    user.email = token.get("email")
    user.full_name = token.get("full_name")
    user.picture_url = token.get("picture_url")
    user.role = resolve_role(user.email or "")
    user.is_active = True
    db.commit()
    db.refresh(user)
    log_auth.info("user upserted", extra={"ctx": {"email": user.email, "role": user.role}})
    return user
