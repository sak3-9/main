-- 003_fix_task_delete_permission.sql
-- Legacy environments may miss table-level DELETE privilege on public.tasks.
-- This migration intentionally grants privileges only and does NOT modify RLS policies.
-- Therefore it cannot weaken the stricter delete policy defined later.

grant select, insert, update, delete on table public.tasks to authenticated;
