-- HelixOS AI — Track C initial schema (persistence + multi-workspace + auth)
--
-- Run this in the Supabase SQL editor (or `supabase db push`). It creates the
-- per-workspace dynamic state tables that back `helix.supabase_store.SupabaseStore`.
-- Static reference data (agents, org edges, knowledge collections, scenario
-- presets) stays in Python `helix/seed.py` and is NOT stored here.
--
-- Multi-tenant: every row is scoped to a workspace owned by a Supabase Auth
-- user. The backend uses the service-role key (bypasses RLS) and scopes by
-- workspace_id after verifying the user's JWT; the RLS policies below let the
-- frontend safely read its own workspace directly (e.g. future Realtime).

-- gen_random_uuid()
create extension if not exists "pgcrypto";

-- updated_at touch trigger ------------------------------------------------
create or replace function helix_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- workspaces --------------------------------------------------------------
create table if not exists public.workspaces (
  id                  uuid primary key,                 -- = the owning user's id
  owner_user_id       uuid not null,                    -- references auth.users(id)
  cycle               integer not null default 0,
  is_running          boolean not null default false,
  paused_thread       text,
  paused_approval_id  text,
  next_trace_id       integer not null default 1000,
  next_mem_id         integer not null default 100,
  next_approval_id    integer not null default 20,
  scenario_id         text not null,
  scenario_json       jsonb not null,
  version             bigint not null default 1,        -- optimistic-locking token
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists workspaces_touch on public.workspaces;
create trigger workspaces_touch before update on public.workspaces
  for each row execute function helix_touch_updated_at();

-- workspace_settings ------------------------------------------------------
create table if not exists public.workspace_settings (
  workspace_id    uuid primary key references public.workspaces(id) on delete cascade,
  default_model   text,
  memory_enabled  boolean not null default true,
  theme           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists workspace_settings_touch on public.workspace_settings;
create trigger workspace_settings_touch before update on public.workspace_settings
  for each row execute function helix_touch_updated_at();

-- cycle_points (business-state history) -----------------------------------
create table if not exists public.cycle_points (
  id            bigint generated always as identity primary key,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  seq           integer not null,
  cycle         integer not null,
  users         integer not null,
  mrr           integer not null,
  churn         double precision not null,
  cac           integer not null,
  budget        integer not null,
  nps           integer not null,
  runway        integer not null
);

-- agent_traces (canonical observability) ----------------------------------
create table if not exists public.agent_traces (
  id                 bigint generated always as identity primary key,
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  wire_id            text not null,
  seq                integer not null,
  cycle              integer not null,
  agent_name         text not null,
  action             text,
  decision           text,
  reasoning_summary  text,
  tools_used         jsonb,
  result             text,
  input_tokens       integer not null default 0,
  output_tokens      integer not null default 0,
  duration_ms        integer not null default 0,
  status             text not null default 'ok',
  ago                text,
  created_at         timestamptz not null default now()
);

-- memory (long-term learnings) --------------------------------------------
create table if not exists public.memory (
  id            bigint generated always as identity primary key,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  seq           integer not null,
  wire_id       text not null,
  cycle         integer not null,
  agent         text not null,
  result        text not null,
  lesson        text not null,
  confidence    text not null default 'medium'
);

-- approvals ---------------------------------------------------------------
create table if not exists public.approvals (
  id            bigint generated always as identity primary key,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  seq           integer not null,
  wire_id       text not null,
  agent         text not null,
  action        text not null,
  risk          text not null,
  title         text not null,
  summary       text not null,
  payload       jsonb not null default '{}'::jsonb,
  requested     text not null,
  status        text not null default 'pending'
);

-- insights ----------------------------------------------------------------
create table if not exists public.insights (
  id            bigint generated always as identity primary key,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  seq           integer not null,
  kind          text not null,
  text          text not null,
  cycle         integer
);

-- documents (RAG metadata; Chroma holds vectors — ingestion is a later phase)
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  title         text not null,
  source_type   text,
  status        text not null default 'pending',
  chunk_count   integer not null default 0,
  created_at    timestamptz not null default now()
);

-- indexes on the scoping column ------------------------------------------
create index if not exists idx_cycle_points_ws on public.cycle_points(workspace_id, seq);
create index if not exists idx_agent_traces_ws on public.agent_traces(workspace_id, seq);
create index if not exists idx_memory_ws       on public.memory(workspace_id, seq);
create index if not exists idx_approvals_ws    on public.approvals(workspace_id, seq);
create index if not exists idx_insights_ws     on public.insights(workspace_id, seq);
create index if not exists idx_documents_ws    on public.documents(workspace_id);

-- Row Level Security ------------------------------------------------------
-- The service-role key the backend uses bypasses RLS. These policies govern
-- direct client (anon/authenticated) access so a signed-in user can only see
-- their own workspace — important once the frontend subscribes via Realtime.
alter table public.workspaces         enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.cycle_points       enable row level security;
alter table public.agent_traces       enable row level security;
alter table public.memory             enable row level security;
alter table public.approvals          enable row level security;
alter table public.insights           enable row level security;
alter table public.documents          enable row level security;

-- workspaces: owner-only
drop policy if exists workspaces_owner on public.workspaces;
create policy workspaces_owner on public.workspaces
  for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

-- child tables: row's workspace must be owned by the caller
do $$
declare t text;
begin
  foreach t in array array[
    'workspace_settings','cycle_points','agent_traces','memory',
    'approvals','insights','documents'
  ]
  loop
    execute format('drop policy if exists %I_owner on public.%I;', t, t);
    execute format($f$
      create policy %1$I_owner on public.%1$I
        for all using (
          workspace_id in (select id from public.workspaces where owner_user_id = auth.uid())
        ) with check (
          workspace_id in (select id from public.workspaces where owner_user_id = auth.uid())
        );
    $f$, t);
  end loop;
end $$;
