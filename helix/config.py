"""Runtime configuration for the HelixOS backend.

All settings are read from environment variables (or a local .env file).
Every AI/integration credential is optional so the backend boots and serves
the simulation in "demo mode" with zero external dependencies — exactly the
free-phase requirement. When a key is present, the corresponding capability
(Gemini, Chroma, Supabase) switches on.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# On TLS-inspecting networks the corporate root CA isn't in certifi's bundle, so
# httpx-based clients (supabase-py, our JWT check) fail cert verification. If
# `truststore` is installed, route SSL through the OS trust store (which has the
# corporate CA) — the Python equivalent of npm's --use-system-ca. No-op when the
# package is absent, so demo mode / clean networks are unaffected.
try:  # pragma: no cover - environment dependent
    import truststore

    truststore.inject_into_ssl()
except Exception:
    pass


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- App ---
    app_name: str = "HelixOS AI"
    environment: str = "development"
    # Comma-separated list of allowed CORS origins for the Next.js frontend.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    # Comma-separated emails with owner/admin access. The admin account also
    # sees the seeded CouponEx demo workspace; everyone else gets their own
    # (empty → onboarding) workspace.
    admin_emails: str = "sumitchoudhary2812@gmail.com"
    # Shared secret that guards the background cron endpoint (/api/cron/cycle).
    # Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>`. When unset,
    # the endpoint is disabled (returns 503) so it can't be triggered publicly.
    cron_secret: str | None = None
    # Max workspaces a single cron run will step (bounds runtime on free tiers).
    cron_max_workspaces: int = 25

    # --- Google Gemini (LLM) ---
    # Defaults are current free-tier models (the 1.5 family was retired in
    # 2025). Override via env if you prefer 2.0-flash etc.
    google_api_key: str | None = None
    # Optional second Gemini key. When set, the LLM layer fails over to it
    # automatically once the primary key hits its rate/quota limit (HTTP 429),
    # so cycles keep running. The fallback key uses `gemini_model_fallback`
    # (a lighter/cheaper model — e.g. a flash-lite tier).
    google_api_key_2: str | None = None
    gemini_model_pro: str = "gemini-2.5-pro"
    gemini_model_flash: str = "gemini-2.5-flash"
    # Model used by the second (fallback) key. Set this to the exact model id
    # you want the spare key to serve (e.g. a flash-lite tier).
    gemini_model_fallback: str = "gemini-2.5-flash-lite"
    gemini_embed_model: str = "text-embedding-004"

    # --- Chroma Cloud (RAG vector store) ---
    chroma_api_key: str | None = None
    chroma_tenant: str | None = None
    chroma_database: str | None = None

    # --- Supabase (Postgres + Auth + Realtime) ---
    supabase_url: str | None = None
    supabase_service_key: str | None = None
    # Anon (public) key — used to verify user JWTs via the auth REST endpoint.
    supabase_anon_key: str | None = None
    # Pooled Postgres connection string — reserved for the LangGraph Postgres
    # checkpointer (a later Track C phase); unused today.
    database_url: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def admin_email_set(self) -> set[str]:
        return {e.strip().lower() for e in self.admin_emails.split(",") if e.strip()}

    def is_admin(self, email: str | None) -> bool:
        return bool(email) and email.lower() in self.admin_email_set

    @property
    def gemini_enabled(self) -> bool:
        return bool(self.google_api_key or self.google_api_key_2)

    @property
    def gemini_keys(self) -> list[str]:
        """Available Gemini API keys, in failover order (primary first)."""
        return [k for k in (self.google_api_key, self.google_api_key_2) if k]

    @property
    def chroma_enabled(self) -> bool:
        return bool(self.chroma_api_key and self.chroma_tenant and self.chroma_database)

    @property
    def supabase_enabled(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
