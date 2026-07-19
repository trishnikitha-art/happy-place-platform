"""Auth API router (OAuth login + current user)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from packages.auth import get_current_user, upsert_user_from_token
from packages.database import get_session
from packages.database.models.user import User

router = APIRouter()


# ---- Auth ----
@router.get("/login/url")
async def login_url(state: str | None = None) -> dict:
    from packages.integrations.google.oauth import oauth

    url, st = oauth.authorization_url(state)
    return {"authorization_url": url, "state": st}


@router.get("/callback")
async def callback(request: Request, db: Session = Depends(get_session)) -> dict:
    """OAuth callback. Exchanges code for tokens, upserts user, returns role."""
    from packages.integrations.google.oauth import oauth

    full_url = str(request.url)
    token = oauth.exchange(full_url)
    user = upsert_user_from_token(db, token)
    return {"email": user.email, "role": user.role, "authenticated": True}


@router.get("/me")
async def me(user: User = Depends(get_current_user)) -> dict:
    return {"email": user.email, "role": user.role, "name": user.full_name}
