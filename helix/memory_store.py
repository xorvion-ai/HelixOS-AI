"""Long-term memory — semantic recall of past learnings.

After each cycle the system writes a structured learning (the "Learn" phase).
At the start of the next cycle agents recall the most relevant learnings and
inject them into their prompts, so the org visibly improves over time.

The simulation owns the canonical list of `Memory` objects; this store is a
thin retrieval helper over that list. Recall is semantic when Gemini embeddings
are available (cosine over `result + lesson`), and degrades to keyword overlap
otherwise — same pattern as `rag.py`.
"""

from __future__ import annotations

from .llm import LLM
from .models import Memory
from .rag import _cosine, _tokens


class MemoryStore:
    def __init__(self, llm: LLM) -> None:
        self._llm = llm

    @staticmethod
    def _text(m: Memory) -> str:
        return f"{m.result}. {m.lesson}"

    def recall(self, memories: list[Memory], context: str, k: int = 3) -> list[Memory]:
        """Return up to k learnings most relevant to `context`."""
        if not memories:
            return []

        scored: list[tuple[float, Memory]] = []
        vecs = self._llm.embed([self._text(m) for m in memories] + [context])
        if vecs and len(vecs) == len(memories) + 1:
            qv = vecs[-1]
            for m, v in zip(memories, vecs[:-1]):
                scored.append((_cosine(qv, v), m))
        else:  # keyword fallback
            qt = _tokens(context)
            for m in memories:
                overlap = len(qt & _tokens(self._text(m)))
                scored.append((overlap / (len(qt) or 1), m))

        scored.sort(key=lambda s: s[0], reverse=True)
        return [m for score, m in scored[:k] if score > 0] or memories[:k]
