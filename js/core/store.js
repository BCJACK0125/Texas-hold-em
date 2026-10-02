// 本機進度儲存（localStorage），讀寫都包 try/catch，無痕模式也能運作
const KEY = 'acepath.v1';

const DEFAULT = () => ({
  xp: 0,
  lessons: {},            // lessonId -> { done, score, ts }
  drills: {},             // drillName -> { correct, total, best }
  rangeMisses: {},        // 'BTN|K8o' -> 次數（錯題本）
  hands: [],              // 實戰手牌紀錄
  journal: [],            // 線下/線上場次紀錄
  daily: { date: '', tasks: {} },
  streak: { last: '', count: 0 },
  settings: { fourColor: true, sound: true },
  session: { net: 0, hands: 0 },
});

let mem = null;

export function load() {
  if (mem) return mem;
  try {
    const raw = localStorage.getItem(KEY);
    mem = raw ? { ...DEFAULT(), ...JSON.parse(raw) } : DEFAULT();
  } catch { mem = DEFAULT(); }
  return mem;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* 儲存失敗時仍可繼續使用 */ }
}

export function update(fn) {
  const s = load();
  fn(s);
  save();
  listeners.forEach(l => l(s));
  return s;
}

const listeners = new Set();
export const subscribe = fn => (listeners.add(fn), () => listeners.delete(fn));

export function resetAll() {
  mem = DEFAULT();
  save();
  listeners.forEach(l => l(mem));
}

export const today = () => new Date().toISOString().slice(0, 10);

// 等級系統
export const LEVELS = [
  { xp: 0, name: '新手', en: 'Rookie' },
  { xp: 150, name: '魚苗', en: 'Minnow' },
  { xp: 400, name: '常客', en: 'Regular' },
  { xp: 800, name: '正規軍', en: 'Grinder' },
  { xp: 1500, name: '鯊魚', en: 'Shark' },
  { xp: 2600, name: '高手', en: 'Pro' },
  { xp: 4200, name: '傳奇', en: 'Legend' },
];

export function levelInfo(xp) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
  const cur = LEVELS[i], next = LEVELS[i + 1];
  const pct = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { index: i, ...cur, next, pct };
}

export function addXP(n, reason) {
  let leveled = null;
  update(s => {
    const before = levelInfo(s.xp).index;
    s.xp += n;
    const after = levelInfo(s.xp);
    if (after.index > before) leveled = after;
    // 連續學習天數
    const t = today();
    if (s.streak.last !== t) {
      const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      s.streak.count = s.streak.last === y ? s.streak.count + 1 : 1;
      s.streak.last = t;
    }
  });
  window.dispatchEvent(new CustomEvent('xp', { detail: { n, reason, leveled } }));
}

export function recordDrill(name, correct) {
  update(s => {
    const d = (s.drills[name] ||= { correct: 0, total: 0, streak: 0, best: 0 });
    d.total++;
    if (correct) { d.correct++; d.streak++; d.best = Math.max(d.best, d.streak); }
    else d.streak = 0;
    const t = today();
    if (s.daily.date !== t) s.daily = { date: t, tasks: {} };
    s.daily.tasks[name] = (s.daily.tasks[name] || 0) + 1;
  });
}

export function dailyCount(name) {
  const s = load();
  return s.daily.date === today() ? s.daily.tasks[name] || 0 : 0;
}
