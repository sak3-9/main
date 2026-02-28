# taskアプリ（ふたりタスクボード）

`task/` 配下に Next.js + Supabase 構成で実装しています。

## 重要ポイント
- 2人のallowlistメールのみ利用可能
- Supabase Auth（Magic Link）
- RLSでDBアクセス制御
- Doneデフォルト非表示 + フィルタ
- due today / overdue フィルタ

## 開発起動
```bash
cd task
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

## 公開共有
Vercelへデプロイし、そのURLを2人で共有します。
（GitHub PagesではNext.js動的機能を十分に扱えないため非推奨）

詳細は `task/README.md` を参照してください。
