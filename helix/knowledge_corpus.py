"""Knowledge-base corpus — the actual document text behind the RAG collections.

`seed.KNOWLEDGE` lists the collections/docs and their metadata (chunk counts,
sizes) for the Knowledge screen. This module holds the *real text* those docs
contain, chunked into retrievable passages, so live-mode agents can run genuine
retrieval (`query_knowledge`) and ground their decisions in it.

In demo mode this is unused. In live mode the RAG layer (`rag.py`) embeds these
chunks (Gemini embeddings, or a keyword fallback) and returns the best matches
for an agent's query — e.g. Marketing pulls `marketing_guidelines` before
writing a campaign, Founder pulls `strategy_docs` before setting the goal.

Each chunk maps to a document named in `seed.KNOWLEDGE` so retrieved context is
attributable in the UI ("from marketing_guidelines / Audience Personas.pdf").
"""

from __future__ import annotations

from typing import TypedDict


class Chunk(TypedDict):
    collection: str
    doc: str
    text: str


# Authored passages. Kept concise but substantive — each one is a fact an agent
# can cite. Content is consistent with the CouponEx scenario and the demo's
# scripted reasoning (18–25 audience, short-form, day-21 win-back, $1k gate…).
CORPUS: list[Chunk] = [
    # --- company_docs ---------------------------------------------------
    {
        "collection": "company_docs",
        "doc": "CouponEx Company Overview.pdf",
        "text": (
            "CouponEx is an early-stage B2C coupon and cashback marketplace. Users "
            "discover verified discount codes and earn cashback on purchases from "
            "partner merchants. Revenue comes from affiliate commissions and a "
            "premium tier. The business is growth-stage and churn-sensitive, with "
            "three direct competitors. Core mission: make saving money effortless "
            "and trustworthy for everyday shoppers."
        ),
    },
    {
        "collection": "company_docs",
        "doc": "Brand Voice & Tone.md",
        "text": (
            "Brand voice is friendly, plain-spoken and energetic — never salesy or "
            "corporate. Speak like a savvy friend who found a great deal. Use short "
            "sentences, active voice and concrete savings numbers. Avoid jargon, "
            "hype words ('insane', 'crazy') and exclamation overload. Always lead "
            "with the user's benefit (money saved), not the mechanics."
        ),
    },
    # --- strategy_docs --------------------------------------------------
    {
        "collection": "strategy_docs",
        "doc": "Q3 Growth Plan.docx",
        "text": (
            "Q3 priority is efficient growth: grow MRR ~8% per cycle while holding "
            "CAC under $105. Lead with short-form acquisition over paid search; "
            "reinvest efficiency gains rather than expanding budget. Protect the "
            "price-sensitive cohort against competitor promotions with retention "
            "plays before chasing new growth. Keep at least 12 months of runway."
        ),
    },
    {
        "collection": "strategy_docs",
        "doc": "Pricing Strategy 2026.pdf",
        "text": (
            "Maintain a generous free tier to drive top-of-funnel; monetize via the "
            "premium cashback tier and affiliate commissions. Do not match "
            "competitor price cuts directly — compete on trust, breadth of partners "
            "and cashback reliability. When a competitor cuts price, respond with a "
            "retention/win-back play rather than discounting, to protect margin."
        ),
    },
    # --- marketing_guidelines -------------------------------------------
    {
        "collection": "marketing_guidelines",
        "doc": "Audience Personas.pdf",
        "text": (
            "The core audience skews 18–25, mobile-first, deal-seeking and highly "
            "responsive to social proof and short-form video. They distrust "
            "obvious advertising and respond to authentic creator content. A "
            "secondary 26–34 segment converts on email and referral. Target the "
            "18–25 segment for acquisition campaigns; nurture 26–34 by email."
        ),
    },
    {
        "collection": "marketing_guidelines",
        "doc": "Channel Playbook.md",
        "text": (
            "Short-form video (Instagram Reels, TikTok) consistently outperforms "
            "static creative for the 18–25 segment, with ~25% higher CTR. Refresh "
            "ad creative every two cycles to prevent fatigue. Any single-campaign "
            "spend above $1,000 must be routed through Operations for human "
            "approval before launch. Email is best for win-back and the 26–34 "
            "cohort. Avoid paid search except for high-intent branded terms."
        ),
    },
    {
        "collection": "marketing_guidelines",
        "doc": "Creative Guidelines.pdf",
        "text": (
            "Creative should show real savings in the first three seconds, feature "
            "relatable everyday purchases, and use creator-style authentic footage "
            "over polished studio ads. Captions must state the concrete cashback "
            "amount. Keep videos under 20 seconds. Always include a single clear "
            "call to action: download or claim the deal."
        ),
    },
    # --- sales_playbook -------------------------------------------------
    {
        "collection": "sales_playbook",
        "doc": "ICP & Qualification.md",
        "text": (
            "Ideal customers for the premium tier are frequent online shoppers "
            "(3+ purchases/month) aged 18–34 who already use a competing cashback "
            "service. Qualify inbound leads by purchase frequency, channel of "
            "origin (campaign traffic scores highest) and stated intent. Prioritize "
            "high-intent leads from acquisition campaigns. A day-21 post-signup "
            "win-back email recovers roughly 3% of lapsed users — use it for "
            "retention against competitor promotions."
        ),
    },
]


def all_chunks() -> list[Chunk]:
    return list(CORPUS)


def chunks_for(collection: str) -> list[Chunk]:
    return [c for c in CORPUS if c["collection"] == collection]
