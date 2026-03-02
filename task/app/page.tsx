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
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) {
      setError(error.message.includes('permission') ? '許可された2人のみ利用できます。' : error.message);
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
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: u.id,
      email: u.email,
      display_name: null
    });

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
    const { error } = await supabase.auth.signInWithOtp({
      email: emailInput,
      options: { emailRedirectTo: window.location.origin }
    });
    setAuthMessage(error ? error.message : 'ログインリンクをメールに送信しました。');
  }

  async function createTask() {
    if (!supabase || !user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('tasks')
      .insert({ title: '新しいタスク', memo: '', priority: 'medium', status: 'open', created_by: user.id, assignee: null })
      .select('*')
      .single();
    setSaving(false);
    if (error) return setError(error.message);
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

    const { error } = await supabase.from('tasks').update(payload).eq('id', id);
    if (error) return setError(error.message);

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

    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) return setError(error.message);
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
    urgent: visibleTasks.filter((t) => t.status === 'open' && (isToday(t.due_date) || isOverdue(t.due_date))),
    open: visibleTasks.filter((t) => t.status === 'open' && !isToday(t.due_date) && !isOverdue(t.due_date)),
    done: visibleTasks.filter((t) => t.status === 'done')
  };

  if (loading) return <main className="min-h-screen grid place-items-center text-purple-100">読み込み中です…</main>;

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-5">
        <form onSubmit={signInMagic} className="w-full max-w-md rounded-2xl border border-purple-400/30 bg-panel p-6 space-y-4 shadow-xl">
          <h1 className="text-2xl font-bold">ふたりタスク共有</h1>
          <p className="text-sm text-purple-200">さくとしょこ専用の、やさしいタスク管理です。</p>
          <input className="w-full rounded-xl bg-bg px-3 py-2 no-zoom" type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="メールアドレス" />
          <button className="w-full rounded-xl bg-gradient-to-r from-accent to-accent2 py-2 font-semibold text-black no-zoom">ログインリンクを送る</button>
          {authMessage && <p className="text-sm text-purple-100">{authMessage}</p>}
          {error && <p className="text-sm text-rose-200">{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl grid gap-4 md:grid-cols-[1.25fr,1fr]">
        <section className="rounded-2xl border border-purple-500/30 bg-panel p-4">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">今日のふたりタスク</h1>
              <p className="text-xs text-purple-200">{user.email}</p>
            </div>
            <button className="rounded-xl border border-purple-400/40 px-3 py-2 text-sm" onClick={logout}>ログアウト</button>
          </header>

          <div className="mb-4 flex gap-2 overflow-auto pb-1">
            {TABS.map((tab) => (
              <button key={tab.key} onClick={() => setFilter(tab.key)} className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${filter === tab.key ? 'bg-accent text-black' : 'bg-card text-purple-100'}`}>
                {tab.label}
                {!['done', 'archived'].includes(tab.key) && (
                  <span className="ml-2 rounded-full bg-black/30 px-2 py-0.5 text-xs text-white">{counts[tab.key as keyof typeof counts] ?? 0}</span>
                )}
              </button>
            ))}
          </div>

          {!partnerId && <p className="mb-2 text-xs text-purple-300">しょこがまだログインしていないため、一部の担当切替は制限されます。</p>}
          {error && <p className="mb-3 rounded-lg bg-rose-400/15 p-2 text-sm text-rose-100">{error}</p>}

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-purple-500/30 bg-black/20 p-3">
              <h2 className="mb-2 text-sm font-semibold text-purple-100">優先（今日/期限切れ）</h2>
              {boardCols.urgent.length === 0 && <p className="text-xs text-purple-300">タスクなし</p>}
              {boardCols.urgent.map((t) => <TaskCard key={t.id} t={t} me={user.id} onSelect={setSelectedId} onToggleDone={toggleDone} onPatch={patchTask} onDelete={deleteTask} partnerId={partnerId} />)}
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-black/20 p-3">
              <h2 className="mb-2 text-sm font-semibold text-purple-100">未完了</h2>
              {boardCols.open.length === 0 && <p className="text-xs text-purple-300">タスクなし</p>}
              {boardCols.open.map((t) => <TaskCard key={t.id} t={t} me={user.id} onSelect={setSelectedId} onToggleDone={toggleDone} onPatch={patchTask} onDelete={deleteTask} partnerId={partnerId} />)}
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-black/20 p-3">
              <h2 className="mb-2 text-sm font-semibold text-purple-100">完了</h2>
              {boardCols.done.length === 0 && <p className="text-xs text-purple-300">タスクなし</p>}
              {boardCols.done.map((t) => <TaskCard key={t.id} t={t} me={user.id} onSelect={setSelectedId} onToggleDone={toggleDone} onPatch={patchTask} onDelete={deleteTask} partnerId={partnerId} />)}
            </div>
          </div>

          <button onClick={createTask} disabled={saving} className="fixed bottom-6 right-6 md:static md:mt-4 rounded-full md:rounded-xl bg-gradient-to-r from-accent to-accent2 px-5 py-3 font-bold text-black shadow-xl no-zoom">＋ タスク追加</button>
        </section>

        <section className="rounded-2xl border border-purple-500/30 bg-panel p-4">
          {!selected && (
            <div className="space-y-2 text-sm text-purple-200">
              <p>左のカードを選ぶと詳細を編集できます。</p>
              <p>おすすめ: タスクは小さく分けると続けやすいです。</p>
            </div>
          )}
          {selected && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">タスク詳細</h2>
              <label className="text-sm">タイトル
                <input className="mt-1 w-full rounded-xl bg-bg px-3 py-2" value={selected.title} onChange={(e) => setTasks((prev) => prev.map((t) => (t.id === selected.id ? { ...t, title: e.target.value } : t)))} />
              </label>
              <label className="text-sm">メモ
                <textarea className="mt-1 w-full rounded-xl bg-bg px-3 py-2 min-h-28" value={selected.memo ?? ''} onChange={(e) => setTasks((prev) => prev.map((t) => (t.id === selected.id ? { ...t, memo: e.target.value } : t)))} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm">期限
                  <input type="date" className="mt-1 w-full rounded-xl bg-bg px-3 py-2" value={selected.due_date ?? ''} onChange={(e) => setTasks((prev) => prev.map((t) => (t.id === selected.id ? { ...t, due_date: e.target.value || null } : t)))} />
                </label>
                <label className="text-sm">優先度
                  <select className="mt-1 w-full rounded-xl bg-bg px-3 py-2" value={selected.priority} onChange={(e) => setTasks((prev) => prev.map((t) => (t.id === selected.id ? { ...t, priority: e.target.value as Priority } : t)))}>
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </label>
              </div>
              <label className="text-sm">担当
                <select className="mt-1 w-full rounded-xl bg-bg px-3 py-2" value={selected.assignee ?? '__both__'} onChange={(e) => setTasks((prev) => prev.map((t) => (t.id === selected.id ? { ...t, assignee: e.target.value === '__both__' ? null : e.target.value } : t)))}>
                  <option value="__both__">共同</option>
                  <option value={user.id}>さく</option>
                  {partnerId && <option value={partnerId}>しょこ</option>}
                </select>
              </label>

              <div className="flex flex-wrap gap-2">
                <button className="rounded-xl bg-accent px-4 py-2 text-black" onClick={() => patchTask(selected.id, toEditablePayload(selected))}>保存</button>
                <button className="rounded-xl bg-card px-4 py-2" onClick={() => { if (window.confirm(selected.is_archived ? 'アーカイブを解除しますか？' : 'アーカイブへ移動しますか？')) patchTask(selected.id, { is_archived: !selected.is_archived }); }}>
                  {selected.is_archived ? 'アーカイブ解除' : 'アーカイブ'}
                </button>
                <button className="rounded-xl bg-card px-4 py-2" onClick={() => toggleDone(selected)}>{selected.status === 'open' ? '完了にする' : '未完了に戻す'}</button>
                {(selected.status === 'done' || selected.is_archived) && <button className="rounded-xl bg-rose-700/80 px-4 py-2" onClick={() => deleteTask(selected)}>削除</button>}
              </div>
              <p className="text-xs text-purple-300">作成: {new Date(selected.created_at).toLocaleString()} / 更新: {new Date(selected.updated_at).toLocaleString()}</p>
            </div>
          )}
        </section>
      </div>
    </main>
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
    <article className="mb-2 rounded-xl border border-purple-500/25 bg-card p-3">
      <button onClick={() => onSelect(t.id)} className="w-full text-left"><p className="font-semibold text-purple-50">{t.title}</p></button>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-purple-200">
        <span className="rounded-full bg-black/25 px-2 py-1">{dueText(t)}</span>
        <span className="rounded-full bg-black/25 px-2 py-1">優先: {priorityLabel[t.priority]}</span>
        <span className="rounded-full bg-black/25 px-2 py-1">担当: {t.assignee === me ? 'さく' : t.assignee === partnerId ? 'しょこ' : '共同'}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <button className="rounded bg-black/25 px-2 py-1" onClick={() => onToggleDone(t)}>{t.status === 'open' ? '完了にする' : '未完了に戻す'}</button>
        <button className="rounded bg-black/25 px-2 py-1 disabled:opacity-50" disabled={!canSwitchToPartner && t.assignee === me} onClick={() => onPatch(t.id, { assignee: nextAssignee ?? null })}>担当切替</button>
        <button className="rounded bg-black/25 px-2 py-1" onClick={() => onPatch(t.id, { priority: t.priority === 'high' ? 'medium' : t.priority === 'medium' ? 'low' : 'high' })}>優先度変更</button>
        {(t.status === 'done' || t.is_archived) && <button className="rounded bg-rose-700/80 px-2 py-1" onClick={() => onDelete(t)}>削除</button>}
      </div>
    </article>
  );
}
