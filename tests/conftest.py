"""Pytest session setup — force hermetic DEMO mode.

This machine's `.env` carries real Supabase creds, which would make the API
require auth (401) and the store hit Postgres. Tests must be offline and
deterministic, so before any `helix.*` module is imported we blank the
credential env vars and clear the settings cache. Result: demo mode, the
in-memory store, no network — exactly the zero-keys experience.
"""

import os

for _k in ("SUPABASE_URL", "SUPABASE_SERVICE_KEY", "SUPABASE_ANON_KEY", "GOOGLE_API_KEY", "DATABASE_URL"):
    os.environ[_k] = ""

from helix.config import get_settings  # noqa: E402

get_settings.cache_clear()
