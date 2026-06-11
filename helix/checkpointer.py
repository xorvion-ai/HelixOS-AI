"""LangGraph checkpointer selection.

The live multi-agent graph needs a checkpointer so an interactive cycle can
pause at a human-approval `interrupt()` and resume later. In demo / single-
process mode an in-memory `MemorySaver` is enough. When `DATABASE_URL` is set
(the pooled Postgres connection string), we use LangGraph's **Postgres
checkpointer** so a paused cycle survives a serverless cold start / restart.

Both the optional package and the database are treated as best-effort: if the
import fails or the connection can't be established, we log and fall back to
`MemorySaver`. So demo mode and the offline tests are never affected, and a
misconfigured `DATABASE_URL` degrades gracefully instead of breaking a cycle.
"""

from __future__ import annotations

import logging

from .config import get_settings

log = logging.getLogger("helix.checkpointer")

_checkpointer = None  # process-level singleton (the graph is built once)


def get_checkpointer():
    """Return the active LangGraph checkpointer. Postgres when `DATABASE_URL`
    is set and reachable; otherwise an in-memory `MemorySaver`."""
    global _checkpointer
    if _checkpointer is not None:
        return _checkpointer

    url = get_settings().database_url
    if url:
        try:
            # Optional dep: `pip install langgraph-checkpoint-postgres psycopg[binary]`
            from langgraph.checkpoint.postgres import PostgresSaver

            # from_conn_string yields a context-managed pool; we keep it open for
            # the process lifetime (the graph/runner is a singleton).
            cm = PostgresSaver.from_conn_string(url)
            saver = cm.__enter__()
            saver.setup()  # idempotent: creates the checkpoint tables if needed
            log.info("LangGraph Postgres checkpointer active (durable interactive resume)")
            _checkpointer = saver
            return _checkpointer
        except Exception:  # pragma: no cover - needs a live DB + the optional dep
            log.exception("Postgres checkpointer unavailable; using in-memory MemorySaver")

    from langgraph.checkpoint.memory import MemorySaver

    _checkpointer = MemorySaver()
    return _checkpointer
