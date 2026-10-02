import { labelOf, handPercentile, RANKED_HANDS, comboCount, combosOf, RFI, DEFENSE, VS_OPEN_IP, VS_OPEN_OOP, VS_3BET, chartAction, handCategory } from '../core/ranges.js';
import { evalHand, categoryOf, drawInfo } from '../core/cards.js';
import { monteCarlo } from '../core/equity.js';
import { PROFILES, preflopThresholds } from './bots.js';
import { classifyFlop } from '../views/widgets.js';

export const LEAKS = {
  'pre-loose': '翻前玩太鬆（該棄的牌入池）',
  'pre-tight': '翻前太緊（該玩的牌棄掉）',
  'pre-passive': '翻前太被動（該加注卻跟注）',
  'post-callbad': '賠率不足仍跟注',
  'post-foldgood': '賠率足夠卻棄牌',
  'post-missvalue': '強牌錯失價值',
  'post-bluffstation': '對跟注站詐唬',
  'post-overbluff': '詐唬時機不佳',
  'post-sizing': '下注尺度不佳',
};

const pctS = x => Math.round(x * 100) + '%';

// 依百分位區間建立範圍
function bandRange(lo, hi) {
  const out = [];
  let acc = 0;
  for (const h of RANKED_HANDS) {
    const p = acc / 1326;
    acc += comboCount(h);
    if (p >= lo && p < hi) out.push(h);
  }
  return out;
}

const boardAt = (game, street) => game.board.slice(0, { preflop: 0, flop: 3, turn: 4, river: 5 }[street]);

// 手牌在牌面上的強度分層：nut(兩對+)、strong(頂對/超對)、weak(其他對子)、draw、air
function tier(hole, board) {
  const s = evalHand([...hole, ...board]);
  const cat = categoryOf(s);
  if (cat >= 2) {
    // 兩對以上但完全來自牌面（例如牌面成對）時降級
    const bs = board.length >= 5 ? evalHand(board) : -1;
    if (bs >= 0 && categoryOf(bs) === cat && bs === s) return 'weak';
    return 'nut';
  }
  const di = drawInfo(hole, board);
  if (cat === 1) {
    const pr = (s >> 16) & 15;
    const topBoard = Math.max(...board.map(c => c >> 2));
    const usesHole = hole.some(c => c >> 2 === pr);
    if (!usesHole) return di.flushDraw || di.oesd ? 'draw' : 'air';
    if (pr >= topBoard) return 'strong';
    return di.flushDraw || di.oesd ? 'draw' : 'weak';
  }
  if (di.flushDraw || di.oesd) return 'draw';
  return 'air';
}

const WEIGHTS = {
  aggressive: { nut: 1, strong: 0.85, weak: 0.3, draw: 0.6, air: null }, // air 依 bluff 頻率
  call: { nut: 0.7, strong: 1, weak: 0.8, draw: 0.85, air: null },     // air 依 stick
  check: { nut: null, strong: 0.7, weak: 1, draw: 0.9, air: 1 },       // nut 依 aggr（慢打）
};

// 估計某位對手的加權範圍
export function estimateRange(game, seat, deadCards) {
  const p = game.players[seat];
  const prof = PROFILES[p.profile] || PROFILES.tag;
  const pos = game.posOf(seat);
  const T = preflopThresholds(prof, pos);
  const pre = game.log.filter(e => e.street === 'preflop' && e.seat === seat && !['sb', 'bb'].includes(e.type));
  // 翻前：看最後一個翻前動作與當時的加注次數
  let lo = 0, hi = 1;
  let raisesSeen = 0;
  const preLog = game.log.filter(e => e.street === 'preflop' && e.type !== 'sb' && e.type !== 'bb');
  for (const e of preLog) {
    if (e.seat === seat) {
      if (e.type === 'raise') { if (raisesSeen === 0) hi = T.open; else if (raisesSeen === 1) hi = Math.max(T.threebet, 0.04); else hi = Math.max(T.fourbet, 0.03); lo = 0; }
      else if (e.type === 'call') { if (raisesSeen === 0) { lo = 0; hi = T.limp; } else if (raisesSeen === 1) { lo = Math.min(T.threebet, 0.03); hi = T.call; } else { lo = 0.01; hi = T.call3b; } }
      else if (e.type === 'check') { lo = Math.min(T.open * 0.5, 0.05); hi = 1; }
    }
    if (e.type === 'raise') raisesSeen++;
  }
  if (!pre.length) { lo = 0; hi = 1; }
  const labels = bandRange(lo, Math.max(hi, lo + 0.02));
  const dead = new Set(deadCards);
  let list = [];
  for (const l of labels) for (const combo of combosOf(l)) if (!dead.has(combo[0]) && !dead.has(combo[1])) list.push({ combo, w: 1 });
  // 翻牌後：逐條街依動作調整權重
  for (const e of game.log) {
    if (e.seat !== seat || e.street === 'preflop' || !['raise', 'call', 'check'].includes(e.type)) continue;
    const b = boardAt(game, e.street);
    const kind = e.type === 'raise' ? 'aggressive' : e.type;
    const W = WEIGHTS[kind];
    for (const x of list) {
      const t = tier(x.combo, b);
      let w = W[t];
      if (w === null) {
        if (kind === 'aggressive') w = 0.08 + prof.bluff * 0.7;
        else if (kind === 'call') w = 0.05 + prof.stick * 1.2;
        else w = 1 - prof.aggr * 0.65;
      }
      x.w *= w;
    }
  }
  list = list.filter(x => x.w > 0.001);
  return list;
}

function rangeSummary(list, board) {
  const tot = { nut: 0, strong: 0, weak: 0, draw: 0, air: 0 };
  let sum = 0;
  for (const x of list) { const t = tier(x.combo, board); tot[t] += x.w; sum += x.w; }
  Object.keys(tot).forEach(k => (tot[k] = sum ? tot[k] / sum : 0));
  return tot;
}

// ======== 翻前建議 ========
function preflopAdvice(game, seat) {
  const p = game.players[seat];
  const pos = game.posOf(seat);
  const label = labelOf(p.hole[0], p.hole[1]);
  const pre = game.log.filter(e => e.street === 'preflop' && !['sb', 'bb'].includes(e.type));
  const raises = pre.filter(e => e.type === 'raise');
  const limpers = pre.filter(e => e.type === 'call' && raises.length === 0).length;
  const L = game.legal(seat);
  const cat = handCategory(label);
  let best, chartName, reason, sizeHint;
  if (raises.length === 0) {
    if (pos === 'BB') {
      const strong = handPercentile(label) < 0.12;
      best = strong ? 'raise' : 'check';
      chartName = '大盲面對平跟';
      reason = strong ? `${label} 夠強，可以加注懲罰平跟者（隔離加注）。` : `免費看翻牌，${label} 不夠強去加注，直接過牌。`;
      sizeHint = 3 + limpers;
    } else {
      const inRange = RFI[pos].has(label);
      best = inRange ? 'raise' : 'fold';
      chartName = `${pos} 開池範圍`;
      reason = inRange ? `${label} 在 ${pos} 的開池範圍內。${limpers ? `前面有 ${limpers} 位平跟，用「隔離加注」把他們趕出或單挑弱者。` : ''}` : `${label} 不在 ${pos} 的開池範圍內，棄牌。${limpers ? '不要跟著平跟——平跟讓你失去主動權。' : ''}`;
      sizeHint = (pos === 'SB' ? 3 : 2.5) + limpers;
    }
  } else if (raises.length === 1) {
    const raiserPos = game.posOf(raises[0].seat);
    let chart;
    if (pos === 'BB' && ['BTN', 'CO', 'SB'].includes(raiserPos)) { chart = DEFENSE.BB_vs_BTN; chartName = '大盲防守（vs 後位開池）'; }
    else if (pos === 'SB' && ['BTN', 'CO'].includes(raiserPos)) { chart = DEFENSE.SB_vs_BTN; chartName = '小盲 3bet 或棄牌'; }
    else if (pos === 'BTN' && ['CO', 'HJ'].includes(raiserPos)) { chart = DEFENSE.BTN_vs_CO; chartName = '按鈕 vs 開池'; }
    else if (!['SB', 'BB'].includes(pos)) { chart = VS_OPEN_IP; chartName = '有位置面對開池'; }
    else { chart = VS_OPEN_OOP; chartName = '沒位置面對開池'; }
    // 對開池尺度過大時收緊
    best = chartAction(chart, label);
    if (best === 'call' && raises[0].to > 4 && pos === 'BB' && handPercentile(label) > 0.35) best = 'fold';
    const ip = !['SB', 'BB'].includes(pos);
    sizeHint = Math.round(raises[0].to * (ip ? 3 : 4) * 2) / 2;
    reason = best === 'raise' ? `${label} 在${chartName}的 3bet 範圍內${['wheel-ace', 'suited-connector'].includes(cat.key) ? '（詐唬 3bet：阻擋牌/可玩性）' : '（價值）'}。` :
      best === 'call' ? `${label} 適合跟注：有足夠勝率與可玩性，但不夠強到 3bet。` : `${label} 面對 ${raiserPos} 的開池勝率不足或容易被支配，棄牌。`;
  } else {
    best = chartAction(VS_3BET, label);
    chartName = '面對 3bet 以上';
    sizeHint = Math.round(raises[raises.length - 1].to * 2.3 * 2) / 2;
    reason = best === 'raise' ? `${label} 夠強，可以 4bet。` : best === 'call' ? `${label} 適合跟注 3bet，不需要 4bet 把弱牌趕走。` : `面對 3bet，${label} 不夠強，棄牌是標準打法。`;
  }
  if (best === 'call' && L.canCheck) best = 'check';
  if (best === 'fold' && L.canCheck) best = 'check';
  return { street: 'preflop', best, label, chartName, reason, sizeHint, cat, pos };
}

// ======== 翻後建議 ========
function postflopAdvice(game, seat) {
  const p = game.players[seat];
  const L = game.legal(seat);
  const opps = game.active.filter(q => q.seat !== seat);
  const dead = [...p.hole, ...game.board];
  const ranges = opps.map(q => ({ seat: q.seat, list: estimateRange(game, q.seat, dead) }));
  const usable = ranges.filter(r => r.list.length);
  const eq = usable.length ? monteCarlo(p.hole, usable.map(r => ({ range: r.list })), game.board, 900).equity : 0.5;
  const main = ranges.find(r => r.seat === game.lastAggressor) || ranges[0];
  const summary = main ? rangeSummary(main.list, game.board) : null;
  const mainProf = main ? PROFILES[game.players[main.seat].profile] : null;
  const pot = L.pot;
  const req = L.toCall > 0 ? L.toCall / (pot + L.toCall) : 0;
  const di = drawInfo(p.hole, game.board);
  const draw = di.flushDraw || di.oesd;
  const street = game.street;
  const headsUp = opps.length === 1;
  const station = opps.some(q => q.profile === 'station');
  const effStack = Math.min(p.stack, Math.max(...opps.map(q => q.stack + q.bet)));
  const isPFA = game.pfAggressor === seat;
  const tex = game.board.length >= 3 ? classifyFlop(game.board.slice(0, 3)) : 'dry';
  const grades = {};
  let best, reason;
  if (L.toCall > 0) {
    if (eq >= Math.max(0.66, req + 0.3) && L.canRaise) {
      best = 'raise'; grades.raise = 'good'; grades.call = 'ok'; grades.fold = 'bad';
      reason = `你的勝率 ${pctS(eq)} 遠高於需要的 ${pctS(req)}，對手範圍中有很多較弱的牌——加注拿價值。`;
    } else if (eq >= req) {
      best = 'call'; grades.call = 'good';
      grades.raise = eq > 0.55 ? 'ok' : draw && street !== 'river' && headsUp ? 'ok' : 'bad';
      grades.fold = eq - req < 0.03 ? 'ok' : 'bad';
      reason = `勝率 ${pctS(eq)} ≥ 需要 ${pctS(req)}，跟注是 +EV。`;
    } else {
      const implied = draw && street !== 'river' && eq + 0.08 >= req && effStack > L.toCall * 8;
      best = 'fold'; grades.fold = 'good';
      grades.call = implied ? 'ok' : req - eq < 0.03 ? 'ok' : 'bad';
      grades.raise = draw && street !== 'river' && headsUp && !station ? 'ok' : 'bad';
      reason = `勝率 ${pctS(eq)} < 需要 ${pctS(req)}。${implied ? '不過你有聽牌且籌碼深，靠隱含賠率跟注也可接受。' : '棄牌止損。'}`;
    }
  } else {
    if (eq >= 0.6) {
      best = 'raise'; grades.raise = 'good'; grades.check = 'ok';
      reason = `勝率 ${pctS(eq)}，你很可能領先——下注拿價值，別讓對手免費看牌。${station ? '對手是跟注站，可以下大一點。' : ''}`;
    } else if (eq >= 0.42) {
      best = 'check'; grades.check = 'good';
      grades.raise = station && eq >= 0.5 ? 'good' : 'ok';
      reason = `勝率 ${pctS(eq)}：中等牌力，有攤牌價值。過牌控制底池${station && eq >= 0.5 ? '，或對跟注站做薄價值下注' : ''}。`;
    } else if (draw && street !== 'river') {
      best = station ? 'check' : 'raise';
      grades.raise = station ? 'ok' : 'good'; grades.check = 'good';
      reason = `你有聽牌（${di.flushDraw ? '同花' : '順子'}），${station ? '對手很少棄牌，免費看牌即可。' : '可以半詐唬：對手棄牌直接贏，被跟注還有 outs。'}`;
    } else if (station) {
      best = 'check'; grades.check = 'good'; grades.raise = 'bad';
      reason = `勝率只有 ${pctS(eq)}，而對手中有跟注站——對他詐唬幾乎不會成功。`;
    } else if (isPFA && street === 'flop' && headsUp && ['dry', 'paired'].includes(tex)) {
      best = 'raise'; grades.raise = 'good'; grades.check = 'ok';
      reason = `你是翻前加注者，牌面乾燥對你的範圍有利——小注（約 1/3 池）持續下注能讓很多牌棄掉。`;
    } else {
      best = 'check'; grades.check = 'good';
      grades.raise = headsUp && street !== 'river' ? 'ok' : headsUp && mainProf && mainProf.key === 'nit' ? 'ok' : 'bad';
      reason = `勝率 ${pctS(eq)}，牌力弱${headsUp ? '' : '且多人底池'}，過牌是最穩健的選擇。`;
    }
  }
  return { street, best, grades, reason, eq, req, summary, mainSeat: main?.seat, pot, toCall: L.toCall, draw, station, headsUp, isPFA, tex };
}

export function analyze(game, seat) {
  return game.street === 'preflop' ? preflopAdvice(game, seat) : postflopAdvice(game, seat);
}

const ACT_NAME = { fold: '棄牌', check: '過牌', call: '跟注', raise: '下注/加注' };

// 對玩家實際動作評分
export function grade(adv, action, game) {
  const a = action.type;
  let g, leak = null;
  const notes = [];
  if (adv.street === 'preflop') {
    const b = adv.best;
    if (a === b) g = 'good';
    else if (b === 'raise' && (a === 'call' || a === 'check')) { g = 'ok'; leak = 'pre-passive'; }
    else if (b === 'raise' && a === 'fold') { g = handPercentile(adv.label) > 0.12 ? 'ok' : 'bad'; leak = 'pre-tight'; }
    else if (b === 'call' && a === 'raise') g = 'ok';
    else if (b === 'call' && a === 'fold') { g = 'ok'; leak = 'pre-tight'; }
    else if ((b === 'fold' || b === 'check') && a === 'raise') { g = adv.cat.key === 'wheel-ace' || handPercentile(adv.label) < 0.3 ? 'ok' : 'bad'; leak = 'pre-loose'; }
    else if (b === 'fold' && a === 'call') { g = adv.pos === 'BB' && handPercentile(adv.label) < 0.6 ? 'ok' : 'bad'; leak = 'pre-loose'; }
    else if (b === 'check' && a === 'fold') { g = 'bad'; leak = 'pre-tight'; notes.push('可以免費過牌時永遠不要棄牌！'); }
    else g = 'ok';
    if (a === 'raise' && adv.sizeHint) {
      const to = action.to;
      if (to > adv.sizeHint * 1.8 && to < game.players[0].startStack * 0.9) notes.push(`尺度偏大：建議約 ${adv.sizeHint}bb。`);
      else if (to < adv.sizeHint * 0.7) notes.push(`尺度偏小：建議約 ${adv.sizeHint}bb。`);
    }
  } else {
    const key = a === 'check' ? 'check' : a;
    g = adv.grades[key] || (a === adv.best ? 'good' : 'ok');
    if (g !== 'good') {
      if (a === 'call' && adv.best === 'fold') leak = 'post-callbad';
      else if (a === 'fold' && adv.best !== 'fold') leak = 'post-foldgood';
      else if ((a === 'check' || a === 'call') && adv.best === 'raise' && adv.eq >= 0.6) leak = 'post-missvalue';
      else if (a === 'raise' && adv.station && adv.eq < 0.42) leak = 'post-bluffstation';
      else if (a === 'raise' && adv.eq < 0.42) leak = 'post-overbluff';
    }
    if (a === 'raise' && action.to) {
      const betFrac = adv.toCall > 0 ? null : action.to / Math.max(adv.pot, 1);
      if (betFrac != null) {
        if (adv.eq < 0.42 && betFrac > 1.2) { notes.push('詐唬用超池太貴了：用 1/3～2/3 池就能達到類似的棄牌效果。'); leak ||= 'post-sizing'; }
        if (adv.eq >= 0.6 && adv.station && betFrac < 0.5) notes.push('對跟注站拿價值可以下更大（2/3 池以上），他本來就會跟。');
        if (adv.isPFA && adv.street === 'flop' && ['dry', 'paired'].includes(adv.tex) && betFrac > 0.8) notes.push('乾燥牌面持續下注通常用小注（約 1/3 池）就足夠。');
      }
    }
  }
  return { grade: g, leak, notes, best: adv.best, action: a };
}

export function adviceHTML(adv, res) {
  const head = res ? { good: '✓ 好決策', ok: '≈ 可接受', bad: '✗ 錯誤' }[res.grade] : '💡 教練建議';
  let s = `<div class="coach-msg ${res ? res.grade : ''}"><div class="cm-head"><span>${head}</span><span class="dim">${{ preflop: '翻前', flop: '翻牌', turn: '轉牌', river: '河牌' }[adv.street]}</span></div>`;
  if (res) s += `<div>你選擇 <b>${ACT_NAME[res.action]}</b>${res.action !== adv.best ? `，建議 <b>${ACT_NAME[adv.best]}</b>` : ''}。</div>`;
  else s += `<div>建議：<b>${ACT_NAME[adv.best]}</b></div>`;
  s += `<div class="small" style="margin-top:4px">${adv.reason}</div>`;
  if (adv.street === 'preflop') s += `<div class="small dim" style="margin-top:4px">參考：${adv.chartName}${adv.best === 'raise' && adv.sizeHint ? ` · 建議尺度 ${adv.sizeHint}bb` : ''}</div>`;
  else {
    s += `<div class="eqbar"><div class="eq" style="width:${adv.eq * 100}%"></div>${adv.req ? `<div class="req" style="left:${adv.req * 100}%"></div>` : ''}</div>
      <div class="small dim">勝率 ${pctS(adv.eq)}${adv.req ? ` · 需要 ${pctS(adv.req)}（紅線）` : ''}</div>`;
    if (adv.summary) {
      const S = adv.summary;
      s += `<div class="small dim" style="margin-top:4px">對手範圍估計：強成牌 ${pctS(S.nut)} · 頂對 ${pctS(S.strong)} · 弱對 ${pctS(S.weak)} · 聽牌 ${pctS(S.draw)} · 空氣 ${pctS(S.air)}</div>`;
    }
  }
  if (res?.notes?.length) s += `<div class="small" style="margin-top:6px;color:var(--yellow)">${res.notes.join('<br>')}</div>`;
  if (res?.leak) s += `<div class="small" style="margin-top:4px"><span class="tag red">漏洞：${LEAKS[res.leak]}</span></div>`;
  return s + '</div>';
}
