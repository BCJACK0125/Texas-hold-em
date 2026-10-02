import { RFI, DEFENSE, POS_NAMES, ALL_HANDS, combosOf, chartAction, handCategory, rangePercent, GRID_RANKS } from '../core/ranges.js';
import { cardsHTML, shuffle } from '../core/cards.js';
import { load, update, addXP, recordDrill } from '../core/store.js';
import { $, $$, pick, sfx, pct } from '../core/ui.js';
import { rangeGridHTML, LEGEND, rfiCharts, defenseCharts } from './widgets.js';

const RFI_POS = ['UTG', 'HJ', 'CO', 'BTN', 'SB'];
const DEF_KEYS = Object.keys(DEFENSE);
const DEF_INFO = {
  BB_vs_BTN: { hero: 'BB', raiser: 'BTN' },
  BTN_vs_CO: { hero: 'BTN', raiser: 'CO' },
  SB_vs_BTN: { hero: 'SB', raiser: 'BTN' },
};
const SEAT_ORDER = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];
const SEAT_XY = [[50, 96], [8, 70], [8, 28], [50, 4], [92, 28], [92, 70]];

// 邊界手牌：在網格上和鄰居動作不同的手牌，最值得練習
function borderHands(actionFn) {
  const out = [];
  for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) {
    const h = ALL_HANDS[r * 13 + c], a = actionFn(h);
    const nb = [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]].filter(([x, y]) => x >= 0 && y >= 0 && x < 13 && y < 13);
    if (nb.some(([x, y]) => actionFn(ALL_HANDS[x * 13 + y]) !== a)) out.push(h);
  }
  return out;
}

export function mount(el) {
  let mode = 'rfi';      // rfi | def | charts | misses
  let posSel = 'random'; // 位置或 random
  let speed = false;
  let sess = { correct: 0, total: 0, streak: 0 };
  let cur = null, timer = null, answered = false;

  el.innerHTML = `<div class="page">
    <div class="page-head"><span class="eyebrow">Range Room · 起手牌訓練室</span><h1>把範圍表變成<span class="gold-text">反射動作</span></h1>
    <p class="lead">系統會優先出「邊界手牌」與你的錯題，練到每個位置都能 1 秒內做出決定。快捷鍵：<b>F</b> 棄牌、<b>C</b> 跟注、<b>R</b> 加注、<b>空白鍵</b> 下一手。</p></div>
    <div class="row mb"><div class="tabs" data-modes>
      <button class="tab" data-mode="rfi">開池測驗</button><button class="tab" data-mode="def">防守測驗</button>
      <button class="tab" data-mode="charts">查看範圍表</button><button class="tab" data-mode="misses">錯題本</button></div></div>
    <div data-body></div></div>`;

  const body = $('[data-body]', el);
  const setMode = m => {
    mode = m; clearInterval(timer);
    $$('[data-mode]', el).forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    if (m === 'charts') {
      body.innerHTML = `<div class="grid-2"><div class="panel" data-c1></div><div class="panel" data-c2></div></div>`;
      rfiCharts($('[data-c1]', body)); defenseCharts($('[data-c2]', body));
      return;
    }
    if (m === 'misses') return renderMisses();
    posSel = 'random';
    renderTrainer();
  };
  $$('[data-mode]', el).forEach(b => b.onclick = () => setMode(b.dataset.mode));

  function renderTrainer() {
    const opts = mode === 'rfi' ? RFI_POS : DEF_KEYS;
    body.innerHTML = `<div class="row mb"><span class="small muted">情境：</span><div class="tabs">
      <button class="tab ${posSel === 'random' ? 'active' : ''}" data-pos="random">隨機</button>
      ${opts.map(p => `<button class="tab ${posSel === p ? 'active' : ''}" data-pos="${p}">${mode === 'rfi' ? p : DEFENSE[p].title.split('（')[0]}</button>`).join('')}</div>
      <label class="row small" style="gap:6px;cursor:pointer"><input type="checkbox" data-speed ${speed ? 'checked' : ''}> 限時 5 秒</label></div>
      <div class="trainer-layout">
        <div class="panel quiz-stage" data-stage></div>
        <div class="panel"><div class="panel-title"><h3>本次成績</h3><span class="tag gold" data-acc></span></div>
          <div class="scoreboard mb" data-score></div><div data-grid><div class="empty"><span class="big">🂠</span>作答後這裡會顯示完整範圍表與你的位置</div></div></div>
      </div>`;
    $$('[data-pos]', body).forEach(b => b.onclick = () => { posSel = b.dataset.pos; renderTrainer(); });
    $('[data-speed]', body).onchange = e => { speed = e.target.checked; deal(); };
    deal();
  }

  function actionFor(c) {
    return c.mode === 'rfi' ? (RFI[c.pos].has(c.label) ? 'raise' : 'fold') : chartAction(DEFENSE[c.pos], c.label);
  }

  function chooseHand(mode, pos) {
    const s = load();
    const fn = h => (mode === 'rfi' ? (RFI[pos].has(h) ? 'raise' : 'fold') : chartAction(DEFENSE[pos], h));
    const misses = Object.entries(s.rangeMisses).filter(([k, v]) => v > 0 && k.startsWith(`${mode}|${pos}|`)).map(([k]) => k.split('|')[2]);
    const r = Math.random();
    if (misses.length && r < 0.25) return pick(misses);
    if (r < 0.75) return pick(borderHands(fn));
    // 依組合數權重隨機
    const cs = shuffle([...ALL_HANDS.flatMap(h => Array(h.length === 2 ? 6 : h[2] === 's' ? 4 : 12).fill(h))]);
    return cs[0];
  }

  function deal() {
    clearInterval(timer);
    answered = false;
    const opts = mode === 'rfi' ? RFI_POS : DEF_KEYS;
    const pos = posSel === 'random' ? pick(opts) : posSel;
    const label = chooseHand(mode, pos);
    const combo = pick(combosOf(label));
    cur = { mode, pos, label, combo };
    const heroPos = mode === 'rfi' ? pos : DEF_INFO[pos].hero;
    const raiser = mode === 'def' ? DEF_INFO[pos].raiser : null;
    const stage = $('[data-stage]', body);
    const buttons = mode === 'rfi'
      ? `<button class="btn btn-lg" data-act="fold">棄牌 <small class="dim">F</small></button><button class="btn btn-lg btn-red" data-act="raise">加注 ${pos === 'SB' ? '3bb' : '2.5bb'} <small class="dim">R</small></button>`
      : `<button class="btn btn-lg" data-act="fold">棄牌 <small class="dim">F</small></button>${DEFENSE[pos].call.size ? `<button class="btn btn-lg btn-blue" data-act="call">跟注 <small class="dim">C</small></button>` : ''}<button class="btn btn-lg btn-red" data-act="raise">3-Bet <small class="dim">R</small></button>`;
    stage.innerHTML = `<div class="mini-table">${SEAT_ORDER.map((p, i) => `<div class="mini-seat ${p === heroPos ? 'hero' : ''} ${p === raiser ? 'raiser' : ''}" style="left:${SEAT_XY[i][0]}%;top:${SEAT_XY[i][1]}%">${p}</div>`).join('')}</div>
      <p class="big-q">${mode === 'rfi' ? `你在 <span class="gold-text">${POS_NAMES[pos]}</span>，前面全部棄牌` : `你在 <span class="gold-text">${POS_NAMES[heroPos]}</span>，${raiser} 開池加注 2.5bb`}</p>
      <p class="muted small">100bb 籌碼 · 6 人桌現金局</p>
      <div class="cards">${cardsHTML(combo, { cls: 'xl' })}</div>
      ${speed ? '<div class="timer-bar"><i data-tb style="width:100%"></i></div>' : ''}
      <div class="actions">${buttons}</div><div data-fb class="mt"></div>`;
    $$('[data-act]', stage).forEach(b => b.onclick = () => answer(b.dataset.act));
    renderScore();
    if (speed) {
      const t0 = Date.now();
      timer = setInterval(() => {
        const left = 1 - (Date.now() - t0) / 5000;
        const tb = $('[data-tb]', stage); if (tb) tb.style.width = Math.max(0, left * 100) + '%';
        if (left <= 0) { clearInterval(timer); answer('timeout'); }
      }, 50);
    }
  }

  function explain(c, correct) {
    const cat = handCategory(c.label);
    let why = '';
    if (c.mode === 'rfi') {
      const pctOpen = rangePercent(RFI[c.pos]).toFixed(0);
      if (correct === 'raise') {
        why = `${c.pos} 開池範圍約 ${pctOpen}%，${c.label} 在範圍內。`;
        if (['trash', 'suited-gapper', 'weak-ace-o'].includes(cat.key)) why += ' 這手牌本身不強，但後面只剩少數玩家，偷盲的收益讓它值得加注。';
      } else {
        const first = RFI_POS.find(p => RFI[p].has(c.label));
        why = first ? `${c.label} 要到 <b>${first}</b> 或更後面的位置才開始開池。在 ${c.pos}（開池約 ${pctOpen}%）後面還有太多人，容易被更強的牌壓制。` : `${c.label} 在任何位置都不該首位加注入池（SB 偷盲以外）。`;
      }
    } else {
      const info = DEF_INFO[c.pos];
      if (correct === 'raise') {
        const strong = ['premium-pair', 'big-ace-s', 'big-ace-o'].includes(cat.key) || /^(AK|AQ|KQs|JJ|TT)/.test(c.label);
        why = strong ? `價值 3bet：${c.label} 領先 ${info.raiser} 的開池範圍，要建立大底池。` : `詐唬 3bet：${c.label} 有阻擋效果或可玩性（被跟注也能打），同時本身不夠好平跟。`;
      } else if (correct === 'call') {
        why = info.hero === 'BB' ? `大盲已投入 1bb，只需再補 1.5bb 搶 4bb 底池（需要約 27% 勝率），${c.label} 有足夠的勝率與可玩性跟注。` : `${c.label} 有足夠的牌力和可玩性，在有位置的情況下跟注看翻牌，保留對手範圍中較弱的牌。`;
      } else {
        why = `${c.label} 對上 ${info.raiser} 的開池範圍勝率不足，且容易被支配或翻牌後難以實現勝率。`;
      }
    }
    return `${why}<div class="small muted mt"><b>${cat.name}</b>：${cat.tip}</div>`;
  }

  function answer(act) {
    if (answered) return;
    answered = true; clearInterval(timer);
    const c = cur;
    const correct = actionFor(c);
    const ok = act === correct;
    sess.total++;
    if (ok) { sess.correct++; sess.streak++; } else sess.streak = 0;
    sfx(ok ? 'good' : 'bad');
    recordDrill('ranges', ok);
    const key = `${c.mode}|${c.pos}|${c.label}`;
    update(s => { s.rangeMisses[key] = Math.max(0, (s.rangeMisses[key] || 0) + (ok ? -1 : 2)); if (!s.rangeMisses[key]) delete s.rangeMisses[key]; });
    if (ok) addXPQuiet(2);
    if (ok && sess.streak > 0 && sess.streak % 10 === 0) addXP(15, `連續答對 ${sess.streak} 題`);
    const name = { raise: c.mode === 'rfi' ? '加注' : '3-Bet', call: '跟注', fold: '棄牌' };
    const stage = $('[data-stage]', body);
    $$('[data-act]', stage).forEach(b => { b.disabled = true; if (b.dataset.act === correct) b.style.boxShadow = '0 0 0 2px var(--green)'; });
    $('[data-fb]', stage).innerHTML = `<div class="fb ${ok ? 'good' : 'bad'}" style="text-align:left"><div class="fb-head">${ok ? '✓ 正確' : act === 'timeout' ? '⏱ 超時' : '✗ 錯誤'}：${c.label} 應該 ${name[correct]}</div>${explain(c, correct)}</div>
      <button class="btn btn-gold mt" data-next>下一手 →</button>`;
    $('[data-next]', stage).onclick = deal;
    // 範圍表
    const chart = c.mode === 'rfi' ? null : DEFENSE[c.pos];
    const cls = h => {
      const a = c.mode === 'rfi' ? (RFI[c.pos].has(h) ? 'raise' : '') : ({ raise: 'threebet', call: 'call', fold: '' })[chartAction(chart, h)];
      return `${a} ${h === c.label ? 'target' : ''}`;
    };
    $('[data-grid]', body).innerHTML = `<p class="small muted">${c.mode === 'rfi' ? `${c.pos} 開池範圍` : DEFENSE[c.pos].title}</p>${rangeGridHTML(cls)}<div class="mt">${LEGEND}</div>`;
    renderScore();
  }

  function addXPQuiet(n) { update(s => { s.xp += n; }); }

  function renderScore() {
    const sb = $('[data-score]', body);
    if (!sb) return;
    sb.innerHTML = `<div class="stat good"><b>${sess.correct}</b><span>答對</span></div><div class="stat"><b>${sess.total}</b><span>總題數</span></div><div class="stat"><b>${sess.streak}</b><span>連續答對</span></div>`;
    $('[data-acc]', body).textContent = sess.total ? `正確率 ${pct(sess.correct / sess.total)}` : '開始作答';
  }

  function renderMisses() {
    const s = load();
    const list = Object.entries(s.rangeMisses).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    body.innerHTML = `<div class="panel"><div class="panel-title"><h3>📕 錯題本</h3><span class="tag">${list.length} 題待加強</span></div>
      <p class="small muted">答錯一次 +2 次權重，答對一次 −1。權重歸零就會從錯題本畢業。訓練時有 25% 機率從這裡出題。</p>
      ${list.length ? `<table class="data-table"><tr><th>情境</th><th>手牌</th><th>正確動作</th><th>待練次數</th></tr>
      ${list.map(([k, v]) => { const [m, p, h] = k.split('|'); const a = m === 'rfi' ? (RFI[p].has(h) ? '加注' : '棄牌') : ({ raise: '3-Bet', call: '跟注', fold: '棄牌' })[chartAction(DEFENSE[p], h)]; return `<tr><td>${m === 'rfi' ? p + ' 開池' : DEFENSE[p].title}</td><td class="mono"><b>${h}</b></td><td>${a}</td><td class="num">${v}</td></tr>`; }).join('')}</table>
      <div class="row mt"><button class="btn btn-gold btn-sm" data-drill>專練錯題</button><button class="btn btn-sm btn-red" data-clear>清空錯題本</button></div>`
      : '<div class="empty"><span class="big">🎉</span>目前沒有錯題。去開池測驗挑戰看看！</div>'}</div>`;
    $('[data-clear]', body)?.addEventListener('click', () => { update(s => { s.rangeMisses = {}; }); renderMisses(); });
    $('[data-drill]', body)?.addEventListener('click', () => {
      const [k] = list[0]; const [m, p] = k.split('|');
      mode = m; posSel = p;
      $$('[data-mode]', el).forEach(b => b.classList.toggle('active', b.dataset.mode === m));
      renderTrainer();
    });
  }

  const onKey = e => {
    if (!['rfi', 'def'].includes(mode) || e.target.matches('input, textarea, select')) return;
    const k = e.key.toLowerCase();
    if (!answered && ({ f: 'fold', c: 'call', r: 'raise' })[k]) {
      const act = ({ f: 'fold', c: 'call', r: 'raise' })[k];
      if ($(`[data-act="${act}"]`, body)) answer(act);
    } else if (answered && (k === ' ' || k === 'enter')) { e.preventDefault(); deal(); }
  };
  document.addEventListener('keydown', onKey);
  setMode('rfi');
  return () => { clearInterval(timer); document.removeEventListener('keydown', onKey); };
}
