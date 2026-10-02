import { cardHTML, RANKS, SUIT_SYMBOLS, evalHand, describeScore, shuffle as shuffleArr } from '../core/cards.js';
import { exactEquity, monteCarlo, rangeToCombos } from '../core/equity.js';
import { topRange, rangePercent } from '../core/ranges.js';
import { recordDrill, update } from '../core/store.js';
import { $, $$, pct, pick, sfx } from '../core/ui.js';
import { variance, bankroll, potOdds, PROFILE_TYPES, rangeGridHTML, rich } from './widgets.js';

const TABS = [
  { k: 'equity', name: '勝率計算器' }, { k: 'variance', name: '變異數模擬' }, { k: 'bankroll', name: '資金管理' },
  { k: 'mdf', name: '賠率 / MDF' }, { k: 'profile', name: '對手分析測驗' }, { k: 'sizing', name: '下注尺度測驗' },
];

export function mount(el, [initial]) {
  let tab = TABS.some(t => t.k === initial) ? initial : 'equity';
  el.innerHTML = `<div class="page"><div class="page-head"><span class="eyebrow">Lab · 研究室</span><h1>高手的<span class="gold-text">工具箱</span></h1>
    <p class="lead">把抽象的數學變成看得見的結果：算勝率、模擬運氣、計算破產風險，並用情境測驗練習讀人與下注尺度。</p></div>
    <div class="tabs mb">${TABS.map(t => `<button class="tab" data-t="${t.k}">${t.name}</button>`).join('')}</div><div class="panel" data-body></div></div>`;
  const body = $('[data-body]', el);
  const set = t => {
    tab = t; history.replaceState(null, '', '#/lab/' + t);
    $$('[data-t]', el).forEach(b => b.classList.toggle('active', b.dataset.t === t));
    body.innerHTML = '<div></div>';
    const w = body.firstChild;
    ({ equity: equityCalc, variance, bankroll, mdf: potOdds, profile: profileQuiz, sizing: sizingQuiz })[t](w);
  };
  $$('[data-t]', el).forEach(b => b.onclick = () => set(b.dataset.t));
  set(tab);
}

// ===== 勝率計算器 =====
function equityCalc(el) {
  const st = { hero: [null, null], vill: [null, null], board: [null, null, null, null, null], mode: 'hand', pct: 20 };
  let active = ['hero', 0];
  const used = () => new Set([...st.hero, ...st.vill, ...st.board].filter(c => c != null));
  const slot = (grp, i) => {
    const c = st[grp][i];
    const on = active[0] === grp && active[1] === i;
    return c != null ? `<span data-slot="${grp}:${i}" style="${on ? 'outline:2px solid var(--gold);border-radius:6px' : ''}">${cardHTML(c, { cls: 'no-anim' })}</span>` : `<div class="slot ${on ? 'on' : ''}" data-slot="${grp}:${i}">+</div>`;
  };
  const render = () => {
    const u = used();
    el.innerHTML = `<div class="grid-2" style="align-items:start"><div class="stack">
      <div><div class="board-label">你的手牌</div><div class="slot-row">${slot('hero', 0)}${slot('hero', 1)}</div></div>
      <div><div class="row"><div class="board-label" style="margin:0">對手</div><div class="tabs" style="padding:3px"><button class="tab ${st.mode === 'hand' ? 'active' : ''}" data-m="hand">指定手牌</button><button class="tab ${st.mode === 'range' ? 'active' : ''}" data-m="range">範圍 %</button></div></div>
        ${st.mode === 'hand' ? `<div class="slot-row">${slot('vill', 0)}${slot('vill', 1)}</div>` : `<div class="slider-row mt"><input type="range" min="2" max="100" value="${st.pct}" data-pct><b class="mono">前 ${st.pct}%</b></div><div style="max-width:300px" class="mt">${rangeGridHTML(h => (topRange(st.pct / 100).has(h) ? 'raise' : ''))}</div>`}</div>
      <div><div class="board-label">公共牌（可留空）</div><div class="slot-row">${[0, 1, 2, 3, 4].map(i => slot('board', i)).join('')}</div></div>
      <div class="row"><button class="btn btn-gold" data-calc>計算勝率</button><button class="btn btn-sm" data-clear>清除</button><button class="btn btn-sm" data-random>隨機手牌</button></div>
      <div data-out></div></div>
      <div><div class="board-label">選牌（點擊上方空位後再選）</div><div class="card-picker">${[3, 2, 1, 0].map(s => RANKS.split('').reverse().map(r => {
        const c = (RANKS.indexOf(r) << 2) | s;
        return `<button class="suit-${s} ${u.has(c) ? 'picked' : ''}" data-c="${c}" ${u.has(c) ? 'disabled' : ''}>${r === 'T' ? '10' : r}${SUIT_SYMBOLS[s]}</button>`;
      }).join('')).join('')}</div>
      <p class="small muted mt">小技巧：比較「AK vs 22」「AKs vs 前 10% 範圍」「同花聽牌 vs 頂對」，建立對常見對決的直覺。</p></div></div>`;
    $$('[data-slot]', el).forEach(s => s.onclick = () => {
      const [g, i] = s.dataset.slot.split(':');
      if (st[g][+i] != null && active[0] === g && active[1] === +i) st[g][+i] = null;
      active = [g, +i]; render();
    });
    $$('[data-c]', el).forEach(b => b.onclick = () => {
      st[active[0]][active[1]] = +b.dataset.c;
      // 自動跳到下一個空位
      const order = [['hero', 0], ['hero', 1], ...(st.mode === 'hand' ? [['vill', 0], ['vill', 1]] : []), ['board', 0], ['board', 1], ['board', 2], ['board', 3], ['board', 4]];
      const nx = order.find(([g, i]) => st[g][i] == null);
      if (nx) active = nx;
      render();
    });
    $$('[data-m]', el).forEach(b => b.onclick = () => { st.mode = b.dataset.m; render(); });
    $('[data-pct]', el)?.addEventListener('change', e => { st.pct = +e.target.value; render(); });
    $('[data-clear]', el).onclick = () => { st.hero = [null, null]; st.vill = [null, null]; st.board = [null, null, null, null, null]; active = ['hero', 0]; render(); };
    $('[data-random]', el).onclick = () => {
      const d = shuffleArr([...Array(52).keys()]);
      st.hero = [d[0], d[1]]; st.vill = [d[2], d[3]]; st.board = [d[4], d[5], d[6], null, null]; render();
    };
    $('[data-calc]', el).onclick = () => {
      const out = $('[data-out]', el);
      const hero = st.hero.filter(c => c != null), board = st.board.filter(c => c != null);
      if (hero.length < 2) { out.innerHTML = '<p class="neg small">請先選你的兩張手牌。</p>'; return; }
      if ([1, 2].includes(board.length)) { out.innerHTML = '<p class="neg small">公共牌需要 0、3、4 或 5 張。</p>'; return; }
      out.innerHTML = '<p class="small muted">計算中…</p>';
      setTimeout(() => {
        let eq, note;
        if (st.mode === 'hand') {
          const vill = st.vill.filter(c => c != null);
          if (vill.length < 2) { out.innerHTML = '<p class="neg small">請選對手的兩張手牌，或切換到「範圍 %」。</p>'; return; }
          if (board.length >= 3) { eq = exactEquity(hero, vill, board).equity; note = '精確列舉'; }
          else { eq = monteCarlo(hero, [vill], board, 30000).equity; note = '蒙地卡羅 30,000 次'; }
        } else {
          const combos = rangeToCombos(topRange(st.pct / 100));
          eq = monteCarlo(hero, [{ range: combos }], board, 12000).equity;
          note = `對手前 ${st.pct}%（${rangePercent(topRange(st.pct / 100)).toFixed(1)}% 組合）· 蒙地卡羅 12,000 次`;
        }
        out.innerHTML = `<div class="calc-out"><div class="stat good"><b>${pct(eq, 1)}</b><span>你的勝率</span></div><div class="stat bad"><b>${pct(1 - eq, 1)}</b><span>對手勝率</span></div></div>
          <div class="eqbar" style="height:12px"><div class="eq" style="width:${eq * 100}%"></div></div><p class="small dim">${note}${board.length >= 3 ? ` · 目前牌力：${describeScore(evalHand([...hero, ...board]))}` : ''}</p>`;
      }, 20);
    };
  };
  render();
}

// ===== 對手分析測驗 =====
function profileQuiz(el) {
  let s = 0, t = 0;
  const next = () => {
    const P = pick(PROFILE_TYPES);
    const j = v => Math.max(1, Math.round(v + (Math.random() - 0.5) * 6));
    const stats = { vpip: j(P.vpip), pfr: Math.min(j(P.pfr), j(P.vpip)), af: { nit: 1.8, tag: 3, lag: 3.6, station: 0.7, fish: 1.1, maniac: 5 }[P.key], hands: 100 + Math.floor(Math.random() * 400), wtsd: { nit: 22, tag: 27, lag: 29, station: 42, fish: 36, maniac: 33 }[P.key] };
    el.innerHTML = `<div class="widget-title">情境 · 你的 HUD 顯示這位玩家（${stats.hands} 手樣本）<span class="tag gold" style="margin-left:8px">${s}/${t}</span></div>
      <div class="calc-out"><div class="stat"><b>${stats.vpip}%</b><span>VPIP</span></div><div class="stat"><b>${stats.pfr}%</b><span>PFR</span></div><div class="stat"><b>${(stats.af + (Math.random() - 0.5) * 0.4).toFixed(1)}</b><span>AF</span></div><div class="stat"><b>${stats.wtsd}%</b><span>WTSD</span></div></div>
      <p class="big-q mt">這是哪一類玩家？</p><div class="actions">${PROFILE_TYPES.map(p => `<button class="btn" data-k="${p.key}">${p.icon} ${p.name}</button>`).join('')}</div><div data-o></div>`;
    $$('[data-k]', el).forEach(b => b.onclick = () => {
      const ok = b.dataset.k === P.key; t++; if (ok) s++;
      sfx(ok ? 'good' : 'bad'); recordDrill('profile', ok); if (ok) update(x => { x.xp += 2; });
      $$('[data-k]', el).forEach(x => { x.disabled = true; if (x.dataset.k === P.key) x.classList.add('btn-green'); else if (x === b) x.classList.add('btn-red'); });
      $('[data-o]', el).innerHTML = `<div class="fb ${ok ? 'good' : 'bad'} mt"><div class="fb-head">${P.icon} ${P.name}</div><b>怎麼打他：</b>${P.exploit}
        <p class="small muted mt" style="margin-bottom:0">判斷重點：VPIP 看「玩多少牌」、PFR/VPIP 比例看「凶或弱」、AF 看翻後主動性、WTSD 高代表愛攤牌（不容易被詐唬）。</p></div><button class="btn btn-gold mt" data-n>下一位</button>`;
      $('[data-n]', el).onclick = next;
    });
  };
  next();
}

// ===== 下注尺度測驗 =====
const SIZING = [
  { q: '你在 BTN 開池，BB 跟注。翻牌 {As}{Kd}{3c}（乾燥），你拿 {Qh}{Jh} 一無所有。你的持續下注尺度？', opts: ['1/3 池', '2/3 池', '1.5 倍池（超池）', '過牌放棄'], a: 0, why: '乾燥高牌牌面對開池者範圍極有利，小注就能讓 BB 大量棄牌。下大注只會讓弱牌棄掉、強牌跟注。' },
  { q: '河牌你拿堅果同花，對手是跟注站，底池 40bb，他還有 120bb。你的下注？', opts: ['10bb（1/4 池）', '20bb（半池）', '40bb 以上（滿池或超池）', '過牌等他下注'], a: 2, why: '跟注站不會因為下注大就棄牌，對他用最大的價值尺度。他很少主動下注，過牌只會損失價值。' },
  { q: '翻牌 {Jh}{Th}{8c}（很濕），你拿 {Js}{Jd} 頂三條，對手會追各種聽牌。你的下注？', opts: ['1/4 池', '1/3 池', '3/4 池以上', '過牌慢打'], a: 2, why: '濕潤牌面要「向聽牌收費」並保護你的牌：讓同花聽牌、順子聽牌付出錯誤的賠率。' },
  { q: '河牌你想詐唬一位緊弱（岩石）玩家。他過牌兩次，底池 30bb。哪個尺度最有效率？', opts: ['8bb（約 1/4 池）', '18bb（約 2/3 池）', '60bb（2 倍池）', '不要詐唬'], a: 1, why: '對容易棄牌的玩家，中等尺度已經足夠讓他的中弱牌棄掉；超池詐唬風險太大，太小又會讓他用任何對子跟注。' },
  { q: '河牌你拿中對子（例如第二對），對手過牌給你。對手是鬆弱的魚。', opts: ['過牌攤牌', '小注薄價值（約 1/3 池）', '全下', '大注 1 倍池'], a: 1, why: '魚會用更差的對子、A 高跟注小注。小注讓更差的牌跟，被加注時也容易放棄——這就是「薄價值」。' },
  { q: '翻前你在 BB，BTN 開池 2.5bb，你想用 {Ad}{5d} 3bet。尺度？', opts: ['5bb（2 倍）', '7.5bb（3 倍）', '10～11bb（約 4 倍）', '全下 100bb'], a: 2, why: '沒位置時 3bet 要更大（約 4 倍），讓對手用更差的價格跟注、降低他的位置優勢。' },
  { q: 'UTG 開池時，前面有兩位玩家平跟（limp）。你在 BTN 拿 {Ah}{Qs}。你的加注尺度？', opts: ['2.5bb', '3bb', '5～6bb（每位平跟者 +1bb）', '平跟'], a: 2, why: '有平跟者時，隔離加注要加上「每個平跟者 +1bb」，才能把他們趕出或讓他們付出代價。（題目中 UTG 是第一位平跟者。）' },
  { q: 'SPR 約 2 的單一加注底池，翻牌你拿頂對好踢腳。對手過牌。', opts: ['過牌', '下注並準備全下', '1/10 池', '棄牌'], a: 1, why: '低 SPR 時頂對好踢腳已足夠承諾（commit）。下注建立底池，被加注就全下。' },
  { q: '轉牌你有堅果同花聽牌 + 卡順（12 outs），對手下注半池。你考慮半詐唬加注，對手是緊凶 TAG。', opts: ['加注到約 2.5～3 倍', '最小加注', '跟注就好，不能加注', '棄牌'], a: 0, why: '強聽牌是最好的半詐唬：對手棄牌你直接贏，被跟注你還有約 26% 一張牌的勝率。對會棄牌的 TAG 加注效果好。（對跟注站則直接跟注即可。）' },
  { q: '河牌對手下注滿池。你需要多少勝率才能跟注？', opts: ['25%', '33%', '50%', '66%'], a: 1, why: '1 ÷ (1 + 1 + 1) = 33%。滿池下注永遠需要 1/3 勝率；你平衡的詐唬比例也正好是 33%。' },
];
function sizingQuiz(el) {
  let order = shuffleArr([...SIZING.keys()]), i = 0, s = 0;
  const next = () => {
    if (i >= order.length) {
      el.innerHTML = `<div class="empty"><span class="big">🏁</span><h3>完成！${s}/${order.length}</h3><p class="muted">記住核心原則：價值下注問「對手最多願意跟多少」，詐唬問「最少要多少能讓他棄牌」。</p><button class="btn btn-gold" data-r>再來一輪</button></div>`;
      $('[data-r]', el).onclick = () => { order = shuffleArr([...SIZING.keys()]); i = 0; s = 0; next(); };
      return;
    }
    const Q = SIZING[order[i]];
    el.innerHTML = `<div class="widget-title">情境 ${i + 1}/${order.length} · 下注尺度 <span class="tag gold" style="margin-left:8px">${s} 分</span></div>
      <p class="big-q" style="text-align:left;font-size:17px">${rich(Q.q)}</p><div class="q-opts">${Q.opts.map((o, j) => `<button class="opt" data-j="${j}">${String.fromCharCode(65 + j)}. ${o}</button>`).join('')}</div><div data-o></div>`;
    $$('[data-j]', el).forEach(b => b.onclick = () => {
      const ok = +b.dataset.j === Q.a; if (ok) s++;
      sfx(ok ? 'good' : 'bad'); recordDrill('sizing', ok); if (ok) update(x => { x.xp += 3; });
      $$('[data-j]', el).forEach(x => { x.disabled = true; if (+x.dataset.j === Q.a) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); });
      $('[data-o]', el).innerHTML = `<div class="explain">${Q.why}</div><button class="btn btn-gold mt" data-n>下一題</button>`;
      $('[data-n]', el).onclick = () => { i++; next(); };
    });
  };
  next();
}
