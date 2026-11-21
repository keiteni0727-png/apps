"use strict";
/* ウリログ：シート（詳細・追加と編集・行った！・招待・設定）
   ファイルの分け方：core.js（共通の道具・状態）→ 各機能 → events.js（ボタン）→ boot.js（Firebase につないで起動）
   どのファイルの関数・変数も、ほかのファイルからそのまま使える（ふつうの <script> で順に読み込む） */
/* =============== シート：詳細 =============== */
function openDetail(id){
  const p = S.places.find(x => x.id === id); if (!p) return closeSheet();
  const c = iconOf(p), k = kindOf(p), v = votesOf(p), pu = partnerUid();
  const url = /^https?:\/\//i.test(p.url || "") ? p.url : "";
  openSheet(`
  <div class="detail" data-id="${p.id}">
    <h3><span></span><button class="x" data-a="close">×</button></h3>
    ${p.photo ? `<img class="dphoto" id="dphoto" src="${p.photo}" alt="" data-a="zoom">` : ""}
    <div class="head"><div class="cat" style="background:${c.c}">${c.e}</div><div><div class="ttl">${esc(p.title)}</div><div class="muted">${esc(c.n)}${p.visited ? ` ・ ${k.done}♪` : ""}</div></div></div>
    ${p.visited ? "" : `<div class="votes">
      <div class="vote ${v.includes(me()) ? "on" : ""}"><div class="ic">${v.includes(me()) ? "💗" : "🤍"}</div>${esc(nameOf(me()))}${v.includes(me()) ? `<div class="vn">♡ ${loveOf(p, me())}回</div>` : ""}</div>
      <div class="vote ${pu && v.includes(pu) ? "on" : ""}"><div class="ic">${pu && v.includes(pu) ? "💗" : "🤍"}</div>${pu ? esc(nameOf(pu)) : "（招待待ち）"}${pu && v.includes(pu) ? `<div class="vn">♡ ${loveOf(p, pu)}回</div>` : ""}</div>
    </div>`}
    <div class="kv">
      ${p.area ? `<div><b>エリア</b><span>${esc(p.area)}</span></div>` : ""}
      ${url ? `<div><b>リンク</b><span><a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a></span></div>` : ""}
      ${p.memo ? `<div><b>メモ</b><span>${esc(p.memo)}</span></div>` : ""}
      ${p.visited ? `<div><b>${k.done}日</b><span>${esc(fmtDate(p.visitedAt))}</span></div>${p.visitNote ? `<div><b>メモ</b><span>${esc(p.visitNote)}</span></div>` : ""}` : ""}
      <div><b>追加した人</b><span>${esc(nameOf(p.by))}</span></div>
    </div>
    ${p.visited ? notesBlock(p) : ""}
    ${p.visited
      ? `<button class="btn lav block" data-a="visitEdit" data-id="${p.id}">思い出を編集</button><div class="gap"></div>
         <button class="btn ghost block" data-a="unvisit" data-id="${p.id}">「まだ${k.not}」に戻す</button>`
      : `<button class="btn block" data-a="vote" data-id="${p.id}">${v.includes(me()) ? `♡ もっと${k.n}！（+1）` : `♡ ${k.n}！`}</button><div class="gap"></div>
         ${v.includes(me()) ? `<button class="linkbtn" style="display:block;margin:-2px auto 12px" data-a="voteReset" data-id="${p.id}">わたしの♡をリセット</button>` : ""}
         <button class="btn mint block" data-a="visit" data-id="${p.id}">${k.done}！</button><div class="gap"></div>
         <button class="btn lav block" data-a="dateAdd" data-pid="${p.id}">📅 デートの予定に入れる</button>`}
    <div class="gap"></div>
    <div class="row"><button class="btn ghost sm" style="flex:1" data-a="edit" data-id="${p.id}">編集</button><button class="btn danger sm" style="flex:1" data-a="del" data-id="${p.id}">削除</button></div>
  </div>`);
  if (p.photo) getDoc(doc(db, "rooms", S.roomId, "photos", p.id)).then(s => { const im = document.getElementById("dphoto"); if (s.exists() && im) im.src = s.data().img; }).catch(() => {});
}

/* =============== シート：追加・編集 =============== */
function openEdit(id){
  const p = id ? S.places.find(x => x.id === id) : null;
  let cat = p?.cat || (S.cat !== "all" ? S.cat : "cafe"), kind = p?.kind || (S.kind !== "all" ? S.kind : "go");
  const k0 = KINDS.find(x => x.id === kind);
  openSheet(`
  <h3>${p ? "編集" : "やりたいことリストに追加"}<button class="x" data-a="close">×</button></h3>
  <form id="pf">
    <div class="catpick">${KINDS.map(x => `<button type="button" class="${x.id === kind ? "on" : ""}" data-kind="${x.id}"><b>${x.e}</b>${x.n}</button>`).join("")}</div>
    <label class="f"><span id="pth">${k0.th} *</span><input class="in" name="title" maxlength="60" required value="${esc(p?.title)}" placeholder="${k0.ph}"></label>
    <div id="pcatw" ${kind === "go" ? "" : "hidden"}><span class="muted" style="display:block;margin:0 0 6px 4px;font-size:12px">カテゴリ</span>
    <div class="catpick">${CATS.map(c => `<button type="button" class="${c.id === cat ? "on" : ""}" data-cat="${c.id}"><b>${c.e}</b>${c.n}</button>`).join("")}</div></div>
    <label class="f" id="pareaw" ${kind === "go" || kind === "eat" ? "" : 'style="display:none"'}><span>エリア</span><input class="in" name="area" maxlength="40" value="${esc(p?.area)}" placeholder="例：岡崎・名古屋"></label>
    <label class="f"><span>リンク（お店のページやInstagramなど）</span><input class="in" name="url" type="url" maxlength="500" value="${esc(p?.url)}" placeholder="https://"></label>
    <label class="f"><span>メモ</span><textarea class="in" name="memo" maxlength="500" placeholder="例：パンケーキが有名！">${esc(p?.memo)}</textarea></label>
    ${p ? "" : `<label class="row" style="margin:0 4px 14px;font-size:14px"><input type="checkbox" name="love" checked style="width:18px;height:18px;accent-color:#e2809c"> わたしも「♡」を押しておく</label>`}
    <div class="err" id="perr"></div>
    <button class="btn block">${p ? "保存する" : "追加する"}</button>
  </form>`);
  const form = document.getElementById("pf");
  form.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => { cat = b.dataset.cat; form.querySelectorAll("[data-cat]").forEach(x => x.classList.toggle("on", x === b)); });
  form.querySelectorAll("[data-kind]").forEach(b => b.onclick = () => {
    kind = b.dataset.kind; const k = KINDS.find(x => x.id === kind);
    form.querySelectorAll("[data-kind]").forEach(x => x.classList.toggle("on", x === b));
    document.getElementById("pth").textContent = k.th + " *"; form.elements.title.placeholder = k.ph;
    document.getElementById("pcatw").hidden = kind !== "go"; document.getElementById("pareaw").style.display = kind === "go" || kind === "eat" ? "" : "none";
  });
  form.onsubmit = async ev => {
    ev.preventDefault();
    const f = new FormData(form);
    const data = {
      title: String(f.get("title")).trim().slice(0, 60), cat, kind,
      area: String(f.get("area") || "").trim().slice(0, 40),
      url: String(f.get("url") || "").trim().slice(0, 500),
      memo: String(f.get("memo") || "").trim().slice(0, 500),
      updatedAt: serverTimestamp()
    };
    if (!data.title) return;
    if (data.url && !/^https?:\/\//i.test(data.url)) return document.getElementById("perr").textContent = "リンクは https:// から始まるURLを入れてね";
    form.querySelector("button[type=submit],button:not([type])").disabled = true;
    try {
      if (p) await updateDoc(doc(db, "rooms", S.roomId, "places", p.id), data);
      else await addDoc(collection(db, "rooms", S.roomId, "places"), { ...data, by: me(), createdAt: serverTimestamp(), visited: false, votes: f.get("love") ? { [me()]: true } : {} });
      closeSheet(); toast(p ? "保存しました" : "追加しました♡");
    } catch (e) { document.getElementById("perr").textContent = "保存できませんでした（" + (e.code || e.message) + "）"; form.querySelector("button:not([type=button])").disabled = false; }
  };
}

/* =============== シート：行った！ =============== */
function openVisit(id){
  const p = S.places.find(x => x.id === id); if (!p) return;
  openSheet(`
  <h3>${p.visited ? "思い出を編集" : kindOf(p).done + "！"} 📷<button class="x" data-a="close">×</button></h3>
  <p class="muted" style="margin-top:-6px">${esc(p.title)}</p>
  <form id="vf">
    <label class="f"><span>${kindOf(p).done}日</span><input class="in" type="date" name="d" value="${esc(p.visitedAt || today())}" required></label>
    <label class="f"><span>わたしのひとこと（なくてもOK）</span><textarea class="in" name="n" maxlength="300" placeholder="例：また行きたい！">${esc(p.notes?.[me()]?.t || "")}</textarea></label>
    <span class="muted" style="display:block;margin:0 0 6px 4px;font-size:12px">写真（1枚・なくてもOK）</span>
    <div class="photopick">
      <div class="pv" id="pv" style="${p.photo ? `background-image:url('${p.photo}');font-size:0` : ""}">📷</div>
      <div>
        <label class="btn sub sm">写真をえらぶ<input type="file" accept="image/*" id="pfile" hidden></label>
        <div><button type="button" class="linkbtn" id="prm" ${p.photo ? "" : "hidden"}>写真をはずす</button></div>
      </div>
    </div>
    <div class="err" id="verr"></div>
    <button class="btn mint block">保存する</button>
  </form>`);
  let file = null, remove = false;
  const pv = document.getElementById("pv"), prm = document.getElementById("prm");
  document.getElementById("pfile").onchange = ev => {
    file = ev.target.files[0] || null; remove = false;
    if (file) { const u = URL.createObjectURL(file); pv.style.backgroundImage = `url('${u}')`; pv.style.fontSize = "0"; prm.hidden = false; }
  };
  prm.onclick = () => { file = null; remove = true; pv.style.backgroundImage = ""; pv.style.fontSize = ""; prm.hidden = true; };
  document.getElementById("vf").onsubmit = async ev => {
    ev.preventDefault();
    const f = new FormData(ev.target), btn = ev.target.querySelector("button.mint"); btn.disabled = true; btn.textContent = file ? "写真を保存中…" : "保存中…";
    try {
      const data = { visited: true, visitedAt: String(f.get("d")), updatedAt: serverTimestamp() };
      const nt = String(f.get("n") || "").trim().slice(0, 300), old = p.notes?.[me()]?.t || "";
      if (nt !== old) data["notes." + me()] = nt ? { t: nt, at: Date.now() } : deleteField();
      if (file) {
        const im = await loadImg(file);
        const full = shrink(im, 1280, 700000), thumb = shrink(im, 360, 45000);
        await setDoc(doc(db, "rooms", S.roomId, "photos", p.id), { img: full, by: me(), updatedAt: serverTimestamp() });
        data.photo = thumb;
      } else if (remove) {
        data.photo = deleteField();
        deleteDoc(doc(db, "rooms", S.roomId, "photos", p.id)).catch(() => {});
      }
      await updateDoc(doc(db, "rooms", S.roomId, "places", p.id), data);
      closeSheet(); toast(p.visited ? "保存しました" : "おもいでに追加しました📷");
    } catch (e) { document.getElementById("verr").textContent = "保存できませんでした（" + (e.code || e.message) + "）"; btn.disabled = false; btn.textContent = "保存する"; }
  };
}

/* =============== シート：招待（恋人のメールアドレスを登録） =============== */
function openInvite(){
  if (!S.room) return;
  if (isPaired()) { openSheet(`<h3>💞 ふたりで参加中<button class="x" data-a="close">×</button></h3><p>${esc(nameOf(me()))} と ${esc(nameOf(partnerUid()))} のルームです。このルームはふたりでいっぱいなので、ほかの人は参加できません。</p>`); return; }
  const pe = S.room.partnerEmail || "";
  openSheet(`
  <h3>💌 恋人を招待<button class="x" data-a="close">×</button></h3>
  <p class="muted" style="margin-top:-4px">恋人のメールアドレスを登録してね。恋人がそのメールアドレスでアプリに登録すると、このルームに参加できます。参加できるのは1人だけです。</p>
  <form id="ivf">
    <label class="f"><span>恋人のメールアドレス</span><input class="in" type="email" name="email" autocomplete="off" value="${esc(pe)}" placeholder="example@gmail.com" required></label>
    <div class="err" id="iverr"></div>
    <button class="btn ${pe ? "ghost" : ""} block">${pe ? "このメールアドレスに変更する" : "登録する"}</button>
  </form>
  ${pe ? `<div class="gap"></div>
  <div class="card" style="background:var(--mint-l);box-shadow:none;margin-bottom:10px">
    <h2 style="color:var(--mint-d)">✅ ${esc(pe)} を登録ずみ</h2>
    <p class="muted" style="margin:0">恋人に下のメッセージを送ってね。登録すると自動で招待が届きます。</p>
    <div class="linkbox" style="white-space:pre-wrap">${esc(inviteText(pe))}</div>
    ${navigator.share ? `<button class="btn block" data-a="share">LINEなどで送る</button><div class="gap"></div>` : ""}
    <button class="btn ${navigator.share ? "ghost" : ""} block" data-a="copy">メッセージをコピー</button>
  </div>
  <div style="text-align:center"><button class="linkbtn" data-a="uninvite">招待を取り消す</button></div>` : ""}`);
  document.getElementById("ivf").onsubmit = async ev => {
    ev.preventDefault();
    const email = normEmail(new FormData(ev.target).get("email"));
    const er = document.getElementById("iverr");
    if (!emailOk(email)) return er.textContent = "メールアドレスの形がちがうみたい";
    if (email === myEmail()) return er.textContent = "自分のメールアドレスは登録できないよ。恋人のメールアドレスを入れてね";
    ev.target.querySelector("button").disabled = true;
    try { await setPartnerEmail(email); toast("登録しました💌"); setTimeout(openInvite, 250); }
    catch (e) { er.textContent = "登録できませんでした（" + (e.code || e.message) + "）"; ev.target.querySelector("button").disabled = false; }
  };
}

/* 恋人のメールアドレスを登録・変更・取り消し（ルームと招待状を同時に書く） */
async function setPartnerEmail(email){
  const old = S.room.partnerEmail || "";
  const b = writeBatch(db);
  b.update(doc(db, "rooms", S.roomId), { partnerEmail: email });
  if (old && old !== email) b.delete(doc(db, "invites", old));
  if (email) b.set(doc(db, "invites", email), { roomId: S.roomId, fromName: S.profile.name, createdAt: serverTimestamp() });
  await b.commit();
}

/* =============== シート：設定 =============== */
function openSettings(){
  const paired = isPaired();
  openSheet(`
  <h3>設定<button class="x" data-a="close">×</button></h3>
  <div class="sec">ふたりのルーム</div>
  <div class="menu">
    <div class="itm">💞 メンバー<span class="r">${esc(nameOf(me()))}${paired ? " ・ " + esc(nameOf(partnerUid())) : "（招待待ち）"}</span></div>
    <button data-a="invite">💌 ${paired ? "招待の状態" : "恋人を招待する"}<span class="r">${paired ? "" : esc(S.room.partnerEmail || "")} ›</span></button>
  </div>
  <div class="sec">わたし</div>
  <div class="menu">
    <button data-a="rename">🙂 表示する名前<span class="r">${esc(S.profile.name)} ›</span></button>
    <button data-a="setpw">🔑 パスワードを設定<span class="r">${(S.user.providerData || []).some(p => p.providerId === "password") ? "" : "未設定 "}›</span></button>
    <div class="itm">✉️ メール<span class="r">${esc(S.user.email)}</span></div>
  </div>
  <div class="sec">そのほか</div>
  <div class="menu">
    <button data-a="logout">🚪 ログアウト</button>
    <button data-a="leave" style="color:#d46a7e">👋 ルームから抜ける</button>
  </div>
  <p class="muted" style="text-align:center">iPhoneでは、Safariの共有ボタン →「ホーム画面に追加」で、アプリのように使えます。</p>`);
}

function openRename(){
  openSheet(`
  <h3>表示する名前<button class="x" data-a="close">×</button></h3>
  <form id="rf"><label class="f"><span>なまえ</span><input class="in" name="name" maxlength="12" required value="${esc(S.profile.name)}"></label>
  <button class="btn block">保存する</button></form>`);
  document.getElementById("rf").onsubmit = async ev => {
    ev.preventDefault();
    const name = String(new FormData(ev.target).get("name")).trim().slice(0, 12); if (!name) return;
    try {
      await setDoc(doc(db, "users", me()), { name }, { merge: true });
      S.profile.name = name;
      if (S.roomId) await updateDoc(doc(db, "rooms", S.roomId), { ["names." + me()]: name });
      closeSheet(); toast("変更しました");
    } catch (e) { toast("保存できませんでした（" + (e.code || e.message) + "）"); }
  };
}

function openSetPw(){
  openSheet(`
  <h3>🔑 パスワードを設定<button class="x" data-a="close">×</button></h3>
  <p class="muted" style="margin-top:-4px">パスワードを作っておくと、ホーム画面のアプリでもすぐログインできます。メールアドレスは ${esc(S.user.email)} です。</p>
  <form id="pwf">
    <input type="email" name="u" autocomplete="username" value="${esc(S.user.email)}" hidden>
    <label class="f"><span>新しいパスワード（6文字以上）</span><input class="in" type="password" name="p1" autocomplete="new-password" minlength="6" required></label>
    <label class="f"><span>もう一度</span><input class="in" type="password" name="p2" autocomplete="new-password" minlength="6" required></label>
    <div class="err" id="pwerr"></div>
    <button class="btn block">設定する</button>
  </form>`);
  document.getElementById("pwf").onsubmit = async ev => {
    ev.preventDefault();
    const f = new FormData(ev.target), p1 = String(f.get("p1")), p2 = String(f.get("p2")), er = document.getElementById("pwerr");
    if (p1 !== p2) return er.textContent = "2つのパスワードがちがうみたい";
    const b = ev.target.querySelector("button"); b.disabled = true;
    try {
      await UAuth.setPassword(AU, auth.currentUser, p1);
      closeSheet(); toast("パスワードを設定しました🔑");
    } catch (e) {
      er.textContent = authMsg(e);
      b.disabled = false;
    }
  };
}

function openSince(){
  const v = S.room.since || "";
  openSheet(`
  <h3>💞 付き合った日<button class="x" data-a="close">×</button></h3>
  <p class="muted" style="margin-top:-4px">登録すると「付き合って○日目」と、次の記念日（100日ごと・○周年）まであと何日かが出ます。ふたりで同じ表示になります。</p>
  <form id="sf"><label class="f"><span>付き合った日</span><input class="in" type="date" name="d" value="${esc(v)}" max="${today()}" required></label>
  <button class="btn block">保存する</button></form>
  ${v ? `<div style="text-align:center;margin-top:8px"><button class="linkbtn" data-a="sinceClear">登録を消す</button></div>` : ""}`);
  document.getElementById("sf").onsubmit = async ev => {
    ev.preventDefault();
    const d = String(new FormData(ev.target).get("d")); if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    try { await updateDoc(doc(db, "rooms", S.roomId), { since: d }); closeSheet(); toast("登録しました💞"); }
    catch (e) { toast("保存できませんでした（" + (e.code || e.message) + "）"); }
  };
}

function confirmSheet(title, text, okLabel, act, danger = true){
  openSheet(`<h3>${title}<button class="x" data-a="close">×</button></h3><p>${text}</p>
  ${danger ? `<button class="btn ghost block" data-a="close">やめる</button><div class="gap"></div><button class="btn danger fill block" data-a="${act}">${okLabel}</button>`
           : `<button class="btn block" data-a="${act}">${okLabel}</button><div class="gap"></div><button class="btn ghost block" data-a="close">やめる</button>`}`);
}

/* ピンチで拡大されないようにする（ダブルタップはCSSの touch-action で止めている） */
["gesturestart", "gesturechange", "gestureend"].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
document.addEventListener("touchmove", e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

