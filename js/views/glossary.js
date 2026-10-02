import { $, $$, esc } from '../core/ui.js';
import { rich } from './widgets.js';

// [術語, 英文, 分類, 解釋, 相關課程]
const TERMS = [
  ['大盲 / 小盲', 'BB / SB', '基礎', '每手牌開始前強制下注的兩個位置。本站金額都以 bb（大盲）為單位。', '0-1'],
  ['底牌', 'Hole Cards', '基礎', '只有你看得到的 2 張牌。', '0-1'],
  ['公共牌', 'Board', '基礎', '桌面上所有人共用的牌：翻牌 3 張、轉牌 1 張、河牌 1 張。', '0-1'],
  ['踢腳', 'Kicker', '基礎', '同牌型時用來比大小的剩餘高牌。例如 {As}{Kd} 和 {Ah}{Qc} 在 A 高牌面上，K 踢腳贏。', '0-2'],
  ['堅果', 'Nuts', '基礎', '在目前牌面上最大的可能手牌。', '0-2'],
  ['位置', 'Position', '基礎', '翻牌後越晚行動越有利（IP = 有位置，OOP = 沒位置）。', '1-3'],
  ['UTG / HJ / CO / BTN', 'Positions', '基礎', '6 人桌由前到後的位置：槍口、劫持、關煞、按鈕。', '0-3'],
  ['開池', 'RFI / Open', '翻前', '前面所有人棄牌時，第一個加注入池。', '1-2'],
  ['平跟', 'Limp', '翻前', '翻前只跟大盲不加注。第一個入池時平跟通常是錯誤。', '1-2'],
  ['3-Bet / 4-Bet', '3-Bet', '翻前', '對開池再加注稱 3-Bet（大盲算第一注、開池算第二注），再加注為 4-Bet。', '2-6'],
  ['隔離加注', 'Isolate', '翻前', '有人平跟時加注，目的是和弱玩家單挑。尺度 = 開池 + 每位平跟者 1bb。', '2-5'],
  ['套三條', 'Set Mining', '翻前', '用小對子跟注，只為了翻牌中三條（約 12%）。需要足夠的隱含賠率。', '1-6'],
  ['被支配', 'Dominated', '翻前', '和對手共享一張牌但踢腳較小，例如 AQ vs AK，只剩約 26% 勝率。', '1-1'],
  ['範圍', 'Range', '思維', '對手在某情況下所有可能手牌的集合。高手思考範圍，不猜單一手牌。', '2-1'],
  ['組合數', 'Combos', '思維', '一種手牌有幾種花色組合：對子 6、同花 4、非同花 12。', '2-1'],
  ['阻擋牌', 'Blocker', '思維', '你手上的牌減少對手持有某些組合的可能。例如拿 A 會減少對手的 AA、AK。', '2-1'],
  ['Outs', 'Outs', '數學', '發出來會讓你變成最大牌的剩餘牌。', '1-4'],
  ['二四法則', 'Rule of 2 and 4', '數學', '一張牌勝率 ≈ outs×2%；翻牌全下到河牌 ≈ outs×4%。', '1-4'],
  ['底池賠率', 'Pot Odds', '數學', '跟注所需勝率 = 跟注 ÷ 跟注後總底池。', '1-5'],
  ['期望值', 'EV', '數學', '同一決策重複無限次的平均盈虧。+EV 代表長期賺錢。', '1-5'],
  ['隱含賠率', 'Implied Odds', '數學', '中牌後預期還能從對手身上贏到的額外籌碼。', '1-6'],
  ['勝率 / 權益', 'Equity', '數學', '如果直接攤牌到底，你平均能分到的底池比例。', '1-5'],
  ['MDF', 'Minimum Defense Frequency', '數學', '最低防守頻率 = 底池 ÷ (底池 + 下注)。守得比這少，對手任何牌詐唬都賺錢。', '2-4'],
  ['Alpha (α)', 'Alpha', '數學', '詐唬需要對手棄牌的比例 = 下注 ÷ (底池 + 下注)。', '2-3'],
  ['SPR', 'Stack-to-Pot Ratio', '數學', '翻牌時有效籌碼 ÷ 底池。越低越容易用一對打光籌碼。', '2-3'],
  ['持續下注', 'C-bet', '翻後', '翻前加注者在翻牌繼續下注。', '2-2'],
  ['價值下注', 'Value Bet', '翻後', '希望比你差的牌跟注的下注。', '2-3'],
  ['薄價值', 'Thin Value', '翻後', '用中等牌力對更弱的牌下小注拿價值。', '2-3'],
  ['詐唬 / 半詐唬', 'Bluff / Semi-bluff', '翻後', '詐唬：希望更好的牌棄牌。半詐唬：用有 outs 的聽牌詐唬。', '2-3'],
  ['乾燥 / 濕潤牌面', 'Dry / Wet Board', '翻後', '乾燥：少聽牌（K72 彩虹）。濕潤：連張、同花、聽牌多（JT8 兩同花）。', '2-2'],
  ['範圍優勢', 'Range Advantage', '翻後', '在某牌面上整體牌力較強的一方，通常可以小注高頻下注。', '2-2'],
  ['極化 / 線性', 'Polarized / Linear', '翻後', '極化：只用強牌和詐唬下注；線性：用最強的一段連續牌下注。', '2-6'],
  ['VPIP', 'Voluntarily Put $ In Pot', 'HUD', '主動投錢入池的比例，衡量玩得鬆或緊。', '2-5'],
  ['PFR', 'Preflop Raise', 'HUD', '翻前加注比例。PFR 接近 VPIP = 凶；差距大 = 被動。', '2-5'],
  ['AF', 'Aggression Factor', 'HUD', '(下注 + 加注) ÷ 跟注，衡量翻後主動性。', '2-5'],
  ['WTSD', 'Went To Showdown', 'HUD', '看到翻牌後走到攤牌的比例。高 = 愛跟到底，不容易被詐唬。', '2-5'],
  ['跟注站', 'Calling Station', '對手', '什麼都跟、很少棄牌的玩家。對他不要詐唬，只做價值下注。', '2-5'],
  ['岩石 / 緊弱', 'Nit', '對手', '只玩極強牌的玩家。偷他的盲注，他下大注時相信他。', '2-5'],
  ['緊凶 / 鬆凶', 'TAG / LAG', '對手', '緊凶：牌少但打得凶，標準好手。鬆凶：牌多又凶，壓力大。', '2-5'],
  ['GTO', 'Game Theory Optimal', '理論', '無法被剝削的平衡策略，來自納許均衡。', '3-1'],
  ['剝削', 'Exploit', '理論', '偏離平衡、針對對手漏洞賺更多的打法。', '3-1'],
  ['Solver', 'Solver', '理論', '計算 GTO 策略的軟體，例如 PioSolver、GTO Wizard。', '3-1'],
  ['無差異原則', 'Indifference', '理論', '平衡的下注讓對手跟注和棄牌的 EV 一樣。', '3-2'],
  ['變異數', 'Variance', '資金', '短期結果和期望值的差距。撲克的變異數非常大。', '3-3'],
  ['bb/100', 'Win Rate', '資金', '每 100 手平均贏幾個大盲，衡量勝率的標準單位。', '3-3'],
  ['買入', 'Buy-in', '資金', '坐上一張桌子所需的籌碼，現金桌通常是 100bb。', '3-4'],
  ['資金管理', 'Bankroll Management', '資金', '依資金大小選擇級別：現金桌 30～50 個買入、錦標賽 100+。', '3-4'],
  ['上頭', 'Tilt', '心態', '因情緒而偏離最佳策略。設定停損、休息是最好的解藥。', '3-5'],
  ['漏洞', 'Leak', '覆盤', '一再重複、讓你虧錢的錯誤模式。', '4-2'],
  ['覆盤', 'Hand Review', '覆盤', '牌局後重新檢視關鍵手牌，找出更好的打法。', '4-2'],
];

export function mount(el) {
  const cats = [...new Set(TERMS.map(t => t[2]))];
  let q = '', cat = '全部';
  el.innerHTML = `<div class="page"><div class="page-head"><span class="eyebrow">Glossary · 術語辭典</span><h1>看懂撲克<span class="gold-text">的每一個詞</span></h1>
    <p class="lead">${TERMS.length} 個常用術語，附上對應課程。忘記意思時隨時回來查。</p></div>
    <div class="row mb"><input data-q placeholder="搜尋：例如 SPR、底池、跟注站…" style="flex:1;min-width:220px"></div>
    <div class="tabs mb" data-cats>${['全部', ...cats].map(c => `<button class="tab" data-c="${c}">${c}</button>`).join('')}</div>
    <div class="grid-2" data-list></div></div>`;
  const render = () => {
    $$('[data-c]', el).forEach(b => b.classList.toggle('active', b.dataset.c === cat));
    const k = q.trim().toLowerCase();
    const list = TERMS.filter(t => (cat === '全部' || t[2] === cat) && (!k || (t[0] + t[1] + t[3]).toLowerCase().includes(k)));
    $('[data-list]', el).innerHTML = list.map(([zh, en, c, d, l]) => `<div class="panel"><div class="panel-title" style="margin-bottom:6px"><h3>${esc(zh)} <span class="dim small mono">${esc(en)}</span></h3><span class="tag">${c}</span></div>
      <p style="margin:0 0 8px">${rich(d)}</p><a class="small" href="#/academy/${l}">相關課程 ${l} →</a></div>`).join('') || '<div class="empty panel">找不到相關術語</div>';
  };
  $('[data-q]', el).oninput = e => { q = e.target.value; render(); };
  $$('[data-c]', el).forEach(b => b.onclick = () => { cat = b.dataset.c; render(); });
  render();
}
