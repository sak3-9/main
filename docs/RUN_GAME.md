# ゲームの起動方法（ブラウザ）

このリポジトリのミニゲームは `index.html` です。

## 最短起動（Linux/macOS/Git Bash）

```bash
./scripts/run-game.sh
```

起動後、次のURLをブラウザで開いてください。

- `http://127.0.0.1:4173/index.html`

## 最短起動（PowerShell / Windows）

```powershell
.\scripts\run-game.ps1
```

起動後、次のURLをブラウザで開いてください。

- `http://127.0.0.1:4173/index.html`

## ポートを変える場合

```bash
./scripts/run-game.sh 8080
```

その場合は `http://127.0.0.1:8080/index.html` を開きます。

## 直接起動（Python）

```bash
python3 -m http.server 4173
```

