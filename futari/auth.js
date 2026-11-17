"use strict";
/* ウリログ：ログイン・名前・ルームの作成と参加・ルームを開く
   ファイルの分け方：core.js（共通の道具・状態）→ 各機能 → events.js（ボタン）→ boot.js（Firebase につないで起動）
   どのファイルの関数・変数も、ほかのファイルからそのまま使える（ふつうの <script> で順に読み込む） */
/* 自分のメールアドレス宛ての招待があるか調べる */
async function findInvite(){
  if (!myEmail()) return null;
  try {
    const s = await getDoc(doc(db, "invites", myEmail()));
    return s.exists() ? s.data() : null;
  } catch { return null; }
}

async function route(){
  if (!S.profile?.name) return renderName();
  S.skipInvite = S.skipInvite || null;
  const inv = await findInvite();
  if (inv && inv.roomId && inv.roomId !== S.profile.roomId && S.skipInvite !== inv.roomId) return renderJoin(inv);
  if (!S.profile.roomId) return renderNoRoom();
  openRoom(S.profile.roomId);
}

function renderFatal(e, where){
  $nav.innerHTML = "";
  $app.innerHTML = `<div class="hero"><div class="mark">${IC.logo}</div><h1>ウリログ</h1></div>
  <div class="card"><h2>うまく読みこめませんでした</h2><p class="muted">${where ? esc(where) + "：" : ""}${esc(e?.code || e?.message || e)}</p>
  <button class="btn block" data-a="reload">もう一度ためす</button><div class="gap"></div><button class="btn ghost block" data-a="logout">ログアウト</button></div>`;
}

/* =============== ログイン画面 =============== */
function renderLogin(){
  $nav.innerHTML = "";
  const saved = localStorage.getItem("futari_email") || "";
  const reg = S.authMode === "signup";
  let mail;
  if (LOGIN.link) {
    mail = `<form id="finf">
      <h2>✉️ ログインを完了する</h2>
      <p class="muted" style="margin-top:0">リンクを送ったメールアドレスを入れてね</p>
      <label class="f"><input class="in" type="email" name="email" required value="${esc(saved)}" autocomplete="email"></label>
      <div class="err" id="merr"></div>
      <button class="btn block">ログイン</button></form>`;
  } else if (LOGIN.sent) {
    mail = `<h2>✉️ メールを送りました</h2>
      <p class="muted" style="margin-top:0"><b>${esc(saved)}</b> に届いたメールのリンクを押すとログインできます。届かないときは迷惑メールフォルダも見てね。</p>
      <details style="margin:4px 0 10px"><summary class="muted" style="cursor:pointer">ホーム画面のアプリから使っている場合</summary>
        <p class="muted">メールのリンクを押すとSafariが開きます。アプリのほうでログインしたいときは、メールのリンクを長押しして「リンクをコピー」し、下に貼り付けてね。</p>
        <form id="pastef"><input class="in" name="link" required placeholder="https://..." autocomplete="off"><div class="err" id="perr2"></div><button class="btn block">貼り付けてログイン</button></form>
      </details>
      <button class="btn ghost sm" data-a="resend">アドレスを入れ直す</button>`;
  } else {
    mail = `<form id="sendf">
      <h2>✉️ メールでログイン（パスワードなし）</h2>
      <p class="muted" style="margin-top:0">メールアドレスを入れると、ログイン用のリンクが届きます。はじめての人もここから登録できます。</p>
      <label class="f"><input class="in" type="email" name="email" required value="${esc(saved)}" placeholder="example@gmail.com" autocomplete="email"></label>
      <div class="err" id="merr"></div>
      <button class="btn block">ログイン用のメールを送る</button></form>`;
  }
  const pwForm = `
    <div class="seg"><button class="${reg ? "" : "on"}" data-a="mode" data-v="login">ログイン</button><button class="${reg ? "on" : ""}" data-a="mode" data-v="signup">新しく登録</button></div>
    <form id="authf">
      <label class="f"><span>メールアドレス</span><input class="in" type="email" name="email" autocomplete="username" required value="${esc(saved)}"></label>
      <label class="f"><span>パスワード${reg ? "（6文字以上）" : ""}</span><input class="in" type="password" name="pw" autocomplete="${reg ? "new-password" : "current-password"}" required minlength="6"></label>
      <div class="err" id="aerr"></div>
      <button class="btn ${STANDALONE ? "" : "sub"} block" type="submit">${reg ? "登録してはじめる" : "ログイン"}</button>
    </form>
    ${reg ? "" : `<div style="text-align:center;margin-top:8px"><button class="linkbtn" data-a="forgot">${STANDALONE ? "パスワードをまだ作っていない・忘れたとき" : "パスワードを忘れたとき"}</button></div>`}`;
  const hero = `<div class="hero"><div class="mark">${IC.logo}</div><h1>ウリログ</h1><p>ふたりの行きたい場所も、予定も、思い出も</p></div>`;
  const note = `<p class="muted" style="text-align:center;padding:0 12px">💌 恋人に招待された人は、恋人が登録したメールアドレス（またはそのGoogleアカウント）でログインしてね</p>`;
  if (STANDALONE) {
    // ホーム画面のアプリ：パスワードがいちばん確実（Safariとはログインが別で、メールのリンクはSafariが開いてしまうため）
    $app.innerHTML = `${hero}
    <div class="card">
      <h2>🔑 パスワードでログイン</h2>
      <p class="muted" style="margin-top:0">ホーム画面のアプリでは、パスワードでのログインがおすすめです。一度ログインすれば、次からはそのまま使えます。</p>
      ${pwForm}
      <p class="muted" style="margin:10px 0 0;font-size:12px">メールのリンクやGoogleで登録した人は、「パスワードをまだ作っていない」を押すと、パスワードを作るメールが届きます。メールで作ったら、ここに戻ってログインしてね。</p>
    </div>
    <details class="card"><summary class="muted" style="cursor:pointer">ほかの方法でログイン（Google・メールのリンク）</summary>
      <div class="gap"></div><button class="btn lav block" data-a="google">Googleでログイン</button>
      <div class="gap"></div>${mail}
    </details>${note}`;
    if (LOGIN.sent || LOGIN.link) document.querySelector("details.card").open = true;
  } else {
    $app.innerHTML = `${hero}
    ${IN_LINE ? `<div class="card" style="background:var(--butter-l)"><h2 style="color:#c79a2c">📱 Safariで開いてね</h2><p class="muted" style="margin:0">LINEの中ではログインが保存されにくいです。右下のメニューから「ブラウザで開く」を選んでね。</p></div>` : ""}
    <div class="card"><button class="btn lav block" data-a="google">Googleでログイン</button></div>
    <div class="card">${mail}</div>
    <details class="card"><summary class="muted" style="cursor:pointer">パスワードでログイン・登録する</summary>
      <div class="gap"></div>${pwForm}
    </details>${note}`;
    if (S.authMode === "signup" || S.openPw) document.querySelector("details.card").open = true;
  }

  document.getElementById("authf").onsubmit = async ev => {
    ev.preventDefault();
    const f = new FormData(ev.target), email = String(f.get("email")).trim(), pw = String(f.get("pw"));
    const b = ev.target.querySelector("button[type=submit]"); b.disabled = true;
    try {
      if (reg) await createUserWithEmailAndPassword(auth, email, pw);
      else await signInWithEmailAndPassword(auth, email, pw);
    } catch (e) { document.getElementById("aerr").textContent = authMsg(e); b.disabled = false; }
  };
  const sendf = document.getElementById("sendf");
  if (sendf) sendf.onsubmit = async ev => {
    ev.preventDefault();
    const email = normEmail(new FormData(sendf).get("email")), b = sendf.querySelector("button"); b.disabled = true;
    try {
      await UAuth.sendLink(auth, AU, email, appUrl(), "futari_email");
      LOGIN.sent = true; renderLogin();
    } catch (e) { document.getElementById("merr").textContent = authMsg(e); b.disabled = false; }
  };
  const finf = document.getElementById("finf");
  if (finf) finf.onsubmit = async ev => {
    ev.preventDefault(); const b = finf.querySelector("button"); b.disabled = true;
    try { await finishEmailLink(new FormData(finf).get("email"), LOGIN.link); }
    catch (e) { document.getElementById("merr").textContent = authMsg(e); b.disabled = false; }
  };
  const pastef = document.getElementById("pastef");
  if (pastef) pastef.onsubmit = async ev => {
    ev.preventDefault(); const link = String(new FormData(pastef).get("link")).trim(), er = document.getElementById("perr2");
    if (!isSignInWithEmailLink(auth, link)) return er.textContent = "メールのリンクではないみたい。もう一度コピーしてね";
    try { await finishEmailLink(saved, link); } catch (e) { er.textContent = authMsg(e); }
  };
}

/* =============== 名前を決める =============== */
function renderName(){
  $nav.innerHTML = "";
  $app.innerHTML = `
  <div class="hero"><div class="mark">${IC.logo}</div><h1>ようこそ</h1><p>アプリの中で表示する名前を決めてね</p></div>
  <div class="card"><form id="namef">
    <label class="f"><span>なまえ（ニックネームでOK）</span><input class="in" name="name" maxlength="12" required placeholder="例：けいすけ"></label>
    <div class="err" id="nerr"></div>
    <button class="btn block">つぎへ</button>
  </form></div>`;
  document.getElementById("namef").onsubmit = async ev => {
    ev.preventDefault();
    const name = String(new FormData(ev.target).get("name")).trim().slice(0, 12);
    if (!name) return;
    ev.target.querySelector("button").disabled = true;
    try {
      await setDoc(doc(db, "users", me()), { name }, { merge: true });
      S.profile = { ...S.profile, name };
      route();
    } catch (e) { document.getElementById("nerr").textContent = "保存できませんでした（" + (e.code || e.message) + "）"; ev.target.querySelector("button").disabled = false; }
  };
}

/* =============== ルームがまだないとき =============== */
function renderNoRoom(){
  $nav.innerHTML = "";
  $app.innerHTML = `
  <div class="hero"><div class="mark">${IC.logo}</div><h1 style="font-size:22px">${esc(S.profile.name)}さん、こんにちは</h1><p>ふたりの場所をつくろう</p></div>
  <div class="card">
    <h2>🏠 ふたりのルームを作る</h2>
    <p class="muted" style="margin-top:0">作ったあとに恋人のメールアドレスを登録すると、ふたりで同じリストを使えます。</p>
    <button class="btn block" data-a="createRoom">ルームを作る</button>
  </div>
  <div class="card">
    <h2>💌 恋人に招待してもらう人は</h2>
    <p class="muted" style="margin-top:0">恋人に、あなたのメールアドレス（${esc(myEmail())}）をアプリに登録してもらってね。登録してもらったら、下のボタンを押してください。</p>
    <button class="btn ghost block" data-a="recheck">招待が届いたか確認する</button>
  </div>
  <div style="text-align:center"><button class="linkbtn" data-a="logout">ログアウト</button></div>`;
}

async function createRoom(){
  if (S.busy) return; S.busy = true;
  try {
    const ref = doc(collection(db, "rooms"));
    await setDoc(ref, {
      name: "ウリログ", ownerUid: me(), members: [me()], names: { [me()]: S.profile.name },
      partnerEmail: "", createdAt: serverTimestamp()
    });
    await setDoc(doc(db, "users", me()), { roomId: ref.id }, { merge: true });
    S.profile.roomId = ref.id;
    openRoom(ref.id, true);
  } catch (e) { toast("作れませんでした（" + (e.code || e.message) + "）"); }
  S.busy = false;
}

/* =============== メールアドレス宛ての招待から参加する =============== */
function renderJoin(inv){
  S.invite = inv;
  $nav.innerHTML = "";
  const hasRoom = !!S.profile.roomId;
  $app.innerHTML = `
  <div class="hero"><div class="mark">${IC.logo}</div><h1>💌 招待が届いています</h1><p>${esc(inv.fromName || "恋人")}さんから、ふたりのルームへの招待です</p></div>
  <div class="card">
    ${hasRoom ? `<p class="muted" style="margin-top:0">いまのルームから移って参加します。いまのルームのリストは見られなくなります。</p>` : `<p class="muted" style="margin-top:0">参加すると、${esc(inv.fromName || "恋人")}さんと同じおでかけリストが使えるようになります。</p>`}
    <div class="err" id="jerr"></div>
    <button class="btn block" data-a="join">参加する</button>
    <div class="gap"></div>
    <button class="btn ghost block" data-a="joinCancel">あとで</button>
  </div>`;
}

async function joinRoom(){
  const inv = S.invite; if (!inv || S.busy) return; S.busy = true;
  const err = document.getElementById("jerr");
  try {
    await updateDoc(doc(db, "rooms", inv.roomId), { members: arrayUnion(me()), ["names." + me()]: S.profile.name });
    const old = S.profile.roomId;
    await setDoc(doc(db, "users", me()), { roomId: inv.roomId }, { merge: true });
    try { await deleteDoc(doc(db, "invites", myEmail())); } catch {}
    if (old && old !== inv.roomId) { try { await leaveRoomDoc(old); } catch {} }
    S.profile.roomId = inv.roomId; S.invite = null;
    toast("参加しました♡");
    openRoom(inv.roomId);
  } catch (e) {
    err.textContent = e.code === "permission-denied"
      ? "参加できませんでした。招待が取り消されたか、ルームがすでにふたりでいっぱいかもしれません。"
      : "参加できませんでした（" + (e.code || e.message) + "）";
  }
  S.busy = false;
}

async function leaveRoomDoc(roomId){
  const ref = doc(db, "rooms", roomId);
  const snap = await getDoc(ref); if (!snap.exists()) return;
  const r = snap.data();
  await updateDoc(ref, { members: (r.members || []).filter(u => u !== me()), ["names." + me()]: deleteField() });
}

/* =============== ルームを開く（リアルタイムで受け取る） =============== */
function openRoom(roomId, fresh){
  stopSubs();
  S.roomId = roomId; S.room = null; S.places = [];
  let gotRoom = false, gotPlaces = false;
  S.subs.push(onSnapshot(doc(db, "rooms", roomId), snap => {
    // ルームがない・メンバーでない：サーバーで確かめたときだけ外れる（端末に残っていた古い内容では判断しない）
    if (!snap.exists() || !(snap.data().members || []).includes(me())) return snap.metadata.fromCache ? undefined : lostRoom();
    S.room = snap.data(); gotRoom = true;
    if (gotPlaces) { render(); checkMatches(); }
    if (fresh) { fresh = false; setTimeout(openInvite, 300); }
  }, e => e.code === "permission-denied" ? lostRoom() : !S.room && renderFatal(e, "ルームの読みこみ"))); // 表示済みなら自動でつなぎ直すのを待つ
  S.subs.push(onSnapshot(collection(db, "rooms", roomId, "places"), snap => {
    S.places = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    gotPlaces = true;
    if (gotRoom) { render(); checkMatches(); }
  }, e => setTimeout(() => { if (S.roomId === roomId && !gotPlaces) renderFatal(e, "候補の読みこみ"); }, 800)));
  // デートの予定と相性テスト（ルールが未更新でも、ほかの機能は止めない）
  S.dates = []; S.quiz = {}; S.extraErr = null;
  const extraErr = e => { S.extraErr = e.code || e.message; if (gotRoom && gotPlaces) render(); };
  S.subs.push(onSnapshot(collection(db, "rooms", roomId, "dates"), snap => {
    S.dates = snap.docs.map(d => ({ id: d.id, ...d.data() })); S.extraErr = null;
    if (gotRoom && gotPlaces) render();
  }, extraErr));
  cleanupPosts(roomId);
  // 今日の質問・お願いチケット（ルールが未更新でも、ほかの機能は止めない）
  S.qa = {}; S.tickets = []; S.needRules = false;
  const needRules = e => { if (e.code === "permission-denied") { S.needRules = true; if (gotRoom && gotPlaces) render(); } };
  S.subs.push(onSnapshot(collection(db, "rooms", roomId, "qa"), snap => {
    S.qa = Object.fromEntries(snap.docs.map(d => [d.id, d.data()]));
    if (gotRoom && gotPlaces && !document.activeElement?.closest?.(".qaform")) render();
    if (document.getElementById("qhist")) document.getElementById("qhist").innerHTML = qaHistHtml();
  }, needRules));
  S.pet = null;
  S.subs.push(onSnapshot(doc(db, "rooms", roomId, "meta", "pet"), snap => {
    S.pet = snap.exists() ? snap.data() : {};
    uriBirth(roomId);
    uriCoopCheck();
    if (gotRoom && gotPlaces && !uriBusy && !document.activeElement?.closest?.(".qaform")) render();
  }, needRules));
  S.letters = [];
  S.subs.push(onSnapshot(collection(db, "rooms", roomId, "letters"), snap => {
    S.letters = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.at || 0) - (a.at || 0));
    if (gotRoom && gotPlaces && !uriBusy && !document.activeElement?.closest?.(".qaform")) render();
    if (document.getElementById("lhist")) document.getElementById("lhist").innerHTML = letterHistHtml();
    setTimeout(() => letterDeliver(), 700);
  }, needRules));
  S.subs.push(onSnapshot(collection(db, "rooms", roomId, "tickets"), snap => {
    S.tickets = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.at || 0) - (a.at || 0));
    if (gotRoom && gotPlaces && !document.activeElement?.closest?.(".qaform")) render();
    if (document.getElementById("tklist")) document.getElementById("tklist").innerHTML = ticketListHtml();
  }, needRules));
  S.subs.push(onSnapshot(collection(db, "rooms", roomId, "quiz"), snap => {
    S.quiz = Object.fromEntries(snap.docs.map(d => [d.id, d.data()]));
    if (gotRoom && gotPlaces) render();
    if (document.getElementById("qbody") && S.qv && S.qv.v !== "play") renderQuiz();
  }, extraErr));
}

async function lostRoom(){
  stopSubs(); closeSheet();
  try { await setDoc(doc(db, "users", me()), { roomId: deleteField() }, { merge: true }); } catch {}
  S.profile.roomId = null; S.room = null; S.roomId = null;
  toast("ルームから外れました");
  route();
}

