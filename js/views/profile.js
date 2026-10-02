import { load, update, levelInfo, LEVELS, resetAll } from '../core/store.js';
import { STAGES, ALL_LESSONS } from '../data/lessons.js';
import { $, pct, toast } from '../core/ui.js';

const DRILL_NAMES = {
  ranges: '起手牌範圍', 'odds-full': '完整算牌決策', 'odds-quick': '3 秒快判', 'odds-potodds': '賠率速算', 'odds-nuts': '堅果辨識',
  'odds-rank': '比牌', 'odds-texture': '牌面結構', handrank: '比牌（課程）', texture: '牌面結構（課程）', profile: '對手分析', sizing: '下注尺度',
};

export function mount(el) {
  const render = () => {
    const s = load();
    const L = levelInfo(s.xp);
    const done = ALL_LESSONS.filter(l => s.lessons[l.id]?.done).length;
    el.innerHTML = `<div class="page"><div class="page-head"><span class="eyebrow">Profile · 我的進度</span><h1>${L.name} <span class="dim" style="font-size:.5em;font-family:var(--display)">${L.en}</span></h1>
      <div class="row" style="max-width:560px"><div style="flex:1"><div class="progress"><i style="width:${L.pct * 100}%"></i></div></div><span class="mono small">${s.xp} XP</span></div></div>
      <div class="grid-2"><div class="panel"><h3>🏅 等級之路</h3><table class="data-table">${LEVELS.map((lv, i) => `<tr style="${i === L.index ? 'background:rgba(212,175,55,.08)' : ''}"><td>${i <= L.index ? '✓' : ''}</td><td><b>${lv.name}</b> <span class="dim small">${lv.en}</span></td><td class="num">${lv.xp} XP</td></tr>`).join('')}</table></div>
      <div class="panel"><h3>📚 課程完成度</h3>${STAGES.map(st => { const d = st.lessons.filter(l => s.lessons[l.id]?.done).length; return `<div class="leak-row"><span>${st.icon} ${st.title}</span><span class="mono small">${d}/${st.lessons.length}</span><div class="progress"><i style="width:${d / st.lessons.length * 100}%;background:linear-gradient(90deg,var(--gold-3),var(--gold-2))"></i></div></div>`; }).join('')}
        <p class="small muted">總計 ${done}/${ALL_LESSONS.length} 課</p></div></div>
      <div class="panel mt"><h3>🎯 訓練紀錄</h3>${Object.keys(s.drills).length ? `<table class="data-table"><tr><th>項目</th><th>題數</th><th>正確率</th><th>最長連對</th></tr>
        ${Object.entries(s.drills).map(([k, d]) => `<tr><td>${DRILL_NAMES[k] || k}</td><td class="num">${d.total}</td><td class="num ${d.correct / d.total >= 0.85 ? 'pos' : d.correct / d.total < 0.6 ? 'neg' : ''}">${pct(d.correct / d.total)}</td><td class="num">${d.best}</td></tr>`).join('')}</table>
        <p class="small dim mt">目標：每個項目正確率穩定在 85% 以上，起手牌範圍 95% 以上。</p>` : '<p class="muted">尚未開始訓練。</p>'}</div>
      <div class="panel mt"><h3>⚙️ 設定</h3>
        <label class="row" style="cursor:pointer"><input type="checkbox" data-four ${s.settings.fourColor ? 'checked' : ''}> 四色牌（♦ 藍、♣ 綠，線上常用，較不易看錯花色）</label>
        <label class="row" style="cursor:pointer"><input type="checkbox" data-sound ${s.settings.sound ? 'checked' : ''}> 音效</label>
        <div class="row mt"><a class="btn btn-sm" href="#/review/journal">匯出 / 匯入備份（覆盤室）</a><button class="btn btn-sm btn-red" data-reset>重置所有進度</button></div>
        <p class="small dim mt">所有資料只儲存在你這台裝置的瀏覽器中。換裝置或清除瀏覽器資料前，請先匯出備份。</p></div></div>`;
    $('[data-four]', el).onchange = e => update(x => { x.settings.fourColor = e.target.checked; });
    $('[data-sound]', el).onchange = e => update(x => { x.settings.sound = e.target.checked; });
    $('[data-reset]', el).onclick = () => { if (confirm('確定要清除所有進度、手牌與日誌嗎？此動作無法復原。')) { resetAll(); toast('已重置'); render(); } };
  };
  render();
}
