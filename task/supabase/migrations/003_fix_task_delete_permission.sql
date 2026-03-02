-- 003_fix_task_delete_permission.sql
-- 既存環境で "permission denied for table tasks" が出る場合の修正

-- authenticated ロールに tasks 操作権限を明示付与
-- （RLSで最終的に許可可否を制御する）
grant select, insert, update, delete on table public.tasks to authenticated;

-- 念のため delete ポリシーを再作成
-- allowlist 条件を満たすユーザーのみ削除可能
drop policy if exists tasks_delete_allowlisted on public.tasks;
create policy tasks_delete_allowlisted
on public.tasks
for delete
using (public.is_allowlisted());
