import { evalHand, newDeck } from './cards.js';
import { combosOf } from './ranges.js';

// 單挑：已知對手手牌，精確列舉剩餘公共牌
export function exactEquity(hero, vill, board) {
  const deck = newDeck([...hero, ...vill, ...board]);
  const need = 5 - board.length;
  let win = 0, tie = 0, total = 0;
  const run = b => {
    const h = evalHand([...hero, ...b]), v = evalHand([...vill, ...b]);
    if (h > v) win++; else if (h === v) tie++;
    total++;
  };
  if (need === 0) run(board);
  else if (need === 1) for (const c of deck) run([...board, c]);
  else if (need === 2) {
    for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) run([...board, deck[i], deck[j]]);
  } else {
    return monteCarlo(hero, [vill], board, 4000);
  }
  return { win: win / total, tie: tie / total, equity: (win + tie / 2) / total };
}

// 下一張牌就領先的「outs」：目前落後，下一張牌之後能領先的牌
export function computeOuts(hero, vill, board) {
  const deck = newDeck([...hero, ...vill, ...board]);
  const outs = [];
  for (const c of deck) {
    const b = [...board, c];
    if (evalHand([...hero, ...b]) > evalHand([...vill, ...b])) outs.push(c);
  }
  return outs;
}

// villains：每位對手為 {hand:[c1,c2]} 或 {range:[{combo:[c1,c2], w}]}
export function monteCarlo(hero, villains, board, iters = 1500) {
  const vs = villains.map(v => (Array.isArray(v) ? { hand: v } : v));
  const dead = new Set([...hero, ...board]);
  for (const v of vs) if (v.hand) v.hand.forEach(c => dead.add(c));
  // 預先計算範圍的累積權重
  for (const v of vs) {
    if (v.range) {
      v._list = v.range.filter(x => !dead.has(x.combo[0]) && !dead.has(x.combo[1]));
      let acc = 0; v._cum = v._list.map(x => (acc += x.w));
      v._tot = acc;
    }
  }
  let score = 0, n = 0;
  const used = new Uint8Array(52);
  for (let it = 0; it < iters; it++) {
    used.fill(0);
    dead.forEach(c => (used[c] = 1));
    const hands = [];
    let ok = true;
    for (const v of vs) {
      if (v.hand) { hands.push(v.hand); continue; }
      if (!v._tot) { ok = false; break; }
      let tries = 0, combo;
      do {
        const x = Math.random() * v._tot;
        let lo = 0, hi = v._cum.length - 1;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (v._cum[mid] < x) lo = mid + 1; else hi = mid; }
        combo = v._list[lo].combo;
      } while ((used[combo[0]] || used[combo[1]]) && ++tries < 20);
      if (used[combo[0]] || used[combo[1]]) { ok = false; break; }
      used[combo[0]] = used[combo[1]] = 1;
      hands.push(combo);
    }
    if (!ok) continue;
    const b = board.slice();
    while (b.length < 5) {
      const c = (Math.random() * 52) | 0;
      if (!used[c]) { used[c] = 1; b.push(c); }
    }
    const hs = evalHand([...hero, ...b]);
    let best = -1, ties = 0, heroBest = true;
    for (const h of hands) {
      const s = evalHand([...h, ...b]);
      if (s > hs) { heroBest = false; break; }
      if (s === hs) ties++;
    }
    if (heroBest) score += 1 / (ties + 1);
    n++;
  }
  return { equity: n ? score / n : 0, samples: n };
}

// 對隨機手牌的勝率（機器人使用）
export function equityVsRandom(hero, board, opponents = 1, iters = 200) {
  const vs = [];
  for (let i = 0; i < opponents; i++) vs.push({ range: RANDOM_RANGE });
  return monteCarlo(hero, vs, board, iters).equity;
}

const RANDOM_RANGE = [];
for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) RANDOM_RANGE.push({ combo: [a, b], w: 1 });

// 範圍標籤集合 → 加權組合
export function rangeToCombos(labels, weightFn) {
  const out = [];
  for (const l of labels) for (const combo of combosOf(l)) {
    const w = weightFn ? weightFn(combo, l) : 1;
    if (w > 0) out.push({ combo, w });
  }
  return out;
}

// 找出這個牌面上的堅果牌（最好的可能手牌）
export function nutsOnBoard(board) {
  const deck = newDeck(board);
  let best = -1, combos = [];
  for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) {
    const s = evalHand([deck[i], deck[j], ...board]);
    if (s > best) { best = s; combos = [[deck[i], deck[j]]]; }
    else if (s === best) combos.push([deck[i], deck[j]]);
  }
  return { score: best, combos };
}
