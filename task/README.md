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

### allowlistメール更新
`002_seed_allowlist.sql` の以下を置換:
- `your_email@example.com`
- `partner_email@example.com`

## 3) Environment Variables
`.env.local` を作成:

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
- タブ順: 未完了 / 今日まで / 共同 / さく担当 / しょこ担当 / 期限切れ / 完了 / アーカイブ
- 完了・アーカイブは削除可能（確認ダイアログあり）
- Last write wins（MVP）

## Theme config
主な色は `tailwind.config.ts` で調整可能。

## レビュー依頼時に共有するとよいファイル

task管理システムのコードレビューを依頼する際は、次をセットで渡すと意図と実装の全体像が伝わりやすいです。

- 仕様と前提
  - `task/README.md`
- 画面と主要ロジック
  - `task/app/page.tsx`
  - `task/app/layout.tsx`
  - `task/app/globals.css`
- 型・データアクセス
  - `task/lib/types.ts`
  - `task/lib/supabase.ts`
- DBスキーマ / RLS / 初期データ
  - `task/supabase/migrations/001_init.sql`
  - `task/supabase/migrations/002_seed_allowlist.sql`
  - `task/supabase/migrations/003_fix_task_delete_permission.sql`
- ビルド・依存関係（再現用）
  - `task/package.json`
  - `task/tsconfig.json`
  - `task/next.config.mjs`

最小構成で依頼する場合でも、少なくとも `page.tsx` / `lib/*.ts` / `supabase/migrations/*.sql` は含めるのがおすすめです。


## 9) `permission denied for table tasks` が出る場合

過去のマイグレーション状態によっては、`tasks` テーブルに DELETE 権限が不足していることがあります。
以下を Supabase SQL Editor で実行してください。

1. `supabase/migrations/003_fix_task_delete_permission.sql`

これで `authenticated` へ DELETE 権限を付与し、RLS の delete policy も再作成されます。
