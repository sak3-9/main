-- 005_remove_workspace_members_rpc.sql
-- UI now uses SELECT on public.profiles (id, display_name) under RLS.
-- Remove unused RPC to reduce exposed DB surface.

drop function if exists public.workspace_members();
