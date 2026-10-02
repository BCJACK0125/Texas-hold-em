import { newDeck, shuffle, evalHand, describeScore, cardsHTML, drawInfo } from '../core/cards.js';
import { computeOuts, exactEquity, nutsOnBoard } from '../core/equity.js';
import { addXP, recordDrill, update } from '../core/store.js';
import { $, $$, pick, randInt, pct, sfx } from '../core/ui.js';
import { handRankDrill, boardTexture } from './widgets.js';

const MODES = [
  { k: 'full', name: '完整決策', desc: '數 outs → 估勝率 → 算賠率 → 決定' },
  { k: 'quick', name: '3 秒快判', desc: '限時跟注或棄牌' },
  { k: 'potodds', name: '賠率速算', desc: '看下注算需要勝率' },
  { k: 'nuts', name: '堅果辨識', desc: '這個牌面最大的牌是？' },
  { k: 'rank', name: '比牌', desc: '誰的牌比較大' },
  { k: 'texture', name: '牌面結構', desc: '乾燥、濕潤、成對、單色' },
];

function genScenario() {
  for (let t = 0; t < 800; t++) {
    const deck = shuffle(newDeck());
    const hero = deck.splice(0, 2), vill = deck.splice(0, 2);
    const street = Math.random() < 0.6 ? 'flop' : 'turn';
    const board = deck.splice(0, street === 'flop' ? 3 : 4);
    const hs = evalHand([...hero, ...board]), vs = evalHand([...vill, ...board]);
    if (hs >= vs || vs >> 20 < 1) continue;
    const di = drawInfo(hero, board);
    if (!di.flushDraw && !di.oesd && !di.gutshot && Math.random() < 0.85) continue; // 大多出現真正的聽牌
    const outs = computeOuts(hero, vill, board);
    if (outs.length < 2 || outs.length > 17) continue;
    const allin = street === 'flop' && Math.random() < 0.35;
    const pot = randInt(3, 20) * 2;
    const frac = pick([0.33, 0.5, 0.5, 0.66, 0.75, 1, 1, 1.5]);
    const bet = Math.max(1, Math.round(pot * frac));
    const unseen = 52 - 4 - board.length;
    const exact = allin ? exactEquity(hero, vill, board).equity : outs.length / unseen;
    const mult = allin ? 4 : 2;
    const rule = outs.length * mult - (allin && outs.length > 8 ? outs.length - 8 : 0);
    const req = bet / (pot + 2 * bet);
    const draws = [di.flushDraw && '同花聽牌', di.oesd && '兩頭順聽牌', di.gutshot && '卡順聽牌'].filter(Boolean);
    return { hero, vill, board, street, allin, pot, bet, outs, exact, rule, mult, req, draws, unseen };
  }
  return genScenario();
}

export function mount(el, [initial]) {
  let mode = MODES.some(m => m.k === initial) ? initial : 'full';
  let timer = null;
  const sess = {};
  el.innerHTML = `<div class="page">
    <div class="page-head"><span class="eyebrow">Odds Room · 算牌訓練室</span><h1>3 秒內算出<span class="gold-text">該跟還是該棄</span></h1>
    <p class="lead">高手的算牌不是天賦，是重複練習。從「完整決策」開始，熟練後挑戰「3 秒快判」。情境中會假設你知道對手手牌，讓你看到最精確的答案。</p></div>
    <div class="tabs mb" data-modes>${MODES.map(m => `<button class="tab" data-mode="${m.k}" title="${m.desc}">${m.name}</button>`).join('')}</div>
    <div class="trainer-layout"><div class="panel quiz-stage" data-stage></div>
    <div class="stack"><div class="panel"><div class="panel-title"><h3>本次成績</h3><span class="tag gold" data-acc></span></div><div class="scoreboard" data-score></div></div>
    <div class="panel" data-cheat></div></div></div></div>`;
  const stage = $('[data-stage]', el);

  const score = ok => {
    const s = (sess[mode] ||= { c: 0, t: 0 });
    s.t++; if (ok) s.c++;
    recordDrill('odds-' + mode, ok);
    renderScore();
  };
  const renderScore = () => {
    const s = sess[mode] || { c: 0, t: 0 };
    $('[data-score]', el).innerHTML = `<div class="stat good"><b>${s.c}</b><span>答對</span></div><div class="stat"><b>${s.t}</b><span>總題數</span></div>`;
    $('[data-acc]', el).textContent = s.t ? `正確率 ${pct(s.c / s.t)}` : MODES.find(m => m.k === mode).desc;
  };

  const CHEAT = `<h3>📋 速查表</h3><table class="data-table"><tr><th>聽牌</th><th>Outs</th><th>×2</th><th>×4</th></tr>
    <tr><td>卡順</td><td class="num">4</td><td class="num">8%</td><td class="num">16%</td></tr>
    <tr><td>兩張高牌</td><td class="num">6</td><td class="num">12%</td><td class="num">24%</td></tr>
    <tr><td>兩頭順</td><td class="num">8</td><td class="num">16%</td><td class="num">32%</td></tr>
    <tr><td>同花聽牌</td><td class="num">9</td><td class="num">18%</td><td class="num">35%</td></tr>
    <tr><td>同花+卡順</td><td class="num">12</td><td class="num">24%</td><td class="num">45%</td></tr>
    <tr><td>同花+兩頭</td><td class="num">15</td><td class="num">30%</td><td class="num">54%</td></tr></table>
    <table class="data-table mt"><tr><th>下注/底池</th><th>需要勝率</th></tr>
    <tr><td>1/3</td><td class="num">20%</td></tr><tr><td>1/2</td><td class="num">25%</td></tr><tr><td>2/3</td><td class="num">28.6%</td></tr><tr><td>3/4</td><td class="num">30%</td></tr><tr><td>1</td><td class="num">33.3%</td></tr><tr><td>1.5</td><td class="num">37.5%</td></tr></table>`;

  function setMode(m) {
    mode = m; clearInterval(timer);
    history.replaceState(null, '', '#/odds/' + m);
    $$('[data-mode]', el).forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    $('[data-cheat]', el).innerHTML = CHEAT;
    renderScore();
    ({ full, quick, potodds, nuts, rank: () => { stage.innerHTML = '<div></div>'; handRankDrill(stage.firstChild, { drillName: 'odds-rank' }); }, texture: () => { stage.innerHTML = '<div></div>'; boardTexture(stage.firstChild, { drillName: 'odds-texture' }); } })[m]();
  }
  $$('[data-mode]', el).forEach(b => b.onclick = () => setMode(b.dataset.mode));

  const scenarioHead = sc => `
    <div class="row" style="justify-content:center;gap:40px;align-items:flex-end">
      <div><div class="board-label">你的手牌</div><div class="cards">${cardsHTML(sc.hero, { cls: 'lg' })}</div></div>
      <div><div class="board-label">${sc.street === 'flop' ? '翻牌' : '轉牌'}</div><div class="cards">${cardsHTML(sc.board, { cls: 'lg' })}</div></div>
      <div><div class="board-label">對手（假設已知）</div><div class="cards">${cardsHTML(sc.vill, { cls: 'sm' })}</div></div></div>
    <div class="scenario-info mt"><div class="stat"><b>${sc.pot}</b><span>底池（下注前）</span></div><div class="stat"><b style="color:var(--raise)">${sc.bet}</b><span>${sc.allin ? '對手全下' : '對手下注'}</span></div>
    <div class="stat"><b>${sc.pot + sc.bet}</b><span>目前底池</span></div></div>
    <p class="small muted">${sc.allin ? '對手全下：你跟注後會看到轉牌和河牌（用 ×4）' : `只考慮${sc.street === 'flop' ? '轉牌' : '河牌'}這一張牌（用 ×2）`}</p>`;

  // ===== 完整決策 =====
  function full() {
    const sc = genScenario();
    let step = 0; const res = [];
    const steps = [
      { q: '你有幾張 outs？', unit: '張', check: v => (v === sc.outs.length ? 'good' : Math.abs(v - sc.outs.length) <= 1 ? 'ok' : 'bad'),
        explain: () => `精確 outs = <b>${sc.outs.length}</b> 張${sc.draws.length ? `（你有：${sc.draws.join('、')}）` : ''}。下方綠框就是這些牌。${sc.outs.length < 9 && sc.draws.includes('同花聽牌') ? ' 有些同花牌其實是「髒 outs」，會同時幫助對手。' : ''}`, showOuts: true },
      { q: `用二四法則估算勝率（${sc.mult === 4 ? '×4' : '×2'}）`, unit: '%', check: v => (Math.abs(v - sc.rule) <= 3 || Math.abs(v - sc.exact * 100) <= 3 ? 'good' : Math.abs(v - sc.exact * 100) <= 7 ? 'ok' : 'bad'),
        explain: () => `${sc.outs.length} × ${sc.mult}${sc.mult === 4 && sc.outs.length > 8 ? ` − (${sc.outs.length} − 8)` : ''} ≈ <b>${sc.rule}%</b>；精確值 <b>${pct(sc.exact, 1)}</b>${sc.allin ? '（列舉所有轉牌＋河牌）' : `（${sc.outs.length} / ${sc.unseen} 張未知牌）`}。` },
      { q: '跟注需要多少勝率？', unit: '%', check: v => (Math.abs(v - sc.req * 100) <= 2 ? 'good' : Math.abs(v - sc.req * 100) <= 5 ? 'ok' : 'bad'),
        explain: () => `需要勝率 = ${sc.bet} ÷ (${sc.pot} + ${sc.bet} + ${sc.bet}) = <b>${pct(sc.req, 1)}</b>` },
    ];
    const render = () => {
      const done = step >= steps.length;
      stage.innerHTML = `<div class="steps">${[0, 1, 2, 3].map(i => `<i class="${i < step ? 'done' : i === step ? 'on' : ''}"></i>`).join('')}</div>${scenarioHead(sc)}
        <div data-hist style="text-align:left">${res.map(r => `<div class="fb ${r.grade} mt"><div class="fb-head">${r.grade === 'good' ? '✓' : r.grade === 'ok' ? '≈' : '✗'} ${r.q}　你答：${r.v}${r.unit}</div><span class="small">${r.text}</span>${r.outs ? `<div class="cards tight mt">${cardsHTML(sc.outs, { cls: 'xs out' })}</div>` : ''}</div>`).join('')}</div>
        ${!done ? `<p class="big-q mt">${steps[step].q}</p><div class="numpad-row"><input type="number" inputmode="decimal" data-in placeholder="?"><span>${steps[step].unit}</span><button class="btn btn-gold" data-go>確認</button></div>`
          : `<p class="big-q mt">最後：跟注還是棄牌？</p><div class="actions"><button class="btn btn-lg" data-d="fold">棄牌</button><button class="btn btn-lg btn-blue" data-d="call">跟注</button></div>`}<div data-final></div>`;
      const inp = $('[data-in]', stage);
      if (inp) {
        inp.focus();
        const go = () => {
          if (inp.value === '') return;
          const v = +inp.value, s = steps[step], g = s.check(v);
          res.push({ q: s.q, v, unit: s.unit, grade: g, text: s.explain(), outs: s.showOuts });
          sfx(g === 'bad' ? 'bad' : 'good');
          step++; render();
        };
        $('[data-go]', stage).onclick = go;
        inp.onkeydown = e => { if (e.key === 'Enter') go(); };
      }
      $$('[data-d]', stage).forEach(b => b.onclick = () => {
        const diff = sc.exact - sc.req;
        const correct = diff >= 0 ? 'call' : 'fold';
        const close = Math.abs(diff) < 0.02;
        const ok = b.dataset.d === correct || close;
        const allGood = ok && res.every(r => r.grade !== 'bad');
        score(ok);
        sfx(ok ? 'good' : 'bad');
        if (allGood) addXP(8, '完整算牌決策');
        $$('[data-d]', stage).forEach(x => { x.disabled = true; if (x.dataset.d === correct) x.classList.add('btn-green'); });
        const ev = sc.exact * (sc.pot + sc.bet) - (1 - sc.exact) * sc.bet;
        $('[data-final]', stage).innerHTML = `<div class="fb ${ok ? 'good' : 'bad'} mt" style="text-align:left"><div class="fb-head">${ok ? '✓ 正確決策' : '✗ 決策錯誤'}：應該${correct === 'call' ? '跟注' : '棄牌'}${close ? '（非常邊緣，兩者都可接受）' : ''}</div>
          勝率 ${pct(sc.exact, 1)} ${diff >= 0 ? '≥' : '<'} 需要 ${pct(sc.req, 1)}。跟注的 EV ≈ <b class="${ev >= 0 ? 'pos' : 'neg'}">${ev >= 0 ? '+' : ''}${ev.toFixed(1)}</b>
          ${!sc.allin && diff < 0 && diff > -0.1 ? '<br><span class="small muted">💡 差距不大：如果對手籌碼很深、中牌後能再贏不少（隱含賠率），實戰中跟注也可能合理。</span>' : ''}
          <div class="small muted mt">攤牌參考：你 ${describeScore(evalHand([...sc.hero, ...sc.board]))}，對手 ${describeScore(evalHand([...sc.vill, ...sc.board]))}</div></div>
          <button class="btn btn-gold mt" data-n>下一題 →</button>`;
        $('[data-n]', stage).onclick = full;
      });
    };
    render();
  }

  // ===== 3 秒快判 =====
  function quick() {
    clearInterval(timer);
    const sc = genScenario();
    const LIMIT = 8000;
    stage.innerHTML = `${scenarioHead(sc)}<div class="timer-bar"><i data-tb style="width:100%"></i></div>
      <div class="actions"><button class="btn btn-lg" data-d="fold">棄牌 F</button><button class="btn btn-lg btn-blue" data-d="call">跟注 C</button></div><div data-final></div>`;
    const t0 = Date.now();
    let done = false;
    const decide = d => {
      if (done) return; done = true; clearInterval(timer);
      const diff = sc.exact - sc.req, correct = diff >= 0 ? 'call' : 'fold';
      const ok = d === correct || (d !== 'timeout' && Math.abs(diff) < 0.02);
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      score(ok); sfx(ok ? 'good' : 'bad');
      if (ok && secs <= 3) update(s => { s.xp += 3; });
      $$('[data-d]', stage).forEach(x => { x.disabled = true; if (x.dataset.d === correct) x.classList.add('btn-green'); });
      $('[data-final]', stage).innerHTML = `<div class="fb ${ok ? 'good' : 'bad'} mt" style="text-align:left"><div class="fb-head">${d === 'timeout' ? '⏱ 超時' : ok ? `✓ 正確（${secs} 秒）` : '✗ 錯誤'}：應該${correct === 'call' ? '跟注' : '棄牌'}</div>
        ${sc.outs.length} outs × ${sc.mult} ≈ ${sc.rule}%（精確 ${pct(sc.exact, 1)}）vs 需要 ${pct(sc.req, 1)}<div class="cards tight mt">${cardsHTML(sc.outs, { cls: 'xs out' })}</div></div>
        <button class="btn btn-gold mt" data-n>下一題（空白鍵）</button>`;
      $('[data-n]', stage).onclick = quick;
    };
    $$('[data-d]', stage).forEach(b => b.onclick = () => decide(b.dataset.d));
    timer = setInterval(() => {
      const left = 1 - (Date.now() - t0) / LIMIT;
      const tb = $('[data-tb]', stage); if (tb) tb.style.width = Math.max(0, left * 100) + '%';
      if (left <= 0) decide('timeout');
    }, 50);
    stage._decide = decide;
  }

  // ===== 賠率速算 =====
  function potodds() {
    const pot = randInt(2, 40) * 5;
    const frac = pick([0.25, 0.33, 0.5, 0.6, 0.66, 0.75, 1, 1.25, 1.5, 2]);
    const bet = Math.max(5, Math.round(pot * frac / 5) * 5);
    const req = bet / (pot + 2 * bet);
    const askMdf = Math.random() < 0.3;
    const ans = askMdf ? pot / (pot + bet) : req;
    const opts = new Set([Math.round(ans * 100)]);
    while (opts.size < 4) { const d = Math.round(ans * 100 + pick([-15, -10, -8, -5, 5, 8, 10, 15])); if (d > 2 && d < 98) opts.add(d); }
    const list = [...opts].sort((a, b) => a - b);
    stage.innerHTML = `<div class="scenario-info"><div class="stat"><b>${pot}</b><span>底池</span></div><div class="stat"><b style="color:var(--raise)">${bet}</b><span>對手下注</span></div></div>
      <p class="big-q mt">${askMdf ? '你的最低防守頻率（MDF）是？' : '跟注需要多少勝率？'}</p>
      <div class="actions">${list.map(v => `<button class="btn btn-lg" data-v="${v}">${v}%</button>`).join('')}</div><div data-final></div>`;
    $$('[data-v]', stage).forEach(b => b.onclick = () => {
      const ok = +b.dataset.v === Math.round(ans * 100);
      score(ok); sfx(ok ? 'good' : 'bad');
      if (ok) update(s => { s.xp += 1; });
      $$('[data-v]', stage).forEach(x => { x.disabled = true; if (+x.dataset.v === Math.round(ans * 100)) x.classList.add('btn-green'); else if (x === b) x.classList.add('btn-red'); });
      $('[data-final]', stage).innerHTML = `<div class="fb ${ok ? 'good' : 'bad'} mt"><div class="formula" style="margin:0">${askMdf ? `MDF = ${pot} ÷ (${pot} + ${bet}) = ${pct(ans, 1)}` : `需要勝率 = ${bet} ÷ (${pot} + ${bet} + ${bet}) = ${pct(ans, 1)}`}</div>
        <p class="small muted mt" style="margin:8px 0 0">下注 = ${(bet / pot).toFixed(2)} 倍底池</p></div><button class="btn btn-gold mt" data-n>下一題</button>`;
      $('[data-n]', stage).onclick = potodds;
    });
  }

  // ===== 堅果辨識 =====
  function nuts() {
    const n = pick([3, 4, 5, 5]);
    const board = shuffle(newDeck()).slice(0, n);
    const deck = newDeck(board);
    const scores = new Map();
    for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) {
      const s = evalHand([deck[i], deck[j], ...board]);
      if (!scores.has(s)) scores.set(s, [deck[i], deck[j]]);
    }
    const sorted = [...scores.keys()].sort((a, b) => b - a);
    const ansScore = sorted[0];
    // 干擾選項：描述不同的前幾名
    const seen = new Set([describeScore(ansScore)]);
    const opts = [ansScore];
    for (const s of sorted.slice(1)) { const d = describeScore(s); if (!seen.has(d)) { seen.add(d); opts.push(s); } if (opts.length >= 4) break; }
    const shuffled = shuffle([...opts]);
    stage.innerHTML = `<div class="board-label">${n === 3 ? '翻牌' : n === 4 ? '轉牌' : '河牌'}</div><div class="cards" style="justify-content:center">${cardsHTML(board, { cls: 'lg' })}</div>
      <p class="big-q mt">這個牌面的堅果（最大可能牌）是？</p>
      <div class="q-opts" style="max-width:460px;margin:0 auto">${shuffled.map(s => `<button class="opt" data-s="${s}">${describeScore(s)}</button>`).join('')}</div><div data-final></div>`;
    $$('[data-s]', stage).forEach(b => b.onclick = () => {
      const ok = +b.dataset.s === ansScore;
      score(ok); sfx(ok ? 'good' : 'bad');
      if (ok) update(s => { s.xp += 2; });
      $$('[data-s]', stage).forEach(x => { x.disabled = true; if (+x.dataset.s === ansScore) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); });
      const nutCombos = nutsOnBoard(board).combos;
      $('[data-final]', stage).innerHTML = `<div class="fb ${ok ? 'good' : 'bad'} mt"><div class="fb-head">堅果：${describeScore(ansScore)}</div>
        <span class="small">例如：</span><div class="cards tight mt" style="justify-content:center">${nutCombos.slice(0, 4).map(c => `<span class="cards tight" style="margin-right:10px">${cardsHTML(c, { cls: 'xs' })}</span>`).join('')}</div>
        <p class="small muted mt" style="margin-bottom:0">${n < 5 ? '注意：翻牌、轉牌的堅果會隨後續發牌改變。' : '河牌的堅果是確定的，你持有它就不可能輸。'} 先看能否成同花順 → 四條/葫蘆（牌面成對？）→ 同花（三張同花色？）→ 順子。</p></div>
        <button class="btn btn-gold mt" data-n>下一題</button>`;
      $('[data-n]', stage).onclick = nuts;
    });
  }

  const onKey = e => {
    if (e.target.matches('input, textarea, select')) return;
    if (mode === 'quick') {
      const k = e.key.toLowerCase();
      if (k === 'f') stage._decide?.('fold');
      if (k === 'c') stage._decide?.('call');
      if (k === ' ') { const n = $('[data-n]', stage); if (n) { e.preventDefault(); n.click(); } }
    }
  };
  document.addEventListener('keydown', onKey);
  setMode(mode);
  return () => { clearInterval(timer); document.removeEventListener('keydown', onKey); };
}
