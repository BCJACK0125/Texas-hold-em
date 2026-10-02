import { STAGES, ALL_LESSONS, lessonById } from '../data/lessons.js';
import { load, update, addXP } from '../core/store.js';
import { $, $$, sfx, modal } from '../core/ui.js';
import { WIDGETS, rich } from './widgets.js';

export function mount(el, [id]) {
  if (id && lessonById(id)) return lessonView(el, lessonById(id));
  overview(el);
}

function overview(el) {
  const s = load();
  const done = ALL_LESSONS.filter(l => s.lessons[l.id]?.done).length;
  el.innerHTML = `<div class="page">
    <div class="page-head"><span class="eyebrow">Academy · 學院</span><h1>從零到高手的<span class="gold-text">完整課程</span></h1>
    <p class="lead">五個階段、${ALL_LESSONS.length} 堂互動課。每堂課都有可以動手操作的範例和小測驗，學完直接到訓練室刻意練習。</p>
    <div class="row mt" style="max-width:520px"><div style="flex:1"><div class="progress"><i style="width:${(done / ALL_LESSONS.length) * 100}%"></i></div></div><span class="mono small">${done}/${ALL_LESSONS.length} 完成</span></div></div>
    <div class="callout key row mb"><span style="flex:1"><b>已經會打牌了？</b>做 8 題程度測驗（約 2 分鐘），系統會推薦你從哪個階段開始，不必從頭讀起。</span><button class="btn btn-gold btn-sm" data-placement>開始程度測驗</button><a class="btn btn-sm" href="#/glossary">術語辭典</a></div>
    <div class="stage-cards">${STAGES.map(st => {
      const d = st.lessons.filter(l => s.lessons[l.id]?.done).length;
      return `<section class="panel stage-block"><div class="stage-block-head"><div class="stage-num">${st.num}</div>
        <div style="flex:1"><span class="eyebrow">${st.en}</span><h2 style="margin:0 0 4px">${st.icon} ${st.title}</h2><p class="muted" style="margin:0">${st.desc}</p></div>
        <span class="tag ${d === st.lessons.length ? 'green' : 'gold'}">${d}/${st.lessons.length}</span></div>
        <div class="lesson-list">${st.lessons.map(l => `<a class="lesson-link ${s.lessons[l.id]?.done ? 'done' : ''}" href="#/academy/${l.id}"><span class="ln">${l.id}</span><span>${l.title}</span><span class="lmeta">${s.lessons[l.id]?.done ? '✓' : l.min + ' 分'}</span></a>`).join('')}</div></section>`;
    }).join('')}</div></div>`;
  $('[data-placement]', el).onclick = placement;
}

// 程度測驗：每階段 2 題，答錯的第一個階段就是建議起點
const PLACEMENT = [
  { st: 0, q: '同花和順子哪個大？', opts: ['順子', '同花', '一樣大'], a: 1 },
  { st: 0, q: '翻牌後誰最後行動？', opts: ['大盲', '按鈕位', '槍口位'], a: 1 },
  { st: 1, q: '底池 100，對手下注 50，跟注需要多少勝率？', opts: ['25%', '33%', '50%'], a: 0 },
  { st: 1, q: '翻牌有同花聽牌，對手全下，到河牌大約勝率？', opts: ['18%', '35%', '50%'], a: 1 },
  { st: 2, q: '牌面 {Kc}{7d}{2s}，對手 AK 有幾個組合？', opts: ['16', '12', '9'], a: 1 },
  { st: 2, q: '對手 VPIP 50%、PFR 5%，你的河牌策略？', opts: ['多詐唬他', '不詐唬、只做價值下注', '一律過牌'], a: 1 },
  { st: 3, q: '河牌下注滿池，平衡範圍中詐唬約佔？', opts: ['10%', '33%', '50%'], a: 1 },
  { st: 3, q: '打現金桌建議至少準備幾個買入？', opts: ['5～10', '30～50', '500'], a: 1 },
];
function placement() {
  let i = 0;
  const wrong = new Set();
  const m = modal('<div data-pl></div>');
  const box = $('[data-pl]', m.el);
  const step = () => {
    if (i >= PLACEMENT.length) {
      const st = [0, 1, 2, 3].find(s => wrong.has(s));
      const stage = STAGES[st ?? 4];
      const first = stage.lessons[0];
      box.innerHTML = `<span class="eyebrow">結果</span><h2>建議從「${stage.icon} ${stage.title}」開始</h2>
        <p class="muted">${st == null ? '前面的觀念你都掌握了！直接進入覆盤循環，並用實戰模擬室驗證實力。' : st === 0 ? "建議從基礎規則開始，打好地基後面會學得更快。" : `你在這個階段的觀念還有缺口。前面的階段可以快速瀏覽，或直接做隨堂測驗確認。`}</p>
        <div class="row"><a class="btn btn-gold" href="#/academy/${first.id}" data-close>前往 ${first.id} ${first.title} →</a><button class="btn" data-close>關閉</button></div>`;
      return;
    }
    const Q = PLACEMENT[i];
    box.innerHTML = `<span class="eyebrow">程度測驗 ${i + 1}/${PLACEMENT.length}</span><h3 style="margin:8px 0 14px">${rich(Q.q)}</h3>
      <div class="q-opts">${Q.opts.map((o, j) => `<button class="opt" data-j="${j}">${o}</button>`).join('')}<button class="opt dim" data-j="-1">不確定</button></div>`;
    $$('[data-j]', box).forEach(b => b.onclick = () => { if (+b.dataset.j !== Q.a) wrong.add(Q.st); i++; step(); });
  };
  step();
}

function syllabus(cur) {
  const s = load();
  return `<aside class="panel syllabus">${STAGES.map(st => `<div class="syl-stage"><h4>${st.num} · ${st.title}</h4>
    ${st.lessons.map(l => `<a class="syl-item ${l.id === cur ? 'active' : ''} ${s.lessons[l.id]?.done ? 'done' : ''}" href="#/academy/${l.id}"><span class="dot">${s.lessons[l.id]?.done ? '✓' : ''}</span>${l.title}</a>`).join('')}</div>`).join('')}</aside>`;
}

function lessonView(el, lesson) {
  const idx = ALL_LESSONS.findIndex(l => l.id === lesson.id);
  const prev = ALL_LESSONS[idx - 1], next = ALL_LESSONS[idx + 1];
  const st = lesson.stage;
  el.innerHTML = `<div class="page"><div class="academy-layout">${syllabus(lesson.id)}
    <article class="lesson">
      <a href="#/academy" class="small muted">← 全部課程</a>
      <div class="page-head mt"><span class="eyebrow">Stage ${st.num} · ${st.title} · ${lesson.id}</span><h1>${lesson.title}</h1>
      <div class="row"><span class="tag">⏱ ${lesson.min} 分鐘</span><span class="tag gold">${lesson.quiz.length} 題測驗</span>${load().lessons[lesson.id]?.done ? '<span class="tag green">✓ 已完成</span>' : ''}</div></div>
      <div class="lesson-body">${rich(lesson.body)}</div>
      <section class="quiz"><h2 style="font-size:22px">✍️ 隨堂測驗</h2><div data-quiz></div></section>
      ${lesson.practice ? `<div class="callout key row"><span style="flex:1"><b>刻意練習：</b>光看不練不會進步，馬上把這堂課變成肌肉記憶。</span><a class="btn btn-gold btn-sm" href="${lesson.practice.href}">${lesson.practice.label} →</a></div>` : ''}
      <nav class="lesson-nav">${prev ? `<a class="btn" href="#/academy/${prev.id}">← ${prev.title}</a>` : '<span></span>'}${next ? `<a class="btn btn-gold" href="#/academy/${next.id}">${next.title} →</a>` : '<a class="btn btn-gold" href="#/table">畢業了！上桌實戰 →</a>'}</nav>
    </article></div></div>`;

  $$('[data-widget]', el).forEach(w => {
    w.classList.add('widget');
    WIDGETS[w.dataset.widget]?.(w);
  });
  quiz($('[data-quiz]', el), lesson);
}

function quiz(el, lesson) {
  const answers = new Array(lesson.quiz.length).fill(null);
  el.innerHTML = lesson.quiz.map((q, i) => `<div class="q-item" data-q="${i}"><h4>${i + 1}. ${rich(q.q)}</h4>
    <div class="q-opts">${q.opts.map((o, j) => `<button class="opt" data-o="${j}">${String.fromCharCode(65 + j)}. ${rich(o)}</button>`).join('')}</div></div>`).join('') + '<div data-result></div>';
  $$('[data-q]', el).forEach(box => {
    const i = +box.dataset.q, q = lesson.quiz[i];
    $$('.opt', box).forEach(btn => btn.onclick = () => {
      if (answers[i] !== null) return;
      const j = +btn.dataset.o;
      answers[i] = j === q.a;
      sfx(answers[i] ? 'good' : 'bad');
      $$('.opt', box).forEach(b => { b.disabled = true; if (+b.dataset.o === q.a) b.classList.add('correct'); });
      if (j !== q.a) btn.classList.add('wrong');
      box.insertAdjacentHTML('beforeend', `<div class="explain">${answers[i] ? '✓ 正確。' : '✗ 不對。'}${rich(q.why)}</div>`);
      if (answers.every(a => a !== null)) finish();
    });
  });
  const finish = () => {
    const correct = answers.filter(Boolean).length;
    const first = !load().lessons[lesson.id]?.done;
    update(s => { s.lessons[lesson.id] = { done: true, score: Math.max(correct, s.lessons[lesson.id]?.score || 0), ts: Date.now() }; });
    if (first) addXP(30 + correct * 10, `完成課程 ${lesson.id}`);
    const all = correct === lesson.quiz.length;
    $('[data-result]', el).innerHTML = `<div class="fb ${all ? 'good' : 'ok'}"><div class="fb-head">${all ? '🏆 全對！' : `答對 ${correct}/${lesson.quiz.length}`}</div>
      ${all ? '你已經掌握這堂課的重點。' : '建議回頭重看錯的部分，或重新測驗。'}<div class="row mt"><button class="btn btn-sm" data-retry>重新測驗</button></div></div>`;
    $('[data-retry]', el).onclick = () => quiz(el, lesson);
    // 更新側欄狀態
    const item = document.querySelector(`.syl-item[href="#/academy/${lesson.id}"]`);
    if (item) { item.classList.add('done'); item.querySelector('.dot').textContent = '✓'; }
  };
}
