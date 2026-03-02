-- 004_harden_task_permissions.sql
-- Harden column-level permissions and delete policy conditions

-- profiles: allowlisted users can read member ids/display names (for 2-user workspace UI)
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_allowlisted
on public.profiles
for select
using (public.is_allowlisted());

-- tasks: enforce delete only for done or archived rows
drop policy if exists tasks_delete_allowlisted on public.tasks;
create policy tasks_delete_allowlisted
on public.tasks
for delete
using (
  public.is_allowlisted()
  and (status = 'done' or is_archived = true)
);

-- table-level permissions (RLS still applies)
revoke update on table public.tasks from authenticated;
grant update (title, memo, due_date, priority, assignee, status, is_archived) on public.tasks to authenticated;

revoke insert on table public.tasks from authenticated;
grant insert (title, memo, due_date, priority, assignee, status, is_archived, created_by) on public.tasks to authenticated;
