// API data contract — mirrors helix/models.py.

export type AgentId =
  | "founder" | "operations" | "marketing" | "analytics"
  | "sales" | "research" | "finance" | "support";

export interface ScenarioSeed {
  users: number;
  mrr: number;
  marketing_budget: number;
  competitors: number;
  churn: number;
  cac: number;
}

export interface Scenario {
  id: string;
  name: string;
  tag: string;
  desc: string;
  active: boolean;
  seed: ScenarioSeed;
}

export interface CyclePoint {
  cycle: number;
  users: number;
  mrr: number;
  churn: number;
  cac: number;
  budget: number;
  nps: number;
  runway: number;
}

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  glyph: string;
  phase: number;
  status: string;
  model: string;
  blurb: string;
  tools: string[];
  outputs: string[];
}

export interface OrgEdge {
  from: string;
  to: string;
}

export interface AgentMessage {
  from: string;
  to: string;
  message: string;
  ts: string;
}

export interface Trace {
  id: string;
  cycle: number;
  agent: AgentId;
  task: string;
  decision: string;
  reasoning: string;
  tools: string[];
  result: string;
  dur: number;
  tokens: number;
  status: string;
  ago: string;
}

export interface Memory {
  id: string;
  cycle: number;
  agent: AgentId;
  result: string;
  lesson: string;
  confidence: "low" | "medium" | "high";
}

export interface KnowledgeDoc {
  name: string;
  chunks: number;
  size: string;
  updated: string;
}

export interface KnowledgeCollection {
  collection: string;
  color: string;
  docs: KnowledgeDoc[];
}

export interface Task {
  id: string;
  title: string;
  agent: AgentId;
  status: string;
  deps: string[];
}

export interface Approval {
  id: string;
  agent: AgentId;
  action: string;
  risk: "low" | "medium" | "high";
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  requested: string;
  status: "pending" | "approved" | "rejected";
}

export interface Insight {
  kind: "win" | "watch" | "risk";
  text: string;
}

export interface Document {
  id: string;
  name: string;
  collection: string;
  chunks: number;
  size: string;
  source_type: string;
  status: "pending" | "ready" | "failed";
  updated: string;
}

export interface ChatResponse {
  agent: string;
  reply: string;
  mode: "demo" | "live";
}

export interface Me {
  id: string;
  email: string | null;
  name: string | null;
  is_admin: boolean;
  is_default: boolean;
  onboarded: boolean;
  workspace: string;
  mode: "demo" | "live";
}

export interface DashboardResponse {
  cycle: number;
  scenario: Scenario;
  state: CyclePoint;
  prev: CyclePoint | null;
  history: CyclePoint[];
  insights: Insight[];
  approvals: Approval[];
  activity: AgentMessage[];
  is_running: boolean;
}

export interface CycleStep {
  edge: string[];
  actor: AgentId;
  message: string;
  trace: Trace;
  state_after: CyclePoint;
}

export interface CycleRunResponse {
  cycle: number;
  state: CyclePoint;
  prev: CyclePoint;
  steps: CycleStep[];
  new_traces: Trace[];
  new_memory: Memory | null;
}

export interface OrgChartResponse {
  nodes: Agent[];
  edges: OrgEdge[];
}

export interface AdminUsage {
  cycles: number;
  traces: number;
  tokens: number;
  duration_ms: number;
  memory: number;
  insights: number;
  approvals_pending: number;
  agents: number;
  by_agent: { agent: AgentId; traces: number; tokens: number }[];
  capabilities: { gemini: boolean; chroma: boolean; supabase: boolean };
  mode: "demo" | "live";
}

// Shared dashboard context shape consumed by Command Center / Org Chart.
export interface DashCtx {
  state: CyclePoint;
  prev: CyclePoint | null;
  history: CyclePoint[];
  cycle: number;
  scenario: Scenario;
  liveLog: AgentMessage[];
  activeEdge: string[] | null;
  activeNodes: string[];
  isRunning: boolean;
  approvals: Approval[];
  baseFeed: AgentMessage[];
  bumped: { mrr: boolean; users: boolean; churn: boolean; cac: boolean };
  statuses: Record<string, string>;
  orgLayout: "tree" | "radial";
  nav: (screen: string, params?: Record<string, unknown>) => void;
  resolveApproval: (id: string, decision: "approved" | "rejected") => void;
}
