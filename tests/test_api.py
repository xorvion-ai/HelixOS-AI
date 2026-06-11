"""FastAPI endpoint contract — exercised in demo mode (no auth, in-memory)."""

from fastapi.testclient import TestClient

from helix.api import app

client = TestClient(app)


def test_health_demo_mode():
    b = client.get("/api/health").json()
    assert b["status"] == "ok"
    assert b["mode"] == "demo"
    assert b["capabilities"]["supabase"] is False
    assert b["capabilities"]["gemini"] is False


def test_dashboard_shape():
    r = client.get("/api/dashboard")
    assert r.status_code == 200
    b = r.json()
    assert b["scenario"]["id"]
    assert len(b["history"]) >= 1
    assert "activity" in b


def test_orgchart_nodes_and_edges():
    b = client.get("/api/orgchart").json()
    assert len(b["nodes"]) == 8
    assert len(b["edges"]) >= 4
    assert {"from", "to"} <= set(b["edges"][0])


def test_agents_list():
    assert len(client.get("/api/agents").json()) == 8


def test_run_cycle_advances():
    before = client.get("/api/dashboard").json()["cycle"]
    r = client.post("/api/cycle/run")
    assert r.status_code == 200
    assert r.json()["cycle"] == before + 1


def test_documents_upload_then_listed_and_merged():
    r = client.post("/api/documents", json={
        "name": "API test doc", "collection": "company_docs", "content": "hello world " * 60,
    })
    assert r.status_code == 200
    doc = r.json()
    assert doc["chunks"] >= 1 and doc["status"] == "ready"

    listed = client.get("/api/documents").json()
    assert any(d["id"] == doc["id"] for d in listed)

    kb = client.get("/api/knowledge").json()
    names = [d["name"] for c in kb for d in c["docs"]]
    assert "API test doc" in names


def test_agent_chat_demo_reply():
    r = client.post("/api/agents/marketing/chat", json={"message": "How do we grow MRR?"})
    assert r.status_code == 200
    b = r.json()
    assert b["mode"] == "demo"
    assert b["agent"] == "marketing"
    assert len(b["reply"]) > 0


def test_agent_chat_unknown_agent_404():
    r = client.post("/api/agents/nobody/chat", json={"message": "hi"})
    assert r.status_code == 404


def test_me_endpoint_demo():
    b = client.get("/api/me").json()
    assert b["is_admin"] is True   # public demo user has admin/demo access
    assert b["onboarded"] is True
    assert b["mode"] == "demo"


def test_admin_usage_aggregates():
    b = client.get("/api/admin/usage").json()
    assert b["agents"] == 8
    assert isinstance(b["by_agent"], list)
    assert b["tokens"] >= 0
    assert b["capabilities"]["supabase"] is False
