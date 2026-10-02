import { newDeck, shuffle, evalHand, describeScore } from '../core/cards.js';

export const POS6 = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];
const r2 = x => Math.round(x * 100) / 100;

// 6 人無限注德州撲克引擎（金額單位：bb）
export class Game {
  constructor(players, { sb = 0.5, bb = 1, startStack = 100 } = {}) {
    this.players = players.map((p, i) => ({ seat: i, stack: startStack, ...p }));
    this.n = this.players.length;
    this.sb = sb; this.bb = bb; this.startStack = startStack;
    this.button = Math.floor(Math.random() * this.n);
    this.handNo = 0;
    this.handOver = true;
  }

  posOf(seat) { return POS6[(seat - this.button + this.n) % this.n]; }
  seatOfPos(pos) { return (this.button + POS6.indexOf(pos)) % this.n; }
  get pot() { return r2(this.players.reduce((s, p) => s + p.total, 0)); }
  get active() { return this.players.filter(p => !p.folded); }
  get canActPlayers() { return this.players.filter(p => !p.folded && !p.allIn); }

  startHand() {
    this.handNo++;
    this.button = (this.button + 1) % this.n;
    this.rebuys = [];
    for (const p of this.players) {
      // 現金桌：籌碼不足自動補到起始籌碼
      if (p.stack < this.startStack * 0.4) { this.rebuys.push({ seat: p.seat, amount: r2(this.startStack - p.stack) }); p.stack = this.startStack; }
      Object.assign(p, { hole: [], folded: false, allIn: false, bet: 0, total: 0, acted: false, startStack: p.stack, lastAction: null });
    }
    this.deck = shuffle(newDeck());
    for (let k = 0; k < 2; k++) for (let i = 1; i <= this.n; i++) this.players[(this.button + i) % this.n].hole.push(this.deck.pop());
    this.board = [];
    this.street = 'preflop';
    this.log = [];
    this.raiseCount = 0;
    this.lastAggressor = null;
    this.pfAggressor = null;
    this.handOver = false;
    this.result = null;
    const sbSeat = (this.button + 1) % this.n, bbSeat = (this.button + 2) % this.n;
    this._post(sbSeat, this.sb, 'sb');
    this._post(bbSeat, this.bb, 'bb');
    this.currentBet = this.bb;
    this.minRaise = this.bb;
    this.toAct = (this.button + 3) % this.n;
  }

  _post(seat, amt, kind) {
    const p = this.players[seat];
    const a = Math.min(amt, p.stack);
    p.stack = r2(p.stack - a); p.bet = r2(p.bet + a); p.total = r2(p.total + a);
    if (p.stack === 0) p.allIn = true;
    this.log.push({ street: 'preflop', seat, type: kind, amount: a, to: p.bet, pot: this.pot });
  }

  legal(seat = this.toAct) {
    const p = this.players[seat];
    const toCall = r2(Math.min(this.currentBet - p.bet, p.stack));
    const maxTo = r2(p.bet + p.stack);
    const minTo = r2(Math.min(this.currentBet + this.minRaise, maxTo));
    return { toCall, canCheck: toCall <= 0, canRaise: maxTo > this.currentBet && this.canActPlayers.length > 1, minTo, maxTo, currentBet: this.currentBet, pot: this.pot };
  }

  // action: {type:'fold'|'check'|'call'|'raise', to?}
  act(seat, action) {
    if (this.handOver || seat !== this.toAct) return;
    const p = this.players[seat];
    const L = this.legal(seat);
    let { type } = action;
    if (type === 'check' && !L.canCheck) type = 'call';
    if (type === 'call' && L.canCheck) type = 'check';
    if (type === 'raise' && !L.canRaise) type = L.canCheck ? 'check' : 'call';
    const potBefore = this.pot;
    const entry = { street: this.street, seat, type, potBefore, toCall: L.toCall };
    if (type === 'fold') {
      p.folded = true;
    } else if (type === 'call') {
      const a = L.toCall;
      p.stack = r2(p.stack - a); p.bet = r2(p.bet + a); p.total = r2(p.total + a);
      entry.amount = a; entry.to = p.bet;
      if (p.stack <= 0) { p.stack = 0; p.allIn = true; }
    } else if (type === 'raise') {
      let to = r2(Math.max(L.minTo, Math.min(action.to ?? L.minTo, L.maxTo)));
      const a = r2(to - p.bet);
      const raiseBy = r2(to - this.currentBet);
      const wasBet = this.currentBet === 0;
      if (raiseBy >= this.minRaise) this.minRaise = raiseBy;
      this.currentBet = to;
      p.stack = r2(p.stack - a); p.bet = to; p.total = r2(p.total + a);
      if (p.stack <= 0) { p.stack = 0; p.allIn = true; }
      entry.amount = a; entry.to = to; entry.isBet = wasBet;
      this.raiseCount++;
      this.lastAggressor = seat;
      if (this.street === 'preflop') this.pfAggressor = seat;
      for (const q of this.players) if (q !== p && !q.folded && !q.allIn) q.acted = false;
    }
    entry.allIn = p.allIn && type !== 'fold' && type !== 'check';
    entry.pot = this.pot;
    p.acted = true;
    p.lastAction = entry;
    this.log.push(entry);
    this._advance();
    return entry;
  }

  _advance() {
    if (this.active.length === 1) return this._finish();
    const waiting = this.canActPlayers.filter(p => !p.acted || p.bet < this.currentBet);
    if (waiting.length) {
      let s = this.toAct;
      for (let i = 0; i < this.n; i++) {
        s = (s + 1) % this.n;
        const q = this.players[s];
        if (!q.folded && !q.allIn && (!q.acted || q.bet < this.currentBet)) { this.toAct = s; return; }
      }
    }
    this._nextStreet();
  }

  _nextStreet() {
    for (const p of this.players) { p.bet = 0; p.acted = false; p.lastAction = null; }
    this.currentBet = 0; this.minRaise = this.bb; this.raiseCount = 0; this.lastAggressor = null;
    const order = ['preflop', 'flop', 'turn', 'river'];
    const i = order.indexOf(this.street);
    if (i === 3) return this._finish();
    this.street = order[i + 1];
    this.deck.pop(); // 燒牌
    if (this.street === 'flop') this.board.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
    else this.board.push(this.deck.pop());
    this.log.push({ street: this.street, type: 'deal', cards: this.board.slice(), pot: this.pot });
    // 能行動的人少於 2 位 → 直接發完
    if (this.canActPlayers.length < 2) return this._nextStreet();
    for (let k = 1; k <= this.n; k++) {
      const q = this.players[(this.button + k) % this.n];
      if (!q.folded && !q.allIn) { this.toAct = q.seat; return; }
    }
  }

  _finish() {
    this.handOver = true;
    this.toAct = -1;
    const win = new Array(this.n).fill(0);
    const contenders = this.active;
    let showdown = false;
    const scores = {};
    const pots = [];
    if (contenders.length === 1) {
      win[contenders[0].seat] = this.pot;
      pots.push({ amount: this.pot, winners: [contenders[0].seat] });
    } else {
      showdown = true;
      while (this.board.length < 5) { this.deck.pop(); this.board.push(this.deck.pop()); }
      for (const p of contenders) scores[p.seat] = evalHand([...p.hole, ...this.board]);
      const levels = [...new Set(contenders.map(p => p.total))].sort((a, b) => a - b);
      let prev = 0, accounted = 0;
      for (const L of levels) {
        let amt = 0;
        for (const p of this.players) amt += Math.max(0, Math.min(p.total, L) - Math.min(p.total, prev));
        const elig = contenders.filter(p => p.total >= L);
        pots.push({ amount: r2(amt), elig: elig.map(p => p.seat) });
        accounted += amt; prev = L;
      }
      const rest = r2(this.pot - accounted);
      if (rest > 0) pots[pots.length - 1].amount = r2(pots[pots.length - 1].amount + rest);
      for (const pt of pots) {
        const best = Math.max(...pt.elig.map(s => scores[s]));
        const ws = pt.elig.filter(s => scores[s] === best);
        pt.winners = ws;
        // 從按鈕左邊開始分配零頭
        const share = Math.floor((pt.amount / ws.length) * 100) / 100;
        ws.forEach(s => (win[s] = r2(win[s] + share)));
        const odd = r2(pt.amount - share * ws.length);
        if (odd > 0) win[ws[0]] = r2(win[ws[0]] + odd);
      }
    }
    for (const p of this.players) p.stack = r2(p.stack + win[p.seat]);
    this.result = {
      showdown, pots, win,
      net: this.players.map(p => r2(win[p.seat] - p.total)),
      scores,
      desc: Object.fromEntries(Object.entries(scores).map(([s, v]) => [s, describeScore(v)])),
    };
  }
}
