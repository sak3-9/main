import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';


type TileState = 'empty' | 'growing' | 'ready';
type CatRole = 'harvester' | 'seller';
type GrowthStage = 'sprout' | 'mid' | 'ready';
type TabKey = 'farm' | 'shop' | 'cats' | 'settings';

interface CropDef { id: string; name: string; growMs: number; seedCost: number; sellPrice: number; unlockByGridExpansions: number; }
interface Tile { state: TileState; cropId?: string; plantedAt?: number; readyAt?: number; }
interface CatState { role: CatRole; level: number; enabled: boolean; }
interface SaveDataV1 {
  version: 1; coins: number; fuel: number; lastSeen: number;
  gridRows: number; gridCols: number; grid: Tile[]; warehouse: Record<string, number>;
  cats: { harvester: CatState; seller: CatState };
  unlocks: { gridExpansions: number };
  settings: { guideEnabled: boolean; bgmEnabled: boolean; seEnabled: boolean };
  ui: { selectedCropId: string; tab: TabKey; hMs: number; sMs: number };
}

const SAVE_KEY = 'mofuneko-farm-save-v2-pixi';
const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
const HARVEST_INTERVAL = [10, 9, 8, 7, 6];
const SELL_CAP = [10, 12, 14, 16, 18];
const CAT_COST = [300, 900, 1800, 3200];
const GRID_COST = [200, 450, 900, 1600, 2600, 4000];
const FUEL_PACKS = [{ n: 'Small', f: 50, c: 100 }, { n: 'Medium', f: 200, c: 360 }, { n: 'Large', f: 500, c: 800 }];
const CROPS: CropDef[] = [
  { id: 'carrot', name: 'にんじん', growMs: 8000, seedCost: 2, sellPrice: 6, unlockByGridExpansions: 0 },
  { id: 'strawberry', name: 'いちご', growMs: 15000, seedCost: 6, sellPrice: 18, unlockByGridExpansions: 0 },
  { id: 'potato', name: 'じゃがいも', growMs: 30000, seedCost: 14, sellPrice: 40, unlockByGridExpansions: 1 },
  { id: 'tomato', name: 'トマト', growMs: 60000, seedCost: 32, sellPrice: 90, unlockByGridExpansions: 2 },
  { id: 'pumpkin', name: 'かぼちゃ', growMs: 120000, seedCost: 78, sellPrice: 210, unlockByGridExpansions: 3 },
  { id: 'grape', name: 'ぶどう', growMs: 240000, seedCost: 200, sellPrice: 520, unlockByGridExpansions: 4 },
];

const appEl = document.querySelector<HTMLDivElement>('#canvasWrap')!;
const tabsEl = document.querySelector<HTMLDivElement>('#tabs')!;
const statsEl = document.querySelector<HTMLDivElement>('#stats')!;
const panelEl = document.querySelector<HTMLDivElement>('#panel')!;

let state = load();
let offlineSummary = { elapsed: 0, h: 0, gain: 0, fuelSpent: 0 };
const app = new Application();
const farmLayer = new Container();

function defaultTile(): Tile { return { state: 'empty' }; }
function defaultState(): SaveDataV1 {
  return {
    version: 1, coins: 300, fuel: 60, lastSeen: Date.now(), gridRows: 3, gridCols: 4,
    grid: Array.from({ length: 12 }, defaultTile), warehouse: {},
    cats: { harvester: { role: 'harvester', level: 1, enabled: true }, seller: { role: 'seller', level: 1, enabled: true } },
    unlocks: { gridExpansions: 0 }, settings: { guideEnabled: true, bgmEnabled: false, seEnabled: true },
    ui: { selectedCropId: 'carrot', tab: 'farm', hMs: 0, sMs: 0 }
  };
}
function splitGrowthMs(T: number) {
  const total = Math.max(0, Math.floor(T)); const base = Math.floor(total / 3); const rem = total - base * 3;
  return { sproutMs: Math.max(0, base - rem), midMs: base, readyMs: base + rem };
}
function getGrowthStage(elapsedMs: number, T: number): GrowthStage {
  const total = Math.max(0, Math.floor(T)); if (total <= 0) return 'ready';
  const e = Math.max(0, Math.min(Math.floor(elapsedMs), total));
  const { sproutMs, midMs } = splitGrowthMs(total);
  if (e < sproutMs) return 'sprout'; if (e < sproutMs + midMs) return 'mid'; return 'ready';
}
function clamp(s: SaveDataV1): SaveDataV1 {
  s.coins = Math.max(0, Math.floor(s.coins || 0)); s.fuel = Math.max(0, Math.min(9999, Math.floor(s.fuel || 0)));
  s.gridRows = Math.max(3, Math.min(5, Math.floor(s.gridRows || 3))); s.gridCols = Math.max(4, Math.min(6, Math.floor(s.gridCols || 4)));
  const len = s.gridRows * s.gridCols; s.grid = (Array.isArray(s.grid) ? s.grid : []).slice(0, len); while (s.grid.length < len) s.grid.push(defaultTile());
  s.ui = Object.assign({ selectedCropId: 'carrot', tab: 'farm', hMs: 0, sMs: 0 }, s.ui || {});
  return s;
}
function load(): SaveDataV1 { try { const x = localStorage.getItem(SAVE_KEY); return x ? clamp(JSON.parse(x)) : defaultState(); } catch { return defaultState(); } }
function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }

function crop(id?: string) { return CROPS.find((c) => c.id === id); }
function unlocked() { return CROPS.filter((c) => c.unlockByGridExpansions <= state.unlocks.gridExpansions); }
function updateReady(now: number) { state.grid.forEach((t) => { if (t.state === 'growing' && (t.readyAt || 0) <= now) t.state = 'ready'; }); }
function plant(i: number) {
  const t = state.grid[i]; const c = crop(state.ui.selectedCropId);
  if (!t || !c || t.state !== 'empty' || state.coins < c.seedCost) return;
  const now = Date.now(); state.coins -= c.seedCost; state.grid[i] = { state: 'growing', cropId: c.id, plantedAt: now, readyAt: now + c.growMs };
}
function plantAll() { for (let i = 0; i < state.grid.length; i++) plant(i); }
function harvest(max: number) {
  if (!state.cats.harvester.enabled || state.fuel <= 0) return 0;
  const targets = state.grid.map((t, i) => ({ t, i })).filter((x) => x.t.state === 'ready').sort((a, b) => (a.t.readyAt || 0) - (b.t.readyAt || 0));
  const n = Math.min(max, targets.length, state.fuel);
  for (let i = 0; i < n; i++) { const c = targets[i].t.cropId!; state.warehouse[c] = (state.warehouse[c] || 0) + 1; state.grid[targets[i].i] = defaultTile(); }
  state.fuel -= n; return n;
}
function sellAction() {
  if (!state.cats.seller.enabled || state.fuel <= 0) return 0;
  const cap = SELL_CAP[state.cats.seller.level - 1]; const minFuel = Math.ceil(cap / 10); if (state.fuel < minFuel) return 0;
  const list = Object.entries(state.warehouse).filter(([, v]) => v > 0).sort((a, b) => (crop(b[0])?.sellPrice || 0) - (crop(a[0])?.sellPrice || 0));
  if (!list.length) return 0;
  let remain = cap; let sold = 0; let gain = 0;
  for (const [id, qty] of list) { if (!remain) break; const take = Math.min(remain, qty); state.warehouse[id] -= take; remain -= take; sold += take; gain += take * (crop(id)?.sellPrice || 0); }
  if (!sold) return 0; state.fuel -= Math.ceil(sold / 10); state.coins += gain; return gain;
}

function applyOffline() {
  const now = Date.now(); let elapsed = Math.max(0, now - state.lastSeen); elapsed = Math.min(elapsed, MAX_OFFLINE_MS);
  const steps = Math.floor(elapsed / 60000); let h = 0; let gain = 0; let fuelSpent = 0;
  for (let i = 1; i <= steps; i++) {
    const t = state.lastSeen + i * 60000; updateReady(t);
    const limit = Math.ceil(60 / HARVEST_INTERVAL[state.cats.harvester.level - 1]); const hh = harvest(limit); h += hh; fuelSpent += hh;
    for (let k = 0; k < 6; k++) { const before = state.fuel; const g = sellAction(); gain += g; fuelSpent += before - state.fuel; if (!g) break; }
  }
  updateReady(now); state.lastSeen = now; save();
  return { elapsed, h, gain, fuelSpent };
}

function renderFarm() {
  farmLayer.removeChildren();
  const cell = 64; const pad = 8;
  for (let i = 0; i < state.grid.length; i++) {
    const row = Math.floor(i / state.gridCols), col = i % state.gridCols;
    const x = pad + col * (cell + pad), y = pad + row * (cell + pad);
    const t = state.grid[i];
    const g = new Graphics().roundRect(x, y, cell, cell, 10).fill(t.state === 'ready' ? 0xB6E7F2 : t.state === 'growing' ? 0xF3F7CF : 0xF2D6B3).stroke({ color: 0x000000, alpha: .15, width: 1 });
    g.eventMode = 'static'; g.on('pointertap', () => { if (state.ui.tab !== 'farm') return; if (state.grid[i].state === 'ready') harvest(1); else plant(i); renderAll(); });
    farmLayer.addChild(g);
    if (t.state !== 'empty') {
      const c = crop(t.cropId); const elapsed = Date.now() - (t.plantedAt || Date.now()); const stage = c ? getGrowthStage(elapsed, c.growMs) : 'ready';
      const color = stage === 'sprout' ? 0x77A1D9 : stage === 'mid' ? 0xF2AEC1 : 0x7ACB7A;
      farmLayer.addChild(new Graphics().circle(x + 32, y + 30, 12).fill(color));
      farmLayer.addChild(new Text({ text: stage === 'ready' ? 'ready' : stage, style: new TextStyle({ fontFamily: 'Noto Sans JP', fontSize: 10, fill: 0x2B2B2B }) , x: x + 16, y: y + 44 }));
    }
  }
}

function renderTabs() {
  tabsEl.innerHTML = '';
  (['farm', 'shop', 'cats', 'settings'] as TabKey[]).forEach((t) => {
    const b = document.createElement('button'); b.textContent = t.toUpperCase(); if (state.ui.tab === t) b.classList.add('active');
    b.onclick = () => { state.ui.tab = t; renderAll(); }; tabsEl.appendChild(b);
  });
}
function renderPanel() {
  const tab = state.ui.tab;
  if (tab === 'farm') {
    panelEl.innerHTML = `<div class="row" id="crops"></div><div class="row"><button id="plantAll" class="primary">まとめ植え</button></div><div class="muted">空いているマスにまとめて植えられるよ</div><div class="muted">収穫猫: ${state.fuel>0?'稼働':'停止'} / 販売猫: ${state.fuel>0?'稼働':'停止'}</div>`;
    const wrap = panelEl.querySelector('#crops')!;
    unlocked().forEach((c) => { const b = document.createElement('button'); b.textContent = `${c.name} ${Math.round(c.growMs/1000)}s`; if (state.ui.selectedCropId===c.id) b.classList.add('active'); b.onclick = ()=>{state.ui.selectedCropId=c.id; renderAll();}; wrap.appendChild(b); });
    panelEl.querySelector<HTMLButtonElement>('#plantAll')!.onclick = () => { plantAll(); renderAll(); };
  }
  if (tab === 'shop') {
    panelEl.innerHTML = `<div class="row"><button id="expand">畑拡張 (${GRID_COST[state.unlocks.gridExpansions] ?? 'MAX'})</button></div><div class="row" id="fuelPack"></div><div class="row"><button id="upH">収穫猫Lv${state.cats.harvester.level}</button><button id="upS">販売猫Lv${state.cats.seller.level}</button></div>`;
    const fuel = panelEl.querySelector('#fuelPack')!;
    FUEL_PACKS.forEach((p) => { const b = document.createElement('button'); b.textContent = `${p.n} ${p.f}燃料/${p.c}🪙`; b.onclick = ()=>{ if (state.coins>=p.c){state.coins-=p.c; state.fuel=Math.min(9999,state.fuel+p.f); renderAll();}}; fuel.appendChild(b); });
    panelEl.querySelector<HTMLButtonElement>('#expand')!.onclick = () => { const cost = GRID_COST[state.unlocks.gridExpansions]; if (!cost || state.coins < cost) return; if (state.gridCols < 6) state.gridCols++; else if (state.gridRows < 5) state.gridRows++; else return; state.coins -= cost; state.unlocks.gridExpansions++; while (state.grid.length < state.gridRows * state.gridCols) state.grid.push(defaultTile()); renderAll(); };
    panelEl.querySelector<HTMLButtonElement>('#upH')!.onclick = () => { const lv = state.cats.harvester.level; const cost = CAT_COST[lv - 1]; if (cost && state.coins >= cost && lv < 5) { state.coins -= cost; state.cats.harvester.level++; renderAll(); } };
    panelEl.querySelector<HTMLButtonElement>('#upS')!.onclick = () => { const lv = state.cats.seller.level; const cost = CAT_COST[lv - 1]; if (cost && state.coins >= cost && lv < 5) { state.coins -= cost; state.cats.seller.level++; renderAll(); } };
  }
  if (tab === 'cats') {
    panelEl.innerHTML = `<div class="row"><button id="tH">収穫猫 ${state.cats.harvester.enabled?'ON':'OFF'}</button><button id="tS">販売猫 ${state.cats.seller.enabled?'ON':'OFF'}</button></div><div class="muted">燃料0で停止します。</div>`;
    panelEl.querySelector<HTMLButtonElement>('#tH')!.onclick = () => { state.cats.harvester.enabled = !state.cats.harvester.enabled; renderAll(); };
    panelEl.querySelector<HTMLButtonElement>('#tS')!.onclick = () => { state.cats.seller.enabled = !state.cats.seller.enabled; renderAll(); };
  }
  if (tab === 'settings') {
    panelEl.innerHTML = `<div class="row"><button id="guide">ガイド ${state.settings.guideEnabled?'ON':'OFF'}</button><button id="bgm">BGM ${state.settings.bgmEnabled?'ON':'OFF'}</button><button id="se">SE ${state.settings.seEnabled?'ON':'OFF'}</button></div><div class="row"><button id="exp">Export</button><input id="imp" type="file" accept="application/json" /></div><div class="row"><button id="reset">リセット</button></div><div class="muted" id="msg"></div>`;
    panelEl.querySelector<HTMLButtonElement>('#guide')!.onclick = () => { state.settings.guideEnabled = !state.settings.guideEnabled; renderAll(); };
    panelEl.querySelector<HTMLButtonElement>('#bgm')!.onclick = () => { state.settings.bgmEnabled = !state.settings.bgmEnabled; renderAll(); };
    panelEl.querySelector<HTMLButtonElement>('#se')!.onclick = () => { state.settings.seEnabled = !state.settings.seEnabled; renderAll(); };
    panelEl.querySelector<HTMLButtonElement>('#exp')!.onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })); a.download = 'mofuneko-farm-save.json'; a.click(); URL.revokeObjectURL(a.href); };
    panelEl.querySelector<HTMLInputElement>('#imp')!.onchange = async (e) => {
      const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
      try { const data = clamp(JSON.parse(await f.text())); const req = ['coins','fuel','lastSeen','gridRows','gridCols','grid','warehouse','cats','unlocks','settings','version']; if (!req.every((k)=>k in data)) throw new Error('bad'); state = data; renderAll(); }
      catch { (panelEl.querySelector('#msg') as HTMLDivElement).textContent = '不正なJSONです'; }
    };
    panelEl.querySelector<HTMLButtonElement>('#reset')!.onclick = () => { if (confirm('セーブをリセットしますか？')) { state = defaultState(); renderAll(); } };
  }
}
function renderStats() { statsEl.textContent = `🪙 ${state.coins} / 🐾 ${state.fuel}`; }
function renderAll() { renderTabs(); renderStats(); renderPanel(); renderFarm(); save(); }

let last = performance.now();
app.ticker.add(() => {
  const now = performance.now(); const delta = now - last; last = now;
  updateReady(Date.now());
  state.ui.hMs += delta; state.ui.sMs += delta;
  const hi = HARVEST_INTERVAL[state.cats.harvester.level - 1] * 1000;
  while (state.ui.hMs >= hi) { state.ui.hMs -= hi; if (!harvest(1)) break; }
  while (state.ui.sMs >= 10000) { state.ui.sMs -= 10000; if (!sellAction()) break; }
  renderAll();
});

function showOfflineModal() {
  if (offlineSummary.elapsed < 60000) return;
  const min = Math.floor(offlineSummary.elapsed / 60000); const h = Math.floor(min / 60); const m = min % 60;
  const modal = document.querySelector('#offlineModal') as HTMLDivElement;
  const text = document.querySelector('#offlineText') as HTMLParagraphElement;
  text.innerHTML = `オフライン：${h}時間${m}分<br>収穫：+${offlineSummary.h}個<br>販売：+${offlineSummary.gain}コイン<br>燃料消費：-${offlineSummary.fuelSpent}`;
  modal.classList.add('show');
  (document.querySelector('#offlineOk') as HTMLButtonElement).onclick = () => modal.classList.remove('show');
}

async function bootstrap() {
  await app.init({ width: 440, height: 420, antialias: false, background: '#F7EEF2', roundPixels: true, resolution: Math.max(1, Math.floor(window.devicePixelRatio)) });
  appEl.appendChild(app.canvas);
  app.stage.addChild(farmLayer);
  offlineSummary = applyOffline();
  window.addEventListener('beforeunload', () => { state.lastSeen = Date.now(); save(); });
  renderAll();
  showOfflineModal();
}

bootstrap();
