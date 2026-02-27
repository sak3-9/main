'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import type { FilterKey, Priority, Profile, Status, Task } from '@/lib/types';

type AuthUser = { id: string; email: string } | null;

const TABS: { key: FilterKey; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'done', label: 'Done' },
  { key: 'all', label: 'All' },
  { key: 'assigned_me', label: 'Assigned Me' },
  { key: 'assigned_partner', label: 'Assigned Partner' },
  { key: 'due_today', label: 'Due Today' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'archived', label: 'Archived' }
];

const priorityOrder: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

function isToday(date: string | null): boolean {
  if (!date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return date === today;
}

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return date < today;
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

  async function syncAuth() {
    if (!supabase) { setLoading(false); setError('環境変数が未設定です。READMEに従って設定してください。'); return; }
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
      setError('許可されたメールのみ利用できます（Allowlistを確認）。');
    }

    await Promise.all([loadTasks(), resolvePartnerId(u.id)]);
    setLoading(false);
  }

  async function resolvePartnerId(myId: string) {
    if (!supabase) return;
    const { data, error: rpcError } = await supabase.rpc('workspace_members');
    if (rpcError || !Array.isArray(data)) return;
    const other = data.find((m: Profile) => m.id !== myId);
    setPartnerId(other?.id ?? null);
  }

  async function loadTasks() {
    if (!supabase) return;
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) {
      setError(error.message.includes('permission') ? 'Allowlist外のため利用できません。' : error.message);
      return;
    }
    setTasks((data ?? []) as Task[]);
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
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
          case 'done': return t.status === 'done' && !t.is_archived;
          case 'all': return !t.is_archived;
          case 'assigned_me': return t.assignee === user?.id && !t.is_archived;
          case 'assigned_partner': return partnerId ? t.assignee === partnerId && !t.is_archived : false;
          case 'due_today': return isToday(t.due_date) && !t.is_archived;
          case 'overdue': return isOverdue(t.due_date) && t.status === 'open' && !t.is_archived;
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
    setAuthMessage(error ? error.message : 'メールにログインリンクを送信しました。');
  }

  async function createTask() {
    if (!supabase) return;
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('tasks')
      .insert({ title: '新しいタスク', memo: '', priority: 'medium', status: 'open', created_by: user.id })
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
    const title = (patch.title ?? local.title).trim();
    const memo = (patch.memo ?? local.memo ?? '').trim();
    if (title.length < 1 || title.length > 100) return setError('titleは1〜100文字です');
    if (memo.length > 2000) return setError('memoは2000文字以内です');

    const { error } = await supabase.from('tasks').update({ ...patch, title, memo }).eq('id', id);
    if (error) return setError(error.message);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch, title, memo, updated_at: new Date().toISOString() } : t)));
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setTasks([]);
    setSelectedId(null);
  }

  if (loading) return <main className="min-h-screen grid place-items-center">Loading...</main>;

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-5">
        <form onSubmit={signInMagic} className="w-full max-w-md rounded-2xl border border-purple-500/30 bg-panel p-6 space-y-4">
          <h1 className="text-2xl font-bold">ふたりタスク（Magic Link）</h1>
          <p className="text-sm text-purple-200">Allowlistされた2人のみログイン可能です。</p>
          <input className="w-full rounded-xl bg-bg px-3 py-2 no-zoom" type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="you@example.com" />
          <button className="w-full rounded-xl bg-gradient-to-r from-accent to-accent2 py-2 font-semibold no-zoom">ログインリンク送信</button>
          {authMessage && <p className="text-sm text-purple-200">{authMessage}</p>}
          {error && <p className="text-sm text-rose-200">{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-6xl grid gap-4 md:grid-cols-[1.2fr,1fr]">
        <section className="rounded-2xl border border-purple-500/30 bg-panel p-4 space-y-4">
          <header className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold">Daily Shared Tasks</h1>
              <p className="text-xs text-purple-200">{user.email}</p>
            </div>
            <button className="rounded-xl border border-purple-400/40 px-3 py-2 text-sm" onClick={logout}>Logout</button>
          </header>

          <div className="flex gap-2 overflow-auto pb-1">
            {TABS.map((tab) => (
              <button key={tab.key} onClick={() => setFilter(tab.key)} className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${filter === tab.key ? 'bg-accent text-black' : 'bg-card'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {error && <p className="rounded-lg bg-rose-400/15 p-2 text-sm text-rose-200">{error}</p>}

          <div className="space-y-2">
            {visibleTasks.length === 0 && <p className="text-sm text-purple-200">該当タスクがありません。</p>}
            {visibleTasks.map((t) => (
              <article key={t.id} className={`rounded-xl border p-3 ${selectedId === t.id ? 'border-accent bg-card' : 'border-purple-500/20 bg-black/20'}`}>
                <div className="flex items-start gap-2">
                  <input aria-label="done toggle" className="mt-1 h-5 w-5" type="checkbox" checked={t.status === 'done'} onChange={(e) => patchTask(t.id, { status: e.target.checked ? 'done' : 'open' as Status })} />
                  <button onClick={() => setSelectedId(t.id)} className="text-left flex-1">
                    <p className="font-semibold">{t.title}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-purple-200">
                      <span>{t.due_date ? (isOverdue(t.due_date) ? 'Overdue' : isToday(t.due_date) ? 'Today' : t.due_date) : 'No due'}</span>
                      <span>{t.priority}</span>
                      <span>{t.assignee === user.id ? 'me' : t.assignee ? 'partner' : 'unassigned'}</span>
                    </div>
                  </button>
                </div>
                <div className="mt-2 flex gap-2 text-xs">
                  <button className="rounded bg-card px-2 py-1" onClick={() => patchTask(t.id, { priority: t.priority === 'high' ? 'medium' : t.priority === 'medium' ? 'low' : 'high' })}>priority</button>
                  <button className="rounded bg-card px-2 py-1" onClick={() => patchTask(t.id, { assignee: t.assignee === user.id ? partnerId : user.id })}>assignee</button>
                </div>
              </article>
            ))}
          </div>

          <button onClick={createTask} disabled={saving} className="fixed bottom-6 right-6 md:static rounded-full md:rounded-xl bg-gradient-to-r from-accent to-accent2 px-5 py-3 font-bold text-black shadow-xl no-zoom">
            +
          </button>
        </section>

        <section className="rounded-2xl border border-purple-500/30 bg-panel p-4">
          {!selected && <p className="text-sm text-purple-200">左側のタスクを選択すると詳細編集できます。</p>}
          {selected && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Task Detail</h2>
              <label className="text-sm">Title
                <input className="mt-1 w-full rounded-xl bg-bg px-3 py-2" value={selected.title} onChange={(e) => setTasks((prev) => prev.map((t) => t.id === selected.id ? { ...t, title: e.target.value } : t))} />
              </label>
              <label className="text-sm">Memo
                <textarea className="mt-1 w-full rounded-xl bg-bg px-3 py-2 min-h-28" value={selected.memo ?? ''} onChange={(e) => setTasks((prev) => prev.map((t) => t.id === selected.id ? { ...t, memo: e.target.value } : t))} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm">Due
                  <input type="date" className="mt-1 w-full rounded-xl bg-bg px-3 py-2" value={selected.due_date ?? ''} onChange={(e) => setTasks((prev) => prev.map((t) => t.id === selected.id ? { ...t, due_date: e.target.value || null } : t))} />
                </label>
                <label className="text-sm">Priority
                  <select className="mt-1 w-full rounded-xl bg-bg px-3 py-2" value={selected.priority} onChange={(e) => setTasks((prev) => prev.map((t) => t.id === selected.id ? { ...t, priority: e.target.value as Priority } : t))}>
                    <option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
                  </select>
                </label>
              </div>
              <label className="text-sm">Assignee
                <select className="mt-1 w-full rounded-xl bg-bg px-3 py-2" value={selected.assignee ?? ''} onChange={(e) => setTasks((prev) => prev.map((t) => t.id === selected.id ? { ...t, assignee: e.target.value || null } : t))}>
                  <option value="">unassigned</option>
                  <option value={user.id}>me</option>
                  {partnerId && <option value={partnerId}>partner</option>}
                </select>
              </label>

              <div className="flex flex-wrap gap-2">
                <button className="rounded-xl bg-accent px-4 py-2 text-black" onClick={() => patchTask(selected.id, selected)}>Save</button>
                <button className="rounded-xl bg-card px-4 py-2" onClick={() => patchTask(selected.id, { is_archived: !selected.is_archived })}>{selected.is_archived ? 'Unarchive' : 'Archive'}</button>
                <button className="rounded-xl bg-card px-4 py-2" onClick={() => patchTask(selected.id, { status: selected.status === 'open' ? 'done' : 'open' })}>{selected.status === 'open' ? 'Mark done' : 'Reopen'}</button>
              </div>
              <p className="text-xs text-purple-300">created: {new Date(selected.created_at).toLocaleString()} / updated: {new Date(selected.updated_at).toLocaleString()}</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
