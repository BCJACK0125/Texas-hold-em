import { newDeck, shuffle, evalHand, describeScore, cardsHTML, cardHTML, parseCards, cardSpan, RANKS, CATEGORY_NAMES } from '../core/cards.js';
import { ALL_HANDS, comboCount, RFI, RFI_TEXT, DEFENSE, POSITIONS, POS_NAMES, POS_DESC, rangePercent, chartAction, handCategory } from '../core/ranges.js';
import { computeOuts } from '../core/equity.js';
import { $, $$, pct, lineChart, esc } from '../core/ui.js';
import { recordDrill } from '../core/store.js';

// 文字中的牌：[[As Kh]] → 牌列；{As} → 行內小牌
export function rich(html) {
  return html
    .replace(/\[\[([^\]]+)\]\]/g, (_, s) => `<span class="cards tight" style="display:inline-flex;vertical-align:middle">${cardsHTML(parseCards(s), { cls: 'xs' })}</span>`)
    .replace(/\{([2-9TJQKA][shdc])\}/g, (_, s) => cardSpan(parseCards(s)[0]));
}

// ===== 共用：13x13 範圍網格 =====
export function rangeGridHTML(classFn, { interactive = false, title = h => h } = {}) {
  return `<div class="range-grid ${interactive ? 'interactive' : ''}">${ALL_HANDS.map(h =>
    `<div class="rg-cell ${h.length === 2 ? 'pair' : ''} ${classFn ? classFn(h) : ''}" data-hand="${h}" title="${esc(title(h))}">${h}</div>`).join('')}</div>`;
}
export const LEGEND = `<div class="legend"><span><i style="background:var(--raise)"></i>加注 / Raise</span><span><i style="background:var(--threebet)"></i>3-Bet</span><span><i style="background:var(--call)"></i>跟注 / Call</span><span><i style="background:var(--fold)"></i>棄牌 / Fold</span></div>`;

// ===== 一手牌的流程 =====
function handFlow(el) {
  let deck, p1, p2, board, step;
  const names = ['發底牌', '翻牌 Flop', '轉牌 Turn', '河牌 River', '攤牌 Showdown'];
  const reset = () => { deck = shuffle(newDeck()); p1 = deck.splice(0, 2); p2 = deck.splice(0, 2); board = deck.splice(0, 5); step = 0; render(); };
  const render = () => {
    const shown = step === 0 ? 0 : step === 1 ? 3 : step === 2 ? 4 : 5;
    const b = board.slice(0, shown);
    let result = '';
    if (step >= 4) {
      const s1 = evalHand([...p1, ...board]), s2 = evalHand([...p2, ...board]);
      result = `<div class="fb ${s1 === s2 ? 'ok' : 'good'} mt"><div class="fb-head">${s1 > s2 ? '你贏了！' : s1 < s2 ? '對手贏了' : '平分底池'}</div>你：${describeScore(s1)}　｜　對手：${describeScore(s2)}</div>`;
    }
    el.innerHTML = `<div class="widget-title">互動演示 · 一手牌的流程</div>
      <div class="steps">${names.map((n, i) => `<i class="${i < step ? 'done' : i === step ? 'on' : ''}"></i>`).join('')}</div>
      <div class="grid-2" style="align-items:center">
        <div><div class="board-label">你的底牌</div><div class="cards">${cardsHTML(p1)}</div></div>
        <div><div class="board-label">對手底牌</div><div class="cards">${step >= 4 ? cardsHTML(p2) : cardHTML(-1) + cardHTML(-1)}</div></div>
      </div>
      <div class="board-label mt">公共牌</div>
      <div class="cards" style="min-height:76px">${b.length ? cardsHTML(b) : '<span class="dim small">（尚未發出）</span>'}</div>
      ${step >= 1 && step < 4 ? `<p class="small muted mt">目前你的牌力：<b>${describeScore(evalHand([...p1, ...b]))}</b></p>` : ''}
      ${result}
      <div class="row mt"><button class="btn btn-gold btn-sm" data-next>${step < 4 ? '下一步：' + names[step + 1] : '再來一手'}</button></div>`;
    $('[data-next]', el).onclick = () => { if (step < 4) { step++; render(); } else reset(); };
  };
  reset();
}

// ===== 比牌練習（學院與算牌室共用）=====
export function handRankDrill(el, { drillName = 'handrank' } = {}) {
  let score = 0, total = 0;
  const next = () => {
    const deck = shuffle(newDeck());
    const a = deck.splice(0, 2), b = deck.splice(0, 2), board = deck.splice(0, 5);
    const sa = evalHand([...a, ...board]), sb = evalHand([...b, ...board]);
    const ans = sa > sb ? 'A' : sb > sa ? 'B' : 'T';
    el.innerHTML = `<div class="widget-title">比牌練習 · 誰的牌比較大？ <span class="tag gold" style="margin-left:8px">${score}/${total}</span></div>
      <div class="board-label">公共牌</div><div class="cards mb">${cardsHTML(board)}</div>
      <div class="grid-2"><div><div class="board-label">玩家 A</div><div class="cards">${cardsHTML(a)}</div></div>
      <div><div class="board-label">玩家 B</div><div class="cards">${cardsHTML(b)}</div></div></div>
      <div class="actions"><button class="btn" data-a="A">A 贏</button><button class="btn" data-a="T">平分</button><button class="btn" data-a="B">B 贏</button></div>
      <div data-out></div>`;
    $$('[data-a]', el).forEach(btn => btn.onclick = () => {
      total++;
      const ok = btn.dataset.a === ans;
      if (ok) score++;
      recordDrill(drillName, ok);
      $$('[data-a]', el).forEach(x => { x.disabled = true; if (x.dataset.a === ans) x.classList.add('btn-green'); else if (x === btn) x.classList.add('btn-red'); });
      $('[data-out]', el).innerHTML = `<div class="fb ${ok ? 'good' : 'bad'} mt"><div class="fb-head">${ok ? '✓ 正確' : '✗ 再看一次'}</div>
        A：${describeScore(sa)}　｜　B：${describeScore(sb)}<div class="row mt"><button class="btn btn-gold btn-sm" data-n>下一題</button></div></div>`;
      $('[data-n]', el).onclick = next;
    });
  };
  next();
}

// ===== 座位示意 =====
const SEAT_XY = [[50, 92], [12, 70], [12, 28], [50, 8], [88, 28], [88, 70]];
function positions(el) {
  // 0=BTN（下方）, 1=SB, 2=BB, 3=UTG, 4=HJ, 5=CO
  const order = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];
  const pre = { UTG: 1, HJ: 2, CO: 3, BTN: 4, SB: 5, BB: 6 };
  const post = { SB: 1, BB: 2, UTG: 3, HJ: 4, CO: 5, BTN: 6 };
  let mode = 'pre', sel = 'BTN';
  const render = () => {
    const ord = mode === 'pre' ? pre : post;
    el.innerHTML = `<div class="widget-title">互動演示 · 6 人桌座位</div>
      <div class="tabs mb"><button class="tab ${mode === 'pre' ? 'active' : ''}" data-m="pre">翻牌前順序</button><button class="tab ${mode === 'post' ? 'active' : ''}" data-m="post">翻牌後順序</button></div>
      <div class="mini-table" style="width:300px;height:170px">${order.map((p, i) => `<div class="mini-seat ${p === sel ? 'hero' : ''}" data-p="${p}" style="left:${SEAT_XY[i][0]}%;top:${SEAT_XY[i][1]}%;width:50px;height:50px;cursor:pointer;flex-direction:column;display:flex;justify-content:center;line-height:1.1"><span>${p}</span><span style="font-size:13px">${ord[p]}</span></div>`).join('')}
      <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:11px;color:rgba(255,255,255,.4)">數字＝行動順序</div></div>
      <p class="center small mt"><b class="gold-text">${POS_NAMES[sel]}</b>：${POS_DESC[sel]}</p>`;
    $$('[data-m]', el).forEach(b => b.onclick = () => { mode = b.dataset.m; render(); });
    $$('[data-p]', el).forEach(b => b.onclick = () => { sel = b.dataset.p; render(); });
  };
  render();
}

// ===== 範圍建構器（點格子算組合數）=====
function rangeBuilder(el) {
  const sel = new Set();
  const render = () => {
    let combos = 0; sel.forEach(h => combos += comboCount(h));
    el.innerHTML = `<div class="widget-title">互動演示 · 範圍建構器（點擊或拖曳選取）</div>
      <div class="grid-2" style="align-items:start">
        <div>${rangeGridHTML(h => (sel.has(h) ? 'sel' : ''), { interactive: true })}</div>
        <div class="stack">
          <div class="calc-out"><div class="stat"><b>${combos}</b><span>組合數</span></div><div class="stat"><b>${pct(combos / 1326, 1)}</b><span>佔全部手牌</span></div></div>
          <p class="small muted">試試看：選取「所有口袋對」= 78 組合（5.9%）；「AK」= 16 組合（AKs 4 + AKo 12）。</p>
          <div class="row"><button class="btn btn-sm" data-preset="pairs">所有對子</button><button class="btn btn-sm" data-preset="bw">所有高張</button><button class="btn btn-sm" data-preset="utg">UTG 開池</button><button class="btn btn-sm" data-preset="btn">BTN 開池</button><button class="btn btn-sm btn-red" data-preset="clear">清除</button></div>
          <div class="small muted" data-info>將滑鼠移到格子上查看類型說明。</div>
        </div></div>`;
    const grid = $('.range-grid', el);
    let dragging = false, addMode = true;
    const toggle = cell => { const h = cell.dataset.hand; if (addMode) sel.add(h); else sel.delete(h); cell.classList.toggle('sel', addMode); };
    grid.addEventListener('pointerdown', e => { const c = e.target.closest('.rg-cell'); if (!c) return; dragging = true; addMode = !sel.has(c.dataset.hand); toggle(c); e.preventDefault(); });
    grid.addEventListener('pointerover', e => {
      const c = e.target.closest('.rg-cell'); if (!c) return;
      const cat = handCategory(c.dataset.hand);
      $('[data-info]', el).innerHTML = `<b>${c.dataset.hand}</b>（${comboCount(c.dataset.hand)} 組合）· ${cat.name}：${cat.tip}`;
      if (dragging) toggle(c);
    });
    const up = () => { if (dragging) { dragging = false; render(); } };
    window.addEventListener('pointerup', up, { once: true });
    $$('[data-preset]', el).forEach(b => b.onclick = () => {
      const p = b.dataset.preset;
      if (p === 'clear') sel.clear();
      if (p === 'pairs') ALL_HANDS.filter(h => h.length === 2).forEach(h => sel.add(h));
      if (p === 'bw') ALL_HANDS.filter(h => 'AKQJT'.includes(h[0]) && 'AKQJT'.includes(h[1])).forEach(h => sel.add(h));
      if (p === 'utg') { sel.clear(); RFI.UTG.forEach(h => sel.add(h)); }
      if (p === 'btn') { sel.clear(); RFI.BTN.forEach(h => sel.add(h)); }
      render();
    });
  };
  render();
}

// ===== RFI 圖表 =====
export function rfiCharts(el, initial = 'UTG') {
  let pos = initial;
  const render = () => {
    const set = RFI[pos];
    el.innerHTML = `<div class="widget-title">範圍表 · 首位加注（RFI）6-max 100bb</div>
      <div class="tabs mb">${['UTG', 'HJ', 'CO', 'BTN', 'SB'].map(p => `<button class="tab ${p === pos ? 'active' : ''}" data-p="${p}">${p}</button>`).join('')}</div>
      <div class="grid-2" style="align-items:start"><div>${rangeGridHTML(h => (set.has(h) ? 'raise' : ''))}</div>
      <div class="stack"><div class="calc-out"><div class="stat"><b>${pct(rangePercent(set) / 100, 1)}</b><span>開池比例</span></div><div class="stat"><b>${pos === 'SB' ? '3bb' : '2.5bb'}</b><span>開池尺度</span></div></div>
      <p class="small"><b>${POS_NAMES[pos]}</b>：${POS_DESC[pos]}</p>
      <div class="formula small" style="white-space:normal">${RFI_TEXT[pos]}</div>${LEGEND}</div></div>`;
    $$('[data-p]', el).forEach(b => b.onclick = () => { pos = b.dataset.p; render(); });
  };
  render();
}

export function defenseCharts(el) {
  let key = 'BB_vs_BTN';
  const render = () => {
    const ch = DEFENSE[key];
    const cls = h => { const a = chartAction(ch, h); return a === 'raise' ? 'threebet' : a === 'call' ? 'call' : ''; };
    const p3 = rangePercent(ch.threebet), pc = rangePercent(ch.call);
    el.innerHTML = `<div class="widget-title">範圍表 · 面對開池</div>
      <div class="tabs mb">${Object.entries(DEFENSE).map(([k, v]) => `<button class="tab ${k === key ? 'active' : ''}" data-k="${k}">${v.title}</button>`).join('')}</div>
      <div class="grid-2" style="align-items:start"><div>${rangeGridHTML(cls)}</div>
      <div class="stack"><div class="calc-out"><div class="stat"><b>${pct(p3 / 100, 1)}</b><span>3-Bet</span></div><div class="stat"><b>${pct(pc / 100, 1)}</b><span>跟注</span></div><div class="stat"><b>${pct((p3 + pc) / 100, 1)}</b><span>總防守</span></div></div>
      <p class="small muted">${key === 'BB_vs_BTN' ? '大盲已投入 1bb，賠率極佳，所以防守非常寬，連很多非同花雜牌都能跟注。3bet 採「極化」：強牌 + 有阻擋效果或可玩性的詐唬牌。' : key === 'BTN_vs_CO' ? '按鈕有位置，可以多平跟；3bet 用強牌和少量同花詐唬牌。' : '小盲面對開池時，因為後面還有大盲且翻後沒位置，常用「3bet 或棄牌」的策略。'}</p>${LEGEND}</div></div>`;
    $$('[data-k]', el).forEach(b => b.onclick = () => { key = b.dataset.k; render(); });
  };
  render();
}

// ===== Outs 示範 =====
const OUT_PRESETS = [
  { name: '同花聽牌', hero: 'Qh 8h', vill: 'Ks Jd', board: 'Kh 7h 2c', note: '剩下 9 張紅心都是 outs。注意 {2h} 會讓對手變兩對，但仍輸給你的同花。' },
  { name: '兩頭順', hero: '9s 8d', vill: 'Ac Ad', board: '7c 6h 2s', note: '任何 T 或 5 都能成順，共 8 張。' },
  { name: '卡順', hero: '9s 8d', vill: 'Jh Ts', board: 'Jc 7h 2s', note: '本來 4 張 T 都能成順，但對手手上拿走了一張 {Ts}——已知的牌會減少你的 outs。' },
  { name: '兩張高牌', hero: 'As Kd', vill: '9h 8h', board: '9c 6d 2s', note: '3 張 A + 3 張 K = 6 outs。' },
  { name: '同花＋兩頭順', hero: '9h 8h', vill: 'Ks Kd', board: '7h 6h Kc', note: '對手有暗三條！看看實際 outs 剩幾張。' },
  { name: '髒 outs', hero: 'Ah 8h', vill: '7s 7d', board: 'Kh 7h 2c', note: '同花聽牌對上暗三條：讓牌面成對的紅心會讓對手變葫蘆。' },
];
function outsDemo(el) {
  let idx = 0, revealed = false;
  const render = () => {
    const p = OUT_PRESETS[idx];
    const hero = parseCards(p.hero), vill = parseCards(p.vill), board = parseCards(p.board);
    const outs = revealed ? computeOuts(hero, vill, board) : [];
    el.innerHTML = `<div class="widget-title">互動演示 · 數 Outs</div>
      <div class="tabs mb">${OUT_PRESETS.map((x, i) => `<button class="tab ${i === idx ? 'active' : ''}" data-i="${i}">${x.name}</button>`).join('')}</div>
      <div class="grid-3" style="align-items:end"><div><div class="board-label">你</div><div class="cards">${cardsHTML(hero)}</div></div>
      <div><div class="board-label">翻牌</div><div class="cards">${cardsHTML(board)}</div></div>
      <div><div class="board-label">對手（假設已知）</div><div class="cards">${cardsHTML(vill)}</div></div></div>
      <p class="small muted mt">${rich(p.note)}</p>
      ${revealed ? `<div class="fb good"><div class="fb-head">${outs.length} 張 outs → 轉牌命中 ${pct(outs.length / 45, 1)}　·　×2 估算 ${outs.length * 2}%</div><div class="cards tight mt">${cardsHTML(outs, { cls: 'sm out' })}</div></div>`
        : `<button class="btn btn-gold btn-sm" data-r>顯示精確 outs</button>`}`;
    $$('[data-i]', el).forEach(b => b.onclick = () => { idx = +b.dataset.i; revealed = false; render(); });
    $('[data-r]', el)?.addEventListener('click', () => { revealed = true; render(); });
  };
  render();
}

// ===== 底池賠率 / MDF / Alpha =====
export function potOdds(el) {
  let pot = 100, bet = 50;
  el.innerHTML = `<div class="widget-title">互動計算 · 底池賠率、MDF 與 α</div>
      <div class="slider-row"><span style="min-width:96px">底池 <b class="mono" data-pv>${pot}</b></span><input type="range" min="10" max="300" step="5" value="${pot}" data-pot></div>
      <div class="slider-row"><span style="min-width:96px">下注 <b class="mono" data-bv>${bet}</b></span><input type="range" min="5" max="600" step="5" value="${bet}" data-bet></div>
      <div data-out></div>`;
  const render = () => {
    const req = bet / (pot + 2 * bet), mdf = pot / (pot + bet), alpha = bet / (pot + bet);
    $('[data-pv]', el).textContent = pot; $('[data-bv]', el).textContent = bet;
    $('[data-out]', el).innerHTML = `
      <p class="small muted">下注 = 底池的 <b>${(bet / pot).toFixed(2)}</b> 倍</p>
      <div class="calc-out">
        <div class="stat"><b>${pct(req, 1)}</b><span>跟注所需勝率</span></div>
        <div class="stat"><b>${pct(mdf, 1)}</b><span>MDF 最低防守</span></div>
        <div class="stat"><b>${pct(alpha, 1)}</b><span>α 詐唬需棄牌率</span></div>
        <div class="stat"><b>${pct(req, 1)}</b><span>河牌平衡詐唬比例</span></div>
      </div>
      <div class="formula small">需要勝率 = ${bet} ÷ (${pot} + ${bet} + ${bet}) = ${pct(req, 1)}<br>MDF = ${pot} ÷ (${pot} + ${bet}) = ${pct(mdf, 1)}</div>`;
  };
  $('[data-pot]', el).oninput = e => { pot = +e.target.value; render(); };
  $('[data-bet]', el).oninput = e => { bet = +e.target.value; render(); };
  render();
}

function evCalc(el) {
  let eq = 35, pot = 150, call = 50;
  const render = () => {
    const e = eq / 100;
    const ev = e * pot - (1 - e) * call;
    const req = call / (pot + call);
    const implied = e > 0 ? Math.max(0, call / e - (pot + call)) : Infinity;
    el.innerHTML = `<div class="widget-title">互動計算 · 跟注 EV 與隱含賠率</div>
      <div class="form-grid"><label>你的勝率 %<input type="number" value="${eq}" min="0" max="100" data-eq></label>
      <label>目前底池（含對手下注）<input type="number" value="${pot}" min="0" data-pot></label>
      <label>需要跟注<input type="number" value="${call}" min="1" data-call></label></div>
      <div class="calc-out"><div class="stat ${ev >= 0 ? 'good' : 'bad'}"><b>${ev >= 0 ? '+' : ''}${ev.toFixed(1)}</b><span>EV（每次平均）</span></div>
      <div class="stat"><b>${pct(req, 1)}</b><span>需要勝率</span></div>
      <div class="stat"><b>${ev >= 0 ? '—' : isFinite(implied) ? implied.toFixed(0) : '∞'}</b><span>打平需額外贏得</span></div></div>
      <p class="small muted mt">${ev >= 0 ? '這是 +EV 跟注，長期重複會賺錢。' : `直接跟注是 −EV。只有在中牌後預計能再贏到約 ${isFinite(implied) ? implied.toFixed(0) : '∞'} 時（隱含賠率），跟注才合理。`}</p>`;
    const bind = (sel, fn) => $(sel, el).onchange = e => { fn(+e.target.value || 0); render(); };
    bind('[data-eq]', v => eq = Math.min(100, Math.max(0, v)));
    bind('[data-pot]', v => pot = Math.max(0, v));
    bind('[data-call]', v => call = Math.max(1, v));
  };
  render();
}

// ===== 牌面結構辨識 =====
export function classifyFlop(f) {
  const suits = f.map(c => c & 3), ranks = f.map(c => c >> 2).sort((a, b) => b - a);
  if (suits[0] === suits[1] && suits[1] === suits[2]) return 'mono';
  if (ranks[0] === ranks[1] || ranks[1] === ranks[2]) return 'paired';
  const twoTone = new Set(suits).size === 2;
  const span = ranks[0] - ranks[2];
  const lowAce = ranks[0] === 12 ? Math.max(ranks[1], ranks[2]) + 1 : 99; // A 當 1
  const connected = span <= 4 || ranks[0] - ranks[1] <= 1 && ranks[0] >= 6 || ranks[1] - ranks[2] <= 2 && ranks[1] >= 5 || lowAce <= 4;
  if (connected && (twoTone || span <= 4)) return 'wet';
  if (twoTone && span <= 6) return 'wet';
  return 'dry';
}
const TEXTURE = {
  dry: { name: '乾燥', tip: '少聽牌、不連張。翻前加注者通常有範圍優勢 → 小注（約 1/3 池）、高頻率 C-bet。' },
  wet: { name: '濕潤', tip: '連張或兩同花，大量聽牌。下注頻率降低，下注時用較大尺度（2/3 池以上）保護並向聽牌收費。' },
  paired: { name: '成對', tip: '雙方都很難擊中。加注者可以小注高頻率下注；有三條的組合很少。' },
  mono: { name: '單一花色', tip: '三張同花色，同花已可能成形。下注要小心，持有該花色大牌（阻擋牌）很重要。' },
};
export function boardTexture(el, { drillName = 'texture' } = {}) {
  let score = 0, total = 0;
  const next = () => {
    const f = shuffle(newDeck()).slice(0, 3);
    const ans = classifyFlop(f);
    el.innerHTML = `<div class="widget-title">練習 · 判斷牌面結構 <span class="tag gold" style="margin-left:8px">${score}/${total}</span></div>
      <div class="cards" style="justify-content:center">${cardsHTML(f, { cls: 'lg' })}</div>
      <div class="actions">${Object.entries(TEXTURE).map(([k, v]) => `<button class="btn" data-k="${k}">${v.name}</button>`).join('')}</div><div data-out></div>`;
    $$('[data-k]', el).forEach(b => b.onclick = () => {
      total++;
      const ok = b.dataset.k === ans;
      if (ok) score++;
      recordDrill(drillName, ok);
      $$('[data-k]', el).forEach(x => { x.disabled = true; if (x.dataset.k === ans) x.classList.add('btn-green'); else if (x === b) x.classList.add('btn-red'); });
      $('[data-out]', el).innerHTML = `<div class="fb ${ok ? 'good' : 'bad'} mt"><div class="fb-head">${ok ? '✓' : '✗'} 這是「${TEXTURE[ans].name}」牌面</div><span class="small">${TEXTURE[ans].tip}</span>
        <div class="row mt"><button class="btn btn-gold btn-sm" data-n>下一個牌面</button></div></div>`;
      $('[data-n]', el).onclick = next;
    });
  };
  next();
}

// ===== 對手類型象限圖 =====
export const PROFILE_TYPES = [
  { key: 'nit', icon: '🪨', name: '岩石 Nit', vpip: 11, pfr: 8, color: '#9aa3ad', exploit: '多偷他的盲注；他加注或下大注時相信他，用邊緣牌棄掉。' },
  { key: 'tag', icon: '🎯', name: '緊凶 TAG', vpip: 22, pfr: 18, color: '#3fa7ff', exploit: '標準好手。避免在沒位置時和他打邊緣牌，用平衡策略應對。' },
  { key: 'lag', icon: '🔥', name: '鬆凶 LAG', vpip: 32, pfr: 26, color: '#f2994a', exploit: '放寬 4bet 和抓詐唬範圍，讓他用空氣牌下注到你的強牌。' },
  { key: 'station', icon: '📞', name: '跟注站 Station', vpip: 48, pfr: 6, color: '#3ecf8e', exploit: '絕不詐唬！價值下注要大且薄，中對子都可以拿價值。' },
  { key: 'fish', icon: '🐟', name: '鬆弱 Fish', vpip: 38, pfr: 10, color: '#56ccf2', exploit: '用隔離加注把他單獨拉進底池，有位置時大量價值下注。' },
  { key: 'maniac', icon: '🌪️', name: '瘋子 Maniac', vpip: 58, pfr: 42, color: '#ef5b5b', exploit: '收緊範圍、用中強牌抓詐唬，讓他自己把籌碼送過來。' },
];
function profiles(el) {
  let sel = 'station';
  const render = () => {
    const W = 360, H = 260, X = v => 40 + (v / 70) * (W - 60), Y = v => H - 30 - (v / 50) * (H - 50);
    const t = PROFILE_TYPES.find(p => p.key === sel);
    el.innerHTML = `<div class="widget-title">互動圖表 · VPIP（橫）× PFR（縱）</div>
      <div class="grid-2" style="align-items:center"><svg class="chart-svg" viewBox="0 0 ${W} ${H}">
        <line x1="40" y1="${H - 30}" x2="${W - 20}" y2="${H - 30}" stroke="rgba(255,255,255,.2)"/><line x1="40" y1="20" x2="40" y2="${H - 30}" stroke="rgba(255,255,255,.2)"/>
        <line x1="${X(0)}" y1="${Y(0)}" x2="${X(50)}" y2="${Y(50)}" stroke="rgba(212,175,55,.25)" stroke-dasharray="4 4"/>
        <text x="${W - 20}" y="${H - 12}" text-anchor="end">VPIP% →</text><text x="44" y="16">↑ PFR%</text>
        <text x="${X(46)}" y="${Y(48)}" fill="#d4af37">凶（PFR≈VPIP）</text><text x="${X(50)}" y="${Y(3)}">弱（只跟不加）</text>
        ${PROFILE_TYPES.map(p => `<g style="cursor:pointer" data-k="${p.key}"><circle cx="${X(p.vpip)}" cy="${Y(p.pfr)}" r="${p.key === sel ? 16 : 12}" fill="${p.color}" fill-opacity="${p.key === sel ? 0.9 : 0.35}" stroke="${p.color}"/><text x="${X(p.vpip)}" y="${Y(p.pfr) + 4}" text-anchor="middle" style="font-size:12px">${p.icon}</text></g>`).join('')}
      </svg>
      <div><h3>${t.icon} ${t.name}</h3><p class="small mono muted">VPIP ${t.vpip}% · PFR ${t.pfr}%</p><p>${t.exploit}</p><p class="small dim">點擊圖上的圓點切換類型</p></div></div>`;
    $$('[data-k]', el).forEach(g => g.onclick = () => { sel = g.dataset.k; render(); });
  };
  render();
}

// ===== 變異數模擬器 =====
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
export function variance(el) {
  let wr = 5, sd = 100, hands = 50000, runs = 12;
  const run = () => {
    const blocks = Math.round(hands / 100);
    const series = [];
    let losing = 0, worstDD = 0;
    const finals = [];
    for (let r = 0; r < runs; r++) {
      let x = 0, peak = 0, dd = 0; const data = [0];
      for (let i = 0; i < blocks; i++) { x += wr + sd * gauss(); peak = Math.max(peak, x); dd = Math.max(dd, peak - x); data.push(x); }
      if (x < 0) losing++;
      worstDD = Math.max(worstDD, dd);
      finals.push(x);
      series.push({ data, opacity: 0.55, width: 1.4 });
    }
    const ev = Array.from({ length: blocks + 1 }, (_, i) => wr * i);
    const ci = Array.from({ length: blocks + 1 }, (_, i) => 1.96 * sd * Math.sqrt(i));
    series.push({ data: ev, color: '#fff', width: 2.5, dash: '6 4' });
    series.push({ data: ev.map((v, i) => v + ci[i]), color: '#d4af37', width: 1, dash: '2 4' });
    series.push({ data: ev.map((v, i) => v - ci[i]), color: '#d4af37', width: 1, dash: '2 4' });
    const ci100 = 1.96 * sd / Math.sqrt(blocks);
    $('[data-chart]', el).innerHTML = lineChart(series, { h: 260, yLabel: '累積盈虧 (bb)' });
    $('[data-stats]', el).innerHTML = `<div class="stat"><b>${losing}/${runs}</b><span>結束時仍在虧損</span></div>
      <div class="stat bad"><b>${Math.round(worstDD)}bb</b><span>最大下風（${(worstDD / 100).toFixed(1)} 個買入）</span></div>
      <div class="stat"><b>±${ci100.toFixed(1)}</b><span>勝率 95% 信賴區間 bb/100</span></div>
      <div class="stat good"><b>${Math.round(wr * blocks)}bb</b><span>期望總獲利</span></div>`;
  };
  el.innerHTML = `<div class="widget-title">模擬器 · 變異數（每條線＝同一位玩家的平行人生）</div>
    <div class="form-grid"><label>勝率 bb/100<input type="number" step="0.5" value="${wr}" data-wr></label><label>標準差 bb/100<input type="number" value="${sd}" data-sd></label>
    <label>手數<select data-h><option>10000</option><option selected>50000</option><option>100000</option><option>200000</option></select></label>
    <label>模擬次數<input type="number" value="${runs}" min="1" max="40" data-r></label></div>
    <div class="row mt"><button class="btn btn-gold btn-sm" data-go>重新模擬</button><span class="small muted">白色虛線＝期望值，金色虛線＝95% 區間</span></div>
    <div data-chart class="mt"></div><div class="calc-out" data-stats></div>`;
  $('[data-go]', el).onclick = () => {
    wr = +$('[data-wr]', el).value || 0; sd = Math.max(1, +$('[data-sd]', el).value || 100);
    hands = +$('[data-h]', el).value; runs = Math.min(40, Math.max(1, +$('[data-r]', el).value || 12));
    run();
  };
  run();
}

// ===== 資金管理 / 破產風險 =====
export function bankroll(el) {
  el.innerHTML = `<div class="widget-title">計算器 · 破產風險（Risk of Ruin）</div>
    <div class="form-grid"><label>勝率 bb/100<input type="number" step="0.5" value="5" data-wr></label><label>標準差 bb/100<input type="number" value="100" data-sd></label>
    <label>資金（買入數，1 買入 = 100bb）<input type="number" value="30" data-bi></label></div><div class="calc-out" data-out></div><p class="small muted mt" data-note></p>`;
  const calc = () => {
    const wr = +$('[data-wr]', el).value, sd = +$('[data-sd]', el).value, bi = +$('[data-bi]', el).value;
    const B = bi * 100;
    const out = $('[data-out]', el);
    if (wr <= 0) { out.innerHTML = `<div class="stat bad"><b>100%</b><span>破產風險</span></div>`; $('[data-note]', el).textContent = '勝率 ≤ 0 時，長期一定會輸光任何資金。先提升技術，而不是增加資金。'; return; }
    const ror = Math.exp(-2 * wr * B / (sd * sd));
    const need = r => Math.ceil(-Math.log(r) * sd * sd / (2 * wr) / 100);
    out.innerHTML = `<div class="stat ${ror < 0.05 ? 'good' : 'bad'}"><b>${ror < 0.0001 ? '<0.01%' : pct(ror, 2)}</b><span>破產風險</span></div>
      <div class="stat"><b>${need(0.05)}</b><span>RoR 5% 需要買入</span></div><div class="stat"><b>${need(0.01)}</b><span>RoR 1% 需要買入</span></div>`;
    $('[data-note]', el).textContent = '注意：公式假設勝率是確定的。實際上你的真實勝率未知，而且可能因為對手變強而下降，所以實務上應該比計算結果更保守。';
  };
  $$('input', el).forEach(i => i.oninput = calc);
  calc();
}

export const WIDGETS = { handFlow, handRank: el => handRankDrill(el), positions, rangeBuilder, rfiCharts: el => rfiCharts(el), defenseCharts, outsDemo, potOdds, evCalc, boardTexture: el => boardTexture(el), profiles, variance, bankroll };
