import { STAGES, ALL_LESSONS } from '../data/lessons.js';
import { load, update, addXP, today, levelInfo } from '../core/store.js';
import { $, $$, tilt, pct } from '../core/ui.js';

export function dailyTasks(s = load()) {
  const t = today();
  const tasks = s.daily.date === t ? s.daily.tasks : {};
  const odds = Object.entries(tasks).filter(([k]) => k.startsWith('odds-')).reduce((a, [, v]) => a + v, 0);
  const isToday = ts => ts && new Date(ts).toISOString().slice(0, 10) === t;
  const hands = s.hands.filter(h => isToday(h.ts)).length;
  return [
    { name: '讀一堂課', desc: '學院任選一課並完成測驗', cur: Object.values(s.lessons).filter(l => isToday(l.ts)).length, goal: 1, href: '#/academy' },
    { name: '起手牌 30 題', desc: '起手牌訓練室：開池或防守', cur: tasks.ranges || 0, goal: 30, href: '#/ranges' },
    { name: '算牌 10 題', desc: '算牌訓練室任一模式', cur: odds, goal: 10, href: '#/odds' },
    { name: '實戰 20 手', desc: '實戰模擬室，專注好決策比例', cur: hands, goal: 20, href: '#/table' },
    { name: '覆盤 1 手', desc: '勾完問題清單並寫下筆記', cur: s.hands.filter(h => isToday(h.reviewedTs)).length, goal: 1, href: '#/review' },
  ];
}

export async function mount(el) {
  const s = load();
  const next = ALL_LESSONS.find(l => !s.lessons[l.id]?.done);
  const doneCount = ALL_LESSONS.filter(l => s.lessons[l.id]?.done).length;
  const curStage = next ? next.stage.id : null;
  const tasks = dailyTasks(s);
  const allDone = tasks.every(t => t.cur >= t.goal);
  if (allDone && s.daily.bonus !== today()) { update(x => { x.daily.bonus = today(); }); addXP(50, '完成今日所有任務'); }
  const L = levelInfo(s.xp);
  const drills = Object.values(s.drills);
  const acc = drills.reduce((a, d) => a + d.correct, 0) / Math.max(1, drills.reduce((a, d) => a + d.total, 0));

  el.innerHTML = `
  <section class="lobby-hero"><canvas id="scene" aria-hidden="true"></canvas><div class="hero-fade"></div>
    <div class="hero-inner">
      <h1><span class="en">FROM ZERO TO PRO</span>從零開始，<br>練成<span class="gold-text">德州撲克高手</span></h1>
      <p class="lead">不靠運氣、不靠直覺。用範圍表、撲克數學、即時教練與覆盤循環，一步步建立真正的實力——每一個決策，都告訴你正確答案是什麼、為什麼。</p>
      <div class="hero-cta">
        <a class="btn btn-gold btn-lg" href="#/academy/${next ? next.id : '4-3'}">${doneCount ? '繼續學習' : '開始第一課'}：${next ? next.title : '你已完成全部課程'} →</a>
        <a class="btn btn-lg" href="#/table">直接上桌實戰</a>
      </div>
      <div class="hero-stats">
        <div class="stat"><b>${ALL_LESSONS.length}</b><span>互動課程</span></div>
        <div class="stat"><b>12</b><span>種刻意練習</span></div>
        <div class="stat"><b>6</b><span>種 AI 對手風格</span></div>
        <div class="stat"><b>∞</b><span>即時教練評分</span></div>
      </div>
    </div><div class="scroll-hint">SCROLL ↓</div></section>

  <section class="section"><div class="section-head"><div><span class="eyebrow">The Path · 修煉路線</span><h2>五個階段，一條清楚的路</h2></div>
    <div class="row" style="min-width:260px"><div style="flex:1"><div class="progress"><i style="width:${(doneCount / ALL_LESSONS.length) * 100}%"></i></div></div><span class="mono small">${doneCount}/${ALL_LESSONS.length}</span></div></div>
    <div class="path">${STAGES.map(st => {
      const d = st.lessons.filter(l => s.lessons[l.id]?.done).length;
      return `<a class="path-card ${st.id === curStage ? 'current' : ''}" data-num="${st.num}" href="#/academy/${(st.lessons.find(l => !s.lessons[l.id]?.done) || st.lessons[0]).id}">
        ${st.id === curStage ? '<span class="tag gold badge-now">目前進度</span>' : ''}
        <span class="icon" style="margin-top:${st.id === curStage ? '22px' : '0'}">${st.icon}</span><span class="eyebrow" style="margin:0">${st.en}</span><h3>${st.num === '0' ? '' : '第 ' + st.num + ' 階段 · '}${st.title}</h3><p>${st.desc}</p>
        <div class="progress"><i style="width:${(d / st.lessons.length) * 100}%"></i></div><span class="small dim">${d}/${st.lessons.length} 課</span></a>`;
    }).join('')}</div></section>

  <section class="section"><div class="section-head"><div><span class="eyebrow">Training Rooms · 訓練室</span><h2>學、練、打、覆盤，一站完成</h2></div></div>
    <div class="feature-grid">
      ${feature('#/academy', '📚', '學院 Academy', `${ALL_LESSONS.length} 堂互動課，從規則、範圍表、二四法則到 GTO、變異數與資金管理。每課都有可操作範例與測驗。`, '#d4af37', '理論基礎')}
      ${feature('#/ranges', '🎴', '起手牌訓練室', '6 個位置的開池與防守範圍。系統優先出邊界手牌，答錯自動進錯題本，用間隔重複背到變成反射。', '#e2574c', '每日 30 題')}
      ${feature('#/odds', '🧮', '算牌訓練室', '數 outs → 二四法則 → 底池賠率 → 跟或棄。完成後挑戰 3 秒快判、堅果辨識與牌面結構。', '#3fa7ff', '撲克數學')}
      ${feature('#/table', '♠️', '實戰模擬室', '6 人桌對戰 6 種風格 AI。教練根據對手的估計範圍算出你的真實勝率，即時評分每一個決策。', '#3ecf8e', '即時教練')}
      ${feature('#/review', '🔁', '覆盤室', '逐步重播每手牌、標記猶豫與大底池、問題清單引導思考，自動統計你的漏洞與各位置盈虧。', '#a57cf6', '找出漏洞')}
      ${feature('#/lab', '🔬', '研究室', '勝率計算器、變異數模擬器、破產風險計算、MDF 工具，以及對手分析與下注尺度情境測驗。', '#f2994a', '進階工具')}
    </div></section>

  <section class="section"><div class="section-head"><div><span class="eyebrow">Daily Training · 今日任務</span><h2>每天 30 分鐘，穩定進步</h2></div><span class="tag gold">🔥 連續 ${s.streak.count} 天</span></div>
    <div class="daily"><div class="panel">${tasks.map(t => `<a class="task ${t.cur >= t.goal ? 'done' : ''}" href="${t.href}" style="color:inherit">
      <span class="check">${t.cur >= t.goal ? '✓' : ''}</span><span style="flex:1"><span class="t-name">${t.name}</span><br><span class="t-desc">${t.desc}</span></span>
      <span class="mono small">${Math.min(t.cur, t.goal)}/${t.goal}</span></a>`).join('')}
      <p class="small dim mt" style="margin-bottom:0">${allDone ? '🎉 今日任務全部完成！' : '完成全部任務可獲得 +50 XP 獎勵。'}</p></div>
    <div class="panel"><h3>你的進度</h3><div class="row" style="gap:18px;align-items:center;margin:10px 0 18px">
      <div style="font-family:var(--display);font-size:46px;color:var(--gold-2);line-height:1">${L.index + 1}</div>
      <div style="flex:1"><b>${L.name}</b> <span class="dim small">${L.en}</span><div class="progress mt" style="margin-top:6px"><i style="width:${L.pct * 100}%"></i></div>
      <span class="small dim">${L.next ? `距離「${L.next.name}」還差 ${L.next.xp - s.xp} XP` : '已達最高等級'}</span></div></div>
      <div class="grid-2" style="gap:14px"><div class="stat"><b>${s.xp}</b><span>總經驗</span></div><div class="stat"><b>${drills.length ? pct(acc) : '—'}</b><span>訓練正確率</span></div>
      <div class="stat"><b>${s.hands.length}</b><span>實戰手數</span></div><div class="stat"><b>${doneCount}</b><span>完成課程</span></div></div>
      <a class="btn btn-sm mt" href="#/profile">查看完整進度 →</a></div></div></section>

  <section class="section"><div class="section-head"><div><span class="eyebrow">Method · 方法論</span><h2>為什麼這樣學有效</h2></div></div>
    <div class="grid-4">
      ${pill('🎯', '刻意練習', '把技能拆成小單元（範圍、算牌、讀牌），針對弱點反覆練習，而不是無目的地打牌。')}
      ${pill('⚡', '即時回饋', '每個決策馬上知道對錯與理由，比打完一場才模糊回想有效 10 倍。')}
      ${pill('🧠', '間隔重複', '錯題本讓你答錯的手牌更常出現，直到真正記住為止。')}
      ${pill('🔁', '覆盤循環', '學習 → 練習 → 實戰 → 覆盤 → 修正。高手與普通玩家的差別就在這個循環。')}
    </div></section>`;

  $$('.feature, .path-card', el).forEach(c => tilt(c, 6));

  let sceneHandle = null;
  try {
    const { createLobbyScene } = await import('../scene/lobby3d.js');
    const canvas = $('#scene', el);
    if (canvas?.isConnected) sceneHandle = createLobbyScene(canvas);
  } catch (err) {
    console.warn('3D 場景無法載入', err);
  }
  return () => sceneHandle?.dispose();
}

const feature = (href, icon, title, desc, color, meta) => `<a class="feature" href="${href}"><div class="f-glow" style="background:${color}"></div>
  <span class="f-icon">${icon}</span><h3>${title}</h3><p>${desc}</p><span class="f-meta">${meta} →</span></a>`;
const pill = (icon, t, d) => `<div class="panel"><div style="font-size:28px">${icon}</div><h3 style="margin-top:8px">${t}</h3><p class="small muted" style="margin:0">${d}</p></div>`;
