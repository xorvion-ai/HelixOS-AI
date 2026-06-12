"""Gemini LLM layer — reasoning + real tool-calling for live mode.

Wraps the `google-genai` SDK behind a small interface the agent graph depends
on. Two concrete implementations:

* `GeminiLLM`  — talks to Google Gemini (Pro for Founder/Operations, Flash for
  the rest). Supports structured-JSON decisions and a genuine function-calling
  loop (the model chooses which tools to call; we execute them and feed results
  back), plus embeddings for RAG / memory.
* `FakeLLM`    — deterministic, offline stand-in used by tests and as the
  graceful fallback when no key is set or a live call fails. It exercises the
  exact same tool path (calling each offered tool with its `demo_args`) so the
  graph, state mutations and approval gate are fully verifiable without network.

Design rule: the graph never calls the SDK directly and never crashes a cycle
on an LLM error — `run_agent` always returns an `AgentTurn`, falling back to the
deterministic path so demos stay dependable (the project's core philosophy).
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Protocol

from .config import get_settings

log = logging.getLogger("helix.llm")


# --- Tool & turn types --------------------------------------------------

@dataclass
class ToolSpec:
    """A callable an agent may invoke. `parameters` is a JSON-schema-style dict
    of the args the model can pass; `demo_args` are the deterministic defaults
    used by the fallback/fake path and to fill any args the model omits."""
    name: str
    description: str
    parameters: dict[str, Any]
    fn: Callable[[dict[str, Any]], str]
    demo_args: dict[str, Any] = field(default_factory=dict)


@dataclass
class ToolCall:
    name: str
    args: dict[str, Any]
    result: str


@dataclass
class AgentTurn:
    """Outcome of one agent invocation."""
    text: str                       # final natural-language summary (the trace "result")
    decision: str                   # one-line decision
    reasoning: str                  # why (cites RAG/memory)
    tools_used: list[str]
    calls: list[ToolCall]
    tokens: int


# --- Interface ----------------------------------------------------------

class LLM(Protocol):
    enabled: bool

    def run_agent(
        self, *, model: str, system: str, prompt: str,
        tools: list[ToolSpec], fallback: "AgentTurn",
    ) -> AgentTurn: ...

    def plan(
        self, *, model: str, system: str, prompt: str,
        fallback: dict[str, str],
    ) -> dict[str, str]: ...

    def embed(self, texts: list[str]) -> list[list[float]] | None: ...


# --- Deterministic fake / fallback -------------------------------------

class FakeLLM:
    """Offline implementation. Calls every offered tool once with its
    `demo_args`, accumulating real state mutations, and returns a plausible
    summary. Used in tests and whenever Gemini is unavailable."""

    enabled = False

    def run_agent(self, *, model, system, prompt, tools, fallback) -> AgentTurn:
        calls: list[ToolCall] = []
        for t in tools:
            try:
                res = t.fn(dict(t.demo_args))
            except Exception as e:  # a tool bug must not kill the cycle
                log.warning("tool %s failed in fallback: %s", t.name, e)
                res = f"{t.name} skipped"
            calls.append(ToolCall(name=t.name, args=dict(t.demo_args), result=res))
        return AgentTurn(
            text=fallback.text,
            decision=fallback.decision,
            reasoning=fallback.reasoning,
            tools_used=[t.name for t in tools] or fallback.tools_used,
            calls=calls,
            tokens=fallback.tokens,
        )

    def plan(self, *, model, system, prompt, fallback) -> dict[str, str]:
        return dict(fallback)

    def embed(self, texts):
        return None


# --- Real Gemini implementation ----------------------------------------

@dataclass
class _KeySlot:
    """One Gemini API key + its client. `model_override`, when set, replaces the
    requested model for this slot (the fallback key serves a lighter model)."""
    client: Any
    model_override: str | None = None


class GeminiLLM:
    """google-genai backed implementation with automatic multi-key failover.

    Holds one client per configured key. Every generate call walks the slots in
    order: on a quota / rate-limit error (HTTP 429 / RESOURCE_EXHAUSTED) it moves
    to the next key and retries; any other error is raised immediately. This lets
    the app keep running once the primary free-tier key is exhausted — the second
    key (serving `gemini_model_fallback`) takes over transparently."""

    enabled = True

    def __init__(self, keys: list[str], embed_model: str, fallback_model: str | None = None) -> None:
        from google import genai  # imported lazily so demo mode needs no install
        self._genai = genai
        self._embed_model = embed_model
        if not keys:
            raise ValueError("GeminiLLM requires at least one API key")
        self._slots: list[_KeySlot] = []
        for i, key in enumerate(keys):
            # The primary key uses the requested model; spare keys serve the
            # lighter fallback model.
            override = None if i == 0 else fallback_model
            self._slots.append(_KeySlot(client=genai.Client(api_key=key), model_override=override))
        # Back-compat: some call sites / tests reference `_client` directly.
        self._client = self._slots[0].client

    # -- multi-key failover ---------------------------------------------

    def _gen(self, *, model: str, contents: Any, config: Any):
        """generate_content with key failover. Tries each slot in order; on a
        quota/rate-limit error moves to the next key, else re-raises."""
        last_exc: Exception | None = None
        for i, slot in enumerate(self._slots):
            use_model = slot.model_override or model
            try:
                return slot.client.models.generate_content(
                    model=use_model, contents=contents, config=config,
                )
            except Exception as e:  # noqa: BLE001 - inspected below
                if _is_quota_error(e) and i < len(self._slots) - 1:
                    log.warning("Gemini key #%d hit a quota/rate limit; failing over to next key", i + 1)
                    last_exc = e
                    continue
                raise
        if last_exc:
            raise last_exc
        raise RuntimeError("no Gemini keys available")

    # -- helpers --------------------------------------------------------

    def _schema(self, params: dict[str, Any]):
        """Convert a plain JSON-schema dict into a google-genai Schema."""
        from google.genai import types as gt

        type_map = {
            "string": gt.Type.STRING, "integer": gt.Type.INTEGER,
            "number": gt.Type.NUMBER, "boolean": gt.Type.BOOLEAN,
            "array": gt.Type.ARRAY, "object": gt.Type.OBJECT,
        }
        props = {}
        for key, spec in params.get("properties", {}).items():
            props[key] = gt.Schema(
                type=type_map.get(spec.get("type", "string"), gt.Type.STRING),
                description=spec.get("description", ""),
            )
        return gt.Schema(
            type=gt.Type.OBJECT,
            properties=props or None,
            required=params.get("required") or None,
        )

    # -- agent run (function calling) -----------------------------------

    def run_agent(self, *, model, system, prompt, tools, fallback) -> AgentTurn:
        try:
            return self._run_agent(model=model, system=system, prompt=prompt, tools=tools)
        except Exception as e:
            log.warning("Gemini run_agent(%s) failed, falling back: %s", model, e)
            # Deterministic fallback still executes the tools so state moves.
            return FakeLLM().run_agent(
                model=model, system=system, prompt=prompt, tools=tools, fallback=fallback,
            )

    def _run_agent(self, *, model, system, prompt, tools) -> AgentTurn:
        from google.genai import types as gt

        by_name = {t.name: t for t in tools}
        declarations = [
            gt.FunctionDeclaration(
                name=t.name, description=t.description, parameters=self._schema(t.parameters),
            )
            for t in tools
        ]
        config = gt.GenerateContentConfig(
            system_instruction=system,
            tools=[gt.Tool(function_declarations=declarations)] if declarations else None,
            temperature=0.5,
        )
        contents: list[Any] = [gt.Content(role="user", parts=[gt.Part(text=prompt)])]

        calls: list[ToolCall] = []
        tokens = 0
        last_text = ""
        # Bounded loop: at most one round per tool plus a final summary turn.
        for _ in range(len(tools) + 2):
            resp = self._gen(model=model, contents=contents, config=config)
            tokens += _usage(resp)
            fcs = list(getattr(resp, "function_calls", None) or [])
            if not fcs:
                last_text = (getattr(resp, "text", "") or "").strip()
                break
            # Record the model's tool-call turn, then execute each call.
            if resp.candidates and resp.candidates[0].content:
                contents.append(resp.candidates[0].content)
            for fc in fcs:
                spec = by_name.get(fc.name)
                args = dict(fc.args or {})
                if spec is None:
                    result = f"unknown tool {fc.name}"
                else:
                    merged = {**spec.demo_args, **args}  # backfill omitted args
                    try:
                        result = spec.fn(merged)
                    except Exception as e:
                        log.warning("tool %s raised: %s", fc.name, e)
                        result = f"{fc.name} error"
                    args = merged
                calls.append(ToolCall(name=fc.name, args=args, result=result))
                contents.append(
                    gt.Content(role="user", parts=[
                        gt.Part.from_function_response(name=fc.name, response={"result": result}),
                    ])
                )

        decision, reasoning, summary = _split_summary(last_text)
        used = list(dict.fromkeys(c.name for c in calls))
        return AgentTurn(
            text=summary or last_text or "Completed.",
            decision=decision,
            reasoning=reasoning,
            tools_used=used,
            calls=calls,
            tokens=tokens or 0,
        )

    # -- structured planning (no tools) ---------------------------------

    def plan(self, *, model, system, prompt, fallback) -> dict[str, str]:
        from google.genai import types as gt

        try:
            schema = gt.Schema(
                type=gt.Type.OBJECT,
                properties={k: gt.Schema(type=gt.Type.STRING) for k in fallback},
                required=list(fallback),
            )
            resp = self._gen(
                model=model,
                contents=[gt.Content(role="user", parts=[gt.Part(text=prompt)])],
                config=gt.GenerateContentConfig(
                    system_instruction=system,
                    response_mime_type="application/json",
                    response_schema=schema,
                    temperature=0.5,
                ),
            )
            data = json.loads(resp.text)
            out = dict(fallback)
            for k in fallback:
                if isinstance(data.get(k), str) and data[k].strip():
                    out[k] = data[k].strip()
            out["_tokens"] = str(_usage(resp))
            return out
        except Exception as e:
            log.warning("Gemini plan(%s) failed, falling back: %s", model, e)
            return dict(fallback)

    # -- embeddings -----------------------------------------------------

    def embed(self, texts: list[str]) -> list[list[float]] | None:
        last_exc: Exception | None = None
        for i, slot in enumerate(self._slots):
            try:
                resp = slot.client.models.embed_content(model=self._embed_model, contents=texts)
                return [list(e.values) for e in resp.embeddings]
            except Exception as e:
                last_exc = e
                if _is_quota_error(e) and i < len(self._slots) - 1:
                    continue
                break
        log.warning("Gemini embed failed, falling back to keyword search: %s", last_exc)
        return None


# --- helpers ------------------------------------------------------------

def _is_quota_error(exc: Exception) -> bool:
    """True when an exception looks like a rate-limit / quota-exhausted error
    (HTTP 429 / RESOURCE_EXHAUSTED), which is what we fail over on."""
    code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    if code == 429:
        return True
    text = f"{getattr(exc, 'status', '')} {exc}".lower()
    return any(s in text for s in ("429", "resource_exhausted", "quota", "rate limit", "too many requests"))


def _usage(resp: Any) -> int:
    meta = getattr(resp, "usage_metadata", None)
    if meta is None:
        return 0
    return int(getattr(meta, "total_token_count", 0) or 0)


def _split_summary(text: str) -> tuple[str, str, str]:
    """Best-effort split of a free-text summary into decision / reasoning /
    result. The model is prompted to use 'Decision:' / 'Reason:' lines; if it
    doesn't, we degrade gracefully."""
    decision = reasoning = summary = ""
    for line in text.splitlines():
        low = line.lower().strip()
        if low.startswith("decision:"):
            decision = line.split(":", 1)[1].strip()
        elif low.startswith("reason:") or low.startswith("reasoning:"):
            reasoning = line.split(":", 1)[1].strip()
        elif low.startswith("result:") or low.startswith("summary:"):
            summary = line.split(":", 1)[1].strip()
    return decision, reasoning, summary


# --- module singleton ---------------------------------------------------

_instance: LLM | None = None
_resolved = False


def get_llm() -> LLM:
    """Return the active LLM. GeminiLLM when GOOGLE_API_KEY is set and the SDK
    imports; otherwise the deterministic FakeLLM (demo-mode fallback)."""
    global _instance, _resolved
    if _resolved and _instance is not None:
        return _instance
    settings = get_settings()
    if settings.gemini_enabled:
        try:
            _instance = GeminiLLM(
                settings.gemini_keys,
                settings.gemini_embed_model,
                fallback_model=settings.gemini_model_fallback,
            )
        except Exception as e:  # SDK missing / bad key shape → demo fallback
            log.warning("Gemini unavailable (%s); using FakeLLM", e)
            _instance = FakeLLM()
    else:
        _instance = FakeLLM()
    _resolved = True
    return _instance


def reset_llm() -> None:
    """Clear the cached LLM (used by tests)."""
    global _instance, _resolved
    _instance, _resolved = None, False
