# FarmGame (PixiJS + TypeScript MVP)

スマホブラウザ中心の放置系農業ゲームMVPです。  
このREADMEは **PC初心者向け** に、インストールからゲーム起動までを順番に説明します。

---

## 1. まず準備するもの

### 必須
- **Node.js（18以上推奨）**
- **Git**
- ブラウザ（Chrome / Edge など）

### インストール先（公式）
- Node.js: https://nodejs.org/
- Git: https://git-scm.com/

> 迷ったら Node.js は「LTS」、Git は標準設定のままでOKです。

---

## 2. フォルダを開く（共通）

このプロジェクトをPCに用意した状態で、以下を行います。

1. ターミナル（または PowerShell）を開く
2. `FarmGame` フォルダに移動する

```bash
cd FarmGame
```

---

## 3. 初回セットアップ（最初の1回だけ）

`FarmGame` フォルダ内で以下を実行します。

```bash
npm install
```

これでゲーム起動に必要なファイルが自動で入ります。

---

## 4. ゲームを起動する（開発モード）

```bash
npm run dev
```

成功すると、ターミナルに次のような表示が出ます（例）。

- `Local: http://localhost:4174/`

このURLをブラウザで開くとゲームが動きます。

---

## 5. Windows / Mac の操作メモ

### Windows
- `Windowsキー` → `PowerShell` を検索して起動
- `cd` で `FarmGame` へ移動
- `npm install` → `npm run dev`

### Mac
- `command + space` → `Terminal` を検索して起動
- `cd` で `FarmGame` へ移動
- `npm install` → `npm run dev`

---

## 6. 起動できないときの確認

### `npm` が見つからない
Node.js が未インストール、またはインストール直後でターミナル再起動が必要です。  
Node.js を入れ直して、ターミナルを閉じて開き直してください。

### `EADDRINUSE`（ポート使用中）
4174番ポートが他アプリで使われています。次で別ポート起動できます。

```bash
npm run dev -- --port 4175
```

その場合は `http://localhost:4175/` を開いてください。

### 画面が真っ白
- ターミナルに赤いエラーがないか確認
- ブラウザを再読み込み
- 一度 `Ctrl + C` で停止して `npm run dev` を再実行

---

## 7. ゲームの基本操作

- **Farm**: タイルタップで1マス植え、`まとめ植え`で空マスに一括植え
- **Shop**: 畑拡張、燃料購入、猫強化
- **Cats**: 収穫猫/販売猫のON/OFF
- **Settings**: ガイド/BGM/SEトグル、Save Export/Import、リセット
- **Offline Summary**: 起動時にオフライン進行（最大8時間）結果を表示

---

## 8. セーブデータ

- 保存先: ブラウザのローカル保存（localStorage）
- **Export**: `mofuneko-farm-save.json` をダウンロード
- **Import**: JSONファイルを読み込んで復元

---

## 9. ビルド（配布前確認）

```bash
npm run build
npm run preview
```

`preview` 実行後に表示されるURLをブラウザで開くと、本番ビルドの確認ができます。

---

## 10. アセット差し替え

- `assets/manifest.json` のパスを維持して画像を差し替えてください
- 現状MVPは、画像がない場合でもプレースホルダ描画（Pixi Graphics）で動作します
- 作物は以下の3段階画像に対応します
  - `assets/crops/<id>_sprout.png`
  - `assets/crops/<id>_mid.png`
  - `assets/crops/<id>.png`（ready）
