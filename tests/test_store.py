"""Store abstraction — in-memory semantics + demo workspace state."""

from helix.state import TRACE_BASE, WorkspaceState
from helix.store import InMemoryStore, get_store


def test_inmemory_ensure_returns_same_object():
    s = InMemoryStore()
    a = s.ensure("w1")
    b = s.ensure("w1")
    assert a is b  # caller mutates the live object in place (pre-refactor behavior)


def test_inmemory_load_missing_is_none():
    s = InMemoryStore()
    assert s.load("never-created") is None


def test_inmemory_append_events_is_noop():
    s = InMemoryStore()
    assert s.append_events("w1", [{"kind": "step"}]) is None


def test_demo_state_fields():
    ws = WorkspaceState.demo("default")
    assert ws.cycle == ws.history[-1].cycle
    assert ws.next_trace == TRACE_BASE
    assert ws.version == 1
    assert ws.documents == []
    assert ws.workspace_id == "default"


def test_mint_ids_advance():
    ws = WorkspaceState.demo("default")
    first = ws.mint_trace_id()
    second = ws.mint_trace_id()
    assert first != second
    assert ws.next_trace == TRACE_BASE + 2


def test_get_store_is_inmemory_in_demo():
    # conftest blanks Supabase creds, so the configured store is in-memory.
    assert isinstance(get_store(), InMemoryStore)
