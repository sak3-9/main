# Couple Task Sync (Next.js + Supabase)

2人専用（あなた/彼女）の共有タスク管理アプリです。PCとiPhone Safariで利用できます。

## Tech Stack
- Next.js App Router + TypeScript + Tailwind
- Supabase Auth (Magic Link)
- Supabase Postgres + RLS

## Security Principles
- allowlistに登録した **2つのメールのみ** 利用可能
- DB側でRLS強制（UIチェックだけに依存しない）
- clientには `NEXT_PUBLIC_SUPABASE_ANON_KEY` のみ使用
- Service Role Keyは使わない/コミットしない
- 入力検証（title 1..100, memo <= 2000）

## 1) Supabase project作成
1. Supabaseプロジェクトを作成
2. Authentication > Providers > Email を有効化（Magic Link）
3. URL Configurationで `Site URL` にデプロイURLを設定

## 2) SQL migration適用
Supabase SQL Editorで次を順番に実行:
1. `supabase/migrations/001_init.sql`
2. `supabase/migrations/002_seed_allowlist.sql`（2人のメールに置換してから）
3. `supabase/migrations/003_fix_task_delete_permission.sql`（既存環境で削除権限エラーが出る場合）
4. `supabase/migrations/004_harden_task_permissions.sql`（列権限と削除条件の強化）

### allowlistメール更新
`002_seed_allowlist.sql` の以下を置換:
- `your_email@example.com`
- `partner_email@example.com`

## 3) Environment Variables
`.env.example` をコピーして `.env.local` を作成:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

> 秘密鍵（service_role）は絶対にクライアントへ入れない。

## 4) Local Development
```bash
npm install
npm run dev
```
`http://localhost:3000` を開く。

## 5) Deploy (Vercel)
1. GitHub連携でVercelへimport
2. Environment Variablesに上記2つを設定
3. Deploy

## 6) 初回ログイン時のprofile upsert
ログイン後、`auth.getUser()` の `id/email` を使って `public.profiles` に upsert しています（RLSにより本人行のみ）。

## 7) RLS検証
- allowlistの2メール: SELECT/INSERT/UPDATE できる
- 第3メール: 認証はできてもDB操作はRLSで拒否される

## 8) UX仕様
- ダークモード紫テーマ
- 2画面構造: List + Detail
- タブ順: 未完了 / 今日まで / 共同 / さく担当 / しょこ担当 / 期限切れ / すべて / 完了 / アーカイブ
- due_today は未完了のみ対象
- 完了・アーカイブは削除可能（確認ダイアログあり、DB側でも条件付き許可）
- Last write wins（MVP）

## Theme config
主な色は `tailwind.config.ts` で調整可能。


## 9) `permission denied for table tasks` が出る場合

過去のマイグレーション状態によっては、`tasks` テーブルに DELETE 権限が不足していることがあります。
以下を Supabase SQL Editor で実行してください。

1. `supabase/migrations/003_fix_task_delete_permission.sql`

これで `authenticated` へ DELETE 権限を付与し、RLS の delete policy も再作成されます。


## 10) フィルタ簡易テスト
- Open: 未完了のみ表示
- All: 未アーカイブ全件（open/done混在）
- Due today: 未完了かつ本日期限
- Overdue: 未完了かつ期限切れ
- Done: 完了のみ
- Archived: アーカイブのみ

## 11) 削除条件テスト
- openタスクを削除: 失敗（UI/DBで拒否）
- doneタスクを削除: 成功
- archivedタスクを削除: 成功
