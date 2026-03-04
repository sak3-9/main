# ASSETS LIST / v0.3 (MVP)
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
| tile_growing | assets/farm/tile_growing.png | sprite | 32x32 | - | 育成中の土（控えめ） |
| tile_ready | assets/farm/tile_ready.png | sprite | 32x32 | - | 収穫可の目印（控えめキラ） |

### 1.3 作物（crops）※32x32 / 3段階必須
- 3段階：`sprout → mid → ready`
- ファイル名規約：`<name>_sprout.png` / `<name>_mid.png` / `<name>.png`（ready）

| id | file | type | size | states | notes |
|---|---|---|---:|---|---|
| crop_carrot_sprout | assets/crops/carrot_sprout.png | sprite | 32x32 | sprout | にんじん（芽） |
| crop_carrot_mid | assets/crops/carrot_mid.png | sprite | 32x32 | mid | にんじん（中間） |
| crop_carrot | assets/crops/carrot.png | sprite | 32x32 | ready | にんじん（収穫） |
| crop_strawberry_sprout | assets/crops/strawberry_sprout.png | sprite | 32x32 | sprout | いちご（芽） |
| crop_strawberry_mid | assets/crops/strawberry_mid.png | sprite | 32x32 | mid | いちご（中間） |
| crop_strawberry | assets/crops/strawberry.png | sprite | 32x32 | ready | いちご（収穫） |
| crop_potato_sprout | assets/crops/potato_sprout.png | sprite | 32x32 | sprout | じゃがいも（芽） |
| crop_potato_mid | assets/crops/potato_mid.png | sprite | 32x32 | mid | じゃがいも（中間） |
| crop_potato | assets/crops/potato.png | sprite | 32x32 | ready | じゃがいも（収穫） |
| crop_tomato_sprout | assets/crops/tomato_sprout.png | sprite | 32x32 | sprout | トマト（芽） |
| crop_tomato_mid | assets/crops/tomato_mid.png | sprite | 32x32 | mid | トマト（中間） |
| crop_tomato | assets/crops/tomato.png | sprite | 32x32 | ready | トマト（収穫） |
| crop_pumpkin_sprout | assets/crops/pumpkin_sprout.png | sprite | 32x32 | sprout | かぼちゃ（芽） |
| crop_pumpkin_mid | assets/crops/pumpkin_mid.png | sprite | 32x32 | mid | かぼちゃ（中間） |
| crop_pumpkin | assets/crops/pumpkin.png | sprite | 32x32 | ready | かぼちゃ（収穫） |
| crop_grape_sprout | assets/crops/grape_sprout.png | sprite | 32x32 | sprout | ぶどう（芽） |
| crop_grape_mid | assets/crops/grape_mid.png | sprite | 32x32 | mid | ぶどう（中間） |
| crop_grape | assets/crops/grape.png | sprite | 32x32 | ready | ぶどう（収穫） |

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
- 畑デコ（花、柵、看板）
- 画面遷移エフェクト（フェード用の簡易粒子）
- サウンド（BGM/SE）：
  - assets/audio/bgm_main.ogg
  - assets/audio/se_click.ogg
  - assets/audio/se_harvest.ogg
