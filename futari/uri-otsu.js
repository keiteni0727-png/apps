"use strict";
/* ウリログ：どんぐりをつかうお楽しみ（おつかい・えはがき・おやつやさん・どんぐりガチャ）
   ファイルの分け方：core.js（共通の道具・状態）→ 各機能 → events.js（ボタン）→ boot.js（Firebase につないで起動）
   どのファイルの関数・変数も、ほかのファイルからそのまま使える（ふつうの <script> で順に読み込む） */

/* =============== おつかい =============== */
// それぞれ1日1回。OTSU_H 時間で帰ってきて、どんぐり・えはがき・ときどき限定アイテムを持ってくる
const OTSU_H = 3, OTSU_TIPS = [0, 10, 30, 50], OTSU_TIP_UP = { 0: 0, 10: .1, 30: .22, 50: .35 }, OTSU_BASE = .12, OTSU_DATE_UP = .2;
const OTSU_SPOTS = [
  { id:"mori",    n:"もりのおく",       e:"🌳", bg:"#dff2e6", say:["きのこがいっぱいはえてたぷぎ", "りすさんとおともだちになったよ"] },
  { id:"umi",     n:"うみ",             e:"🌊", bg:"#dcefff", say:["なみがざぶーんってきたぷぎ！", "きれいなかいがら、みつけたよ"] },
  { id:"yama",    n:"おやまのてっぺん", e:"⛰️", bg:"#e7eef7", say:["やっほー！ってさけんできたぷぎ", "くものうえまでのぼったよ"] },
  { id:"hana",    n:"おはなばたけ",     e:"🌷", bg:"#fde6ee", say:["おはなのにおい、いいにおい〜", "ちょうちょとおいかけっこしたぷぎ"] },
  { id:"machi",   n:"しょうてんがい",   e:"🏪", bg:"#fff1dc", say:["おみせのひとにやさしくしてもらったよ", "コロッケのいいにおいがしたぷぎ"] },
  { id:"pan",     n:"パンやさん",       e:"🥐", bg:"#fbecd8", say:["やきたてのパン、ふかふかだったぷぎ", "メロンパン、においだけかいできた"] },
  { id:"onsen",   n:"おんせん",         e:"♨️", bg:"#f3e9e4", say:["ぽかぽかで、とろけそうぷぎ〜", "おさるさんといっしょにはいったよ"] },
  { id:"matsuri", n:"おまつり",         e:"🏮", bg:"#ffe5dc", say:["わたあめ、おおきかったぷぎ！", "きんぎょすくい、むずかしかった〜"] },
  { id:"yuen",    n:"ゆうえんち",       e:"🎡", bg:"#efe8fb", say:["かんらんしゃ、たかかったぷぎ", "こんどはふたりでいってね"] },
  { id:"hoshi",   n:"ほしぞらのおか",   e:"🌌", bg:"#e1e4f7", say:["ながれぼし、みつけたぷぎ！", "ふたりのこと、おねがいしてきたよ"] },
  { id:"noen",    n:"いちごのうえん",   e:"🍓", bg:"#ffe3e6", say:["いちご、ひとつだけたべちゃった…", "あまずっぱくておいしかったぷぎ"] },
  { id:"kawa",    n:"せせらぎのかわ",   e:"🏞️", bg:"#dff3f1", say:["おさかながぴちぴちしてたぷぎ", "いしをぴょんぴょんわたったよ"] }
];
const spotOf = id => OTSU_SPOTS.find(x => x.id === id);
const otsuOf = uid => S.pet?.otsu?.[uid] || null;
const otsuAway = o => !!o && !o.done && Date.now() < o.back;
const otsuBack = o => !!o && !o.done && Date.now() >= o.back;
const otsuCanGo = () => { const o = otsuOf(me()); return !o || (o.done && o.day !== today()); };
const otsuRare = (tip, bonus) => Math.min(.9, OTSU_BASE + (OTSU_TIP_UP[tip] || 0) + (bonus ? OTSU_DATE_UP : 0));
const cardsHave = () => OTSU_SPOTS.filter(x => S.pet?.cards?.[x.id]).length;
function fmtLeft(ms){ const m = Math.max(1, Math.ceil(ms / 60000)), h = Math.floor(m / 60); return h ? `${h}時間${m % 60 ? `${m % 60}分` : ""}` : `${m}分`; }
/* きょう「行った！」・ひとこと・デートの予定があればデートボーナス */
function otsuBonus(){
  const t = today();
  return S.places.some(p => p.visited && p.visitedAt === t)
    || S.places.some(p => Object.values(p.notes || {}).some(n => n?.at && localDay(n.at) === t))
    || S.dates.some(d => d.date === t);
}
/* きょう選べるおまかせの行き先（ひとりずつ・日ごとに4か所） */
function otsuSpotsToday(){
  const R = omiRand(`${S.roomId}:${me()}:${today()}:otsu`), a = OTSU_SPOTS.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, 4);
}
function otsuDestOf(v){
  const [k, id] = String(v).split(":");
  if (k === "s") { const sp = spotOf(id); return sp && { k: "s", id, n: sp.n, e: sp.e }; }
  const p = S.places.find(x => x.id === id); return p && { k: "p", id, n: p.title, e: iconOf(p).e };
}
function otsuTileSub(){
  const o = otsuOf(me());
  if (otsuAway(o)) return `${o.dest.e} おつかい中 ・ あと${fmtLeft(o.back - Date.now())}`;
  if (otsuBack(o)) return "かえってきたよ！";
  if (o?.done && o.day === today()) return "きょうはおわり ・ またあした";
  return "1日1回 ・ おみやげをもってくるよ";
}
const otsuBadge = () => otsuCanGo() ? "!" : "";
function otsuLines(){
  const L = [], o = otsuOf(me()), pu = partnerUid(), po = pu && otsuOf(pu), bal = S.pet?.acorns || 0;
  if (otsuAway(o)) L.push(`${o.dest.n}、たのしみにまっててね`, "おみやげ、なにがいいかな〜");
  else if (otsuCanGo()) L.push("おつかい、いってこようか？", "ぼうけんにいきたいぷぎ！");
  if (otsuAway(po)) L.push(`${nameOf(pu)}にたのまれて、${po.dest.n}にいくんだ〜`);
  if (!snkToday(me()) && bal >= SNACKS[0].p) L.push("おやつ、たべたいなあ…", "あまいものたべたいぷぎ〜");
  if (bal >= GACHAS[0].p && gachaHave() < gachaPool().length) L.push("ガチャ、まわしてみる？");
  return L;
}

/* ---------- おつかいの画面 ---------- */
function openOtsu(){
  const o = otsuOf(me()), u = uriState(), bal = S.pet?.acorns || 0, pu = partnerUid(), po = pu && otsuOf(pu);
  const head = `<h3>🎒 うりぼーのおつかい<button class="x" data-a="close">×</button></h3>`;
  const pLine = po && po.day === today() ? `<p class="muted otp">${esc(nameOf(pu))}のおつかい：${otsuAway(po) ? `${po.dest.e} ${esc(po.dest.n)}へおでかけ中（あと${fmtLeft(po.back - Date.now())}）` : po.done ? `${po.dest.e} ${esc(po.dest.n)}からかえってきたよ` : "かえってきたよ！"}</p>` : "";
  if (otsuAway(o) || otsuBack(o)) {
    openSheetK("otsu", `${head}
      <div class="otaway" style="background:${spotOf(o.dest.id)?.bg || "#fff4ea"}"><span class="otsc">${o.dest.e}</span><div class="uri s${u.st} otwalk">${uriSvg(u.st, "happy", { ...uw(), back: "ryukku" })}</div></div>
      <p class="otmsg"><b>${esc(o.dest.n)}</b>へおつかい中…</p>
      <p class="muted otp">${otsuBack(o) ? "そろそろかえってくるよ！" : `あと${fmtLeft(o.back - Date.now())}でかえってくるよ`}${o.tip ? ` ・ おこづかい ${AC}${o.tip}` : ""}${o.bonus ? " ・ ✨デートボーナス" : ""}</p>${pLine}`);
    return;
  }
  if (o?.done && o.day === today()) {
    openSheetK("otsu", `${head}${postcardHtml(o.dest, o.res?.line, o.doneAt || o.back)}
      <p class="otmsg">きょうのおつかいはおわり。またあしたね🌙</p>${pLine}
      <div style="text-align:center"><button class="linkbtn" data-a="cardsOpen">えはがきコレクション ›</button></div>`);
    return;
  }
  const sel = S.otsuSel || (S.otsuSel = { d: null, tip: 0 }), bonus = otsuBonus(), cards = S.pet?.cards || {};
  const places = S.places.filter(p => !p.visited && ["go", "eat"].includes(kindOf(p).id)).slice(0, 8);
  const chip = (v, e, n, nw) => `<button class="chip ${sel.d === v ? "on" : ""}" data-a="otsuDest" data-v="${esc(v)}">${e} ${esc(n)}${nw ? `<i class="otnew">NEW</i>` : ""}</button>`;
  openSheetK("otsu", `${head}
    <div class="otaway"><div class="uri s${u.st}">${uriSvg(u.st, "happy", { ...uw(), back: "ryukku" })}</div></div>
    <p class="otmsg">どこにいってくる？</p>
    <div class="lbl2">おまかせ（きょうの行き先）</div>
    <div class="otdest">${otsuSpotsToday().map(sp => chip("s:" + sp.id, sp.e, sp.n, !cards[sp.id])).join("")}</div>
    ${places.length ? `<div class="lbl2">行きたい・食べたいを下見してもらう</div><div class="otdest">${places.map(p => chip("p:" + p.id, iconOf(p).e, p.title)).join("")}</div>` : ""}
    <div class="lbl2">おこづかい（多いほどレアが出やすい）</div>
    <div class="seg">${OTSU_TIPS.map(t => `<button class="${sel.tip === t ? "on" : ""}" data-a="otsuTip" data-v="${t}" ${t > bal ? "disabled" : ""}>${t ? `${AC}${t}` : "なし"}</button>`).join("")}</div>
    <p class="otrare">レアなおみやげが出るかくりつ <b>${Math.round(otsuRare(sel.tip, bonus) * 100)}%</b>${bonus ? `<br><span class="otbonus">✨ きょうはデートボーナス中！</span>` : `<br><small>きょう「行った！」やおもいでのひとこと、デートの予定があるとアップ</small>`}</p>
    <button class="btn block" data-a="otsuGo" ${sel.d ? "" : "disabled"}>${sel.d ? "いってらっしゃい！" : "行き先をえらんでね"}</button>
    <p class="muted otp">${OTSU_H}時間でかえってくるよ ・ ${AC} ${bal}こ</p>${pLine}`);
}
async function otsuGo(){
  const sel = S.otsuSel, bal = S.pet?.acorns || 0;
  if (!sel?.d || !otsuCanGo()) return;
  if (bal < sel.tip) { toast(`どんぐりがあと${sel.tip - bal}こ足りないよ`); return; }
  const dest = otsuDestOf(sel.d); if (!dest) return;
  const now = Date.now(), val = { day: today(), start: now, back: now + OTSU_H * 3600000, dest, tip: sel.tip, bonus: otsuBonus(), done: false };
  try {
    await setDoc(petRef(), { otsu: { [me()]: { ...val, res: deleteField(), doneAt: deleteField() } }, ...(sel.tip ? { acorns: increment(-sel.tip) } : {}) }, { merge: true });
    S.pet = { ...(S.pet || {}), otsu: { ...(S.pet?.otsu || {}), [me()]: val }, acorns: bal - sel.tip };
    S.otsuSel = null; closeSheet(); render();
    setTimeout(() => { uriFx(["🎒", "👋", "✨"], 5); uriSay(`${dest.n}にいってきますぷぎ！`); }, 150);
    otsuCheck();
  } catch (e) { toast("おくりだせませんでした（" + (e.code || e.message) + "）"); }
}

/* ---------- 帰ってきたとき（どちらが開いても受け取り、ふたりとも次に開いたときに演出） ---------- */
let otsuT = null, otsuBusy = false, otsuFailAt = 0;
function otsuRoll(o, p){
  const pick1 = a => a[Math.floor(Math.random() * a.length)], bonus = o.bonus || otsuBonus();
  const sp = o.dest.k === "s" ? spotOf(o.dest.id) : null;
  const line = sp ? pick1(sp.say) : pick1([`${o.dest.n}、下見してきたぷぎ！たのしそうだったよ`, `${o.dest.n}、ふたりでいったらぜったいたのしいよ`, `${o.dest.n}のちかくで、いいものみつけたぷぎ`]);
  const r = { ac: 10 + Math.floor(Math.random() * 21) + (bonus ? 5 : 0), line };
  if (Math.random() < otsuRare(o.tip || 0, bonus)) {
    const pool = [...UITEMS.filter(it => it.o && !p.items?.[it.id]).map(it => ["w", it.id]), ...RITEMS.filter(it => it.o && !p.ritems?.[it.id]).map(it => ["r", it.id])];
    if (pool.length) { const [k, id] = pick1(pool); r[k === "w" ? "item" : "ritem"] = id; }
    else { r.gold = 1; r.ac += 30; }
  }
  return r;
}
async function otsuClaim(uid){
  if (otsuBusy || Date.now() - otsuFailAt < 60000) return;
  otsuBusy = true;
  try {
    const ref = petRef();
    await FS.runTransaction(db, async tx => {
      const snap = await tx.get(ref), p = snap.data() || {}, o = p.otsu?.[uid];
      if (!o || o.done || Date.now() < o.back) return;
      const r = otsuRoll(o, p), upd = { otsu: { [uid]: { done: true, res: r, doneAt: Date.now() } }, otsuN: { [uid]: increment(1) }, acorns: increment(r.ac) };
      if (r.item) upd.items = { [r.item]: true };
      if (r.ritem) upd.ritems = { [r.ritem]: true };
      if (o.dest.k === "s") upd.cards = { [o.dest.id]: increment(1) };
      else upd.pcards = { [o.dest.id]: { n: o.dest.n, e: o.dest.e, at: Date.now() } };
      tx.set(ref, upd, { merge: true });
    });
  } catch (e) { otsuFailAt = Date.now(); }
  finally { otsuBusy = false; }
}
const otsuSeenKey = uid => `otsuSeen_${S.roomId}_${uid}`;
function otsuSeen(uid, o){ try { return localStorage.getItem(otsuSeenKey(uid)) === String(o.start); } catch (e) { return true; } }
function otsuCheck(){
  if (!S.pet || !S.roomId || S.needRules) return;
  clearTimeout(otsuT);
  const mem = S.room?.members || [];
  const back = mem.find(u => otsuBack(otsuOf(u)));
  if (back) { otsuClaim(back); return; }
  if (!$layer.innerHTML && !uriEvoOn) {
    const u = mem.find(x => { const o = otsuOf(x); return o?.done && o.res && Date.now() - (o.doneAt || 0) < 3 * 86400000 && !otsuSeen(x, o); });
    if (u) otsuShow(u, otsuOf(u));
  }
  const next = mem.map(otsuOf).filter(otsuAway).map(o => o.back).sort((a, b) => a - b)[0];
  if (next) otsuT = setTimeout(() => {
    if (S.tab === "uri" && !$layer.innerHTML) render(); else otsuCheck();
  }, Math.max(1000, Math.min(next - Date.now() + 800, S.tab === "uri" ? 60000 : 2 ** 30)));
}
function otsuShow(uid, o){
  try { localStorage.setItem(otsuSeenKey(uid), String(o.start)); } catch (e) {}
  const r = o.res, st = uriState().st, it = r.item && itemOf(r.item), ri = r.ritem && ritemOf(r.ritem);
  $layer.innerHTML = `<div class="ov mid" data-a="ovclose"><div class="lcard otret">
    <div class="lttl">ただいまぷぎ！</div>
    <p class="muted" style="margin:2px 0 10px">${uid === me() ? "" : `${esc(nameOf(uid))}がたのんだ`}おつかいから、${esc(uriName())}がかえってきたよ</p>
    ${postcardHtml(o.dest, r.line, o.doneAt || o.back)}
    <div class="otgets">
      <div><span class="otac">${AC}</span><b>+${r.ac}</b><small>どんぐり${r.gold ? "（きらきら）" : ""}</small></div>
      ${it ? `<div class="rare"><div class="uri s${st}">${uriSvg(st, "happy", { [it.s]: it.id })}</div><b>${esc(it.n)}</b><small>レア！きせかえ</small></div>` : ""}
      ${ri ? `<div class="rare"><div class="rth">${roomThumb(ri)}</div><b>${esc(ri.n)}</b><small>レア！おへや</small></div>` : ""}
    </div>
    ${o.bonus ? `<p class="otbonus">✨ デートボーナスでレアが出やすかったよ</p>` : ""}
    <button class="btn block" data-a="otsuDone">${it || ri ? "やったー！" : "ありがとう"}</button>
  </div></div>`;
}
/* えはがき */
function postcardHtml(dest, line, at){
  const sp = dest.k === "s" ? spotOf(dest.id) : null, st = uriState().st;
  return `<div class="pcard" style="background:${sp?.bg || "#fff4ea"}"><span class="pcstamp">${dest.e}</span>
    <div class="pcscene"><span class="pce">${dest.e}</span><div class="uri s${st}">${uriSvg(st, "happy", uw())}</div></div>
    <div class="pctx"><b>${esc(dest.n)}より</b>${line ? `<p>「${esc(line)}」</p>` : ""}<small>${esc(fmtShort(localDay(at || Date.now())))}　${esc(uriName())}</small></div></div>`;
}
function openCards(id){
  const cards = S.pet?.cards || {}, pc = Object.values(S.pet?.pcards || {}).sort((a, b) => (b.at || 0) - (a.at || 0));
  const big = id && spotOf(id) && cards[id] ? postcardHtml({ k: "s", id, n: spotOf(id).n, e: spotOf(id).e }, spotOf(id).say[0], null) : "";
  openSheetK("cards", `<h3>💌 えはがきコレクション<button class="x" data-a="close">×</button></h3>
    ${big}
    <p class="muted otp">${cardsHave()} / ${OTSU_SPOTS.length} まい ・ おつかいの行き先から届くよ</p>
    <div class="pcgrid">${OTSU_SPOTS.map(sp => cards[sp.id]
      ? `<button class="pcmini ${id === sp.id ? "on" : ""}" style="background:${sp.bg}" data-a="cardView" data-v="${sp.id}"><span>${sp.e}</span><b>${esc(sp.n)}</b>${cards[sp.id] > 1 ? `<small>×${cards[sp.id]}</small>` : ""}</button>`
      : `<div class="pcmini lock"><span>？</span><b>？？？</b></div>`).join("")}</div>
    ${pc.length ? `<div class="lbl2">下見してもらったばしょ</div><div class="pclist">${pc.map(x => `<div>${x.e} ${esc(x.n)}<small>${esc(fmtShort(localDay(x.at || 0)))}</small></div>`).join("")}</div>` : ""}`);
}

/* =============== おやつやさん（1日1回・せいちょうポイントが増える） =============== */
const SNACKS = [
  { id:"cookie",  n:"どんぐりクッキー",     e:"🍪", p:10, xp:3,  say:"さくさく〜！もういちまい！" },
  { id:"pudding", n:"とろけるプリン",       e:"🍮", p:20, xp:4, say:"ぷるぷる〜とろける〜" },
  { id:"cake",    n:"いちごのショートケーキ", e:"🍰", p:35, xp:5, say:"いちご、さいごにとっておくの" },
  { id:"parfait", n:"もりのパフェ",         e:"🍨", p:50, xp:6, say:"しあわせのあじぷぎ〜！" },
  { id:"mont",    n:"とくせいモンブラン",   e:"🌰", p:80, xp:8, say:"ほっぺがおちちゃうぷぎ！！" }
];
const snackOf = id => SNACKS.find(x => x.id === id) || SNACKS[0];
const snkToday = uid => { const k = S.pet?.snk?.[uid]; return k?.last === today() ? k.id : null; };
function openSnack(){
  const bal = S.pet?.acorns || 0, done = snkToday(me()), pu = partnerUid(), pd = pu && snkToday(pu);
  openSheet(`<h3>🍰 おやつやさん<button class="x" data-a="close">×</button></h3>
    <p class="muted otp">${done ? `きょうは${snackOf(done).e}${esc(snackOf(done).n)}をあげたよ。またあしたね` : "1日1回、ごはんとはべつにあげられるよ。せいちょうポイントが増える！"} ・ ${AC} ${bal}こ</p>
    <div class="snlist">${SNACKS.map(s => `<button class="snrow ${bal < s.p ? "poor" : ""}" data-a="snackBuy" data-id="${s.id}" ${done ? "disabled" : ""}><span class="sne">${s.e}</span><div class="t"><b>${esc(s.n)}</b><small>せいちょう +${s.xp}</small></div><em>${AC}${s.p}</em></button>`).join("")}</div>
    ${pu ? `<p class="muted otp">${esc(nameOf(pu))}：${pd ? `きょうは${snackOf(pd).e}をあげたよ` : "まだあげていないよ"}</p>` : ""}`);
}
async function snackBuy(id){
  const s = snackOf(id), bal = S.pet?.acorns || 0;
  if (snkToday(me()) || uriBusy) return;
  if (bal < s.p) { toast(`どんぐりがあと${s.p - bal}こ足りないよ`); return; }
  const t = today(), cur = S.pet?.snk?.[me()] || {}, now = Date.now();
  uriBusy = true;
  try {
    await setDoc(petRef(), { acorns: increment(-s.p), snk: { [me()]: { last: t, id: s.id, at: now, n: increment(1), xp: increment(s.xp) } } }, { merge: true });
    S.pet = { ...(S.pet || {}), acorns: bal - s.p, snk: { ...(S.pet?.snk || {}), [me()]: { last: t, id: s.id, at: now, n: (cur.n || 0) + 1, xp: (cur.xp || 0) + s.xp } } };
  } catch (e) { uriBusy = false; toast("あげられませんでした（" + (e.code || e.message) + "）"); return; }
  closeSheet(); S.tab = "uri"; render(); window.scrollTo(0, 0);
  const stg = document.getElementById("ustage"), st = uriState().st;
  if (!stg) { uriBusy = false; return; }
  const f = document.createElement("span"); f.className = "ufood"; f.textContent = s.e; f.style.left = "calc(50% + 46px)"; stg.appendChild(f);
  setTimeout(() => { f.remove(); const el = document.getElementById("uri"); if (el) { el.className = `uri s${st} idle`; el.innerHTML = uriSvg(st, "eat", uw()); } uriSay(`${s.e} ${s.say}`); }, 600);
  setTimeout(() => { uriFx(["💕", "✨", `+${s.xp}`], 6); uriBusy = false; render(); uriSay("ごちそうさまぷぎ！"); }, 2400);
}

/* =============== どんぐりガチャ（ノーマル・レア・超レアの3台。ガチャ限定のきせかえ・家具） =============== */
const GACHAS = [
  { n:"ノーマル", p:10, back:4,  c:"#a9ddc5" },
  { n:"レア",     p:30, back:12, c:"#f4a3b8" },
  { n:"超レア",   p:80, back:32, c:"#c7b8ef" }
];
const gachaPool = t => [...UITEMS.filter(it => it.g && (!t || it.g === t)).map(it => ({ k: "w", it })), ...RITEMS.filter(it => it.g && (!t || it.g === t)).map(it => ({ k: "r", it }))];
const gHas = x => x.k === "w" ? owned(x.it) : rOwned(x.it);
const gachaHave = t => gachaPool(t).filter(gHas).length;
let gBusy = false;
function gThumb(x){ const st = uriState().st; return x.k === "w" ? `<div class="uri s${st}">${uriSvg(st, "happy", { [x.it.s]: x.it.id })}</div>` : `<div class="rth">${roomThumb(x.it)}</div>`; }
function gachaMachine(t){
  const cols = ["#f9b6c7", "#c7b8ef", "#fde68a", "#a9ddc5", "#9fd3ee", "#f4a3b8"];
  return `<div class="gmach t${t}" id="gmach" style="--gc:${GACHAS[t - 1].c}"><div class="gdome">${Array.from({ length: 11 }, (_, i) => `<i style="left:${8 + (i * 37) % 76}%;top:${38 + (i * 23) % 50}%;background:${cols[i % cols.length]}"></i>`).join("")}</div>
    <div class="gbody"><span class="gname">${GACHAS[t - 1].n}</span><div class="gknob"></div><div class="gslot"></div></div></div>`;
}
function openGacha(res){
  const t = S.gTier || 1, g = GACHAS[t - 1], bal = S.pet?.acorns || 0, pool = gachaPool(t), have = gachaHave(t);
  openSheetK("gacha", `<h3>💊 どんぐりガチャ<button class="x" data-a="close">×</button></h3>
    <div class="seg">${GACHAS.map((x, i) => `<button class="${t === i + 1 ? "on" : ""}" data-a="gTier" data-v="${i + 1}">${x.n}<small> ${AC}${x.p}</small></button>`).join("")}</div>
    <div class="gstage" id="gstage">${res || gachaMachine(t)}</div>
    <button class="btn block" data-a="gachaSpin" ${bal < g.p ? "disabled" : ""}>${res ? "もう1回まわす" : "まわす"}（${AC}${g.p}）</button>
    <p class="muted otp">${AC} ${bal}こ ・ かぶったら${AC}${g.back}こかえってくるよ</p>
    <div class="lbl2">${g.n}ガチャのなかみ（${have} / ${pool.length}）${have === pool.length ? " 🎉コンプリート！" : ""}</div>
    <div class="wgrid">${pool.map(x => `<div class="witem ${gHas(x) ? "" : "lock"}">${gThumb(x)}<b>${gHas(x) ? esc(x.it.n) : "？？？"}</b><small>${x.k === "w" ? USLOTS[x.it.s] : RSLOTS[x.it.s]}</small></div>`).join("")}</div>`);
}
async function gachaSpin(){
  const t = S.gTier || 1, g = GACHAS[t - 1], bal = S.pet?.acorns || 0;
  if (gBusy) return;
  if (bal < g.p) { toast(`どんぐりがあと${g.p - bal}こ足りないよ`); return; }
  const pool = gachaPool(t), x = pool[Math.floor(Math.random() * pool.length)], dup = gHas(x), key = x.k === "w" ? "items" : "ritems", d = -g.p + (dup ? g.back : 0);
  gBusy = true;
  try {
    await setDoc(petRef(), { acorns: increment(d), gachaN: increment(1), ...(dup ? {} : { [key]: { [x.it.id]: true } }) }, { merge: true });
    S.pet = { ...(S.pet || {}), acorns: bal + d, ...(dup ? {} : { [key]: { ...(S.pet?.[key] || {}), [x.it.id]: true } }) };
  } catch (e) { gBusy = false; toast("まわせませんでした（" + (e.code || e.message) + "）"); return; }
  if (!document.getElementById("gmach")) openGacha();
  document.getElementById("gmach")?.classList.add("spin");
  setTimeout(() => {
    gBusy = false;
    if (!document.getElementById("gstage")) return;
    const sr = t === 3 && !dup;
    openGacha(`<div class="gres ${dup ? "dup" : "new"} ${sr ? "sr" : ""}">${sr ? `<div class="grays"></div><span class="gsr">超レア！</span>` : ""}<div class="gcap" style="--gc:${g.c}"><i></i><i></i></div><div class="gitem">${gThumb(x)}</div>
      <b>${esc(x.it.n)}</b><small>${dup ? `かぶっちゃった… ${AC}${g.back}こかえってきたよ` : `${x.k === "w" ? "きせかえ" : "おへや"}でつかえるよ！`}</small></div>`);
    render();
  }, t === 3 ? 2000 : 1500);
}
