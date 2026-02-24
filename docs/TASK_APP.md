# taskアプリ（ふたりタスクボード）

`task/index.html` は、2人（あなた / 彼女）で使う日常タスク共有管理アプリです。

## 特徴
- カンバン（Todo / Doing / Done）
- 担当（あなた / 彼女 / ふたり）と優先度、期限
- 検索 / フィルタ
- ローカル保存（localStorage）
- JSONバックアップ出力/読込

## ローカル実行

以下のどちらかでサーバーを起動し、URLを開いてください。

```bash
./scripts/run-game.sh
# その後: http://127.0.0.1:4173/task/index.html
```

## 公開して共有する

GitHub Pages を有効化すると、次のようなURLで共有できます。

- ゲーム: `https://<username>.github.io/<repo>/game/index.html`
- タスク: `https://<username>.github.io/<repo>/task/index.html`

例（このリポジトリ名が `main` の場合）:
- `https://sak3-9.github.io/main/game/index.html`
- `https://sak3-9.github.io/main/task/index.html`
