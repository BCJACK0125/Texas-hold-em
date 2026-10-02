import { load, subscribe, levelInfo } from './core/store.js';
import { toast, sfx } from './core/ui.js';

const ROUTES = {
  '': () => import('./views/lobby.js'),
  academy: () => import('./views/academy.js'),
  ranges: () => import('./views/ranges.js'),
  odds: () => import('./views/odds.js'),
  table: () => import('./views/table.js'),
  review: () => import('./views/review.js'),
  lab: () => import('./views/lab.js'),
  profile: () => import('./views/profile.js'),
  glossary: () => import('./views/glossary.js'),
};

const app = document.getElementById('app');
let cleanup = null;
let navToken = 0;

async function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [name, ...params] = hash.split('/');
  const key = ROUTES[name] ? name : '';
  const token = ++navToken;
  document.querySelectorAll('#mainnav a').forEach(a => a.classList.toggle('active', (a.dataset.route === 'lobby' ? '' : a.dataset.route) === key));
  try {
    const mod = await ROUTES[key]();
    if (token !== navToken) return;
    document.querySelectorAll('.modal-bg').forEach(m => m.remove());
    if (typeof cleanup === 'function') cleanup();
    cleanup = null;
    app.innerHTML = '';
    window.scrollTo(0, 0);
    cleanup = await mod.mount(app, params.map(decodeURIComponent));
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="page"><div class="panel"><h2>載入失敗</h2><p class="muted">${String(err.message || err)}</p><a class="btn" href="#/">回到大廳</a></div></div>`;
  }
}

function renderChip(s) {
  const L = levelInfo(s.xp);
  document.getElementById('lvlNum').textContent = L.index + 1;
  document.getElementById('lvlName').textContent = L.name;
  document.getElementById('lvlXp').textContent = `${s.xp} XP`;
  document.getElementById('lvlRing').style.strokeDashoffset = String(97.4 * (1 - L.pct));
  document.body.classList.toggle('two-color', !s.settings.fourColor);
}

window.addEventListener('xp', e => {
  const { n, reason, leveled } = e.detail;
  toast(`<span>✦</span><span>${reason || '獲得經驗'}</span><b>+${n} XP</b>`);
  if (leveled) {
    sfx('win');
    setTimeout(() => toast(`<span>🏆</span><span>升級！你現在是 <b>${leveled.name}</b>（${leveled.en}）</span>`, 'level', 4200), 400);
  }
});

subscribe(renderChip);
renderChip(load());
window.addEventListener('hashchange', route);
route();
