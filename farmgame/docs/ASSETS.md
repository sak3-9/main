# ASSETS LIST / v0.2 (MVP)
この一覧の **id** をコード側の参照名として使う。
ファイルは原則 PNG 透過。サイズは厳守。

---

## 0. ディレクトリ構造
- assets/
  - bg/
  - farm/
  - crops/
  - cats/
  - ui/
  - icons/
  - fx/

---

## 1. 必須（MVPで絶対に要る）
### 1.1 背景（bg）
| id | file | type | size | states | notes |
|---|---|---|---:|---|---|
| bg_farm | assets/bg/bg_farm.png | bg | 360x800 | - | ゆる日常。空+地面。繰り返し可でもOK |

### 1.2 畑タイル（farm）
| id | file | type | size | states | notes |
|---|---|---|---:|---|---|
| tile_empty | assets/farm/tile_empty.png | sprite | 32x32 | - | 空き土 |
| tile_growing | assets/farm/tile_growing.png | sprite | 32x32 | - | 育成中の土（芽はcrop側に出してもOK） |
| tile_ready | assets/farm/tile_ready.png | sprite | 32x32 | - | 収穫可の目印（控えめキラ） |

### 1.3 作物（crops）※32x32
| id | file | type | size | states | notes |
|---|---|---|---:|---|---|
| crop_carrot | assets/crops/carrot.png | sprite | 32x32 | - | にんじん |
| crop_strawberry | assets/crops/strawberry.png | sprite | 32x32 | - | いちご |
| crop_potato | assets/crops/potato.png | sprite | 32x32 | - | じゃがいも |
| crop_tomato | assets/crops/tomato.png | sprite | 32x32 | - | トマト |
| crop_pumpkin | assets/crops/pumpkin.png | sprite | 32x32 | - | かぼちゃ |
| crop_grape | assets/crops/grape.png | sprite | 32x32 | - | ぶどう |

（任意：成長段階を見せたい場合）
- `assets/crops/<name>_sprout.png`（芽）
- `assets/crops/<name>_mid.png`（中間）
※MVPは無しでも良い。最初は ready のみで成立。

### 1.4 猫（cats）
| id | file | type | size | states | notes |
|---|---|---|---:|---|---|
| cat_harvester_idle_0 | assets/cats/cat_harvester_idle_0.png | sprite | 48x48 | idle0 | 収穫猫（通常） |
| cat_harvester_idle_1 | assets/cats/cat_harvester_idle_1.png | sprite | 48x48 | idle1 | 収穫猫（呼吸2フレーム目） |
| cat_seller_idle_0 | assets/cats/cat_seller_idle_0.png | sprite | 48x48 | idle0 | 販売猫 |
| cat_seller_idle_1 | assets/cats/cat_seller_idle_1.png | sprite | 48x48 | idle1 | 販売猫（呼吸2フレーム目） |

（任意：燃料切れ表現）
- `cat_harvester_tired.png`
- `cat_seller_tired.png`

### 1.5 UI（ui）※9-slice推奨
| id | file | type | size | states | notes |
|---|---|---|---:|---|---|
| panel_9 | assets/ui/panel_9.png | 9slice | 64x64 | - | 汎用パネル（slice=8推奨） |
| btn_primary_normal | assets/ui/btn_primary_normal.png | 9slice | 64x32 | normal | slice=8 |
| btn_primary_pressed | assets/ui/btn_primary_pressed.png | 9slice | 64x32 | pressed | 押下で少し暗い/沈む |
| btn_primary_disabled | assets/ui/btn_primary_disabled.png | 9slice | 64x32 | disabled | 彩度低め |
| tab_on | assets/ui/tab_on.png | 9slice | 64x28 | on | |
| tab_off | assets/ui/tab_off.png | 9slice | 64x28 | off | |

### 1.6 アイコン（icons）
| id | file | type | size | states | notes |
|---|---|---|---:|---|---|
| ic_coin_16 | assets/icons/ic_coin_16.png | icon | 16x16 | - | コイン |
| ic_fuel_16 | assets/icons/ic_fuel_16.png | icon | 16x16 | - | カリカリ |
| ic_shop_24 | assets/icons/ic_shop_24.png | icon | 24x24 | - | Shop |
| ic_cats_24 | assets/icons/ic_cats_24.png | icon | 24x24 | - | Cats |
| ic_settings_24 | assets/icons/ic_settings_24.png | icon | 24x24 | - | Settings |
| ic_close_24 | assets/icons/ic_close_24.png | icon | 24x24 | - | 閉じる |

### 1.7 FX（fx）最小
| id | file | type | size | states | notes |
|---|---|---|---:|---|---|
| fx_pop_0 | assets/fx/fx_pop_0.png | sprite | 16x16 | frame0 | 収穫/コインの小演出 |
| fx_pop_1 | assets/fx/fx_pop_1.png | sprite | 16x16 | frame1 | 2フレーム目 |

---

## 2. 余裕があれば（MVP後）
- 作物の成長段階スプライト（sprout/mid）
- 畑デコ（花、柵、看板）
- 画面遷移エフェクト（フェード用の簡易粒子）
- サウンド（BGM/SE）：
  - assets/audio/bgm_main.ogg
  - assets/audio/se_click.ogg
  - assets/audio/se_harvest.ogg
