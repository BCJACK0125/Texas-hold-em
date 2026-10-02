import { load, update, addXP } from '../core/store.js';
import { cardsHTML, cardHTML, cardText } from '../core/cards.js';
import { $, $$, esc, lineChart, pct, modal, toast } from '../core/ui.js';
import { LEAKS } from '../game/coach.js';
import { PROFILES } from '../game/bots.js';

const STREET_NAME = { preflop: '翻牌前', flop: '翻牌', turn: '轉牌', river: '河牌' };
const ACT = { fold: '棄牌', check: '過牌', call: '跟注', raise: '加注', sb: '小盲', bb: '大盲' };
const GRADE = { good: '好決策', ok: '可接受', bad: '錯誤' };
const LEAK_FIX = {
  'pre-loose': ['1-2', '#/ranges', '開池範圍測驗'],
  'pre-tight': ['1-2', '#/ranges', '開池範圍測驗'],
  'pre-passive': ['2-6', '#/ranges/def', '防守範圍測驗'],
  'post-callbad': ['1-5', '#/odds/full', '完整算牌決策'],
  'post-foldgood': ['2-4', '#/odds/quick', '3 秒快判'],
  'post-missvalue': ['2-3', '#/table', '實戰：魚塘桌'],
  'post-bluffstation': ['2-5', '#/table', '實戰：開啟類型標籤'],
  'post-overbluff': ['3-2', '#/lab', 'MDF 計算器'],
  'post-sizing': ['2-3', '#/lab', '下注尺度測驗'],
};
const TAGS = ['猶豫', '大底池', '冤家牌', '要討論', '詐唬', '被爆冷'];
const QUESTIONS = ['翻前：我的動作符合範圍表嗎？', '對手是什麼類型？他的範圍是什麼？', '每條街我有計畫嗎？下注是為了價值還是詐唬？', '面對下注時：我的勝率 vs 需要的勝率？', '如果重來，有沒有 EV 更高的選擇？'];

export function mount(el, [arg]) {
  let tab = arg === 'leaks' ? 'leaks' : arg === 'journal' ? 'journal' : 'hands';
  let selId = arg && !['leaks', 'journal'].includes(arg) ? arg : null;
  let filter = 'all';
  let step = null;
  let god = false;

  el.innerHTML = `<div class="page"><div class="page-head"><span class="eyebrow">Review Room · 覆盤室</span><h1>高手的差別，<span class="gold-text">在離開牌桌之後</span></h1>
    <p class="lead">逐步重播每一手牌，看教練怎麼評你的每個決策；漏洞分析幫你找出最常犯的錯；場次日誌記錄你在真實牌局的成績。</p></div>
    <div class="row mb"><div class="tabs"><button class="tab" data-t="hands">手牌覆盤</button><button class="tab" data-t="leaks">漏洞分析</button><button class="tab" data-t="journal">場次日誌</button></div>
    <span class="spacer"></span><button class="btn btn-sm" data-export>匯出備份</button><button class="btn btn-sm" data-import>匯入</button></div><div data-body></div></div>`;
  const body = $('[data-body]', el);
  const setTab = t => { tab = t; $$('[data-t]', el).forEach(b => b.classList.toggle('active', b.dataset.t === t)); ({ hands, leaks, journal })[t](); };
  $$('[data-t]', el).forEach(b => b.onclick = () => setTab(b.dataset.t));
  $('[data-export]', el).onclick = exportData;
  $('[data-import]', el).onclick = importData;

  // ================= 手牌覆盤 =================
  function hands() {
    const all = load().hands;
    if (!all.length) {
      body.innerHTML = `<div class="panel empty"><span class="big">🃏</span><p>還沒有手牌紀錄。到實戰模擬室打幾手，每一手都會自動存到這裡。</p><a class="btn btn-gold" href="#/table">前往實戰模擬室</a></div>`;
      return;
    }
    const F = {
      all: () => true, mistakes: h => h.decisions.some(d => d.grade === 'bad'), big: h => h.pot >= 30,
      won: h => h.net[0] > 0, lost: h => h.net[0] < 0, tagged: h => h.tags?.length || h.note,
    };
    const list = all.filter(F[filter]);
    if (!selId || !all.find(h => h.id === selId)) selId = list[0]?.id || all[0].id;
    body.innerHTML = `<div class="trainer-layout" style="grid-template-columns:minmax(0,0.75fr) minmax(0,1.6fr)">
      <div class="panel"><div class="row mb" style="gap:6px">${[['all', '全部'], ['mistakes', '有錯誤'], ['big', '大底池'], ['won', '贏'], ['lost', '輸'], ['tagged', '已標記']].map(([k, n]) => `<button class="btn btn-sm ${filter === k ? 'btn-gold' : ''}" data-f="${k}">${n}</button>`).join('')}</div>
        <p class="small muted">${list.length} 手 · 建議優先覆盤「有錯誤」與「大底池」</p>
        <div class="hand-list">${list.map(h => {
          const bad = h.decisions.filter(d => d.grade === 'bad').length;
          return `<div class="hand-row ${h.id === selId ? 'active' : ''}" data-id="${h.id}">
            <div class="cards tight">${cardsHTML(h.players[0].hole, { cls: 'xs no-anim' })}</div>
            <div><div class="small"><b>${h.heroPos}</b> · ${h.heroLabel} · 底池 ${h.pot}bb</div><div class="small dim">${new Date(h.ts).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}${bad ? ` · <span class="neg">${bad} 個錯誤</span>` : ''}${h.tags?.length ? ' · 🏷' : ''}</div></div>
            <div class="net ${h.net[0] >= 0 ? 'pos' : 'neg'}">${h.net[0] >= 0 ? '+' : ''}${h.net[0]}</div></div>`;
        }).join('') || '<p class="muted small">沒有符合條件的手牌</p>'}</div></div>
      <div data-replay></div></div>`;
    $$('[data-f]', body).forEach(b => b.onclick = () => { filter = b.dataset.f; hands(); });
    $$('[data-id]', body).forEach(r => r.onclick = () => { selId = r.dataset.id; step = null; history.replaceState(null, '', '#/review/' + selId); hands(); });
    replay(all.find(h => h.id === selId));
  }

  function replay(h) {
    const box = $('[data-replay]', body);
    const events = h.log.map((e, i) => ({ ...e, i }));
    const steps = events.filter(e => !['sb', 'bb'].includes(e.type));
    if (step == null || step >= steps.length) step = steps.length - 1;
    const cur = steps[step];
    const boardNow = (() => { let b = []; for (const e of events) { if (e.i > cur.i) break; if (e.type === 'deal') b = e.cards; } return b; })();
    const potNow = cur.pot ?? 0;
    const decAt = idx => h.decisions.find(d => d.idx === idx);
    const net = h.net[0];
    let html = `<div class="panel"><div class="panel-title"><h3>${h.heroPos} · ${h.heroLabel}</h3><span class="mono ${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${net}bb</span></div>
      <div class="replay-board" style="flex-direction:column;gap:10px"><div class="small" style="color:rgba(255,255,255,.6)">${STREET_NAME[cur.street]} · 底池 ${potNow}bb</div>
      <div class="cards" style="justify-content:center">${[0, 1, 2, 3, 4].map(i => boardNow[i] != null ? cardHTML(boardNow[i], { cls: 'no-anim' }) : '<div class="slot" style="width:54px;height:76px;border:1.5px dashed rgba(243,210,122,.2);border-radius:6px"></div>').join('')}</div></div>
      <div class="row mb"><button class="btn btn-sm" data-s="first">⏮</button><button class="btn btn-sm" data-s="prev">◀ 上一步</button><span class="mono small">${step + 1}/${steps.length}</span><button class="btn btn-sm btn-gold" data-s="next">下一步 ▶</button><button class="btn btn-sm" data-s="last">⏭</button>
      <span class="spacer"></span><label class="small row" style="gap:6px;cursor:pointer"><input type="checkbox" data-god ${god ? 'checked' : ''}>上帝視角（顯示所有底牌）</label></div>
      <div class="grid-3 mb" style="gap:8px">${h.players.map((p, s) => {
        const show = p.isHero || god || (h.showdown && !p.folded);
        const prof = PROFILES[p.profile];
        return `<div style="padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.25);border:1px solid ${p.isHero ? 'rgba(212,175,55,.5)' : 'var(--line-2)'}">
          <div class="small"><b>${esc(p.name)}</b> <span class="dim">${p.pos}</span> ${prof ? `<span class="small">${prof.icon}${prof.name}</span>` : ''}</div>
          <div class="row" style="gap:6px;margin-top:4px"><span class="cards tight">${show ? cardsHTML(p.hole, { cls: 'xs no-anim' }) : cardHTML(-1, { cls: 'xs no-anim' }) + cardHTML(-1, { cls: 'xs no-anim' })}</span>
          <span class="mono small ${h.net[s] >= 0 ? 'pos' : 'neg'}">${h.net[s] >= 0 ? '+' : ''}${h.net[s]}</span></div>
          ${h.showdown && h.desc[s] ? `<div class="small dim">${h.desc[s]}</div>` : ''}</div>`;
      }).join('')}</div>
      <div class="timeline">`;
    let st = '';
    steps.forEach((e, k) => {
      if (e.street !== st) { st = e.street; html += `<div class="tl-street">${STREET_NAME[st]}</div>`; }
      const d = e.type !== 'deal' ? decAt(e.i) : null;
      const who = e.type === 'deal' ? '🂠 發牌' : esc(h.players[e.seat].name) + `<span class="dim small">（${h.players[e.seat].pos}）</span>`;
      const what = e.type === 'deal' ? e.cards.slice(e.street === 'flop' ? 0 : -1).map(cardText).join(' ') : e.type === 'raise' ? `${e.isBet ? '下注' : '加注到'} ${e.to}${e.allIn ? '（全下）' : ''}` : e.type === 'call' ? `跟注 ${e.amount}${e.allIn ? '（全下）' : ''}` : ACT[e.type];
      html += `<div class="tl-step ${k === step ? 'cur' : ''} ${k > step ? 'future' : ''}" data-k="${k}">${d ? `<span class="grade-dot ${d.grade}" title="${GRADE[d.grade]}"></span>` : '<span class="grade-dot" style="background:transparent"></span>'}
        <span class="who">${who}</span><span style="flex:1">${what}
        ${d && k <= step ? `<div class="small" style="margin-top:4px;color:${d.grade === 'good' ? 'var(--green)' : d.grade === 'ok' ? 'var(--yellow)' : 'var(--red)'}">教練：${GRADE[d.grade]}${d.action !== d.best ? `（建議${({ fold: '棄牌', check: '過牌', call: '跟注', raise: '下注/加注' })[d.best]}）` : ''}</div>
          <div class="small muted">${d.reason}${d.eq != null && e.street !== 'preflop' ? ` <span class="mono">勝率 ${pct(d.eq)}${d.req ? ' / 需要 ' + pct(d.req) : ''}</span>` : ''}</div>
          ${d.notes?.length ? `<div class="small" style="color:var(--yellow)">${d.notes.join(' ')}</div>` : ''}${d.leak ? `<span class="tag red" style="margin-top:4px">${LEAKS[d.leak]}</span>` : ''}` : ''}</span></div>`;
    });
    html += `</div></div>
      <div class="grid-2 mt"><div class="panel"><h3>🏷 標記與筆記</h3><div class="row" style="gap:6px">${TAGS.map(t => `<button class="btn btn-sm ${h.tags?.includes(t) ? 'btn-gold' : ''}" data-tag="${t}">${t}</button>`).join('')}</div>
        <textarea data-note rows="4" style="width:100%;margin-top:10px" placeholder="你的想法：哪裡猶豫？對手可能拿什麼？下次怎麼打？">${esc(h.note || '')}</textarea>
        <div class="row mt"><button class="btn btn-sm btn-gold" data-save>儲存筆記</button><button class="btn btn-sm btn-red" data-del>刪除這手</button></div></div>
      <div class="panel checklist"><h3>✅ 覆盤問題清單</h3>${QUESTIONS.map((q, i) => `<label><input type="checkbox" data-q="${i}" ${h.checked?.[i] ? 'checked' : ''}> ${q}</label>`).join('')}
        <p class="small dim mt">全部勾選並寫下筆記即完成一次完整覆盤（+15 XP）。</p></div></div>`;
    box.innerHTML = html;
    const go = k => { step = Math.max(0, Math.min(steps.length - 1, k)); replay(h); };
    $$('[data-s]', box).forEach(b => b.onclick = () => go({ first: 0, prev: step - 1, next: step + 1, last: steps.length - 1 }[b.dataset.s]));
    $$('[data-k]', box).forEach(r => r.onclick = () => go(+r.dataset.k));
    $('[data-god]', box).onchange = e => { god = e.target.checked; replay(h); };
    const persist = fn => update(s => { const x = s.hands.find(y => y.id === h.id); if (x) fn(x); });
    $$('[data-tag]', box).forEach(b => b.onclick = () => {
      persist(x => { x.tags ||= []; x.tags = x.tags.includes(b.dataset.tag) ? x.tags.filter(t => t !== b.dataset.tag) : [...x.tags, b.dataset.tag]; });
      hands();
    });
    const checkDone = () => {
      const x = load().hands.find(y => y.id === h.id);
      if (x && !x.reviewed && QUESTIONS.every((_, i) => x.checked?.[i]) && x.note?.trim()) {
        persist(y => { y.reviewed = true; y.reviewedTs = Date.now(); });
        addXP(15, '完成一次完整覆盤');
      }
    };
    $('[data-save]', box).onclick = () => { const v = $('[data-note]', box).value; persist(x => { x.note = v; }); toast('📝 筆記已儲存'); checkDone(); };
    $$('[data-q]', box).forEach(c => c.onchange = () => { persist(x => { x.checked ||= {}; x.checked[c.dataset.q] = c.checked; }); checkDone(); });
    $('[data-del]', box).onclick = () => { if (!confirm('確定刪除這手牌紀錄？')) return; update(s => { s.hands = s.hands.filter(x => x.id !== h.id); }); selId = null; hands(); };
  }

  // ================= 漏洞分析 =================
  function leaks() {
    const all = load().hands;
    if (all.length < 5) {
      body.innerHTML = `<div class="panel empty"><span class="big">📊</span><p>至少需要 5 手牌紀錄才能分析（目前 ${all.length} 手）。樣本越多越準確——建議至少 100 手。</p><a class="btn btn-gold" href="#/table">去打牌</a></div>`;
      return;
    }
    const chrono = [...all].reverse();
    let cum = 0;
    const curve = [0, ...chrono.map(h => (cum = Math.round((cum + h.net[0]) * 10) / 10))];
    const net = cum;
    const vpip = all.filter(h => h.log.some(e => e.street === 'preflop' && e.seat === 0 && ['call', 'raise'].includes(e.type))).length / all.length;
    const pfr = all.filter(h => h.log.some(e => e.street === 'preflop' && e.seat === 0 && e.type === 'raise')).length / all.length;
    const decs = all.flatMap(h => h.decisions);
    const g = { good: 0, ok: 0, bad: 0 };
    decs.forEach(d => g[d.grade]++);
    const leakCount = {};
    decs.forEach(d => d.leak && (leakCount[d.leak] = (leakCount[d.leak] || 0) + 1));
    const leakList = Object.entries(leakCount).sort((a, b) => b[1] - a[1]);
    const maxLeak = leakList[0]?.[1] || 1;
    const byPos = {};
    for (const h of all) { const p = (byPos[h.heroPos] ||= { n: 0, net: 0 }); p.n++; p.net += h.net[0]; }
    const byStreet = {};
    decs.forEach(d => { const s = (byStreet[d.street] ||= { n: 0, bad: 0 }); s.n++; if (d.grade === 'bad') s.bad++; });
    const tips = [];
    if (vpip > 0.32) tips.push('你的 VPIP 偏高（>32%），翻前玩太多牌。回頭複習開池範圍表。');
    if (vpip < 0.15) tips.push('你的 VPIP 偏低（<15%），可能太緊，錯過後位偷盲的機會。');
    if (vpip > 0 && pfr / vpip < 0.6) tips.push('PFR 遠低於 VPIP，代表你常平跟而不是加注。首位入池請用加注。');
    body.innerHTML = `<div class="grid-4 mb">
      <div class="panel stat ${net >= 0 ? 'good' : 'bad'}"><b>${net >= 0 ? '+' : ''}${net}</b><span>總盈虧 bb</span></div>
      <div class="panel stat"><b>${((net / all.length) * 100).toFixed(1)}</b><span>bb/100（${all.length} 手）</span></div>
      <div class="panel stat"><b>${pct(vpip)} / ${pct(pfr)}</b><span>VPIP / PFR</span></div>
      <div class="panel stat"><b>${decs.length ? pct(g.good / decs.length) : '—'}</b><span>好決策比例（${decs.length} 個決策）</span></div></div>
      <div class="grid-2"><div class="panel"><h3>📈 盈虧曲線</h3>${lineChart([{ data: curve }], { h: 240, yLabel: '累積 bb' })}<p class="small dim">手數太少時曲線主要反映運氣。看「好決策比例」更能反映實力。</p></div>
      <div class="panel"><h3>🩺 漏洞排行</h3>${leakList.length ? leakList.map(([k, v]) => {
        const fix = LEAK_FIX[k];
        return `<div class="leak-row"><span><b>${LEAKS[k]}</b></span><span class="mono">${v} 次</span><div class="progress"><i style="width:${(v / maxLeak) * 100}%"></i></div>
          <div class="small" style="grid-column:1/-1">修正：<a href="#/academy/${fix[0]}">課程 ${fix[0]}</a> · <a href="${fix[1]}">${fix[2]}</a></div></div>`;
      }).join('') : '<p class="muted">目前沒有偵測到漏洞，繼續保持！</p>'}
      ${leakList.length ? `<div class="callout key small" style="margin-bottom:0">🎯 本週專注目標：<b>${LEAKS[leakList[0][0]]}</b>。一次只修一個漏洞效果最好。</div>` : ''}</div></div>
      <div class="grid-2 mt"><div class="panel"><h3>📍 各位置盈虧</h3><table class="data-table"><tr><th>位置</th><th>手數</th><th>盈虧 bb</th><th>bb/100</th></tr>
        ${['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'].map(p => { const x = byPos[p] || { n: 0, net: 0 }; return `<tr><td>${p}</td><td class="num">${x.n}</td><td class="num ${x.net >= 0 ? 'pos' : 'neg'}">${x.net.toFixed(1)}</td><td class="num">${x.n ? ((x.net / x.n) * 100).toFixed(0) : '—'}</td></tr>`; }).join('')}</table>
        <p class="small dim mt">理想狀態：BTN、CO 最賺；SB、BB 虧損最少。</p></div>
      <div class="panel"><h3>🧭 各街決策品質</h3><table class="data-table"><tr><th>街</th><th>決策數</th><th>錯誤率</th></tr>
        ${['preflop', 'flop', 'turn', 'river'].map(s => { const x = byStreet[s] || { n: 0, bad: 0 }; return `<tr><td>${STREET_NAME[s]}</td><td class="num">${x.n}</td><td class="num ${x.n && x.bad / x.n > 0.2 ? 'neg' : ''}">${x.n ? pct(x.bad / x.n) : '—'}</td></tr>`; }).join('')}</table>
        ${tips.length ? `<div class="callout warn small" style="margin-bottom:0">${tips.join('<br>')}</div>` : ''}</div></div>`;
  }

  // ================= 場次日誌 =================
  function journal() {
    const J = load().journal;
    const chrono = [...J].sort((a, b) => a.date.localeCompare(b.date));
    let cum = 0;
    const curve = [0, ...chrono.map(j => (cum += j.out - j.in))];
    const hours = J.reduce((s, j) => s + (+j.hours || 0), 0);
    const profit = J.reduce((s, j) => s + j.out - j.in, 0);
    body.innerHTML = `<div class="grid-2"><div class="panel"><h3>➕ 新增場次</h3><p class="small muted">記錄你在真實牌局（線上或線下）的每一場。金額單位自訂（例如元或美元）。</p>
      <form class="form-grid" data-form>
        <label>日期<input type="date" name="date" required value="${new Date().toISOString().slice(0, 10)}"></label>
        <label>類型<select name="type"><option value="cash">現金桌</option><option value="mtt">錦標賽</option><option value="sng">SNG</option><option value="live">線下現金</option></select></label>
        <label>級別<input name="stakes" placeholder="例如 NL10 / 1-2"></label>
        <label>投入（買入）<input type="number" step="any" name="in" required></label>
        <label>兌現<input type="number" step="any" name="out" required></label>
        <label>時長（小時）<input type="number" step="0.25" name="hours" value="2"></label>
        <label>心態 1-10<input type="number" min="1" max="10" name="mood" value="7"></label>
        <label style="grid-column:1/-1">筆記<input name="note" placeholder="關鍵手牌、tilt 狀況、學到什麼…"></label>
        <button class="btn btn-gold" style="grid-column:1/-1">儲存場次</button></form></div>
      <div class="panel"><h3>📒 統計</h3><div class="calc-out">
        <div class="stat ${profit >= 0 ? 'good' : 'bad'}"><b>${profit >= 0 ? '+' : ''}${Math.round(profit * 100) / 100}</b><span>總盈虧</span></div>
        <div class="stat"><b>${J.length}</b><span>場次</span></div><div class="stat"><b>${hours}</b><span>總時數</span></div>
        <div class="stat"><b>${hours ? (profit / hours).toFixed(2) : '—'}</b><span>時薪</span></div></div>
        <div class="mt">${J.length ? lineChart([{ data: curve }], { h: 200, yLabel: '資金曲線' }) : '<p class="small muted">新增第一筆場次後會顯示資金曲線。</p>'}</div>
        ${J.length >= 3 ? moodInsight(J) : ''}</div></div>
      ${J.length ? `<div class="panel mt"><table class="data-table"><tr><th>日期</th><th>類型</th><th>級別</th><th>投入</th><th>兌現</th><th>盈虧</th><th>時長</th><th>心態</th><th>筆記</th><th></th></tr>
        ${chrono.reverse().map(j => `<tr><td>${j.date}</td><td>${({ cash: '現金桌', mtt: '錦標賽', sng: 'SNG', live: '線下' })[j.type]}</td><td>${esc(j.stakes)}</td><td class="num">${j.in}</td><td class="num">${j.out}</td><td class="num ${j.out - j.in >= 0 ? 'pos' : 'neg'}">${Math.round((j.out - j.in) * 100) / 100}</td><td class="num">${j.hours}</td><td class="num">${j.mood}</td><td class="small">${esc(j.note)}</td><td><button class="btn btn-sm" data-dj="${j.id}">✕</button></td></tr>`).join('')}</table></div>` : ''}`;
    $('[data-form]', body).onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      update(s => s.journal.push({ id: Date.now().toString(36), date: f.date, type: f.type, stakes: f.stakes, in: +f.in, out: +f.out, hours: +f.hours || 0, mood: +f.mood || 0, note: f.note }));
      if (load().journal.length === 1) addXP(20, '第一次記錄場次');
      journal();
    };
    $$('[data-dj]', body).forEach(b => b.onclick = () => { update(s => { s.journal = s.journal.filter(j => j.id !== b.dataset.dj); }); journal(); });
  }

  function moodInsight(J) {
    const hi = J.filter(j => j.mood >= 7), lo = J.filter(j => j.mood && j.mood < 7);
    if (!hi.length || !lo.length) return '';
    const avg = a => a.reduce((s, j) => s + j.out - j.in, 0) / a.length;
    return `<div class="callout key small" style="margin-bottom:0">🧠 心態洞察：心態 ≥7 的場次平均盈虧 <b>${avg(hi).toFixed(1)}</b>，心態 &lt;7 的場次平均 <b>${avg(lo).toFixed(1)}</b>。${avg(hi) > avg(lo) ? '狀態不好時，考慮縮短時間或休息。' : ''}</div>`;
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(load(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `acepath-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importData() {
    const m = modal(`<h3>匯入備份</h3><p class="small muted">選擇之前匯出的 JSON 檔。這會覆蓋目前的所有進度。</p><input type="file" accept=".json,application/json" data-file><div class="row mt"><button class="btn btn-sm" data-close>取消</button></div>`);
    $('[data-file]', m.el).onchange = async e => {
      try {
        const data = JSON.parse(await e.target.files[0].text());
        if (typeof data.xp !== 'number') throw new Error('格式不正確');
        update(s => Object.assign(s, data));
        m.close(); toast('✅ 匯入成功'); setTab(tab);
      } catch (err) { toast('❌ 匯入失敗：' + err.message); }
    };
  }

  setTab(tab);
}
