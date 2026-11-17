/* ===================== 共通の土台（動作）：おかね手帳・エンタメ管理で同じファイルを使う =====================
  アプリごとの設定は、このファイルより前に window.U_APP で渡す
    id   … アプリの名前（"okane" / "entame"）
    fb   … Firebase の設定（firebaseConfig）
    root … Firebase での保存場所。uid を受け取ってパスを返す関数（省略時は users/<uid>）
  U.esc(文字) … HTMLに入れる文字をエスケープ
  U.ls.get(キー) / U.ls.set(キー, 値) … 端末に覚える小さな設定（localStorage）
  U.copy(文字) … クリップボードにコピー（できたら true）
  U.toast(文, { html, undo, ms }) … 画面の下に短く通知
  U.store() … 保存先（Firebase）につなぐ。ログインしていなければログイン画面を出す。何度呼んでも接続は1回だけ
    返り値 { kind, db, uid, logout }
      kind … "fb"＝Firebase / "none"＝つながらない
      db   … doc(path) と collection(path) を持つ
      uid  … 利用者のID（つながらないときは null） */
const U = { app: Object.assign({ id: "app", fb: null, root: null }, window.U_APP || {}), FB_VER: "12.15.0" };
/* ---------- 表示（ライト／ダーク）：auto＝端末に合わせる。アプリごと・端末ごとに覚える ----------
   開いた瞬間に白く光らないよう、各アプリの index.html の head でも同じ処理を先に行う */
U.THEME_KEY = "u-theme:" + U.app.id;
U.THEME_NAME = { auto: "自動（端末に合わせる）", light: "ライト", dark: "ダーク" };
U.theme = () => {
  try {
    const v = localStorage.getItem(U.THEME_KEY);
    return v === "light" || v === "dark" ? v : "auto";
  } catch (_) {
    return "auto";
  }
};
U.applyTheme = (v = U.theme()) => {
  const r = document.documentElement;
  if (v === "auto") r.removeAttribute("data-theme");
  else r.setAttribute("data-theme", v);
  /* iPhoneの上の帯などの色も合わせる */
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    if (!m.dataset.orig) m.dataset.orig = m.content;
    m.content = v === "light" ? "#ffffff" : v === "dark" ? "#16181d" : m.dataset.orig;
  });
};
U.setTheme = v => {
  try {
    if (v === "auto") localStorage.removeItem(U.THEME_KEY);
    else localStorage.setItem(U.THEME_KEY, v);
  } catch (_) {}
  U.applyTheme(v);
  /* 表示の切り替えボタンや設定の印は、この知らせで描き直す */
  document.dispatchEvent(new Event("u-theme"));
};
U.applyTheme();
(() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  U.esc = esc;
  /* 検索用に文字をそろえる（大文字小文字・全角半角・カタカナ→ひらがな、記号や空白は無視） */
  U.norm = t =>
    String(t || "")
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[\s・、。!！?？〜~\-－]/g, "");

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

  /* ---------- Firebase ---------- */
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
      /* Googleログインの処理は4アプリ共通の shared/u-auth.js */
      try {
        if (!(await window.UAuth.google(auth, mod))) btn.disabled = false;
      } catch (e) {
        loginForm(auth, mod, `ログインできませんでした。もう一度お試しください。（${(e && e.code) || "error"}）`);
      }
    };
  }
  /* ---------- 保存と同期の見張り：共通の shared/u-sync.js（4アプリ共通）。U.sync は USync と同じもの ---------- */
  const SY = (U.sync = window.USync);
  const { track, listen } = SY;
  const wid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

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
    /* 端末内の控えは「1つのタブだけ」が使う。同じサイトの別アプリ（エンタメ管理・おかね手帳）や2つ目のタブは、
       控えを使わずメモリだけで動く（タブどうしで控えを取り合って、読み込みや保存が止まるのを防ぐ） */
    let fs;
    try {
      fs = F.initializeFirestore(app, {
        ignoreUndefinedProperties: true,
        localCache: F.persistentLocalCache({ tabManager: F.persistentSingleTabManager() }),
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

    /* 裏から戻ったとき・電波が戻ったときのつなぎ直しなどを取り付ける */
    SY.attach(F, fs, { id: U.app.id });

    const root = U.app.root ? U.app.root(user.uid) : `users/${user.uid}`;
    const snap = d => ({ id: d.id, exists: d.exists(), data: () => d.data() });
    const doc = path => {
      const full = `${root}/${path}`;
      const ref = F.doc(fs, full);
      return {
        id: ref.id,
        get: async () => snap(await F.getDoc(ref)),
        set: (data, opt) => track(full, !(opt && opt.merge), () => (opt ? F.setDoc(ref, data, opt) : F.setDoc(ref, data))),
        /* 渡した項目だけ書きかえる。{items:{id:中身}} なら items の中の id ごとに丸ごと入れ替え（null は削除の印として残す） */
        update: data => {
          const args = [];
          Object.entries(data).forEach(([k, v]) => {
            if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length)
              Object.entries(v).forEach(([k2, v2]) => args.push(new F.FieldPath(k, k2), v2));
            else args.push(new F.FieldPath(k), v);
          });
          if (!args.length) return Promise.resolve();
          return track(full, false, () =>
            F.updateDoc(ref, ...args).catch(e => {
              if (e && e.code === "not-found") return F.setDoc(ref, data, { merge: true });
              throw e;
            }),
          );
        },
        delete: () => track(full, true, () => F.deleteDoc(ref)),
        onSnapshot: (cb, err) => listen((ok, ng) => F.onSnapshot(ref, d => ok(snap(d)), ng), cb, err),
      };
    };
    const db = {
      doc,
      /* まとめ書き：[[パス, 中身], …] を1回の通信で書く（取り込み用。1回に500件まで） */
      setMany: list =>
        track(`batch-${wid()}`, false, () => {
          const b = F.writeBatch(fs);
          list.forEach(([path, data]) => b.set(F.doc(fs, `${root}/${path}`), data));
          return b.commit();
        }),
      collection: name => ({
        doc: id => doc(`${name}/${id}`),
        /* opt.meta＝true なら「端末に残っていた古いデータか（fromCache）」が変わったときも呼ぶ */
        onSnapshot: (cb, err, opt) =>
          listen(
            (ok, ng) =>
              F.onSnapshot(
                F.collection(fs, `${root}/${name}`),
                { includeMetadataChanges: !!(opt && opt.meta) },
                q => {
                  const docs = q.docs.map(snap);
                  ok({ docs, size: docs.length, empty: !docs.length, forEach: f => docs.forEach(f), fromCache: q.metadata.fromCache });
                },
                ng,
              ),
            cb,
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
      ms   … 出しておく時間（省略時は文の長さに合わせて 2.5〜6秒、undo つきは 8秒） */
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
    const len = (html ? sp.textContent : msg).length;
    toastT = setTimeout(U.toastClose, ms ?? (undo ? 8000 : Math.min(6000, Math.max(2500, len * 90))));
  };

  let conn = null;
  U.store = () =>
    conn ||
    (conn = (async () => {
      try {
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
      /* 自動で出る候補の一覧もしまっておく（1Password は候補を自動では開かなくなる）。もともと指定がある欄はそのまま */
      if (!el.hasAttribute("autocomplete")) el.setAttribute("autocomplete", "off");
    });
  };
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && pmMark(n)))).observe(document.documentElement, { childList: true, subtree: true });
  pmMark(document);
})();

/* ===== アプリ共通：折りたたみの印と、⠿を押さえて動かす並び替え（エンタメ管理・おかね手帳で共通） ===== */
/* ---------- 折りたたみの印：どこでも同じ「›」。たたんでいると右向き、開くと下向き（CSSで回す） ---------- */
const FOLD_IC = `<svg class="fic" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
/* ---------- 並び替え：⠿（data-grip="種類"）を押さえたまま上下に動かす。マウス・指どちらでも。どの画面も同じ動き ----------
   動かす行は data-sortrow、同じ親の中だけで動く。離したら SORT_DONE[種類](親, 行の並び) を呼ぶ */
const GRIP = kind => `<span class="mgrip" data-grip="${kind}" aria-hidden="true" title="押さえたまま上下に動かして並び替え">⠿</span>`;
const SORT_DONE = {};
let gDrag = null;
document.addEventListener("pointerdown", e => {
  const g = e.target.closest("[data-grip]");
  if (!g || e.button > 0) return;
  const row = g.closest("[data-sortrow]");
  if (!row) return;
  const box = row.parentElement;
  e.preventDefault();
  try {
    g.setPointerCapture(e.pointerId);
  } catch (_) {}
  gDrag = { row, box, kind: g.dataset.grip, sc: row.closest(".mlist") || row.closest(".sheet") };
  row.classList.add("dragging");
  box.classList.add("sorting");
});
document.addEventListener("pointermove", e => {
  if (!gDrag) return;
  const { row, box, sc } = gDrag;
  if (sc) {
    const r = sc.getBoundingClientRect();
    if (e.clientY < r.top + 40) sc.scrollTop -= 8;
    else if (e.clientY > r.bottom - 40) sc.scrollTop += 8;
  }
  const rows = [...box.children].filter(x => x.matches("[data-sortrow]") && x !== row);
  const next = rows.find(x => {
    const b = x.getBoundingClientRect();
    return e.clientY < b.top + b.height / 2;
  });
  /* 最後へ動かすときは、最後の行のすぐ後ろ（行のあとにあるボタンなどより前）に入れる */
  const ref = next || (rows.length ? rows[rows.length - 1].nextSibling : null);
  if (ref !== row && ref !== row.nextSibling) box.insertBefore(row, ref);
});
/* 離したあとに続けて来るクリックは捨てる（描き直しで消えた⠿へのクリックが「外を押した」扱いになり、編集が閉じてしまうため） */
let gripEat = 0;
document.addEventListener(
  "click",
  e => {
    if (!gripEat || Date.now() - gripEat > 150) return;
    gripEat = 0;
    e.stopImmediatePropagation();
    e.preventDefault();
  },
  true,
);
const gripEnd = () => {
  if (!gDrag) return;
  gripEat = Date.now();
  const { row, box, kind } = gDrag;
  row.classList.remove("dragging");
  box.classList.remove("sorting");
  gDrag = null;
  const fn = SORT_DONE[kind];
  if (fn) fn(box, [...box.children].filter(x => x.matches("[data-sortrow]")));
};
document.addEventListener("pointerup", gripEnd);
document.addEventListener("pointercancel", gripEnd);
