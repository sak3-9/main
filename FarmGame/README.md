# FarmGame (PixiJS + TypeScript MVP)

スマホブラウザ中心の放置系農業ゲームMVPです。

## セットアップ

```bash
cd FarmGame
npm install
```

## 起動（開発）

```bash
npm run dev
```

- 既定URL: `http://127.0.0.1:4174`

## ビルド

```bash
npm run build
npm run preview
```

## 操作

- Farm: タイルタップで1マス植え、`まとめ植え`で空マスに一括植え。
- Shop: 畑拡張、燃料購入、猫強化。
- Cats: 収穫猫/販売猫のON/OFF。
- Settings: ガイド/BGM/SEトグル、Save Export/Import、リセット。
- Offline Summary: 起動時にオフライン進行（最大8時間）結果を表示。

## アセット差し替え

- `assets/manifest.json` のパスを維持して画像を差し替えてください。
- 現状MVPはプレースホルダ描画（Pixi Graphics）で動作します。
- 本番差し替え時は `assets/crops/<id>_sprout.png`, `<id>_mid.png`, `<id>.png` を追加します。
