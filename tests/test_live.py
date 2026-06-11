"""Offline verification for live mode.

Runs the real LangGraph cycle with the deterministic `FakeLLM` (no API key, no
network), so we can verify the graph topology, real tool-calling state
mutations, the approval gate, and the human-in-the-loop interrupt()/resume flow
— everything except the actual Gemini HTTP exchange. Also asserts that demo
(scripted) mode is unchanged.

Run:  .venv\\Scripts\\python.exe tests\\test_live.py
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from helix import seed                       # noqa: E402
from helix.llm import FakeLLM                 # noqa: E402
from helix.live import LiveRunner             # noqa: E402
from helix.simulation import Simulation       # noqa: E402

_passed = 0


def check(cond: bool, label: str) -> None:
    global _passed
    if cond:
        _passed += 1
        print(f"  ok  {label}")
    else:
        print(f"  FAIL {label}")
        raise AssertionError(label)


def _ids():
    """Fresh id generators matching the sim's format."""
    import itertools
    tc, mc, ac = itertools.count(1), itertools.count(1), itertools.count(1)
    return (lambda: f"t-{next(tc)}", lambda: f"m-{next(mc)}", lambda: f"ap-{next(ac)}")


def prev_state():
    return seed.CYCLE_HISTORY[-1].model_copy()


# --- 1. Autonomous live cycle ------------------------------------------

def test_autonomous():
    print("\n[1] Autonomous live cycle (FakeLLM)")
    runner = LiveRunner(FakeLLM())
    check(not runner.enabled, "runner reports demo/fallback (FakeLLM not enabled)")
    prev = prev_state()
    t, m, a = _ids()
    out = runner.start(prev=prev, cycle=prev.cycle + 1, memories=list(seed.MEMORY),
                       interactive=False, mk_trace_id=t, mk_mem_id=m, mk_approval_id=a)

    check(out.status == "complete", "status complete")
    actors = [s.actor for s in out.steps]
    check(actors == ["founder", "operations", "research", "marketing", "sales",
                     "finance", "support", "analytics", "founder"],
          f"9 steps in supervisor order (got {actors})")
    fs = out.final_state
    check(fs.users > prev.users, f"users grew {prev.users}→{fs.users}")
    check(fs.mrr > prev.mrr, f"MRR grew {prev.mrr}→{fs.mrr}")
    check(fs.cac < prev.cac, f"CAC fell {prev.cac}→{fs.cac}")
    check(fs.churn < prev.churn, f"churn fell {prev.churn}→{fs.churn}")
    check(fs.budget < prev.budget, f"budget spent {prev.budget}→{fs.budget}")
    check(out.learning is not None and out.learning.cycle == prev.cycle + 1, "learning written")
    check(len(out.pending_approvals) == 1 and out.pending_approvals[0].status == "pending",
          "1 pending approval (marketing spend >$1k)")
    check(len({tr.id for tr in out.new_traces}) == len(out.new_traces), "trace ids unique")
    check(all(tr.tools for tr in out.new_traces), "every trace records the tools it called")
    check(len(out.insights) >= 1, f"insights surfaced ({len(out.insights)})")
    # campaign applied: users get both the +5% (marketing) and +2% (sales) lift
    expected = round(round(prev.users * 1.05) * 1.02)
    check(fs.users == expected, f"marketing+sales user math ({fs.users} == {expected})")


# --- 2. Interactive cycle: pause → reject ------------------------------

def test_interactive_reject():
    print("\n[2] Interactive cycle — pause then REJECT")
    runner = LiveRunner(FakeLLM())
    prev = prev_state()
    t, m, a = _ids()
    out = runner.start(prev=prev, cycle=prev.cycle + 1, memories=list(seed.MEMORY),
                       interactive=True, mk_trace_id=t, mk_mem_id=m, mk_approval_id=a)
    check(out.status == "paused", "paused at approval interrupt")
    check([s.actor for s in out.steps] == ["founder", "operations", "research"],
          "3 steps before the gate")
    check(out.pending_approval is not None, "pending approval returned")
    check(out.thread_id is not None and runner.has_paused(out.thread_id), "thread parked for resume")

    res = runner.resume(thread_id=out.thread_id, decision="rejected")
    check(res is not None and res.status == "complete", "resume completes the cycle")
    check([s.actor for s in res.steps] == ["marketing", "sales", "finance", "support",
                                           "analytics", "founder"], "6 steps after resume")
    fs = res.final_state
    # campaign HELD → no +5% users and no spend deduction; only sales +2% applies
    check(fs.users == round(prev.users * 1.02), f"rejected: only sales lift ({fs.users})")
    check(fs.budget == prev.budget, f"rejected: budget not spent ({fs.budget})")
    check(not runner.has_paused(out.thread_id), "thread cleared after resume")


# --- 3. Interactive cycle: pause → approve -----------------------------

def test_interactive_approve():
    print("\n[3] Interactive cycle — pause then APPROVE")
    runner = LiveRunner(FakeLLM())
    prev = prev_state()
    t, m, a = _ids()
    out = runner.start(prev=prev, cycle=prev.cycle + 1, memories=list(seed.MEMORY),
                       interactive=True, mk_trace_id=t, mk_mem_id=m, mk_approval_id=a)
    res = runner.resume(thread_id=out.thread_id, decision="approved")
    fs = res.final_state
    check(fs.users == round(round(prev.users * 1.05) * 1.02), "approved: marketing+sales lift")
    check(fs.budget < prev.budget, "approved: campaign spend deducted")


# --- 4. Demo (scripted) mode unchanged ---------------------------------

def test_scripted_unchanged():
    print("\n[4] Demo mode (no key) still scripted & intact")
    sim = Simulation()  # no GOOGLE_API_KEY → scripted path
    start_cycle = sim.cycle
    resp = sim.run_cycle()
    check(resp.status == "complete", "scripted run completes")
    check(len(resp.steps) == 8, f"scripted cycle has 8 steps (got {len(resp.steps)})")
    check(resp.cycle == start_cycle + 1, "cycle advanced")
    check(resp.state.mrr > resp.prev.mrr, "scripted MRR grew")
    check(resp.new_memory is not None, "scripted learning written")


# --- 5. Simulation live path (commit + resume) -------------------------

def test_sim_live_commit():
    print("\n[5] Simulation live path — commit + resume (forced live, FakeLLM)")
    from helix.config import get_settings
    os.environ["GOOGLE_API_KEY"] = "test-fake-key"      # flip on the live path
    get_settings.cache_clear()
    try:
        sim = Simulation()
        sim._live = LiveRunner(FakeLLM())                # inject the offline runner
        start = sim.cycle

        resp = sim.run_cycle(interactive=False)
        check(resp.status == "complete", "SIM live cycle completes")
        check(len(resp.steps) == 9, f"SIM live cycle has 9 steps (got {len(resp.steps)})")
        check(sim.cycle == start + 1, "SIM cycle advanced")
        check(any(a.status == "pending" for a in sim.approvals), "campaign approval queued pending")
        check(sim.memory[0].cycle == start + 1, "learning prepended to memory")
        check(len(sim.insights) >= 1, "insights stored on sim")

        resp2 = sim.run_cycle(interactive=True)
        check(resp2.status == "paused" and resp2.thread_id, "SIM live cycle pauses for approval")
        check(any(a.id == resp2.pending_approval.id for a in sim.approvals), "paused approval in queue")
        resp3 = sim.resume_cycle(resp2.thread_id, "approved")
        check(resp3 is not None and resp3.status == "complete", "SIM resume completes")
        check(sim.cycle == start + 2, "SIM cycle advanced after resume")
        check(all(a.id != resp2.pending_approval.id for a in sim.approvals),
              "resolved approval cleared from queue")
    finally:
        os.environ.pop("GOOGLE_API_KEY", None)
        get_settings.cache_clear()


if __name__ == "__main__":
    try:
        test_autonomous()
        test_interactive_reject()
        test_interactive_approve()
        test_scripted_unchanged()
        test_sim_live_commit()
    except AssertionError:
        print(f"\nFAILED after {_passed} checks")
        sys.exit(1)
    print(f"\nAll {_passed} checks passed.")
