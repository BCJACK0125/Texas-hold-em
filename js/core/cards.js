// 牌的表示：整數 0..51，rank = c >> 2 (0=2 ... 12=A)，suit = c & 3 (0=♠ 1=♥ 2=♦ 3=♣)
export const RANKS = '23456789TJQKA';
export const SUITS = 'shdc';
export const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣'];
export const SUIT_NAMES = ['黑桃', '紅心', '方塊', '梅花'];
export const RANK_NAMES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const CATEGORY_NAMES = ['高牌', '一對', '兩對', '三條', '順子', '同花', '葫蘆', '四條', '同花順'];
export const CATEGORY_EN = ['High Card', 'One Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'];

export const rankOf = c => c >> 2;
export const suitOf = c => c & 3;
export const makeCard = (r, s) => (r << 2) | s;

export function parseCard(str) {
  const r = RANKS.indexOf(str[0].toUpperCase());
  const s = SUITS.indexOf(str[1].toLowerCase());
  if (r < 0 || s < 0) throw new Error('bad card ' + str);
  return makeCard(r, s);
}
export const parseCards = str => str.trim().split(/\s+/).filter(Boolean).map(parseCard);
export const cardStr = c => RANKS[c >> 2] + SUITS[c & 3];

export function newDeck(exclude = []) {
  const ex = new Set(exclude);
  const d = [];
  for (let c = 0; c < 52; c++) if (!ex.has(c)) d.push(c);
  return d;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function straightHigh(mask) {
  // 把 A 複製到最低位，處理 A-2-3-4-5 輪子順
  const m = (mask << 1) | ((mask >> 12) & 1);
  for (let hi = 13; hi >= 4; hi--) {
    if (((m >> (hi - 4)) & 31) === 31) return hi - 1;
  }
  return -1;
}

function topBits(mask, n) {
  let out = 0, k = 0;
  for (let r = 12; r >= 0 && k < n; r--) {
    if (mask & (1 << r)) { out |= r << (16 - 4 * k); k++; }
  }
  return out;
}

// 回傳可比較的分數：分數越大牌越大。category = score >> 20
export function evalHand(cs) {
  const rc = new Uint8Array(13);
  const sc = [0, 0, 0, 0], sm = [0, 0, 0, 0];
  let mask = 0;
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i], r = c >> 2, s = c & 3;
    rc[r]++; sc[s]++; sm[s] |= 1 << r; mask |= 1 << r;
  }
  // 7 張牌內有同花時不可能同時有四條或葫蘆，可直接判定
  for (let s = 0; s < 4; s++) {
    if (sc[s] >= 5) {
      const sf = straightHigh(sm[s]);
      if (sf >= 0) return (8 << 20) | (sf << 16);
      return (5 << 20) | topBits(sm[s], 5);
    }
  }
  let quad = -1, trips = [], pairs = [];
  for (let r = 12; r >= 0; r--) {
    if (rc[r] === 4) quad = r;
    else if (rc[r] === 3) trips.push(r);
    else if (rc[r] === 2) pairs.push(r);
  }
  if (quad >= 0) {
    return (7 << 20) | (quad << 16) | (topBits(mask & ~(1 << quad), 1) >> 4);
  }
  if (trips.length && (trips.length > 1 || pairs.length)) {
    const t = trips[0];
    const p = Math.max(trips[1] ?? -1, pairs[0] ?? -1);
    return (6 << 20) | (t << 16) | (p << 12);
  }
  const st = straightHigh(mask);
  if (st >= 0) return (4 << 20) | (st << 16);
  if (trips.length) {
    const t = trips[0];
    return (3 << 20) | (t << 16) | (topBits(mask & ~(1 << t), 2) >> 4);
  }
  if (pairs.length >= 2) {
    const [p1, p2] = pairs;
    return (2 << 20) | (p1 << 16) | (p2 << 12) | (topBits(mask & ~(1 << p1) & ~(1 << p2), 1) >> 8);
  }
  if (pairs.length === 1) {
    const p = pairs[0];
    return (1 << 20) | (p << 16) | (topBits(mask & ~(1 << p), 3) >> 4);
  }
  return topBits(mask, 5);
}

export const categoryOf = score => score >> 20;

export function describeScore(score) {
  const cat = score >> 20;
  const r1 = (score >> 16) & 15, r2 = (score >> 12) & 15;
  const n = r => RANK_NAMES[r];
  switch (cat) {
    case 8: return r1 === 12 ? '皇家同花順' : `同花順（${n(r1)} 高）`;
    case 7: return `四條 ${n(r1)}`;
    case 6: return `葫蘆（${n(r1)} 帶 ${n(r2)}）`;
    case 5: return `同花（${n(r1)} 高）`;
    case 4: return `順子（${n(r1)} 高）`;
    case 3: return `三條 ${n(r1)}`;
    case 2: return `兩對（${n(r1)} 和 ${n(r2)}）`;
    case 1: return `一對 ${n(r1)}`;
    default: return `高牌 ${n(r1)}`;
  }
}

// 牌型標籤（翻牌後用）：用於教練判斷「成牌 / 聽牌 / 空氣」
export function drawInfo(hole, board) {
  const all = [...hole, ...board];
  const sc = [0, 0, 0, 0];
  let mask = 0, holeMaskBySuit = [0, 0, 0, 0];
  for (const c of all) { sc[c & 3]++; mask |= 1 << (c >> 2); }
  for (const c of hole) holeMaskBySuit[c & 3]++;
  let flushDraw = false;
  for (let s = 0; s < 4; s++) if (sc[s] === 4 && holeMaskBySuit[s] > 0) flushDraw = true;
  // 順子聽牌：計算能完成順子的點數有幾個
  const m = (mask << 1) | ((mask >> 12) & 1);
  let completing = 0;
  for (let r = 0; r < 13; r++) {
    if (mask & (1 << r)) continue;
    const mm = m | (1 << (r + 1)) | (r === 12 ? 1 : 0);
    for (let hi = 13; hi >= 4; hi--) {
      if (((mm >> (hi - 4)) & 31) === 31) { completing++; break; }
    }
  }
  const score = evalHand(all);
  const madeStraight = categoryOf(score) >= 4;
  return {
    flushDraw: board.length < 5 && flushDraw && categoryOf(score) < 5,
    oesd: board.length < 5 && !madeStraight && completing >= 2,
    gutshot: board.length < 5 && !madeStraight && completing === 1,
    score,
  };
}

export function cardHTML(c, opts = {}) {
  if (c == null || c < 0) return `<div class="card back ${opts.cls || ''}"><div class="card-back-face"></div></div>`;
  const r = c >> 2, s = c & 3;
  const label = r === 8 ? '10' : RANKS[r];
  return `<div class="card suit-${s} ${opts.cls || ''}" data-card="${c}">
    <span class="card-rank">${label}</span><span class="card-suit">${SUIT_SYMBOLS[s]}</span>
    <span class="card-pip">${SUIT_SYMBOLS[s]}</span></div>`;
}

export const cardsHTML = (cs, opts) => cs.map(c => cardHTML(c, opts)).join('');

// 文字形式，例如 A♠
export const cardText = c => `${c >> 2 === 8 ? '10' : RANKS[c >> 2]}${SUIT_SYMBOLS[c & 3]}`;
export const cardSpan = c => `<span class="ct suit-${c & 3}">${cardText(c)}</span>`;
