export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export function toast(html, cls = '', ms = 2600) {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + cls;
  el.innerHTML = html;
  box.appendChild(el);
  setTimeout(() => { el.style.transition = '0.3s'; el.style.opacity = '0'; el.style.transform = 'translateX(30px)'; }, ms);
  setTimeout(() => el.remove(), ms + 350);
}

export function modal(html, { onClose } = {}) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal panel">${html}</div>`;
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); onClose?.(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(bg);
  return { el: bg.firstElementChild, close };
}

export const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';
export const bb = x => (Math.round(x * 10) / 10).toString().replace(/\.0$/, '') + ' bb';
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = arr => arr[(Math.random() * arr.length) | 0];
export const sleep = ms => new Promise(r => setTimeout(r, ms));

// 滑鼠 3D 傾斜效果
export function tilt(el, max = 8) {
  if (matchMedia('(hover: none)').matches) return;
  el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * max}deg) rotateX(${-y * max}deg) translateY(-4px)`;
  });
  el.addEventListener('mouseleave', () => { el.style.transform = ''; });
}

// 小型音效（WebAudio 合成，免外部檔案）
let actx = null;
export function sfx(type) {
  try {
    const s = JSON.parse(localStorage.getItem('acepath.v1') || '{}');
    if (s.settings && s.settings.sound === false) return;
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    const t = actx.currentTime;
    const map = { good: [660, 990, 0.12], bad: [220, 160, 0.18], chip: [1200, 800, 0.05], card: [500, 300, 0.04], win: [523, 1046, 0.3] };
    const [f1, f2, d] = map[type] || map.chip;
    o.type = type === 'bad' ? 'sawtooth' : 'triangle';
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.08);
    o.connect(g).connect(actx.destination);
    o.start(t); o.stop(t + d + 0.1);
  } catch { /* 無音效也沒關係 */ }
}

// 簡易 SVG 折線圖
export function lineChart(series, { w = 640, h = 220, pad = 34, zero = true, colors, yLabel = '' } = {}) {
  const all = series.flatMap(s => s.data);
  if (!all.length) return '<div class="empty small">尚無資料</div>';
  let min = Math.min(...all, zero ? 0 : Infinity), max = Math.max(...all, zero ? 0 : -Infinity);
  if (min === max) { min -= 1; max += 1; }
  const n = Math.max(...series.map(s => s.data.length));
  const X = i => pad + (i / Math.max(1, n - 1)) * (w - pad - 10);
  const Y = v => 10 + (1 - (v - min) / (max - min)) * (h - pad - 10);
  const cols = colors || ['#d4af37', '#3fa7ff', '#3ecf8e', '#ef5b5b', '#a57cf6'];
  let svg = `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" role="img">`;
  for (let k = 0; k <= 4; k++) {
    const v = min + (k / 4) * (max - min), y = Y(v);
    svg += `<line x1="${pad}" x2="${w - 10}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,0.06)"/><text x="${pad - 4}" y="${y + 4}" text-anchor="end">${Math.round(v)}</text>`;
  }
  if (min < 0 && max > 0) svg += `<line x1="${pad}" x2="${w - 10}" y1="${Y(0)}" y2="${Y(0)}" stroke="rgba(255,255,255,0.25)" stroke-dasharray="4 4"/>`;
  series.forEach((s, i) => {
    const step = Math.max(1, Math.floor(s.data.length / 400));
    const pts = s.data.map((v, j) => (j % step === 0 || j === s.data.length - 1 ? `${X(j).toFixed(1)},${Y(v).toFixed(1)}` : null)).filter(Boolean).join(' ');
    svg += `<polyline points="${pts}" fill="none" stroke="${s.color || cols[i % cols.length]}" stroke-width="${s.width || 2}" stroke-opacity="${s.opacity ?? 1}" stroke-linejoin="round" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''}/>`;
  });
  if (yLabel) svg += `<text x="${pad}" y="${h - 6}">${yLabel}</text>`;
  svg += '</svg>';
  return svg;
}
