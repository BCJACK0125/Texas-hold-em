import { Game } from '../game/engine.js';
import { botDecide, PROFILES } from '../game/bots.js';
import { analyze, grade, adviceHTML, LEAKS } from '../game/coach.js';
import { cardHTML, cardText } from '../core/cards.js';
import { labelOf } from '../core/ranges.js';
import { update, addXP } from '../core/store.js';
import { $, $$, sleep, sfx, esc, toast } from '../core/ui.js';

const NAMES = ['阿傑', 'Mia', '老王', 'Kevin', '小雯', 'Leo', '大衛', 'Yuki', '阿龍', 'Sofia', '胖虎', 'Ivan', '小美', 'Omar'];
const LINEUPS = {
  mixed: { name: '混合桌（推薦）', desc: '各種類型都有，練習辨識對手', types: ['tag', 'fish', 'station', 'lag', 'nit'] },
  fishy: { name: '魚塘', desc: '鬆弱玩家多，練習價值下注', types: ['fish', 'station', 'fish', 'maniac', 'tag'] },
  sharks: { name: '鯊魚池', desc: '緊凶、鬆凶高手多，難度高', types: ['tag', 'lag', 'tag', 'lag', 'nit'] },
};
const SEAT_XY = [[50, 104], [7, 74], [11, 12], [50, -5], [89, 12], [93, 74]];
const STREET_NAME = { preflop: '翻牌前', flop: '翻牌', turn: '轉牌', river: '河牌' };
const ACT_TXT = { fold: '棄牌', check: '過牌', call: '跟注', raise: '加注', bet: '下注', sb: '小盲', bb: '大盲' };

export function mount(el) {
  let alive = true;
  let gen = 0;
  const live = g => alive && g === gen;
  let game = null;
  let opts = { lineup: 'mixed', reveal: false, hints: false, fast: false };
  let heroResolve = null;
  let decisions = [];
  let coachFeed = [];
  let hud = {};
  let session = { hands: 0, net: 0, good: 0, ok: 0, bad: 0, leaks: {} };
  let shown = new Set();
  let pendingAdvice = null;
  let busy = false;

  try { const saved = JSON.parse(localStorage.getItem('acepath.tableopts') || 'null'); if (saved) opts = { ...opts, ...saved }; } catch { /* 忽略 */ }
  const saveOpts = () => { try { localStorage.setItem('acepath.tableopts', JSON.stringify(opts)); } catch { /* 忽略 */ } };

  setup();

  function setup() {
    el.innerHTML = `<div class="page"><div class="page-head"><span class="eyebrow">Practice Table · 實戰模擬室</span><h1>坐上牌桌，<span class="gold-text">教練就在你身後</span></h1>
      <p class="lead">6 人桌、100bb 現金局。對手各有不同風格，每一個決策都會被教練評分：翻前對照範圍表、翻後計算你對「對手估計範圍」的勝率與底池賠率。所有手牌自動存進覆盤室。</p></div>
      <div class="grid-3">${Object.entries(LINEUPS).map(([k, v]) => `<button class="panel feature" data-lu="${k}" style="text-align:left;cursor:pointer;${opts.lineup === k ? 'border-color:var(--gold)' : ''}">
        <span class="f-icon">${v.types.map(t => PROFILES[t].icon).join('')}</span><h3>${v.name}</h3><p>${v.desc}</p></button>`).join('')}</div>
      <div class="panel mt"><h3>桌邊設定</h3>
        <label class="row" style="cursor:pointer"><input type="checkbox" data-o="reveal" ${opts.reveal ? 'checked' : ''}> 顯示對手類型標籤（新手建議開啟；進階玩家關閉，靠 HUD 數據自己判斷）</label>
        <label class="row" style="cursor:pointer"><input type="checkbox" data-o="hints" ${opts.hints ? 'checked' : ''}> 行動前自動顯示教練建議（輔助輪模式）</label>
        <label class="row" style="cursor:pointer"><input type="checkbox" data-o="fast" ${opts.fast ? 'checked' : ''}> 快速模式（對手行動更快）</label>
        <div class="row mt"><button class="btn btn-gold btn-lg" data-start>入座開始 ▶</button><span class="small muted">快捷鍵：F 棄牌 · C 過牌/跟注 · R 加注 · H 提示 · 空白鍵 下一手</span></div></div></div>`;
    $$('[data-lu]', el).forEach(b => b.onclick = () => { opts.lineup = b.dataset.lu; saveOpts(); setup(); });
    $$('[data-o]', el).forEach(i => i.onchange = () => { opts[i.dataset.o] = i.checked; saveOpts(); });
    $('[data-start]', el).onclick = start;
  }

  function start() {
    const names = [...NAMES].sort(() => Math.random() - 0.5);
    const types = [...LINEUPS[opts.lineup].types].sort(() => Math.random() - 0.5);
    game = new Game([{ name: '你', isHero: true, profile: 'hero' }, ...types.map((t, i) => ({ name: names[i], profile: t }))]);
    hud = {};
    game.players.forEach(p => (hud[p.seat] = { hands: 0, vpip: 0, pfr: 0 }));
    el.innerHTML = `<div class="page table-page"><div class="table-layout">
      <div><div class="row mb"><span class="eyebrow" style="margin:0">Practice Table · ${LINEUPS[opts.lineup].name}</span><span class="spacer"></span>
        <label class="small row" style="gap:6px;cursor:pointer"><input type="checkbox" data-live="reveal" ${opts.reveal ? 'checked' : ''}>顯示類型</label>
        <label class="small row" style="gap:6px;cursor:pointer"><input type="checkbox" data-live="hints" ${opts.hints ? 'checked' : ''}>自動提示</label>
        <button class="btn btn-sm" data-leave>離桌</button></div>
        <div class="table-wrap"><div class="felt-table" data-table></div></div>
        <div class="panel action-bar" data-bar></div></div>
      <aside class="stack"><div class="panel"><div class="panel-title"><h3>本次牌局</h3><a class="small" href="#/review">覆盤室 →</a></div><div class="grid-2" data-sess style="gap:12px"></div></div>
        <div class="panel coach"><div class="panel-title"><h3>🎓 教練</h3><button class="btn btn-sm" data-hint>💡 提示 H</button></div><div data-coach><p class="small muted">每次輪到你行動，教練都會在這裡評分。</p></div></div>
        <div class="panel"><h3>手牌紀錄</h3><div class="log" data-log></div></div></aside></div></div>`;
    $$('[data-live]', el).forEach(i => i.onchange = () => { opts[i.dataset.live] = i.checked; saveOpts(); renderTable(); });
    $('[data-leave]', el).onclick = () => { gen++; heroResolve?.(null); game = null; setup(); };
    $('[data-hint]', el).onclick = showHint;
    renderSession();
    loop(++gen);
  }

  async function loop(g) {
    while (live(g)) {
      await playHand(g);
      if (!live(g)) return;
      await waitNext();
    }
  }

  function waitNext() {
    return new Promise(res => {
      const bar = $('[data-bar]', el);
      if (!bar) return res();
      const r = game.result;
      const net = r.net[0];
      const winners = [...new Set(r.pots.flatMap(p => p.winners))];
      bar.innerHTML = `<div class="row"><div style="flex:1"><b>${winners.map(s => game.players[s].name).join('、')}</b> 贏得 ${game.pot}bb${r.showdown ? `（${winners.map(s => r.desc[s]).join(' / ')}）` : ''}
        <div class="small ${net >= 0 ? 'pos' : 'neg'} mono">你本手 ${net >= 0 ? '+' : ''}${net}bb</div></div>
        <a class="btn btn-sm" href="#/review/${lastId}">覆盤這手</a><button class="btn btn-gold" data-next>下一手 ▶</button></div>`;
      const go = () => { document.removeEventListener('keydown', k); res(); };
      const k = e => { if (e.key === ' ' && !e.target.matches('input,textarea')) { e.preventDefault(); go(); } };
      document.addEventListener('keydown', k);
      $('[data-next]', bar).onclick = go;
    });
  }

  let lastId = '';

  async function playHand(gn) {
    game.startHand();
    shown = new Set();
    decisions = [];
    coachFeed = [];
    $('[data-coach]', el).innerHTML = '<p class="small muted">新的一手開始。</p>';
    $('[data-bar]', el).innerHTML = '<div class="small muted center">發牌中，等待對手行動…</div>';
    if (game.rebuys.some(r => r.seat === 0)) toast('💰 你的籌碼已自動補回 100bb');
    sfx('card');
    renderTable(); renderLog();
    let lastStreet = game.street;
    while (live(gn) && !game.handOver) {
      const seat = game.toAct;
      if (seat === 0) {
        const action = await heroTurn();
        if (!live(gn) || !action) return;
        game.act(0, action);
        sfx('chip');
      } else {
        renderTable();
        await sleep(opts.fast ? 250 : 650 + Math.random() * 450);
        if (!live(gn)) return;
        const a = botDecide(game, seat);
        game.act(seat, a);
        if (a.type !== 'fold' && a.type !== 'check') sfx('chip');
      }
      renderTable(); renderLog();
      if (game.street !== lastStreet && !game.handOver) { lastStreet = game.street; sfx('card'); await sleep(opts.fast ? 200 : 500); }
    }
    if (!live(gn)) return;
    finishHand();
  }

  function heroTurn() {
    return new Promise(resolve => {
      busy = true;
      pendingAdvice = null;
      renderTable();
      renderBar();
      // 背景計算教練分析，避免卡住畫面
      setTimeout(() => {
        if (!alive || !game || game.toAct !== 0) return;
        pendingAdvice = analyze(game, 0);
        if (opts.hints) showHint();
      }, 30);
      heroResolve = action => {
        heroResolve = null; busy = false;
        if (!action) return resolve(null);
        const adv = pendingAdvice || analyze(game, 0);
        const res = grade(adv, action, game);
        const msg = adviceHTML(adv, res);
        decisions.push({ idx: game.log.length, street: game.street, grade: res.grade, best: res.best, action: res.action, leak: res.leak, eq: adv.eq ?? null, req: adv.req ?? null, reason: adv.reason, notes: res.notes, summary: adv.summary || null, chart: adv.chartName || null });
        session[res.grade]++;
        if (res.leak) session.leaks[res.leak] = (session.leaks[res.leak] || 0) + 1;
        coachFeed.unshift(msg);
        $('[data-coach]', el).innerHTML = coachFeed.join('');
        sfx(res.grade === 'bad' ? 'bad' : 'good');
        resolve(action);
      };
    });
  }

  function showHint() {
    if (!busy || game.toAct !== 0) return;
    const adv = pendingAdvice || (pendingAdvice = analyze(game, 0));
    const box = $('[data-coach]', el);
    const old = $('[data-hintbox]', box); old?.remove();
    box.insertAdjacentHTML('afterbegin', `<div data-hintbox>${adviceHTML(adv, null)}</div>`);
  }

  function renderBar() {
    const bar = $('[data-bar]', el);
    if (!bar || !game || game.toAct !== 0) return;
    const L = game.legal(0);
    const hero = game.players[0];
    const pot = L.pot;
    const pre = game.street === 'preflop';
    const sizes = [];
    if (pre) {
      if (game.raiseCount === 0) { sizes.push(['2.5bb', 2.5], ['3bb', 3], ['4bb', 4]); }
      else { sizes.push(['3x', L.currentBet * 3], ['4x', L.currentBet * 4], ['2.3x', L.currentBet * 2.3]); }
    } else {
      const base = L.currentBet;
      const callPot = pot + L.toCall;
      if (base === 0) sizes.push(['1/3', pot / 3], ['1/2', pot / 2], ['2/3', pot * 2 / 3], ['底池', pot]);
      else sizes.push(['2.5x', base * 2.5], ['3x', base * 3], ['底池', base + callPot]);
    }
    const clampTo = v => Math.min(L.maxTo, Math.max(L.minTo, Math.round(v * 2) / 2));
    let raiseTo = clampTo(sizes[0]?.[1] ?? L.minTo);
    const raiseWord = L.currentBet === 0 ? '下注' : '加注到';
    bar.innerHTML = `<div class="action-btns">
      <button class="btn btn-lg" data-a="fold" ${L.canCheck ? 'title="可以免費過牌，不建議棄牌"' : ''}>棄牌 <small class="dim">F</small></button>
      <button class="btn btn-lg btn-blue" data-a="call">${L.canCheck ? '過牌' : `跟注 ${L.toCall}`} <small class="dim">C</small></button>
      <button class="btn btn-lg btn-red" data-a="raise" ${L.canRaise ? '' : 'disabled'}>${raiseWord} <span data-rt>${raiseTo}</span> <small class="dim">R</small></button></div>
      ${L.canRaise ? `<div class="sizing">${sizes.map(([n, v]) => `<button class="btn btn-sm" data-s="${clampTo(v)}">${n}</button>`).join('')}<button class="btn btn-sm" data-s="${L.maxTo}">全下</button></div>
      <div class="slider-row"><input type="range" min="${L.minTo}" max="${L.maxTo}" step="0.5" value="${raiseTo}" data-slider><input type="number" step="0.5" min="${L.minTo}" max="${L.maxTo}" value="${raiseTo}" data-num></div>` : ''}
      <div class="small muted">底池 ${pot}bb · 你的籌碼 ${hero.stack}bb${L.toCall > 0 ? ` · 跟注需要勝率 ${Math.round(L.toCall / (pot + L.toCall) * 100)}%` : ''}</div>`;
    const setTo = v => { raiseTo = clampTo(+v); $('[data-rt]', bar).textContent = raiseTo; const s = $('[data-slider]', bar), n = $('[data-num]', bar); if (s) s.value = raiseTo; if (n) n.value = raiseTo; };
    $$('[data-s]', bar).forEach(b => b.onclick = () => setTo(b.dataset.s));
    $('[data-slider]', bar)?.addEventListener('input', e => setTo(e.target.value));
    $('[data-num]', bar)?.addEventListener('change', e => setTo(e.target.value));
    $$('[data-a]', bar).forEach(b => b.onclick = () => doAct(b.dataset.a, raiseTo));
    bar._act = a => doAct(a, raiseTo);
  }

  function doAct(type, raiseTo) {
    if (!heroResolve) return;
    const L = game.legal(0);
    if (type === 'call' && L.canCheck) type = 'check';
    if (type === 'fold' && L.canCheck && !confirm('現在可以免費過牌，確定要棄牌嗎？')) return;
    const bar = $('[data-bar]', el);
    bar.innerHTML = '<div class="small muted center">等待對手行動…</div>';
    heroResolve(type === 'raise' ? { type, to: raiseTo } : { type });
  }

  function seatHTML(p) {
    const g = game;
    const [x, y] = SEAT_XY[p.seat];
    const pos = g.posOf(p.seat);
    const prof = PROFILES[p.profile];
    const showCards = p.isHero || (g.handOver && g.result?.showdown && !p.folded);
    const cards = p.hole.length ? p.hole.map(c => {
      const key = (showCards ? 'f' : 'b') + p.seat + '-' + c;
      const cls = shown.has(key) ? 'no-anim' : '';
      shown.add(key);
      return showCards ? cardHTML(c, { cls }) : cardHTML(-1, { cls });
    }).join('') : '';
    const h = hud[p.seat];
    const winner = g.handOver && g.result && g.result.win[p.seat] > 0;
    const la = p.lastAction;
    const laTxt = la ? (la.type === 'raise' ? (la.isBet ? '下注' : '加注') + ' ' + la.to : la.type === 'call' ? '跟注 ' + la.amount : ACT_TXT[la.type]) : '';
    return `<div class="seat ${p.isHero ? 'hero' : ''} ${p.folded ? 'folded' : ''} ${g.toAct === p.seat && !g.handOver ? 'acting' : ''} ${winner ? 'winner' : ''}" style="left:${x}%;top:${y}%">
      ${la && !g.handOver ? `<div class="seat-action ${la.type === 'raise' ? (la.allIn ? 'allin' : 'raise') : la.type}">${la.allIn ? '全下 ' + la.to : laTxt}</div>` : ''}
      <div class="seat-cards">${p.folded && !p.isHero ? '' : cards}</div>
      <div class="seat-box"><div class="seat-name">${esc(p.name)}${!p.isHero && opts.reveal ? `<span class="seat-type tag" style="padding:0 5px">${prof.icon}${prof.name}</span>` : ''}</div>
        <div class="seat-stack">${p.stack}bb</div>
        <div class="seat-pos">${pos}${g.handOver && g.result?.showdown && !p.folded ? ' · ' + g.result.desc[p.seat] : ''}</div>
        ${!p.isHero && h.hands ? `<div class="hud" title="VPIP / PFR / 手數">${Math.round(h.vpip / h.hands * 100)}/${Math.round(h.pfr / h.hands * 100)} · ${h.hands}</div>` : ''}</div></div>`;
  }

  function renderTable() {
    const t = $('[data-table]', el);
    if (!t || !game) return;
    const g = game;
    const board = [0, 1, 2, 3, 4].map(i => {
      const c = g.board[i];
      if (c == null) return '<div class="slot"></div>';
      const key = 'board' + c;
      const cls = shown.has(key) ? 'no-anim' : '';
      shown.add(key);
      return cardHTML(c, { cls });
    }).join('');
    const bets = g.players.filter(p => p.bet > 0 && !g.handOver).map(p => {
      const [x, y] = SEAT_XY[p.seat];
      return `<div class="seat-bet" style="left:${x + (50 - x) * 0.42}%;top:${y + (45 - y) * 0.42}%"><i class="chip-ico"></i>${p.bet}</div>`;
    }).join('');
    const [bx, by] = SEAT_XY[g.button];
    t.innerHTML = `<div class="felt-logo">ACE PATH</div>
      <div class="t-pot"><span class="t-street">${STREET_NAME[g.street]}</span><b>底池 ${g.pot}bb</b></div>
      <div class="t-board">${board}</div>${bets}
      <div class="dealer-btn" style="left:${bx + (50 - bx) * 0.22 + (bx < 50 ? 4 : bx > 50 ? -4 : 7)}%;top:${by + (50 - by) * 0.22}%">D</div>
      ${g.players.map(seatHTML).join('')}`;
  }

  function renderLog() {
    const box = $('[data-log]', el);
    if (!box) return;
    let html = '', st = '';
    for (const e of game.log) {
      if (e.street !== st) { st = e.street; html += `<div class="street">— ${STREET_NAME[st]} —</div>`; }
      if (e.type === 'deal') { html += `<div>發牌：${e.cards.map(cardText).join(' ')}</div>`; continue; }
      const p = game.players[e.seat];
      const what = e.type === 'raise' ? `${e.isBet ? '下注' : '加注到'} ${e.to}` : e.type === 'call' ? `跟注 ${e.amount}` : e.type === 'sb' || e.type === 'bb' ? `${ACT_TXT[e.type]} ${e.amount}` : ACT_TXT[e.type];
      html += `<div>${esc(p.name)}（${game.posOf(e.seat)}）${what}${e.allIn ? '（全下）' : ''}</div>`;
    }
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
  }

  function renderSession() {
    const box = $('[data-sess]', el);
    if (!box) return;
    const n = session.good + session.ok + session.bad;
    const bb100 = session.hands ? (session.net / session.hands) * 100 : 0;
    const topLeak = Object.entries(session.leaks).sort((a, b) => b[1] - a[1])[0];
    box.innerHTML = `<div class="stat ${session.net >= 0 ? 'good' : 'bad'}"><b>${session.net >= 0 ? '+' : ''}${Math.round(session.net * 10) / 10}</b><span>盈虧 bb</span></div>
      <div class="stat"><b>${session.hands}</b><span>手數</span></div>
      <div class="stat"><b>${n ? Math.round(session.good / n * 100) : 0}%</b><span>好決策比例</span></div>
      <div class="stat"><b>${session.hands >= 30 ? bb100.toFixed(0) : "—"}</b><span>bb/100${session.hands < 30 ? "（30 手後）" : ""}</span></div>
      ${topLeak ? `<div class="small" style="grid-column:1/-1"><span class="tag red">本場最大漏洞：${LEAKS[topLeak[0]]} ×${topLeak[1]}</span></div>` : ''}
      <div class="small dim" style="grid-column:1/-1">短期盈虧受運氣影響很大，請專注在「好決策比例」。</div>`;
  }

  function finishHand() {
    const g = game;
    const r = g.result;
    // HUD 統計
    for (const p of g.players) {
      hud[p.seat].hands++;
      const pre = g.log.filter(e => e.street === 'preflop' && e.seat === p.seat);
      if (pre.some(e => e.type === 'call' || e.type === 'raise')) hud[p.seat].vpip++;
      if (pre.some(e => e.type === 'raise')) hud[p.seat].pfr++;
    }
    session.hands++;
    session.net += r.net[0];
    if (r.net[0] > 0) sfx('win');
    renderTable();
    renderSession();
    // 存檔
    const rec = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ts: Date.now(),
      lineup: opts.lineup,
      button: g.button,
      players: g.players.map(p => ({ name: p.name, profile: p.profile, pos: g.posOf(p.seat), start: p.startStack, hole: p.hole.slice(), isHero: !!p.isHero, folded: p.folded })),
      board: g.board.slice(),
      log: g.log.map(e => ({ ...e })),
      decisions,
      net: r.net,
      win: r.win,
      showdown: r.showdown,
      desc: r.desc,
      pot: g.pot,
      heroLabel: labelOf(g.players[0].hole[0], g.players[0].hole[1]),
      heroPos: g.posOf(0),
      tags: [],
      note: '',
    };
    lastId = rec.id;
    update(s => {
      s.hands.unshift(rec);
      if (s.hands.length > 300) s.hands.length = 300;
      s.session.hands++; s.session.net += r.net[0];
    });
    const goods = decisions.filter(d => d.grade === 'good').length;
    if (decisions.length && goods === decisions.length) update(s => { s.xp += 3; });
    if (session.hands % 25 === 0) addXP(25, `完成 ${session.hands} 手實戰`);
  }

  const onKey = e => {
    if (!game || e.target.matches('input, textarea, select')) return;
    const k = e.key.toLowerCase();
    const bar = $('[data-bar]', el);
    if (heroResolve && bar?._act) {
      if (k === 'f') bar._act('fold');
      else if (k === 'c') bar._act('call');
      else if (k === 'r') bar._act('raise');
    }
    if (k === 'h') showHint();
  };
  document.addEventListener('keydown', onKey);
  return () => { alive = false; heroResolve?.(null); document.removeEventListener('keydown', onKey); };
}
