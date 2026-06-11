"""Auth — resolve a request to a workspace id.

Demo mode (no Supabase creds) always resolves to the `"default"` workspace, so
the zero-keys experience is unchanged and unauthenticated.

When Supabase is configured, the bearer token is verified by calling the
Supabase auth REST endpoint (`GET /auth/v1/user`) with `httpx` (already a
dependency). This avoids managing a local JWT secret and is robust to Supabase's
signing-key changes. Results are cached briefly per token to avoid a round trip
on every request. One workspace per user: `workspace_id = user.id`.
"""

from __future__ import annotations

import time
from dataclasses import dataclass

import httpx
from fastapi import HTTPException

from .config import get_settings


@dataclass
class AuthUser:
    """Resolved identity for a request. `is_default` marks the public, no-auth
    demo workspace (Supabase not configured)."""
    id: str
    email: str | None = None
    name: str | None = None
    is_default: bool = False

    @property
    def is_admin(self) -> bool:
        return self.is_default or get_settings().is_admin(self.email)


_DEFAULT_USER = AuthUser(id="default", is_default=True)

# token -> (AuthUser, expires_at_monotonic)
_cache: dict[str, tuple[AuthUser, float]] = {}
_CACHE_TTL = 30.0  # seconds


def _bearer(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.split(None, 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return None


def resolve_user(authorization: str | None) -> AuthUser:
    """Return the resolved `AuthUser` for this request. The public demo user in
    demo mode; the authenticated user (id + email + name) when Supabase is
    configured. Raises 401 if a token is required but missing/invalid."""
    settings = get_settings()
    if not settings.supabase_enabled:
        return _DEFAULT_USER

    token = _bearer(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    now = time.monotonic()
    cached = _cache.get(token)
    if cached and cached[1] > now:
        return cached[0]

    try:
        resp = httpx.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_anon_key or "",
            },
            timeout=8.0,
        )
    except httpx.HTTPError as e:  # pragma: no cover - network
        raise HTTPException(status_code=503, detail="Auth service unreachable") from e

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    data = resp.json()
    user_id = data.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token (no user id)")

    meta = data.get("user_metadata") or {}
    name = meta.get("full_name") or meta.get("name") or None
    user = AuthUser(id=user_id, email=data.get("email"), name=name)
    _cache[token] = (user, now + _CACHE_TTL)
    return user


def resolve_workspace_id(authorization: str | None) -> str:
    """Back-compat shim: the workspace id for this request (= the user id)."""
    return resolve_user(authorization).id
