# ASSETS LIST / v0.2.1 (MVP, High-Detail Pixel)

- 32x32で情報量多め（3段シェーディング以上）
- 輪郭は黒ではなく紫茶系（ART_GUIDE参照）
- PNG透過、Pixel-perfect前提

---

## 0. ディレクトリ
assets/
  bg/
  farm/
  crops/
  cats/
  ui/
  icons/
  fx/

---

## 1. 必須（MVP）
### 1.1 背景
| id | file | type | size | notes |
|---|---|---|---:|---|
| bg_farm | assets/bg/bg_farm.png | bg | 360x800 | パステル、丸い形、太め輪郭。テクスチャは控えめ |

※将来タイルマップ化するなら追加：
- bg/ground_grass_32.png
- bg/ground_dirt_32.png
- bg/path_32.png

### 1.2 畑タイル（32x32）
| id | file | type | size | notes |
|---|---|---|---:|---|
| tile_empty | assets/farm/tile_empty.png | sprite | 32x32 | 土。角丸、柔らかい縁、3段影 |
| tile_growing | assets/farm/tile_growing.png | sprite | 32x32 | 育成中の土（芽はcropでも可） |
| tile_ready | assets/farm/tile_ready.png | sprite | 32x32 | 収穫可の“控えめ”キラ/印 |

### 1.3 作物（32x32）
| id | file | type | size |
|---|---|---|---:|
| crop_carrot | assets/crops/carrot.png | sprite | 32x32 |
| crop_strawberry | assets/crops/strawberry.png | sprite | 32x32 |
| crop_potato | assets/crops/potato.png | sprite | 32x32 |
| crop_tomato | assets/crops/tomato.png | sprite | 32x32 |
| crop_pumpkin | assets/crops/pumpkin.png | sprite | 32x32 |
| crop_grape | assets/crops/grape.png | sprite | 32x32 |

（任意：成長段階）
- crops/<name>_sprout.png
- crops/<name>_mid.png

### 1.4 猫（48x48）
| id | file | type | size | notes |
|---|---|---|---:|---|
| cat_harvester_idle_0 | assets/cats/cat_harvester_idle_0.png | sprite | 48x48 | 収穫担当。帽子/バンダナ等の小物で役割が分かる |
| cat_harvester_idle_1 | assets/cats/cat_harvester_idle_1.png | sprite | 48x48 | idle2フレーム目 |
| cat_seller_idle_0 | assets/cats/cat_seller_idle_0.png | sprite | 48x48 | 販売担当。ポーチ/タグ等 |
| cat_seller_idle_1 | assets/cats/cat_seller_idle_1.png | sprite | 48x48 | idle2フレーム目 |

（任意：燃料切れ）
- cats/cat_harvester_tired.png
- cats/cat_seller_tired.png

### 1.5 UI（9-slice）
| id | file | type | size | notes |
|---|---|---|---:|---|
| panel_9 | assets/ui/panel_9.png | 9slice | 64x64 | slice=8。角丸、紫茶輪郭 |
| btn_primary_normal | assets/ui/btn_primary_normal.png | 9slice | 64x32 | normal, slice=8 |
| btn_primary_pressed | assets/ui/btn_primary_pressed.png | 9slice | 64x32 | pressed。1段沈む見た目 |
| btn_primary_disabled | assets/ui/btn_primary_disabled.png | 9slice | 64x32 | disabled。彩度低め |
| tab_on | assets/ui/tab_on.png | 9slice | 64x28 | on |
| tab_off | assets/ui/tab_off.png | 9slice | 64x28 | off |

### 1.6 アイコン
| id | file | type | size |
|---|---|---|---:|
| ic_coin_16 | assets/icons/ic_coin_16.png | icon | 16x16 |
| ic_fuel_16 | assets/icons/ic_fuel_16.png | icon | 16x16 |
| ic_shop_24 | assets/icons/ic_shop_24.png | icon | 24x24 |
| ic_cats_24 | assets/icons/ic_cats_24.png | icon | 24x24 |
| ic_settings_24 | assets/icons/ic_settings_24.png | icon | 24x24 |
| ic_close_24 | assets/icons/ic_close_24.png | icon | 24x24 |

### 1.7 FX（最小）
| id | file | type | size | notes |
|---|---|---|---:|---|
| fx_pop_0 | assets/fx/fx_pop_0.png | sprite | 16x16 | 収穫/コインの小キラ |
| fx_pop_1 | assets/fx/fx_pop_1.png | sprite | 16x16 | 2フレーム目 |

---

## 2. 余裕があれば（“ねこタウン感”を強める）
- 小物デコ（32x32）：柵、看板、袋、カート、花
- 背景タイル（32x32）：草、道、土、石畳
- 建物小物（64x64〜）：風車、倉庫（Farm画面の飾り用）
