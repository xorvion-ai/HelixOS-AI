-- HelixOS AI — Track C part 2: Realtime activity stream
--
-- Adds an append-only `activity_events` table that carries the live
-- agent-collaboration feed + org-chart edge animation, and registers it with
-- the `supabase_realtime` publication so signed-in clients can subscribe via
-- Supabase Realtime (postgres_changes).
--
-- Why a dedicated table (not the existing child tables): the backend rewrites
-- `agent_traces` etc. wholesale on every save (delete-all + insert-all), which
-- would emit a churn storm to subscribers. `activity_events` is append-only —
-- one clean INSERT per cycle step + a terminal `cycle_complete` — so a remote
-- client can replay the exact animation the triggering client saw.
--
-- Run after 0001_init.sql (Supabase SQL editor or `supabase db push`).

-- activity_events (append-only realtime stream) ---------------------------
create table if not exists public.activity_events (
  id            bigint generated always as identity primary key,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  client_id     text,                       -- originating browser session (self-echo dedupe)
  cycle         integer not null,
  seq           integer not null,           -- order within the cycle (0-based)
  kind          text not null default 'step',  -- 'step' | 'cycle_complete'
  actor         text,                        -- agent that acted this step
  edge          jsonb,                       -- ["from","to"] for the org-chart pulse
  message       text,                        -- feed line
  state_after   jsonb,                       -- CyclePoint snapshot after this step
  created_at    timestamptz not null default now()
);

create index if not exists idx_activity_events_ws
  on public.activity_events(workspace_id, id);

-- Row Level Security: a signed-in user only sees their own workspace's events.
-- (workspace_id == the owning user's id, by construction in helix.state.)
alter table public.activity_events enable row level security;

drop policy if exists activity_events_owner on public.activity_events;
create policy activity_events_owner on public.activity_events
  for all using (workspace_id = auth.uid()) with check (workspace_id = auth.uid());

-- Register with the Realtime publication so postgres_changes fires. Guarded so
-- re-running the migration (or a project without the publication) won't error.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'activity_events'
    ) then
      alter publication supabase_realtime add table public.activity_events;
    end if;
  end if;
end $$;
