"use strict";
/* ウリログ：Firebase につないで起動する（いちばん最後に読み込む）
   ファイルの分け方：core.js（共通の道具・状態）→ 各機能 → events.js（ボタン）→ boot.js（Firebase につないで起動）
   どのファイルの関数・変数も、ほかのファイルからそのまま使える（ふつうの <script> で順に読み込む） */
/* オフラインでも開けて、開くたびに最新の画面を取りにいく（sw.js） */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
(async () => {
  /* ---------- Firebaseの設定がまだのとき ---------- */
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "PASTE_HERE") {
    $app.innerHTML = `<div class="hero"><div class="mark">${IC.logo}</div><h1>ウリログ</h1><p>準備中です（Firebaseの設定がまだ入っていません）</p></div>`;
    return;
  }

  ({ initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`));
  AU = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`);
  ({ getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, isSignInWithEmailLink } = AU);
  FS = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  ({ getFirestore, doc, collection, getDoc, getDocs, serverTimestamp, arrayUnion, deleteField, increment } = FS);

  fbApp = initializeApp(firebaseConfig);
  auth = getAuth(fbApp);
  auth.languageCode = "ja";

  /* メールのリンクから開かれたとき：リンクを覚えておき、送ったアドレスが分かればそのままログイン */
  if (isSignInWithEmailLink(auth, location.href)) {
    LOGIN.link = location.href;
    const saved = localStorage.getItem("futari_email");
    if (saved) finishEmailLink(saved, LOGIN.link).catch(e => { toast(authMsg(e)); renderLogin(); });
  }
  db = getFirestore(fbApp);
  /* 読み込み・書き込みは共通の見張り役（shared/u-sync.js）を通す：止まったら自動でつなぎ直し、保存に失敗したら自動で保存し直す */
  ({ onSnapshot, setDoc, updateDoc, addDoc, deleteDoc, writeBatch } = USync.wrap(FS, db, { id: "futari", badge: true }));


  /* =============== ログインの状態が変わったとき =============== */
  onAuthStateChanged(auth, async user => {
    stopSubs(); closeSheet();
    S.user = user; S.profile = null; S.room = null; S.roomId = null; S.places = [];
    if (!user) return renderLogin();
    $app.innerHTML = `<div class="center"><div class="spinner"></div>よみこみ中…</div>`; $nav.innerHTML = "";
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      S.profile = snap.exists() ? snap.data() : {};
    } catch (e) { return renderFatal(e, "プロフィールの読みこみ"); }
    route();
  });
})();
