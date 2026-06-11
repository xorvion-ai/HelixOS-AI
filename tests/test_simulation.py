"""Simulation engine — demo/scripted cycle, scenarios, approvals, documents."""

from helix import seed
from helix.models import ScenarioSeed
from helix.simulation import Simulation
from helix.store import InMemoryStore


def fresh() -> Simulation:
    """A clean, isolated in-memory simulation (its own store)."""
    return Simulation(store=InMemoryStore())


def test_demo_boot():
    sim = fresh()
    assert sim.cycle == sim.history[-1].cycle
    assert sim.state.mrr > 0
    assert len(seed.AGENTS) == 8
    assert sim.scenario.id


def test_run_cycle_advances_and_records():
    sim = fresh()
    before, n = sim.cycle, len(sim.history)
    res = sim.run_cycle()
    assert res.cycle == before + 1
    assert sim.cycle == before + 1
    assert len(sim.history) == n + 1
    assert len(res.steps) >= 8
    assert len(res.new_traces) >= 8
    assert res.new_memory is not None


def test_mrr_net_growth_over_cycles():
    sim = fresh()
    start = sim.state.mrr
    for _ in range(5):
        sim.run_cycle()
    # The scripted cycle adds bounded noise but keeps a net-positive MRR trend.
    assert sim.state.mrr > start


def test_traces_prepended_newest_first():
    sim = fresh()
    sim.run_cycle()
    top = sim.traces[0]
    assert top.cycle == sim.cycle


def test_load_preset_scenario_resets():
    sim = fresh()
    sim.run_cycle()
    sim.load_scenario(seed.SCENARIOS[0].id, None)
    assert sim.cycle == 0
    assert len(sim.history) == 1
    assert sim.scenario.active


def test_load_custom_scenario():
    sim = fresh()
    cs = ScenarioSeed(users=1000, mrr=5000, marketing_budget=2000, competitors=3, churn=0.05, cac=40)
    sim.load_scenario("custom", cs)
    assert sim.scenario.id == "custom"
    assert sim.state.users == 1000
    assert sim.cycle == 0


def test_load_unknown_scenario_raises():
    sim = fresh()
    try:
        sim.load_scenario("does-not-exist", None)
    except KeyError:
        return
    raise AssertionError("expected KeyError for unknown scenario")


def test_resolve_approval_removes_from_queue():
    sim = fresh()
    pending = [a for a in sim.approvals if a.status == "pending"]
    assert pending, "demo seeds pending approvals"
    target = pending[0].id
    ap = sim.resolve_approval(target, "approved")
    assert ap is not None
    assert all(a.id != target for a in sim.approvals)


def test_resolve_unknown_approval_returns_none():
    sim = fresh()
    assert sim.resolve_approval("ap-does-not-exist", "approved") is None


def test_add_document_chunks_and_stores():
    sim = fresh()
    d = sim.add_document("Brand guide", "marketing_guidelines", "word " * 400)
    assert d.chunks >= 2
    assert d.status == "ready"
    assert d.collection == "marketing_guidelines"
    assert sim.documents and sim.documents[0].id == d.id


def test_onboarding_workspace_then_setup():
    sim = Simulation(workspace_id="u-123", store=InMemoryStore(), seed_demo=False)
    assert sim.onboarded is False
    assert sim.scenario.id == "unset"
    assert sim.cycle == 0
    # Completing onboarding (adding a business) flips onboarded → True.
    sim.load_scenario("custom", ScenarioSeed(
        users=500, mrr=3000, marketing_budget=1000, competitors=2, churn=0.06, cac=35))
    assert sim.onboarded is True
    assert sim.state.users == 500


def test_admin_workspace_is_seeded_demo():
    sim = Simulation(workspace_id="admin-1", store=InMemoryStore(), seed_demo=True)
    assert sim.onboarded is True
    assert sim.cycle == sim.history[-1].cycle and sim.cycle > 0


def test_add_document_defaults_blank_name():
    sim = fresh()
    d = sim.add_document("   ", "", "")
    assert d.name == "Untitled document"
    assert d.collection == "company_docs"
    assert d.chunks >= 1
