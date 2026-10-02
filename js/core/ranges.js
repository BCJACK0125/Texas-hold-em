import { RANKS, makeCard } from './cards.js';

// 13x13 網格的順序（由大到小）
export const GRID_RANKS = 'AKQJT98765432';
const ri = ch => RANKS.indexOf(ch); // 0=2 ... 12=A

export function gridLabel(row, col) {
  const a = GRID_RANKS[row], b = GRID_RANKS[col];
  if (row === col) return a + b;
  return row < col ? a + b + 's' : b + a + 'o';
}

export const ALL_HANDS = [];
for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) ALL_HANDS.push(gridLabel(r, c));

export function comboCount(label) {
  if (label.length === 2) return 6;
  return label[2] === 's' ? 4 : 12;
}

// 某手牌標籤 → 所有具體組合
export function combosOf(label) {
  const a = ri(label[0]), b = ri(label[1]);
  const out = [];
  if (label.length === 2) {
    for (let s1 = 0; s1 < 4; s1++) for (let s2 = s1 + 1; s2 < 4; s2++) out.push([makeCard(a, s1), makeCard(b, s2)]);
  } else if (label[2] === 's') {
    for (let s = 0; s < 4; s++) out.push([makeCard(a, s), makeCard(b, s)]);
  } else {
    for (let s1 = 0; s1 < 4; s1++) for (let s2 = 0; s2 < 4; s2++) if (s1 !== s2) out.push([makeCard(a, s1), makeCard(b, s2)]);
  }
  return out;
}

// 具體兩張牌 → 標籤（例如 AKs）
export function labelOf(c1, c2) {
  let r1 = c1 >> 2, r2 = c2 >> 2;
  if (r1 < r2) [r1, r2] = [r2, r1];
  if (r1 === r2) return RANKS[r1] + RANKS[r2];
  return RANKS[r1] + RANKS[r2] + ((c1 & 3) === (c2 & 3) ? 's' : 'o');
}

// 解析範圍語法：'22+, A2s+, KTs+, AJo+, 76s-54s, KQo'
export function expandRange(str) {
  const set = new Set();
  for (let tok of str.split(',').map(t => t.trim()).filter(Boolean)) {
    const plus = tok.endsWith('+');
    if (plus) tok = tok.slice(0, -1);
    if (tok.includes('-')) {
      const [x, y] = tok.split('-');
      if (x.length === 2 && x[0] === x[1]) {
        const lo = Math.min(ri(x[0]), ri(y[0])), hi = Math.max(ri(x[0]), ri(y[0]));
        for (let r = lo; r <= hi; r++) set.add(RANKS[r] + RANKS[r]);
      } else if (x[0] === y[0]) {
        const t = x[2];
        const lo = Math.min(ri(x[1]), ri(y[1])), hi = Math.max(ri(x[1]), ri(y[1]));
        for (let r = lo; r <= hi; r++) set.add(x[0] + RANKS[r] + t);
      } else {
        // 連張區間：例如 76s-54s
        const t = x[2];
        const gap = ri(x[0]) - ri(x[1]);
        const lo = Math.min(ri(x[0]), ri(y[0])), hi = Math.max(ri(x[0]), ri(y[0]));
        for (let r = lo; r <= hi; r++) set.add(RANKS[r] + RANKS[r - gap] + t);
      }
      continue;
    }
    if (tok.length === 2) {
      if (plus) for (let r = ri(tok[0]); r <= 12; r++) set.add(RANKS[r] + RANKS[r]);
      else set.add(tok);
      continue;
    }
    if (plus) {
      const hi = ri(tok[0]);
      for (let r = ri(tok[1]); r < hi; r++) set.add(tok[0] + RANKS[r] + tok[2]);
    } else set.add(tok);
  }
  return set;
}

export function rangePercent(set) {
  let n = 0;
  for (const h of set) n += comboCount(h);
  return (n / 1326) * 100;
}

// Chen 公式：給起手牌一個大致的強度分數，用來排序 169 種手牌
export function chenScore(label) {
  const a = ri(label[0]), b = ri(label[1]);
  const val = r => (r === 12 ? 10 : r === 11 ? 8 : r === 10 ? 7 : r === 9 ? 6 : (r + 2) / 2);
  let s = val(a);
  if (label.length === 2) return Math.max(5, s * 2) + (a >= 10 ? 0.5 : 0);
  if (label[2] === 's') s += 2;
  const gap = a - b - 1;
  s -= gap === 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5;
  if (gap <= 1 && a < 10) s += 1;
  // 微調：同分時大牌優先
  return s + a * 0.01 + b * 0.005;
}

export const RANKED_HANDS = [...ALL_HANDS].sort((x, y) => chenScore(y) - chenScore(x));
const PCT_INDEX = {};
{
  let acc = 0;
  for (const h of RANKED_HANDS) { PCT_INDEX[h] = (acc + comboCount(h) / 2) / 1326; acc += comboCount(h); }
}
// 手牌在所有組合中的百分位（0 = 最強）
export const handPercentile = label => PCT_INDEX[label];

export function topRange(pct) {
  const set = new Set();
  let acc = 0;
  for (const h of RANKED_HANDS) {
    if (acc / 1326 >= pct) break;
    set.add(h); acc += comboCount(h);
  }
  return set;
}

// ===== 6-max 100bb 現金桌教學用簡化範圍表 =====
export const POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
export const POS_NAMES = {
  UTG: '槍口位 UTG', HJ: '劫持位 HJ', CO: '關煞位 CO', BTN: '按鈕位 BTN', SB: '小盲 SB', BB: '大盲 BB',
};
export const POS_DESC = {
  UTG: '翻前第一個行動，後面還有 5 人，必須最緊。',
  HJ: '後面還有 4 人，比 UTG 稍寬。',
  CO: '按鈕前一位，可以開始偷盲。',
  BTN: '翻牌後永遠最後行動，資訊最多，範圍最寬。',
  SB: '已投入 0.5bb 但翻牌後永遠先行動（不利位置）。',
  BB: '已投入 1bb，最後一個翻前行動，主要任務是防守。',
};

const R = {
  UTG: '22+, A2s+, KTs+, QTs+, JTs, T9s, AJo+, KQo',
  HJ: '22+, A2s+, K9s+, Q9s+, J9s+, T9s, 98s, 87s, ATo+, KJo+, QJo',
  CO: '22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, 65s, A9o+, KTo+, QTo+, JTo',
  BTN: '22+, A2s+, K2s+, Q2s+, J6s+, T6s+, 96s+, 86s+, 75s+, 64s+, 54s, A2o+, K8o+, Q9o+, J9o+, T9o, 98o',
  SB: '22+, A2s+, K2s+, Q2s+, J6s+, T6s+, 96s+, 86s+, 75s+, 64s+, 54s, A5o+, K8o+, Q9o+, JTo',
};
export const RFI = Object.fromEntries(Object.entries(R).map(([k, v]) => [k, expandRange(v)]));
export const RFI_TEXT = R;

// 面對加注的圖表（3bet / call / fold）
export const DEFENSE = {
  BB_vs_BTN: {
    title: '大盲 vs 按鈕開池 2.5bb',
    threebet: expandRange('TT+, AJs+, KQs, AQo+, A5s-A3s, K9s, Q9s, J9s, T8s, 65s'),
    call: expandRange('22-99, A2s-ATs, K2s-KJs, Q2s-QJs, J4s-JTs, T6s-T9s, 96s+, 85s+, 74s+, 63s+, 52s+, 42s+, 32s, A2o-AJo, K5o-KQo, Q8o-QJo, J8o-JTo, T8o-T9o, 97o+, 87o, 76o, 65o'),
  },
  BTN_vs_CO: {
    title: '按鈕 vs 關煞位開池 2.5bb',
    threebet: expandRange('QQ+, AKs, AQs, AKo, A5s-A4s, K9s, 76s, 65s'),
    call: expandRange('22-JJ, A6s-AJs, KTs-KQs, QTs+, J9s+, T8s+, 98s, 87s, AJo-AQo, KQo'),
  },
  SB_vs_BTN: {
    title: '小盲 vs 按鈕開池（3bet 或棄牌）',
    threebet: expandRange('55+, A2s+, K9s+, QTs+, JTs, T9s, 98s, ATo+, KJo+'),
    call: new Set(),
  },
};
// 其他通用情境（實戰教練使用）
export const VS_OPEN_IP = {
  threebet: expandRange('QQ+, AKs, AKo, A5s-A4s'),
  call: expandRange('22-JJ, ATs-AQs, KJs+, QJs, JTs, T9s, 98s, AQo'),
};
export const VS_OPEN_OOP = {
  threebet: expandRange('QQ+, AKs, AKo, A5s'),
  call: expandRange('77-JJ, AJs-AQs, KQs, AQo'),
};
export const VS_3BET = {
  fourbet: expandRange('KK+, AKs, A5s'),
  call: expandRange('TT-QQ, AQs+, AKo, KQs, JTs'),
};

export function chartAction(chart, label) {
  if (chart.fourbet?.has(label)) return 'raise';
  if (chart.threebet?.has(label)) return 'raise';
  if (chart.call?.has(label)) return 'call';
  return 'fold';
}

// 手牌類型解說（教學用）
export function handCategory(label) {
  const a = ri(label[0]), b = ri(label[1]);
  const suited = label[2] === 's';
  if (label.length === 2) {
    if (a >= 10) return { key: 'premium-pair', name: '大口袋對', tip: '頂級強牌，翻前要主動加注建立底池。' };
    if (a >= 6) return { key: 'mid-pair', name: '中口袋對', tip: '有攤牌價值，也能靠中三條打出大底池。' };
    return { key: 'small-pair', name: '小口袋對', tip: '主要價值是「中三條」（約 12% 機率），需要足夠的隱含賠率。' };
  }
  if (a === 12 && suited) {
    if (b >= 9) return { key: 'big-ace-s', name: '同花大 A', tip: '強牌，能成堅果同花，也有頂對好踢腳。' };
    if (b <= 3) return { key: 'wheel-ace', name: '同花小 A（輪子 A）', tip: '能成堅果同花與 A-5 順子，持有 A 還能阻擋對手的 AA/AK，常用來做 3bet 詐唬。' };
    return { key: 'mid-ace-s', name: '同花中 A', tip: '有同花潛力但頂對踢腳偏弱，位置越後越好玩。' };
  }
  if (a === 12) {
    if (b >= 9) return { key: 'big-ace-o', name: '非同花大 A', tip: '高牌力強，但非同花缺乏聽牌潛力。' };
    return { key: 'weak-ace-o', name: '非同花弱 A', tip: '最危險的「看起來不錯」的牌：中了 A 也常被更大踢腳壓制（被支配）。只在後位偷盲使用。' };
  }
  if (a >= 9 && b >= 8) {
    return suited
      ? { key: 'broadway-s', name: '同花高張', tip: '能做頂對、順子、同花，可玩性很高。' }
      : { key: 'broadway-o', name: '非同花高張', tip: '有高牌力，但容易被支配（例如 KJ 遇到 AK/KQ），前位要謹慎。' };
  }
  if (suited && a - b <= 2) return { key: 'suited-connector', name: '同花連張', tip: '投機牌：很少直接成大牌，但能成順子/同花打贏大底池，需要位置與深籌碼。' };
  if (suited) return { key: 'suited-gapper', name: '同花雜牌', tip: '同花只增加約 2-3% 勝率，單靠同花不值得投入，只在偷盲位置使用。' };
  return { key: 'trash', name: '雜牌', tip: '缺乏高牌力也缺乏聽牌潛力，絕大多數情況直接棄牌。' };
}
