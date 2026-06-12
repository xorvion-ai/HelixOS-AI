"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type {
  Agent, AgentMessage, Approval, CyclePoint, DashboardResponse, DashCtx, Scenario, ScenarioSeed,
} from "@/lib/types";
import { api, CLIENT_ID } from "@/lib/api";
import { getBrowserSupabase, supabaseEnabled } from "@/lib/supabase/client";
import { subscribeActivity, type ActivityEvent } from "@/lib/supabase/realtime";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const NO_BUMP = { mrr: false, users: false, churn: false, cac: false };

export type Screen =
  | "command" | "orgchart" | "observability" | "agents"
  | "approvals" | "knowledge" | "memory" | "simulation"
  | "profile" | "support" | "privacy" | "terms" | "admin";

export interface Sim extends DashCtx {
  agents: Agent[];
  activeScreen: Screen;
  navParams: Record<string, unknown>;
  setScreen: (s: Screen, params?: Record<string, unknown>) => void;
  runCycle: () => Promise<void>;
  loadScenario: (id: string, customSeed?: ScenarioSeed, name?: string) => Promise<void>;
}

const Ctx = createContext<Sim | null>(null);

export function useSim(): Sim {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSim must be used within <SimulationProvider>");
  return v;
}

export function SimulationProvider({
  initial, agents, children,
}: { initial: DashboardResponse; agents: Agent[]; children: React.ReactNode }) {
  const [scenario, setScenario] = useState<Scenario>(initial.scenario);
  const [history, setHistory] = useState<CyclePoint[]>(initial.history);
  const [state, setState] = useState<CyclePoint>(initial.state);
  const [prev, setPrev] = useState<CyclePoint | null>(initial.prev);
  const [cycle, setCycle] = useState(initial.cycle);
  const [approvals, setApprovals] = useState<Approval[]>(initial.approvals);
  const [baseFeed, setBaseFeed] = useState<AgentMessage[]>(initial.activity);

  const [liveLog, setLiveLog] = useState<AgentMessage[]>([]);
  const [activeEdge, setActiveEdge] = useState<string[] | null>(null);
  const [activeNodes, setActiveNodes] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [bumped, setBumped] = useState(NO_BUMP);

  const [activeScreen, setActiveScreen] = useState<Screen>("command");
  const [navParams, setNavParams] = useState<Record<string, unknown>>({});

  function setScreen(s: Screen, params: Record<string, unknown> = {}) {
    setNavParams(params);
    setActiveScreen(s);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  async function runCycle() {
    if (isRunning) return;
    setIsRunning(true);
    setLiveLog([]);
    const beforeState = state;
    try {
      const res = await api.runCycle();
      for (const step of res.steps) {
        setActiveEdge(step.edge);
        setActiveNodes([step.actor]);
        setLiveLog((log) => [...log, { from: step.edge[0], to: step.edge[1], message: step.message, ts: "now" }]);
        setState(step.state_after);
        await sleep(950);
      }
      setActiveEdge(null);
      setActiveNodes([]);
      setPrev(beforeState);
      setState(res.state);
      setHistory((h) => [...h, res.state]);
      setCycle(res.cycle);
      setBumped({ mrr: true, users: true, churn: true, cac: true });
      await sleep(1300);
      setBumped(NO_BUMP);
      try { setApprovals(await api.approvals()); } catch { /* keep */ }
    } finally {
      setIsRunning(false);
    }
  }

  async function resolveApproval(id: string, decision: "approved" | "rejected") {
    setApprovals((a) => a.filter((x) => x.id !== id));
    try { await api.resolveApproval(id, decision); } catch { /* optimistic */ }
  }

  async function loadScenario(id: string, customSeed?: ScenarioSeed, name?: string) {
    const d = await api.startSimulation(id, customSeed, name);
    setScenario(d.scenario);
    setHistory(d.history);
    setState(d.state);
    setPrev(d.prev);
    setCycle(d.cycle);
    setApprovals(d.approvals);
    setBaseFeed(d.activity);
    setLiveLog([]);
    setActiveEdge(null);
    setActiveNodes([]);
    setScreen("command");
  }

  // --- Realtime: replay a cycle run from another tab / device ----------
  // Events arrive (often as a batch) on the workspace's activity stream; we
  // drain them one-per-950ms so a remote run animates exactly like a local one.
  // The triggering tab skips its own echo (CLIENT_ID match) — it already
  // animated locally from the HTTP response.
  const queueRef = useRef<ActivityEvent[]>([]);
  const playingRef = useRef(false);
  const seenCycleRef = useRef<number | null>(null);
  const startStateRef = useRef<CyclePoint | null>(null);

  function drainQueue() {
    const ev = queueRef.current.shift();
    if (!ev) { playingRef.current = false; return; }
    playingRef.current = true;

    if (ev.kind === "step") {
      if (seenCycleRef.current !== ev.cycle) {
        seenCycleRef.current = ev.cycle;
        setLiveLog([]);
        setIsRunning(true);
        setState((cur) => { startStateRef.current = cur; return cur; });
      }
      if (ev.edge) {
        setActiveEdge(ev.edge);
        setActiveNodes([ev.actor ?? ev.edge[1]]);
        if (ev.message) {
          const edge = ev.edge, msg = ev.message;
          setLiveLog((log) => [...log, { from: edge[0], to: edge[1], message: msg, ts: "now" }]);
        }
      }
      if (ev.state_after) setState(ev.state_after);
      setTimeout(drainQueue, 950);
    } else {
      // cycle_complete
      setActiveEdge(null);
      setActiveNodes([]);
      if (startStateRef.current) setPrev(startStateRef.current);
      if (ev.state_after) {
        const final = ev.state_after;
        setState(final);
        setHistory((h) => [...h, final]);
      }
      setCycle(ev.cycle);
      setBumped({ mrr: true, users: true, churn: true, cac: true });
      setTimeout(() => setBumped(NO_BUMP), 1300);
      api.approvals().then(setApprovals).catch(() => { /* keep */ });
      setIsRunning(false);
      seenCycleRef.current = null;
      setTimeout(drainQueue, 200);
    }
  }

  useEffect(() => {
    if (!supabaseEnabled) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let unsub: (() => void) | null = null;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;
      const { data: s } = await supabase.auth.getSession();
      if (s.session?.access_token) supabase.realtime.setAuth(s.session.access_token);
      unsub = subscribeActivity(uid, (e) => {
        if (e.client_id === CLIENT_ID) return; // our own echo — animated locally
        queueRef.current.push(e);
        if (!playingRef.current) drainQueue();
      });
    })();
    return () => { cancelled = true; if (unsub) unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: Sim = {
    state, prev, history, cycle, scenario,
    liveLog, activeEdge, activeNodes, isRunning, approvals, baseFeed,
    bumped, statuses: {}, orgLayout: "tree",
    nav: (s, params) => setScreen(s as Screen, params),
    resolveApproval,
    agents, activeScreen, navParams, setScreen, runCycle, loadScenario,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
