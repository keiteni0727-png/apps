"use strict";
/* ウリログ：メイン画面・ホーム・メニュー・マッチ
   ファイルの分け方：core.js（共通の道具・状態）→ 各機能 → events.js（ボタン）→ boot.js（Firebase につないで起動）
   どのファイルの関数・変数も、ほかのファイルからそのまま使える（ふつうの <script> で順に読み込む） */
/* =============== メイン画面 =============== */
function render(){
  if (!S.room) return;
  const qta = document.querySelector(".qaform textarea"), qkeep = qta ? { v: qta.value, f: document.activeElement === qta } : null;
  renderMain();
  uriCheckEvolve();
  otsuCheck();
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
    && (S.kind === "all" || kindOf(p).id === S.kind)
    && (S.kind !== "go" || S.cat === "all" || p.cat === S.cat)
    && (!q || [p.title, p.area, p.memo].join(" ").toLowerCase().includes(q))));
}

function placeCard(p){
  const c = iconOf(p), k = kindOf(p), v = votesOf(p), mine = v.includes(me()), pu = partnerUid();
  const both = isBoth(p);
  return `<div class="place ${both ? "both" : ""}" data-a="open" data-id="${p.id}">
    ${both ? `<span class="ribbon">ふたりとも${k.n}♡</span>` : ""}
    <div class="cat" style="background:${c.c}">${c.e}</div>
    <div class="main">
      <div class="t">${esc(p.title)}</div>
      <div class="s">${esc([p.area, c.n, S.kind === "all" && k.id === "go" ? "行きたい" : ""].filter(Boolean).join(" ・ "))}</div>
      <div class="who">${pu && v.includes(pu) ? `<span class="tag">${esc(nameOf(pu))}も${k.n}♡${loveOf(p, pu) > 1 ? "×" + loveOf(p, pu) : ""}</span>` : ""}${p.by && p.by !== me() && S.room.names?.[p.by] ? `<span class="tag lav">${esc(nameOf(p.by))}が追加</span>` : ""}</div>
    </div>
    <button class="heart ${mine ? "on" : ""}" data-a="vote" data-id="${p.id}" aria-label="${k.n}">${IC.heart}${mine ? `<span class="hcnt">${loveOf(p, me())}</span>` : ""}</button>
  </div>`;
}
function listHtml(arr){
  if (!arr.length) {
    if (!S.places.filter(p => !p.visited).length) return `<div class="empty"><div class="big">🗺️</div><p>まだありません</p><p>右下の＋ボタンから、行きたい場所・やりたいことを追加してね</p></div>`;
    if (S.who === "both" && !S.q && S.cat === "all") return `<div class="empty"><div class="big">💞</div><p>ふたりとも♡のものは、まだありません</p><p>♡ボタンを押してみてね</p></div>`;
    if (S.who === "new" && !S.q && S.cat === "all") return `<div class="empty"><div class="big">✨</div><p>まだ見ていない候補はありません</p></div>`;
    return `<div class="empty"><div class="big">🔍</div><p>見つかりませんでした</p></div>`;
  }
  return arr.map(placeCard).join("");
}


function viewList(){
  const arr = filtered();
  const whos = [["all", "すべて"], ["both", "ふたり♡"], ["mine", "わたしの♡"], ["new", "まだ見てない"]].filter(w => isPaired() || w[0] !== "both");
  return `${odSeg()}
  <div class="seg who">${whos.map(([id, n]) => `<button class="${S.who === id ? "on" : ""}" data-a="who" data-v="${id}">${n}</button>`).join("")}</div>
  <div class="search">${IC.search}<input class="in" id="q" placeholder="名前・エリア・メモでさがす" value="${esc(S.q)}"></div>
  <div class="chips">
    <button class="chip ${S.kind === "all" ? "on" : ""}" data-a="kind" data-v="all">すべて</button>
    ${KINDS.map(k => `<button class="chip ${S.kind === k.id ? "on" : ""}" data-a="kind" data-v="${k.id}">${k.e} ${k.n}</button>`).join("")}
  </div>
  ${S.kind === "go" ? `<div class="chips">
    <button class="chip ${S.cat === "all" ? "on" : ""}" data-a="cat" data-v="all">すべて</button>
    ${CATS.map(c => `<button class="chip ${S.cat === c.id ? "on" : ""}" data-a="cat" data-v="${c.id}">${c.e} ${c.n}</button>`).join("")}
  </div>` : ""}
  <div class="bar"><span class="count" id="cnt">${arr.length}件</span>
    <select data-a="sort"><option value="new" ${S.sort === "new" ? "selected" : ""}>新しい順</option><option value="love" ${S.sort === "love" ? "selected" : ""}>♡が多い順</option><option value="old" ${S.sort === "old" ? "selected" : ""}>古い順</option></select>
  </div>
  <div id="plist">${listHtml(arr)}</div>`;
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
const OD_TABS = ["cal", "memo", "list"];
const isOd = () => OD_TABS.includes(S.tab);
/* おでかけの上の切りかえ［よてい｜おもいで｜やりたいこと］ */
function odSeg(){
  const c = { list: S.places.filter(p => !p.visited).length, cal: S.dates.filter(d => d.date >= today()).length, memo: S.places.filter(p => p.visited).length };
  const nn = S.tab === "memo" ? 0 : notesNew().length;
  return `<div class="segx">${[["cal", "📅 よてい"], ["memo", "📷 おもいで"], ["list", "✅ やりたいこと"]].map(([id, n]) => `<button class="${S.tab === id ? "on" : ""}" data-a="tab" data-v="${id}">${n}<small>${c[id]}</small>${id === "memo" && nn ? `<i class="bdot"></i>` : ""}</button>`).join("")}</div>`;
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
    <p class="muted" style="margin:4px 0 0">${esc(nameOf(me()))}と${esc(nameOf(partnerUid()))}、ふたりとも♡のものが見つかったよ</p>
    ${ps.slice(0, 3).map(p => `<div class="pl">${iconOf(p).e} ${esc(p.title)}${p.area ? `<small>${esc(p.area)}</small>` : ""}</div>`).join("")}
    ${ps.length > 3 ? `<p class="muted">ほかに ${ps.length - 3}件</p>` : ""}
    <button class="btn block" data-a="fxclose">やったー！</button><div class="gap"></div>
    <button class="btn ghost block" data-a="fxopen" data-id="${ps[0].id}">くわしく見る</button>
  </div></div>`;
  ["💗","💞","💕","✨","🤍","💜"].forEach((e, i) => { for (let k = 0; k < 3; k++) { const d = document.createElement("div"); d.className = "fly"; d.textContent = e; d.style.left = Math.random() * 92 + "vw"; d.style.animationDelay = (i * 0.12 + k * 0.35) + "s"; fx.appendChild(d); } });
}

function viewMemo(){
  const arr = S.places.filter(p => p.visited).sort((a, b) => String(b.visitedAt || "").localeCompare(String(a.visitedAt || "")) || ms(b.updatedAt) - ms(a.updatedAt));
  if (!arr.length) return `<div class="empty"><div class="big">📷</div><p>行った場所・やったことがここにたまっていきます</p><p>やりたいことリストからひらいて「行った！」「やった！」を押してね</p></div>`;
  const prev = S.notesPrev ?? notesSeenAt(), pu = partnerUid();
  return `<div class="sec">ふたりの思い出 ・ ${arr.length}件</div><div class="memos">${arr.map(p => {
    const c = iconOf(p), ns = noteList(p);
    const isNew = pu && (p.notes?.[pu]?.at || 0) > prev;
    return `<div class="memo" data-a="open" data-id="${p.id}"><div class="ph ${p.photo ? "img" : ""}" style="background:${p.photo ? `url('${p.photo}')` : c.c}">${c.e}</div><div class="t">${esc(p.title)}${isNew ? `<span class="newmark">NEW</span>` : ""}</div><div class="d">${esc(fmtDate(p.visitedAt))}</div>${
      ns.length ? ns.map(([u, n]) => `<div class="nt">${avHtml(u)}<span>${esc(n.t)}</span></div>`).join("") : p.visitNote ? `<div class="n">${esc(p.visitNote)}</div>` : ""}</div>`;
  }).join("")}</div>`;
}

