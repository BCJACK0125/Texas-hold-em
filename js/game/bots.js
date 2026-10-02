import { labelOf, handPercentile } from '../core/ranges.js';
import { categoryOf, evalHand, drawInfo } from '../core/cards.js';
import { equityVsRandom } from '../core/equity.js';

// 對手類型參數：vpip/pfr 以「全部手牌比例」表示
export const PROFILES = {
  nit:     { key: 'nit', name: '岩石', icon: '🪨', vpip: 0.13, pfr: 0.10, aggr: 0.35, bluff: 0.05, stick: 0.00, callMult: 1.3 },
  tag:     { key: 'tag', name: '緊凶', icon: '🎯', vpip: 0.22, pfr: 0.18, aggr: 0.60, bluff: 0.22, stick: 0.05, callMult: 1.12 },
  lag:     { key: 'lag', name: '鬆凶', icon: '🔥', vpip: 0.32, pfr: 0.26, aggr: 0.75, bluff: 0.38, stick: 0.10, callMult: 1.0 },
  station: { key: 'station', name: '跟注站', icon: '📞', vpip: 0.48, pfr: 0.06, aggr: 0.15, bluff: 0.04, stick: 0.40, callMult: 0.6 },
  fish:    { key: 'fish', name: '鬆弱魚', icon: '🐟', vpip: 0.38, pfr: 0.10, aggr: 0.30, bluff: 0.12, stick: 0.22, callMult: 0.85 },
  maniac:  { key: 'maniac', name: '瘋子', icon: '🌪️', vpip: 0.60, pfr: 0.42, aggr: 0.90, bluff: 0.60, stick: 0.15, callMult: 0.9 },
};

export const POS_FACTOR = { UTG: 0.65, HJ: 0.8, CO: 1.0, BTN: 1.4, SB: 1.0, BB: 1.0 };

// 翻前門檻（給教練估計範圍時共用）
export function preflopThresholds(prof, pos) {
  const f = POS_FACTOR[pos] ?? 1;
  const aggressive = prof.pfr / prof.vpip > 0.6;
  return {
    open: Math.min(0.95, (aggressive ? prof.vpip : prof.pfr) * f),
    limp: Math.min(0.95, prof.vpip * f),
    threebet: Math.max(0.02, prof.pfr * 0.22),
    call: Math.min(0.9, prof.vpip * 0.55 + prof.stick * 0.2) * (pos === 'BB' ? 1.35 : 1),
    fourbet: prof.key === 'maniac' ? 0.06 : 0.025,
    call3b: 0.06 + prof.stick * 0.12,
  };
}

const roundHalf = x => Math.max(0.5, Math.round(x * 2) / 2);

export function botDecide(game, seat) {
  const p = game.players[seat];
  const prof = PROFILES[p.profile];
  const L = game.legal(seat);
  const pos = game.posOf(seat);
  const R = Math.random();

  if (game.street === 'preflop') {
    const pc = handPercentile(labelOf(p.hole[0], p.hole[1]));
    const T = preflopThresholds(prof, pos);
    const raises = game.raiseCount; // 大盲不算加注
    if (raises === 0) {
      const limpers = game.players.filter(q => q.seat !== seat && q.bet === game.bb && game.posOf(q.seat) !== 'BB').length;
      if (pc < T.open) return { type: 'raise', to: roundHalf((pos === 'SB' ? 3 : 2.5) + limpers) };
      const aggressive = prof.pfr / prof.vpip > 0.6;
      if (pc < T.limp && !aggressive) return { type: L.canCheck ? 'check' : 'call' };
      return { type: L.canCheck ? 'check' : 'fold' };
    }
    if (raises === 1) {
      const bluff3 = R < prof.bluff * 0.12 && pc < 0.45;
      if (pc < T.threebet || bluff3) {
        const ip = !['SB', 'BB'].includes(pos);
        return { type: 'raise', to: roundHalf(game.currentBet * (ip ? 3 : 3.8)) };
      }
      // 越貴越緊
      const priceAdj = Math.min(1, 3 / Math.max(game.currentBet, 1));
      if (pc < T.call * (0.6 + 0.4 * priceAdj)) return { type: 'call' };
      return { type: 'fold' };
    }
    if (pc < T.fourbet) {
      return p.stack + p.bet < game.currentBet * 3.5 ? { type: 'raise', to: L.maxTo } : { type: 'raise', to: roundHalf(game.currentBet * 2.4) };
    }
    if (pc < T.call3b || (L.toCall <= p.stack * 0.08 && pc < 0.2)) return { type: 'call' };
    return { type: 'fold' };
  }

  // ===== 翻牌後 =====
  const opps = game.active.length - 1;
  let eq = equityVsRandom(p.hole, game.board, Math.min(opps, 3), 180);
  const di = drawInfo(p.hole, game.board);
  const cat = categoryOf(evalHand([...p.hole, ...game.board]));
  const draw = di.flushDraw || di.oesd;
  const pot = L.pot;
  const size = f => roundHalf(L.currentBet + pot * f);

  if (L.toCall > 0) {
    const odds = L.toCall / (pot + L.toCall);
    const bigBet = L.toCall > pot * 0.6;
    if (eq > 0.8 && L.canRaise && R < prof.aggr * 0.55) return { type: 'raise', to: roundHalf(L.currentBet * 2.8) };
    if (draw && game.street !== 'river' && L.canRaise && R < prof.bluff * 0.25) return { type: 'raise', to: roundHalf(L.currentBet * 2.6) };
    const need = odds * prof.callMult + (bigBet ? 0.06 : 0) * prof.callMult;
    if (eq + prof.stick * 0.25 >= need || (prof.stick > 0.3 && cat >= 1)) return { type: 'call' };
    if (draw && game.street !== 'river' && odds < 0.3) return { type: 'call' };
    return { type: 'fold' };
  }
  const isPFA = game.pfAggressor === seat;
  if (eq > 0.62 && R < 0.35 + prof.aggr * 0.55) {
    const f = prof.key === 'maniac' ? 1 : prof.key === 'station' ? 0.45 : [0.5, 0.66, 0.75][(Math.random() * 3) | 0];
    return { type: 'raise', to: size(f) };
  }
  if (isPFA && game.street === 'flop' && opps <= 2 && R < prof.aggr * 0.75) return { type: 'raise', to: size(0.33) };
  if ((draw || eq < 0.35) && R < prof.bluff * (game.street === 'river' ? 0.5 : 0.8) * (opps > 1 ? 0.5 : 1)) {
    return { type: 'raise', to: size(prof.key === 'maniac' ? 0.9 : 0.5) };
  }
  return { type: 'check' };
}
