/* ===================== 共通の土台（動作）：おかね手帳・エンタメ管理で同じファイルを使う =====================
  アプリごとの設定は、このファイルより前に window.U_APP で渡す
    id   … アプリの名前（"okane" / "entame"）
    user … 利用者のIDを使うアプリは true（claude.ai で本人だけの保存場所 data/users/<id> を使うとき）
    fb   … Firebase の設定（firebaseConfig）。claude.ai の外で動かすときだけ入れる。無ければ null
    root … Firebase での保存場所。uid を受け取ってパスを返す関数（省略時は users/<uid>）
  U.esc(文字) … HTMLに入れる文字をエスケープ
  U.ls.get(キー) / U.ls.set(キー, 値) … 端末に覚える小さな設定（localStorage）
  U.copy(文字) … クリップボードにコピー（できたら true）
  U.toast(文, { html, undo, ms }) … 画面の下に短く通知
  U.store() … 保存先につなぐ。何度呼んでも接続は1回だけ
    返り値 { kind, db, uid, logout }
      kind … "db"＝claude.ai の保存先 / "fb"＝Firebase / "none"＝つながらない（この端末だけ）
      db   … doc(path) と collection(path) を持つ。どちらの保存先でも同じ書き方で使える
      uid  … 利用者のID（取れないときは null） */
const U = { app: Object.assign({ id: "app", user: false, fb: null, root: null }, window.U_APP || {}), FB_VER: "12.15.0" };
(() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  U.esc = esc;

  /* ---------- 端末に覚える小さな設定（localStorage に JSON で）。使えない端末では何もしない ---------- */
  U.ls = {
    get(k) {
      try {
        return JSON.parse(localStorage.getItem(k) || "null");
      } catch (e) {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch (e) {}
    },
  };

  /* ---------- 文字をコピー。iPhoneでも動くよう、まず選択してコピー → だめなら clipboard。できたら true ---------- */
  U.copy = async text => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {}
    ta.remove();
    if (ok) return true;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      return false;
    }
  };

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
  /* ログイン画面：Googleでログインのみ。ポップアップが使えないとき（ホーム画面から開いたとき等）は画面を切り替えてログイン */
  function loginForm(auth, mod, msg) {
    let host = document.getElementById("u-login");
    if (!host) {
      host = document.createElement("div");
      host.id = "u-login";
      host.className = "u-login";
      document.body.appendChild(host);
    }
    host.innerHTML = `<form><h3>ログイン</h3>
      <p>Googleアカウントでログインしてください。一度ログインすると、この端末では次からログイン不要です。</p>
      <button type="submit" class="u-google"><svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Googleでログイン</button>${msg ? `<p class="u-login-err" role="alert">${esc(msg)}</p>` : ""}</form>`;
    host.querySelector("form").onsubmit = async ev => {
      ev.preventDefault();
      const btn = host.querySelector("button");
      btn.disabled = true;
      const pv = new mod.GoogleAuthProvider();
      pv.setCustomParameters({ prompt: "select_account" });
      try {
        await mod.signInWithPopup(auth, pv);
      } catch (e) {
        const code = e && e.code;
        if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(code)) {
          try {
            await mod.signInWithRedirect(auth, pv);
            return;
          } catch (e2) {}
        }
        if (["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(code)) btn.disabled = false;
        else loginForm(auth, mod, `ログインできませんでした。もう一度お試しください。（${code || "error"}）`);
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
    /* 画面を切り替えてログインした後の戻り。失敗したときは理由を表示 */
    let redirErr = null;
    await Au.getRedirectResult(auth).catch(e => (redirErr = e));
    const user = await new Promise(res => {
      const off = Au.onAuthStateChanged(auth, u => {
        if (u) {
          off();
          res(u);
        } else loginForm(auth, Au, redirErr ? `ログインできませんでした。もう一度お試しください。（${redirErr.code || "error"}）` : "");
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

  /* ---------- パスワード管理アプリ（1Password・Bitwarden・LastPass など）の候補ボタンを、ログイン以外の入力欄では出さない ----------
     パスワード・メールアドレス・ユーザー名の欄（ログイン画面）はそのまま。画面を描き直して増えた入力欄にも付ける */
  const pmLogin = el => el.type === "password" || el.type === "email" || /username|password|email/.test(el.getAttribute("autocomplete") || "");
  const pmMark = root => {
    const l = root.matches && root.matches("input,textarea") ? [root] : [];
    if (root.querySelectorAll) l.push(...root.querySelectorAll("input,textarea"));
    l.forEach(el => {
      if (el.hasAttribute("data-1p-ignore") || pmLogin(el)) return;
      el.setAttribute("data-1p-ignore", "");
      el.setAttribute("data-lpignore", "true");
      el.setAttribute("data-bwignore", "");
      el.setAttribute("data-form-type", "other");
    });
  };
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && pmMark(n)))).observe(document.documentElement, { childList: true, subtree: true });
  pmMark(document);
})();
