"""Store — pluggable persistence for `WorkspaceState`.

Two implementations:

* `InMemoryStore` — keeps each workspace in a process dict. This is demo mode:
  zero external dependencies, and `ensure()` returns the *same* object every
  time so in-process mutations persist exactly as they did before this refactor.
* `SupabaseStore` — reads/writes normalized Postgres tables (added in the
  persistence step; imported lazily so demo mode needs no `supabase` package).

`Simulation` talks only to this interface, so swapping demo ↔ live persistence
is a config flip (`supabase_enabled`) with no change to the API surface.
"""

from __future__ import annotations

from typing import Protocol

from .config import get_settings
from .state import WorkspaceState


class StaleWorkspaceError(Exception):
    """Raised by a persistent store's `save` when the workspace row was
    modified by another invocation since it was loaded (optimistic-locking
    version mismatch). The caller should re-hydrate and retry the mutation."""


class Store(Protocol):
    def load(self, workspace_id: str) -> WorkspaceState | None:
        """Return the persisted state, or None if the workspace doesn't exist."""
        ...

    def ensure(self, workspace_id: str, seed_demo: bool = True) -> WorkspaceState:
        """Return the state, creating it if it doesn't exist. `seed_demo=True`
        seeds the CouponEx demo (admin / public workspace); `False` creates a
        fresh, not-yet-onboarded workspace for a new user."""
        ...

    def save(self, state: WorkspaceState) -> None:
        """Persist the whole workspace. May raise `StaleWorkspaceError`."""
        ...

    def append_events(self, workspace_id: str, events: list[dict]) -> None:
        """Append realtime `activity_events` rows for a just-run cycle. A no-op
        for stores without a realtime backend (demo / in-memory)."""
        ...


class InMemoryStore:
    """Process-local store — the free-phase demo. `save` is a no-op because
    `ensure`/`load` hand back the live object that the caller mutates in place,
    exactly mirroring the pre-refactor singleton behavior."""

    def __init__(self) -> None:
        self._spaces: dict[str, WorkspaceState] = {}

    def load(self, workspace_id: str) -> WorkspaceState | None:
        return self._spaces.get(workspace_id)

    def ensure(self, workspace_id: str, seed_demo: bool = True) -> WorkspaceState:
        ws = self._spaces.get(workspace_id)
        if ws is None:
            ws = WorkspaceState.demo(workspace_id) if seed_demo else WorkspaceState.onboarding(workspace_id)
            self._spaces[workspace_id] = ws
        return ws

    def save(self, state: WorkspaceState) -> None:
        # The object is already live in the dict; nothing to flush.
        self._spaces[state.workspace_id] = state

    def append_events(self, workspace_id: str, events: list[dict]) -> None:
        # Demo mode has no Realtime backend; the triggering client animates
        # locally from the HTTP response, so there's nothing to broadcast.
        return None


# The persistent store (when configured) is process-wide so every workspace
# shares one Supabase client/connection; it is built lazily so demo mode never
# imports the optional `supabase` package.
_supabase: Store | None = None


def get_store() -> Store:
    """Return the configured store. When Supabase credentials are set, all
    workspaces share one `SupabaseStore`. Otherwise each caller gets a fresh
    `InMemoryStore` (demo mode): a new `Simulation()` boots to clean demo state,
    exactly as before this refactor — cross-request consistency for a workspace
    comes from `get_simulation()` caching one `Simulation` per workspace id."""
    global _supabase
    if get_settings().supabase_enabled:
        if _supabase is None:
            from .supabase_store import SupabaseStore  # lazy: optional dep

            _supabase = SupabaseStore()
        return _supabase
    return InMemoryStore()
