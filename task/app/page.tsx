'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import type { FilterKey, Priority, Profile, Task } from '@/lib/types';

type AuthUser = { id: string; email: string } | null;
type EditableTaskFields = Pick<Task, 'title' | 'memo' | 'due_date' | 'priority' | 'assignee' | 'status' | 'is_archived'>;

const TABS: { key: FilterKey; label: string }[] = [
  { key: 'open', label: '未完了' },
  { key: 'due_today', label: '今日まで' },
  { key: 'assigned_both', label: '共同' },
  { key: 'assigned_me', label: 'さく担当' },
  { key: 'assigned_partner', label: 'しょこ担当' },
  { key: 'overdue', label: '期限切れ' },
  { key: 'all', label: 'すべて' },
  { key: 'done', label: '完了' },
  { key: 'archived', label: 'アーカイブ' }
];

const priorityOrder: Record<Priority, number> = { high: 3, medium: 2, low: 1 };
const priorityLabel: Record<Priority, string> = { high: '高', medium: '中', low: '低' };

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isToday(date: string | null): boolean {
  if (!date) return false;
  return date === todayLocal();
}

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return date < todayLocal();
}

function dueText(task: Task): string {
  if (!task.due_date) return '期限なし';
  if (isOverdue(task.due_date) && task.status === 'open') return '期限切れ';
  if (isToday(task.due_date)) return '今日まで';
  return task.due_date;
}

function toEditablePayload(task: Partial<Task>): Partial<EditableTaskFields> {
  const payload: Partial<EditableTaskFields> = {};
  if (typeof task.title === 'string') payload.title = task.title;
  if (typeof task.memo === 'string' || task.memo === null) payload.memo = task.memo ?? null;
  if (typeof task.due_date === 'string' || task.due_date === null) payload.due_date = task.due_date ?? null;
  if (task.priority === 'low' || task.priority === 'medium' || task.priority === 'high') payload.priority = task.priority;
  if (typeof task.assignee === 'string' || task.assignee === null) payload.assignee = task.assignee;
  if (task.status === 'open' || task.status === 'done') payload.status = task.status;
  if (typeof task.is_archived === 'boolean') payload.is_archived = task.is_archived;
  return payload;
}

export default function Page() {
  const supabase = getSupabaseClient();
  const [user, setUser] = useState<AuthUser>(null);
  const [emailInput, setEmailInput] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('open');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);

  const selected = tasks.find((t) => t.id === selectedId) ?? null;

  const counts = useMemo(() => ({
    open: tasks.filter((t) => t.status === 'open' && !t.is_archived).length,
    due_today: tasks.filter((t) => t.status === 'open' && isToday(t.due_date) && !t.is_archived).length,
    assigned_both: tasks.filter((t) => t.assignee === null && !t.is_archived).length,
    assigned_me: tasks.filter((t) => user && t.assignee === user.id && !t.is_archived).length,
    assigned_partner: tasks.filter((t) => partnerId && t.assignee === partnerId && !t.is_archived).length,
    overdue: tasks.filter((t) => isOverdue(t.due_date) && t.status === 'open' && !t.is_archived).length,
    all: tasks.filter((t) => !t.is_archived).length
  }), [tasks, user, partnerId]);

  async function loadTasks() {
    if (!supabase) return;
    const { data, error: selectError } = await supabase.from('tasks').select('*');
    if (selectError) {
      setError(selectError.message.includes('permission') ? '許可された2人のみ利用できます。' : selectError.message);
      return;
    }
    setTasks((data ?? []) as Task[]);
  }

  async function resolvePartnerId(myId: string) {
    if (!supabase) return;
    const { data, error: selectErr } = await supabase.from('profiles').select('id,display_name');
    if (selectErr || !Array.isArray(data)) return;
    const other = (data as Profile[]).find((m) => m.id !== myId);
    setPartnerId(other?.id ?? null);
  }

  async function syncAuth() {
    if (!supabase) {
      setError('環境変数が未設定です。task/README.md の手順をご確認ください。');
      setLoading(false);
      return;
    }

    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (!u?.email) {
      setUser(null);
      setLoading(false);
      return;
    }

    setUser({ id: u.id, email: u.email });
    const { error: profileErr } = await supabase.from('profiles').upsert({ id: u.id, email: u.email, display_name: null });

    if (profileErr) {
      setError('このメールは利用対象外です（Allowlistをご確認ください）。');
      setLoading(false);
      return;
    }

    await Promise.all([loadTasks(), resolvePartnerId(u.id)]);
    setLoading(false);
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    syncAuth();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      syncAuth();
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    if (!user || !supabase) return;
    const channel = supabase
      .channel('task-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadTasks())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, supabase]);

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        switch (filter) {
          case 'open': return t.status === 'open' && !t.is_archived;
          case 'due_today': return t.status === 'open' && isToday(t.due_date) && !t.is_archived;
          case 'assigned_both': return t.assignee === null && !t.is_archived;
          case 'assigned_me': return t.assignee === user?.id && !t.is_archived;
          case 'assigned_partner': return partnerId ? t.assignee === partnerId && !t.is_archived : false;
          case 'overdue': return isOverdue(t.due_date) && t.status === 'open' && !t.is_archived;
          case 'all': return !t.is_archived;
          case 'done': return t.status === 'done' && !t.is_archived;
          case 'archived': return t.is_archived;
        }
      })
      .sort((a, b) => {
        const d1 = a.due_date ?? '9999-12-31';
        const d2 = b.due_date ?? '9999-12-31';
        if (d1 !== d2) return d1.localeCompare(d2);
        const p = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (p) return p;
        return b.created_at.localeCompare(a.created_at);
      });
  }, [tasks, filter, user?.id, partnerId]);

  async function signInMagic(e: FormEvent) {
    if (!supabase) return;
    e.preventDefault();
    setAuthMessage('');
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: emailInput,
      options: { emailRedirectTo: window.location.origin }
    });
    setAuthMessage(signInError ? signInError.message : 'ログインリンクをメールに送信しました。');
  }

  async function createTask() {
    if (!supabase || !user) return;
    setSaving(true);
    const { data, error: insertError } = await supabase
      .from('tasks')
      .insert({ title: '新しいタスク', memo: '', priority: 'medium', status: 'open', created_by: user.id, assignee: null })
      .select('*')
      .single();
    setSaving(false);
    if (insertError) return setError(insertError.message);
    setTasks((prev) => [data as Task, ...prev]);
    setSelectedId((data as Task).id);
  }

  async function patchTask(id: string, patch: Partial<Task>) {
    if (!supabase) return;
    const local = tasks.find((t) => t.id === id);
    if (!local) return;

    const payload = toEditablePayload(patch);
    const title = (payload.title ?? local.title).trim();
    const memo = (payload.memo ?? local.memo ?? '').trim();

    if (title.length < 1 || title.length > 100) return setError('タイトルは1〜100文字で入力してください。');
    if (memo.length > 2000) return setError('メモは2000文字以内で入力してください。');

    payload.title = title;
    payload.memo = memo;

    const { error: updateError } = await supabase.from('tasks').update(payload).eq('id', id);
    if (updateError) return setError(updateError.message);

    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...payload, updated_at: new Date().toISOString() } : t)));
  }

  async function deleteTask(task: Task) {
    if (!supabase) return;
    if (!(task.status === 'done' || task.is_archived)) {
      setError('削除できるのは「完了」または「アーカイブ」タスクのみです。');
      return;
    }
    const ok = window.confirm(`「${task.title}」を削除しますか？\nこの操作は取り消せません。`);
    if (!ok) return;

    const { error: deleteError } = await supabase.from('tasks').delete().eq('id', task.id);
    if (deleteError) return setError(deleteError.message);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    if (selectedId === task.id) setSelectedId(null);
  }

  async function toggleDone(task: Task) {
    await patchTask(task.id, { status: task.status === 'open' ? 'done' : 'open' });
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setTasks([]);
    setSelectedId(null);
  }

  const boardCols = {
    todo: visibleTasks.filter((t) => t.status === 'open' && !isToday(t.due_date) && !isOverdue(t.due_date)),
    focus: visibleTasks.filter((t) => t.status === 'open' && (isToday(t.due_date) || isOverdue(t.due_date))),
    done: visibleTasks.filter((t) => t.status === 'done')
  };

  if (loading) return <main className="grid min-h-screen place-items-center text-violet-100">読み込み中です…</main>;

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#3d3752,_#1f1f2a_55%)] p-5">
        <form onSubmit={signInMagic} className="w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-[#2b2c33] p-7 shadow-2xl">
          <h1 className="text-2xl font-semibold text-[#f6edf8]">ふたりタスク共有</h1>
          <p className="text-sm text-[#d2c8de]">さくとしょこ専用。魔法リンクで安全にログインできます。</p>
          <input className="no-zoom w-full rounded-xl border border-white/10 bg-[#1f2026] px-3 py-2" type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="メールアドレス" />
          <button className="w-full rounded-xl bg-[#9980F2] py-2 font-semibold text-[#1f1a2a]">ログインリンクを送る</button>
          {authMessage && <p className="text-sm text-[#d9cde5]">{authMessage}</p>}
          {error && <p className="text-sm text-[#F2B4AE]">{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#1d1f26] text-[#f2e8f4]">
      <div className="mx-auto flex max-w-[1440px]">
        <aside className="hidden min-h-screen w-64 border-r border-white/10 bg-[#24262f] p-5 lg:block">
          <p className="mb-6 text-sm text-[#d6c7dc]">ふたりプロジェクト</p>
          <h2 className="mb-3 text-lg font-semibold">今日のタスク管理</h2>
          <div className="space-y-2 text-sm text-[#cabfd7]">
            <p>👩 さく</p>
            <p>👩 しょこ</p>
          </div>
          {!partnerId && <p className="mt-6 rounded-lg bg-[#9980F2]/20 p-3 text-xs text-[#d8ceff]">しょこが未ログインです。担当切替は「共同↔さく」で動きます。</p>}
        </aside>

        <section className="w-full p-4 lg:p-6">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">webサイトリニューアル</h1>
              <p className="text-sm text-[#cabfd7]">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={createTask} disabled={saving} className="rounded-lg bg-[#9980F2] px-4 py-2 text-sm font-semibold text-[#1f1a2a]">+ タスクを追加</button>
              <button className="rounded-lg border border-white/20 px-3 py-2 text-sm" onClick={logout}>ログアウト</button>
            </div>
          </header>

          <div className="mb-4 flex flex-wrap gap-2 border-y border-white/10 py-3">
            {TABS.map((tab) => (
              <button key={tab.key} onClick={() => setFilter(tab.key)} className={`rounded-full px-3 py-1.5 text-sm ${filter === tab.key ? 'bg-[#D989CB] text-[#231f2c]' : 'bg-[#2a2d36] text-[#e7dff0]'}`}>
                {tab.label}
                {!['done', 'archived'].includes(tab.key) && <span className="ml-2 rounded-full bg-black/30 px-2 py-0.5 text-xs">{counts[tab.key as keyof typeof counts] ?? 0}</span>}
              </button>
            ))}
          </div>

          {error && <p className="mb-3 rounded-lg bg-[#F2B4AE]/20 p-2 text-sm text-[#ffd7d2]">{error}</p>}

          <div className="grid gap-4 xl:grid-cols-3">
            <TaskLane title="やること" accent="#D989CB" tasks={boardCols.todo} emptyText="タスクなし" me={user.id} partnerId={partnerId} onSelect={setSelectedId} onToggleDone={toggleDone} onPatch={patchTask} onDelete={deleteTask} />
            <TaskLane title="進行中（今日/期限切れ）" accent="#9980F2" tasks={boardCols.focus} emptyText="タスクなし" me={user.id} partnerId={partnerId} onSelect={setSelectedId} onToggleDone={toggleDone} onPatch={patchTask} onDelete={deleteTask} />
            <TaskLane title="完了" accent="#88ABF2" tasks={boardCols.done} emptyText="タスクなし" me={user.id} partnerId={partnerId} onSelect={setSelectedId} onToggleDone={toggleDone} onPatch={patchTask} onDelete={deleteTask} />
          </div>
        </section>
      </div>

      {selected && user && (
        <TaskDetailModal
          task={selected}
          me={user.id}
          partnerId={partnerId}
          onClose={() => setSelectedId(null)}
          onPatch={patchTask}
          onDelete={deleteTask}
          onToggleDone={toggleDone}
        />
      )}
    </main>
  );
}

function TaskLane({
  title,
  accent,
  tasks,
  emptyText,
  me,
  partnerId,
  onSelect,
  onToggleDone,
  onPatch,
  onDelete
}: {
  title: string;
  accent: string;
  tasks: Task[];
  emptyText: string;
  me: string;
  partnerId: string | null;
  onSelect: (id: string) => void;
  onToggleDone: (task: Task) => void;
  onPatch: (id: string, patch: Partial<Task>) => void;
  onDelete: (task: Task) => void;
}) {
  return (
    <section className="min-h-[420px] rounded-2xl border border-white/10 bg-[#23252d] p-3">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
        {title}
        <span className="text-[#c5bbd2]">{tasks.length}</span>
      </h2>
      <div className="space-y-3">
        {tasks.length === 0 && <p className="text-xs text-[#b4a8c5]">{emptyText}</p>}
        {tasks.map((t) => (
          <TaskCard key={t.id} t={t} me={me} onSelect={onSelect} onToggleDone={onToggleDone} onPatch={onPatch} onDelete={onDelete} partnerId={partnerId} />
        ))}
      </div>
    </section>
  );
}

function TaskDetailModal({
  task,
  me,
  partnerId,
  onClose,
  onPatch,
  onDelete,
  onToggleDone
}: {
  task: Task;
  me: string;
  partnerId: string | null;
  onClose: () => void;
  onPatch: (id: string, patch: Partial<Task>) => void;
  onDelete: (task: Task) => void;
  onToggleDone: (task: Task) => void;
}) {
  const [commentDraft, setCommentDraft] = useState('');

  function appendComment() {
    if (!commentDraft.trim()) return;
    const author = task.assignee === partnerId ? 'しょこ' : 'さく';
    const line = `\n\n[コメント ${todayLocal()} ${author}]\n${commentDraft.trim()}`;
    onPatch(task.id, { memo: `${task.memo ?? ''}${line}` });
    setCommentDraft('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl border border-white/15 bg-[#2a2c34] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs text-[#bcb1cc]"># タスク詳細</p>
            <h3 className="text-2xl font-semibold">{task.title}</h3>
          </div>
          <button className="rounded-md border border-white/20 px-3 py-1.5" onClick={onClose}>閉じる</button>
        </div>

        <div className="space-y-3 p-5">
          <label className="text-sm">タイトル
            <input className="mt-1 w-full rounded-xl border border-white/10 bg-[#1e2028] px-3 py-2" value={task.title} onChange={(e) => onPatch(task.id, { title: e.target.value })} />
          </label>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-sm">期限
              <input type="date" className="mt-1 w-full rounded-xl border border-white/10 bg-[#1e2028] px-3 py-2" value={task.due_date ?? ''} onChange={(e) => onPatch(task.id, { due_date: e.target.value || null })} />
            </label>
            <label className="text-sm">優先度
              <select className="mt-1 w-full rounded-xl border border-white/10 bg-[#1e2028] px-3 py-2" value={task.priority} onChange={(e) => onPatch(task.id, { priority: e.target.value as Priority })}>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </label>
            <label className="text-sm">担当
              <select className="mt-1 w-full rounded-xl border border-white/10 bg-[#1e2028] px-3 py-2" value={task.assignee ?? '__both__'} onChange={(e) => onPatch(task.id, { assignee: e.target.value === '__both__' ? null : e.target.value })}>
                <option value="__both__">共同</option>
                <option value={me}>さく</option>
                {partnerId && <option value={partnerId}>しょこ</option>}
              </select>
            </label>
          </div>

          <label className="text-sm">説明・メモ
            <textarea className="mt-1 min-h-28 w-full rounded-xl border border-white/10 bg-[#1e2028] px-3 py-2" value={task.memo ?? ''} onChange={(e) => onPatch(task.id, { memo: e.target.value })} />
          </label>

          <div className="rounded-xl border border-white/10 bg-[#24262e] p-3">
            <p className="mb-2 text-sm font-medium">コメント</p>
            <textarea className="min-h-20 w-full rounded-xl border border-white/10 bg-[#1e2028] px-3 py-2" value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder="コメントを書く" />
            <div className="mt-2 flex justify-end">
              <button className="rounded-lg bg-[#88ABF2] px-4 py-2 text-sm font-semibold text-[#1c2030]" onClick={appendComment}>コメントをメモへ追記</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg bg-[#9980F2] px-4 py-2 text-sm font-semibold text-[#1f1a2a]" onClick={() => onPatch(task.id, toEditablePayload(task))}>保存</button>
            <button className="rounded-lg bg-[#d989cb] px-4 py-2 text-sm font-semibold text-[#2e2230]" onClick={() => onToggleDone(task)}>{task.status === 'open' ? '完了にする' : '未完了へ戻す'}</button>
            <button className="rounded-lg bg-[#f2dcc2] px-4 py-2 text-sm font-semibold text-[#332d25]" onClick={() => onPatch(task.id, { is_archived: !task.is_archived })}>{task.is_archived ? 'アーカイブ解除' : 'アーカイブへ移動'}</button>
            {(task.status === 'done' || task.is_archived) && <button className="rounded-lg bg-[#F2B4AE] px-4 py-2 text-sm font-semibold text-[#3a1f1c]" onClick={() => onDelete(task)}>削除</button>}
          </div>

          <p className="text-xs text-[#bdb2cb]">作成: {new Date(task.created_at).toLocaleString()} / 更新: {new Date(task.updated_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  t,
  me,
  partnerId,
  onSelect,
  onToggleDone,
  onPatch,
  onDelete
}: {
  t: Task;
  me: string;
  partnerId: string | null;
  onSelect: (id: string) => void;
  onToggleDone: (task: Task) => void;
  onPatch: (id: string, patch: Partial<Task>) => void;
  onDelete: (task: Task) => void;
}) {
  const canSwitchToPartner = Boolean(partnerId);
  const nextAssignee = t.assignee === me ? (canSwitchToPartner ? partnerId : null) : t.assignee === partnerId ? null : me;

  return (
    <article className="rounded-xl border border-white/10 bg-[#2f323b] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.18)]">
      <button onClick={() => onSelect(t.id)} className="w-full text-left">
        <p className="font-semibold text-[#f4edf7]">{t.title}</p>
      </button>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#d9cfe6]">
        <span className="rounded-full bg-black/25 px-2 py-1">{dueText(t)}</span>
        <span className="rounded-full bg-black/25 px-2 py-1">優先: {priorityLabel[t.priority]}</span>
        <span className="rounded-full bg-black/25 px-2 py-1">担当: {t.assignee === me ? 'さく' : t.assignee === partnerId ? 'しょこ' : '共同'}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <button className="rounded bg-black/25 px-2 py-1" onClick={() => onToggleDone(t)}>{t.status === 'open' ? '完了にする' : '未完了に戻す'}</button>
        <button className="rounded bg-black/25 px-2 py-1 disabled:opacity-50" disabled={!canSwitchToPartner && t.assignee === me} onClick={() => onPatch(t.id, { assignee: nextAssignee ?? null })}>担当切替</button>
        <button className="rounded bg-black/25 px-2 py-1" onClick={() => onPatch(t.id, { priority: t.priority === 'high' ? 'medium' : t.priority === 'medium' ? 'low' : 'high' })}>優先度変更</button>
        {(t.status === 'done' || t.is_archived) && <button className="rounded bg-[#F2B4AE] px-2 py-1 text-[#3a1f1c]" onClick={() => onDelete(t)}>削除</button>}
      </div>
    </article>
  );
}
