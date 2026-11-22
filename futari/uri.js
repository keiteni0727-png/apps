"use strict";
/* ウリログ：ふたりで育てるうり坊・うりぼー専用メニュー
   ファイルの分け方：core.js（共通の道具・状態）→ 各機能 → events.js（ボタン）→ boot.js（Firebase につないで起動）
   どのファイルの関数・変数も、ほかのファイルからそのまま使える（ふつうの <script> で順に読み込む） */
/* =============== ふたりで育てるうり坊 =============== */
const USTAGES1 = [[0, "ミニうりぼー"], [20, "よちよちうりぼー"], [50, "ちびうりぼー"], [100, "うりぼー"], [180, "やんちゃうりぼー"], [300, "わかウリ"], [450, "つよウリ"], [650, "もりのぬし"], [900, "そらのウリ"], [1200, "でんせつのウリ"]];
/* 2代目（1代目が産んだ赤ちゃん）：8段階。1日にせいちょうできるのは G2_CAP まで */
const USTAGES2 = [[0, "ねんねうりぼー"], [40, "よちよちうりぼー"], [120, "とてとてうりぼー"], [260, "ぴょこみみうりぼー"], [500, "もこもこうりぼー"], [900, "わたげうりぼー"], [1600, "さくらうりぼー"], [2800, "にじいろうりぼー"]];
const GEN2_AT = new Date("2026-11-23T00:00:00+09:00").getTime(), G2_CAP = 30;
const uriGen = () => S.pet?.g2 ? 2 : 1;
const ust = () => uriGen() === 2 ? USTAGES2 : USTAGES1;
const UFOODS = ["🍠", "🌰", "🍎", "🥕", "🍄"];
const dayMs = s => new Date(ymd(s)).getTime();
/* これまでの記録から「ごはん」の記録を作る */
function uriEvents(){
  // 生まれた時（bornAt）より前の記録は数えない。rec は「記録した時刻」
  const born = S.pet?.bornAt || Date.now(), fb = S.pet?.feedBase || {};
  const ev = [], mem = S.room?.members || [], add = (at, who, t, xp, rec, ng) => { if ((rec ?? at ?? 0) >= born) ev.push({ at: at || 0, who, t, xp, ng }); };
  Object.entries(S.qa || {}).forEach(([d, q]) => {
    const a = Object.entries(q.a || {}).filter(([u]) => mem.includes(u));
    a.forEach(([u, x]) => add(x.at || dayMs(d), u, "今日の質問に答えた", 5));
    if (a.length >= 2) add(Math.max(...a.map(([, x]) => x.at || 0)), null, "ふたりとも質問に答えた", 5);
  });
  S.places.forEach(p => {
    if (p.visited) { const at = p.visitedAt ? dayMs(p.visitedAt) : ms(p.updatedAt); add(at, null, `${p.title}に行った`, 20, Math.max(at, p.updatedAt ? ms(p.updatedAt) : 0)); }
    if (isBoth(p)) add(ms(p.updatedAt || p.createdAt), null, `${p.title}でマッチ`, 5, undefined, 1);
    Object.entries(p.notes || {}).forEach(([u, n]) => { if (mem.includes(u) && n?.t) add(n.at, u, `${p.title}にひとこと`, 5, undefined, 1); });
  });
  S.dates.forEach(d => add(ms(d.createdAt), d.by, "デートの予定を入れた", 5, undefined, 1));
  S.tickets.forEach(t => { add(t.at, t.from, `「${t.t}」を贈った`, 3, undefined, 1); if (t.status === "done") add(t.doneAt, t.from, `「${t.t}」をかなえた`, 10, undefined, 1); });
  const cp = S.pet?.coop; if (cp?.total) ev.push({ at: cp.at || 0, who: null, t: `ふたりそろってごはん（これまで${cp.total}日）`, xp: 5 * cp.total });
  const lseen = new Set(); (S.letters || []).slice().sort((a, b) => (a.at || 0) - (b.at || 0)).forEach(l => { const k = l.from + localDay(l.at || 0); if (lseen.has(k) || !mem.includes(l.from)) return; lseen.add(k); add(l.at, l.from, "おてがみをあずけた", 3); });
  Object.entries(S.pet?.feeds || {}).forEach(([u, f]) => { const n = (f?.n || 0) - (fb[u] || 0); if (mem.includes(u) && n > 0) ev.push({ at: f.at || dayMs(f.last), who: u, t: n > 1 ? `ごはんをあげた（これまで${n}回）` : "ごはんをあげた", xp: 3 * n }); });
  Object.entries(S.pet?.snk || {}).forEach(([u, k]) => { if (mem.includes(u) && k?.xp > 0) ev.push({ at: k.at || 0, who: u, t: `おやつをあげた（これまで${k.n || 1}回）`, xp: k.xp }); });
  Object.entries(S.pet?.play || {}).forEach(([u, k]) => { if (mem.includes(u) && k?.n > 0) ev.push({ at: k.at || 0, who: u, t: `おもちゃであそんだ（これまで${k.n}日）`, xp: TOY_XP * k.n }); });
  Object.entries(S.pet?.otsuN || {}).forEach(([u, n]) => { if (mem.includes(u) && n > 0) ev.push({ at: S.pet?.otsu?.[u]?.back || 0, who: u, t: `おつかいに行った（これまで${n}回）`, xp: 4 * n }); });
  return ev.sort((a, b) => b.at - a.at);
}
function uriState(){
  // raw：2代目のせいちょうに数えるものの合計（ng＝2代目では数えない：チケット・マッチ・デートの予定・ひとこと）
  const ev = uriEvents(), all = ev.reduce((a, e) => a + e.xp, 0), raw = ev.reduce((a, e) => a + (e.ng ? 0 : e.xp), 0), L = ust();
  const days = uriGen() === 2 ? g2Days(raw) : null, xp = days ? days.reduce((a, [, n]) => a + n, 0) : all;
  const tx = days ? (days.find(([d]) => d === today())?.[1] || 0) : 0;
  let st = 0; L.forEach(([n], i) => { if (xp >= n) st = i; });
  const next = L[st + 1]?.[0], cur = L[st][0];
  const t = today(), last = ev.length ? ev[0].at : 0;
  const idle = last ? Math.max(0, dayDiff(localDay(last), t)) : 1;
  const fedMe = S.pet?.feeds?.[me()]?.last === t, pu = partnerUid(), fedHim = pu && S.pet?.feeds?.[pu]?.last === t;
  let energy = Math.max(10, 100 - idle * 25);
  if (!fedMe && !fedHim && idle === 0) energy = Math.min(energy, 85);
  const h = new Date().getHours();
  let mood = energy <= 50 ? "sad" : !fedMe ? "hungry" : (fedHim || !pu) ? "happy" : "normal";
  if ((h >= 23 || h < 6) && !S.uriAwake) mood = "sleep";
  return { ev, raw, xp, tx, st, next, cur, energy, mood, fedMe, fedHim, idle };
}
/* 2代目のせいちょう：日ごとに「その日のごはんの合計（1代目からの通算）」を記録しておき、
   前の日より増えた分を 1日 G2_CAP まで足していく。記録はどちらのスマホからでも同じ値になる */
function g2Days(raw){
  const g = S.pet?.g2 || {}, e = { ...(g.e || {}) }, t = today();
  e[t] = Math.max(e[t] || 0, raw);
  let prev = g.base || 0; const out = [];
  Object.keys(e).sort().forEach(d => { if (d > t) return; const v = e[d]; out.push([d, Math.max(0, Math.min(G2_CAP, v - prev))]); prev = Math.max(prev, v); });
  return out;
}
/* きょうの合計を保存（増えたときだけ） */
let g2Saved = "";
function uriG2Track(raw){
  const g = S.pet?.g2; if (!g || !S.roomId) return;
  const t = today(), k = S.roomId + t + raw;
  if (raw <= (g.e?.[t] || 0) || g2Saved === k) return;
  g2Saved = k; S.pet.g2 = { ...g, e: { ...(g.e || {}), [t]: raw } };
  setDoc(petRef(), { g2: { e: { [t]: raw } } }, { merge: true }).catch(() => { g2Saved = ""; });
}
/* 11/23 0:00 をすぎて最初に開いたとき、1代目をアルバムにのこして2代目（赤ちゃん）を生む */
let g2Tried = null;
function uriG2Birth(){
  if (Date.now() < GEN2_AT || !S.pet?.bornAt || S.pet.g2 || g2Tried === S.roomId || S.needRules) return;
  g2Tried = S.roomId;
  const u = uriState(), now = Date.now();
  const val = { g1: { name: S.pet.name || "ウリ", st: u.st, xp: u.xp, bornAt: S.pet.bornAt, endAt: now }, g2: { bornAt: now, base: u.raw, e: {} } };
  S.pet = { ...S.pet, ...val };
  setDoc(petRef(), val, { merge: true }).catch(() => {});
}
/* 開いたまま 0:00 をむかえたときも生まれるように */
if (Date.now() < GEN2_AT && GEN2_AT - Date.now() < 864e5 * 3) setTimeout(() => { if (S.room) render(); }, GEN2_AT - Date.now() + 1500);
/* はじめて開いたとき、うり坊を生まれたてにする（それまでのごはんの回数は「生まれる前」の分として差し引く） */
let uriBirthTried = null;
function uriBirth(roomId){
  if (!S.pet || S.pet.bornAt || uriBirthTried === roomId) return;
  uriBirthTried = roomId;
  const val = { bornAt: Date.now(), feedBase: Object.fromEntries(Object.entries(S.pet.feeds || {}).map(([u, f]) => [u, f?.n || 0])) };
  S.pet = { ...S.pet, ...val };
  setDoc(doc(db, "rooms", roomId, "meta", "pet"), val, { merge: true }).catch(() => {});
}
/* 段階が上がったら進化の演出（全画面）。
   見た段階はスマホごとに覚えておき、開いていなかった人には次に開いたとき（どのタブでも）に出す。
   データの読み込み中は段階が低く出ることがあるので、更新が落ち着いてから判定する */
let uriEvoT = null, uriEvoOn = false;
function uriCheckEvolve(){
  clearTimeout(uriEvoT);
  uriEvoT = setTimeout(() => {
    if (!S.pet?.bornAt || !S.roomId || S.needRules || uriEvoOn) return;
    uriG2Birth();
    const u0 = uriState(), st = u0.st, g2 = uriGen() === 2, k = (g2 ? "uriG2St_" : "uriSt2_") + S.roomId;
    if (g2) uriG2Track(u0.raw);
    let seen = null;
    try {
      if (g2 && !localStorage.getItem("uriG2Born_" + S.roomId)) { localStorage.setItem("uriG2Born_" + S.roomId, "1"); localStorage.setItem(k, String(st)); uriBirthShow(); return; }
      seen = localStorage.getItem(k);
    } catch (e) { return; }
    if (seen === null) { try { localStorage.setItem(k, String(st)); } catch (e) {} return; }
    if (st <= +seen) return;
    try { localStorage.setItem(k, String(st)); } catch (e) {}
    uriEvolveShow(Math.max(0, Math.min(+seen, st - 1)), st);
  }, 2500);
}
function uriEvolveShow(from, to){
  uriEvoOn = true;
  const nm = esc(uriName()), w = uw();
  const o = document.createElement("div"); o.className = "evo";
  o.innerHTML = `<div class="erays"></div><div class="eglow"></div>
    <div class="emsg" id="emsg">…おや？<br>${nm}のようすが…！</div>
    <div class="ebox"><div class="uri s${from}" id="euri">${uriSvg(from, "surprise", w)}</div></div>
    <div class="etap">タップでとじる</div><div class="eflash"></div>`;
  document.body.appendChild(o);
  const U = () => o.querySelector("#euri"), msg = o.querySelector("#emsg"), T = [];
  const at = (ms, f) => T.push(setTimeout(f, ms));
  const show = (st, mood, sil) => { const e = U(); e.className = `uri s${st}${sil ? " sil" : ""}`; e.innerHTML = uriSvg(st, mood, w); };
  // 1) 光りはじめる（白いシルエット＋光の粒）
  at(1600, () => { o.classList.add("charge"); show(from, "normal", true); });
  const pts = setInterval(() => { if (!o.classList.contains("charge")) return; const p = document.createElement("i"); p.className = "ept"; p.style.left = (10 + Math.random() * 80) + "%"; p.style.animationDuration = (1.2 + Math.random()) + "s"; o.appendChild(p); setTimeout(() => p.remove(), 2400); }, 90);
  // 2) 前と後の姿が交互に点滅して、だんだん速くなる
  let t = 2300, gap = 420, flip = false;
  while (gap > 50) { const f = flip = !flip; at(t, () => show(f ? to : from, "normal", true)); t += gap; gap = Math.round(gap * .84); }
  // 3) まっしろにフラッシュ → 新しい姿が登場
  let doneAt = 0;
  const reveal = () => {
    o.querySelector(".eflash").classList.add("on");
    T.push(setTimeout(() => {
      o.classList.remove("charge"); o.classList.add("done"); clearInterval(pts); doneAt = Date.now();
      show(to, "happy", false); U().classList.add("pop");
      msg.innerHTML = `おめでとう！<br>${nm}は <b>${esc(ust()[to][1])}</b> に<br>しんかした！`;
      o.querySelector(".ebox").insertAdjacentHTML("afterend", `<div class="estep">${to + 1} / ${ust().length} だんかいめ</div>`);
      ["✨", "🌸", "⭐", "💖", "🎉", "🌰"].forEach(e => { for (let j = 0; j < 4; j++) { const c = document.createElement("span"); c.className = "econf"; c.textContent = e; c.style.left = Math.random() * 95 + "%"; c.style.animationDelay = (Math.random() * 1.2) + "s"; o.appendChild(c); setTimeout(() => c.remove(), 4500); } });
    }, 220));
  };
  at(t, reveal);
  const close = () => {
    T.forEach(clearTimeout); clearInterval(pts); o.remove(); uriEvoOn = false;
    const e2 = document.getElementById("uri"); if (e2) { const u2 = uriState(); e2.className = `uri s${u2.st} ${u2.mood === "sleep" ? "sleep" : "idle"}`; e2.innerHTML = uriSvg(u2.st, u2.mood, uw()); }
    uriSay(`${ust()[to][1]}になったぷぎ！これからもよろしくね`);
  };
  o.addEventListener("click", e => {
    e.stopPropagation();
    if (doneAt) { if (Date.now() - doneAt > 1200) close(); return; }
    if (o.querySelector(".eflash.on")) return;
    // 途中でタップしたら、すぐ登場シーンへ
    T.forEach(clearTimeout); T.length = 0; reveal();
  });
}
/* 1代目が赤ちゃんを産む演出（全画面）。それぞれのスマホで1回だけ。名前がまだなら、ここで決める */
function uriBirthShow(){
  uriEvoOn = true;
  const g1 = S.pet?.g1 || {}, pn = esc(g1.name || "ウリ");
  const o = document.createElement("div"); o.className = "evo birth";
  o.innerHTML = `<div class="erays"></div><div class="eglow"></div>
    <div class="emsg" id="emsg">…おや？<br>${pn}のようすが…！</div>
    <div class="ebox"><div class="uri bpar" id="bpar">${uriSvg(g1.st ?? 9, "normal", null, 1)}</div><div class="uri bbaby" id="bbaby">${uriSvg(0, "sleep", null, 2)}</div></div>
    <div class="bname" id="bname"></div>
    <div class="etap">タップでとじる</div><div class="eflash"></div>`;
  document.body.appendChild(o);
  const msg = o.querySelector("#emsg"), par = o.querySelector("#bpar"), baby = o.querySelector("#bbaby"), T = [];
  const at = (ms, f) => T.push(setTimeout(f, ms));
  const hearts = setInterval(() => { if (!o.classList.contains("charge")) return; const h = document.createElement("span"); h.className = "bheart"; h.textContent = ["💕", "💗", "✨"][Math.floor(Math.random() * 3)]; h.style.left = (30 + Math.random() * 40) + "%"; o.appendChild(h); setTimeout(() => h.remove(), 2200); }, 160);
  at(1400, () => { o.classList.add("charge"); par.innerHTML = uriSvg(g1.st ?? 9, "shy", null, 1); });
  let doneAt = 0;
  const reveal = () => {
    o.querySelector(".eflash").classList.add("on");
    T.push(setTimeout(() => {
      o.classList.remove("charge"); o.classList.add("done"); clearInterval(hearts); doneAt = Date.now();
      par.innerHTML = uriSvg(g1.st ?? 9, "happy", null, 1); baby.classList.add("pop");
      msg.innerHTML = `${pn}に<br><b>あかちゃん</b>がうまれた！`;
      ["💖", "🍼", "✨", "🌸", "⭐"].forEach(e => { for (let j = 0; j < 4; j++) { const c = document.createElement("span"); c.className = "econf"; c.textContent = e; c.style.left = Math.random() * 95 + "%"; c.style.animationDelay = (Math.random() * 1.2) + "s"; o.appendChild(c); setTimeout(() => c.remove(), 4500); } });
      T.push(setTimeout(() => { baby.innerHTML = uriSvg(0, "happy", null, 2); nameBox(); }, 1600));
    }, 220));
  };
  const nameBox = () => {
    const b = o.querySelector("#bname"), nm = S.pet?.g2?.name;
    b.innerHTML = nm ? `なまえは <b>${esc(nm)}</b> だよ<br><small>${pn}はアルバムで見まもってるよ</small>`
      : `<form id="bnf"><div>あかちゃんに なまえをつけてね</div><input class="in" name="n" maxlength="12" placeholder="なまえ" required><button class="btn">きめる</button></form><small>${pn}はアルバムで見まもってるよ</small>`;
    b.classList.add("on");
    const f = b.querySelector("#bnf"); if (!f) return;
    f.addEventListener("click", e => e.stopPropagation());
    f.onsubmit = async ev => {
      ev.preventDefault(); const n = String(f.n.value || "").trim().slice(0, 12); if (!n) return;
      S.pet.g2 = { ...S.pet.g2, name: n };
      setDoc(petRef(), { g2: { name: n } }, { merge: true }).catch(e => toast("保存できませんでした（" + (e.code || e.message) + "）"));
      nameBox();
    };
  };
  at(3400, reveal);
  const close = () => {
    T.forEach(clearTimeout); clearInterval(hearts); o.remove(); uriEvoOn = false; render();
    uriSay("はじめましてぷぃ！よろしくね");
  };
  o.addEventListener("click", e => {
    e.stopPropagation();
    if (doneAt) { if (Date.now() - doneAt > 2000) close(); return; }
    if (o.querySelector(".eflash.on")) return;
    T.forEach(clearTimeout); T.length = 0; reveal();
  });
}
const uriBornAt = () => uriGen() === 2 ? S.pet.g2.bornAt : S.pet?.bornAt;
function localDay(at){ const d = new Date(at); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
const uriName = () => uriGen() === 2 ? (S.pet.g2.name || "あかちゃん") : (S.pet?.name || "ウリ");
function uriLines(u){
  const L = [], pu = partnerUid(), n = nextDate();
  if (u.mood === "sleep") return ["むにゃ…", "すやすや…", "zzz…ぷぎ…"];
  if (u.mood === "sad") L.push("さみしかったぷぎ…", "もっとかまってほしいぷぎ…");
  if (!u.fedMe) L.push("おなかすいたぷぎ〜", "ごはん、ちょうだい？");
  if (u.fedMe && pu && !u.fedHim) L.push(`${nameOf(pu)}からもごはんほしいな`);
  if (n) { const l = dayDiff(today(), n.date); L.push(l === 0 ? "きょうはデートの日！たのしんでね" : `${l}日後のデート、たのしみぷぎ！`); }
  if (!qaAns(today(), me())) L.push("きょうの質問、もう答えた？");
  const an = annivs().map(a => ({ a, o: nextOcc(a.d) })).sort((x, y) => x.o.localeCompare(y.o))[0];
  if (an && dayDiff(today(), an.o) <= 7) L.push(`もうすぐ${an.a.t}だよ！`);
  if (tkGot().some(t => t.status === "new")) L.push("チケット、使ってみたら？");
  if (pu) L.push(`${nameOf(me())}と${nameOf(pu)}、だいすき！`, `${nameOf(pu)}のこと、すき？`);
  const ss = uriSeason(); L.push(ss.line); if (uriSpecial()) L.push(ss.line, ss.line);
  if (lettersIn().length) L.push("おてがみあずかってるぷぎ！はやくよんで〜");
  const lo = S.letters.find(l => l.from === me());
  if (lo && !lo.read) L.push("おてがみ、とどけにいくのたのしみぷぎ");
  if (lo && lo.read && Date.now() - (lo.readAt || 0) < 2 * 86400000 && pu) L.push(`${nameOf(pu)}、おてがみよんでくれたよ！`);
  if (pu && !S.letters.length) L.push(`${nameOf(pu)}におてがみ、とどけようか？`);
  if (pu) { const gb = gameInfo(pu).best, mb = gameInfo(me()).best; if (gb > mb) L.push(`${nameOf(pu)}のどんぐり記録、${gb}こだって！まけないで！`); else if (mb > 0) L.push(`どんぐり${mb}こ、すごかったぷぎ！`); }
  if (Object.keys(uw()).length) L.push("このかっこう、にあう？", "おしゃれしてうれしいぷぎ♪");
  const cheap = UITEMS.filter(it => it.p && !owned(it)).map(it => it.p).sort((a, b) => a - b)[0];
  if (cheap && (S.pet?.acorns || 0) >= cheap) L.push("どんぐりたまったね！おみせ行こ？");
  if (u.fedMe && u.fedHim) L.push("ふたりからごはん、しあわせぷぎ〜");
  if (coopNow().streak >= 3) L.push(`ふたりそろってごはん${coopNow().streak}日れんぞく！`);
  L.push("ぷぎっ！", "なでなでうれしい〜", "えへへ", "ぷぎぷぎ♪", "いっしょにおでかけしたいな");
  L.push(...uriMoreLines(u), ...otsuLines());
  return L;
}
function uriHtml(){
  if (S.needRules) return "";
  const u = uriState(), pu = partnerUid();
  const pct = u.next ? Math.round((u.xp - u.cur) / (u.next - u.cur) * 100) : 100;
  uriCoopFx();
  return `<div class="card uricard" id="uricard">
    <div class="uhead"><button class="nm" data-a="uriName">${esc(uriName())} ✎</button><span class="tag lav">${esc(ust()[u.st][1])}</span><span class="uacorn">${AC} ${S.pet?.acorns || 0}こ</span></div>
    ${uriSeason().ban ? `<div class="uban">${esc(uriSeason().ban)}</div>` : ""}
    <div class="ustage ${roomNow().fl ? "hasfl" : ""}" id="ustage"><div class="uroom">${roomSvg()}</div>${uriDecoHtml()}<div class="ububble" id="ububble">${esc(S.uriSay || (lettersIn().length ? "おてがみあずかってるぷぎ！" : u.mood === "sleep" ? "すやすや…" : uriSpecial() ? uriSeason().line : u.st === 0 && u.xp < 5 ? "ぷぃ…（うまれたて）" : u.mood === "sad" ? "さみしかったぷぎ…" : !u.fedMe ? "おなかすいたぷぎ〜" : "ぷぎっ！"))}</div>
      <div class="uri s${u.st} ${u.mood === "sleep" ? "sleep" : "idle"}" id="uri" data-a="uriTap">${uriSvg(u.st, u.mood, uw())}</div></div>
    <div class="ubars">
      <div class="ubar"><span>げんき</span><div class="tr"><i style="width:${u.energy}%"></i></div><em>${u.energy}%</em></div>
      <div class="ubar"><span>せいちょう</span><div class="tr"><i class="g" style="width:${pct}%"></i></div><em>${u.next ? `あと${u.next - u.xp}` : "MAX"}</em></div>
    </div>
    ${u.fedMe ? `<button class="btn ghost block" disabled>🍠 きょうはごはんをあげたよ</button>` : `<button class="btn block" data-a="uriFeed">🍠 ごはんをあげる</button>`}
    ${pu ? `<div class="ufed"><span>${esc(nameOf(me()))} ${u.fedMe ? "✅" : "…"}</span><span>${esc(nameOf(pu))} ${u.fedHim ? "✅" : "…"}</span></div>` : ""}
    ${pu ? (() => { const c = coopNow(); return `<div class="ucoop">${c.total ? `🤝 ふたりそろってごはん${c.streak ? ` ・ れんぞく<b>${c.streak}</b>日` : ""} ・ これまで${c.total}日${c.todayDone ? " 💞" : ""}` : "🤝 ふたりとも同じ日にごはんをあげるとボーナス！"}</div>`; })() : ""}
  </div>`;
}
function uriFx(emoji, n = 5){
  const stg = document.getElementById("ustage"); if (!stg) return;
  for (let i = 0; i < n; i++) { const f = document.createElement("span"); f.className = "ufx"; f.textContent = Array.isArray(emoji) ? emoji[i % emoji.length] : emoji; f.style.left = (30 + Math.random() * 40) + "%"; f.style.bottom = (40 + Math.random() * 40) + "px"; f.style.animationDelay = (i * 0.08) + "s"; stg.appendChild(f); setTimeout(() => f.remove(), 1500); }
}
function uriSay(t){ S.uriSay = t; const b = document.getElementById("ububble"); if (b) { b.textContent = t; b.style.animation = "none"; b.offsetWidth; b.style.animation = ""; } }
let uriBusy = false;
/* タップしたときのアクション（c: 動き / m: 表情 / d: 長さ / say: その動きのセリフ） */
const UACTS = [
  { c:"a-jump",     fx:["💕", "✨"], d:700 },
  { c:"a-spin",     fx:["⭐", "✨"], d:800, say:["くるくる〜！", "めがまわらないよ！"] },
  { c:"a-wiggle",   fx:["🎵", "🎶"], d:700, say:["ぷぎぷぎ♪", "ふんふふーん♪"] },
  { c:"a-roll",     fx:["💫"], d:1000, say:["ごろごろ〜", "ころころ〜"] },
  { c:"a-squish",   fx:["💗"], d:600, say:["むぎゅっ", "ぷにぷにしないで〜"] },
  { c:"a-dash",     fx:["💨"], d:900, say:["しゅっしゅっ！", "はしるのだいすき！"] },
  { c:"a-bow",      fx:["🌸"], d:1000, say:["よろしくおねがいしますぷぎ", "ぺこり"] },
  { c:"a-dance",    fx:["🎵", "🎶", "✨"], d:1400, say:["ぷぎぷぎダンス♪", "いっしょにおどろ！"] },
  { c:"a-surprise", fx:["❗"], d:800, m:"surprise", say:["わっ！びっくりした！", "ひゃっ！"] },
  { c:"a-lie",      fx:["💤"], d:1600, m:"sleep", say:["ごろーん…", "ちょっとおやすみ…"] },
  { c:"a-shy",      fx:["💗", "💕"], d:1200, m:"shy", say:["てれるぷぎ…", "そんなに見つめないで〜"] },
  { c:"a-sneeze",   fx:["💦"], d:1000, m:"surprise", say:["へっくしゅん！", "…はなみずでた"] },
  { c:"a-heart",    fx:["💖", "💗", "💕", "💞"], d:900, n:7, say:["すきすき〜！", "ハートどうぞ！"] },
  { c:"a-trip",     fx:["💫"], d:1300, m:"dizzy", say:["いてて…こけちゃった", "…いまの見てた？"] },
  { c:"a-turn",     fx:["✨"], d:900, say:["うしろすがたもかわいい？", "くるっ"] },
  { c:"a-hop",      fx:["🎵"], d:1100, say:["ぴょんぴょん！", "スキップ〜♪"] },
  { c:"a-wink",     fx:["✨"], d:900, m:"wink", say:["ぱちっ☆", "ウインクできた？"] },
  { c:"a-float",    fx:["☁️", "✨"], d:1400, say:["ふわふわ〜", "そら、とべそう！"] }
];
const UDIZZY = { c:"a-dizzy", fx:["💫", "⭐"], d:1800, m:"dizzy", say:["め、めがまわるぷぎ〜", "ちょ、ちょっとまって〜", "ふらふら…なでなでしすぎ〜"] };
const pick = a => a[Math.floor(Math.random() * a.length)];
let uTaps = [], uLastAct = "", uTapT = null;
function uriTap(){
  const el = document.getElementById("uri"); if (!el) return;
  const now = Date.now(); uTaps = uTaps.filter(t => now - t < 2500); uTaps.push(now);
  if (uriBusy && (uTaps.length < 6 || !uTapT)) return;
  let u = uriState();
  if (u.mood === "sleep") { S.uriAwake = true; u = uriState(); el.innerHTML = uriSvg(u.st, "surprise", uw()); el.className = `uri s${u.st} a-surprise`; uriSay(pick(["…はっ！おはようぷぎ！", "ふぁ…おきたぷぎ", "むにゃ…よんだ？"])); uriFx("💤", 2); setTimeout(() => { const e2 = document.getElementById("uri"); if (e2) { e2.className = `uri s${u.st} idle`; e2.innerHTML = uriSvg(u.st, u.mood, uw()); } }, 1400); return; }
  clearTimeout(uTapT); uTapT = null;
  let a;
  if (uTaps.length >= 6) { uTaps = []; a = UDIZZY; }
  else { const c = UACTS.filter(x => x.c !== uLastAct); a = pick(c); }
  uLastAct = a.c;
  uriBusy = true;
  el.innerHTML = uriSvg(u.st, a.m || "happy", uw());
  el.className = `uri s${u.st} ${a.c}`;
  uriFx(a.fx, a.n || 4);
  uriSay(a.say && (a === UDIZZY || Math.random() < .5) ? pick(a.say) : pick(uriLines(u)));
  if (a === UDIZZY) { el.style.animation = "none"; el.offsetWidth; el.style.animation = ""; }
  uTapT = setTimeout(() => { uTapT = null; uriBusy = false; const e2 = document.getElementById("uri"); if (e2) { const u2 = uriState(); e2.className = `uri s${u2.st} ${u2.mood === "sleep" ? "sleep" : "idle"}`; e2.innerHTML = uriSvg(u2.st, u2.mood, uw()); } }, a.d + 100);
}
/* ふえたセリフ */
const UWEAR_LINES = {
  ribbon:"リボン、かわいい？", hairpin:"きらきらヘアピン☆", beret:"げいじゅつのあきぷぎ", hachimaki:"がんばるぞー！えいえいおー！",
  nekomimi:"にゃー…じゃなくてぷぎ！", usamimi:"ぴょん！うさぎさんだよ", straw:"なつやすみきぶんぷぎ", knit:"ぬくぬくあったか〜",
  chef:"きょうのごはん、ぼくがつくる！", headphone:"いいおんがく、きいてるぷぎ♪", witch:"まほうでデートの日にしちゃう！", tophat:"ジェントルうりぼーです",
  halo:"てんしのうりぼーだよ", crown:"おうさまぷぎ！えっへん", sticker:"ほっぺにシール、はってもらった♪", glasses:"かしこそうにみえる？",
  mask:"かぜはひいてないよ？", hige:"ふぉっふぉっふぉ", hglasses:"ふたりがハートにみえるぷぎ", monocle:"ふむ…なるほどぷぎ", sun:"サングラス、イケてる？",
  bib:"ごはん、まだ〜？", bowtie:"おめかししたぷぎ", bell:"ちりんちりん♪", tie:"おしごといってきます！", muffler:"マフラーあったかい〜",
  lei:"アロハ〜ぷぎ！", necklace:"パール、にあう？", cape:"ヒーローさんじょうぷぎ！", butterfly:"ひらひら〜", angel:"そら、とべるかな？",
  flag:"ふれー！ふれー！ふたりー！", ice:"アイスおいしい〜ひとくちいる？", bouquet:"このおはな、あげる！", hballoon:"ハートのふうせん、とんでかないで〜",
  tsuno:"おにはそと〜！…ぼくはうち！", sakura:"さくら、きれいでしょ", kabuto:"つよくなるぞー！", uchiwa:"ぱたぱた、すずしい〜", pumpkin:"トリック・オア・トリート！",
  bat:"こうもりうりぼーだぞ〜", santa:"いいこにしてた？", tonakai:"サンタさんのおてつだい！", leaf:"はっぱのおみやげ、うれしかった！", camera:"はい、チーズ！",
  balloon:"ふうせん、もってて〜", omamori:"ふたりがずっとなかよしでいられますように", tiara:"おひめさまきぶん♪", rainbow:"にじのはね、すてきでしょ", wand:"えいっ！しあわせになれ〜！",
  acornhat:"どんぐりのきもちになったぷぎ", kinoko:"もりのきのこさんだよ〜", clover:"しあわせのよつば、みつけたの", ryukku:"ぼうけんのじゅんびばっちり！", watage:"ふーってしたら、とんでいくよ",
  unicorn:"ゆめのくにからきたぷぎ✨", flcrown:"おはなのおひめさま♪", guruguru:"めがまわる〜…じょうだんだよ", scarf:"みずたま、かわいいでしょ", devil:"こあくまうりぼー、いたずらしちゃうぞ",
  candy:"ぺろぺろ…ひとくちいる？", wataame:"ふわふわあま〜い", goldacorn:"きんのどんぐり、たからものぷぎ！", jewel:"きらきら、まぶしい？", starcrown:"ほしのおうさまぷぎ！",
  dragon:"がおー！…こわくないよ", royal:"おうさまのおなーりー！",
  hpin:"ハート、つけてみたぷぎ", bandaid:"ころんじゃった…でもへいき！", bandana:"ぼうけんうりぼーだよ", onigiri:"おにぎり、はんぶんこしよ",
  rhalo:"にじのわっか、レアなんだって！", starglass:"ふたりがきらきらにみえるぷぎ", phoenix:"ほのおのはね、かっこいいでしょ", lantern:"よみちもあんしんぷぎ"
};
function uriMoreLines(u){
  const L = [], h = new Date().getHours(), wd = new Date().getDay(), pu = partnerUid(), pn = pu ? nameOf(pu) : "", mn = nameOf(me());
  if (h >= 5 && h < 11) L.push("おはようぷぎ！", "きょうもいい日になりますように", "あさごはん、たべた？");
  else if (h < 14) L.push("おひるごはん、なにたべた？", "おなかいっぱい？");
  else if (h < 17) L.push("おやつのじかんぷぎ〜", "ちょっとおひるねしたいな");
  else if (h < 23) L.push("おつかれさまぷぎ！", "きょうもがんばったね", "きょうはどんな日だった？");
  L.push(["にちようび、のんびりしよ", "げつようび、ファイトぷぎ！", "かようび、あとちょっとがんばろ", "すいようび、はんぶんきたよ！", "もくようび、あしたできんようび！", "きんようびだ〜！あしたやすみ？", "どようび！おでかけびより？"][wd]);
  if (u.st <= 1) L.push("ぷぃ…", "あぶぅ", "だっこして〜", "ねんね…まだしないもん", "おっきくなりたいぷぃ");
  else if (u.st <= 4) L.push("もっとおおきくなりたいぷぎ！", "きょうはなにしてあそぶ？", "どんぐりさがしにいこ！", "ぼく、つよくなったでしょ？");
  else L.push("ふたりのことは、ぼくがまもるぷぎ", "おとなになったでしょ？", "むかしはちいさかったなあ", "ふたりにそだててもらえて、しあわせ");
  Object.values(uw()).forEach(id => { if (UWEAR_LINES[id]) L.push(UWEAR_LINES[id], UWEAR_LINES[id]); });
  L.push("なでなで〜もっと〜", "そこ、くすぐったいぷぎ！", "えへへ、うれしい", "もういっかい！", "しっぽふりふり〜", "おなか、なでて〜",
    "ねえねえ、きいて！…わすれた", "ぷぎ？", "ぷぎゃー！", "あしたもあそぼうね", "ぼく、しあわせものぷぎ", "ほめてほめて〜",
    "いっしょにおひるねしよ", "つぎのデート、どこいく？", "ふたりのしゃしん、もっとみたいな", "きょうのふたりも、なかよしぷぎ",
    "てをつないで、おでかけしたい", "いいこにしてたよ", "だいすきって、なんかいいっても足りないね", "ぎゅーってして！");
  if (pu) L.push(`${pn}にあいたいな`, `${pn}のいいところ、いっこおしえて？`, `${mn}のこと、${pn}がすきっていってたよ（ないしょ）`, `${mn}、${pn}にやさしくしてる？`, `${pn}にもなでなでしてもらいたいな`);
  return L;
}

async function uriFeed(btn){
  const u = uriState(); if (u.fedMe || uriBusy) return;
  btn.disabled = true; uriBusy = true;
  const stg = document.getElementById("ustage"), el = document.getElementById("uri");
  const food = UFOODS[Math.floor(Math.random() * UFOODS.length)];
  const f = document.createElement("span"); f.className = "ufood"; f.textContent = food; f.style.left = "calc(50% + 46px)"; stg.appendChild(f);
  const t = today(), cur = S.pet?.feeds?.[me()] || {};
  const val = { n: (cur.n || 0) + 1, last: t, at: Date.now() };
  try {
    await setDoc(doc(db, "rooms", S.roomId, "meta", "pet"), { feeds: { [me()]: val } }, { merge: true });
    S.pet = { ...(S.pet || {}), feeds: { ...(S.pet?.feeds || {}), [me()]: val } };
    setTimeout(() => { f.remove(); if (el) { el.className = `uri s${u.st} idle`; el.innerHTML = uriSvg(u.st, "eat", uw()); } uriSay(`${food} もぐもぐ…おいしいぷぎ！`); }, 600);
    setTimeout(() => { uriFx(["💕", "+3"], 4); uriBusy = false; render(); uriSay("ごちそうさまぷぎ！"); }, 2300);
  } catch (e) {
    f.remove(); uriBusy = false; btn.disabled = false;
    toast(e.code === "permission-denied" ? "あげられませんでした。Firebaseのルール更新が必要です" : "あげられませんでした（" + (e.code || e.message) + "）");
  }
}
function openUriInfo(){
  const u = uriState();
  const log = (uriGen() === 2 ? u.ev.filter(e => e.at >= S.pet.g2.bornAt && !e.ng) : u.ev).slice(0, 10);
  openSheet(`<h3>${esc(uriName())}のようす<button class="x" data-a="close">×</button></h3>
  <div class="card" style="text-align:center">
    <div style="font-size:13px;color:var(--muted)">いまのすがた</div>
    <div style="font-size:18px;font-weight:700;color:var(--pink-d)">${esc(ust()[u.st][1])}</div>
    <div class="muted">せいちょう ${u.xp}${u.next ? ` ・ 次のすがたまで あと${u.next - u.xp}` : " ・ さいごまで育ったよ！"}</div>
    ${uriGen() === 2 ? `<div class="muted" style="font-size:12px">きょうのせいちょう ${u.tx} / ${G2_CAP}（1日${G2_CAP}まで）</div>` : ""}
    ${uriBornAt() ? `<div class="muted" style="font-size:12px">${esc(fmtShort(localDay(uriBornAt())))}にうまれたよ（${dayDiff(localDay(uriBornAt()), today()) + 1}日目）</div>` : ""}
  </div>
  <div class="sec">ごはんになること</div>
  <div class="card" style="padding:8px 16px;font-size:13px;line-height:1.9">${uriGen() === 2 ? `🍠 ごはんをあげる（1日1回ずつ）+3<br>🤝 ふたりともごはんをあげた日 +5<br>🍰 おやつ（1日1回ずつ）+3〜8<br>🧸 おもちゃであそぶ（1日1回）+4 ・ 🧺 おつかい +4<br>💭 今日の質問に答える +5（ふたりとも答えたら +5）<br>💌 おてがみをあずける +3（1日1回ぶん）<br>📷 「行った！」 +20` : `🍠 ごはんをあげる（1日1回ずつ）+3<br>💭 今日の質問に答える +5（ふたりとも答えたら +5）<br>📷 「行った！」 +20 ・ 💬 おもいでにひとこと +5<br>📅 デートの予定を入れる +5 ・ 💞 マッチ +5<br>🎟 チケットを贈る +3 ・ かなえる +10<br>🤝 ふたりともごはんをあげた日 +5<br>💌 おてがみをあずける +3（1日1回ぶん）`}</div>
  <div class="sec">さいきんのごはん</div>
  <div class="card" style="padding:4px 16px">${log.length ? log.map(e => `<div class="ulog"><div class="main">${e.who ? esc(nameOf(e.who)) + "：" : "ふたりで："}${esc(e.t)}<small>${e.at ? esc(fmtShort(localDay(e.at))) : ""}</small></div><b>+${e.xp}</b></div>`).join("") : `<p class="muted">まだありません</p>`}</div>
  <p class="muted" style="text-align:center;font-size:12px">${uriGen() === 2 ? `せいちょうは1日${G2_CAP}まで。` : ""}何日もかまわないと、げんきが減ってしょんぼりします。</p>`);
}
function openUriName(){
  openSheet(`<h3>なまえをつける<button class="x" data-a="close">×</button></h3>
  <form id="unf"><label class="f"><span>うり坊のなまえ</span><input class="in" name="n" maxlength="12" value="${esc(uriName())}" required></label><button class="btn block">決める</button></form>`);
  document.getElementById("unf").onsubmit = async ev => {
    ev.preventDefault(); const n = String(ev.target.n.value || "").trim().slice(0, 12); if (!n) return;
    try { if (uriGen() === 2) { await setDoc(petRef(), { g2: { name: n } }, { merge: true }); S.pet.g2 = { ...S.pet.g2, name: n }; } else { await setDoc(petRef(), { name: n }, { merge: true }); S.pet = { ...(S.pet || {}), name: n }; } closeSheet(); render(); uriSay(`${n}になったぷぎ！うれしい！`); }
    catch (e) { toast(e.code === "permission-denied" ? "保存できませんでした。Firebaseのルール更新が必要です" : "保存できませんでした（" + (e.code || e.message) + "）"); }
  };
}


/* =============== うりぼー専用メニュー =============== */
const petRef = () => doc(db, "rooms", S.roomId, "meta", "pet");
const uw = () => S.pet?.wear || {};
const visitedCount = () => S.places.filter(p => p.visited).length;
/* きせかえアイテム（p: どんぐりの値段 / m: 買える月 / v: 「行った！」の数でもらえるおみやげ） */
const UITEMS = [
  // あたま
  { id:"ribbon",   s:"head", n:"リボン",         e:"🎀", p:15 },
  { id:"hairpin",  s:"head", n:"ほしのヘアピン", e:"⭐", p:15 },
  { id:"beret",    s:"head", n:"ベレー帽",       e:"🎨", p:25 },
  { id:"hachimaki",s:"head", n:"はちまき",       e:"🔥", p:25 },
  { id:"nekomimi", s:"head", n:"ねこみみ",       e:"🐱", p:30 },
  { id:"usamimi",  s:"head", n:"うさみみ",       e:"🐰", p:30 },
  { id:"straw",    s:"head", n:"むぎわら帽子",   e:"👒", p:35 },
  { id:"knit",     s:"head", n:"ニット帽",       e:"🧶", p:40 },
  { id:"chef",     s:"head", n:"コック帽",       e:"👨‍🍳", p:40 },
  { id:"headphone",s:"head", n:"ヘッドホン",     e:"🎧", p:45 },
  { id:"witch",    s:"head", n:"まじょのぼうし", e:"🧙", p:50 },
  { id:"tophat",   s:"head", n:"シルクハット",   e:"🎩", p:55 },
  { id:"halo",     s:"head", n:"てんしのわっか", e:"😇", p:60 },
  { id:"crown",    s:"head", n:"おうかん",       e:"👑", p:100 },
  // かお
  { id:"sticker",  s:"face", n:"ほっぺシール",   e:"💗", p:15 },
  { id:"glasses",  s:"face", n:"まるメガネ",     e:"👓", p:20 },
  { id:"mask",     s:"face", n:"マスク",         e:"😷", p:20 },
  { id:"hige",     s:"face", n:"おひげ",         e:"🥸", p:25 },
  { id:"hglasses", s:"face", n:"ハートのメガネ", e:"💕", p:35 },
  { id:"monocle",  s:"face", n:"モノクル",       e:"🧐", p:40 },
  { id:"sun",      s:"face", n:"サングラス",     e:"🕶️", p:45 },
  // くび
  { id:"bib",      s:"neck", n:"よだれかけ",     e:"🍼", p:15 },
  { id:"bowtie",   s:"neck", n:"ちょうネクタイ", e:"🎗️", p:20 },
  { id:"bell",     s:"neck", n:"すず",           e:"🔔", p:25 },
  { id:"tie",      s:"neck", n:"ネクタイ",       e:"👔", p:30 },
  { id:"muffler",  s:"neck", n:"マフラー",       e:"🧣", p:35 },
  { id:"lei",      s:"neck", n:"おはなのレイ",   e:"🌺", p:40 },
  { id:"necklace", s:"neck", n:"パールのネックレス", e:"📿", p:50 },
  // せなか
  { id:"cape",     s:"back", n:"マント",         e:"🦸", p:45 },
  { id:"butterfly",s:"back", n:"ちょうちょのはね", e:"🦋", p:55 },
  { id:"angel",    s:"back", n:"てんしのはね",   e:"🪽", p:70 },
  // もちもの
  { id:"flag",     s:"side", n:"はた",           e:"🚩", p:15 },
  { id:"ice",      s:"side", n:"アイス",         e:"🍦", p:20 },
  { id:"bouquet",  s:"side", n:"はなたば",       e:"💐", p:30 },
  { id:"hballoon", s:"side", n:"ハートのふうせん", e:"💖", p:35 },
  // 期間限定
  { id:"tsuno",    s:"head", n:"おにのつの",     e:"👹", p:15, m:[2] },
  { id:"sakura",   s:"head", n:"さくらのかみかざり", e:"🌸", p:15, m:[3, 4] },
  { id:"kabuto",   s:"head", n:"かぶと",         e:"🎏", p:15, m:[5] },
  { id:"uchiwa",   s:"side", n:"うちわ",         e:"🎐", p:15, m:[7, 8] },
  { id:"pumpkin",  s:"head", n:"かぼちゃぼう",   e:"🎃", p:15, m:[10] },
  { id:"bat",      s:"back", n:"こうもりのはね", e:"🦇", p:15, m:[10] },
  { id:"santa",    s:"head", n:"サンタぼう",     e:"🎅", p:15, m:[12] },
  { id:"tonakai",  s:"head", n:"トナカイのつの", e:"🦌", p:15, m:[12] },
  // おでかけのおみやげ（「行った！」の数）
  { id:"leaf",     s:"head", n:"はっぱ",         e:"🌿", v:1 },
  { id:"camera",   s:"neck", n:"カメラ",         e:"📷", v:3 },
  { id:"balloon",  s:"side", n:"ふうせん",       e:"🎈", v:5 },
  { id:"omamori",  s:"neck", n:"おまもり",       e:"🧧", v:7 },
  { id:"tiara",    s:"head", n:"ティアラ",       e:"💎", v:10 },
  { id:"rainbow",  s:"back", n:"にじのはね",     e:"🌈", v:15 },
  { id:"wand",     s:"side", n:"ほしのつえ",     e:"🪄", v:20 },
  // おつかいで見つかる（o）
  { id:"acornhat", s:"head", n:"どんぐりぼうし", e:"🌰", o:1 },
  { id:"kinoko",   s:"head", n:"きのこのぼうし", e:"🍄", o:1 },
  { id:"clover",   s:"face", n:"よつばのシール", e:"🍀", o:1 },
  { id:"ryukku",   s:"back", n:"ぼうけんリュック", e:"🎒", o:1 },
  { id:"watage",   s:"side", n:"たんぽぽのわたげ", e:"🌼", o:1 },
  // レアガチャ（g:2）
  { id:"unicorn",  s:"head", n:"ユニコーンのつの", e:"🦄", g:2 },
  { id:"flcrown",  s:"head", n:"おはなのかんむり", e:"💐", g:2 },
  { id:"guruguru", s:"face", n:"ぐるぐるメガネ", e:"🌀", g:2 },
  { id:"scarf",    s:"neck", n:"みずたまスカーフ", e:"🩵", g:2 },
  { id:"devil",    s:"back", n:"こあくまのはね", e:"😈", g:2 },
  { id:"candy",    s:"side", n:"ぐるぐるキャンディ", e:"🍭", g:2 },
  { id:"wataame",  s:"side", n:"わたあめ",       e:"☁️", g:2 },
  // ノーマルガチャ（g:1）
  { id:"hpin",     s:"head", n:"ハートのヘアピン", e:"💗", g:1 },
  { id:"bandaid",  s:"face", n:"ばんそうこう",   e:"🩹", g:1 },
  { id:"bandana",  s:"neck", n:"バンダナ",       e:"🧣", g:1 },
  { id:"onigiri",  s:"side", n:"おにぎり",       e:"🍙", g:1 },
  // 超レアガチャ（g:3）
  { id:"rhalo",    s:"head", n:"にじのわっか",   e:"🌈", g:3 },
  { id:"starglass",s:"face", n:"ほしのメガネ",   e:"⭐", g:3 },
  { id:"phoenix",  s:"back", n:"ほうおうのはね", e:"🔥", g:3 },
  { id:"lantern",  s:"side", n:"ほしのランタン", e:"🏮", g:3 },
  // ごうかアイテム（dx）
  { id:"goldacorn",s:"side", n:"きんのどんぐり", e:"✨", p:150, dx:1 },
  { id:"jewel",    s:"neck", n:"ほうせきのネックレス", e:"💠", p:200, dx:1 },
  { id:"starcrown",s:"head", n:"ほしのかんむり", e:"🌟", p:220, dx:1 },
  { id:"dragon",   s:"back", n:"ドラゴンのはね", e:"🐉", p:260, dx:1 },
  { id:"royal",    s:"back", n:"おうさまのマント", e:"👑", p:300, dx:1 }
];
const USLOTS = { head:"あたま", face:"かお", neck:"くび", back:"せなか", side:"もちもの" };
const itemOf = id => UITEMS.find(x => x.id === id);
const owned = it => !!(S.pet?.items?.[it.id] || (it.v && visitedCount() >= it.v));

/* きせかえの絵（うり坊の頭や首の位置に合わせて描く） */
function uriWearSvg(W, g){
  const { hx, hy, hrx, hry, top, ey, ex, e, by, brx, bry, sy, sn } = g, ny = hy + hry + 3, hb = top + hry * .32;
  const sx = Math.min(104, hx + brx + 3);
  const flower = (x, y, c, k = 1) => `<g transform="translate(${x} ${y}) scale(${k})">${[0, 72, 144, 216, 288].map(a => `<ellipse rx="3.2" ry="5" cy="-4.6" fill="${c}" transform="rotate(${a})"/>`).join("")}<circle r="2.6" fill="#fde68a"/></g>`;
  const star = (x, y, r, c) => `<path d="${Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r * .45 : r; return (i ? "L" : "M") + (x + Math.cos(a) * rr).toFixed(1) + " " + (y + Math.sin(a) * rr).toFixed(1); }).join("")}z" fill="${c}"/>`;
  const heart = (x, y, k, c, st) => `<path transform="translate(${x} ${y - 4 * k}) scale(${k})" d="M0 3C-1-1-6-1-6 2.5C-6 5.5-2 7.5 0 9.5C2 7.5 6 5.5 6 2.5C6-1 1-1 0 3z" fill="${c}" ${st || ""}/>`;
  const band = c => `<path d="M${hx - hrx * .86} ${hb + 4}Q${hx} ${top - 6} ${hx + hrx * .86} ${hb + 4}" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const arc = (n, f) => Array.from({ length: n }, (_, i) => { const t = i / (n - 1); return f(hx - hrx * .6 + t * hrx * 1.2, ny - 6 + Math.sin(t * Math.PI) * 9, i); }).join("");
  const wings = f => [-1, 1].map(d => `<g transform="translate(${hx + d * (brx - 3)} ${by - bry * .45}) scale(${d} 1)">${f}</g>`).join("");
  const H = {
    ribbon: `<g transform="translate(${hx + hrx * .5} ${top + 5}) rotate(15)"><path d="M0 0l-11-7v14zM0 0l11-7v14z" fill="#f4a3b8"/><circle r="3.4" fill="#e2809c"/></g>`,
    hairpin: star(hx + hrx * .55, top + 9, 7, "#f2c94c") + star(hx + hrx * .25, top + 3, 3.8, "#f9b6c7"),
    beret: `<path d="M${hx - hrx * .88} ${top + hry * .4}Q${hx - hrx * .95} ${top - 9} ${hx + 2} ${top - 8}Q${hx + hrx * 1.05} ${top - 7} ${hx + hrx * .88} ${top + hry * .4}Q${hx} ${top + hry * .16} ${hx - hrx * .88} ${top + hry * .4}z" fill="#9580d0"/><path d="M${hx + 1} ${top - 8}q1-5 5-6" stroke="#9580d0" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
    hachimaki: `<path d="M${hx - hrx * .98} ${hb + 7}Q${hx} ${hb - 1} ${hx + hrx * .98} ${hb + 7}l0 6Q${hx} ${hb + 5} ${hx - hrx * .98} ${hb + 13}z" fill="#fff" stroke="#e25b5b" stroke-width="1.2"/><circle cx="${hx}" cy="${hb + 6}" r="3.2" fill="#e25b5b"/><path d="M${hx + hrx * .95} ${hb + 9}l11-5l-3 7l6 3l-11-1z" fill="#fff" stroke="#e25b5b" stroke-width="1"/>`,
    nekomimi: [-1, 1].map(d => { const x = hx + d * hrx * .5; return `<path d="M${x - 8 * d} ${hb + 3}L${x - 2 * d} ${top - 13}L${x + 8 * d} ${hb - 1}z" fill="#8e7a8e"/><path d="M${x - 5 * d} ${hb + 1}L${x - 2 * d} ${top - 6}L${x + 4 * d} ${hb - 1}z" fill="#f4a3b8"/>`; }).join("") + band("#8e7a8e"),
    usamimi: [-1, 1].map(d => `<g transform="translate(${hx + d * hrx * .32} ${top - 10}) rotate(${d * 14})"><ellipse rx="5.5" ry="15" fill="#fff" stroke="#eadbe2" stroke-width="1"/><ellipse rx="2.8" ry="11" fill="#fbd3df"/></g>`).join("") + band("#fbd3df"),
    straw: `<ellipse cx="${hx}" cy="${top + hry * .3}" rx="${hrx * 1.32}" ry="6.5" fill="#efc96f"/><path d="M${hx - hrx * .62} ${top + hry * .3}Q${hx - hrx * .62} ${top - 13} ${hx} ${top - 13}Q${hx + hrx * .62} ${top - 13} ${hx + hrx * .62} ${top + hry * .3}z" fill="#f7e0a3"/><path d="M${hx - hrx * .62} ${top + hry * .3 - 2}h${hrx * 1.24}v-5h${-hrx * 1.24}z" fill="#f4a3b8"/>`,
    knit: `<path d="M${hx - hrx * .92} ${top + hry * .45}Q${hx - hrx} ${top - 11} ${hx} ${top - 11}Q${hx + hrx} ${top - 11} ${hx + hrx * .92} ${top + hry * .45}z" fill="#a6d9c4"/><path d="M${hx - hrx * .5} ${top - 4}v${hry * .4}M${hx} ${top - 9}v${hry * .5}M${hx + hrx * .5} ${top - 4}v${hry * .4}" stroke="#8fcbb2" stroke-width="2"/><rect x="${hx - hrx * .96}" y="${top + hry * .34}" width="${hrx * 1.92}" height="7" rx="3.5" fill="#6fbb9c"/><circle cx="${hx}" cy="${top - 12}" r="5.5" fill="#fff"/>`,
    chef: [-.4, 0, .4].map(k => `<circle cx="${hx + hrx * k}" cy="${top - 12 - (k ? 0 : 3)}" r="${hrx * .38}" fill="#fff" stroke="#eadbe2" stroke-width="1"/>`).join("") + `<rect x="${hx - hrx * .55}" y="${top - 14}" width="${hrx * 1.1}" height="12" fill="#fff"/><rect x="${hx - hrx * .62}" y="${top - 4}" width="${hrx * 1.24}" height="9" rx="2.5" fill="#fff" stroke="#eadbe2" stroke-width="1"/>`,
    headphone: `<path d="M${hx - hrx * .96} ${hy - 3}Q${hx - hrx} ${top - 9} ${hx} ${top - 9}Q${hx + hrx} ${top - 9} ${hx + hrx * .96} ${hy - 3}" stroke="#9580d0" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="${hx - hrx - 5}" y="${hy - 10}" width="10" height="16" rx="5" fill="#b8a6e6"/><rect x="${hx + hrx - 5}" y="${hy - 10}" width="10" height="16" rx="5" fill="#b8a6e6"/><circle cx="${hx + hrx}" cy="${hy - 2}" r="2" fill="#f4a3b8"/>`,
    witch: `<ellipse cx="${hx}" cy="${top + hry * .3}" rx="${hrx * 1.28}" ry="6" fill="#7d66b8"/><path d="M${hx - hrx * .6} ${top + hry * .3}L${hx + 2} ${top - 24}Q${hx + 10} ${top - 26} ${hx + 18} ${top - 18}Q${hx + 10} ${top - 20} ${hx + 7} ${top - 16}L${hx + hrx * .6} ${top + hry * .3}z" fill="#9580d0"/><rect x="${hx - hrx * .58}" y="${top + hry * .3 - 6}" width="${hrx * 1.16}" height="5" fill="#f2c94c"/>${star(hx + 3, top - 8, 3.5, "#fde68a")}`,
    tophat: `<rect x="${hx - hrx * .5}" y="${top - 19}" width="${hrx}" height="23" rx="2" fill="#4a3540"/><rect x="${hx - hrx * .5}" y="${top - 3}" width="${hrx}" height="4.5" fill="#e2809c"/><ellipse cx="${hx}" cy="${top + 4}" rx="${hrx * .88}" ry="4" fill="#4a3540"/>`,
    halo: `<ellipse cx="${hx}" cy="${top - 10}" rx="${hrx * .62}" ry="4.6" fill="none" stroke="#f2c94c" stroke-width="3.2"/><ellipse cx="${hx}" cy="${top - 10.5}" rx="${hrx * .62}" ry="4.2" fill="none" stroke="#fff3b0" stroke-width="1"/>`,
    crown: `<path d="M${hx - 14} ${top + 4}l-2-15l7 7l9-12l9 12l7-7l-2 15z" fill="#f2c94c" stroke="#d9a92c" stroke-width="1"/><circle cx="${hx}" cy="${top - 1}" r="2.6" fill="#f4a3b8"/><circle cx="${hx - 9}" cy="${top + 1}" r="1.8" fill="#9fd3ee"/><circle cx="${hx + 9}" cy="${top + 1}" r="1.8" fill="#a6d9c4"/>`,
    tsuno: [-1, 1].map(d => `<path d="M${hx + d * hrx * .35 - 4.5} ${top + 4}L${hx + d * hrx * .45} ${top - 13}L${hx + d * hrx * .35 + 4.5} ${top + 4}z" fill="#ffe08a" stroke="#e8b84a" stroke-width="1"/><path d="M${hx + d * hrx * .36 - 3} ${top - 1}h6M${hx + d * hrx * .4 - 1.6} ${top - 6}h3.4" stroke="#e8b84a" stroke-width="1.4"/>`).join(""),
    sakura: flower(hx - hrx * .72, top + 6, "#f9c4d2") + flower(hx - hrx * .3, top - 1, "#fbd3df"),
    kabuto: `<path d="M${hx - hrx * .95} ${hb + 4}L${hx} ${top - 15}L${hx + hrx * .95} ${hb + 4}z" fill="#8fb8e8"/><path d="M${hx - hrx * .98} ${hb + 3}h${hrx * 1.96}l-4 6h${-hrx * 1.96 + 8}z" fill="#6f9fd8"/><path d="M${hx - 6} ${top - 1}l-7-11M${hx + 6} ${top - 1}l7-11" stroke="#f2c94c" stroke-width="3" stroke-linecap="round"/>`,
    pumpkin: `<ellipse cx="${hx}" cy="${top + 1}" rx="${hrx * .72}" ry="${hry * .4}" fill="#f5a04a"/><path d="M${hx - hrx * .3} ${top - hry * .35}q-4 ${hry * .4} 0 ${hry * .75}M${hx + hrx * .3} ${top - hry * .35}q4 ${hry * .4} 0 ${hry * .75}" stroke="#e08a35" stroke-width="1.8" fill="none"/><path d="M${hx} ${top - hry * .38}q1-6 5-7" stroke="#6fbb9c" stroke-width="3" stroke-linecap="round" fill="none"/>`,
    santa: `<path d="M${hx - hrx * .88} ${top + hry * .38}Q${hx - hrx * .2} ${top - 24} ${hx + hrx * 1.05} ${top - 6}Q${hx + hrx * .55} ${top + 2} ${hx + hrx * .88} ${top + hry * .38}z" fill="#e25b5b"/><rect x="${hx - hrx * .95}" y="${top + hry * .3}" width="${hrx * 1.9}" height="7" rx="3.5" fill="#fff"/><circle cx="${hx + hrx * 1.05}" cy="${top - 6}" r="4.8" fill="#fff"/>`,
    tonakai: [-1, 1].map(d => { const x = hx + d * hrx * .42; return `<path d="M${x} ${top + 4}L${x + d * 3} ${top - 15}M${x + d * 1.4} ${top - 5}l${d * 8} -5M${x + d * 2.4} ${top - 11}l${d * -6} -5" stroke="#a5703f" stroke-width="3" stroke-linecap="round" fill="none"/>`; }).join(""),
    leaf: `<path d="M${hx} ${top + 2}q0-8 0-12" stroke="#6fbb9c" stroke-width="2.4" stroke-linecap="round"/><path d="M${hx} ${top - 8}q-11-7-15 3q10 5 15-3z" fill="#8fd1b3"/><path d="M${hx} ${top - 10}q10-9 15 0q-8 6-15 0z" fill="#a9ddc5"/>`,
    hpin: heart(hx + hrx * .55, top + 9, .8, "#f08a9a") + heart(hx + hrx * .22, top + 4, .5, "#f9b6c7"),
    rhalo: ["#f9b6c7", "#fde68a", "#a9ddc5", "#9fd3ee"].map((c, i) => `<ellipse cx="${hx}" cy="${top - 10 - i * 2.2}" rx="${hrx * .66 - i * 1.5}" ry="${4.6 - i * .5}" fill="none" stroke="${c}" stroke-width="2.4"/>`).join("") + star(hx + hrx * .6, top - 15, 3, "#fff3b0") + star(hx - hrx * .55, top - 6, 2.2, "#fff"),
    acornhat: `<path d="M${hx - hrx * .82} ${top + hry * .36}Q${hx - hrx * .88} ${top - 10} ${hx} ${top - 11}Q${hx + hrx * .88} ${top - 10} ${hx + hrx * .82} ${top + hry * .36}Q${hx} ${top + hry * .2} ${hx - hrx * .82} ${top + hry * .36}z" fill="#a5703f"/><path d="M${hx - hrx * .82} ${top + hry * .36}Q${hx} ${top + hry * .2} ${hx + hrx * .82} ${top + hry * .36}Q${hx} ${top + hry * .5} ${hx - hrx * .82} ${top + hry * .36}z" fill="#7e5230"/>${[-2, -1, 0, 1, 2].map(i => [0, 1].map(j => `<circle cx="${hx + i * hrx * .3}" cy="${top - 5 + j * 6 + Math.abs(i) * 1.6}" r="1.7" fill="#c99466"/>`).join("")).join("")}<path d="M${hx} ${top - 10}q1-6 6-8" stroke="#6e4b2b" stroke-width="3" stroke-linecap="round" fill="none"/>`,
    kinoko: `<path d="M${hx - hrx * 1.05} ${top + hry * .32}Q${hx - hrx} ${top - 18} ${hx} ${top - 18}Q${hx + hrx} ${top - 18} ${hx + hrx * 1.05} ${top + hry * .32}Q${hx} ${top + hry * .1} ${hx - hrx * 1.05} ${top + hry * .32}z" fill="#e86a5c"/><circle cx="${hx - hrx * .5}" cy="${top - 6}" r="4" fill="#fff"/><circle cx="${hx + hrx * .15}" cy="${top - 11}" r="3.4" fill="#fff"/><circle cx="${hx + hrx * .62}" cy="${top - 2}" r="3" fill="#fff"/><circle cx="${hx - hrx * .08}" cy="${top}" r="2.2" fill="#fff"/>`,
    unicorn: flower(hx - hrx * .55, top + 5, "#c7b8ef", .7) + flower(hx + hrx * .55, top + 5, "#f9b6c7", .7) + `<path d="M${hx - 5.5} ${top + 3}L${hx + 1} ${top - 23}L${hx + 6.5} ${top + 3}z" fill="#fde68a" stroke="#f2c94c" stroke-width="1"/><path d="M${hx - 4} ${top - 2}l9-3M${hx - 2.5} ${top - 9}l6.5-2.4M${hx - 1} ${top - 16}l4-1.6" stroke="#f2c94c" stroke-width="1.3"/>`,
    flcrown: band("#8fd1b3") + Array.from({ length: 5 }, (_, i) => { const t = i / 4; return flower(hx - hrx * .8 + t * hrx * 1.6, top + 5 - Math.sin(t * Math.PI) * 8, ["#f9b6c7", "#c7b8ef", "#fde68a", "#9fd3ee", "#f4a3b8"][i], .72); }).join(""),
    starcrown: `<path d="M${hx - 18} ${top + 5}l-3-18l9 8l12-15l12 15l9-8l-3 18z" fill="#f2c94c" stroke="#d9a92c" stroke-width="1"/><rect x="${hx - 18}" y="${top + 1}" width="36" height="5" rx="2" fill="#e8b84a"/>${[["#f4a3b8", -12], ["#9fd3ee", -4], ["#a6d9c4", 4], ["#c7b8ef", 12]].map(([c, x]) => `<circle cx="${hx + x}" cy="${top + 3.5}" r="1.8" fill="${c}"/>`).join("")}${star(hx - 21, top - 14, 4.5, "#fff3b0")}${star(hx, top - 22, 6, "#fffbe0")}${star(hx + 21, top - 14, 4.5, "#fff3b0")}`,
    tiara: `<path d="M${hx - 15} ${top + 6}q15-10 30 0" stroke="#d9d0f2" stroke-width="3" fill="none"/><path d="M${hx - 9} ${top + 1}l2-7l2 6zM${hx - 2} ${top - 1}l2-9l2 9zM${hx + 5} ${top}l2-7l2 7z" fill="#d9d0f2"/><circle cx="${hx}" cy="${top - 2}" r="2.4" fill="#f4a3b8"/><circle cx="${hx - 7}" cy="${top + 1}" r="1.6" fill="#9fd3ee"/><circle cx="${hx + 7}" cy="${top + 1}" r="1.6" fill="#9fd3ee"/>`
  };
  const r = e * 1.9 + 1;
  const F = {
    sticker: heart(hx - hrx * .72, sy - 2, .62, "#f08a9a") + star(hx + hrx * .72, sy - 1, 4.2, "#f2c94c"),
    glasses: `<g fill="rgba(255,255,255,.25)" stroke="#7a5a48" stroke-width="1.8"><circle cx="${hx - ex}" cy="${ey}" r="${r}"/><circle cx="${hx + ex}" cy="${ey}" r="${r}"/></g><path d="M${hx - ex + r} ${ey}h${2 * (ex - r)}" stroke="#7a5a48" stroke-width="1.8"/>`,
    hglasses: heart(hx - ex, ey + 1, r / 5.2, "rgba(244,163,184,.55)", 'stroke="#e2809c" stroke-width="1.2"') + heart(hx + ex, ey + 1, r / 5.2, "rgba(244,163,184,.55)", 'stroke="#e2809c" stroke-width="1.2"') + `<path d="M${hx - ex + r * .9} ${ey - 1}h${2 * (ex - r * .9)}" stroke="#e2809c" stroke-width="1.6"/>`,
    monocle: `<circle cx="${hx + ex}" cy="${ey}" r="${r}" fill="rgba(255,255,255,.25)" stroke="#d9a92c" stroke-width="1.8"/><path d="M${hx + ex + r * .7} ${ey + r * .7}q5 10-2 19" stroke="#d9a92c" stroke-width="1" fill="none"/>`,
    sun: `<rect x="${hx - ex - r - 1}" y="${ey - r * .8}" width="${2 * r + 2}" height="${r * 1.6}" rx="${r * .6}" fill="#4a3540"/><rect x="${hx + ex - r - 1}" y="${ey - r * .8}" width="${2 * r + 2}" height="${r * 1.6}" rx="${r * .6}" fill="#4a3540"/><path d="M${hx - ex + r} ${ey - 1}h${2 * (ex - r)}" stroke="#4a3540" stroke-width="2"/><path d="M${hx - ex - r * .5} ${ey - r * .3}l${r * .6} -${r * .3}M${hx + ex - r * .5} ${ey - r * .3}l${r * .6} -${r * .3}" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`,
    bandaid: `<g transform="translate(${hx - hrx * .72} ${sy - 3}) rotate(-25)"><rect x="-7.5" y="-3.2" width="15" height="6.4" rx="3.2" fill="#f6d2b0"/><rect x="-2.6" y="-3.2" width="5.2" height="6.4" fill="#ecc19c"/><circle cx="-1" cy="-1" r=".6" fill="#d9a88a"/><circle cx="1" cy="1" r=".6" fill="#d9a88a"/></g>`,
    starglass: [-1, 1].map(d => star(hx + d * ex, ey, r * 1.55, "#e8b84a") + star(hx + d * ex, ey, r * 1.2, "rgba(255,243,176,.8)")).join("") + `<path d="M${hx - ex + r} ${ey}h${2 * (ex - r)}" stroke="#e8b84a" stroke-width="1.8"/>`,
    clover: `<g transform="translate(${hx + hrx * .72} ${sy - 2}) scale(.55)">${[0, 90, 180, 270].map(a => `<path transform="rotate(${a})" d="M0 0C-5-3-6-9-2-9C0-9 0-7 0-6C0-7 0-9 2-9C6-9 5-3 0 0z" fill="#7cc4a4"/>`).join("")}<path d="M0 0q4 6 9 8" stroke="#5aa886" stroke-width="2" fill="none"/></g>`,
    guruguru: [-1, 1].map(d => { const cx = hx + d * ex; return `<circle cx="${cx}" cy="${ey}" r="${r + .6}" fill="rgba(255,255,255,.88)" stroke="#7a5a48" stroke-width="1.8"/><path d="M${cx} ${ey}m${r * .2} 0a${r * .2} ${r * .2} 0 0 1 ${-r * .4} 0a${r * .4} ${r * .4} 0 0 1 ${r * .8} 0a${r * .6} ${r * .6} 0 0 1 ${-r * 1.2} 0a${r * .8} ${r * .8} 0 0 1 ${r * 1.6} 0" stroke="#7a5a48" stroke-width="1.1" fill="none" stroke-linecap="round"/>`; }).join("") + `<path d="M${hx - ex + r} ${ey}h${2 * (ex - r)}" stroke="#7a5a48" stroke-width="1.8"/>`
  };
  // 鼻や口より手前に描くもの
  const FF = {
    mask: `<path d="M${hx - sn[0] - 6} ${sy - sn[1] - 2}h${2 * sn[0] + 12}v${sn[1] * 2 + 6}q${-(sn[0] + 6)} 7 ${-(2 * sn[0] + 12)} 0z" fill="#fff" stroke="#eadbe2" stroke-width="1"/><path d="M${hx - sn[0] - 6} ${sy - sn[1]}L${hx - hrx * .96} ${ey + 2}M${hx + sn[0] + 6} ${sy - sn[1]}L${hx + hrx * .96} ${ey + 2}" stroke="#eadbe2" stroke-width="1.2"/><path d="M${hx - sn[0] - 2} ${sy}h${2 * sn[0] + 4}M${hx - sn[0] - 2} ${sy + 4}h${2 * sn[0] + 4}" stroke="#f1e6ea" stroke-width="1"/>`,
    hige: `<path d="M${hx} ${sy + sn[1] - 1}q-7 6-15 1q5 1 7-3M${hx} ${sy + sn[1] - 1}q7 6 15 1q-5 1-7-3" stroke="#6a452e" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
  };
  const N = {
    bib: `<path d="M${hx - 12} ${ny - 5}h24q0 16-12 16q-12 0-12-16z" fill="#fff" stroke="#f4a3b8" stroke-width="1.5"/>${heart(hx, ny + 3, .55, "#f4a3b8")}`,
    bowtie: `<path d="M${hx} ${ny}l-11-7v14zM${hx} ${ny}l11-7v14z" fill="#e2809c"/><circle cx="${hx}" cy="${ny}" r="3.2" fill="#f4a3b8"/>`,
    bell: `<path d="M${hx - hrx * .62} ${ny - 6}q${hrx * .62} 9 ${hrx * 1.24} 0" stroke="#e2809c" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="${hx}" cy="${ny + 3}" r="5" fill="#f2c94c" stroke="#d9a92c" stroke-width="1"/><path d="M${hx - 3} ${ny + 4}h6" stroke="#b5871f" stroke-width="1.4"/>`,
    tie: `<path d="M${hx - 4} ${ny - 4}l-8 2l5 6zM${hx + 4} ${ny - 4}l8 2l-5 6z" fill="#fff"/><path d="M${hx - 4} ${ny - 4}h8l-2 5h-4z" fill="#6f9fd8"/><path d="M${hx - 2.5} ${ny + 1}h5l3 ${bry * .8}l-5.5 5l-5.5-5z" fill="#8fb8e8"/>`,
    muffler: `<path d="M${hx - hrx * .86} ${ny - 7}q${hrx * .86} 10 ${hrx * 1.72} 0l-1 8q${-hrx * .85} 10 ${-hrx * 1.7} 0z" fill="#e25b5b"/><path d="M${hx + hrx * .38} ${ny}l2 17h8l-2-18z" fill="#e25b5b"/><path d="M${hx + hrx * .38 + 2} ${ny + 15}h8" stroke="#fff" stroke-width="2" stroke-dasharray="2 1.5"/>`,
    lei: arc(8, (x, y, i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="${["#f9b6c7", "#fde68a", "#c7b8ef", "#a6d9c4"][i % 4]}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.2" fill="#fff"/>`),
    necklace: arc(9, (x, y) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="#fff" stroke="#eadbe2" stroke-width=".8"/>`) + heart(hx, ny + 6, .5, "#f4a3b8"),
    camera: `<path d="M${hx - hrx * .62} ${ny - 6}L${hx - 6} ${ny + 3}M${hx + hrx * .62} ${ny - 6}L${hx + 6} ${ny + 3}" stroke="#9580d0" stroke-width="2"/><rect x="${hx - 9}" y="${ny + 1}" width="18" height="12" rx="3" fill="#5d4e60"/><circle cx="${hx}" cy="${ny + 7}" r="3.6" fill="#b8a6e6" stroke="#fff" stroke-width="1.3"/><rect x="${hx + 3}" y="${ny - 1}" width="4" height="3" rx="1" fill="#5d4e60"/>`,
    omamori: `<path d="M${hx - hrx * .55} ${ny - 7}Q${hx} ${ny + 4} ${hx + hrx * .55} ${ny - 7}" stroke="#f2c94c" stroke-width="1.6" fill="none"/><rect x="${hx - 5.5}" y="${ny - 1}" width="11" height="14" rx="2.5" fill="#e25b5b"/><rect x="${hx - 3}" y="${ny + 3}" width="6" height="6" rx="1" fill="#f2c94c" opacity=".85"/>`,
    bandana: `<path d="M${hx - hrx * .78} ${ny - 6}q${hrx * .78} 8 ${hrx * 1.56} 0l${-hrx * .78} 17z" fill="#e25b5b"/>${[[-.4, -1], [0, 3], [.4, -1], [0, 8], [-.2, -3.5], [.2, -3.5]].map(([k, y]) => `<circle cx="${hx + k * hrx}" cy="${ny + y}" r="1.1" fill="#fff"/>`).join("")}`,
    scarf: `<path d="M${hx - hrx * .82} ${ny - 6}q${hrx * .82} 10 ${hrx * 1.64} 0l-1 7q${-hrx * .82} 9 ${-hrx * 1.62} 0z" fill="#9fd3ee"/><path d="M${hx - 8} ${ny + 2}l8 13l8-13z" fill="#8cc8e8"/>${[[-.6, -2], [-.25, 1], [.15, 1.5], [.5, -1], [0, 7]].map(([k, y]) => `<circle cx="${hx + k * hrx}" cy="${ny + y}" r="1.4" fill="#fff"/>`).join("")}`,
    jewel: arc(9, (x, y) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6" fill="#f2c94c"/>`) + `<path d="M${hx} ${ny + 1}l-6.5 6l6.5 9l6.5-9z" fill="#9fd3ee" stroke="#5fa9d6" stroke-width="1"/><path d="M${hx - 6.5} ${ny + 7}h13M${hx} ${ny + 1}v15" stroke="#d6efff" stroke-width=".8"/>${star(hx + 7, ny + 1, 2.4, "#fff")}`
  };
  const B = {
    cape: `<path d="M${hx - hrx * .7} ${ny - 4}Q${hx - brx - 12} ${by + bry * .6} ${hx - brx - 8} 111L${hx + brx + 8} 111Q${hx + brx + 12} ${by + bry * .6} ${hx + hrx * .7} ${ny - 4}z" fill="#e25b5b"/><path d="M${hx - brx - 8} 111L${hx + brx + 8} 111" stroke="#c94a4a" stroke-width="2"/>`,
    butterfly: wings(`<ellipse cx="11" cy="-7" rx="12" ry="8.5" fill="#c7b8ef" transform="rotate(-25 11 -7)"/><ellipse cx="9" cy="7" rx="7.5" ry="6" fill="#fbd3df" transform="rotate(20 9 7)"/><circle cx="12" cy="-8" r="2.6" fill="#fff" opacity=".7"/>`),
    angel: wings(`<path d="M0 0q15-15 26-6q-4 3-8 3q7 3 5 7q-5 1-9-1q2 5-2 7q-7-2-12-10z" fill="#fff" stroke="#eadbe2" stroke-width="1"/>`),
    bat: wings(`<path d="M0 0q9-13 24-11q-3 4-1 9q-5-1-7 3q-4-2-6 2q-3-3-10-3z" fill="#7d66b8"/>`),
    rainbow: wings(["#f9b6c7", "#ffe08a", "#a6d9c4", "#9fd3ee"].map((c, i) => `<path d="M0 ${i * 4}q${15 - i} ${-17 + i * 2} ${28 - i * 3} ${-8 + i * 2}" stroke="${c}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`).join("")),
    phoenix: wings(`<path d="M0 0q8-24 32-24q-6 5-4 9q-8-1-10 5q-6-3-9 3q-5-2-9 7z" fill="#f5a04a"/><path d="M0 0q10-18 30-22q-4 6-2 9q-8 0-12 6z" fill="#ffd27a"/><path d="M2 -2q10-14 26-20" stroke="#e86a5c" stroke-width="1.2" fill="none"/>`),
    ryukku: `<rect x="${hx - brx - 6}" y="${by - bry * .75}" width="${2 * brx + 12}" height="${bry * 1.5}" rx="11" fill="#e8a25a"/><rect x="${hx - brx - 6}" y="${by - bry * .1}" width="${2 * brx + 12}" height="5" fill="#d48a43"/><ellipse cx="${hx}" cy="${by - bry * .8}" rx="${brx + 9}" ry="6" fill="#a6d9c4"/><path d="M${hx - brx - 5} ${by - bry * .8}h${2 * brx + 10}" stroke="#8fcbb2" stroke-width="1.2"/>`,
    devil: wings(`<path d="M0 0q6-16 22-16q-4 5-2 9q-6-1-8 4q-4-3-7 1q-2-2-5 2z" fill="#5d4e60"/><path d="M2 -2q6-11 16-12" stroke="#9580d0" stroke-width="1.2" fill="none"/>`),
    dragon: wings(`<path d="M0 0q4-22 30-26q-3 7 0 12q-7-1-9 5q-5-3-8 3q-4-3-7 2q-3-2-6 4z" fill="#7cc4a4"/><path d="M0 0q8-16 30-26M2 -2l19-7M2 0l13 0" stroke="#5aa886" stroke-width="1.4" fill="none"/><circle cx="30" cy="-26" r="1.8" fill="#f2c94c"/>`),
    royal: `<path d="M${hx - hrx * .7} ${ny - 4}Q${hx - brx - 13} ${by + bry * .6} ${hx - brx - 9} 110L${hx + brx + 9} 110Q${hx + brx + 13} ${by + bry * .6} ${hx + hrx * .7} ${ny - 4}z" fill="#b33a5a"/><path d="M${hx - brx - 10} 108h${2 * brx + 20}v5h${-2 * brx - 20}z" fill="#fff"/>${Array.from({ length: 6 }, (_, i) => `<circle cx="${hx - brx - 4 + i * (2 * brx + 8) / 5}" cy="110.5" r="1" fill="#4a3540"/>`).join("")}<path d="M${hx - hrx * .72} ${ny - 5}q${hrx * .72} 8 ${hrx * 1.44} 0" stroke="#f2c94c" stroke-width="3" fill="none" stroke-linecap="round"/>`
  };
  const SIDE = {
    flag: `<path d="M${sx} ${by + 12}V${by - 24}" stroke="#a5703f" stroke-width="2" stroke-linecap="round"/><path d="M${sx} ${by - 24}l15 5l-15 6z" fill="#f4a3b8"/>${heart(sx + 5, by - 18, .35, "#fff")}`,
    ice: `<path d="M${sx - 5} ${by - 4}l5 16l5-16z" fill="#efc96f"/><path d="M${sx - 3} ${by - 1}l6 4M${sx - 4} ${by + 3}l7-4" stroke="#d9a94c" stroke-width=".8"/><circle cx="${sx}" cy="${by - 7}" r="6" fill="#fbd3df"/><circle cx="${sx}" cy="${by - 14}" r="5" fill="#bfe5d4"/><circle cx="${sx + 1}" cy="${by - 19.5}" r="2" fill="#e25b5b"/>`,
    bouquet: `<path d="M${sx - 6} ${by - 6}l6 18l6-18z" fill="#a6d9c4"/>${flower(sx - 4, by - 9, "#f9b6c7", .75)}${flower(sx + 4, by - 11, "#c7b8ef", .75)}${flower(sx, by - 16, "#fde68a", .7)}`,
    balloon: `<path d="M${hx + brx * .7} ${by - 4}Q${hx + brx + 10} ${by - 30} 103 37" stroke="#b8a6e6" stroke-width="1.2" fill="none"/><ellipse cx="103" cy="25" rx="9.5" ry="11.5" fill="#f4a3b8"/><ellipse cx="99.5" cy="20" rx="2.6" ry="3.6" fill="#fff" opacity=".6"/><path d="M101 36.5h4l-2 2.5z" fill="#e2809c"/>`,
    hballoon: `<path d="M${hx + brx * .7} ${by - 4}Q${hx + brx + 10} ${by - 30} 103 36" stroke="#b8a6e6" stroke-width="1.2" fill="none"/>${heart(103, 26, 1.7, "#f08a9a")}<ellipse cx="98.5" cy="22" rx="2" ry="3" fill="#fff" opacity=".6"/>`,
    uchiwa: `<path d="M${sx} ${by + 12}V${by - 6}" stroke="#a5703f" stroke-width="2.2" stroke-linecap="round"/><circle cx="${sx}" cy="${by - 14}" r="10" fill="#fff" stroke="#9fd3ee" stroke-width="1.5"/><path d="M${sx - 7} ${by - 12}q3-4 7 0t7 0" stroke="#9fd3ee" stroke-width="2" fill="none"/>${flower(sx + 2, by - 18, "#f9c4d2", .45)}`,
    wand: `<path d="M${sx - 2} ${by + 12}L${sx + 3} ${by - 14}" stroke="#c7b8ef" stroke-width="2.4" stroke-linecap="round"/>${star(sx + 4, by - 19, 8, "#f2c94c")}${star(sx - 7, by - 24, 2.5, "#fbcfe8")}${star(sx + 13, by - 8, 2, "#fde68a")}`,
    onigiri: `<path d="M${sx} ${by - 28}q3 0 11 15q2 5-3 5h-16q-5 0-3-5q8-15 11-15z" fill="#fff" stroke="#eadbe2" stroke-width="1"/><rect x="${sx - 6}" y="${by - 15}" width="12" height="7" rx="1" fill="#3f4a3c"/>`,
    lantern: `<path d="M${sx} ${by + 12}V${by - 6}" stroke="#a5703f" stroke-width="2" stroke-linecap="round"/><circle cx="${sx}" cy="${by - 16}" r="13" fill="#fff3b0" opacity=".45"/><rect x="${sx - 5}" y="${by - 28}" width="10" height="3" rx="1" fill="#d9a92c"/><rect x="${sx - 7.5}" y="${by - 25}" width="15" height="17" rx="4" fill="#fff6c8" stroke="#d9a92c" stroke-width="1.6"/>${star(sx, by - 16.5, 4.4, "#f2c94c")}`,
    watage: `<path d="M${sx} ${by + 12}Q${sx - 3} ${by - 6} ${sx + 2} ${by - 18}" stroke="#6fbb9c" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="${sx + 2}" cy="${by - 27}" r="11" fill="#fff" opacity=".5"/>${Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2, x = sx + 2 + Math.cos(a) * 10, y = by - 27 + Math.sin(a) * 10; return `<path d="M${sx + 2} ${by - 27}L${x.toFixed(1)} ${y.toFixed(1)}" stroke="#fff" stroke-width=".9"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6" fill="#fff"/>`; }).join("")}<circle cx="${sx + 2}" cy="${by - 27}" r="2" fill="#e8d9a6"/>`,
    candy: `<path d="M${sx} ${by + 12}V${by - 12}" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="${sx}" cy="${by - 20}" r="10" fill="#f9b6c7"/><path d="M${sx} ${by - 20}a1.6 1.6 0 0 1 3 0a3.4 3.4 0 0 1-6 .6a5.4 5.4 0 0 1 9-1a7.4 7.4 0 0 1-12 2" stroke="#e2809c" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M${sx} ${by - 9}l-5-3v6zM${sx} ${by - 9}l5-3v6z" fill="#9fd3ee"/>`,
    wataame: `<path d="M${sx} ${by + 12}V${by - 12}" stroke="#f3e2c7" stroke-width="2.4" stroke-linecap="round"/>${[[-5, -20, 7], [5, -21, 7], [0, -27, 8], [0, -15, 6], [-7, -27, 5], [7, -28, 5]].map(([x, y, r]) => `<circle cx="${sx + x}" cy="${by + y}" r="${r}" fill="#fbd3df"/>`).join("")}<ellipse cx="${sx - 3}" cy="${by - 29}" rx="3" ry="2" fill="#fff" opacity=".7"/>`,
    goldacorn: acornSvg(true).replace("<svg ", `<svg x="${sx - 10}" y="${by - 30}" width="20" height="24" `) + star(sx + 10, by - 30, 3, "#fff3b0") + star(sx - 10, by - 20, 2.2, "#fde68a")
  };
  return {
    back: (W.back && B[W.back]) || "",
    face: (W.face && F[W.face]) || "",
    front: ((W.face && FF[W.face]) || "") + ((W.neck && N[W.neck]) || "") + ((W.head && H[W.head]) || ""),
    side: (W.side && SIDE[W.side]) || ""
  };
}

