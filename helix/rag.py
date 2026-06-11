"""RAG retrieval — `query_knowledge` over the company knowledge base.

Live mode grounds agent decisions in the knowledge corpus (`knowledge_corpus.py`):
agents retrieve relevant passages *before* acting. Retrieval is real semantic
search — passages are embedded with Gemini (`text-embedding-004`) into an
in-memory cosine index built once per process. If embeddings are unavailable
(no key / quota / offline tests) it degrades to keyword-overlap scoring so
retrieval still returns sensible, attributable context.

The in-memory index is serverless-safe (rebuilt cheaply from the small corpus
on cold start). A hosted Chroma Cloud store can drop in behind the same
`query()` interface later without touching callers.
"""

from __future__ import annotations

import logging
import math
import re

from . import knowledge_corpus
from .llm import LLM

log = logging.getLogger("helix.rag")

_WORD = re.compile(r"[a-z0-9]+")


def _tokens(text: str) -> set[str]:
    return set(_WORD.findall(text.lower()))


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


class Retrieved:
    __slots__ = ("collection", "doc", "text", "score")

    def __init__(self, collection: str, doc: str, text: str, score: float) -> None:
        self.collection = collection
        self.doc = doc
        self.text = text
        self.score = score

    def cite(self) -> str:
        return f"{self.collection}/{self.doc}"


class KnowledgeIndex:
    """In-memory retrieval index over the knowledge corpus."""

    def __init__(self, llm: LLM) -> None:
        self._llm = llm
        self._chunks = knowledge_corpus.all_chunks()
        self._vectors: list[list[float]] | None = None
        self._embedded = False

    def _ensure_embeddings(self) -> None:
        if self._embedded:
            return
        self._embedded = True  # only attempt once
        vecs = self._llm.embed([c["text"] for c in self._chunks])
        if vecs and len(vecs) == len(self._chunks):
            self._vectors = vecs
            log.info("RAG index embedded %d chunks", len(self._chunks))
        else:
            log.info("RAG running in keyword mode (no embeddings)")

    def query(self, query: str, collection: str | None = None, k: int = 3) -> list[Retrieved]:
        idxs = [
            i for i, c in enumerate(self._chunks)
            if collection is None or c["collection"] == collection
        ]
        if not idxs:
            return []

        self._ensure_embeddings()
        scores: list[tuple[int, float]] = []

        if self._vectors is not None:
            qv = self._llm.embed([query])
            if qv:
                qvec = qv[0]
                for i in idxs:
                    scores.append((i, _cosine(qvec, self._vectors[i])))

        if not scores:  # keyword fallback
            qt = _tokens(query)
            for i in idxs:
                ct = _tokens(self._chunks[i]["text"])
                overlap = len(qt & ct)
                denom = len(qt) or 1
                scores.append((i, overlap / denom))

        scores.sort(key=lambda s: s[1], reverse=True)
        out: list[Retrieved] = []
        for i, score in scores[:k]:
            if score <= 0 and out:
                break
            c = self._chunks[i]
            out.append(Retrieved(c["collection"], c["doc"], c["text"], score))
        return out
