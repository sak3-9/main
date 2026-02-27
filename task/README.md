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
- Doneはデフォルト非表示（filterで表示）
- Due today / Overdue filter対応
- Last write wins（MVP）

## Theme config
主な色は `tailwind.config.ts` で調整可能。
