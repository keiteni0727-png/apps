"use strict";
/* ウリログ：今日の質問・デートのしおり・お願いチケット・記念日・デートの予定
   ファイルの分け方：core.js（共通の道具・状態）→ 各機能 → events.js（ボタン）→ boot.js（Firebase につないで起動）
   どのファイルの関数・変数も、ほかのファイルからそのまま使える（ふつうの <script> で順に読み込む） */
/* =============== 今日の質問 =============== */
const QS = ["最近いちばんうれしかったことは？","無人島にひとつだけ持っていくなら？","相手のいちばん好きなところは？","いま一番食べたいものは？","子どものころの夢は？","生まれ変わったら何になりたい？","もし宝くじで1億円当たったら？","ふたりで行ってみたい国は？","最近ハマっていることは？","休みの日の理想の過ごし方は？","はじめて会ったときの印象は？","相手にしてもらってうれしかったことは？","好きな季節とその理由は？","最近見た夢を教えて","ふたりの思い出で一番好きなのは？","いま欲しいものは？","最後の晩餐に食べたいものは？","落ち込んだときの元気の出し方は？","自分の好きなところは？","10年後どうなっていたい？","もし1日だけ透明人間になれたら？","好きなおにぎりの具は？","最近笑ったことは？","ふたりで挑戦してみたいことは？","相手に似合いそうな服は？","好きな映画やドラマは？","小さいころの得意なことは？","自分を動物にたとえると？","相手を動物にたとえると？","朝型？夜型？","ストレス発散方法は？","もし時間を巻き戻せるなら、いつに戻りたい？","いまの自分に点数をつけると何点？","ふたりの家に絶対ほしいものは？","今年中にやりたいことは？","好きなお寿司のネタは？","つい買ってしまうものは？","尊敬している人は？","人生で一番おいしかったものは？","もし超能力がひとつ使えたら？","ふたりで住むならどんな街？","好きな言葉や座右の銘は？","実は苦手なものは？","相手に直してほしいところを、やさしく言うと？","いまの気分を色で表すと？","雨の日にしたいことは？","最近がんばったことは？","相手のクセで好きなものは？","行ってみたい温泉は？","小さな幸せを感じる瞬間は？","カラオケの十八番は？","もしお店を開くなら何のお店？","好きなお菓子は？","人に自慢できる特技は？","ふたりでおそろいにしたいものは？","理想のデートプランは？","初デートで覚えていることは？","最近ありがとうと思ったことは？","1週間休みがあったら何する？","好きなラーメンの味は？","学生時代の思い出は？","いま会いたい人は？","もしペットを飼うなら？","明日世界が終わるなら何をする？","好きな香りは？","最近買ってよかったものは？","ふたりの記念日にしたいことは？","子どものころ好きだったアニメは？","自分の口ぐせは？","相手の口ぐせは？","好きなパンは？","人生で一番びっくりしたことは？","ひとりの時間に何してる？","苦手な食べ物は？","相手の好きな表情は？","寝る前に必ずすることは？","好きな飲み物は？","挑戦してみたい習いごとは？","いまの仕事・勉強で楽しいことは？","ふたりで作ってみたい料理は？","旅行は計画派？気まま派？","好きな花は？","昔のあだ名は？","ドキッとした相手の行動は？","もし1日入れ替われたら何する？","好きな天気は？","宝物にしているものは？","最近知ってびっくりしたことは？","ふたりで行きたいテーマパークは？","相手に伝えたい「ありがとう」は？","自分の第一印象、よく何て言われる？","好きなアイスの味は？","クリスマスにしたいことは？","おうちデートで何したい？","相手の好きな食べ物、当てられる？","最近のマイブームは？","老後はどう過ごしたい？","好きな数字とその理由は？","ふたりのテーマソングを決めるなら？","今日あったいいことは？"];
function hashStr(t){ let h = 2166136261; for (const c of t) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
let qOrderCache = null;
function qOrder(){
  if (qOrderCache && qOrderCache.room === S.roomId) return qOrderCache.o;
  let seed = hashStr(S.roomId || "uri") || 1; const rnd = () => (seed = Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9 >>> 0) / 4294967296;
  const o = QS.map((_, i) => i); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  qOrderCache = { room: S.roomId, o }; return o;
}
function qOf(day){ const doc0 = S.qa[day]; if (doc0?.q) return doc0.q; const n = dayDiff("2026-01-01", day); const o = qOrder(); return QS[o[((n % o.length) + o.length) % o.length]]; }
const qaAns = (day, uid) => uid && S.qa[day]?.a?.[uid];
const rulesNote = what => `<div class="card" style="background:var(--butter-l)"><h2 style="color:#c79a2c">⚙️ ${what}はもう少しで使えます</h2><p class="muted" style="margin:0">Firebaseのルールを更新すると使えるようになります。</p></div>`;
function qaHtml(){
  if (S.needRules) return rulesNote("今日の質問");
  const day = today(), q = qOf(day), pu = partnerUid(), mine = qaAns(day, me()), his = qaAns(day, pu);
  const editing = !mine || S.qaEdit;
  const ansRow = (u, a, lock) => `<div class="ans">${avHtml(u)}<div class="nb"><b>${esc(nameOf(u))}</b>${a ? `<p class="${lock ? "lock" : ""}">${esc(lock ? "ないしょ　ないしょ　ないしょ" : a.t)}</p>` : `<p class="none">まだ答えていないみたい</p>`}</div></div>`;
  return `<div class="card qday ${!mine && his ? "wait" : ""}">
    <h2>💭 今日の質問</h2>
    <div class="q">${esc(q)}</div>
    ${!mine && his ? `<p class="hint">${esc(pName())}はもう答えたよ！答えると見られます</p>` : ""}
    ${editing ? `<form class="qaform"><textarea class="in" name="t" maxlength="200" placeholder="ここに答えを書いてね">${esc(mine?.t || "")}</textarea>
      <div class="row end" style="margin-top:8px">${mine ? `<button type="button" class="btn ghost sm" data-a="qaCancel">やめる</button>` : ""}<button class="btn sm">${mine ? "保存" : "答える"}</button></div></form>`
      : `<div class="ans">${avHtml(me())}<div class="nb"><b>${esc(nameOf(me()))}</b><p>${esc(mine.t)}</p></div><button class="ned" data-a="qaEdit" style="border:0;background:var(--pink-l);color:var(--pink-d);border-radius:99px;padding:4px 10px;font-size:12px;cursor:pointer">編集</button></div>`}
    ${pu ? (mine ? ansRow(pu, his, false) : his ? ansRow(pu, his, true) : "") : ""}
    <div class="foot"><span class="muted" style="font-size:12px">${mine && pu && !his ? `${esc(pName())}の答えを待っています` : ""}</span><button class="linkbtn" data-a="qaHist">これまでの質問 ›</button></div>
  </div>`;
}
function qaHistHtml(){
  const t = today(), pu = partnerUid();
  const days = Object.keys(S.qa).filter(d => d < t && (S.qa[d].a && Object.keys(S.qa[d].a).length)).sort().reverse();
  if (!days.length) return `<div class="empty" style="padding:24px 10px"><div class="big">💭</div><p>答えた質問がここにたまっていきます</p></div>`;
  return days.map(d => `<div class="qh"><div class="d">${esc(fmtShort(d))}</div><div class="q">${esc(qOf(d))}</div>
    ${[me(), pu].filter(Boolean).map(u => { const a = qaAns(d, u); return `<div class="qday"><div class="ans">${avHtml(u)}<div class="nb"><b>${esc(nameOf(u))}</b>${a ? `<p>${esc(a.t)}</p>` : `<p class="none">答えなかった日</p>`}</div></div></div>`; }).join("")}</div>`).join("");
}
function openQaHist(){ openSheet(`<h3>💭 これまでの質問<button class="x" data-a="close">×</button></h3><div id="qhist">${qaHistHtml()}</div>`); }
async function saveQa(text){
  const t = String(text || "").trim().slice(0, 200); if (!t) return;
  const day = today();
  await setDoc(doc(db, "rooms", S.roomId, "qa", day), { q: qOf(day), a: { [me()]: { t, at: Date.now() } } }, { merge: true });
  S.qa[day] = { ...(S.qa[day] || {}), q: qOf(day), a: { ...(S.qa[day]?.a || {}), [me()]: { t, at: Date.now() } } };
  S.qaEdit = false; render();
}

/* =============== デートのしおり =============== */
const hasShiori = d => (d.plan || []).length + (d.items || []).length > 0;
function shioriHtml(d){
  const plan = (d.plan || []).map((x, i) => ({ ...x, i })).sort((a, b) => (a.tm || "99").localeCompare(b.tm || "99"));
  const items = d.items || [], done = items.filter(x => x.done).length;
  return `<div class="shiori" id="shiori">
    <div class="ttl2">📝 しおり</div>
    <div class="sub">🕘 当日の流れ</div>
    ${plan.length ? plan.map(x => `<div class="prow"><span class="tm">${esc(x.tm || "")}</span><span class="tx">${esc(x.tx)}</span><button class="del" data-a="planDel" data-id="${d.id}" data-v="${x.i}" aria-label="消す">×</button></div>`).join("") : `<p class="muted" style="margin:4px 0;font-size:12px">例：10:00 名古屋駅に集合 → 11:00 水族館</p>`}
    <form class="sform" data-k="plan" data-id="${d.id}"><input class="in" type="time" name="tm"><input class="in t" name="tx" maxlength="60" placeholder="やること・行き先" required><button class="btn sub sm">追加</button></form>
    <div class="sub">🎒 持ち物${items.length ? `（${done}/${items.length}）` : ""}</div>
    ${items.map((x, i) => `<div class="prow ${x.done ? "done" : ""}"><input type="checkbox" data-a="itemToggle" data-id="${d.id}" data-v="${i}" ${x.done ? "checked" : ""}><span class="tx">${esc(x.tx)}</span><button class="del" data-a="itemDel" data-id="${d.id}" data-v="${i}" aria-label="消す">×</button></div>`).join("")}
    <form class="sform" data-k="items" data-id="${d.id}"><input class="in t" name="tx" maxlength="40" placeholder="例：モバイルバッテリー" required><button class="btn sub sm">追加</button></form>
  </div>`;
}
async function saveShiori(id, patch){
  const d = S.dates.find(x => x.id === id); if (!d) return;
  Object.assign(d, patch);
  const el = document.getElementById("shiori"); if (el) el.outerHTML = shioriHtml(d);
  try { await updateDoc(doc(db, "rooms", S.roomId, "dates", id), patch); }
  catch (e) { toast("保存できませんでした（" + (e.code || e.message) + "）"); }
}

/* =============== お願いチケット =============== */
const TKTS = [["💆", "肩もみ券"], ["🍜", "好きなごはんおごる券"], ["👑", "1日わがまま券"], ["🧹", "家事代わる券"], ["🎬", "映画えらぶ券"], ["🤗", "ぎゅー券"], ["🚗", "送り迎え券"], ["🍰", "スイーツ買ってくる券"], ["✏️", "自分でつくる"]];
const tkGot = () => S.tickets.filter(t => t.to === me());
const tkGave = () => S.tickets.filter(t => t.from === me());
const tkSeenKey = () => "uri_tk_seen_" + S.roomId;
function tkSeenAt(){ try { const v = localStorage.getItem(tkSeenKey()); if (v == null) { localStorage.setItem(tkSeenKey(), String(Date.now())); return Date.now(); } return Number(v) || 0; } catch { return Date.now(); } }
function ticketCard(t){
  const got = t.to === me();
  const who = got ? `${esc(nameOf(t.from))}から` : `${esc(nameOf(t.to))}へ`;
  const st = t.status === "done" ? "かなえてもらった♡" : t.status === "used" ? (got ? "使ったよ・かなえてもらうのを待ってる" : "使われたよ！") : (got ? "" : "まだ使われていません");
  let act = "";
  if (got && t.status === "new") act = `<button class="btn sm" data-a="tkUse" data-id="${t.id}">使う</button>`;
  if (!got && t.status === "used") act = `<button class="btn mint sm" data-a="tkDone" data-id="${t.id}">かなえた</button>`;
  if (!got && t.status === "new") act = `<button class="linkbtn" style="padding:0;font-size:12px" data-a="tkDel" data-id="${t.id}">取り消す</button>`;
  return `<div class="ticket ${t.status === "done" ? "done" : ""}"><span class="e">${esc(t.e || "🎟")}</span><div class="main"><div class="t">${esc(t.t)}</div><div class="s">${who}${st ? " ・ " + st : ""}</div>${t.msg ? `<div class="m">${esc(t.msg)}</div>` : ""}</div><div class="act">${act}</div></div>`;
}
function ticketListHtml(){
  const arr = (S.tkTab === "gave" ? tkGave() : tkGot()).slice().sort((a, b) => (a.status === "done") - (b.status === "done") || (b.at || 0) - (a.at || 0));
  if (!arr.length) return `<div class="empty" style="padding:24px 10px"><div class="big">🎟</div><p>${S.tkTab === "gave" ? "まだチケットを贈っていません" : "まだチケットをもらっていません"}</p></div>`;
  return arr.map(ticketCard).join("");
}
function openTickets(tab){
  if (tab) S.tkTab = tab;
  if (S.tkTab === "got") try { localStorage.setItem(tkSeenKey(), String(Date.now())); } catch {}
  openSheet(`<h3>🎟 お願いチケット<button class="x" data-a="close">×</button></h3>
  <div class="seg"><button class="${S.tkTab === "got" ? "on" : ""}" data-a="tkTab" data-v="got">もらった</button><button class="${S.tkTab === "gave" ? "on" : ""}" data-a="tkTab" data-v="gave">贈った</button></div>
  <div id="tklist">${ticketListHtml()}</div>
  <button class="btn block" data-a="tkNew" ${isPaired() ? "" : "disabled"}>＋ チケットを贈る</button>
  ${isPaired() ? "" : `<p class="muted" style="text-align:center">恋人が参加すると贈れます</p>`}`);
}
function openTicketNew(){
  let k = 0;
  openSheet(`<h3>🎟 チケットを贈る<button class="x" data-a="close">×</button></h3>
  <form id="tf">
    <div class="tpick">${TKTS.map(([e, n], i) => `<button type="button" data-i="${i}" class="${i === 0 ? "on" : ""}"><b>${e}</b>${n}</button>`).join("")}</div>
    <label class="f" id="tfc" style="display:none"><span>チケットの名前 *</span><input class="in" name="t" maxlength="30" placeholder="例：朝ごはん作る券"></label>
    <label class="f"><span>ひとことメッセージ（なくてもOK）</span><textarea class="in" name="m" maxlength="120" placeholder="例：いつもありがとう！"></textarea></label>
    <div class="err" id="terr"></div>
    <button class="btn block">${esc(pName())}に贈る</button>
  </form>`);
  const f = document.getElementById("tf"), c = document.getElementById("tfc");
  f.querySelectorAll(".tpick button").forEach(b => b.onclick = () => { k = +b.dataset.i; f.querySelectorAll(".tpick button").forEach(x => x.classList.toggle("on", x === b)); c.style.display = k === TKTS.length - 1 ? "" : "none"; if (k === TKTS.length - 1) f.t.focus(); });
  f.onsubmit = async ev => {
    ev.preventDefault();
    const custom = k === TKTS.length - 1, t = custom ? String(f.t.value || "").trim().slice(0, 30) : TKTS[k][1];
    if (!t) return document.getElementById("terr").textContent = "チケットの名前を入れてね";
    const btn = f.querySelector("button.btn.block"); btn.disabled = true;
    try {
      await addDoc(collection(db, "rooms", S.roomId, "tickets"), { from: me(), to: partnerUid(), t, e: custom ? "🎟" : TKTS[k][0], msg: String(f.m.value || "").trim().slice(0, 120), status: "new", at: Date.now() });
      toast("チケットを贈りました🎟"); openTickets("gave");
    } catch (e) { document.getElementById("terr").textContent = e.code === "permission-denied" ? "贈れませんでした。Firebaseのルール更新が必要です" : "贈れませんでした（" + (e.code || e.message) + "）"; btn.disabled = false; }
  };
}

/* =============== 記念日（誕生日など） =============== */
const AKINDS = [["bd", "🎂", "誕生日"], ["an", "💝", "記念日"], ["ot", "⭐", "その他"]];
const akindOf = k => AKINDS.find(x => x[0] === k) || AKINDS[2];
const annivs = () => Array.isArray(S.room?.annivs) ? S.room.annivs : [];
const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
function occ(d, y){ let md = d.slice(5); if (md === "02-29" && !isLeap(y)) md = "02-28"; return `${y}-${md}`; }
function nextOcc(d){ const t = today(), y = +t.slice(0, 4); const o = occ(d, y); return o >= t ? o : occ(d, y + 1); }
function annivSub(a, o){
  const n = +o.slice(0, 4) - +a.d.slice(0, 4);
  if (n <= 0) return akindOf(a.k)[2];
  return a.k === "bd" ? `${n}歳の誕生日` : a.k === "an" ? `${n}周年` : `${n}回目`;
}
function leftTag(o){ const left = dayDiff(today(), o); return `<span class="tag ${left === 0 ? "" : "lav"}">${left === 0 ? "今日🎉" : "あと" + left + "日"}</span>`; }
function annivItem(a, o){
  return `<div class="aitem" data-a="annivEdit" data-id="${a.id}"><div class="e">${akindOf(a.k)[1]}</div><div class="main"><div class="t">${esc(a.t)}</div><div class="s">${esc(fmtShort(o))} ・ ${esc(annivSub(a, o))}</div></div>${leftTag(o)}</div>`;
}
/* その日にある記念日（カレンダー用） */
function annivOn(d){
  const out = [], y = +d.slice(0, 4);
  annivs().forEach(a => { if (d > a.d && occ(a.d, y) === d) out.push({ id: a.id, e: akindOf(a.k)[1], t: a.t, s: annivSub(a, d) }); else if (d === a.d) out.push({ id: a.id, e: akindOf(a.k)[1], t: a.t, s: akindOf(a.k)[2] }); });
  const since = S.room?.since;
  if (since && d > since) {
    const n = y - +since.slice(0, 4);
    if (n >= 1 && occ(since, y) === d) out.push({ e: "💞", t: `付き合って${n}周年`, s: "付き合った日" });
    const dd = dayDiff(since, d) + 1;
    if (dd % 100 === 0) out.push({ e: "💞", t: `付き合って${dd.toLocaleString()}日目`, s: "付き合った日" });
  }
  return out;
}
function openAnnivs(){
  const list = annivs().map(a => ({ a, o: nextOcc(a.d) })).sort((x, y) => x.o.localeCompare(y.o));
  openSheet(`<h3>💝 記念日<button class="x" data-a="close">×</button></h3>
  <p class="muted" style="margin-top:-4px">登録した記念日は、毎年ホームとカレンダーに出ます。ふたりで同じ表示になります。</p>
  <div class="menu"><button data-a="since">💞 付き合った日<span class="r">${S.room.since ? esc(fmtDate(S.room.since)) : "未登録"} ›</span></button></div>
  ${list.length ? `<div class="card" style="padding:6px 16px">${list.map(x => annivItem(x.a, x.o)).join("")}</div>` : ""}
  <button class="btn block" data-a="annivAdd">＋ 記念日を追加</button>`);
}
function openAnnivEdit(id){
  const a = id ? annivs().find(x => x.id === id) : null;
  if (id && !a) return openAnnivs();
  let k = a?.k || "bd";
  const ph = { bd: "例：ゆいの誕生日", an: "例：はじめてのデート", ot: "例：ふたりで旅行した日" };
  openSheet(`<h3>${a ? "記念日を編集" : "記念日を追加"} 💝<button class="x" data-a="close">×</button></h3>
  <form id="af">
    <div class="akind">${AKINDS.map(([id2, e, n]) => `<button type="button" data-k="${id2}" class="${k === id2 ? "on" : ""}"><b>${e}</b>${n}</button>`).join("")}</div>
    <label class="f"><span>名前 *</span><input class="in" name="t" maxlength="40" required value="${esc(a?.t || "")}" placeholder="${ph[k]}"></label>
    <label class="f"><span>日にち *</span><input class="in" type="date" name="d" required value="${esc(a?.d || "")}" style="min-width:0;width:100%"></label>
    <p class="muted" style="margin:-4px 4px 12px;font-size:12px">誕生日は生まれた年で入れると「◯歳の誕生日」と出ます。</p>
    <div class="err" id="aerr"></div>
    <button class="btn block">保存する</button>
  </form>
  ${a ? `<div class="gap"></div><button class="btn danger block" data-a="annivDel" data-id="${a.id}">この記念日を消す</button>` : ""}`);
  const f = document.getElementById("af");
  f.querySelectorAll(".akind button").forEach(b => b.onclick = () => {
    k = b.dataset.k; f.querySelectorAll(".akind button").forEach(x => x.classList.toggle("on", x === b));
    f.t.placeholder = ph[k];
  });
  f.onsubmit = async ev => {
    ev.preventDefault();
    const t = String(f.t.value || "").trim().slice(0, 40), d = String(f.d.value || "");
    if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    const item = { id: a?.id || Math.random().toString(36).slice(2, 10), k, t, d };
    const arr = a ? annivs().map(x => x.id === a.id ? item : x) : [...annivs(), item];
    const btn = f.querySelector("button.btn.block"); btn.disabled = true;
    try { await updateDoc(doc(db, "rooms", S.roomId), { annivs: arr }); S.room.annivs = arr; toast(a ? "保存しました" : "登録しました🎂"); openAnnivs(); }
    catch (e) { document.getElementById("aerr").textContent = e.code === "permission-denied" ? "保存できませんでした。Firebaseのルール更新が必要です" : "保存できませんでした（" + (e.code || e.message) + "）"; btn.disabled = false; }
  };
}

/* =============== つぶやきの古いデータを消す（1回だけ） =============== */
async function cleanupPosts(roomId){
  const key = "uri_posts_cleaned_" + roomId;
  try { if (localStorage.getItem(key)) return; } catch {}
  try {
    let left = 0;
    for (const c of ["posts", "postPhotos"]) {
      const snap = await getDocs(collection(db, "rooms", roomId, c));
      for (const d of snap.docs) { try { await deleteDoc(d.ref); } catch { left++; } }
    }
    if (!left) try { localStorage.setItem(key, "1"); } catch {}
  } catch {}
}

/* =============== デートの予定・カウントダウン =============== */
const WD = "日月火水木金土";
const pad2 = n => String(n).padStart(2, "0");
const wdOf = s => new Date(ymd(s)).getUTCDay();
function fmtShort(s){ return `${+s.slice(5, 7)}月${+s.slice(8, 10)}日(${WD[wdOf(s)]})`; }
const dateTitle = d => (d.placeId && S.places.find(p => p.id === d.placeId)?.title) || d.title || "デート";
const dateSort = (a, b) => (a.date + (a.time || "99")).localeCompare(b.date + (b.time || "99"));
function nextDate(){ const t = today(); return S.dates.filter(d => d.date >= t).sort(dateSort)[0]; }
const extraNote = () => `<div class="card" style="background:var(--butter-l)"><h2 style="color:#c79a2c">⚙️ もう少しで使えます</h2><p class="muted" style="margin:0">Firebaseのルールを更新すると、デートの予定と相性テストが使えるようになります。</p></div>`;


function dateItem(d){
  const left = dayDiff(today(), d.date), p = d.placeId && S.places.find(x => x.id === d.placeId);
  return `<div class="ditem ${left < 0 ? "past" : ""}" data-a="dateOpen" data-id="${d.id}">
    <div class="dd"><small>${+d.date.slice(5, 7)}月</small><b>${+d.date.slice(8, 10)}</b><small>${WD[wdOf(d.date)]}</small></div>
    <div class="main"><div class="t">${p ? iconOf(p).e + " " : ""}${esc(dateTitle(d))}${hasShiori(d) ? `<span class="stag">📝</span>` : ""}</div><div class="s">${esc([d.time, d.memo].filter(Boolean).join(" ・ ")) || "&nbsp;"}</div></div>
    <span class="tag ${left < 0 ? "gray" : left === 0 ? "" : "lav"}">${left < 0 ? "おわり" : left === 0 ? "今日♡" : "あと" + left + "日"}</span>
  </div>`;
}

function viewCal(){
  if (S.extraErr) return extraNote();
  const t = today();
  if (S.calY == null) { S.calY = +t.slice(0, 4); S.calM = +t.slice(5, 7); }
  if (!S.calSel) S.calSel = t;
  const y = S.calY, m = S.calM, first = `${y}-${pad2(m)}-01`;
  const startW = wdOf(first), dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weeks = Math.ceil((startW + dim) / 7), start = addDays(first, -startW);
  const byDay = {}; S.dates.forEach(d => (byDay[d.date] ||= []).push(d));
  let cells = "";
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i), w = i % 7, inM = +d.slice(5, 7) === m;
    cells += `<button class="cal-d ${inM ? "" : "out"} ${d === t ? "today" : ""} ${d === S.calSel ? "sel" : ""} ${w === 0 ? "sun" : w === 6 ? "sat" : ""}" data-a="calday" data-v="${d}"><span class="n">${+d.slice(8, 10)}</span><span class="dots">${[...(byDay[d] || []).map(() => "<i></i>"), ...annivOn(d).map(() => `<i class="a"></i>`)].slice(0, 3).join("")}</span></button>`;
  }
  const selList = (byDay[S.calSel] || []).sort(dateSort), selAnn = annivOn(S.calSel);
  const upcoming = S.dates.filter(d => d.date >= t).sort(dateSort);
  return `<div class="card">
    <div class="cal-head"><button class="cal-nav" data-a="calmove" data-v="-1" aria-label="前の月">‹</button><b>${y}年 ${m}月</b><button class="cal-nav" data-a="calmove" data-v="1" aria-label="次の月">›</button></div>
    <div class="cal-grid">${[...WD].map((w, i) => `<div class="cal-w ${i === 0 ? "sun" : i === 6 ? "sat" : ""}">${w}</div>`).join("")}${cells}</div>
    ${y !== +t.slice(0, 4) || m !== +t.slice(5, 7) ? `<div style="text-align:center"><button class="linkbtn" data-a="caltoday">今日にもどる</button></div>` : ""}
  </div>
  <div class="sec">${esc(fmtShort(S.calSel))}${S.calSel === t ? "（今日）" : ""}</div>
  ${selAnn.map(x => `<div class="ditem" ${x.id ? `data-a="annivEdit" data-id="${x.id}"` : `data-a="since"`}><div class="dd" style="background:var(--lav-l);display:grid;place-items:center;font-size:24px;padding:8px 0">${x.e}</div><div class="main"><div class="t">${esc(x.t)}</div><div class="s">${esc(x.s)}</div></div></div>`).join("")}
  ${selList.length ? selList.map(dateItem).join("") : `<div class="card anniv-empty" style="box-shadow:none"><span class="muted">この日の予定はまだありません</span><button class="btn sub sm" data-a="dateAdd">予定を入れる</button></div>`}
  <div class="sec">これからの予定 ・ ${upcoming.length}件</div>
  ${upcoming.length ? upcoming.map(dateItem).join("") : `<div class="empty" style="padding:20px 16px"><div class="big">📅</div><p>まだ予定がありません</p><p>カレンダーの日にちをタップするか、右下の＋から入れてね</p></div>`}`;
}

function openDateEdit(id, pre = {}){
  if (S.extraErr) return openSheet(`<h3>📅 デートの予定<button class="x" data-a="close">×</button></h3>${extraNote()}`);
  const d = id ? S.dates.find(x => x.id === id) : null;
  if (id && !d) return closeSheet();
  const pid = d ? (d.placeId || "") : (pre.placeId || "");
  const opts = sortPlaces(S.places.filter(p => !p.visited || p.id === pid)).sort((a, b) => isBoth(b) - isBoth(a));
  const left = d ? dayDiff(today(), d.date) : null, p = d?.placeId && S.places.find(x => x.id === d.placeId);
  openSheet(`
  <h3>${d ? "デートの予定" : "デートの予定を入れる"} 📅<button class="x" data-a="close">×</button></h3>
  ${d && left <= 0 && p && !p.visited ? `<div class="card" style="background:var(--mint-l);box-shadow:none"><p style="margin:0 0 8px;font-size:13px">${left === 0 ? "今日のデート、楽しんでね♡" : "このデート、どうだった？"}</p><button class="btn mint block sm" data-a="visit" data-id="${p.id}">行った！思い出に残す 📷</button></div>` : ""}
  ${d ? shioriHtml(d) : `<p class="muted" style="margin:-6px 4px 12px;font-size:12px">予定を入れたあと、もう一度ひらくと📝しおり（当日の流れ・持ち物）を作れます。</p>`}
  ${d ? `<div class="sec" style="margin-top:4px">予定の内容</div>` : ""}
  <form id="df">
    <label class="f"><span>日にち *</span><input class="in" type="date" name="date" required value="${esc(d?.date || pre.date || today())}" style="min-width:0;width:100%"></label>
    <label class="f"><span>行き先</span><select class="in" name="pid"><option value="">✏️ 自分で入力する</option>${opts.map(o => `<option value="${o.id}" ${o.id === pid ? "selected" : ""}>${iconOf(o).e} ${esc(o.title)}${isBoth(o) ? " ♡" : ""}</option>`).join("")}</select></label>
    <label class="f" id="dtw" ${pid ? 'style="display:none"' : ""}><span>行き先・やること</span><input class="in" name="title" maxlength="60" value="${esc(pid ? "" : d?.title || "")}" placeholder="例：映画を見に行く"></label>
    <label class="f"><span>メモ</span><textarea class="in" name="memo" maxlength="300" placeholder="例：駅に10時集合">${esc(d?.memo)}</textarea></label>
    <div class="err" id="derr"></div>
    <button class="btn block">${d ? "保存する" : "予定を入れる"}</button>
  </form>
  ${d ? `<div class="gap"></div><button class="btn danger block sm" data-a="dateDel" data-id="${d.id}">この予定を消す</button>` : ""}`);
  const f = document.getElementById("df"), sel = f.querySelector("[name=pid]"), tw = document.getElementById("dtw");
  sel.onchange = () => { tw.style.display = sel.value ? "none" : ""; };
  f.onsubmit = async ev => {
    ev.preventDefault();
    const fd = new FormData(f), er = document.getElementById("derr");
    const date = String(fd.get("date")), placeId = String(fd.get("pid") || ""), pl = placeId && S.places.find(x => x.id === placeId);
    const title = pl ? pl.title : String(fd.get("title") || "").trim().slice(0, 60);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return er.textContent = "日にちを入れてね";
    if (!title) return er.textContent = "行き先をえらぶか、入力してね";
    const data = { date, time: d?.time || "", placeId, title, memo: String(fd.get("memo") || "").trim().slice(0, 300), updatedAt: serverTimestamp() };
    const b = f.querySelector("button"); b.disabled = true;
    try {
      if (d) await updateDoc(doc(db, "rooms", S.roomId, "dates", d.id), data);
      else await addDoc(collection(db, "rooms", S.roomId, "dates"), { ...data, by: me(), createdAt: serverTimestamp() });
      S.calSel = date; S.calY = +date.slice(0, 4); S.calM = +date.slice(5, 7);
      closeSheet(); toast(d ? "保存しました" : "予定を入れました📅"); render();
    } catch (e) { er.textContent = "保存できませんでした（" + (e.code || e.message) + "）"; b.disabled = false; }
  };
}

