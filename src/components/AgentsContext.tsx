"use client";

import { createContext, useContext } from "react";
import type { Agent } from "@/lib/types";

interface AgentsCtx {
  agents: Agent[];
  byId: (id: string) => Agent | undefined;
}

const Ctx = createContext<AgentsCtx>({ agents: [], byId: () => undefined });

export function AgentsProvider({ agents, children }: { agents: Agent[]; children: React.ReactNode }) {
  const map = new Map<string, Agent>(agents.map((a) => [a.id, a]));
  return <Ctx.Provider value={{ agents, byId: (id) => map.get(id) }}>{children}</Ctx.Provider>;
}

export const useAgents = () => useContext(Ctx);
