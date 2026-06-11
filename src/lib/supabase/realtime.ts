// Supabase Realtime — live activity stream for a workspace.
//
// Subscribes to INSERTs on the append-only `activity_events` table (see
// supabase/migrations/0002_realtime.sql), scoped to the signed-in user's
// workspace by RLS. Each cycle emits one `step` row per agent handoff plus a
// terminal `cycle_complete`, letting a remote tab replay the exact org-chart
// + feed animation the triggering tab saw. A no-op in demo mode.

import type { RealtimeChannel } from "@supabase/supabase-js";
import type { CyclePoint } from "@/lib/types";
import { getBrowserSupabase } from "./client";

export interface ActivityEvent {
  id: number;
  workspace_id: string;
  client_id: string | null;
  cycle: number;
  seq: number;
  kind: "step" | "cycle_complete";
  actor: string | null;
  edge: [string, string] | null;
  message: string | null;
  state_after: CyclePoint | null;
  created_at: string;
}

/**
 * Subscribe to the workspace's activity_events. Returns an unsubscribe
 * function, or null in demo mode (Supabase unconfigured).
 */
export function subscribeActivity(
  workspaceId: string,
  onEvent: (e: ActivityEvent) => void,
): (() => void) | null {
  const supabase = getBrowserSupabase();
  if (!supabase) return null;

  const channel: RealtimeChannel = supabase
    .channel(`activity:${workspaceId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "activity_events",
        filter: `workspace_id=eq.${workspaceId}`,
      },
      (payload) => onEvent(payload.new as ActivityEvent),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
