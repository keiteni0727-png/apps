"use strict";
/* ウリログ：うりぼーのお楽しみ（季節・ごはん・おみやげ・アルバム・おてがみ・きせかえ・おへや・おみくじ・どんぐり拾い）
   ファイルの分け方：core.js（共通の道具・状態）→ 各機能 → events.js（ボタン）→ boot.js（Firebase につないで起動）
   どのファイルの関数・変数も、ほかのファイルからそのまま使える（ふつうの <script> で順に読み込む） */
/* ---------- 季節と特別な日 ---------- */
function uriSpecial(){
  try { const l = annivOn(today()); return l.length ? l[0] : null; } catch (e) { return null; }
}
function uriSeason(){
  const sp = uriSpecial();
  if (sp) return { fall: ["🎉", "🎊", "✨"], prop: "🎂", ban: `${sp.e} きょうは${sp.t}！`, line: `${sp.t}、おめでとうぷぎ！` };
  const d = new Date(), m = d.getMonth() + 1, day = d.getDate();
  if (m === 1 && day <= 7) return { fall: ["✨"], prop: "🎍", line: "あけましておめでとうぷぎ！ことしもよろしくね" };
  if (m === 2 && day === 14) return { fall: ["💗", "💝"], prop: "🍫", line: "きょうはバレンタインぷぎ！" };
  if (m === 10 && day >= 25) return { fall: ["🦇", "🍂"], prop: "🎃", line: "トリック・オア・トリート！ぷぎ" };
  if (m === 12 && day >= 20 && day <= 25) return { fall: ["❄️", "✨"], prop: "🎄", line: "メリークリスマスぷぎ！" };
  if (m === 12 || m <= 2) return { fall: ["❄️"], prop: "⛄", line: "さむいぷぎ…くっついてあったまろ" };
  if (m <= 4) return { fall: ["🌸"], prop: "🌷", line: "さくらがきれいぷぎ！おはなみ行きたいな" };
  if (m === 5) return { fall: ["🍃"], prop: "🌱", line: "ぽかぽかで、おでかけびよりぷぎ〜" };
  if (m === 6) return { fall: ["💧"], prop: "☔", line: "雨の日はおうちデートもいいね" };
  if (m <= 8) return { fall: ["🫧"], prop: "🌻", line: "あついぷぎ…かき氷たべたいな" };
  return { fall: ["🍁", "🍂"], prop: "🍄", line: "秋はおいしいものいっぱいぷぎ！" };
}
function uriDecoHtml(){
  const s = uriSeason();
  const parts = Array.from({ length: 7 }, (_, i) => `<span class="ufall" style="left:${(i * 14 + 4) % 96}%;animation-delay:${(i * 1.3) % 5}s;animation-duration:${6 + (i % 3) * 1.5}s">${s.fall[i % s.fall.length]}</span>`).join("");
  return `<div class="udeco">${parts}</div><span class="uprop">${s.prop}</span>`;
}

/* ---------- ふたりそろってごはん ---------- */
function uriCoopCheck(){
  const t = today(), pu = partnerUid(); if (!pu || !S.pet || !S.roomId) return;
  const f = S.pet.feeds || {}; if (f[me()]?.last !== t || f[pu]?.last !== t) return;
  const c = S.pet.coop || {}; if (c.last === t) return;
  const val = { last: t, streak: c.last === addDays(t, -1) ? (c.streak || 0) + 1 : 1, total: (c.total || 0) + 1, at: Date.now() };
  S.pet = { ...S.pet, coop: val };
  setDoc(petRef(), { coop: val }, { merge: true }).catch(() => {});
}
function coopNow(){ const c = S.pet?.coop || {}, t = today(); return { streak: c.last === t || c.last === addDays(t, -1) ? (c.streak || 0) : 0, total: c.total || 0, todayDone: c.last === t }; }
function uriCoopFx(){
  if (!coopNow().todayDone) return;
  const k = "uriCoop_" + S.roomId; try { if (localStorage.getItem(k) === today()) return; localStorage.setItem(k, today()); } catch (e) { return; }
  setTimeout(() => { if (!document.getElementById("uri") || uriBusy) return; uriFx(["💞", "🤝", "💕", "+5"], 6); uriSay("ふたりからごはん！ボーナスぷぎ！"); }, 900);
}

/* ---------- おみやげ（「行った！」の数でもらえる） ---------- */
function uriSouvCheck(){
  const k = "uriSouv_" + S.roomId; let seen = [];
  try { seen = JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return; }
  const got = UITEMS.filter(it => it.v && visitedCount() >= it.v).map(it => it.id);
  try { localStorage.setItem(k, JSON.stringify(got)); } catch (e) {}
  if (seen === null) return; // はじめては演出なし
  const nw = got.filter(id => !seen.includes(id));
  if (!nw.length) return;
  const it = itemOf(nw[nw.length - 1]);
  setTimeout(() => { uriFx(["🎁", it.e, "✨"], 5); uriSay(`おでかけのおみやげに${it.n}をもらったぷぎ！`); toast(`${it.e} おみやげ「${it.n}」をもらいました！きせかえで使えるよ`); }, 700);
}

/* ---------- 成長アルバム ---------- */
function uriStageDates(){
  const L = ust(), out = {};
  if (uriGen() === 2) { // 2代目：日ごとのせいちょうから
    out[0] = S.pet.g2.bornAt; let x = 0;
    g2Days(uriState().raw).forEach(([d, n]) => { const b = x; x += n; L.forEach(([v], i) => { if (i > 0 && b < v && x >= v && !out[i]) out[i] = new Date(d + "T12:00:00").getTime(); }); });
    return out;
  }
  const ev = uriEvents().slice().sort((a, b) => a.at - b.at); let x = 0; out[0] = S.pet?.bornAt;
  ev.forEach(e => { const b = x; x += e.xp; L.forEach(([n], i) => { if (i > 0 && b < n && x >= n && !out[i]) out[i] = e.at || Date.now(); }); });
  return out;
}
function albumHtml(){
  const u = uriState(), dts = uriStageDates(), L = ust(), g1 = uriGen() === 2 ? S.pet.g1 : null;
  const born = uriBornAt(), md = at => esc(fmtShort(localDay(at)).replace(/\(.\)/, ""));
  return `<div class="card"><h2>📖 成長アルバム<button class="linkbtn" style="margin-left:auto;padding:0;font-weight:400" data-a="uriInfo">ごはんの記録 ›</button></h2>
  ${g1 ? `<div class="asub">2代目 ${esc(uriName())}</div>` : ""}
  <div class="ustages">${L.map(([n, nm], i) => `<div class="${i > u.st ? "lock" : ""} ${i === u.st ? "on" : ""}"><div class="uri">${uriSvg(i, "happy")}</div>${i > u.st + 1 ? "？？？" : esc(g1 ? nm.replace("うりぼー", "") : nm)}<br>${i <= u.st && dts[i] ? md(dts[i]) : i > u.st ? `あと${n - u.xp}` : "—"}</div>`).join("")}</div>
  ${born ? `<p class="muted" style="text-align:center;font-size:12px;margin:0">${esc(fmtShort(localDay(born)))}にうまれて、きょうで${dayDiff(localDay(born), today()) + 1}日目</p>` : ""}</div>
  ${g1 ? `<div class="card ag1"><div class="uri">${uriSvg(g1.st ?? 9, "happy", null, 1)}</div><div class="main"><div class="asub" style="margin:0">1代目</div><b>${esc(g1.name || "ウリ")}</b><small>${esc(USTAGES1[g1.st ?? 9][1])}まで育ったよ</small><small>${md(g1.bornAt)} 〜 ${md(g1.endAt)}（${dayDiff(localDay(g1.bornAt), localDay(g1.endAt)) + 1}日間）</small></div></div>` : ""}`;
}

/* ---------- 伝言係（おてがみ） ---------- */
const lettersIn = () => S.letters.filter(l => l.to === me() && !l.read).sort((a, b) => (a.at || 0) - (b.at || 0));
const lDelivered = new Set();
function letterDeliver(force){
  if (!S.room || !S.roomId) return;
  const l = lettersIn()[0];
  if (!l) return;
  if (!force && (lDelivered.has(l.id) || $layer.innerHTML)) return;
  lDelivered.add(l.id);
  const u = uriState();
  $layer.innerHTML = `<div class="ov mid" data-a="ovclose"><div class="lcard">
    <div class="lstage"><div class="uri s${u.st} uwalk">${uriSvg(u.st, "happy", uw())}</div><span class="lenv">💌</span></div>
    <div class="lttl">${esc(nameOf(l.from))}からおてがみだよ！</div>
    <p class="muted" style="margin:2px 0 14px">${esc(uriName())}があずかってきたぷぎ</p>
    <button class="btn block" data-a="letterRead" data-id="${l.id}">ひらく</button>
    <button class="linkbtn" data-a="close">あとで</button>
  </div></div>`;
}
async function letterRead(id){
  const l = S.letters.find(x => x.id === id); if (!l) return;
  const mine = l.from === me();
  $layer.innerHTML = `<div class="ov mid" data-a="ovclose"><div class="lcard">
    <div class="lpaper"><div class="lto">${esc(nameOf(l.to))}へ</div><div class="ltxt">${esc(l.t)}</div><div class="lfrom">${esc(fmtShort(localDay(l.at || Date.now())))}　${esc(nameOf(l.from))}より</div></div>
    ${mine ? `<p class="muted" style="margin:10px 0 0">${l.read ? `${esc(nameOf(l.to))}が読んでくれたよ💗` : "まだとどけ中…"}</p>` : ""}
    <div style="display:flex;gap:8px;margin-top:14px"><button class="btn ghost" style="flex:1" data-a="letterDone">とじる</button>${mine ? "" : `<button class="btn" style="flex:1" data-a="letterNew">おへんじを書く</button>`}</div>
  </div></div>`;
  if (l.to === me() && !l.read) {
    try { await updateDoc(doc(db, "rooms", S.roomId, "letters", id), { read: true, readAt: Date.now() }); } catch (e) {}
  }
}
function openLetterNew(){
  const pu = partnerUid(); if (!pu) { toast("恋人が参加してから使えるよ"); return; }
  openSheet(`<h3>💌 おてがみをあずける<button class="x" data-a="close">×</button></h3>
  <p class="muted" style="margin-top:-6px">${esc(nameOf(pu))}がアプリを開いたら、${esc(uriName())}が届けにいくよ。</p>
  <form id="lf" class="lform"><textarea class="in" name="t" rows="7" maxlength="300" placeholder="いつもありがとう。こんどの週末たのしみだね" required></textarea><div class="gap"></div><button class="btn block">${esc(uriName())}にあずける</button></form>`);
  document.getElementById("lf").onsubmit = async ev => {
    ev.preventDefault();
    const t = String(ev.target.t.value || "").trim().slice(0, 300); if (!t) return;
    const btn = ev.target.querySelector("button"); btn.disabled = true;
    try {
      await addDoc(collection(db, "rooms", S.roomId, "letters"), { from: me(), to: pu, t, at: Date.now(), read: false });
      closeSheet();
      if (S.tab !== "uri") { S.tab = "uri"; render(); window.scrollTo(0, 0); }
      setTimeout(() => { uriFx(["💌", "💕"], 4); uriSay("あずかったぷぎ！とどけてくるね"); }, 200);
    } catch (e) { btn.disabled = false; toast("あずけられませんでした（" + (e.code || e.message) + "）"); }
  };
}
function letterHistHtml(){
  const tab = S.lTab || "in";
  const list = S.letters.filter(l => tab === "in" ? l.to === me() : l.from === me());
  if (!list.length) return `<p class="muted" style="text-align:center">まだありません</p>`;
  return list.map(l => `<div class="litem ${tab === "in" && !l.read ? "new" : ""}" data-a="letterRead" data-id="${l.id}">
    <div class="main"><div class="t">${esc(l.t)}</div><small>${esc(fmtShort(localDay(l.at || Date.now())))} ・ ${tab === "in" ? (l.read ? "よんだ" : "まだ読んでない") : (l.read ? `${esc(nameOf(l.to))}が読んだ💗` : "とどけ中…")}</small></div>
    ${tab === "out" ? `<button class="linkbtn" data-a="letterDel" data-id="${l.id}">けす</button>` : ""}</div>`).join("");
}
function openLetters(tab){
  if (tab) S.lTab = tab;
  const t = S.lTab || "in", nIn = S.letters.filter(l => l.to === me()).length, nOut = S.letters.filter(l => l.from === me()).length;
  openSheet(`<h3>💌 これまでのおてがみ<button class="x" data-a="close">×</button></h3>
  <div class="seg"><button class="${t === "in" ? "on" : ""}" data-a="lTab" data-v="in">もらった ${nIn}</button><button class="${t === "out" ? "on" : ""}" data-a="lTab" data-v="out">おくった ${nOut}</button></div>
  <div id="lhist">${letterHistHtml()}</div>`);
}
function letterCardHtml(){
  const pu = partnerUid(), pn = pu ? nameOf(pu) : "恋人", nIn = lettersIn().length;
  const lastOut = S.letters.find(l => l.from === me());
  return `<div class="card"><h2>💌 うりぼーの伝言係</h2>
    ${nIn ? `<button class="btn lav block" data-a="letterGet">${esc(pn)}からのおてがみ（${nIn}通）をうけとる</button><div class="gap"></div>` : ""}
    <button class="btn block" data-a="letterNew">${esc(pn)}へおてがみをあずける</button>
    <div class="lstat">${lastOut ? (lastOut.read ? `さいごのおてがみは、${esc(pn)}が読んでくれたよ💗` : `さいごのおてがみは、いまとどけ中…`) : `あずけると、${esc(pn)}がアプリを開いたときに${esc(uriName())}が届けにいくよ`}</div>
    ${S.letters.length ? `<div style="text-align:center"><button class="linkbtn" data-a="letters">これまでのおてがみ ›</button></div>` : ""}
  </div>`;
}

function openWardrobe(tab){
  if (tab) S.wTab = tab;
  if (S.wTab === "room") return openRoomShop();
  const t = S.wTab || "have", u = uriState(), w = uw(), bal = S.pet?.acorns || 0, vc = visitedCount(), mon = new Date().getMonth() + 1;
  const sl = S.wSlot || "all", inSl = it => sl === "all" || it.s === sl;
  const have = UITEMS.filter(owned).filter(inSl);
  const rank = it => it.v ? 2 : it.o ? 3 : it.g ? 4 : it.dx ? 1 : 0;
  const shop = UITEMS.filter(it => !owned(it) && (it.v || !it.m || it.m.includes(mon))).filter(inSl).sort((a, b) => rank(a) - rank(b));
  const cell = (it, foot, act, cls) => `<button class="witem ${cls || ""}" ${act ? `data-a="${act}" data-id="${it.id}"` : "disabled"}><div class="uri">${uriSvg(u.st, "happy", { [it.s]: it.id })}</div><b>${esc(it.n)}</b><small>${foot}</small></button>`;
  const body = t === "have"
    ? (have.length ? have.map(it => cell(it, w[it.s] === it.id ? "つけてる ✓" : USLOTS[it.s], "uriWear", w[it.s] === it.id ? "on" : "")).join("") : `<p class="muted" style="grid-column:1/-1;text-align:center">まだ持ってないよ。おみせで買ってみよう</p>`)
    : (shop.length ? shop.map(it => it.v ? cell(it, `おでかけ${it.v}か所でもらえる（いま${vc}）`, "", "lock") : it.o || it.g ? cell(it, it.o ? "おつかいで見つかるかも" : `${GACHAS[it.g - 1].n}ガチャで出るよ`, "", "lock") : cell(it, `${AC}${it.p}${it.m ? " ・ 期間限定" : it.dx ? " ・ ごうか" : ""}`, "uriBuy", `${bal < it.p ? "poor" : ""} ${it.dx ? "dx" : ""}`)).join("") : `<p class="muted" style="grid-column:1/-1;text-align:center">ぜんぶ手に入れたよ！</p>`);
  openSheetK("ward", `<h3>🎀 きせかえ・おみせ<button class="x" data-a="close">×</button></h3>
  <div class="wprev"><div class="uri s${u.st}">${uriSvg(u.st, "happy", w)}</div><div class="wbal">${AC} ${bal}こ<small>ふたりのおさいふ</small></div></div>
  ${wardrobeSeg(t)}
  <div class="chips">${[["all", "すべて"], ...Object.entries(USLOTS)].map(([k, n]) => `<button class="chip ${sl === k ? "on" : ""}" data-a="wSlot" data-v="${k}">${n}</button>`).join("")}</div>
  <div class="wgrid">${body}</div>
  <p class="muted" style="text-align:center;font-size:12px">${t === "have" ? "タップでつける・はずす（同じ場所のものは1つまで）" : `${AC}はどんぐり拾い・おつかいなどでたまるよ。おつかい・ガチャでしか手に入らないものも`}</p>`);
}
/* ---------- うりぼーのおへや ---------- */
// s:置き場所 p:どんぐり（0は最初から持っている）m:買える月 b:サムネイルの範囲（部品の座標）
const RSLOTS = { wall:"かべがみ", floor:"ゆか", win:"まど", deco:"かべかざり", fl:"ゆか（ひだり）", fr:"ゆか（みぎ）", rug:"ラグ" };
const RDEF = { wall: "w_pink", floor: "f_wood", win: "win_basic" };
const RPOS = { win: [250, 58], deco: [70, 56], fl: [62, 175], fr: [282, 173], rug: [160, 187] };
function rSky(){
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return { a: "#bfe3f7", b: "#fde2d4", sun: "#ffd27a", night: false };
  if (h >= 10 && h < 16) return { a: "#8fcbef", b: "#cdeafa", sun: "#ffe08a", night: false };
  if (h >= 16 && h < 19) return { a: "#f6a07a", b: "#fcd59a", sun: "#ff8f6b", night: false };
  return { a: "#26305e", b: "#4a4f8e", sun: "#fff6c8", night: true };
}
function rSkyIn(K, clip){
  const s = rSky();
  return `<linearGradient id="${K}sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.a}"/><stop offset="1" stop-color="${s.b}"/></linearGradient>
  <g clip-path="url(#${clip})"><rect x="-40" y="-40" width="80" height="80" fill="url(#${K}sk)"/>
  ${s.night ? `<circle cx="12" cy="-12" r="8" fill="${s.sun}"/><circle cx="16" cy="-15" r="7" fill="${s.a}"/>${[[-18, -18], [-8, 6], [-22, 10], [20, 12], [2, -24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="#fff"/>`).join("")}`
    : `<circle cx="14" cy="-12" r="8" fill="${s.sun}" opacity=".95"/><path d="M-26 8q4-7 11-4q4-6 11-1q7 0 6 6h-28z" fill="#fff" opacity=".9"/><path d="M4 22q3-5 8-3q4-4 9 0q5 0 4 5h-21z" fill="#fff" opacity=".8"/>`}</g>`;
}
const RITEMS = [
  // かべがみ
  { id:"w_pink",  s:"wall", n:"ももいろ",     e:"🩷", p:0 },
  { id:"w_cream", s:"wall", n:"ハートがら",   e:"💗", p:35 },
  { id:"w_mint",  s:"wall", n:"ミントストライプ", e:"🌿", p:35 },
  { id:"w_lav",   s:"wall", n:"ラベンダードット", e:"💜", p:35 },
  { id:"w_wood",  s:"wall", n:"ログハウス",   e:"🪵", p:45 },
  { id:"w_night", s:"wall", n:"よぞら",       e:"🌙", p:45 },
  // ゆか
  { id:"f_wood",   s:"floor", n:"フローリング", e:"🟫", p:0 },
  { id:"f_check",  s:"floor", n:"チェック",     e:"🏁", p:30 },
  { id:"f_tatami", s:"floor", n:"たたみ",       e:"🎋", p:35 },
  { id:"f_carpet", s:"floor", n:"ふかふかカーペット", e:"🧶", p:40 },
  // まど（外の空は、いまの時間で変わる）
  { id:"win_basic",   s:"win", n:"しかくいまど",   e:"🪟", p:0,  b:[-44, -38, 88, 82] },
  { id:"win_curtain", s:"win", n:"カーテンのまど", e:"🎀", p:30, b:[-50, -44, 100, 88] },
  { id:"win_round",   s:"win", n:"まるいまど",     e:"⭕", p:35, b:[-40, -40, 80, 80] },
  { id:"win_arch",    s:"win", n:"おはなのまど",   e:"🌷", p:40, b:[-44, -44, 88, 94] },
  // かべかざり
  { id:"d_frame",   s:"deco", n:"ふたりのしゃしん", e:"🖼️", p:20, b:[-28, -32, 56, 64] },
  { id:"d_clock",   s:"deco", n:"かべかけどけい",   e:"🕰️", p:25, b:[-26, -26, 52, 52] },
  { id:"d_garland", s:"deco", n:"ガーランド",       e:"🎏", p:25, b:[-62, -22, 124, 44] },
  { id:"d_wreath",  s:"deco", n:"リース",           e:"🎄", p:30, b:[-28, -28, 56, 60], m:[11, 12] },
  // ゆか（ひだり）
  { id:"bed",     s:"fl", n:"ベッド",   e:"🛏️", p:70, b:[-60, -68, 120, 72] },
  { id:"sofa",    s:"fl", n:"ソファ",   e:"🛋️", p:60, b:[-58, -58, 116, 62] },
  { id:"shelf",   s:"fl", n:"ほんだな", e:"📚", p:50, b:[-38, -108, 76, 112] },
  { id:"kotatsu", s:"fl", n:"こたつ",   e:"🍊", p:60, b:[-52, -50, 104, 54], m:[11, 12, 1, 2, 3] },
  { id:"xtree",   s:"fl", n:"クリスマスツリー", e:"🎄", p:80, b:[-42, -116, 84, 120], m:[11, 12] },
  // ゆか（みぎ）
  { id:"plant", s:"fr", n:"かんようしょくぶつ", e:"🪴", p:25, b:[-30, -80, 60, 84] },
  { id:"lamp",  s:"fr", n:"フロアランプ", e:"💡", p:35, b:[-30, -110, 60, 114] },
  { id:"kuma",  s:"fr", n:"くまのぬいぐるみ", e:"🧸", p:40, b:[-30, -58, 60, 62] },
  { id:"gifts", s:"fr", n:"プレゼントの山", e:"🎁", p:30, b:[-32, -52, 64, 56] },
  // ラグ
  { id:"r_round", s:"rug", n:"まるいラグ",   e:"⚪", p:20, b:[-84, -18, 168, 36] },
  { id:"r_heart", s:"rug", n:"ハートのラグ", e:"💗", p:30, b:[-70, -22, 140, 40] },
  { id:"r_star",  s:"rug", n:"ほしのラグ",   e:"⭐", p:30, b:[-72, -22, 144, 40] },
  // おつかいで見つかる（o）
  { id:"o_kinoko", s:"fr",   n:"きのこのランプ", e:"🍄", o:1, b:[-34, -80, 68, 82] },
  { id:"o_map",    s:"deco", n:"ぼうけんのちず", e:"🗺️", o:1, b:[-32, -30, 64, 56] },
  { id:"o_tent",   s:"fl",   n:"ちいさなテント", e:"⛺", o:1, b:[-56, -84, 112, 86] },
  // ノーマルガチャ（g:1）
  { id:"g_cactus", s:"fr",   n:"サボテン",       e:"🌵", g:1, b:[-28, -72, 56, 74] },
  { id:"g_mat",    s:"rug",  n:"しかくいマット", e:"🟦", g:1 },
  // レアガチャ（g:2）
  { id:"g_yume",   s:"wall", n:"ゆめかわストライプ", e:"🦄", g:2 },
  { id:"g_rainbow",s:"deco", n:"にじのかざり",   e:"🌈", g:2, b:[-58, -46, 116, 70] },
  { id:"g_bowl",   s:"fr",   n:"きんぎょばち",   e:"🐠", g:2, b:[-30, -66, 60, 68] },
  { id:"g_cloud",  s:"rug",  n:"くものラグ",     e:"☁️", g:2 },
  // 超レアガチャ（g:3）
  { id:"g_merry",  s:"fl",   n:"メリーゴーランド", e:"🎠", g:3, b:[-58, -124, 116, 126] },
  { id:"g_aurora", s:"win",  n:"オーロラのまど", e:"🌌", g:3, b:[-46, -44, 92, 90] },
  // ごうかアイテム（dx）
  { id:"dx_cake",    s:"fr",    n:"おおきなケーキ", e:"🎂", p:160, dx:1, b:[-32, -92, 64, 94] },
  { id:"dx_marble",  s:"floor", n:"だいりせきのゆか", e:"🤍", p:180, dx:1 },
  { id:"dx_castle",  s:"wall",  n:"おしろのかべ",   e:"🏰", p:200, dx:1 },
  { id:"dx_chand",   s:"deco",  n:"シャンデリア",   e:"✨", p:220, dx:1, b:[-36, -56, 72, 84] },
  { id:"dx_stained", s:"win",   n:"ステンドグラスのまど", e:"⛪", p:250, dx:1, b:[-46, -52, 92, 100] },
  { id:"dx_canopy",  s:"fl",    n:"てんがいつきベッド", e:"👸", p:300, dx:1, b:[-64, -116, 128, 118] }
];
const ritemOf = id => RITEMS.find(x => x.id === id);
const rOwned = it => (!it.p && !it.o && !it.g) || !!S.pet?.ritems?.[it.id];
const roomNow = () => { const r = { ...RDEF, ...(S.pet?.room || {}) }; Object.keys(r).forEach(k => { if (!ritemOf(r[k])) delete r[k]; }); return r; };
/* かべがみ・ゆかの模様（defs） */
function rWallDef(id, K){
  const P = (w, h, body, bg) => `<pattern id="${K}wp" width="${w}" height="${h}" patternUnits="userSpaceOnUse"><rect width="${w}" height="${h}" fill="${bg}"/>${body}</pattern>`;
  switch (id) {
    case "w_cream": return P(36, 32, `<path transform="translate(9 9) scale(.55)" d="M0 3C-1-1-6-1-6 2.5C-6 5.5-2 7.5 0 9.5C2 7.5 6 5.5 6 2.5C6-1 1-1 0 3z" fill="#f9cfda"/><path transform="translate(27 25) scale(.55)" d="M0 3C-1-1-6-1-6 2.5C-6 5.5-2 7.5 0 9.5C2 7.5 6 5.5 6 2.5C6-1 1-1 0 3z" fill="#fbdfe6"/>`, "#fff5ea");
    case "w_mint": return P(26, 10, `<rect width="13" height="10" fill="#d2eee1"/>`, "#e6f6ee");
    case "w_lav": return P(24, 24, `<circle cx="6" cy="6" r="2.6" fill="#dcd1f3"/><circle cx="18" cy="18" r="2.6" fill="#dcd1f3"/>`, "#efeafb");
    case "w_wood": return P(80, 20, `<rect y="17" width="80" height="3" fill="#cfa274"/><rect y="0" width="80" height="2" fill="#f2d6b0" opacity=".6"/><ellipse cx="24" cy="9" rx="3" ry="1.6" fill="#d4a97c"/>`, "#e7c398");
    case "w_night": return P(60, 50, `<circle cx="10" cy="12" r="1" fill="#fff"/><circle cx="40" cy="30" r="1.3" fill="#fff6c8"/><circle cx="52" cy="8" r=".8" fill="#fff"/><path d="M25 40l1 2.4l2.4 1l-2.4 1l-1 2.4l-1-2.4l-2.4-1l2.4-1z" fill="#fde68a"/>`, "#3a4278");
    case "g_yume": return P(40, 40, `<rect width="40" height="10" fill="#fde2ea"/><rect y="10" width="40" height="10" fill="#fff3d6"/><rect y="20" width="40" height="10" fill="#e3f4ec"/><rect y="30" width="40" height="10" fill="#ebe5fb"/><path d="M12 13l1 2.4l2.4 1l-2.4 1l-1 2.4l-1-2.4l-2.4-1l2.4-1z" fill="#fff"/><path d="M30 33l.8 1.8l1.8.8l-1.8.8l-.8 1.8l-.8-1.8l-1.8-.8l1.8-.8z" fill="#fff"/>`, "#fde2ea");
    case "dx_castle": return P(40, 24, `<rect width="40" height="24" fill="#ebe4f3"/><rect x="1" y="1" width="18" height="10" rx="1.5" fill="#f3eef9"/><rect x="21" y="13" width="18" height="10" rx="1.5" fill="#f3eef9"/><path d="M0 11.5h40M0 23.5h40M20 0v11.5M0 12v11.5M40 12v11.5" stroke="#d2c6e2" stroke-width="1"/>`, "#ebe4f3");
    default: return P(40, 40, ``, "#fbe6ec");
  }
}
function rFloorDef(id, K){
  const P = (w, h, body, bg) => `<pattern id="${K}fp" width="${w}" height="${h}" patternUnits="userSpaceOnUse" y="142"><rect width="${w}" height="${h}" fill="${bg}"/>${body}</pattern>`;
  switch (id) {
    case "f_check": return P(28, 28, `<rect width="14" height="14" fill="#fbd3df"/><rect x="14" y="14" width="14" height="14" fill="#fbd3df"/>`, "#fffafb");
    case "f_tatami": return P(90, 30, `<rect width="90" height="30" fill="none" stroke="#a9c27a" stroke-width="1.4"/><rect y="13" width="90" height="4" fill="#6f8f5a" opacity=".55"/>`, "#d5e4ad");
    case "dx_marble": return P(60, 30, `<path d="M0 0h60v30h-60z" fill="none" stroke="#e6dfe6" stroke-width="1.2"/><path d="M30 0v30" stroke="#e6dfe6" stroke-width="1.2"/><path d="M4 8q8 4 12 0t14 6M36 20q6-6 12-2t10 4" stroke="#d9cfdc" stroke-width=".9" fill="none"/>`, "#faf7f9");
    case "f_carpet": return P(10, 10, `<circle cx="3" cy="3" r="1.2" fill="#d6cbef"/><circle cx="8" cy="8" r="1" fill="#efe9fb"/>`, "#e4dcf6");
    default: return P(64, 24, `<rect y="10" width="64" height="2" fill="#c09068"/><rect y="22" width="64" height="2" fill="#c09068"/><rect x="40" width="1.6" height="11" fill="#c09068"/><rect x="12" y="12" width="1.6" height="11" fill="#c09068"/><rect y="0" width="64" height="3" fill="#ecc69c" opacity=".5"/>`, "#ddb286");
  }
}
/* 家具など（その場所の基準点からの座標で描く） */
function rItemSvg(id, K){
  const heart = (x, y, k, c) => `<path transform="translate(${x} ${y - 4 * k}) scale(${k})" d="M0 3C-1-1-6-1-6 2.5C-6 5.5-2 7.5 0 9.5C2 7.5 6 5.5 6 2.5C6-1 1-1 0 3z" fill="${c}"/>`;
  const star = (x, y, r, c) => `<path d="${Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r * .45 : r; return (i ? "L" : "M") + (x + Math.cos(a) * rr).toFixed(1) + " " + (y + Math.sin(a) * rr).toFixed(1); }).join("")}z" fill="${c}"/>`;
  switch (id) {
    case "win_basic": return `<defs><clipPath id="${K}wc"><rect x="-33" y="-31" width="66" height="60" rx="2"/></clipPath>${""}</defs>${rSkyIn(K, K + "wc")}
      <path d="M-38 -36h76v70h-76zM-33 -31v60h66v-60z" fill="#fff" fill-rule="evenodd"/><rect x="-2" y="-31" width="4" height="60" fill="#fff"/><rect x="-33" y="-3" width="66" height="4" fill="#fff"/><rect x="-43" y="33" width="86" height="7" rx="3" fill="#fff"/>`;
    case "win_curtain": return `<defs><clipPath id="${K}wc"><rect x="-33" y="-31" width="66" height="60" rx="2"/></clipPath></defs>${rSkyIn(K, K + "wc")}
      <path d="M-38 -36h76v70h-76zM-33 -31v60h66v-60z" fill="#fff" fill-rule="evenodd"/><rect x="-2" y="-31" width="4" height="60" fill="#fff"/><rect x="-43" y="33" width="86" height="7" rx="3" fill="#fff"/>
      <path d="M-48 -40h22q-4 30 2 58q-8 6-24 4q4-30 0-62z" fill="#f6a8bd"/><path d="M48 -40h-22q4 30-2 58q8 6 24 4q-4-30 0-62z" fill="#f6a8bd"/><path d="M-30 14q-8 2-12 0M30 14q8 2 12 0" stroke="#e2809c" stroke-width="3" stroke-linecap="round"/>
      <path d="M-50 -44h100v10q-10 6-20 0q-10 6-20 0q-10 6-20 0q-10 6-20 0q-10 6-20 0z" fill="#f4a3b8"/>`;
    case "win_round": return `<defs><clipPath id="${K}wc"><circle r="29"/></clipPath></defs>${rSkyIn(K, K + "wc")}
      <circle r="31.5" fill="none" stroke="#c99466" stroke-width="7"/><rect x="-1.6" y="-29" width="3.2" height="58" fill="#c99466"/><rect x="-29" y="-1.6" width="58" height="3.2" fill="#c99466"/>`;
    case "win_arch": return `<defs><clipPath id="${K}wc"><path d="M-30 30V-8a30 30 0 0 1 60 0V30z"/></clipPath></defs>${rSkyIn(K, K + "wc")}
      <path d="M-35 34V-8a35 35 0 0 1 70 0V34zM-30 30V-8a30 30 0 0 1 60 0V30z" fill="#fff" fill-rule="evenodd"/><rect x="-1.6" y="-38" width="3.2" height="70" fill="#fff"/>
      <rect x="-42" y="32" width="84" height="14" rx="4" fill="#c99466"/>${[[-32, "#f9b6c7"], [-18, "#fde68a"], [-4, "#f4a3b8"], [10, "#c7b8ef"], [24, "#f9b6c7"], [36, "#fde68a"]].map(([x, c]) => `<path d="M${x} 33q-2-7 0-10" stroke="#6fbb9c" stroke-width="2"/><circle cx="${x}" cy="23" r="4.2" fill="${c}"/><circle cx="${x}" cy="23" r="1.5" fill="#fff"/>`).join("")}`;
    case "d_frame": return `<rect x="-24" y="-28" width="48" height="56" rx="4" fill="#e9c46a"/><rect x="-18" y="-22" width="36" height="44" rx="2" fill="#fff5f0"/><path d="M-18 14q10-10 20-2q8-8 16-2v12h-36z" fill="#bfe5d4"/>${heart(-5, -2, 1.1, "#f4a3b8")}${heart(6, 0, .9, "#c7b8ef")}<path d="M0 -28l-8-10M0 -28l8-10" stroke="#c9992c" stroke-width="1.4"/>`;
    case "d_clock": { const d = new Date(), hA = (d.getHours() % 12 + d.getMinutes() / 60) * 30, mA = d.getMinutes() * 6;
      return `<circle r="22" fill="#c7b8ef"/><circle r="18" fill="#fff"/>${Array.from({ length: 12 }, (_, i) => `<circle cx="${(Math.sin(i * Math.PI / 6) * 14).toFixed(1)}" cy="${(-Math.cos(i * Math.PI / 6) * 14).toFixed(1)}" r="${i % 3 ? .9 : 1.6}" fill="#9580d0"/>`).join("")}
        <path d="M0 0L${(Math.sin(hA * Math.PI / 180) * 8).toFixed(1)} ${(-Math.cos(hA * Math.PI / 180) * 8).toFixed(1)}" stroke="#4a3540" stroke-width="2.6" stroke-linecap="round"/><path d="M0 0L${(Math.sin(mA * Math.PI / 180) * 12).toFixed(1)} ${(-Math.cos(mA * Math.PI / 180) * 12).toFixed(1)}" stroke="#4a3540" stroke-width="1.8" stroke-linecap="round"/><circle r="2" fill="#e2809c"/>`; }
    case "d_garland": return `<path d="M-60 -16Q0 10 60 -16" stroke="#b8a6e6" stroke-width="1.4" fill="none"/>${Array.from({ length: 9 }, (_, i) => { const t = i / 8, x = -56 + t * 112, y = -16 + Math.sin(t * Math.PI) * 12.5; return `<path d="M${(x - 5.5).toFixed(1)} ${(y - 1).toFixed(1)}h11l-5.5 12z" fill="${["#f9b6c7", "#fde68a", "#a9ddc5", "#c7b8ef", "#bfe1f6"][i % 5]}"/>`; }).join("")}`;
    case "d_wreath": return `${Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2; return `<ellipse cx="${(Math.cos(a) * 17).toFixed(1)}" cy="${(Math.sin(a) * 17).toFixed(1)}" rx="8" ry="5" fill="${i % 2 ? "#5aa886" : "#6fbb9c"}" transform="rotate(${(a * 180 / Math.PI + 90).toFixed(0)} ${(Math.cos(a) * 17).toFixed(1)} ${(Math.sin(a) * 17).toFixed(1)})"/>`; }).join("")}
      ${[[-10, -12], [13, -6], [-14, 10], [8, 14]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#e25b5b"/>`).join("")}<path d="M0 18l-9-6v14zM0 18l9-6v14z" fill="#e25b5b"/><circle cy="18" r="2.6" fill="#c94848"/><path d="M-2 20l-5 10M2 20l5 10" stroke="#e25b5b" stroke-width="3" stroke-linecap="round"/>`;
    case "bed": return `<rect x="-58" y="-66" width="15" height="66" rx="6" fill="#c99466"/><rect x="-58" y="-66" width="15" height="7" rx="3" fill="#e0b184"/>
      <rect x="-50" y="-9" width="6" height="9" fill="#a87650"/><rect x="47" y="-9" width="6" height="9" fill="#a87650"/><rect x="51" y="-34" width="7" height="34" rx="3" fill="#c99466"/>
      <rect x="-46" y="-32" width="100" height="24" rx="9" fill="#fff"/><rect x="-42" y="-45" width="27" height="15" rx="7" fill="#fff" stroke="#efe2e8" stroke-width="1"/>
      <path d="M-20 -38h66q8 0 8 10v8q0 6-8 6h-66q-6 0-6-6v-12q0-6 6-6z" fill="#f6a8bd"/>${[[-8, -28], [10, -24], [28, -30], [40, -22]].map(([x, y]) => heart(x, y, .55, "#fff")).join("")}`;
    case "sofa": return `<rect x="-44" y="-8" width="5" height="8" fill="#7a5a3c"/><rect x="39" y="-8" width="5" height="8" fill="#7a5a3c"/>
      <rect x="-48" y="-54" width="96" height="34" rx="15" fill="#8fc8dd"/><rect x="-46" y="-30" width="92" height="22" rx="9" fill="#b3dcea"/>
      <rect x="-56" y="-38" width="17" height="32" rx="8" fill="#7dbbd2"/><rect x="39" y="-38" width="17" height="32" rx="8" fill="#7dbbd2"/>
      <rect x="-34" y="-46" width="22" height="18" rx="7" fill="#fde68a" transform="rotate(-8 -23 -37)"/><rect x="14" y="-46" width="22" height="18" rx="7" fill="#f9b6c7" transform="rotate(8 25 -37)"/>${heart(25, -38, .6, "#fff")}`;
    case "shelf": { const bk = (x, y, w, h, c) => `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" rx="1.2" fill="${c}"/>`;
      return `<rect x="-34" y="-104" width="68" height="104" rx="4" fill="#c48f5f"/>${[-98, -66, -34].map(y => `<rect x="-29" y="${y}" width="58" height="27" fill="#93643f"/>`).join("")}
        ${bk(-27, -71, 7, 22, "#f4a3b8")}${bk(-19, -71, 6, 19, "#a9ddc5")}${bk(-12, -71, 8, 24, "#c7b8ef")}${bk(-3, -71, 6, 18, "#fde68a")}<rect x="6" y="-80" width="20" height="9" rx="2" fill="#9fd3ee"/><rect x="8" y="-89" width="16" height="9" rx="2" fill="#f9b6c7"/>
        ${bk(-27, -39, 8, 20, "#9fd3ee")}${bk(-18, -39, 6, 23, "#f4a3b8")}${bk(-11, -39, 7, 17, "#bfe5d4")}<circle cx="12" cy="-48" r="9" fill="#fff" stroke="#efe2e8"/><circle cx="12" cy="-48" r="4" fill="#f9b6c7"/>
        ${bk(-27, -7, 6, 21, "#c7b8ef")}${bk(-20, -7, 8, 18, "#fde68a")}${bk(-11, -7, 6, 22, "#f4a3b8")}${bk(-4, -7, 7, 16, "#a9ddc5")}<path d="M10 -7h16l-2-14h-12z" fill="#f3e2c7"/><ellipse cx="18" cy="-24" rx="7" ry="5" fill="#6fbb9c"/>
        <path d="M-6 -104q0-6 6-6q6 0 6 6z" fill="#f3e2c7"/><path d="M0 -110q-6-10-12-6M0 -110q6-12 12-6" stroke="#6fbb9c" stroke-width="2.4" fill="none" stroke-linecap="round"/>`; }
    case "kotatsu": return `<path d="M-48 0q-4-20 6-32h84q10 12 6 32z" fill="#f3a3a0"/>${[-30, -10, 10, 30].map(x => `<circle cx="${x}" cy="-14" r="3.2" fill="#fff" opacity=".7"/>`).join("")}<path d="M-46 -6h92" stroke="#e48683" stroke-width="2"/>
      <rect x="-46" y="-40" width="92" height="9" rx="3" fill="#c48f5f"/><rect x="-46" y="-40" width="92" height="3" rx="1.5" fill="#dcad7f"/>
      <ellipse cx="-4" cy="-41" rx="13" ry="3" fill="#f3e2c7"/>${[[-10, -46], [-2, -47], [6, -45], [-5, -52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#f5a04a"/><circle cx="${x - 1.5}" cy="${y - 1.5}" r="1.4" fill="#ffd08a"/>`).join("")}<path d="M28 -40v-6h10v6z" fill="#fff"/><path d="M30 -48q2-4 0-7M35 -48q2-4 0-7" stroke="#d9d0e3" stroke-width="1.2" fill="none"/>`;
    case "xtree": return `<rect x="-5" y="-14" width="10" height="14" fill="#a5703f"/>
      <path d="M0 -112l-24 38h48z" fill="#7cc4a4"/><path d="M0 -92l-31 44h62z" fill="#6fbb9c"/><path d="M0 -66l-38 52h76z" fill="#5aa886"/>
      <path d="M-26 -50q26 10 50-6M-32 -24q32 12 64-6" stroke="#fde68a" stroke-width="2" fill="none"/>
      ${[[-12, -78, "#e25b5b"], [10, -70, "#9fd3ee"], [-18, -44, "#f9b6c7"], [16, -40, "#e25b5b"], [-4, -56, "#fde68a"], [-26, -20, "#c7b8ef"], [24, -18, "#fde68a"], [2, -26, "#9fd3ee"]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="${c}"/>`).join("")}
      ${star(0, -112, 9, "#f2c94c")}<rect x="18" y="-14" width="18" height="14" rx="2" fill="#f4a3b8"/><rect x="25.5" y="-14" width="3" height="14" fill="#fff"/><rect x="-38" y="-11" width="16" height="11" rx="2" fill="#bfe1f6"/><rect x="-31.5" y="-11" width="3" height="11" fill="#fff"/>`;
    case "plant": return `<path d="M-14 0l-3-24h34l-3 24z" fill="#f3e2c7"/><rect x="-18" y="-28" width="36" height="6" rx="3" fill="#ead2ad"/>
      <path d="M0 -26q-2-20-4-34M0 -26q6-18 14-28M0 -26q-10-12-20-16" stroke="#5aa886" stroke-width="2.4" fill="none"/>
      <ellipse cx="-6" cy="-62" rx="10" ry="15" fill="#6fbb9c" transform="rotate(-12 -6 -62)"/><ellipse cx="16" cy="-56" rx="10" ry="14" fill="#5aa886" transform="rotate(30 16 -56)"/><ellipse cx="-20" cy="-42" rx="9" ry="13" fill="#7cc4a4" transform="rotate(-50 -20 -42)"/>
      <path d="M-6 -50v-22M16 -46l-6-20M-20 -34l6-16" stroke="#a9ddc5" stroke-width="1.2" fill="none"/>`;
    case "lamp": return `<circle cx="0" cy="-86" r="26" fill="#fff3b0" opacity=".35"/><ellipse cx="0" cy="-3" rx="14" ry="4" fill="#9580d0"/><rect x="-2" y="-84" width="4" height="82" fill="#b8a6e6"/>
      <path d="M-18 -78l6-26h24l6 26z" fill="#fff6c8"/><path d="M-18 -78h36" stroke="#f4a3b8" stroke-width="3" stroke-linecap="round"/>`;
    case "kuma": return `<ellipse cx="0" cy="-16" rx="18" ry="16" fill="#c99466"/><ellipse cx="0" cy="-12" rx="10" ry="9" fill="#ead2ad"/><ellipse cx="-15" cy="-4" rx="7" ry="5" fill="#b8835a"/><ellipse cx="15" cy="-4" rx="7" ry="5" fill="#b8835a"/>
      <circle cx="-13" cy="-50" r="6.5" fill="#c99466"/><circle cx="13" cy="-50" r="6.5" fill="#c99466"/><circle cx="-13" cy="-50" r="3.4" fill="#ead2ad"/><circle cx="13" cy="-50" r="3.4" fill="#ead2ad"/>
      <circle cx="0" cy="-38" r="15" fill="#d4a074"/><ellipse cx="0" cy="-33" rx="6.5" ry="5" fill="#f3e2c7"/><ellipse cx="0" cy="-35" rx="2.4" ry="1.8" fill="#4a3540"/><circle cx="-6" cy="-41" r="1.8" fill="#4a3540"/><circle cx="6" cy="-41" r="1.8" fill="#4a3540"/>
      <path d="M0 -24l-8-5v10zM0 -24l8-5v10z" fill="#f4a3b8"/><circle cy="-24" r="2.4" fill="#e2809c"/>`;
    case "gifts": return `<rect x="-28" y="-26" width="32" height="26" rx="3" fill="#f4a3b8"/><rect x="-14" y="-26" width="4" height="26" fill="#fff"/><path d="M-12 -26q-8-8-2-10q4 2 2 10q6-8 10-6q0 6-10 6" fill="none" stroke="#fff" stroke-width="2"/>
      <rect x="6" y="-20" width="22" height="20" rx="3" fill="#bfe1f6"/><rect x="15" y="-20" width="4" height="20" fill="#fde68a"/>
      <rect x="-16" y="-46" width="22" height="20" rx="3" fill="#c7b8ef"/><rect x="-7" y="-46" width="4" height="20" fill="#fff"/><circle cx="-5" cy="-47" r="3" fill="#fde68a"/>`;
    case "o_kinoko": return `<circle cx="0" cy="-48" r="34" fill="#fff3b0" opacity=".35"/><path d="M-9 0q-3-20 2-36h14q5 16 2 36z" fill="#f3e2c7"/><ellipse cx="0" cy="-1" rx="13" ry="3" fill="#ead2ad"/>
      <path d="M-32 -34q2-32 32-32q30 0 32 32q-32 7-64 0z" fill="#e86a5c"/><path d="M-32 -34q32 7 64 0q-32 3-64 0z" fill="#c94f45"/>${[[-16, -50, 5], [4, -58, 4.4], [18, -44, 4], [-2, -42, 3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join("")}
      <path d="M22 0q-2-8 1-14h6q3 6 1 14z" fill="#f3e2c7"/><path d="M15 -13q1-11 11-11q10 0 11 11q-11 3-22 0z" fill="#f5a04a"/><circle cx="23" cy="-18" r="1.8" fill="#fff"/>`;
    case "o_map": return `<path d="M0 -26l-3-4h6z" fill="#a5703f"/><path d="M-28 -22l19 4l18-4l19 4v40l-19-4l-18 4l-19-4z" fill="#f6e7c4"/><path d="M-9 -18v40M9 -22v40" stroke="#e3cc9c" stroke-width="1"/>
      <path d="M-22 12q8-14 18-6t16-10" stroke="#c9905a" stroke-width="1.6" stroke-dasharray="3 2.4" fill="none"/><path d="M14 -10l6 6M20 -10l-6 6" stroke="#e25b5b" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M-20 -8l4-8l4 8zM-14 -6l3.4-7l3.4 7z" fill="#6fbb9c"/><circle cx="-2" cy="12" r="3" fill="#9fd3ee"/>${star(20, 12, 4, "#f2c94c")}`;
    case "o_tent": return `<path d="M0 -66v-12" stroke="#a5703f" stroke-width="2"/><path d="M0 -78l12 4l-12 4z" fill="#f4a3b8"/>
      <path d="M-52 0L0 -66L52 0z" fill="#f2c94c"/><path d="M0 -66L52 0h-14z" fill="#e8b84a"/><path d="M0 -66L-20 0h40z" fill="#5d4e60" opacity=".85"/><path d="M0 -66L-20 0h9z" fill="#f7d77a"/><path d="M0 -66L20 0h-9z" fill="#f7d77a"/>
      <path d="M-56 2l6-6M56 2l-6-6" stroke="#a5703f" stroke-width="2" stroke-linecap="round"/><circle cx="-6" cy="-8" r="5" fill="#fff3b0" opacity=".9"/>`;
    case "g_rainbow": return `${[["#f9b6c7", 40], ["#fde68a", 34], ["#a9ddc5", 28], ["#bfe1f6", 22]].map(([c, r]) => `<path d="M${-r} 14A${r} ${r} 0 0 1 ${r} 14" stroke="${c}" stroke-width="6.5" fill="none"/>`).join("")}
      ${[-42, 42].map(x => `<g transform="translate(${x} 14)"><circle cx="-7" r="7" fill="#fff"/><circle cx="6" r="8" fill="#fff"/><circle cx="0" cy="-6" r="7" fill="#fff"/></g>`).join("")}`;
    case "g_bowl": return `<rect x="-16" y="-8" width="32" height="8" rx="3" fill="#c99466"/><circle cx="0" cy="-34" r="26" fill="#d9f0fb" opacity=".9"/><path d="M-24 -26a26 26 0 0 0 48 0q-24 6-48 0z" fill="#9fd3ee" opacity=".7"/>
      <ellipse cx="0" cy="-58" rx="15" ry="3.4" fill="#fff" stroke="#bfe1f6" stroke-width="1.4"/><path d="M-6 -32q8-8 14 0q-6 8-14 0zM-6 -32l-6-5v10z" fill="#f5a04a"/><circle cx="4" cy="-33" r="1.2" fill="#4a3540"/>
      <circle cx="10" cy="-44" r="2" fill="#fff" opacity=".8"/><circle cx="14" cy="-50" r="1.4" fill="#fff" opacity=".8"/><path d="M-14 -10q2-10-3-16M-10 -10q4-8 0-14" stroke="#6fbb9c" stroke-width="2" fill="none"/><ellipse cx="-12" cy="-46" rx="4" ry="7" fill="#fff" opacity=".5" transform="rotate(25 -12 -46)"/>`;
    case "g_cloud": return `<g transform="scale(1 .3)">${[[-56, 4, 26], [-28, -12, 32], [4, -16, 34], [34, -8, 30], [60, 6, 24], [0, 14, 40]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#eef4ff"/>`).join("")}<circle cx="-14" cy="0" r="4" fill="#9fb3d9"/><circle cx="14" cy="0" r="4" fill="#9fb3d9"/></g><ellipse cx="-24" cy="2" rx="5" ry="1.6" fill="#fbd3df"/><ellipse cx="24" cy="2" rx="5" ry="1.6" fill="#fbd3df"/>`;
    case "dx_cake": return `<ellipse cx="0" cy="-2" rx="30" ry="4" fill="#fff" stroke="#efe2e8"/><rect x="-26" y="-30" width="52" height="27" rx="6" fill="#fff5f0"/><path d="M-26 -27q6 8 9 0q4 8 9 0q4 8 9 0q4 8 8 0q4 8 9 0q4 8 9 0v-3h-53z" fill="#f9b6c7"/>
      <rect x="-18" y="-54" width="36" height="25" rx="5" fill="#fff5f0"/><path d="M-18 -51q5 7 8 0q4 7 8 0q4 7 8 0q4 7 8 0q3 6 4 0v-3h-36z" fill="#c7b8ef"/>
      ${[-20, -8, 4, 16].map(x => `<path d="M${x} -16q2.5-4 5 0q0 4-2.5 5q-2.5-1-2.5-5z" fill="#e25b5b"/>`).join("")}${[-12, 0, 12].map(x => `<path d="M${x - 2.5} -56q2.5-5 5 0q0 4-2.5 5q-2.5-1-2.5-5z" fill="#e25b5b"/>`).join("")}
      <rect x="-1.6" y="-72" width="3.2" height="16" rx="1" fill="#9fd3ee"/><path d="M0 -72q-4-6 0-12q4 6 0 12z" fill="#ffb84d"/><circle cx="0" cy="-77" r="7" fill="#fff3b0" opacity=".4"/>`;
    case "dx_chand": return `<circle cx="0" cy="0" r="30" fill="#fff3b0" opacity=".3"/><path d="M0 -56v34" stroke="#d9a92c" stroke-width="1.6"/><circle cy="-22" r="4" fill="#f2c94c"/>
      <path d="M-28 -6q14 14 28 0q14 14 28 0" stroke="#e8b84a" stroke-width="3" fill="none"/><path d="M0 -20v14" stroke="#e8b84a" stroke-width="3"/>
      ${[-28, -14, 0, 14, 28].map(x => `<rect x="${x - 2}" y="-16" width="4" height="10" rx="1" fill="#fff"/><path d="M${x} -16q-3-4 0-8q3 4 0 8z" fill="#ffb84d"/>`).join("")}
      ${[-21, -7, 7, 21].map(x => `<path d="M${x} 4l-2.6 5l2.6 6l2.6-6z" fill="#d6efff" stroke="#9fd3ee" stroke-width=".6"/>`).join("")}<path d="M0 6l-3 6l3 7l3-7z" fill="#fbd3df" stroke="#f4a3b8" stroke-width=".6"/>`;
    case "dx_stained": { const cl = ["#f4a3b8", "#9fd3ee", "#fde68a", "#a9ddc5", "#c7b8ef", "#f9b6c7"];
      return `<defs><clipPath id="${K}wc"><path d="M-32 34V-12a32 32 0 0 1 64 0V34z"/></clipPath></defs>
      <g clip-path="url(#${K}wc)">${Array.from({ length: 12 }, (_, i) => { const a1 = (i / 12) * Math.PI * 2, a2 = ((i + 1) / 12) * Math.PI * 2; return `<path d="M0 -6L${(Math.cos(a1) * 70).toFixed(1)} ${(-6 + Math.sin(a1) * 70).toFixed(1)}L${(Math.cos(a2) * 70).toFixed(1)} ${(-6 + Math.sin(a2) * 70).toFixed(1)}z" fill="${cl[i % 6]}" stroke="#5d4e60" stroke-width="1.4"/>`; }).join("")}
      <circle cy="-6" r="13" fill="#fff3b0" stroke="#5d4e60" stroke-width="1.6"/><path transform="translate(0 -10) scale(1.2)" d="M0 3C-1-1-6-1-6 2.5C-6 5.5-2 7.5 0 9.5C2 7.5 6 5.5 6 2.5C6-1 1-1 0 3z" fill="#e2809c"/></g>
      <path d="M-37 38V-12a37 37 0 0 1 74 0V38zM-32 34V-12a32 32 0 0 1 64 0V34z" fill="#c99466" fill-rule="evenodd"/><rect x="-44" y="36" width="88" height="8" rx="3" fill="#c99466"/>`; }
    case "dx_canopy": return `<rect x="-58" y="-108" width="5" height="108" rx="2" fill="#e8b84a"/><rect x="53" y="-108" width="5" height="108" rx="2" fill="#e8b84a"/>
      <path d="M-60 -112h120v8q-10 8-20 0q-10 8-20 0q-10 8-20 0q-10 8-20 0q-10 8-20 0q-10 8-20 0z" fill="#f4a3b8"/><circle cx="-56" cy="-114" r="4" fill="#f2c94c"/><circle cx="56" cy="-114" r="4" fill="#f2c94c"/>
      <path d="M-56 -104q-6 40 4 62q6 2 8-4q-8-26-4-58z" fill="#fbd3df" opacity=".9"/><path d="M56 -104q6 40-4 62q-6 2-8-4q8-26 4-58z" fill="#fbd3df" opacity=".9"/>
      <rect x="-50" y="-34" width="100" height="26" rx="9" fill="#fff"/><rect x="-46" y="-48" width="27" height="16" rx="7" fill="#fff" stroke="#efe2e8" stroke-width="1"/><rect x="-16" y="-48" width="27" height="16" rx="7" fill="#fff" stroke="#efe2e8" stroke-width="1"/>
      <path d="M-24 -38h70q8 0 8 10v8q0 6-8 6h-70q-6 0-6-6v-12q0-6 6-6z" fill="#c7b8ef"/>${[[-10, -28], [8, -24], [26, -30], [40, -22]].map(([x, y]) => star(x, y, 3.4, "#fff")).join("")}
      <rect x="-52" y="-9" width="6" height="9" fill="#c99466"/><rect x="46" y="-9" width="6" height="9" fill="#c99466"/>`;
    case "g_cactus": return `<path d="M-14 0l-3-20h34l-3 20z" fill="#e8a25a"/><rect x="-18" y="-24" width="36" height="6" rx="3" fill="#d48a43"/>
      <path d="M-7 -36h-7a5 5 0 0 1-5-5v-10M7 -42h7a5 5 0 0 0 5-5v-8" stroke="#6fbb9c" stroke-width="8" stroke-linecap="round" fill="none"/><rect x="-8" y="-64" width="16" height="44" rx="8" fill="#7cc4a4"/>
      <path d="M-3 -58v30M3 -54v26" stroke="#a9ddc5" stroke-width="1" /><circle cx="0" cy="-66" r="4" fill="#f4a3b8"/><circle cx="0" cy="-66" r="1.5" fill="#fde68a"/>`;
    case "g_mat": return `<rect x="-72" y="-13" width="144" height="26" rx="5" fill="#bfe1f6"/><rect x="-63" y="-8" width="126" height="16" rx="3" fill="none" stroke="#fff" stroke-width="2"/>${[-1, 1].map(d => Array.from({ length: 6 }, (_, i) => `<path d="M${d * 72} ${-10 + i * 4}h${d * 5}" stroke="#9fc9e6" stroke-width="1.4"/>`).join("")).join("")}`;
    case "g_merry": { const pony = (x, y, c) => `<path d="M${x} ${y - 22}V${y + 10}" stroke="#f2c94c" stroke-width="2"/><ellipse cx="${x}" cy="${y}" rx="12" ry="7" fill="#fff"/><circle cx="${x + 11}" cy="${y - 7}" r="5.5" fill="#fff"/><path d="M${x + 7} ${y - 12}q-4 4-2 9" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M${x - 7} ${y + 5}l-3 7M${x + 6} ${y + 5}l3 7" stroke="#fff" stroke-width="3" stroke-linecap="round"/><rect x="${x - 6}" y="${y - 8}" width="10" height="4" rx="1.5" fill="${c}"/>`;
      return `<ellipse cx="0" cy="-4" rx="56" ry="8" fill="#c7b8ef"/><rect x="-54" y="-12" width="108" height="8" rx="3" fill="#b8a6e6"/><rect x="-2.5" y="-100" width="5" height="88" fill="#f2c94c"/>
      ${pony(-28, -42, "#f4a3b8")}${pony(24, -52, "#9fd3ee")}
      <path d="M-56 -94L0 -122L56 -94z" fill="#fff"/>${[-56, -34, -12, 10, 32].map(x => `<path d="M0 -122L${x} -94h11z" fill="#f4a3b8"/>`).join("")}<path d="M-56 -96h112v6q-7 7-14 0q-7 7-14 0q-7 7-14 0q-7 7-14 0q-7 7-14 0q-7 7-14 0q-7 7-14 0q-7 7-14 0z" fill="#fde68a"/>${star(0, -124, 6, "#f2c94c")}`; }
    case "g_aurora": return `<defs><clipPath id="${K}wc"><rect x="-36" y="-34" width="72" height="66" rx="4"/></clipPath><linearGradient id="${K}au" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e2655"/><stop offset="1" stop-color="#3f3f86"/></linearGradient></defs>
      <g clip-path="url(#${K}wc)"><rect x="-40" y="-40" width="80" height="80" fill="url(#${K}au)"/>
      <path d="M-40 -6q14-22 28-8t28-12t28 6v14q-14-8-28 4t-28 4t-28 8z" fill="#7ee0b5" opacity=".55"/><path d="M-40 6q16-16 30-4t26-10t28 4v10q-12-6-28 4t-30 0t-26 6z" fill="#e7a3e8" opacity=".45"/>
      ${[[-26, -24], [-6, -28], [18, -22], [28, -8], [-30, 16], [8, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="#fff"/>`).join("")}<path d="M-40 32q20-10 40-2t40-4v20h-80z" fill="#2a2f5e"/></g>
      <path d="M-41 -39h82v76h-82zM-36 -34v66h72v-66z" fill="#e8b84a" fill-rule="evenodd"/><rect x="-46" y="36" width="92" height="7" rx="3" fill="#e8b84a"/>${star(-41, -39, 4, "#fff3b0")}${star(41, -39, 4, "#fff3b0")}`;
    case "r_round": return `<ellipse rx="80" ry="14" fill="#f9c6d4"/><ellipse rx="66" ry="10" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 4"/>`;
    case "r_heart": return `<g transform="scale(6.2 1.9) translate(0 -5)"><path d="M0 3C-1-1-6-1-6 2.5C-6 5.5-2 7.5 0 9.5C2 7.5 6 5.5 6 2.5C6-1 1-1 0 3z" fill="#f6a8bd"/></g>`;
    case "r_star": return `<g transform="scale(1 .3)">${star(0, 6, 66, "#fde68a")}${star(0, 6, 50, "#fff3b0")}</g>`;
  }
  return "";
}
/* 部屋ぜんぶ（うりぼーのうしろに置く） */
function roomSvg(room){
  room = room || roomNow();
  const K = "r" + (roomSvg.n = (roomSvg.n || 0) + 1);
  const at = (slot, inner) => { const p = RPOS[slot]; return inner ? `<g transform="translate(${p[0]} ${p[1]})">${inner}</g>` : ""; };
  const it = s => room[s] ? rItemSvg(room[s], K + s) : "";
  return `<svg class="uroomsvg" viewBox="-200 0 720 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>${rWallDef(room.wall, K)}${rFloorDef(room.floor, K)}
      <linearGradient id="${K}ws" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3a2230" stop-opacity=".12"/></linearGradient>
      <linearGradient id="${K}fs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2230" stop-opacity=".22"/><stop offset=".5" stop-color="#3a2230" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></linearGradient>
      <radialGradient id="${K}lt" cx=".42" cy=".1" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <radialGradient id="${K}vg" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#3a2230" stop-opacity="0"/><stop offset="1" stop-color="#3a2230" stop-opacity=".18"/></radialGradient>
      ${uPuffy(K + "p")}</defs>
    <rect x="-200" y="0" width="720" height="143" fill="url(#${K}wp)"/><rect x="-200" y="0" width="720" height="143" fill="url(#${K}ws)"/>
    <rect x="-200" y="142" width="720" height="58" fill="url(#${K}fp)"/><rect x="-200" y="142" width="720" height="58" fill="url(#${K}fs)"/>
    <rect x="-200" y="135" width="720" height="8" fill="#fff" filter="url(#${K}p)"/>
    <g filter="url(#${K}p)">${at("win", it("win"))}${at("deco", it("deco"))}</g>
    ${room.rug ? `<g filter="url(#${K}p)">${at("rug", it("rug"))}</g>` : ""}
    ${["fl", "fr"].map(s => room[s] ? `<ellipse cx="${RPOS[s][0]}" cy="${RPOS[s][1] + 1}" rx="${s === "fl" ? 54 : 26}" ry="5" fill="#3a2230" opacity=".14"/><g filter="url(#${K}p)">${at(s, it(s))}</g>` : "").join("")}
    <rect x="-200" y="0" width="720" height="200" fill="url(#${K}lt)"/><rect x="-200" y="0" width="720" height="200" fill="url(#${K}vg)"/>
  </svg>`;
}
/* おみせ用の小さな見本 */
function roomThumb(it){
  const K = "rt" + (roomThumb.n = (roomThumb.n || 0) + 1);
  if (it.s === "wall" || it.s === "floor") {
    const def = it.s === "wall" ? rWallDef(it.id, K) : rFloorDef(it.id, K).replace('y="142"', "");
    return `<svg viewBox="0 0 60 60" aria-hidden="true"><defs>${def}${uPuffy(K + "p")}</defs><rect x="4" y="4" width="52" height="52" rx="12" fill="url(#${K}${it.s === "wall" ? "wp" : "fp"})" filter="url(#${K}p)"/></svg>`;
  }
  if (it.s === "rug") return `<svg viewBox="-90 -90 180 180" aria-hidden="true"><defs>${uPuffy(K + "p")}</defs><g transform="scale(1 3.2)"><g filter="url(#${K}p)">${rItemSvg(it.id, K)}</g></g></svg>`;
  const [x, y, w, h] = it.b, m = Math.max(w, h);
  return `<svg viewBox="${x - (m - w) / 2} ${y - (m - h) / 2} ${m} ${m}" aria-hidden="true"><defs>${uPuffy(K + "p")}</defs><g filter="url(#${K}p)">${rItemSvg(it.id, K)}</g></svg>`;
}

/* おみせの「おへや」タブ */
function openRoomShop(){
  const u = uriState(), room = roomNow(), bal = S.pet?.acorns || 0, mon = new Date().getMonth() + 1;
  const sl = S.rSlot || "all";
  const rank = it => rOwned(it) ? 0 : it.o ? 3 : it.g ? 4 : it.dx ? 2 : 1;
  const list = RITEMS.filter(it => (sl === "all" || it.s === sl) && (rOwned(it) || !it.m || it.m.includes(mon))).sort((a, b) => rank(a) - rank(b));
  const cell = it => {
    const on = room[it.s] === it.id, own = rOwned(it);
    if (!own && (it.o || it.g)) return `<button class="witem ritem lock" disabled><div class="rth">${roomThumb(it)}</div><b>${esc(it.n)}</b><small>${it.o ? "おつかいで見つかるかも" : `${GACHAS[it.g - 1].n}ガチャで出るよ`}</small></button>`;
    const foot = own ? (on ? "おいてる ✓" : RSLOTS[it.s]) : `${AC}${it.p}${it.m ? " ・ 期間限定" : it.dx ? " ・ ごうか" : ""}`;
    return `<button class="witem ritem ${on ? "on" : ""} ${!own && bal < it.p ? "poor" : ""} ${!own && it.dx ? "dx" : ""}" data-a="${own ? "rmPlace" : "rmBuy"}" data-id="${it.id}"><div class="rth">${roomThumb(it)}</div><b>${esc(it.n)}</b><small>${foot}</small></button>`;
  };
  openSheetK("ward", `<h3>🎀 きせかえ・おみせ<button class="x" data-a="close">×</button></h3>
  <div class="rprev"><div class="uroom">${roomSvg(room)}</div><div class="uri s${u.st}">${uriSvg(u.st, "happy", uw())}</div><div class="wbal">${AC} ${bal}こ</div></div>
  ${wardrobeSeg("room")}
  <div class="chips">${[["all", "すべて"], ...Object.entries(RSLOTS)].map(([k, n]) => `<button class="chip ${sl === k ? "on" : ""}" data-a="rmSlot" data-v="${k}">${n}</button>`).join("")}</div>
  <div class="wgrid">${list.map(cell).join("")}</div>
  <p class="muted" style="text-align:center;font-size:12px">持っているものはタップでおく・かたづける（同じ場所には1つまで）。まどの外は、いまの時間の空になるよ</p>`);
}
function wardrobeSeg(t){
  return `<div class="seg"><button class="${t === "have" ? "on" : ""}" data-a="wTab" data-v="have">もちもの ${UITEMS.filter(owned).length}</button><button class="${t === "shop" ? "on" : ""}" data-a="wTab" data-v="shop">おみせ</button><button class="${t === "room" ? "on" : ""}" data-a="wTab" data-v="room">🏠 おへや</button></div>`;
}
async function roomBuy(id){
  const it = ritemOf(id), bal = S.pet?.acorns || 0; if (!it || rOwned(it)) return;
  if (bal < it.p) { toast(`どんぐりがあと${it.p - bal}こ足りないよ`); return; }
  try {
    await setDoc(petRef(), { acorns: increment(-it.p), ritems: { [id]: true }, room: { [it.s]: id } }, { merge: true });
    S.pet = { ...(S.pet || {}), acorns: bal - it.p, ritems: { ...(S.pet?.ritems || {}), [id]: true }, room: { ...(S.pet?.room || {}), [it.s]: id } };
    openRoomShop(); render();
    toast(`${it.e} ${it.n}をおへやにおいたよ！`);
    setTimeout(() => uriSay(`${it.n}、すてきぷぎ♪`), 100);
  } catch (e) { toast("買えませんでした（" + (e.code || e.message) + "）"); }
}
async function roomPlace(id){
  const it = ritemOf(id); if (!it || !rOwned(it)) return;
  const cur = roomNow()[it.s], must = it.s in RDEF;
  if (cur === id && must) return; // かべがみ・ゆか・まどは、はずせない（ほかのを選ぶ）
  const val = cur === id ? null : id;
  const r = { ...(S.pet?.room || {}) }; if (val) r[it.s] = val; else delete r[it.s];
  S.pet = { ...(S.pet || {}), room: r };
  openRoomShop(); render();
  try { await setDoc(petRef(), { room: { [it.s]: val || deleteField() } }, { merge: true }); }
  catch (e) { toast("保存できませんでした（" + (e.code || e.message) + "）"); }
}

/* ---------- ふたりのおみくじ ---------- */
function omiRand(seed){ let h = 2166136261; for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const OMI_TOTAL = [["大吉", 15], ["中吉", 25], ["小吉", 22], ["吉", 26], ["末吉", 12]];
const OMI_ITEMS = ["ハンカチ", "リップクリーム", "おそろいのもの", "白いくつ下", "ヘアゴム", "手袋", "ピンクのもの", "腕時計", "イヤホン", "折りたたみ傘", "キーホルダー", "まるいもの", "ストール", "カメラ", "メガネ", "ミントのガム", "絆創膏", "花柄のもの", "ネイル", "トートバッグ", "ポーチ", "香水", "パーカー", "星のモチーフ", "あったかい飲みもの", "ふたりの写真", "手紙", "スニーカー", "ボーダーのもの", "どんぐり"];
const OMI_FOODS = ["オムライス", "いちごパフェ", "ラーメン", "たこ焼き", "パンケーキ", "ハンバーグ", "おにぎり", "焼き鳥", "クレープ", "カレー", "お寿司", "ピザ", "焼き芋", "からあげ", "チーズケーキ", "うどん", "餃子", "ドーナツ", "タピオカ", "焼肉", "シュークリーム", "お好み焼き", "プリン", "パスタ", "鍋", "アイスクリーム", "肉まん", "みかん", "チョコレート", "ホットココア"];
const OMI_SPOTS = ["近くのカフェ", "公園のおさんぽ", "映画館", "水族館", "本屋さん", "夜景のきれいなところ", "おうちでまったり", "ゲームセンター", "温泉", "ショッピングモール", "パン屋さん", "神社"];
const OMI_SAY = {
  "大吉": ["きょうは さいこうの日ぷぎ！なんでもうまくいくよ", "ふたりのなかよしパワーがMAXぷぎ！", "うれしいことが起きる予感…！ぷぎ"],
  "中吉": ["いい日になりそうぷぎ♪ にこにこでいこ", "ふたりでいると、いいことが増えるよ", "ちょっとした幸せが見つかる日ぷぎ"],
  "小吉": ["のんびりすごすと、いいことあるぷぎ", "ありがとうを言うと、運気アップぷぎ", "ちいさな幸せを見のがさないでね"],
  "吉": ["ふつうの日こそ、たいせつぷぎ", "いつもどおりが いちばんのしあわせぷぎ", "おいしいものを食べると元気がでるよ"],
  "末吉": ["これから運気がのぼっていくぷぎ！", "ゆっくりでいいよ。ぼくがついてるぷぎ", "きょうはやさしくしあう日にしよ"]
};
const OMI_ADV = ["手をつないで歩くといいことが", "写真を1まい撮ってみて", "「すき」を1回多く言ってみよう", "あまいものを半分こしよう", "いつもと違う道を通ってみて", "相手のいいところを1つ伝えよう", "早めに寝ると明日も好調", "おそろいのものを身につけよう", "電話で声を聞くと運気アップ", "思い出の写真を見返してみて", "ちいさなプレゼントが吉", "笑顔でおはようを言おう"];
function omikuji(day){
  const R = omiRand((S.roomId || "") + ":" + day), pick = a => a[Math.floor(R() * a.length)];
  let x = R() * 100, total = "吉"; for (const [n, w] of OMI_TOTAL) { if ((x -= w) < 0) { total = n; break; } }
  const base = { "大吉": 3, "中吉": 2, "小吉": 2, "吉": 1, "末吉": 1 }[total];
  const star = () => Math.max(1, Math.min(5, base + Math.floor(R() * 3)));
  const places = S.places.filter(p => !p.visited && kindOf(p).id === "go").map(p => p.title);
  return { total, love: star(), out: star(), food: star(), item: pick(OMI_ITEMS), dish: pick(OMI_FOODS), spot: places.length ? pick(places) : pick(OMI_SPOTS), fromList: places.length > 0, say: pick(OMI_SAY[total]), adv: pick(OMI_ADV) };
}
const omiOpened = uid => S.pet?.omikuji?.[uid] === today();
const omiStars = n => "★".repeat(n) + `<span class="off">${"★".repeat(5 - n)}</span>`;
function omiResultHtml(o){
  const pu = partnerUid();
  return `<div class="omipaper">
    <div class="omihd">ふたりの運勢 ・ ${esc(fmtShort(today()))}</div>
    <div class="omitot t${OMI_TOTAL.findIndex(x => x[0] === o.total)}">${o.total}</div>
    <div class="omisay">「${esc(o.say)}」<small>— ${esc(uriName())}</small></div>
    <div class="omirow"><span>💕 恋愛運</span><em>${omiStars(o.love)}</em></div>
    <div class="omirow"><span>🚶 おでかけ運</span><em>${omiStars(o.out)}</em></div>
    <div class="omirow"><span>🍽 ごはん運</span><em>${omiStars(o.food)}</em></div>
    <div class="omigrid"><div><small>ラッキーアイテム</small><b>${esc(o.item)}</b></div><div><small>ラッキーフード</small><b>${esc(o.dish)}</b></div></div>
    <div class="omispot"><small>${o.fromList ? "きょうのおすすめ（行きたいリストから）" : "きょうのおすすめスポット"}</small><b>📍 ${esc(o.spot)}</b></div>
    <div class="omiadv">💡 ${esc(o.adv)}</div>
  </div>
  ${pu ? `<p class="muted" style="text-align:center;font-size:12px;margin:10px 0 0">${omiOpened(pu) ? `${esc(pName())}もきょうのおみくじを見たよ` : `${esc(pName())}はまだひいていないよ`}</p>` : ""}`;
}
async function openOmikuji(){
  const o = omikuji(today()), u = uriState();
  if (omiOpened(me())) { openSheet(`<h3>🎋 ふたりのおみくじ<button class="x" data-a="close">×</button></h3>${omiResultHtml(o)}`); return; }
  openSheet(`<h3>🎋 ふたりのおみくじ<button class="x" data-a="close">×</button></h3>
    <div class="omishake"><div class="uri s${Math.min(u.st, 5)}">${uriSvg(u.st, "happy", uw())}</div><div class="omibox"><span>おみくじ</span></div></div>
    <p class="omiwait">カラカラ…</p>`);
  const bonus = o.total === "大吉";
  const val = { omikuji: { [me()]: today() }, ...(bonus ? { acorns: increment(5) } : {}) };
  setDoc(petRef(), val, { merge: true }).catch(() => {});
  S.pet = { ...(S.pet || {}), omikuji: { ...(S.pet?.omikuji || {}), [me()]: today() }, acorns: (S.pet?.acorns || 0) + (bonus ? 5 : 0) };
  setTimeout(() => {
    const sh = document.querySelector(".omishake"); if (!sh) { render(); return; }
    openSheet(`<h3>🎋 ふたりのおみくじ<button class="x" data-a="close">×</button></h3>${omiResultHtml(o)}${bonus ? `<p class="omibonus">🎉 大吉ボーナス！どんぐり5こゲット ${AC}</p>` : ""}`);
    document.querySelector(".omipaper")?.classList.add("pop");
    render();
  }, 1700);
}

async function uriBuy(id){
  const it = itemOf(id), bal = S.pet?.acorns || 0; if (!it || owned(it)) return;
  if (bal < it.p) { toast(`どんぐりがあと${it.p - bal}こ足りないよ`); return; }
  try {
    await setDoc(petRef(), { acorns: increment(-it.p), items: { [id]: true }, wear: { [it.s]: id } }, { merge: true });
    S.pet = { ...(S.pet || {}), acorns: bal - it.p, items: { ...(S.pet?.items || {}), [id]: true }, wear: { ...uw(), [it.s]: id } };
    S.wTab = "have"; openWardrobe(); render();
    toast(`${it.e} ${it.n}を手に入れた！`);
    setTimeout(() => { uriFx(["✨", it.e], 4); uriSay(`${it.n}、にあう？ぷぎ♪`); }, 100);
  } catch (e) { toast("買えませんでした（" + (e.code || e.message) + "）"); }
}
async function uriWear(id){
  const it = itemOf(id); if (!it) return;
  const on = uw()[it.s] === id, w = { ...uw() };
  if (on) delete w[it.s]; else w[it.s] = id;
  S.pet = { ...(S.pet || {}), wear: w };
  openWardrobe(); render();
  try { await setDoc(petRef(), { wear: { [it.s]: on ? deleteField() : id } }, { merge: true }); }
  catch (e) { toast("保存できませんでした（" + (e.code || e.message) + "）"); }
}

/* ---------- どんぐり拾い（ミニゲーム） ---------- */
// GAME_VER を上げると、その日の「1回」がリセットされる（ベスト記録はそのまま）
const GAME_SEC = 30, GAME_REWARD_N = 1, GAME_REWARD_MAX = 80, GAME_VER = 2;
function gameInfo(uid){ const g = S.pet?.game?.[uid] || {}, td = g.day === today() && g.v === GAME_VER; return { best: g.best || 0, plays: td ? (g.plays || 0) : 0, last: td ? (g.last ?? null) : null }; }
function gameRank(s){ return s >= 120 ? "S" : s >= 80 ? "A" : s >= 45 ? "B" : "C"; }
let G = null;
function svgImg(svg){ const im = new Image(); im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim().replace(/^<svg (?![^>]*xmlns=)/, '<svg xmlns="http://www.w3.org/2000/svg" ')); return im; }
// いがぐり（とげとげの緑のイガ）
function iguSvg(){
  let sp = "";
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    sp += `<path d="M${(24 + c * 12).toFixed(1)} ${(24 + s * 12).toFixed(1)} L${(24 + c * 22).toFixed(1)} ${(24 + s * 22).toFixed(1)}" stroke="#6f9a3a" stroke-width="2.2" stroke-linecap="round"/>`; }
  return `<svg viewBox="0 0 48 48">${sp}<circle cx="24" cy="25" r="14" fill="#6f9a3a"/><circle cx="24" cy="24" r="13" fill="#8fbf4f"/><ellipse cx="19" cy="19" rx="5" ry="3.5" fill="#fff" opacity=".35"/>
    <circle cx="20" cy="27" r="1.6" fill="#5d8030"/><circle cx="28" cy="27" r="1.6" fill="#5d8030"/><path d="M21 31 Q24 29 27 31" stroke="#5d8030" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;
}
function openGame(){
  const u = uriState(), mi = gameInfo(me()), left = Math.max(0, GAME_REWARD_N - mi.plays);
  if (!left) { toast("どんぐり拾いは1日1回だよ。またあした！"); return; }
  $layer.innerHTML = `<div class="ugame" id="ugame">
    <div class="ugtop"><button class="ugx" data-a="gameClose" aria-label="とじる">×</button><span class="ugpill" id="ugT">⏱ ${GAME_SEC}</span><span class="ugpill" id="ugS">${AC} 0</span></div>
    <canvas id="ugc"></canvas>
    <div class="ugmsg" id="ugM"><div class="ugbox">
      <div class="uri s${u.st}" style="margin:0 auto">${uriSvg(u.st, "happy", uw())}</div>
      <h3>どんぐり拾い</h3>
      <div class="ughelp">
        <div><span class="ic">${AC}</span>どんぐり +1</div>
        <div><span class="ic">${acornSvg(true)}</span>金のどんぐり +10</div>
        <div><span class="ic">🍠</span>おいも +3</div>
        <div><span class="ic">${iguSvg()}</span>いがぐり −3</div>
        <div><span class="ic">🐝</span>ハチ ストップ</div>
        <div><span class="ic">🔥</span>10コンボ 2倍</div>
      </div>
      <p class="ugitems">アイテム：🧲すいよせ ⏰+3びょう 🛡ハチよけ<br>ラスト10秒は得点1.5倍！</p>
      <p class="muted">1日1回のチャレンジ！（スタートしたら、とちゅうでやめても1回）<br>とった数がふたりのおさいふに入るよ（さいだい${GAME_REWARD_MAX}こ）</p>
      <button class="btn block" data-a="gameStart">スタート</button>
    </div></div>
  </div>`;
  const c = document.getElementById("ugc"), wrap = document.getElementById("ugame");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = wrap.clientWidth, H = wrap.clientHeight;
  c.width = W * dpr; c.height = H * dpr; c.style.width = W + "px"; c.style.height = H + "px";
  const ctx = c.getContext("2d"); ctx.scale(dpr, dpr);
  G = { ctx, W, H, run: false, px: W / 2, tx: W / 2, items: [], score: 0, combo: 0, t0: 0, last: 0, spawn: 0, stun: 0, pops: [],
    img: svgImg(uriSvg(u.st, "happy", uw())), imgSad: svgImg(uriSvg(u.st, "sad", uw())),
    imNut: svgImg(acornSvg()), imGold: svgImg(acornSvg(true)), imIgu: svgImg(iguSvg()) };
  const setX = e => { const r = c.getBoundingClientRect(); G.tx = Math.max(30, Math.min(G.W - 30, e.clientX - r.left)); };
  c.addEventListener("pointerdown", setX); c.addEventListener("pointermove", setX);
  wrap.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
  gameDraw(0);
}
function gameStart(){
  if (!G || G.done || G.run) return;
  const mi = gameInfo(me());
  if (mi.plays >= GAME_REWARD_N) { toast("どんぐり拾いは1日1回だよ。またあした！"); return; }
  G.mi = mi;
  // とちゅうでやめても「きょうの1回」になる
  const sv = { best: mi.best, day: today(), plays: mi.plays + 1, last: 0, v: GAME_VER };
  S.pet = { ...(S.pet || {}), game: { ...(S.pet?.game || {}), [me()]: sv } };
  setDoc(petRef(), { game: { [me()]: sv } }, { merge: true }).catch(() => {});
  document.getElementById("ugM").classList.add("hide");
  const n = performance.now();
  Object.assign(G, { run: true, items: [], score: 0, combo: 0, maxCombo: 0, golds: 0, stun: 0, pops: [], spawn: 0, t0: n, last: n, px: G.W / 2, tx: G.W / 2,
    fcool: 0, top: (document.querySelector(".ugtop")?.getBoundingClientRect().bottom || 54) + 10, extra: 0, fever: 0, mag: 0, shield: false, rushShown: false, banner: null });
  requestAnimationFrame(gameLoop);
}
function gamePop(x, y, t, col, big){ G.pops.push({ x, y, t, a: 1, col: col || "#e2809c", big }); }
function gameBanner(t, col){ G.banner = { t, col, a: 1.6 }; }
function gameLoop(now){
  if (!G || !G.run) return;
  const dt = Math.min(.05, (now - G.last) / 1000); G.last = now;
  const el = (now - G.t0) / 1000, left = Math.max(0, GAME_SEC + G.extra - el), rush = left <= 10, fev = G.fever > 0;
  if (rush && !G.rushShown) { G.rushShown = true; gameBanner("ラストスパート！ 得点1.5倍", "#e2809c"); }
  const speed = 150 + Math.min(el, 32) * 7;
  let every = Math.max(.26, .6 - el * .012); if (rush) every *= .75; if (fev) every = .18;
  G.spawn -= dt;
  if (G.spawn <= 0) {
    G.spawn = every;
    let k;
    if (fev) k = Math.random() < .08 ? "gold" : Math.random() < .15 ? "imo" : "nut";
    else {
      const r = Math.random(), bee = Math.min(.26, .12 + el * .005), igu = Math.min(.14, .06 + el * .003);
      let a = 0;
      k = r < (a += bee) ? "bee" : r < (a += igu) ? "igu" : r < (a += .07) ? "imo" : r < (a += .03) ? "gold"
        : (el > 3 && r < (a += .025)) ? "mag" : (el > 3 && r < (a += .02)) ? "clock" : (el > 3 && !G.shield && r < (a += .025)) ? "shield" : "nut";
    }
    const pw = k === "mag" || k === "clock" || k === "shield";
    G.items.push({ k, x: 24 + Math.random() * (G.W - 48), y: -30, vy: speed * (k === "bee" ? 1.15 : k === "gold" ? 1.25 : pw ? .8 : .85 + Math.random() * .3), w: Math.random() * 6 });
  }
  if (G.fever > 0) { G.fever -= dt; if (G.fever <= 0) G.fcool = 8; } else if (G.fcool > 0) G.fcool -= dt;
  if (G.mag > 0) G.mag -= dt;
  if (G.stun > 0) G.stun -= dt; else G.px += (G.tx - G.px) * Math.min(1, dt * 14);
  const py = G.H - 120, mult = (G.fever > 0 ? 2 : 1) * (rush ? 1.5 : 1);
  G.items.forEach(it => {
    it.y += it.vy * dt;
    if (it.k === "bee") it.x += Math.sin(now / 250 + it.w * 3) * 60 * dt;
    if (G.mag > 0 && (it.k === "nut" || it.k === "gold" || it.k === "imo") && it.y > py - 300 && it.y < py) it.x += (G.px - it.x) * Math.min(1, dt * 5);
    const hitW = G.mag > 0 ? 46 : 40;
    if (!it.dead && it.y > py - 30 && it.y < py + 30 && Math.abs(it.x - G.px) < hitW) {
      it.dead = true;
      const ty = py - 44;
      if (it.k === "bee") {
        if (G.shield) { G.shield = false; gamePop(it.x, ty, "ガード！", "#5b8fd9"); }
        else { G.stun = .8; G.combo = 0; gamePop(it.x, ty, "ちくっ！", "#d46a7e"); }
      } else if (it.k === "igu") {
        G.score = Math.max(0, G.score - 3); G.combo = 0; G.stun = Math.max(G.stun, .3); gamePop(it.x, ty, "いたっ！ −3", "#6f9a3a");
      } else if (it.k === "mag") { G.mag = 5; gamePop(it.x, ty, "🧲 すいよせ！", "#5b8fd9");
      } else if (it.k === "clock") { G.extra += 3; gamePop(it.x, ty, "⏰ +3びょう！", "#5b8fd9");
      } else if (it.k === "shield") { G.shield = true; gamePop(it.x, ty, "🛡 シールド！", "#5b8fd9");
      } else {
        const base = it.k === "gold" ? 10 : it.k === "imo" ? 3 : 1;
        if (it.k === "gold") G.golds++;
        G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo);
        const bonus = G.combo % 5 === 0 ? 1 : 0, pts = Math.ceil(base * mult) + bonus;
        G.score += pts;
        gamePop(it.x, ty, (bonus ? `+${pts} ${G.combo}コンボ！` : `+${pts}`), it.k === "gold" ? "#d9a520" : "#e2809c", it.k === "gold");
        if (G.combo % 10 === 0 && G.fever <= 0 && !(G.fcool > 0)) { G.fever = 5; gameBanner("🔥 フィーバー！ 得点2倍", "#f08a3c"); }
      }
    } else if (!it.dead && it.y > G.H + 20) { it.dead = true; if (it.k === "nut" || it.k === "gold" || it.k === "imo") G.combo = 0; }
  });
  G.items = G.items.filter(it => !it.dead);
  G.pops.forEach(p => { p.y -= 50 * dt; p.a -= dt * 1.3; }); G.pops = G.pops.filter(p => p.a > 0);
  if (G.banner) { G.banner.a -= dt * .8; if (G.banner.a <= 0) G.banner = null; }
  const tEl = document.getElementById("ugT"), sEl = document.getElementById("ugS");
  if (tEl) { tEl.textContent = `⏱ ${Math.ceil(left)}`; tEl.classList.toggle("rush", rush); }
  if (sEl) sEl.innerHTML = `${AC} ${G.score}`;
  gameDraw(now);
  if (left <= 0) { G.run = false; gameEnd(); return; }
  requestAnimationFrame(gameLoop);
}
function gameDraw(now){
  const { ctx, W, H } = G; ctx.clearRect(0, 0, W, H);
  if (G.fever > 0) { ctx.fillStyle = `rgba(255,214,120,${.22 + Math.sin(now / 120) * .08})`; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = "rgba(166,217,196,.55)"; ctx.fillRect(0, H - 62, W, 62);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const img = (im, x, y, w, h, fb) => { if (im && im.complete && im.naturalWidth) ctx.drawImage(im, x - w / 2, y - h / 2, w, h); else { ctx.font = "30px sans-serif"; ctx.fillText(fb, x, y); } };
  G.items.forEach(it => {
    if (it.k === "nut") img(G.imNut, it.x, it.y, 30, 36, "●");
    else if (it.k === "gold") {
      ctx.save(); ctx.globalAlpha = .5 + Math.sin(now / 90) * .3; ctx.fillStyle = "#ffe68a";
      ctx.beginPath(); ctx.arc(it.x, it.y, 24, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      img(G.imGold, it.x, it.y, 34, 41, "★");
      ctx.font = "13px sans-serif"; ctx.fillText("✨", it.x + 16, it.y - 18 + Math.sin(now / 150) * 3);
    }
    else if (it.k === "igu") img(G.imIgu, it.x, it.y, 38, 38, "✳");
    else {
      ctx.font = "30px sans-serif";
      if (it.k === "mag" || it.k === "clock" || it.k === "shield") { ctx.save(); ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.strokeStyle = "#a9c6ef"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(it.x, it.y, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); ctx.font = "24px sans-serif"; }
      ctx.fillText({ bee: "🐝", imo: "🍠", mag: "🧲", clock: "⏰", shield: "🛡️" }[it.k], it.x, it.y);
    }
  });
  const s = 96, py = H - 120, im = G.stun > 0 ? G.imgSad : G.img;
  if (G.mag > 0) { ctx.save(); ctx.strokeStyle = `rgba(91,143,217,${.25 + Math.sin(now / 100) * .15})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(G.px, py - 6, 70 + (now / 8 % 30), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  if (im.complete && im.naturalWidth) { if (!(G.stun > 0 && Math.floor(now / 90) % 2)) ctx.drawImage(im, G.px - s / 2, py - s / 2 - 6, s, s); }
  else { ctx.font = "54px sans-serif"; ctx.fillText("🐗", G.px, py); }
  if (G.shield) { ctx.save(); ctx.fillStyle = "rgba(140,190,255,.18)"; ctx.strokeStyle = "rgba(91,143,217,.7)"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(G.px, py - 6, 56, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
  // じょうたい表示（右上の下）
  if (G.run) {
    const st = [];
    if (G.fever > 0) st.push(["🔥", G.fever / 5, "#f08a3c"]);
    if (G.mag > 0) st.push(["🧲", G.mag / 5, "#5b8fd9"]);
    if (G.shield) st.push(["🛡️", 1, "#5b8fd9"]);
    const top = G.top || 64;
    st.forEach((e, i) => {
      const x = 14, y = top + i * 30;
      ctx.save(); ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, 86, 24, 12) : ctx.rect(x, y, 86, 24); ctx.fill();
      ctx.fillStyle = e[2]; ctx.fillRect(x + 30, y + 10, 48 * Math.max(0, Math.min(1, e[1])), 5); ctx.restore();
      ctx.font = "15px sans-serif"; ctx.fillText(e[0], x + 16, y + 12);
    });
    if (G.combo >= 3) { ctx.font = "bold 15px 'Zen Maru Gothic', sans-serif"; ctx.fillStyle = "#e2809c"; ctx.fillText(`${G.combo} コンボ`, G.px, py + 50); }
  }
  ctx.font = "bold 17px 'Zen Maru Gothic', sans-serif";
  G.pops.forEach(p => { ctx.globalAlpha = Math.max(0, p.a); ctx.fillStyle = p.col; ctx.font = `bold ${p.big ? 22 : 17}px 'Zen Maru Gothic', sans-serif`; ctx.fillText(p.t, p.x, p.y); });
  ctx.globalAlpha = 1;
  if (G.banner) {
    const b = G.banner; ctx.globalAlpha = Math.min(1, b.a);
    ctx.font = "bold 24px 'Zen Maru Gothic', sans-serif"; ctx.lineWidth = 6; ctx.strokeStyle = "#fff"; ctx.strokeText(b.t, W / 2, H * .38);
    ctx.fillStyle = b.col; ctx.fillText(b.t, W / 2, H * .38); ctx.globalAlpha = 1;
  }
}
async function gameEnd(){
  const score = G.score, mi = G.mi || gameInfo(me()), t = today();
  const reward = mi.plays < GAME_REWARD_N ? Math.min(score, GAME_REWARD_MAX) : 0;
  const isBest = score > mi.best, pu = partnerUid(), pb = pu ? gameInfo(pu).best : 0, rk = gameRank(score);
  const val = { best: Math.max(mi.best, score), day: t, plays: mi.plays + 1, last: score, v: GAME_VER };
  G.done = true; document.getElementById("ugT")?.classList.remove("rush");
  const m = document.getElementById("ugM"); if (!m) return;
  const st = uriState().st;
  m.classList.remove("hide");
  m.innerHTML = `<div class="ugbox">
    <div class="ugrank r${rk}">${rk}</div>
    <div class="uri s${st}" style="margin:0 auto">${uriSvg(st, score >= 30 ? "happy" : "normal", uw())}</div>
    <h3>${AC} ${score}こ！</h3>
    <p class="ugstat">さいだい ${G.maxCombo}コンボ${G.golds ? ` ・ 金のどんぐり ${G.golds}こ` : ""}</p>
    ${isBest ? `<p class="ugbest">じこベスト更新！🎉</p>` : `<p class="muted">ベスト ${mi.best}こ</p>`}
    ${pu ? `<p class="muted">${esc(nameOf(pu))}のベスト ${pb}こ${score > pb && pb > 0 ? " → 勝った！" : ""}</p>` : ""}
    <p>${reward ? `ふたりのおさいふに ${AC}+${reward}` : "こんどはもっととろう！"}</p>
    <p class="muted" style="font-size:12px">またあしたあそぼうね🌙</p>
    <button class="btn block" data-a="gameClose">とじる</button>
  </div>`;
  try {
    await setDoc(petRef(), { game: { [me()]: val }, ...(reward ? { acorns: increment(reward) } : {}) }, { merge: true });
    S.pet = { ...(S.pet || {}), game: { ...(S.pet?.game || {}), [me()]: val }, acorns: (S.pet?.acorns || 0) + reward };
  } catch (e) { toast("記録を保存できませんでした（" + (e.code || e.message) + "）"); }
}
function gameClose(){ if (G) G.run = false; G = null; closeSheet(); render(); }

/* ---------- うりぼーメニュー ---------- */
function viewUri(){
  if (S.needRules) return `<div class="card"><p class="muted">うりぼーを使うには、Firebaseのルール更新が必要です</p></div>`;
  uriSouvCheck();
  const mi = gameInfo(me()), left = Math.max(0, GAME_REWARD_N - mi.plays), ji = jumpInfo(me()), w = Object.values(uw()).map(itemOf).filter(Boolean), r = roomNow();
  const nR = ["deco", "fl", "fr", "rug"].filter(k => r[k]).length, u = uriState();
  const tile = (ic, bg, n, sub, act, badge) => `<div class="tile" ${act}>${badge ? `<span class="badge">${badge}</span>` : ""}<div class="ic" style="background:${bg}">${ic}</div><b>${n}</b><small>${sub}</small></div>`;
  return `<div class="utab">${uriHtml()}</div>
  <div class="tiles">
    ${tile("🎀", "var(--pink-l)", "きせかえ", w.length ? w.map(x => x.e).join("") + " つけてる" : "もちもの・おみせ", `data-a="wardrobeHave"`)}
    ${tile("🏠", "var(--butter-l)", "おへや", nR ? `家具 ${nR}こ おいてる` : "家具・かべがみ", `data-a="roomOpen"`)}
    ${tile("🧸", "#fdecea", "あそぶ", toyTileSub(), `data-a="toysOpen"`, TOYS.some(t => toyOwned(t.id)) && !playedToday(me()) ? "!" : "")}
    ${tile("📖", "var(--lav-l)", "成長アルバム", `${u.st + 1} / ${ust().length} だんかい`, `data-a="albumOpen"`)}
  </div>
  <div class="lbl2">ミニゲーム（どんぐりがもらえる）</div>
  <div class="tiles">
    ${tile(AC, "#f4ead9", "どんぐり拾い", left ? "きょうはまだ ・ 1日1回" : `きょうは${mi.last ?? 0}こ拾ったよ`, `data-a="gameOpen"`, left ? "!" : "")}
    ${tile("🦘", "var(--mint-l)", "うりぼージャンプ", ji.plays ? `きょうは${ji.last ?? 0}ことったよ` : "きょうはまだ ・ 1日1回", `data-a="jumpOpen"`, ji.plays ? "" : "!")}
  </div>
  <div class="lbl2">どんぐりをつかう</div>
  <div class="tiles">
    ${tile("🎒", "var(--mint-l)", "おつかい", otsuTileSub(), `data-a="otsuOpen"`, otsuBadge())}
    ${tile("🍰", "var(--peach-l)", "おやつやさん", snkToday(me()) ? `きょうは${snackOf(snkToday(me())).e}をあげたよ` : "せいちょうポイントアップ ・ 1日1回", `data-a="snackOpen"`)}
    ${tile("💊", "#fbeef6", "どんぐりガチャ", `ノーマル・レア・超レア ・ ${gachaHave()} / ${gachaPool().length}`, `data-a="gachaOpen"`)}
    ${tile("💌", "var(--butter-l)", "えはがき", `${cardsHave()} / ${OTSU_SPOTS.length} まい あつめた`, `data-a="cardsOpen"`)}
  </div>`;
}
/* ホーム用の小さいうりぼー */
function uriMiniHtml(){
  if (S.needRules) return "";
  const u = uriState(), nIn = lettersIn().length;
  const say = nIn ? "おてがみあずかってるぷぎ！" : u.mood === "sleep" ? "すやすや…" : uriSpecial() ? uriSeason().line : u.mood === "sad" ? "さみしかったぷぎ…" : !u.fedMe ? "おなかすいたぷぎ〜" : "ぷぎっ！";
  return `<div class="card uricard umini" data-a="tab" data-v="uri">
    <div class="umrow">
      <div class="ustage" id="ustage"><div class="uri s${u.st} ${u.mood === "sleep" ? "sleep" : "idle"}" id="uri">${uriSvg(u.st, u.mood, uw())}</div></div>
      <div class="main"><div class="uhead"><b class="nm">${esc(uriName())}</b><span class="tag lav">${esc(ust()[u.st][1])}</span></div>
        <div class="umsay" id="ububble">${esc(S.uriSay || say)}</div>
        <div class="ubar"><span>げんき</span><div class="tr"><i style="width:${u.energy}%"></i></div></div>
      </div><span class="go">›</span>
    </div>
    <div class="umfed">${[me(), partnerUid()].filter(Boolean).map(id => `<span>🍠 ${esc(nameOf(id))} ${S.pet?.feeds?.[id]?.last === today() ? "✅" : "…"}</span>`).join("")}</div>
  </div>`;
}

