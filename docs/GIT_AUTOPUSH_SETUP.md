# CodexにGit操作を任せるための最短セットアップ

## 結論（このドキュメントの要点）

はい。**一度だけ初期設定（remote + 認証）を済ませ、トークンが有効な状態なら**、次回以降は「フォルダ作成して」と依頼するだけで Codex 側で `作成 → commit → push` まで実行できます。

- あなたの直近ログ `branch 'work' set up ... / Everything up-to-date` は、初期設定が完了していて push 可能な状態を示します。
- つまり今後は、あなた側の追加操作なしで「依頼内容を GitHub へ反映する」運用に入れます。

- セキュリティ上、PAT をチャット本文へ貼る運用は推奨しません。短命トークンを使い、利用後は即失効してください。

## 0) まず最初に（重要）

`\.\scripts\codex-push.ps1` が見つからないエラーは、**リポジトリ直下で実行していない**ときに起きます。

先にこのリポジトリをローカルへ clone して、`main` フォルダへ移動してください。

```powershell
cd C:\Users\tjack
# main フォルダが無いときだけ clone
if (!(Test-Path .\main)) { git clone https://github.com/sak3-9/main.git }
cd .\main
```

`fatal: destination path 'main' already exists` が出る場合は正常です。`cd .\main` へ進んでください。

次に、補助スクリプトの有無を確認します。

```powershell
Test-Path .\scripts\codex-push.ps1
```

- `True` の場合: `& .\scripts\codex-push.ps1` を使えます。
- `False` の場合: このファイルは手元のブランチに無いので、**セクション 7 の「スクリプトなし手順」**を使ってください。

---

このリポジトリでは、`scripts/codex-push.sh` を使うと以下を自動化できます。

- `origin` リモートの設定（未設定なら追加、設定済みなら更新）
- 現在ブランチの push
- 必要ならトークン認証付きで push

---

## 1) 事前準備（初回だけ）

### A. GitHubにリポジトリを作成
例: `https://github.com/<your-user>/<your-repo>.git`

### B. GitHub Personal Access Token (PAT) を作成
最低でも対象リポジトリに push できる権限を付与してください。

> PAT = GitHubに対する「パスワード代わり」の文字列です。

---

## 2) 実行方法

### Bash / Git Bash / WSL の場合（`.sh` を使う）

#### HTTPS + PAT

```bash
export GIT_REMOTE_URL="https://github.com/<your-user>/<your-repo>.git"
export GIT_USERNAME="<your-user>"
export GIT_TOKEN="<your-pat>"
./scripts/codex-push.sh
```

#### SSH

```bash
export GIT_REMOTE_URL="git@github.com:<your-user>/<your-repo>.git"
./scripts/codex-push.sh
```

### PowerShell の場合（`.ps1` を使う）

#### HTTPS + PAT

```powershell
$env:GIT_REMOTE_URL = "https://github.com/<your-user>/<your-repo>.git"
$env:GIT_USERNAME = "<your-user>"
$env:GIT_TOKEN = "<your-pat>"
.\scripts\codex-push.ps1
```

#### SSH

```powershell
$env:GIT_REMOTE_URL = "git@github.com:<your-user>/<your-repo>.git"
.\scripts\codex-push.ps1
```

---

## 2.5) このリポジトリ（`https://github.com/sak3-9/main`）用のコピペコマンド

### PowerShell で HTTPS + PAT（推奨）

```powershell
$env:GIT_REMOTE_URL = "https://github.com/sak3-9/main.git"
$env:GIT_USERNAME = "sak3-9"
$env:GIT_TOKEN = "<あなたのPAT>"
.\scripts\codex-push.ps1
```

### PowerShell で SSH（SSH鍵設定済みの場合）

```powershell
$env:GIT_REMOTE_URL = "git@github.com:sak3-9/main.git"
.\scripts\codex-push.ps1
```

### Bash 系シェルで実行する場合

```bash
export GIT_REMOTE_URL="https://github.com/sak3-9/main.git"
export GIT_USERNAME="sak3-9"
export GIT_TOKEN="<あなたのPAT>"
./scripts/codex-push.sh
```

---

## 3) 専門用語のやさしい説明

- **remote（リモート）**: コードを送る先のサーバー（GitHubなど）。
- **origin**: 既定のリモート名。慣習的に一番よく使う名前。
- **branch（ブランチ）**: 作業の流れを分ける単位。
- **push**: ローカルのコミットをリモートへ送信する操作。
- **PAT**: GitHubにアクセスするためのトークン（パスワード代替）。

---

## 4) 失敗しやすいポイント

- `GIT_REMOTE_URL` 未設定 → スクリプトがエラーで停止します。
- `GIT_TOKEN` だけ設定して `GIT_USERNAME` がない → エラーになります。
- PAT権限不足 → `403` 系エラーになることがあります。

---

## 5) セキュリティ注意

- `GIT_TOKEN` をファイルへ直書きしないでください。
- 共有PCではシェル履歴に秘密情報が残らないよう注意してください。
- 必要がなくなったPATはGitHub側で失効してください。


## 6) トラブルシューティング（PowerShell）

### PowerShell で実行時に `コマンドが見つからない` と出る場合

次の順で確認してください。

1. カレントフォルダ確認

```powershell
Get-Location
```

2. スクリプト存在確認

```powershell
Test-Path .\scripts\codex-push.ps1
```

3. 存在するなら `&` 付きで実行

```powershell
& .\scripts\codex-push.ps1
```

4. 実行ポリシーで止まる場合（このセッションだけ緩和）

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
& .\scripts\codex-push.ps1
```

> `Set-ExecutionPolicy -Scope Process` は、PowerShellを閉じると元に戻る一時設定です。


## 7) `scripts/codex-push.ps1` が手元に無い場合の最短手順（PowerShell）

あなたのエラーは、**そのファイルが本当に存在しない**場合にも発生します。
（`main` ブランチにこの補助スクリプトがまだ入っていない場合など）

まず存在確認:

```powershell
Test-Path .\scripts\codex-push.ps1
```

- `False` の場合は、以下の「スクリプトなし手順」を実行してください。

### スクリプトなしで push する（そのまま実行可）

```powershell
# 1) 送信先URLを登録（初回だけ）
git remote remove origin 2>$null
git remote add origin https://github.com/sak3-9/main.git

# 2) 現在のブランチ名を取得
$branch = (git rev-parse --abbrev-ref HEAD).Trim()

# 3) push（初回は upstream 設定付き）
git push -u origin $branch
```

### 認証で止まる場合（HTTPS + PAT）

GitHub のユーザー名と PAT を使って認証してください。
- Username: `sak3-9`
- Password: `<あなたのPAT>`

> うまくいかない場合は、PATの権限（repo への書き込み）を確認してください。


## 8) `fatal: not a git repository` が出る場合

このエラーは、**Git管理されていないフォルダ（例: `C:\Users\tjack`）で実行した**ときに出ます。

以下をそのまま実行してください。

```powershell
cd C:\Users\tjack
git clone https://github.com/sak3-9/main.git
cd .\main
Test-Path .git
```

- `Test-Path .git` が `True` なら、その場所はGitリポジトリです。

続けて push 実行:

```powershell
$env:GIT_REMOTE_URL = "https://github.com/sak3-9/main.git"
$env:GIT_USERNAME = "sak3-9"
$env:GIT_TOKEN = "<あなたのPAT>"
& .\scripts\codex-push.ps1
```

> すでに `C:\Users\tjack\main` がある場合は、`cd .\main` だけでOKです。


## 9) あなたの今回の状態にそのまま当てはめる手順

あなたのログだと、`C:\Users\tjack\main` は Git リポジトリですが、`scripts\codex-push.ps1` が存在しない状態です。
そのため、次をそのまま実行してください（補助スクリプト不要）。

```powershell
cd C:\Users\tjack\main
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
git remote remove origin 2>$null
git remote add origin https://github.com/sak3-9/main.git
git push -u origin $branch
```

認証を求められたら: 
- Username: `sak3-9`
- Password: `<あなたのPAT>`
