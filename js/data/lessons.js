// 課程內容。語法：[[As Kh]] → 大張牌列；{As} → 行內小牌；<div data-widget="名稱"></div> → 互動元件
export const STAGES = [
  {
    id: 's0', num: '0', icon: '🃏', title: '新手村', en: 'FOUNDATIONS',
    desc: '規則、牌型、一手牌的流程與座位。零基礎從這裡開始。',
    lessons: [
      {
        id: '0-1', title: '德州撲克怎麼玩', min: 6,
        body: `
<p>德州撲克（No-Limit Texas Hold'em）每人拿 <strong>2 張底牌</strong>，桌面最多發出 <strong>5 張公共牌</strong>。攤牌時，用自己 2 張 + 公共 5 張共 7 張中「最好的 5 張」比大小。</p>
<h2>一手牌的四輪下注</h2>
<table><tr><th>階段</th><th>發牌</th><th>重點</th></tr>
<tr><td>翻牌前 Preflop</td><td>每人 2 張底牌</td><td>大盲左手邊（UTG）先行動</td></tr>
<tr><td>翻牌 Flop</td><td>3 張公共牌</td><td>從按鈕左邊第一位仍在牌局的玩家先行動</td></tr>
<tr><td>轉牌 Turn</td><td>第 4 張</td><td>下注通常變大，牌力更清楚</td></tr>
<tr><td>河牌 River</td><td>第 5 張</td><td>最後一輪，之後攤牌比大小</td></tr></table>
<div data-widget="handFlow"></div>
<h2>你可以做的動作</h2>
<ul>
<li><strong>棄牌 Fold</strong>：放棄這手牌，不再投入籌碼。</li>
<li><strong>過牌 Check</strong>：沒人下注時，不投入籌碼並把行動交給下一位。</li>
<li><strong>跟注 Call</strong>：投入和目前最高下注相同的籌碼。</li>
<li><strong>下注 Bet / 加注 Raise</strong>：主動投入更多籌碼，逼對手做決定。</li>
<li><strong>全下 All-in</strong>：押上所有籌碼。無限注（No-Limit）代表你隨時可以全下。</li>
</ul>
<div class="callout key"><b class="c-title">🔑 盲注與 bb</b>每手牌開始前，按鈕左邊兩位強制下注：小盲（SB）與大盲（BB）。本站所有金額都以「bb（大盲注）」為單位，例如 100bb 代表你有 100 個大盲的籌碼。這讓不同級別的牌局能用同一把尺比較。</div>
<p>如果大家都棄牌，最後一位下注的人直接贏得底池，<strong>不需要亮牌</strong>——這就是「詐唬」能成立的原因。</p>`,
        quiz: [
          { q: '攤牌時，牌力怎麼計算？', opts: ['只看自己的兩張底牌', '7 張牌（2 底牌 + 5 公共牌）中最好的 5 張', '5 張公共牌加上任 1 張底牌', '所有 7 張牌都要用到'], a: 1, why: '從 7 張中挑最好的 5 張組合，底牌可以用 0、1 或 2 張。' },
          { q: '翻牌（Flop）會發出幾張公共牌？', opts: ['1 張', '2 張', '3 張', '5 張'], a: 2, why: '翻牌一次發 3 張，轉牌、河牌各發 1 張。' },
          { q: '「100bb」代表什麼？', opts: ['100 元', '100 個大盲注的籌碼', '100 手牌', '底池上限'], a: 1, why: 'bb = big blind。用 bb 當單位，不同級別的策略可以直接比較。' },
        ],
      },
      {
        id: '0-2', title: '牌型大小與比牌', min: 7,
        body: `
<p>由大到小共 9 種牌型。<strong>越難湊到的牌型越大</strong>。</p>
<table><tr><th>牌型</th><th>範例</th><th>7 張牌出現機率</th></tr>
<tr><td>同花順 Straight Flush</td><td>[[9h 8h 7h 6h 5h]]</td><td>0.03%</td></tr>
<tr><td>四條 Four of a Kind</td><td>[[Qs Qh Qd Qc 4s]]</td><td>0.17%</td></tr>
<tr><td>葫蘆 Full House</td><td>[[Js Jh Jd 7c 7s]]</td><td>2.6%</td></tr>
<tr><td>同花 Flush</td><td>[[Ad Td 8d 4d 2d]]</td><td>3.0%</td></tr>
<tr><td>順子 Straight</td><td>[[Ts 9h 8d 7c 6s]]</td><td>4.6%</td></tr>
<tr><td>三條 Three of a Kind</td><td>[[7s 7h 7d Kc 2s]]</td><td>4.8%</td></tr>
<tr><td>兩對 Two Pair</td><td>[[Ks Kh 5d 5c 9s]]</td><td>23.5%</td></tr>
<tr><td>一對 One Pair</td><td>[[As Ah Jd 8c 3s]]</td><td>43.8%</td></tr>
<tr><td>高牌 High Card</td><td>[[As Qh 9d 6c 3s]]</td><td>17.4%</td></tr></table>
<div class="callout tip"><b class="c-title">💡 常見誤區</b>
<ul><li>花色<strong>沒有大小</strong>，完全相同牌力就平分底池。</li>
<li>A 可以當最小組成 <strong>A-2-3-4-5（輪子順）</strong>，但不能「繞彎」組成 Q-K-A-2-3。</li>
<li>同牌型比較時看<strong>踢腳（Kicker）</strong>：一對 A 帶 K 贏一對 A 帶 Q。</li></ul></div>
<h2>練習：誰的牌比較大？</h2>
<div data-widget="handRank"></div>`,
        quiz: [
          { q: '同花和葫蘆哪個大？', opts: ['同花', '葫蘆', '一樣大', '看花色'], a: 1, why: '葫蘆（三條＋一對）比同花更難湊成，所以更大。' },
          { q: '公共牌 {Ah} {Kd} {7s} {7c} {2h}，你拿 {As} {3c}，對手拿 {Ad} {Qc}，結果？', opts: ['你贏', '對手贏（他的 Q 踢腳比較大）', '平分', '無法判斷'], a: 2, why: '陷阱題！雙方最佳 5 張都是 A-A-7-7-K（K 來自公共牌）。對手的 Q 比公共牌的 K 小，根本用不上，所以平分底池。' },
          { q: '以下哪個是合法的順子？', opts: ['Q-K-A-2-3', 'A-2-3-4-5', 'J-Q-K-A-2', '以上皆是'], a: 1, why: 'A 可當最小（輪子順 A-5）或最大（T-A），但不能繞彎。' },
        ],
      },
      {
        id: '0-3', title: '座位與行動順序', min: 5,
        body: `
<p>本站以線上最常見的 <strong>6 人桌（6-max）</strong> 為主。按鈕（Dealer Button）每手往左移一位，所以每個人輪流坐過每個位置。</p>
<div data-widget="positions"></div>
<table><tr><th>位置</th><th>英文</th><th>翻前順序</th><th>翻後順序</th></tr>
<tr><td>槍口位</td><td>UTG (Under the Gun)</td><td>第 1</td><td>第 3</td></tr>
<tr><td>劫持位</td><td>HJ (Hijack)</td><td>第 2</td><td>第 4</td></tr>
<tr><td>關煞位</td><td>CO (Cutoff)</td><td>第 3</td><td>第 5</td></tr>
<tr><td>按鈕位</td><td>BTN (Button)</td><td>第 4</td><td><strong>最後</strong></td></tr>
<tr><td>小盲</td><td>SB (Small Blind)</td><td>第 5</td><td><strong>最先</strong></td></tr>
<tr><td>大盲</td><td>BB (Big Blind)</td><td>最後</td><td>第 2</td></tr></table>
<div class="callout key"><b class="c-title">🔑 關鍵觀念</b>翻牌後，<strong>按鈕位永遠最後行動</strong>。最後行動代表你能先看到所有人怎麼做再決定——這就是「位置優勢」，我們會在第一階段深入。</div>`,
        quiz: [
          { q: '翻牌後誰最後行動？', opts: ['大盲 BB', '槍口 UTG', '按鈕 BTN', '小盲 SB'], a: 2, why: '翻牌後從按鈕左邊開始行動，按鈕永遠最後。' },
          { q: '翻牌前誰第一個行動？', opts: ['小盲', '大盲', 'UTG（大盲左邊）', '按鈕'], a: 2, why: '翻牌前盲注已經下了，從大盲左手邊的 UTG 開始。' },
        ],
      },
    ],
  },
  {
    id: 's1', num: 'I', icon: '📐', title: '打底期', en: 'MATH & POSITION',
    desc: '背熟起手牌表、內化二四法則與底池賠率、理解位置優勢。目標：不犯低級錯誤。',
    lessons: [
      {
        id: '1-1', title: '為什麼要玩得緊：169 種起手牌', min: 7,
        body: `
<p>新手最大的漏洞只有一個：<strong>玩太多牌</strong>。兩張底牌共有 1,326 種組合，依點數和是否同花可歸納成 <strong>169 種</strong>起手牌。</p>
<table><tr><th>類型</th><th>例子</th><th>每種有幾個組合</th><th>種類數</th></tr>
<tr><td>口袋對 Pair</td><td>{As}{Ah}</td><td>6</td><td>13</td></tr>
<tr><td>同花 Suited (s)</td><td>{Ks}{Qs}</td><td>4</td><td>78</td></tr>
<tr><td>非同花 Offsuit (o)</td><td>{Ks}{Qd}</td><td>12</td><td>78</td></tr></table>
<div class="formula">13×6 + 78×4 + 78×12 = 78 + 312 + 936 = 1,326 組合</div>
<p>下面這張 13×13 網格就是撲克玩家的「地圖」：<strong>對角線是口袋對、右上是同花、左下是非同花</strong>。點擊格子可以看到組合數。</p>
<div data-widget="rangeBuilder"></div>
<h2>幾個你必須知道的翻前對決</h2>
<table><tr><th>對決</th><th>大約勝率</th><th>教訓</th></tr>
<tr><td>{Qs}{Qh} vs {As}{Kd}</td><td>57% : 43%</td><td>「擲硬幣」——對子略領先兩張高牌</td></tr>
<tr><td>{Ks}{Kh} vs {7c}{7d}</td><td>82% : 18%</td><td>大對壓小對</td></tr>
<tr><td>{As}{Kd} vs {Ah}{Qc}</td><td>74% : 26%</td><td><strong>被支配（Dominated）</strong>：共享一張牌、踢腳較小</td></tr>
<tr><td>{Jh}{Th} vs {As}{Kd}</td><td>38% : 62%</td><td>同花連張不如想像中強</td></tr></table>
<div class="callout warn"><b class="c-title">⚠️ 被支配是隱形殺手</b>像 {Ad}{7c}、{Kh}{9s} 這類牌，中了頂對也常輸給 AK、AQ、KQ。這就是為什麼「好像不錯」的非同花牌在前位要棄掉。</div>`,
        quiz: [
          { q: '{As}{Kh} 這種非同花牌有幾個組合？', opts: ['4', '6', '12', '16'], a: 2, why: '非同花：4 × 3 = 12 個組合（同花 4 個，對子 6 個）。' },
          { q: 'AQo 對上 AKo 時，AQ 為什麼很慘？', opts: ['花色比較小', '被支配：共享 A、踢腳較小，只剩約 26% 勝率', '因為位置', '其實很接近'], a: 1, why: '共享一張相同大牌，踢腳小的一方大約只剩 1/4 勝率。' },
          { q: '口袋對子在網格的哪裡？', opts: ['右上半部', '左下半部', '對角線', '第一列'], a: 2, why: '對角線是 AA、KK ... 22；右上是同花，左下是非同花。' },
        ],
        practice: { href: '#/ranges', label: '去起手牌訓練室' },
      },
      {
        id: '1-2', title: '開池範圍表（RFI）', min: 8,
        body: `
<p>RFI = Raise First In：前面所有人都棄牌時，你第一個加注入池。這是你最常遇到的翻前決策，<strong>必須做到不假思索</strong>。</p>
<div data-widget="rfiCharts"></div>
<h2>各位置開池比例（6-max, 100bb）</h2>
<table><tr><th>位置</th><th>大約開池%</th><th>開池尺度</th></tr>
<tr><td>UTG</td><td>~15%</td><td>2.5bb</td></tr>
<tr><td>HJ</td><td>~19%</td><td>2.5bb</td></tr>
<tr><td>CO</td><td>~27%</td><td>2.5bb</td></tr>
<tr><td>BTN</td><td>~44%</td><td>2.5bb</td></tr>
<tr><td>SB</td><td>~40%</td><td>3bb</td></tr></table>
<h2>怎麼背最有效？</h2>
<ol><li><strong>先背邊界，不背全部</strong>：例如「UTG 同花 A 全開、非同花只開 AJ 以上」。</li>
<li><strong>從緊到鬆疊加</strong>：HJ = UTG + 幾手牌，CO = HJ + ……，每個位置只要記差異。</li>
<li><strong>用間隔重複練習</strong>：訓練室會把你答錯的手牌記進「錯題本」，之後更常出現。</li>
<li><strong>只用加注或棄牌</strong>：第一個入池時不要平跟（Limp），平跟讓你失去主動權。</li></ol>
<div class="callout tip"><b class="c-title">💡 這是教學簡化版</b>真正的 GTO 解答在邊緣牌會用「混合頻率」（例如 50% 加注、50% 棄牌）。初學者先用「純策略」記住大方向，誤差非常小。</div>`,
        quiz: [
          { q: '哪個位置的開池範圍最寬？', opts: ['UTG', 'CO', 'BTN', 'BB'], a: 2, why: 'BTN 後面只剩兩個盲注，且翻牌後永遠有位置，可以開到 40% 以上。' },
          { q: '在 UTG 拿到 {Kh}{To}（KTo），該怎麼做？', opts: ['加注', '平跟', '棄牌', '全下'], a: 2, why: 'KTo 在前位容易被 AK、KQ、KJ 支配，UTG 只開 KQo 以上的非同花 K。' },
          { q: '前面全部棄牌，第一個入池時應該？', opts: ['平跟最安全', '加注或棄牌', '一律全下', '過牌'], a: 1, why: '首位入池用加注：有機會直接拿下盲注，也保有翻牌後主動權。' },
        ],
        practice: { href: '#/ranges', label: '練習開池範圍' },
      },
      {
        id: '1-3', title: '位置就是金錢', min: 6,
        body: `
<p>同一手牌，在按鈕位比在槍口位值錢得多。原因有三：</p>
<ol><li><strong>資訊優勢</strong>：你看到對手先行動（過牌通常代表弱）再決定。</li>
<li><strong>控制底池</strong>：想便宜看牌可以過牌，想打大可以下注。</li>
<li><strong>更容易實現勝率（Equity Realization）</strong>：不利位置的玩家常常被迫棄掉本來有勝率的牌。</li></ol>
<div class="callout key"><b class="c-title">🔑 數據說話</b>在幾乎所有玩家的長期數據中，<strong>BTN 是最賺錢的位置，盲注位是唯二長期虧損的位置</strong>（因為被強制下注且翻後沒有位置）。好玩家的目標是讓盲注「少輸一點」。</div>
<h2>實戰準則</h2>
<ul><li>投機牌（同花連張、小對子）<strong>在後位玩</strong>，在前位多半棄掉。</li>
<li>面對加注時，有位置可以多平跟；沒位置時傾向「3bet 或棄牌」。</li>
<li>大盲已經投入 1bb，面對小加注能獲得好賠率，所以防守範圍很寬（第二階段會學 MDF）。</li></ul>
<div data-widget="positions"></div>`,
        quiz: [
          { q: '為什麼小盲雖然翻前倒數第二個行動，卻是不好的位置？', opts: ['因為只投 0.5bb', '因為翻牌後永遠第一個行動', '因為不能加注', '因為看不到底牌'], a: 1, why: '翻牌後 SB 永遠最先行動，四條街都處在資訊劣勢。' },
          { q: '投機牌（例如 {7s}{6s}）最適合在哪裡玩？', opts: ['UTG', '後位（CO/BTN）', '任何位置都一樣', '只在大盲'], a: 1, why: '投機牌很少直接成大牌，需要位置來便宜看牌、在擊中時榨取價值。' },
        ],
      },
      {
        id: '1-4', title: '補牌（Outs）與二四法則', min: 9,
        body: `
<p><strong>Outs</strong> = 剩下的牌中，發出來會讓你變成最大牌的那些牌。數出 outs，就能在 3 秒內估算勝率。</p>
<h2>常見聽牌的 outs</h2>
<table><tr><th>聽牌</th><th>Outs</th><th>例子</th></tr>
<tr><td>同花聽牌</td><td>9</td><td>{Ah}{8h} 在 {Kh}{7h}{2c}</td></tr>
<tr><td>兩頭順子聽牌（OESD）</td><td>8</td><td>{9s}{8d} 在 {7c}{6h}{2s}</td></tr>
<tr><td>卡順（Gutshot）</td><td>4</td><td>{9s}{8d} 在 {Jc}{7h}{2s}</td></tr>
<tr><td>兩張高牌</td><td>6</td><td>{As}{Kd} 在 {9c}{6h}{2s}（對手一對）</td></tr>
<tr><td>同花 + 兩頭順</td><td>15</td><td>{9h}{8h} 在 {7h}{6h}{Kc}</td></tr>
<tr><td>暗三條 → 葫蘆/四條</td><td>7（翻牌）</td><td>對手已有順子時</td></tr></table>
<h2>二四法則</h2>
<div class="formula">只看下一張牌：勝率 ≈ outs × 2 %<br>翻牌全下、看到河牌：勝率 ≈ outs × 4 %</div>
<table><tr><th>Outs</th><th>×2 估算</th><th>實際（一張）</th><th>×4 估算</th><th>實際（兩張）</th></tr>
<tr><td>4</td><td>8%</td><td>8.5%</td><td>16%</td><td>16.5%</td></tr>
<tr><td>8</td><td>16%</td><td>17.0%</td><td>32%</td><td>31.5%</td></tr>
<tr><td>9</td><td>18%</td><td>19.1%</td><td>36%</td><td>35.0%</td></tr>
<tr><td>12</td><td>24%</td><td>25.5%</td><td>48%</td><td>45.0%</td></tr>
<tr><td>15</td><td>30%</td><td>31.9%</td><td>60%</td><td>54.1%</td></tr></table>
<div class="callout tip"><b class="c-title">💡 修正技巧</b>outs 超過 8 張時，×4 會高估。用「outs×4 − (outs−8)」更準：15 outs → 60−7 = 53%。</div>
<div class="callout warn"><b class="c-title">⚠️ 髒 outs（Dirty Outs）</b>不是每張「補牌」都讓你贏。例如你聽同花，但牌面成對，對手有暗三條——同花牌如果同時讓牌面成對，對手會變葫蘆。訓練室的 outs 是用電腦<strong>精確計算</strong>出「發出後你真的領先」的牌。</div>
<div data-widget="outsDemo"></div>`,
        quiz: [
          { q: '翻牌時你有同花聽牌（9 outs），對手全下。到河牌的大約勝率？', opts: ['9%', '18%', '35%', '50%'], a: 2, why: '翻牌全下要看兩張牌，用 ×4：9×4=36%，實際約 35%。' },
          { q: '兩頭順子聽牌有幾個 outs？', opts: ['4', '6', '8', '9'], a: 2, why: '兩端各 4 張，共 8 張。' },
          { q: '轉牌時有 4 個 outs（卡順），河牌命中機率大約？', opts: ['4%', '8%', '16%', '25%'], a: 1, why: '只剩一張牌，用 ×2：4×2=8%（實際 4/46 ≈ 8.7%）。' },
        ],
        practice: { href: '#/odds', label: '去算牌訓練室' },
      },
      {
        id: '1-5', title: '底池賠率與期望值 EV', min: 9,
        body: `
<p>知道勝率還不夠，你還要知道「<strong>需要多少勝率才值得跟注</strong>」。這就是底池賠率（Pot Odds）。</p>
<div class="formula">需要勝率 = 跟注金額 ÷ （跟注後的總底池）<br>= 跟注 ÷ （原底池 + 對手下注 + 你的跟注）</div>
<p>例：底池 100，對手下注 50。你要跟 50，跟注後總底池 = 100 + 50 + 50 = 200。需要勝率 = 50 / 200 = <strong>25%</strong>。</p>
<h2>把下注尺度背成勝率門檻</h2>
<table><tr><th>對手下注</th><th>需要勝率</th><th>MDF（第二階段）</th></tr>
<tr><td>1/4 底池</td><td>16.7%</td><td>80%</td></tr>
<tr><td>1/3 底池</td><td>20%</td><td>75%</td></tr>
<tr><td>1/2 底池</td><td>25%</td><td>66.7%</td></tr>
<tr><td>2/3 底池</td><td>28.6%</td><td>60%</td></tr>
<tr><td>3/4 底池</td><td>30%</td><td>57%</td></tr>
<tr><td>1 倍底池</td><td>33.3%</td><td>50%</td></tr>
<tr><td>2 倍底池</td><td>40%</td><td>33.3%</td></tr></table>
<div data-widget="potOdds"></div>
<h2>期望值（EV）：撲克唯一的記分板</h2>
<div class="formula">EV(跟注) = 勝率 × 能贏的底池 − 敗率 × 跟注金額</div>
<p>例：勝率 35%，底池（含對手下注）150，跟注 50 → EV = 0.35×150 − 0.65×50 = 52.5 − 32.5 = <strong>+20</strong>。這代表同樣情況重複一萬次，平均每次賺 20。</p>
<div class="callout key"><b class="c-title">🔑 決策流程（3 秒內完成）</b>① 數 outs → ② 二四法則估勝率 → ③ 算需要勝率 → ④ 勝率 &gt; 需要 = 跟注；勝率 &lt; 需要 = 棄牌（除非有隱含賠率）。</div>
<div data-widget="evCalc"></div>`,
        quiz: [
          { q: '底池 60，對手下注 60（滿池）。你需要多少勝率才能跟注？', opts: ['25%', '33%', '50%', '60%'], a: 1, why: '60 / (60+60+60) = 33.3%。滿池下注永遠需要 1/3 勝率。' },
          { q: '你有 20% 勝率，對手下注半池。應該？', opts: ['跟注', '棄牌（需要 25%）', '一定加注', '都一樣'], a: 1, why: '半池需要 25%，20% 不夠，除非之後能贏到額外籌碼（隱含賠率）。' },
          { q: 'EV 為正代表什麼？', opts: ['這手一定會贏', '長期重複這個決策平均會賺錢', '對手在詐唬', '應該全下'], a: 1, why: 'EV 是長期平均，單一手牌的輸贏受運氣影響。' },
        ],
        practice: { href: '#/odds', label: '練習完整算牌決策' },
      },
      {
        id: '1-6', title: '隱含賠率與反隱含賠率', min: 6,
        body: `
<p>底池賠率只算「現在」的底池。但如果你中了聽牌，對手常常會在後面的街<strong>再付錢給你</strong>——這就是<strong>隱含賠率（Implied Odds）</strong>。</p>
<div class="formula">跟注打平所需的未來收益 X = 跟注 ÷ 勝率 − （底池 + 跟注）</div>
<p>例：底池 100，對手下注 50，你有卡順（約 8.5%）。需要 X = 50 / 0.085 − 200 ≈ <strong>388</strong>。也就是說中牌後要從對手身上再贏約 4 倍底池——通常不可能，所以卡順多半要棄。</p>
<h2>什麼時候隱含賠率好？</h2>
<ul><li>籌碼夠深（對手後面還有很多籌碼）。</li>
<li>你的聽牌<strong>很隱蔽</strong>（例如小對子中暗三條，對手猜不到）。</li>
<li>對手是會付錢的人（跟注站）。</li></ul>
<h2>反隱含賠率（Reverse Implied Odds）</h2>
<p>中了牌卻輸更多：例如你用 {Kh}{Jc} 中了頂對 K，但對手有 AK——你會在後面的街付出很多。<strong>被支配的牌、非堅果聽牌（小同花）</strong>都有嚴重的反隱含賠率。</p>
<div class="callout key"><b class="c-title">🔑 小對子的「15 倍法則」</b>小對子翻牌中三條機率約 12%（約 1/8）。經驗法則：跟注金額不應超過<strong>雙方較短籌碼的 1/15～1/20</strong>，才有足夠隱含賠率去「套三條」（Set Mining）。</div>`,
        quiz: [
          { q: '下列哪個情況隱含賠率最好？', opts: ['對手只剩 5bb', '深籌碼、對手是跟注站、你拿小對子', '河牌面對下注', '你聽小同花、牌面已有三張同花色'], a: 1, why: '深籌碼 + 會付錢的對手 + 隱蔽的牌 = 高隱含賠率。' },
          { q: '對手加注到 3bb，你 22 想套三條。雙方籌碼至少要多深比較合理？', opts: ['10bb', '20bb', '45bb 以上', '無所謂'], a: 2, why: '15 倍法則：3bb × 15 = 45bb，籌碼越深越好。' },
        ],
      },
    ],
  },
  {
    id: 's2', num: 'II', icon: '🎯', title: '進階期', en: 'RANGES & EXPLOITS',
    desc: '範圍思維、牌面結構、下注尺度、大盲防守、對手類型。開始剝削對手。',
    lessons: [
      {
        id: '2-1', title: '範圍思維：不要猜「一手牌」', min: 9,
        body: `
<p>新手問：「他是不是有 AK？」高手問：「他在這個位置、做了這些動作，<strong>可能的所有手牌是哪些？各佔多少？</strong>」</p>
<h2>範圍會隨著每個動作縮小</h2>
<ol><li><strong>翻前</strong>：UTG 開池 → 他的範圍大概是那 15% 的牌。</li>
<li><strong>翻牌</strong> {Kc}{7d}{2s} 他下注 → 包含 K 的牌、口袋對、一些詐唬。</li>
<li><strong>轉牌</strong> {4h} 他再下大注 → 大多是 AK/KQ 以上或暗三條，詐唬比例下降。</li></ol>
<h2>組合數（Combos）：範圍的計數器</h2>
<p>只要算組合數，就能知道對手「價值牌 vs 詐唬」的比例。</p>
<table><tr><th>手牌類型</th><th>未見牌時</th><th>牌面有一張該點數</th></tr>
<tr><td>口袋對 (如 KK)</td><td>6</td><td>3</td></tr>
<tr><td>非對子 (如 AK)</td><td>16</td><td>12</td></tr></table>
<p>例：牌面 {Kc}{7d}{2s}。對手的「暗三條」只有 KK(3)+77(3)+22(3) = 9 組，但 AK 就有 12 組、KQ 有 12 組。<strong>不要每次都怕對手有三條</strong>。</p>
<div class="callout key"><b class="c-title">🔑 阻擋牌（Blockers）</b>你手上的牌會減少對手的組合。你拿 {As}，對手持有 AA 的組合從 6 降到 3、AK 從 16 降到 12。這就是為什麼用 A5s 做 3bet 詐唬、用帶 A 的牌在河牌詐唬堅果同花的牌面。</div>
<div data-widget="rangeBuilder"></div>`,
        quiz: [
          { q: '牌面 {Kc}{7d}{2s}，對手持有 AK 的組合數？', opts: ['16', '12', '9', '6'], a: 1, why: '牌面已有一張 K：A 有 4 張 × K 剩 3 張 = 12。' },
          { q: '你持有 {Ah}，對手 AA 的組合數變成？', opts: ['6', '4', '3', '1'], a: 2, why: '剩 3 張 A，C(3,2) = 3 組。' },
          { q: '為什麼高手用 A5s 做 3bet 詐唬？', opts: ['因為它很強', '持有 A 阻擋對手的 AA/AK，且被跟注時還有同花/順子潛力', '因為 5 很幸運', '隨便選的'], a: 1, why: '阻擋牌降低對手強牌組合，被跟注時還能靠聽牌獲勝。' },
        ],
      },
      {
        id: '2-2', title: '牌面結構與持續下注（C-bet）', min: 9,
        body: `
<p>翻前加注者在翻牌繼續下注，稱為持續下注（C-bet）。但<strong>不是每個牌面都該下注</strong>，關鍵是判斷「這個牌面對誰的範圍比較有利」。</p>
<h2>乾燥 vs 濕潤</h2>
<table><tr><th>類型</th><th>例子</th><th>特徵</th><th>C-bet 策略</th></tr>
<tr><td>乾燥 Dry</td><td>{Ks}{7d}{2c}</td><td>不連、不同花、少聽牌</td><td>高頻率、小尺度（~1/3 池）</td></tr>
<tr><td>濕潤 Wet</td><td>{Jh}{Th}{8c}</td><td>連張、同花、很多聽牌</td><td>低頻率、大尺度（~2/3 池以上）</td></tr>
<tr><td>成對 Paired</td><td>{8s}{8d}{3c}</td><td>很難擊中</td><td>高頻率、小尺度</td></tr>
<tr><td>單一花色 Monotone</td><td>{Ah}{9h}{4h}</td><td>同花已可能成形</td><td>謹慎、小尺度</td></tr></table>
<div data-widget="boardTexture"></div>
<h2>範圍優勢 vs 堅果優勢</h2>
<ul><li><strong>範圍優勢（Range Advantage）</strong>：整體而言誰的牌更強。例如 BTN 開池 vs BB 跟注，在 {As}{Kd}{5c} 上，BTN 有更多 AK、AA、KK → 可以小注高頻下注。</li>
<li><strong>堅果優勢（Nut Advantage）</strong>：誰有更多「最強的牌」。例如 BB 防守範圍有很多 76s、65s，在 {7h}{6h}{5c} 上反而 BB 有更多兩對、順子 → 加注者應該多過牌。</li></ul>
<div class="callout tip"><b class="c-title">💡 一句話記住</b>有範圍優勢 → 小注高頻；有堅果優勢 → 大注極化；兩者都沒有 → 多過牌。</div>`,
        quiz: [
          { q: '{Kd}{7s}{2c} 這種乾燥牌面，翻前加注者通常怎麼 C-bet？', opts: ['不下注', '小尺度、高頻率', '超池全下', '只用堅果下注'], a: 1, why: '加注者範圍優勢大、對手很難擊中，小注就能讓很多牌棄掉。' },
          { q: '{9h}{8h}{7c} 對 BTN 開池者來說是什麼牌面？', opts: ['對開池者非常有利', '濕潤、對大盲防守範圍較有利', '乾燥牌面', '成對牌面'], a: 1, why: '中小連張牌面擊中大盲的連張、同花雜牌，開池者應更常過牌。' },
        ],
      },
      {
        id: '2-3', title: '下注尺度：價值與詐唬', min: 10,
        body: `
<p>每次下注前先問自己：<strong>「我下注的目的是什麼？」</strong></p>
<h2>價值下注（Value Bet）</h2>
<p>目標：讓<strong>比你差的牌</strong>跟注。尺度要大到「對手剛好還會跟」的極限。</p>
<ul><li>對手是跟注站 → 下大，甚至超池。</li>
<li>對手範圍很弱（例如只剩小對子）→ 下小，讓他們跟得下去。</li>
<li><strong>薄價值（Thin Value）</strong>：中等牌力在河牌下小注，從更弱的對子拿錢，是區分高手的技能。</li></ul>
<h2>詐唬（Bluff）</h2>
<p>目標：讓<strong>比你好的牌</strong>棄掉。用最少的籌碼達成目的。</p>
<div class="formula">詐唬需要的棄牌率 α = 下注 ÷ （底池 + 下注）</div>
<table><tr><th>下注</th><th>需要對手棄牌</th></tr>
<tr><td>1/3 池</td><td>25%</td></tr><tr><td>1/2 池</td><td>33%</td></tr><tr><td>3/4 池</td><td>43%</td></tr><tr><td>1 倍池</td><td>50%</td></tr></table>
<h2>半詐唬（Semi-bluff）</h2>
<p>用聽牌下注：對手棄牌你直接贏；對手跟注你還有 outs。這比純詐唬更有利，是轉牌前最主要的詐唬來源。</p>
<h2>SPR：籌碼底池比</h2>
<div class="formula">SPR = 有效籌碼 ÷ 翻牌底池</div>
<ul><li>SPR &lt; 4：頂對好踢腳就可以準備全下。</li>
<li>SPR 4～10：需要兩對以上才願意打光籌碼。</li>
<li>SPR &gt; 10：一對很少值得打光，暗三條、順子等強牌才行。</li></ul>
<div class="callout key"><b class="c-title">🔑 幾何下注</b>想在河牌全下，可以從翻牌開始規劃每條街下相同比例的底池，讓籌碼在河牌「剛好」打光。</div>`,
        quiz: [
          { q: '你下注半池詐唬，對手至少要棄牌多少才不虧？', opts: ['25%', '33%', '50%', '66%'], a: 1, why: 'α = 0.5 / (1 + 0.5) = 33%。' },
          { q: '面對跟注站，你有強牌，應該？', opts: ['下小注', '過牌設陷阱', '下大注，因為他什麼都跟', '不下注'], a: 2, why: '跟注站的弱點是跟太多，用大注拿最多價值。' },
          { q: 'SPR = 2 時，你有頂對好踢腳，通常？', opts: ['很容易棄牌', '準備把籌碼全部打進去', '只過牌', '看對手長相'], a: 1, why: '低 SPR 時頂對已足夠強，承諾底池（commit）是正確的。' },
        ],
      },
      {
        id: '2-4', title: '盲注防守與 MDF', min: 8,
        body: `
<p>大盲已經投入 1bb，面對 BTN 2.5bb 開池只需再跟 1.5bb 就能贏 4bb 的底池，所需勝率只有約 <strong>27%</strong>。因此大盲的防守範圍非常寬。</p>
<div data-widget="defenseCharts"></div>
<h2>最低防守頻率 MDF</h2>
<div class="formula">MDF = 底池 ÷ （底池 + 對手下注）</div>
<p>如果你的整體範圍棄牌比 MDF 更多，對手用<strong>任何兩張牌</strong>詐唬都能賺錢。</p>
<ul><li>對手下注半池 → 你要守住 67% 的範圍。</li>
<li>對手下注滿池 → 你要守住 50%。</li></ul>
<div class="callout warn"><b class="c-title">⚠️ MDF 是理論底線，不是聖經</b>MDF 假設對手會用任何牌詐唬。面對很少詐唬的緊弱玩家，你應該<strong>棄更多</strong>（剝削）；面對瘋子則要<strong>守更寬</strong>。翻牌時因為還有很多張牌要發，MDF 參考價值較低；河牌時最有用。</div>
<div data-widget="potOdds"></div>`,
        quiz: [
          { q: '對手河牌下注 2/3 池，MDF 是多少？', opts: ['40%', '50%', '60%', '75%'], a: 2, why: '1 / (1 + 0.667) = 60%。' },
          { q: '對手是極少詐唬的岩石型玩家，你的河牌防守應該？', opts: ['照 MDF 防守', '比 MDF 棄更多', '比 MDF 守更多', '全部跟注'], a: 1, why: 'MDF 是對抗「會詐唬的對手」的底線，對手不詐唬時就多棄牌。' },
        ],
        practice: { href: '#/ranges', label: '練習大盲防守表' },
      },
      {
        id: '2-5', title: '對手類型與 HUD 數據', min: 10,
        body: `
<p>線上玩家用 HUD 顯示對手數據；線下玩家靠觀察。最重要的三個數字：</p>
<table><tr><th>數據</th><th>意義</th><th>正常範圍（6-max）</th></tr>
<tr><td>VPIP</td><td>主動投錢入池的比例</td><td>20～28%</td></tr>
<tr><td>PFR</td><td>翻前加注的比例</td><td>16～23%</td></tr>
<tr><td>AF</td><td>（下注+加注）÷ 跟注</td><td>2～4</td></tr>
<tr><td>3Bet%</td><td>翻前再加注比例</td><td>6～10%</td></tr>
<tr><td>WTSD</td><td>看到翻牌後走到攤牌的比例</td><td>26～32%</td></tr></table>
<div data-widget="profiles"></div>
<h2>對手類型與剝削方式</h2>
<table><tr><th>類型</th><th>特徵</th><th>怎麼打他</th></tr>
<tr><td>🪨 岩石 Nit（緊弱）</td><td>VPIP &lt; 14</td><td>多偷他的盲注；他下大注時相信他、棄牌</td></tr>
<tr><td>🎯 緊凶 TAG</td><td>VPIP ~22, PFR 接近 VPIP</td><td>標準好手，避免和他打邊緣牌</td></tr>
<tr><td>🔥 鬆凶 LAG</td><td>VPIP ~30+, 高 PFR</td><td>放寬跟注與 3bet 範圍，讓他自己詐唬</td></tr>
<tr><td>📞 跟注站 Station</td><td>VPIP 高、PFR 很低、AF 低</td><td><strong>絕不詐唬</strong>，只做純價值、下大注</td></tr>
<tr><td>🐟 魚 Fish（鬆弱）</td><td>VPIP 高、常平跟</td><td>隔離加注（Isolate），在有位置時大量價值下注</td></tr>
<tr><td>🌪️ 瘋子 Maniac</td><td>VPIP &gt; 50, PFR 很高</td><td>用中強牌抓詐唬，讓他下注，不要跟他比瘋</td></tr></table>
<div class="callout warn"><b class="c-title">⚠️ 樣本數</b>VPIP/PFR 大約 30～50 手開始有參考價值；AF、3Bet% 需要幾百手；勝率需要數萬手。不要因為看到一次詐唬就把人貼成瘋子。</div>`,
        quiz: [
          { q: '某人 VPIP 48%、PFR 5%、AF 0.8，他是？', opts: ['岩石', '緊凶', '跟注站', '瘋子'], a: 2, why: '玩很多牌但幾乎不加注、很少主動下注 → 典型跟注站。' },
          { q: '對跟注站最大的錯誤是？', opts: ['價值下注太大', '詐唬他', '跟他打底池', '有位置時下注'], a: 1, why: '跟注站不會棄牌，詐唬幾乎都會被抓。' },
          { q: '岩石型玩家在河牌突然下大注，通常代表？', opts: ['詐唬', '很強的牌', '隨機', '聽牌沒中'], a: 1, why: '緊弱玩家很少詐唬，大注通常是真的強牌。' },
        ],
        practice: { href: '#/table', label: '上桌觀察對手類型' },
      },
      {
        id: '2-6', title: '3-Bet 策略：線性與極化', min: 8,
        body: `
<p>3bet = 翻前的再加注。它有兩個目的：<strong>為強牌拿價值</strong>、<strong>用詐唬奪回主動權</strong>。</p>
<h2>線性（Linear）vs 極化（Polarized）</h2>
<ul><li><strong>線性範圍</strong>：只用最強的一段牌 3bet（QQ+, AK, AQs...）。適合對付會跟太多的對手。</li>
<li><strong>極化範圍</strong>：最強的牌 + 一些詐唬（A5s、A4s、76s），中間的牌（AJo、KQo、TT）平跟。適合有位置、對手會對 3bet 棄牌時。</li></ul>
<h2>3bet 尺度</h2>
<table><tr><th>情況</th><th>尺度</th></tr>
<tr><td>有位置（IP）</td><td>約開池的 3 倍</td></tr>
<tr><td>沒位置（OOP，例如盲注）</td><td>約開池的 4 倍</td></tr></table>
<div class="callout tip"><b class="c-title">💡 什麼是好的 3bet 詐唬牌？</b>① 帶 A 的阻擋牌（減少對手 AA/AK）；② 被跟注時能打得好（同花、能成順子）；③ 本身又「不夠好跟注」。A5s～A2s 完美符合。</div>
<h2>面對 3bet</h2>
<p>面對 3bet 時，你的開池範圍大部分要棄牌。標準做法：KK+、AK 部分 4bet；QQ～TT、AQs、KQs 等跟注（有位置時更多）；其餘棄牌。</p>`,
        quiz: [
          { q: '為什麼 A5s 是常見的 3bet 詐唬？', opts: ['因為它是第二強的牌', '阻擋 AA/AK，又有同花和輪子順潛力', '因為對手一定棄牌', '因為 5 是中間牌'], a: 1, why: '阻擋牌 + 可玩性，且它不太適合單純跟注。' },
          { q: '在大盲對按鈕 3bet，尺度應該？', opts: ['比有位置時更小', '比有位置時更大（約 4 倍）', '一律最小加注', '全下'], a: 1, why: '沒位置時要讓對手付更多代價，降低他用位置實現勝率的能力。' },
        ],
      },
    ],
  },
  {
    id: 's3', num: 'III', icon: '🧠', title: '高手期', en: 'GTO & MINDSET',
    desc: 'GTO 平衡策略、詐唬比例、變異數、資金管理與心態。擺脫經驗法則，進入科學化。',
    lessons: [
      {
        id: '3-1', title: 'GTO vs 剝削：該學哪個？', min: 9,
        body: `
<p><strong>GTO（Game Theory Optimal，博弈論最優）</strong>是一種「無法被剝削」的策略：不管對手怎麼打，你長期都不會虧給他。它來自納許均衡（Nash Equilibrium）。</p>
<p><strong>剝削（Exploitative）</strong>則是針對對手漏洞偏離平衡，賺得更多，但同時也讓自己暴露漏洞。</p>
<table><tr><th></th><th>GTO</th><th>剝削</th></tr>
<tr><td>目標</td><td>不被打敗</td><td>從對手漏洞賺最多</td></tr>
<tr><td>需要資訊</td><td>不需要對手資訊</td><td>需要讀牌與數據</td></tr>
<tr><td>適用</td><td>強對手、未知對手</td><td>弱對手、有明顯傾向的對手</td></tr></table>
<div class="callout key"><b class="c-title">🔑 高手的真正做法</b>以 GTO 作為「基準線」，知道標準答案是什麼；再根據對手偏離，有意識地剝削。不懂 GTO 的剝削只是亂猜。</div>
<h2>如何用 Solver 學習（PioSolver / GTO Wizard）</h2>
<ol><li><strong>選常見情境</strong>：例如「BTN 開池 vs BB 跟注，單一加注底池」——這佔你牌局的很大比例。</li>
<li><strong>看整體報告（Aggregate）</strong>：哪類牌面下注頻率高？用什麼尺度？</li>
<li><strong>提煉成簡單規則</strong>：例如「A 高乾燥牌面 → 1/3 池、80% 頻率」。不要背每一手牌。</li>
<li><strong>回頭比對自己的手牌</strong>：在覆盤時把你的實戰決策與 Solver 對照。</li></ol>
<div class="callout warn"><b class="c-title">⚠️ 常見誤區</b>Solver 輸出的是「在你設定的範圍與尺度下」的解答。輸入的翻前範圍錯了，輸出就沒意義。也不要在牌局中即時使用 Solver——大多數平台禁止，也違反公平原則。</div>`,
        quiz: [
          { q: 'GTO 策略最主要的特性是？', opts: ['每手都贏', '無法被對手剝削', '一定賺最多', '永遠全下'], a: 1, why: 'GTO 保證不被剝削，但面對弱對手不一定賺最多。' },
          { q: '面對一個明顯的跟注站，最好的策略是？', opts: ['嚴格 GTO', '剝削：減少詐唬、加大價值下注', '多詐唬', '避免和他玩'], a: 1, why: '對手有明顯漏洞時，剝削能賺更多。' },
        ],
      },
      {
        id: '3-2', title: '平衡：價值與詐唬的比例', min: 8,
        body: `
<p>在河牌，如果你只用堅果下注，對手會全部棄牌；如果你太常詐唬，對手會全部跟注。GTO 的答案是讓對手<strong>跟注和棄牌的 EV 一樣</strong>（無差異原則，Indifference）。</p>
<div class="formula">河牌詐唬佔下注範圍的比例 = 下注 ÷ （底池 + 2 × 下注）</div>
<table><tr><th>河牌下注</th><th>對手需要勝率</th><th>詐唬比例</th><th>價值 : 詐唬</th></tr>
<tr><td>1/2 池</td><td>25%</td><td>25%</td><td>3 : 1</td></tr>
<tr><td>2/3 池</td><td>28.6%</td><td>28.6%</td><td>2.5 : 1</td></tr>
<tr><td>1 倍池</td><td>33%</td><td>33%</td><td>2 : 1</td></tr>
<tr><td>2 倍池</td><td>40%</td><td>40%</td><td>1.5 : 1</td></tr></table>
<p>注意：詐唬比例恰好等於對手跟注所需的勝率。這不是巧合——你讓對手的抓詐唬牌剛好打平。</p>
<h2>翻牌、轉牌的詐唬可以更多</h2>
<p>早期街道的「詐唬」大多是半詐唬（有聽牌），它們之後還有機會變成價值牌，所以翻牌時的詐唬比例可以遠高於河牌。</p>
<div class="callout tip"><b class="c-title">💡 選誰當詐唬？</b>河牌選擇<strong>沒有攤牌價值</strong>、且<strong>阻擋對手跟注牌</strong>的手牌。例如錯過的同花聽牌，沒有攤牌價值，是理想的詐唬候選。</div>`,
        quiz: [
          { q: '河牌下注滿池，平衡範圍中價值與詐唬的比例約？', opts: ['1:1', '2:1', '3:1', '5:1'], a: 1, why: '詐唬佔 1/(1+2) = 33%，即 2 個價值配 1 個詐唬。' },
          { q: '下列哪一手最適合當河牌詐唬？', opts: ['中對子（有攤牌價值）', '錯過的同花聽牌', '頂對', '堅果'], a: 1, why: '沒有攤牌價值的牌，過牌也贏不了，最適合轉換成詐唬。' },
        ],
      },
      {
        id: '3-3', title: '變異數：運氣有多大？', min: 8,
        body: `
<p>德州撲克短期內運氣成分極大。<strong>決策正確不等於一定會贏，決策錯誤不等於一定會輸。</strong></p>
<h2>用數字理解變異數</h2>
<ul><li><strong>勝率（Winrate）</strong>：以 bb/100（每 100 手贏幾個大盲）計算。微級別好玩家約 5～10 bb/100。</li>
<li><strong>標準差（SD）</strong>：6-max 現金桌通常 80～120 bb/100。這代表每 100 手的結果，常常在 ±100bb 間擺盪。</li></ul>
<p>一個勝率 5bb/100 的贏家，打 10 萬手的 95% 信賴區間大約是 <strong>±6 bb/100</strong>——也就是說，即使打了 10 萬手，你都還不能完全確定自己是贏家！</p>
<div data-widget="variance"></div>
<div class="callout key"><b class="c-title">🔑 結果導向是大敵（Results-Oriented Thinking）</b>評估一手牌時，問「這個決策在當時的資訊下是否 +EV？」而不是「我有沒有贏」。覆盤室的教練評分就是基於決策，而非結果。</div>
<h2>全有/全無運氣 vs 全下 EV</h2>
<p>專業玩家會看「All-in Adjusted EV」：把所有全下的結果換成期望值，扣掉發牌運氣，更準確看出自己打得好不好。</p>`,
        quiz: [
          { q: '你用 AA 全下輸給 KK，這個決策？', opts: ['錯誤，因為輸了', '正確，因為翻前約 82% 勝率，長期 +EV', '看情況', '應該棄牌'], a: 1, why: '用決策品質而非結果評價。' },
          { q: '打了 2 萬手勝率 +8bb/100，可以確定自己是長期贏家嗎？', opts: ['可以', '還不能，樣本仍太小，變異數很大', '一定是輸家', '只要 100 手就夠'], a: 1, why: '以 SD 100 計，2 萬手的 95% 信賴區間約 ±14bb/100，仍可能是輸家。' },
        ],
        practice: { href: '#/lab', label: '開啟變異數模擬器' },
      },
      {
        id: '3-4', title: '資金管理：高手的生命線', min: 7,
        body: `
<p>資金管理（Bankroll Management, BRM）讓你能撐過必然出現的下風期（Downswing），而不會因為一次衰運就破產。</p>
<table><tr><th>形式</th><th>建議買入數</th><th>原因</th></tr>
<tr><td>現金桌 Cash</td><td>30～50 個買入</td><td>變異數中等</td></tr>
<tr><td>坐滿即玩 SNG</td><td>50～100 個買入</td><td>獎金集中</td></tr>
<tr><td>錦標賽 MTT</td><td>100～200+ 個買入</td><td>大多數時間沒有進錢圈，變異數極大</td></tr></table>
<div class="callout tip"><b class="c-title">💡 升降級規則（範例）</b>NL10 一個買入 = 10 美元。有 40 個 NL10 買入（400 美元）才打 NL10；資金跌到 25 個買入（250 美元）就降回 NL5。<strong>預先寫下規則，不要在情緒中決定。</strong></div>
<h2>破產風險（Risk of Ruin）</h2>
<div class="formula">RoR ≈ e^( −2 × 勝率 × 資金 ÷ 標準差² )</div>
<p>勝率越低、標準差越大，需要越多資金。用研究室的計算器試試你的數字。</p>
<div data-widget="bankroll"></div>
<div class="callout warn"><b class="c-title">⚠️ 絕對不要</b>拿生活費打牌、為了「追回損失」升級（Chasing Losses）、借錢打牌。本站僅供學習，請遵守當地法律並理性娛樂。</div>`,
        quiz: [
          { q: '打錦標賽為什麼需要更多買入？', opts: ['因為買入比較貴', '大部分比賽不會進錢圈，結果極度集中，變異數大', '因為比較好玩', '不需要'], a: 1, why: 'MTT 只有約 10～15% 進錢圈，獎金集中在前幾名。' },
          { q: '資金跌破預設門檻時應該？', opts: ['升級追回損失', '依規則降級', '借錢', '不管它'], a: 1, why: '降級是保護資金、撐過下風期的關鍵。' },
        ],
      },
      {
        id: '3-5', title: '心態與 Tilt 管理', min: 7,
        body: `
<p>Tilt（上頭）= 因為情緒而偏離最佳策略。所有人都會 tilt，差別是<strong>多快察覺、多快停下</strong>。</p>
<h2>A-Game / B-Game / C-Game</h2>
<p>心理學教練 Jared Tendler 提出：你的表現是一個區間。改善 C-Game（最差狀態）通常比提升 A-Game 更賺錢。</p>
<h2>常見 Tilt 類型</h2>
<ul><li><strong>爆冷 Tilt</strong>：被 bad beat 後想立刻贏回來。</li>
<li><strong>不公平 Tilt</strong>：「為什麼魚總是中河牌？」</li>
<li><strong>過度自信</strong>：連贏後放寬標準、升級。</li>
<li><strong>無聊 Tilt</strong>：牌太差太久，開始亂玩。</li></ul>
<div class="callout key"><b class="c-title">🔑 實用工具</b>
<ol><li><strong>停損</strong>：單場輸 3 個買入就下桌。</li>
<li><strong>時間上限</strong>：疲勞時決策品質下降。</li>
<li><strong>Tilt 日記</strong>：記錄觸發點、身體反應、當時想法，找出模式。</li>
<li><strong>重設儀式</strong>：深呼吸、站起來、喝水，再回到桌上。</li></ol></div>`,
        quiz: [
          { q: '剛被河牌爆冷，最好的做法是？', opts: ['立刻加大注碼贏回來', '察覺情緒、必要時暫停或下桌', '對那位玩家報復', '馬上升級'], a: 1, why: '察覺是第一步，然後執行事先設定的停損或休息規則。' },
          { q: '改善哪個部分通常最賺錢？', opts: ['A-Game 的巔峰', 'C-Game 的最差狀態', '只改手氣', '都一樣'], a: 1, why: '最差狀態的錯誤代價最大，把下限拉高收益最明顯。' },
        ],
      },
    ],
  },
  {
    id: 's4', num: 'IV', icon: '🔁', title: '實踐與覆盤', en: 'REVIEW LOOP',
    desc: '記錄、統計、標記弱點、覆盤。高手與普通玩家最大的差別，在於離開牌桌後做的事。',
    lessons: [
      {
        id: '4-1', title: '記錄與統計', min: 6,
        body: `
<p>你無法改善你沒有量測的東西。</p>
<h2>線上玩家</h2>
<ul><li>使用追蹤軟體（如 Hand2Note、HoldemManager、PokerTracker）自動匯入手牌。</li>
<li>關注自己的 VPIP/PFR/3bet、各位置盈虧、紅線（非攤牌贏利）與藍線（攤牌贏利）。</li>
<li><strong>按位置看盈虧</strong>：BTN 應該最賺，盲注應該是虧損最少的。</li></ul>
<h2>線下玩家</h2>
<ul><li>每場記錄：日期、級別、時長、買入、兌現、心態分數（1～10）。</li>
<li>用手機速記關鍵手牌：位置、籌碼、每條街的動作與尺度。</li></ul>
<div class="callout tip"><b class="c-title">💡 本站已幫你做好</b>實戰模擬室的每一手都自動記錄到覆盤室；覆盤室也有「場次日誌」可以記錄你在真實牌局的成績，並畫出資金曲線。</div>`,
        quiz: [
          { q: '按位置看盈虧時，哪個位置通常最賺？', opts: ['UTG', 'BB', 'BTN', 'SB'], a: 2, why: '按鈕位有最佳位置與最寬的獲利範圍。' },
          { q: '線下記錄場次最少要記哪些？', opts: ['只記贏的', '日期、級別、時長、買入/兌現、心態', '只記大底池', '不用記'], a: 1, why: '完整記錄才能算出真實時薪與發現心態對結果的影響。' },
        ],
        practice: { href: '#/review', label: '打開覆盤室' },
      },
      {
        id: '4-2', title: '覆盤流程：找出漏洞（Leaks）', min: 9,
        body: `
<p>每次打完牌，挑出這三類手牌覆盤：</p>
<ol><li><strong>大底池</strong>（超過 30bb 的底池）——影響盈虧最大。</li>
<li><strong>猶豫的手牌</strong>——你不確定時，就是你知識的邊界。</li>
<li><strong>教練標紅的決策</strong>——本站自動標示。</li></ol>
<h2>每一手的覆盤問題清單</h2>
<ol><li>翻前：我的位置與動作符合範圍表嗎？</li>
<li>對手是什麼類型？他在這個位置的範圍是什麼？</li>
<li>每條街：我有計畫嗎？我下注是為了價值還是詐唬？尺度合理嗎？</li>
<li>面對下注：我的勝率 vs 需要勝率？</li>
<li>如果重來，有沒有更高 EV 的選擇？</li></ol>
<div class="callout key"><b class="c-title">🔑 漏洞清單（Leak List）</b>把發現的錯誤分類記錄，例如「翻前在前位玩太鬆」「面對河牌大注跟太多」。<strong>一次只專注修 1～2 個漏洞</strong>，修好再換下一個。覆盤室的「漏洞分析」會自動統計你的錯誤類型。</div>
<h2>與人討論</h2>
<p>加入撲克學習群組、貼手牌到論壇（如 2+2、Reddit r/poker）或找教練。說出你的思考過程本身就是最好的練習。</p>`,
        quiz: [
          { q: '覆盤時最優先挑哪些手牌？', opts: ['隨便挑', '大底池、猶豫的手牌、明顯錯誤', '只看贏的', '只看輸的'], a: 1, why: '這些手牌對盈虧影響最大，也最能暴露知識盲點。' },
          { q: '發現 5 個漏洞時，最好的做法？', opts: ['同時全部修', '依影響大小排序，一次專注 1～2 個', '不管它們', '換一種遊戲'], a: 1, why: '刻意練習一次專注一個目標，效果最好。' },
        ],
        practice: { href: '#/review', label: '開始覆盤' },
      },
      {
        id: '4-3', title: '你的進步循環與每週計畫', min: 6,
        body: `
<p>把以上所有東西串成一個循環：<strong>學習 → 練習 → 實戰 → 覆盤 → 修正</strong>。</p>
<h2>建議每週計畫（新手～進階）</h2>
<table><tr><th>項目</th><th>頻率</th><th>本站對應</th></tr>
<tr><td>範圍表練習</td><td>每天 10 分鐘（約 50 題）</td><td>起手牌訓練室</td></tr>
<tr><td>算牌決策</td><td>每天 20 題</td><td>算牌訓練室</td></tr>
<tr><td>實戰</td><td>每週 3～5 次，每次 50+ 手</td><td>實戰模擬室</td></tr>
<tr><td>覆盤</td><td>每次實戰後 15 分鐘</td><td>覆盤室</td></tr>
<tr><td>理論學習</td><td>每週 1～2 課</td><td>學院 / Solver</td></tr></table>
<div class="callout tip"><b class="c-title">💡 學習與實戰比例</b>新手期建議學習時間 ≥ 實戰時間。越早建立正確習慣，之後越省力。</div>
<h2>你已經走完整條路線</h2>
<p>接下來就是不斷重複這個循環。記住：<strong>撲克是一輩子的學習</strong>——每一次覆盤都讓你更接近高手。</p>`,
        quiz: [
          { q: '進步循環的正確順序？', opts: ['實戰 → 實戰 → 實戰', '學習 → 練習 → 實戰 → 覆盤 → 修正', '只看影片', '只打錦標賽'], a: 1, why: '少了覆盤與修正，經驗不會轉化成實力。' },
        ],
      },
    ],
  },
];

export const ALL_LESSONS = STAGES.flatMap(s => s.lessons.map(l => ({ ...l, stage: s })));
export const lessonById = id => ALL_LESSONS.find(l => l.id === id);
