"use client";

import type { Agent, DashboardResponse } from "@/lib/types";
import { AgentsProvider } from "./AgentsContext";
import { SimulationProvider, useSim } from "./SimulationProvider";
import { MeProvider, useMe } from "./MeContext";
import { Onboarding } from "./Onboarding";
import { AppShell } from "./AppShell";
import { CommandCenter } from "./CommandCenter";
import { ScenariosScreen } from "./Scenarios";
import {
  AgentsScreen, ApprovalsScreen, KnowledgeScreen, MemoryScreen,
  ObservabilityScreen, OrgChartScreen,
} from "./screens";
import { AdminScreen, PrivacyScreen, ProfileScreen, SupportScreen } from "./AccountScreens";

function ActiveScreen() {
  const { activeScreen } = useSim();
  switch (activeScreen) {
    case "command": return <CommandCenter />;
    case "orgchart": return <OrgChartScreen />;
    case "observability": return <ObservabilityScreen />;
    case "agents": return <AgentsScreen />;
    case "approvals": return <ApprovalsScreen />;
    case "knowledge": return <KnowledgeScreen />;
    case "memory": return <MemoryScreen />;
    case "simulation": return <ScenariosScreen />;
    case "profile": return <ProfileScreen />;
    case "support": return <SupportScreen />;
    case "privacy": return <PrivacyScreen />;
    case "admin": return <AdminScreen />;
    default: return <CommandCenter />;
  }
}

function Gate() {
  const { me, loading } = useMe();
  // Brand-new (non-admin) users land on onboarding until they set up a business.
  if (!loading && me && !me.onboarded) return <Onboarding />;
  return (
    <AppShell>
      <ActiveScreen />
    </AppShell>
  );
}

export function DashboardClient({ initial, agents }: { initial: DashboardResponse; agents: Agent[] }) {
  return (
    <AgentsProvider agents={agents}>
      <SimulationProvider initial={initial} agents={agents}>
        <MeProvider>
          <Gate />
        </MeProvider>
      </SimulationProvider>
    </AgentsProvider>
  );
}
