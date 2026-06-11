-- HelixOS AI — per-user onboarding flag
--
-- New (non-admin) users start with an empty workspace and must set up their
-- business before running cycles. `onboarded` tracks whether they've done so.
-- Existing/admin/demo workspaces default to true (already set up).

alter table public.workspaces add column if not exists onboarded boolean not null default true;
