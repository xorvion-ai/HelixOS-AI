// Static agent presentation helpers (ported from the design's ui.jsx).
import type { AgentId } from "./types";

export const AGENT_HUE: Record<string, number> = {
  founder: 48, operations: 250, marketing: 320, analytics: 155,
  sales: 25, research: 200, finance: 90, support: 290,
};

export const STATUS_META: Record<string, [tone: string, label: string]> = {
  idle: ["neutral", "Idle"],
  working: ["accent", "Working"],
  waiting: ["warn", "Waiting approval"],
  done: ["ok", "Done"],
  locked: ["neutral", "Locked"],
  queued: ["info", "Queued"],
  running: ["accent", "Running"],
  approved: ["ok", "Approved"],
};

export const fmt = {
  k: (n: number) =>
    n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 1 : 2).replace(/\.0$/, "") + "k" : "" + n,
  money: (n: number) =>
    "$" + (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : n),
  pct: (n: number) => (n * 100).toFixed(1) + "%",
  int: (n: number) => n.toLocaleString("en-US"),
};

export const ORDER: AgentId[] = [
  "founder", "operations", "sales", "research", "marketing", "analytics", "finance", "support",
];
