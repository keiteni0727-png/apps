/* ===================== 共通の土台（動作）：おかね手帳・エンタメ管理で同じファイルを使う =====================
  アプリごとの設定は、このファイルより前に window.U_APP で渡す
    id   … アプリの名前（"okane" / "entame"）
    user … 利用者のIDを使うアプリは true（claude.ai で本人だけの保存場所 data/users/<id> を使うとき）
    fb   … Firebase の設定（firebaseConfig）。claude.ai の外で動かすときだけ入れる。無ければ null
    root … Firebase での保存場所。uid を受け取ってパスを返す関数（省略時は users/<uid>）
  U.store() … 保存先につなぐ。何度呼んでも接続は1回だけ
    返り値 { kind, db, uid, logout }
      kind … "db"＝claude.ai の保存先 / "fb"＝Firebase / "none"＝つながらない（この端末だけ）
      db   … doc(path) と collection(path) を持つ。どちらの保存先でも同じ書き方で使える
      uid  … 利用者のID（取れないときは null） */
const U = { app: Object.assign({ id: "app", user: false, fb: null, root: null }, window.U_APP || {}), FB_VER: "12.15.0" };
(() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  U.esc = esc;

  /* ---------- claude.ai の保存先 ---------- */
  async function claudeStore() {
    /* 利用者のIDは、使うアプリ（U_APP.user が true）だけ取りにいく */
    const [user, db] = await Promise.all([U.app.user ? claude.use("user").catch(() => null) : null, claude.use("db")]);
    let uid = null;
    try {
      uid = user ? await user.id() : null;
    } catch (e) {}
    return { kind: db ? "db" : "none", db: db || null, uid: uid || null, logout: null };
  }

  /* ---------- Firebase（自分のホスティングで動かすとき） ---------- */
  function loginForm(auth, mod, msg, email) {
    let host = document.getElementById("u-login");
    if (!host) {
      host = document.createElement("div");
      host.id = "u-login";
      host.className = "u-login";
      document.body.appendChild(host);
    }
    host.innerHTML = `<form autocomplete="on"><h3>ログイン</h3>
      <p>Firebaseに登録したメールアドレスとパスワードを入れてください。一度ログインすると、この端末では次から入力不要です。</p>
      <input type="email" autocomplete="username" placeholder="メールアドレス" required value="${esc(email || "")}">
      <input type="password" autocomplete="current-password" placeholder="パスワード" required>
      <button type="submit">ログイン</button>${msg ? `<p class="u-login-err" role="alert">${esc(msg)}</p>` : ""}</form>`;
    host.querySelector("form").onsubmit = async ev => {
      ev.preventDefault();
      const [em, pw] = host.querySelectorAll("input");
      host.querySelector("button").disabled = true;
      try {
        await mod.signInWithEmailAndPassword(auth, em.value.trim(), pw.value);
      } catch (e) {
        loginForm(auth, mod, "ログインできませんでした。メールアドレスとパスワードを確かめてください。", em.value.trim());
      }
    };
  }
  async function fbStore() {
    const base = `https://www.gstatic.com/firebasejs/${U.FB_VER}/`;
    const [A, Au, F] = await Promise.all([
      import(base + "firebase-app.js"),
      import(base + "firebase-auth.js"),
      import(base + "firebase-firestore.js"),
    ]);
    const app = A.initializeApp(U.app.fb);
    const auth = Au.getAuth(app);
    await Au.setPersistence(auth, Au.browserLocalPersistence).catch(() => {});
    let fs;
    try {
      fs = F.initializeFirestore(app, {
        ignoreUndefinedProperties: true,
        localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }),
      });
    } catch (e) {
      fs = F.getFirestore(app);
    }
    const user = await new Promise(res => {
      const off = Au.onAuthStateChanged(auth, u => {
        if (u) {
          off();
          res(u);
        } else loginForm(auth, Au);
      });
    });
    document.getElementById("u-login")?.remove();
    const root = U.app.root ? U.app.root(user.uid) : `users/${user.uid}`;
    const snap = d => ({ id: d.id, exists: d.exists(), data: () => d.data() });
    const doc = path => {
      const ref = F.doc(fs, `${root}/${path}`);
      return {
        id: ref.id,
        get: async () => snap(await F.getDoc(ref)),
        set: data => F.setDoc(ref, data),
        /* 渡した項目だけ書きかえる。{items:{id:中身}} なら items の中の id ごとに丸ごと入れ替え（null は削除の印として残す） */
        update: async data => {
          const args = [];
          Object.entries(data).forEach(([k, v]) => {
            if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length)
              Object.entries(v).forEach(([k2, v2]) => args.push(new F.FieldPath(k, k2), v2));
            else args.push(new F.FieldPath(k), v);
          });
          if (!args.length) return;
          try {
            await F.updateDoc(ref, ...args);
          } catch (e) {
            if (e && e.code === "not-found") await F.setDoc(ref, data, { merge: true });
            else throw e;
          }
        },
        delete: () => F.deleteDoc(ref),
        onSnapshot: (cb, err) => F.onSnapshot(ref, d => cb(snap(d)), err),
      };
    };
    const db = {
      doc,
      /* まとめ書き：[[パス, 中身], …] を1回の通信で書く（取り込み用。1回に500件まで） */
      setMany: list => {
        const b = F.writeBatch(fs);
        list.forEach(([path, data]) => b.set(F.doc(fs, `${root}/${path}`), data));
        return b.commit();
      },
      collection: name => ({
        doc: id => doc(`${name}/${id}`),
        onSnapshot: (cb, err) =>
          F.onSnapshot(
            F.collection(fs, `${root}/${name}`),
            q => {
              const docs = q.docs.map(snap);
              cb({ docs, size: docs.length, empty: !docs.length, forEach: f => docs.forEach(f) });
            },
            err,
          ),
      }),
    };
    return {
      kind: "fb",
      db,
      uid: user.uid,
      logout: async () => {
        await Au.signOut(auth);
        location.reload();
      },
    };
  }

  /* ---------- 通知：画面の下に短く出す ----------
    U.toast(文, { html, undo, ms })
      html … true なら文をHTMLとして入れる（呼ぶ側で esc 済みのものだけ）
      undo … 関数を渡すと「元に戻す」ボタンを付ける
      ms   … 出しておく時間（省略時は 2.5秒、undo つきは 8秒） */
  let toastT = null;
  U.toastClose = () => {
    clearTimeout(toastT);
    document.querySelectorAll(".u-toast").forEach(e => e.remove());
  };
  U.toast = (msg, { html = false, undo = null, ms } = {}) => {
    U.toastClose();
    const el = document.createElement("div");
    el.className = "u-toast" + (undo ? " undo" : "");
    el.setAttribute("role", "status");
    const sp = document.createElement("span");
    if (html) sp.innerHTML = msg;
    else sp.textContent = msg;
    el.append(sp);
    if (undo) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = "元に戻す";
      b.onclick = ev => {
        ev.stopPropagation();
        U.toastClose();
        undo();
      };
      el.append(b);
    }
    document.body.appendChild(el);
    toastT = setTimeout(U.toastClose, ms ?? (undo ? 8000 : 2500));
  };

  let conn = null;
  U.store = () =>
    conn ||
    (conn = (async () => {
      try {
        if (window.claude?.use) return await claudeStore();
        if (U.app.fb) return await fbStore();
      } catch (e) {
        return { kind: "none", db: null, uid: null, logout: null, error: e };
      }
      return { kind: "none", db: null, uid: null, logout: null };
    })());
})();
