"use strict";
/* ウリログ：メイン画面・ホーム・メニュー・スワイプで決める・マッチ
   ファイルの分け方：core.js（共通の道具・状態）→ 各機能 → events.js（ボタン）→ boot.js（Firebase につないで起動）
   どのファイルの関数・変数も、ほかのファイルからそのまま使える（ふつうの <script> で順に読み込む） */
/* =============== メイン画面 =============== */
function render(){
  if (!S.room) return;
  const qta = document.querySelector(".qaform textarea"), qkeep = qta ? { v: qta.value, f: document.activeElement === qta } : null;
  renderMain();
  uriCheckEvolve();
  if (qkeep) { const n = document.querySelector(".qaform textarea"); if (n) { n.value = qkeep.v; if (qkeep.f) n.focus(); } }
}
function renderMain(){
  const paired = isPaired();
  const title = S.tab === "home" ? "きょう" : isOd() ? "おでかけ" : S.tab === "futari" ? "ふたり" : "ウリ";
  $app.innerHTML = `
  <header class="top hd2">
    <div class="ttl">${S.tab === "home" ? `<small>${esc(fmtShort(today()))}</small>` : ""}<h1>${title}</h1></div>
    ${S.tab === "home" ? `<span class="status ${paired ? "" : "wait"}">${paired ? `${esc(nameOf(me()))} ♡ ${esc(nameOf(partnerUid()))}` : "招待待ち"}</span>` : ""}
    <button class="iconbtn" data-a="settings" aria-label="設定">${IC.gear}</button>
  </header>
  ${paired ? "" : `<div class="card invite"><span class="deco">💌</span><h2>恋人を招待しよう</h2><p>${S.room.partnerEmail ? `${esc(S.room.partnerEmail)} の登録を待っています。` : "恋人のメールアドレスを登録すると、ふたりで同じリストが使えます。"}</p><button class="btn sm" data-a="invite">${S.room.partnerEmail ? "招待の確認・送り直し" : "恋人のメールアドレスを登録"}</button></div>`}
  <div id="view">${view()}</div>`;
  const tabs = [
    ["home", IC.home, "きょう", 0, "", S.tab === "home"],
    ["od", IC.list, "おでかけ", S.tab === "memo" ? 0 : notesNew().length, "NEW", isOd()],
    ["futari", IC.heart, "ふたり", S.needRules ? 0 : futariBadge(), "", S.tab === "futari"],
    ["uri", IC.uri, "ウリ", 0, "", S.tab === "uri"]
  ];
  $nav.innerHTML = `
  ${S.tab === "list" ? `<button class="fab" data-a="add" aria-label="候補を追加">${IC.plus}</button>` : ""}
  ${S.tab === "cal" ? `<button class="fab" data-a="dateAdd" aria-label="予定を追加">${IC.plus}</button>` : ""}
  <nav class="tabs"><div class="in2">${tabs.map(([id, ic, n, c, lbl, on]) => `<button class="${on ? "on" : ""}" data-a="tab" data-v="${id}">${ic}<span>${n}${c ? `<span class="n">${lbl || c}</span>` : ""}</span></button>`).join("")}</div></nav>`;
  const q = document.getElementById("q");
  if (q) q.oninput = () => { S.q = q.value; document.getElementById("plist").innerHTML = listHtml(filtered()); document.getElementById("cnt").textContent = filtered().length + "件"; };
}

function view(){
  if (S.tab === "home") return viewHome();
  if (S.tab === "memo") { const h = odSeg() + viewMemo(); markNotesSeen(); return h; }
  if (S.tab === "cal") return odSeg() + viewCal();
  if (S.tab === "uri") return viewUri();
  if (S.tab === "futari") return viewFutari();
  return viewList();
}

function sortPlaces(arr){
  const a = arr.slice();
  if (S.sort === "love") a.sort((x, y) => loveSum(y) - loveSum(x) || ms(y.createdAt) - ms(x.createdAt));
  else if (S.sort === "old") a.sort((x, y) => ms(x.createdAt) - ms(y.createdAt));
  else a.sort((x, y) => ms(y.createdAt) - ms(x.createdAt));
  return a;
}
function filtered(){
  const q = S.q.trim().toLowerCase();
  if (S.who === "both" && !isPaired()) S.who = "all";
  return sortPlaces(S.places.filter(p => !p.visited
    && whoOk(p)
    && (S.cat === "all" || p.cat === S.cat)
    && (!q || [p.title, p.area, p.memo].join(" ").toLowerCase().includes(q))));
}

function placeCard(p){
  const c = catOf(p.cat), v = votesOf(p), mine = v.includes(me()), pu = partnerUid();
  const both = isBoth(p);
  return `<div class="place ${both ? "both" : ""}" data-a="open" data-id="${p.id}">
    ${both ? `<span class="ribbon">ふたりとも行きたい♡</span>` : ""}
    <div class="cat" style="background:${c.c}">${c.e}</div>
    <div class="main">
      <div class="t">${esc(p.title)}</div>
      <div class="s">${esc([p.area, c.n].filter(Boolean).join(" ・ "))}</div>
      <div class="who">${pu && v.includes(pu) ? `<span class="tag">${esc(nameOf(pu))}も行きたい♡${loveOf(p, pu) > 1 ? "×" + loveOf(p, pu) : ""}</span>` : ""}${p.by && p.by !== me() && S.room.names?.[p.by] ? `<span class="tag lav">${esc(nameOf(p.by))}が追加</span>` : ""}</div>
    </div>
    <button class="heart ${mine ? "on" : ""}" data-a="vote" data-id="${p.id}" aria-label="行きたい">${IC.heart}${mine ? `<span class="hcnt">${loveOf(p, me())}</span>` : ""}</button>
  </div>`;
}
function listHtml(arr){
  if (!arr.length) {
    if (!S.places.filter(p => !p.visited).length) return `<div class="empty"><div class="big">🗺️</div><p>まだ候補がありません</p><p>右下の＋ボタンから、行ってみたい場所を追加してね</p></div>`;
    if (S.who === "both" && !S.q && S.cat === "all") return `<div class="empty"><div class="big">💞</div><p>ふたりとも行きたい場所は、まだありません</p><p>上の「スワイプでえらぶ」か、♡ボタンで選んでみてね</p></div>`;
    if (S.who === "new" && !S.q && S.cat === "all") return `<div class="empty"><div class="big">✨</div><p>まだ見ていない候補はありません</p></div>`;
    return `<div class="empty"><div class="big">🔍</div><p>見つかりませんでした</p></div>`;
  }
  return arr.map(placeCard).join("");
}


function viewList(){
  const arr = filtered();
  const whos = [["all", "すべて"], ["both", "ふたり♡"], ["mine", "わたしの♡"], ["new", "まだ見てない"]].filter(w => isPaired() || w[0] !== "both");
  return `${odSeg()}${swipeBar()}
  <div class="seg who">${whos.map(([id, n]) => `<button class="${S.who === id ? "on" : ""}" data-a="who" data-v="${id}">${n}</button>`).join("")}</div>
  <div class="search">${IC.search}<input class="in" id="q" placeholder="名前・エリア・メモでさがす" value="${esc(S.q)}"></div>
  <div class="chips">
    <button class="chip ${S.cat === "all" ? "on" : ""}" data-a="cat" data-v="all">すべて</button>
    ${CATS.map(c => `<button class="chip ${S.cat === c.id ? "on" : ""}" data-a="cat" data-v="${c.id}">${c.e} ${c.n}</button>`).join("")}
  </div>
  <div class="bar"><span class="count" id="cnt">${arr.length}件</span>
    <select data-a="sort"><option value="new" ${S.sort === "new" ? "selected" : ""}>新しい順</option><option value="love" ${S.sort === "love" ? "selected" : ""}>♡が多い順</option><option value="old" ${S.sort === "old" ? "selected" : ""}>古い順</option></select>
  </div>
  <div id="plist">${listHtml(arr)}</div>`;
}

/* スワイプ用のおすすめ（「行きたい」にしたものだけ候補に追加される） */
const REGIONS = [["all","すべて"],["aichi","愛知・東海"],["kansai","関西"],["kanto","関東"],["japan","全国の旅行"],["any","どこでも"]];
const SAMPLES = [
  // 愛知・東海
  { r:"aichi", k:"okazaki-park", t:"岡崎公園と岡崎城", c:"nature", a:"愛知・岡崎", m:"お城と公園をのんびりおさんぽ。春は桜、夏は花火も" },
  { r:"aichi", k:"hatcho", t:"八丁味噌の蔵見学", c:"play", a:"愛知・岡崎", m:"昔ながらの味噌蔵を見学。味噌ソフトも食べたい" },
  { r:"aichi", k:"korankei", t:"香嵐渓の紅葉", c:"nature", a:"愛知・豊田", m:"秋の紅葉が有名。夜のライトアップも" },
  { r:"aichi", k:"ghibli", t:"ジブリパーク", c:"play", a:"愛知・長久手", m:"チケットは予約制。早めに取ろう" },
  { r:"aichi", k:"aquarium", t:"名古屋港水族館", c:"play", a:"愛知・名古屋", m:"シャチとイルカのショーを見たい" },
  { r:"aichi", k:"higashiyama", t:"東山動植物園", c:"play", a:"愛知・名古屋", m:"動物園と植物園、展望タワーもある" },
  { r:"aichi", k:"planetarium", t:"名古屋市科学館のプラネタリウム", c:"play", a:"愛知・名古屋", m:"世界最大級のドーム。雨の日にも" },
  { r:"aichi", k:"osu", t:"大須商店街で食べ歩き", c:"food", a:"愛知・名古屋", m:"古着屋さんや食べ歩きグルメがいっぱい" },
  { r:"aichi", k:"hitsumabushi", t:"ひつまぶしを食べに行く", c:"food", a:"愛知・名古屋", m:"3通りの食べ方で楽しむ名古屋めし" },
  { r:"aichi", k:"oasis21", t:"オアシス21とテレビ塔の夜景", c:"play", a:"愛知・名古屋", m:"水の宇宙船から見る夜景がきれい" },
  { r:"aichi", k:"laguna", t:"ラグーナテンボス", c:"play", a:"愛知・蒲郡", m:"テーマパークと海辺のアウトレット" },
  { r:"aichi", k:"inuyama", t:"犬山城と城下町", c:"play", a:"愛知・犬山", m:"国宝のお城と、食べ歩きできる城下町" },
  { r:"aichi", k:"meijimura", t:"博物館明治村", c:"play", a:"愛知・犬山", m:"レトロな建物の中をおさんぽ。レンタル衣装も" },
  { r:"aichi", k:"sakushima", t:"佐久島でアートめぐり", c:"trip", a:"愛知・西尾", m:"船で行く島。島のあちこちにアート作品" },
  { r:"aichi", k:"himakajima", t:"日間賀島でたこ料理", c:"trip", a:"愛知・南知多", m:"タコとフグの島。日帰りでも行ける" },
  { r:"aichi", k:"nabana", t:"なばなの里のイルミネーション", c:"event", a:"三重・桑名", m:"冬の光のトンネルがすてき" },
  { r:"aichi", k:"nagashima", t:"ナガシマスパーランド", c:"play", a:"三重・桑名", m:"絶叫系にチャレンジ。アウトレットもとなり" },
  // 関西
  { r:"kansai", k:"usj", t:"ユニバーサル・スタジオ・ジャパン", c:"play", a:"大阪", m:"おそろいのカチューシャで一日中" },
  { r:"kansai", k:"kaiyukan", t:"海遊館", c:"play", a:"大阪", m:"大きな水槽をジンベエザメが泳ぐ" },
  { r:"kansai", k:"dotonbori", t:"道頓堀で食べ歩き", c:"food", a:"大阪", m:"たこ焼き、お好み焼き、ネオン看板の前で写真" },
  { r:"kansai", k:"shinsekai", t:"通天閣と新世界で串カツ", c:"food", a:"大阪", m:"レトロな街で串カツ。ソースの二度づけは禁止" },
  { r:"kansai", k:"umeda-sky", t:"梅田スカイビルの空中庭園", c:"play", a:"大阪", m:"屋上の展望台から夜景" },
  { r:"kansai", k:"fushimi", t:"伏見稲荷大社の千本鳥居", c:"play", a:"京都", m:"朱色の鳥居がつづく道をふたりで" },
  { r:"kansai", k:"arashiyama", t:"嵐山の竹林と渡月橋", c:"nature", a:"京都", m:"竹林の小道をおさんぽ。人力車も" },
  { r:"kansai", k:"kiyomizu", t:"清水寺と二年坂・三年坂", c:"play", a:"京都", m:"着物をレンタルして歩くのも" },
  { r:"kansai", k:"kamogawa", t:"鴨川沿いをおさんぽ", c:"nature", a:"京都", m:"川べりに座って、のんびり" },
  { r:"kansai", k:"gion-matcha", t:"祇園で抹茶スイーツ", c:"cafe", a:"京都", m:"抹茶パフェやわらび餅を食べ比べ" },
  { r:"kansai", k:"nara-park", t:"奈良公園でシカとふれあう", c:"nature", a:"奈良", m:"東大寺の大仏さまも見に行こう" },
  { r:"kansai", k:"kobe-harbor", t:"神戸ハーバーランドとメリケンパーク", c:"play", a:"兵庫・神戸", m:"海辺の夜景と観覧車" },
  { r:"kansai", k:"kikuseidai", t:"摩耶山・掬星台の夜景", c:"nature", a:"兵庫・神戸", m:"「1000万ドルの夜景」と呼ばれる景色" },
  { r:"kansai", k:"nankinmachi", t:"南京町で食べ歩き", c:"food", a:"兵庫・神戸", m:"豚まんや小籠包をはんぶんこ" },
  { r:"kansai", k:"arima", t:"有馬温泉", c:"trip", a:"兵庫", m:"金泉・銀泉、ふたつのお湯を楽しむ" },
  { r:"kansai", k:"adventure-world", t:"アドベンチャーワールド", c:"play", a:"和歌山・白浜", m:"パンダに会いに行く。白浜の海も" },
  // 関東
  { r:"kanto", k:"tdr", t:"東京ディズニーリゾート", c:"play", a:"千葉・舞浜", m:"ランドとシー、どっちに行く？" },
  { r:"kanto", k:"asakusa", t:"浅草寺と仲見世で食べ歩き", c:"play", a:"東京・浅草", m:"人力車や着物レンタルも" },
  { r:"kanto", k:"skytree", t:"東京スカイツリー", c:"play", a:"東京・押上", m:"展望デッキから東京を一望" },
  { r:"kanto", k:"shibuya-sky", t:"渋谷スカイの夜景", c:"play", a:"東京・渋谷", m:"屋上の展望台から夕日と夜景" },
  { r:"kanto", k:"teamlab", t:"チームラボの展示", c:"play", a:"東京", m:"光とアートの中で写真を撮ろう" },
  { r:"kanto", k:"kichijoji", t:"吉祥寺と井の頭公園", c:"nature", a:"東京・吉祥寺", m:"ボートに乗って、カフェめぐり" },
  { r:"kanto", k:"ueno", t:"上野動物園と上野公園", c:"play", a:"東京・上野", m:"パンダと美術館とおさんぽ" },
  { r:"kanto", k:"minatomirai", t:"横浜みなとみらいと赤レンガ倉庫", c:"play", a:"神奈川・横浜", m:"海沿いの夜景と観覧車" },
  { r:"kanto", k:"chinatown", t:"横浜中華街で食べ歩き", c:"food", a:"神奈川・横浜", m:"小籠包、ごま団子、焼き小籠包" },
  { r:"kanto", k:"kamakura", t:"鎌倉の大仏と小町通り", c:"play", a:"神奈川・鎌倉", m:"お寺めぐりと食べ歩き" },
  { r:"kanto", k:"enoshima", t:"江ノ島", c:"nature", a:"神奈川・藤沢", m:"海を見ながら島をおさんぽ。夕日もきれい" },
  { r:"kanto", k:"hakone", t:"箱根温泉と芦ノ湖", c:"trip", a:"神奈川・箱根", m:"海賊船とロープウェイ、温泉でのんびり" },
  { r:"kanto", k:"kamogawa-sw", t:"鴨川シーワールド", c:"play", a:"千葉・鴨川", m:"シャチのショーと海辺ドライブ" },
  { r:"kanto", k:"kawagoe", t:"小江戸・川越をおさんぽ", c:"play", a:"埼玉・川越", m:"蔵造りの町並みと、時の鐘" },
  { r:"kanto", k:"hitachi", t:"国営ひたち海浜公園", c:"nature", a:"茨城・ひたちなか", m:"春はネモフィラ、秋はコキアの丘" },
  { r:"kanto", k:"nikko", t:"日光東照宮", c:"trip", a:"栃木・日光", m:"豪華な建物と、華厳の滝" },
  { r:"kanto", k:"kawaguchiko", t:"河口湖から富士山を見る", c:"nature", a:"山梨・河口湖", m:"湖に映る富士山。富士急ハイランドも近い" },
  // 全国の旅行
  { r:"japan", k:"otaru", t:"小樽運河", c:"trip", a:"北海道", m:"ガス灯の運河と、ガラス細工のお店" },
  { r:"japan", k:"hakodate", t:"函館山の夜景", c:"trip", a:"北海道", m:"夜景と朝市の海鮮丼" },
  { r:"japan", k:"furano", t:"富良野・美瑛の花畑", c:"trip", a:"北海道", m:"夏はラベンダー畑。青い池も" },
  { r:"japan", k:"ginzan", t:"銀山温泉", c:"trip", a:"山形", m:"大正ロマンの温泉街。雪の夜景が有名" },
  { r:"japan", k:"kusatsu", t:"草津温泉", c:"trip", a:"群馬", m:"湯畑を見ながら温泉街さんぽ" },
  { r:"japan", k:"kanazawa", t:"金沢・兼六園とひがし茶屋街", c:"trip", a:"石川", m:"金箔ソフトと古い町並み" },
  { r:"japan", k:"shirakawago", t:"白川郷", c:"trip", a:"岐阜", m:"合掌造りの村。冬の雪景色も" },
  { r:"japan", k:"gero", t:"下呂温泉で一泊", c:"trip", a:"岐阜", m:"足湯めぐりと温泉街さんぽ" },
  { r:"japan", k:"ise", t:"伊勢神宮とおかげ横丁", c:"trip", a:"三重", m:"お参りして、赤福と伊勢うどん" },
  { r:"japan", k:"miyajima", t:"宮島・厳島神社", c:"trip", a:"広島", m:"海に浮かぶ大鳥居と、もみじ饅頭" },
  { r:"japan", k:"naoshima", t:"直島でアートめぐり", c:"trip", a:"香川", m:"島じゅうがアート。黄色いかぼちゃも" },
  { r:"japan", k:"dogo", t:"道後温泉", c:"trip", a:"愛媛", m:"歴史ある本館と、商店街の食べ歩き" },
  { r:"japan", k:"beppu", t:"別府温泉の地獄めぐり", c:"trip", a:"大分", m:"色とりどりの温泉を見てまわる" },
  { r:"japan", k:"nagasaki", t:"長崎・稲佐山の夜景", c:"trip", a:"長崎", m:"夜景とちゃんぽん。ハウステンボスも" },
  { r:"japan", k:"takachiho", t:"高千穂峡でボート", c:"trip", a:"宮崎", m:"滝のそばをボートでゆっくり" },
  { r:"japan", k:"yakushima", t:"屋久島の森", c:"trip", a:"鹿児島", m:"苔むした森を歩く。体力に自信があれば縄文杉も" },
  { r:"japan", k:"churaumi", t:"沖縄美ら海水族館", c:"trip", a:"沖縄", m:"ジンベエザメと、エメラルドの海" },
  { r:"japan", k:"ishigaki", t:"石垣島・竹富島", c:"trip", a:"沖縄", m:"水牛車と白い砂の道、きれいな海" },
  // どこでも
  { r:"any", k:"morning", t:"喫茶店でモーニング", c:"cafe", a:"どこでも", m:"ドリンクにトーストがついてくる、東海のモーニング文化" },
  { r:"any", k:"pottery", t:"陶芸体験でおそろいの器", c:"play", a:"どこでも", m:"ふたりで作って、焼き上がりを待つのも楽しい" },
  { r:"any", k:"bouldering", t:"ボルダリング体験", c:"play", a:"どこでも", m:"はじめてでも楽しめる。応援しあおう" },
  { r:"any", k:"moviepizza", t:"おうちで映画とピザ", c:"other", a:"おうち", m:"見たい映画を1本ずつえらぶ" }
];
const sampleId = k => "s_" + k;
const passedSamples = () => S.profile?.passedSamples || [];
const inRegion = x => !S.swRegion || S.swRegion === "all" || x.r === S.swRegion;
const unseenSamples = (all) => SAMPLES.filter(x => (all || inRegion(x)) && !S.places.some(p => p.id === sampleId(x.k)) && !passedSamples().includes(x.k));
const unseen = () => S.places.filter(p => !p.visited && !(p.votes || {})[me()] && !(p.passes || {})[me()]);
const passedCount = () => S.places.filter(p => !p.visited && (p.passes || {})[me()]).length + passedSamples().length;
function swipeBar(){
  const n = unseen().length, ns = unseenSamples(true).length;
  const sub = n || ns ? [n ? `まだ見ていない候補 ${n}件` : "", ns ? `おすすめ ${ns}件` : ""].filter(Boolean).join("・") : "ぜんぶ見たよ！パスした場所も見なおせます";
  return `<div class="card swipebar" data-a="swipe"><span class="ic">🃏</span><div class="main"><b>スワイプでえらぶ</b><span class="muted">${esc(sub)}</span></div><span class="go">›</span></div>`;
}
function whoOk(p){
  if (S.who === "both") return isBoth(p);
  if (S.who === "mine") return votesOf(p).includes(me());
  if (S.who === "new") return !(p.votes || {})[me()] && !(p.passes || {})[me()];
  return true;
}

/* =============== ホーム =============== */
function viewHome(){
  return `${uriMiniHtml()}${noticeHtml()}${S.extraErr ? "" : statRowHtml()}${qaHtml()}`;
}

/* =============== 新しいメニュー構成（きょう・おでかけ・ふたり・ウリ） =============== */
const OD_TABS = ["list", "cal", "memo"];
const isOd = () => OD_TABS.includes(S.tab);
/* おでかけの上の切りかえ［行きたい｜よてい｜おもいで］ */
function odSeg(){
  const c = { list: S.places.filter(p => !p.visited).length, cal: S.dates.filter(d => d.date >= today()).length, memo: S.places.filter(p => p.visited).length };
  const nn = S.tab === "memo" ? 0 : notesNew().length;
  return `<div class="segx">${[["list", "📍 行きたい"], ["cal", "📅 よてい"], ["memo", "📷 おもいで"]].map(([id, n]) => `<button class="${S.tab === id ? "on" : ""}" data-a="tab" data-v="${id}">${n}<small>${c[id]}</small>${id === "memo" && nn ? `<i class="bdot"></i>` : ""}</button>`).join("")}</div>`;
}
/* 「ふたり」タブに出す新しいことの数 */
function futariBadge(){
  const pu = partnerUid(); let n = lettersIn().length;
  if (pu && qaAns(today(), pu) && !qaAns(today(), me())) n++;
  if (S.tickets.length) n += tkGave().filter(t => t.status === "used").length + tkGot().filter(t => t.status === "new" && (t.at || 0) > tkSeenAt()).length;
  if (pu) n += QSETS.filter(x => qDone(x.id, pu) && !qDone(x.id, me())).length;
  if (sqWaiting()) n++;
  return n;
}
/* いちばん近い記念日（付き合った日の100日ごと・周年・登録した記念日） */
function annivNext(){
  const t = today(), c = [], since = S.room?.since;
  if (since && dayDiff(since, t) >= 0) {
    const days = dayDiff(since, t) + 1, k = Math.ceil(days / 100) * 100;
    c.push({ t: `${k}日目`, left: k - days });
    const [sy, sm, sd] = since.split("-").map(Number); let y = +t.slice(0, 4), d = `${y}-${pad2(sm)}-${pad2(sd)}`;
    if (dayDiff(t, d) < 0) { y++; d = `${y}-${pad2(sm)}-${pad2(sd)}`; }
    if (y - sy >= 1) c.push({ t: `${y - sy}周年`, left: dayDiff(t, d) });
  }
  annivs().forEach(a => { const o = nextOcc(a.d); c.push({ t: a.t, left: dayDiff(t, o) }); });
  return c.sort((x, y) => x.left - y.left)[0] || null;
}
const annivNextText = () => { const n = annivNext(); return n ? (n.left === 0 ? `きょうは${n.t}！` : `${n.t}まであと${n.left}日`) : "記念日を登録してね"; };
/* きょう：おしらせ（1枚にまとめる） */
function noticeHtml(){
  const rows = [], pu = partnerUid(), row = (ic, bg, t, sub, act, right) => `<div class="nrow" ${act}><span class="ni" style="background:${bg}">${ic}</span><div class="t"><b>${t}</b><small>${sub}</small></div>${right || `<span class="go">›</span>`}</div>`;
  const nIn = lettersIn().length;
  if (nIn) rows.push(row("💌", "var(--pink-l)", `${esc(pName())}からおてがみ${nIn > 1 ? `（${nIn}通）` : ""}`, `${esc(uriName())}があずかってるよ`, "", `<button class="btn sm" data-a="letterGet">うけとる</button>`));
  try { annivOn(today()).forEach(a => rows.push(row(esc(a.e), "var(--peach-l)", `きょうは${esc(a.t)}！`, esc(a.s || ""), `data-a="tab" data-v="futari"`))); } catch (e) {}
  if (!S.needRules && S.tickets.length) {
    tkGave().filter(t => t.status === "used").forEach(t => rows.push(row(esc(t.e || "🎟"), "var(--butter-l)", `「${esc(t.t)}」が使われたよ`, `${esc(pName())}のお願いをかなえてあげてね`, `data-a="tickets" data-v="gave"`)));
    const fresh = tkGot().filter(t => t.status === "new" && (t.at || 0) > tkSeenAt());
    if (fresh.length) rows.push(row("🎟", "var(--butter-l)", `${esc(pName())}からチケットが届いたよ`, esc(fresh.map(t => t.t).slice(0, 2).join("、")), `data-a="tickets" data-v="got"`));
  }
  const nn = notesNew();
  if (nn.length) rows.push(row("💬", "var(--mint-l)", `${esc(nn.map(p => p.title).slice(0, 2).join("、"))}${nn.length > 2 ? ` ほか${nn.length - 2}件` : ""}にひとこと`, `${esc(pName())} ・ おもいで`, `data-a="tab" data-v="memo"`));
  if (pu) { const w = QSETS.filter(x => qDone(x.id, pu) && !qDone(x.id, me())).length; if (w) rows.push(row("💯", "var(--lav-l)", `${esc(pName())}が相性テストに答えたよ`, `${w}つ ・ 答えると結果が見られる`, `data-a="quiz"`)); }
  if (sqWaiting()) rows.push(row("🧩", "var(--mint-l)", `${esc(pName())}がじぶんクイズを作ったよ`, `${sqDoc(pu).q.length}問 ・ 何問わかるかな？`, `data-a="sqPlay"`));
  if (!rows.length) return "";
  return `<div class="card notice"><div class="nh">おしらせ <span class="badge">${rows.length}</span></div>${rows.join("")}</div>`;
}
/* きょう：次のデート・付き合って○日 */
function statRowHtml(){
  const n = nextDate(), since = S.room?.since, t = today();
  let a;
  if (n) { const left = dayDiff(t, n.date); a = `<div class="card stat ${left === 0 ? "today" : ""}" data-a="dateOpen" data-id="${n.id}"><div class="l">${left === 0 ? "きょうは" : "次のデートまで"}</div><div class="n">${left === 0 ? `<span style="font-size:20px">デートの日💕</span>` : `<small>あと</small>${left}<small>日</small>`}</div><div class="s">${esc(fmtShort(n.date))} ${esc(dateTitle(n))}</div></div>`; }
  else a = `<div class="card stat" data-a="dateAdd"><div class="l">次のデート</div><div class="n" style="font-size:17px;padding:6px 0">予定を入れる ＋</div><div class="s">カウントダウンが出るよ</div></div>`;
  let b;
  if (since && dayDiff(since, t) >= 0) b = `<div class="card stat" data-a="tab" data-v="futari"><div class="l">付き合って</div><div class="n">${dayDiff(since, t) + 1}<small>日目</small></div><div class="s">${esc(annivNextText())}</div></div>`;
  else b = `<div class="card stat" data-a="since"><div class="l">付き合った日</div><div class="n" style="font-size:17px;padding:6px 0">登録する ＋</div><div class="s">記念日カウンターが出るよ</div></div>`;
  return `<div class="two">${a}${b}</div>`;
}
/* ふたり：やりとり・あそび */
function viewFutari(){
  if (S.needRules) return rulesNote("ふたりの機能");
  const pu = partnerUid(), since = S.room?.since, t = today();
  const tile = (ic, bg, n, sub, act, badge) => `<div class="tile" ${act}>${badge ? `<span class="badge">${badge}</span>` : ""}<div class="ic" style="background:${bg}">${ic}</div><b>${n}</b><small>${sub}</small></div>`;
  const o = omikuji(t), nIn = lettersIn().length, lastOut = S.letters.find(l => l.from === me());
  const tkN = tkGot().filter(x => x.status === "new").length, tkB = tkGave().filter(x => x.status === "used").length + tkGot().filter(x => x.status === "new" && (x.at || 0) > tkSeenAt()).length;
  const qW = pu ? QSETS.filter(x => qDone(x.id, pu) && !qDone(x.id, me())).length : 0, qD = pu ? QSETS.filter(x => qDone(x.id, pu) && qDone(x.id, me())).length : 0;
  const nAnniv = (since ? 1 : 0) + annivs().length;
  return `<div class="card fstrip" data-a="${since ? "annivs" : "since"}"><span class="e">💞</span>
      <div class="m">${since && dayDiff(since, t) >= 0 ? `<small>付き合って</small><b>${dayDiff(since, t) + 1}<small>日目</small></b>` : `<small>付き合った日</small><b style="font-size:16px">登録する ＋</b>`}</div>
      <div class="r"><small>次の記念日</small><b>${esc(annivNextText())}</b></div></div>
    <div class="lbl2">まいにち</div>
    ${qaHtml()}
    <div class="tiles">${tile("🎋", "#fdecea", "おみくじ", omiOpened(me()) ? `きょうは <b class="omt">${o.total}</b>` : "1日1回ひけるよ", `data-a="omikuji"`)}
      ${tile("🧩", "var(--mint-l)", "クイズ", qzTileSub(), `data-a="qz"`, sqWaiting() ? "!" : (uqMine(me()) ? "" : ""))}</div>
    <div class="lbl2">きもちを伝える</div>
    <div class="tiles">${tile("💌", "var(--pink-l)", "おてがみ", nIn ? `${nIn}通とどいてる` : lastOut ? (lastOut.read ? "さいごのは読んでくれたよ" : "とどけ中…") : `${esc(uriName())}が届けてくれるよ`, `data-a="letterHub"`, nIn)}
      ${tile("🎟", "var(--butter-l)", "お願いチケット", tkN ? `使えるのが${tkN}枚` : "贈ってみよう", `data-a="tickets" data-v="got"`, tkB)}</div>
    <div class="lbl2">あそぶ・しる</div>
    <div class="tiles">${tile("💯", "var(--lav-l)", "相性テスト", qW ? `${esc(pName())}が${qW}つ答えたよ` : `${qD} / ${QSETS.length} クリア`, `data-a="quiz"`, qW)}
      ${tile("💝", "var(--peach-l)", "記念日", `${nAnniv}件 ・ 追加・編集`, `data-a="annivs"`)}</div>`;
}

/* =============== スワイプで決める =============== */
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function openSwipe(){
  // 恋人が追加した・まだ見ていない候補を先に、そのあとおすすめ
  S.deck = [...shuffle(unseen().map(p => ({ id: p.id }))), ...shuffle(unseenSamples().map(x => ({ k: x.k })))];
  S.deckPos = 0; S.deckTotal = S.deck.length;
  openSheet(`<h3>🃏 行きたい場所をえらぶ<button class="x" data-a="close">×</button></h3>
    <p class="muted" style="margin:-8px 0 6px;font-size:12px">右にスワイプで「行きたい♡」、左で「パス」。ふたりとも右にした場所はマッチ！</p>
    <div class="chips" style="padding-bottom:4px">${REGIONS.map(([id, n]) => `<button class="chip ${(S.swRegion || "all") === id ? "on" : ""}" data-a="swregion" data-v="${id}">${n}</button>`).join("")}</div>
    <div id="swipebody"></div>`);
  renderDeck();
}
/* デッキの1枚を、表示用の形にそろえる（候補 or おすすめ） */
function deckItem(it){
  if (!it) return null;
  if (it.id) { const p = S.places.find(x => x.id === it.id && !x.visited); return p ? { key: it.id, title: p.title, cat: p.cat, area: p.area, memo: p.memo, by: p.by } : null; }
  const x = SAMPLES.find(s => s.k === it.k);
  if (!x || passedSamples().includes(x.k)) return null;
  const made = S.places.find(p => p.id === sampleId(x.k));
  if (made && ((made.votes || {})[me()] || (made.passes || {})[me()] || made.visited)) return null;
  return { key: "sample:" + x.k, sample: true, title: x.t, cat: x.c, area: x.a, memo: x.m, by: made?.by };
}
function cardHtml(d, back){
  const c = catOf(d.cat);
  return `<div class="scard ${back ? "back" : ""}" ${back ? "" : `id="topcard" data-key="${esc(d.key)}"`}>
    <div class="art" style="background:${c.c}">${c.e}</div>
    ${back ? "" : `<span class="stamp like">行きたい♡</span><span class="stamp pass">パス</span>`}
    <div class="info">${d.sample && !d.by ? `<span class="tag lav" style="margin-bottom:4px;display:inline-block">✨ おすすめ</span>` : ""}<div class="t">${esc(d.title)}</div><div class="s">${esc([d.area, c.n].filter(Boolean).join(" ・ "))}${d.by ? ` ・ ${esc(nameOf(d.by))}が追加` : ""}</div>${d.memo ? `<div class="m">${esc(d.memo)}</div>` : ""}</div>
  </div>`;
}
function renderDeck(){
  const body = document.getElementById("swipebody"); if (!body) return;
  while (S.deckPos < S.deck.length && !deckItem(S.deck[S.deckPos])) S.deckPos++;
  const cur = deckItem(S.deck[S.deckPos]);
  if (!cur) {
    const passed = passedCount();
    body.innerHTML = `<div class="empty"><div class="big">🎉</div><p><b>ぜんぶ見たよ！</b></p><p>${isPaired() ? "ふたりとも右にした場所は「ふたりで♡」に出ます" : "恋人が参加したら、ふたりでスワイプしてみてね"}</p></div>
      ${passed ? `<button class="btn ghost block" data-a="unpass">パスした${passed}件をもう一度見る</button><div class="gap"></div>` : ""}
      <button class="btn block" data-a="close">とじる</button>`;
    return;
  }
  let next = null;
  for (let i = S.deckPos + 1; i < S.deck.length && !next; i++) next = deckItem(S.deck[i]);
  body.innerHTML = `<div class="deck">${next ? cardHtml(next, true) : ""}${cardHtml(cur)}</div>
    <div class="sbtns"><button class="sbtn" data-a="sw" data-v="0" aria-label="パス">✕</button><button class="sbtn like" data-a="sw" data-v="1" aria-label="行きたい">♥</button></div>
    <div class="gap"></div><div class="sprog">${S.deckPos + 1} / ${S.deckTotal}</div>`;
  bindSwipe(document.getElementById("topcard"));
}
function bindSwipe(card){
  let sx = 0, sy = 0, dx = 0, drag = false;
  const like = card.querySelector(".stamp.like"), pass = card.querySelector(".stamp.pass");
  card.addEventListener("pointerdown", e => { drag = true; sx = e.clientX; sy = e.clientY; dx = 0; card.setPointerCapture(e.pointerId); card.style.transition = "none"; });
  card.addEventListener("pointermove", e => {
    if (!drag) return; dx = e.clientX - sx;
    card.style.transform = `translate(${dx}px,${(e.clientY - sy) * 0.2}px) rotate(${dx / 16}deg)`;
    like.style.opacity = Math.max(0, Math.min(1, dx / 90)); pass.style.opacity = Math.max(0, Math.min(1, -dx / 90));
  });
  const end = () => {
    if (!drag) return; drag = false; card.style.transition = "";
    if (Math.abs(dx) > 90) swipeOut(dx > 0);
    else { card.style.transform = ""; like.style.opacity = 0; pass.style.opacity = 0; }
  };
  card.addEventListener("pointerup", end); card.addEventListener("pointercancel", end);
}
function swipeOut(isLike){
  const card = document.getElementById("topcard"); if (!card || card.dataset.gone) return;
  card.dataset.gone = "1"; card.removeAttribute("id");
  const key = card.dataset.key;
  card.querySelector(isLike ? ".stamp.like" : ".stamp.pass").style.opacity = 1;
  card.style.transform = `translate(${isLike ? 700 : -700}px,40px) rotate(${isLike ? 30 : -30}deg)`; card.style.opacity = "0";
  saveSwipe(key, isLike).catch(e => toast("保存できませんでした（" + (e.code || e.message) + "）"));
  setTimeout(() => { S.deckPos++; renderDeck(); }, 260);
}
async function saveSwipe(key, isLike){
  if (!key.startsWith("sample:")) {
    return updateDoc(doc(db, "rooms", S.roomId, "places", key), isLike ? { ["votes." + me()]: true, ["passes." + me()]: deleteField() } : { ["passes." + me()]: true });
  }
  const k = key.slice(7), x = SAMPLES.find(s => s.k === k), id = sampleId(k);
  if (!isLike) {
    S.profile.passedSamples = [...new Set([...passedSamples(), k])];
    return setDoc(doc(db, "users", me()), { passedSamples: arrayUnion(k) }, { merge: true });
  }
  // 「行きたい」にしたおすすめは、ふたりの候補に追加する（同じおすすめは同じ候補になる）
  if (S.places.some(p => p.id === id)) return updateDoc(doc(db, "rooms", S.roomId, "places", id), { ["votes." + me()]: true });
  return setDoc(doc(db, "rooms", S.roomId, "places", id), {
    title: x.t, cat: x.c, area: x.a, memo: x.m, url: "", by: me(), sample: true, visited: false,
    votes: { [me()]: true }, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }, { merge: true });
}
async function unpass(){
  const list = S.places.filter(p => !p.visited && (p.passes || {})[me()]);
  try {
    const b = writeBatch(db);
    list.forEach(p => b.update(doc(db, "rooms", S.roomId, "places", p.id), { ["passes." + me()]: deleteField() }));
    if (passedSamples().length) b.set(doc(db, "users", me()), { passedSamples: [] }, { merge: true });
    await b.commit();
    S.profile.passedSamples = [];
    setTimeout(openSwipe, 200);
  } catch (e) { toast("うまくいきませんでした（" + (e.code || e.message) + "）"); }
}

/* =============== マッチ！（ふたりとも行きたいが新しくできたとき） =============== */
/* ♡を押したときの小さいハート */
function heartPop(el){
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 4; i++) {
    const d = document.createElement("div"); d.className = "hpop"; d.textContent = ["💗","💕","♡","💖"][i];
    d.style.left = (r.left + r.width / 2 - 9 + (Math.random() * 30 - 15)) + "px"; d.style.top = (r.top - 4) + "px";
    d.style.setProperty("--dx", (Math.random() * 60 - 30) + "px"); d.style.animationDelay = i * 0.06 + "s";
    document.body.appendChild(d); setTimeout(() => d.remove(), 1100);
  }
}
function checkMatches(){
  if (!isPaired() || !S.roomId) return;
  const key = "futari_seen_" + S.roomId;
  const ids = S.places.filter(p => !p.visited && isBoth(p)).map(p => p.id);
  let seen = null; try { seen = JSON.parse(localStorage.getItem(key) || "null"); } catch {}
  if (!Array.isArray(seen)) { try { localStorage.setItem(key, JSON.stringify(ids)); } catch {} return; }
  const fresh = ids.filter(id => !seen.includes(id));
  if (!fresh.length) return;
  try { localStorage.setItem(key, JSON.stringify([...new Set([...seen, ...ids])].slice(-500))); } catch {}
  showMatch(fresh);
}
function showMatch(ids){
  const ps = ids.map(id => S.places.find(p => p.id === id)).filter(Boolean);
  if (!ps.length) return;
  const fx = document.getElementById("fx");
  fx.innerHTML = `<div class="fx"><div class="box">
    <div class="hearts">💞</div><h2>マッチ！</h2>
    <p class="muted" style="margin:4px 0 0">${esc(nameOf(me()))}と${esc(nameOf(partnerUid()))}、ふたりとも行きたい場所が見つかったよ</p>
    ${ps.slice(0, 3).map(p => `<div class="pl">${catOf(p.cat).e} ${esc(p.title)}${p.area ? `<small>${esc(p.area)}</small>` : ""}</div>`).join("")}
    ${ps.length > 3 ? `<p class="muted">ほかに ${ps.length - 3}件</p>` : ""}
    <button class="btn block" data-a="fxclose">やったー！</button><div class="gap"></div>
    <button class="btn ghost block" data-a="fxopen" data-id="${ps[0].id}">くわしく見る</button>
  </div></div>`;
  ["💗","💞","💕","✨","🤍","💜"].forEach((e, i) => { for (let k = 0; k < 3; k++) { const d = document.createElement("div"); d.className = "fly"; d.textContent = e; d.style.left = Math.random() * 92 + "vw"; d.style.animationDelay = (i * 0.12 + k * 0.35) + "s"; fx.appendChild(d); } });
}

function viewMemo(){
  const arr = S.places.filter(p => p.visited).sort((a, b) => String(b.visitedAt || "").localeCompare(String(a.visitedAt || "")) || ms(b.updatedAt) - ms(a.updatedAt));
  if (!arr.length) return `<div class="empty"><div class="big">📷</div><p>行った場所がここにたまっていきます</p><p>候補をひらいて「行った！」を押してね</p></div>`;
  const prev = S.notesPrev ?? notesSeenAt(), pu = partnerUid();
  return `<div class="sec">ふたりで行った場所 ・ ${arr.length}件</div><div class="memos">${arr.map(p => {
    const c = catOf(p.cat), ns = noteList(p);
    const isNew = pu && (p.notes?.[pu]?.at || 0) > prev;
    return `<div class="memo" data-a="open" data-id="${p.id}"><div class="ph ${p.photo ? "img" : ""}" style="background:${p.photo ? `url('${p.photo}')` : c.c}">${c.e}</div><div class="t">${esc(p.title)}${isNew ? `<span class="newmark">NEW</span>` : ""}</div><div class="d">${esc(fmtDate(p.visitedAt))}</div>${
      ns.length ? ns.map(([u, n]) => `<div class="nt">${avHtml(u)}<span>${esc(n.t)}</span></div>`).join("") : p.visitNote ? `<div class="n">${esc(p.visitNote)}</div>` : ""}</div>`;
  }).join("")}</div>`;
}

