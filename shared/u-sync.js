/* ===================== 保存と同期の見張り役：4アプリ（エンタメ管理・おかね手帳・FitLife・ウリログ）で同じファイルを使う =====================
  ふつうの <script> で読み込む（window.USync）。Firebase を使うコードより前に置く。

  使い方
    エンタメ管理・おかね手帳 … u-core.js が中で使う（U.sync は USync と同じもの）
    FitLife・ウリログ        … const W = USync.wrap(Firestoreの関数一式, db, { id:"アプリ名", badge:true })
                               W.onSnapshot / W.setDoc / W.updateDoc / W.addDoc / W.deleteDoc / W.writeBatch / W.runTransaction を、
                               Firebase の同じ名前の関数と同じ書き方で使う

  やっていること
    ・読み込み（onSnapshot）が止まったら、少し待って自動でつなぎ直す（開き直さなくても戻る）
    ・書き込みが失敗したら、自動で保存し直す（同じ文書をあとから丸ごと書いたときは、古い失敗は捨てる）
      まとめ書き・トランザクションは、やり直すと二重になるおそれがあるので自動ではやり直さない（失敗を知らせるだけ）
    ・iPhoneで裏から戻ったとき・電波が戻ったとき・保存が20秒以上終わらないときは、通信をつなぎ直す
    ・端末内の保存場所が壊れたとき（iPhoneで長く裏にいたあとなど）は、未保存がなければ自動で開き直す
    ・badge:true のアプリは、保存できていない変更があるときだけ画面の下に小さく知らせる

  状態を見る
    USync.on(関数)      … 状態が変わるたびに呼ぶ（すぐ1回呼ぶ）。返り値で止める
    USync.view(同期済み) … 表示用の [種類 ok/busy/wait/err, 文字, 説明]
    USync.retry()       … 保存し直し・つなぎ直しを今すぐ行う */
window.USync = (() => {
  const SY = { pend: new Map(), fails: new Map(), lerr: new Map(), fatal: null, online: navigator.onLine !== false, at: 0, id: "app" };
  const subs = new Set();
  let emitQ = false;
  const emit = () => {
    if (emitQ) return;
    emitQ = true;
    queueMicrotask(() => {
      emitQ = false;
      subs.forEach(f => {
        try {
          f(SY);
        } catch (e) {
          console.warn(e);
        }
      });
    });
  };
  SY.on = f => {
    subs.add(f);
    f(SY);
    return () => subs.delete(f);
  };
  const hm = t => `${new Date(t).getHours()}:${String(new Date(t).getMinutes()).padStart(2, "0")}`;
  const failDocs = () => new Set([...SY.fails.values()].map(w => w.path)).size;
  SY.view = (synced = true) => {
    if (SY.fatal) return ["err", "接続エラー", "画面を開き直してください"];
    if (SY.fails.size) {
      const perm = [...SY.fails.values()].find(w => w.perm);
      return ["err", `未保存 ${failDocs()}件`, perm ? `保存できませんでした（${perm.code || "error"}）` : "自動で保存し直しています"];
    }
    if (SY.lerr.size) return ["err", "再接続中…", "読み込みが止まったので、自動でつなぎ直しています"];
    if (SY.pend.size) return SY.online ? ["busy", "保存中…", ""] : ["busy", "オフライン", "電波が戻ったら自動で保存します"];
    if (!SY.online) return ["wait", "オフライン", ""];
    if (!synced) return ["wait", "同期中…", "最新のデータを読み込んでいます"];
    return ["ok", "保存済み", SY.at ? `最後の保存 ${hm(SY.at)}` : ""];
  };

  /* 失敗の見分け：一時的なもの（電波など）は自動で保存し直す。端末内の保存場所が壊れたものは開き直す */
  const TEMP = new Set(["unavailable", "deadline-exceeded", "aborted", "internal", "unknown", "cancelled", "resource-exhausted"]);
  const BROKEN = /IndexedDB|INTERNAL ASSERTION|required state|refresh the (browser|page)|persistence layer/i;
  const isBroken = e => !!e && BROKEN.test(String(e.message || e));
  SY.isTemp = e => !!e && TEMP.has(e.code);
  const RETRY_S = [3, 10, 30, 60, 120];

  /* 画面の上に出す帯（開き直すボタンつき）・下に出す小さな知らせ。どのアプリでも同じ見た目（色は端末の明暗に合わせる） */
  const DARK = matchMedia("(prefers-color-scheme: dark)");
  const boxCss = top =>
    `position:fixed;left:50%;transform:translateX(-50%);${top ? "top:calc(10px + env(safe-area-inset-top,0px))" : "bottom:calc(84px + env(safe-area-inset-bottom,0px))"};z-index:2147483000;display:flex;align-items:center;gap:12px;width:max-content;max-width:calc(100% - 24px);border-radius:12px;padding:8px 8px 8px 16px;font:13px/1.5 system-ui,-apple-system,"Hiragino Sans",sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25);background:${DARK.matches ? "#f2f2f4" : "#26262b"};color:${DARK.matches ? "#1c1c1e" : "#fff"}`;
  const btnCss = "border:0;border-radius:8px;padding:6px 12px;font:700 12.5px/1.5 inherit;white-space:nowrap;cursor:pointer;background:#e8743b;color:#fff";
  function bar(id, top, text, label, onClick) {
    let el = document.getElementById(id);
    if (!text) return void (el && el.remove());
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.setAttribute("role", top ? "alert" : "status");
      el.innerHTML = `<span></span><button type="button"></button>`;
      document.body.appendChild(el);
    }
    el.style.cssText = boxCss(top);
    el.querySelector("span").textContent = text;
    const b = el.querySelector("button");
    b.style.cssText = btnCss;
    b.textContent = label;
    b.onclick = onClick;
  }
  function onBroken(e) {
    console.warn("保存場所のエラー", e);
    SY.fatal = e;
    emit();
    const RK = "u-reload:" + SY.id;
    let last = 0;
    try {
      last = +sessionStorage.getItem(RK) || 0;
    } catch (_) {}
    /* 未保存がなく、画面を見ているときだけ自動で開き直す（2分に1回まで） */
    if (!document.hidden && !SY.fails.size && Date.now() - last > 120000) {
      try {
        sessionStorage.setItem(RK, String(Date.now()));
      } catch (_) {}
      location.reload();
      return;
    }
    bar("u-syncerr", true, "保存先との接続が切れました。開き直すと直ります。", "開き直す", () => location.reload());
  }

  /* 書き込み1回分。full＝文書を丸ごと書く（set・delete）。丸ごと書いたら、それより前の同じ文書の失敗は不要
     once＝自動ではやり直さない（まとめ書き・トランザクション） */
  let wseq = 0;
  const lastFull = {};
  function attempt(w) {
    const tok = {};
    SY.pend.set(tok, Date.now());
    emit();
    return w.run().then(
      r => {
        SY.pend.delete(tok);
        SY.at = Date.now();
        clearTimeout(w.t);
        SY.fails.delete(w.id);
        if (w.full)
          SY.fails.forEach((f, k) => {
            if (f.path === w.path && k < w.id) {
              clearTimeout(f.t);
              SY.fails.delete(k);
            }
          });
        emit();
        return r;
      },
      e => {
        SY.pend.delete(tok);
        if (w.once || (w.full && lastFull[w.path] !== w.id)) SY.fails.delete(w.id); // やり直さないもの・あとから丸ごと書いたもの
        else {
          w.code = (e && e.code) || "error";
          w.perm = !TEMP.has(w.code);
          SY.fails.set(w.id, w);
          if (!w.perm && w.tries < RETRY_S.length) w.t = setTimeout(() => retryOne(w), RETRY_S[w.tries++] * 1000);
          console.warn("保存できませんでした", w.path, e);
        }
        if (isBroken(e)) onBroken(e);
        emit();
        throw e;
      },
    );
  }
  function retryOne(w) {
    if (!SY.fails.has(w.id)) return;
    clearTimeout(w.t);
    attempt(w).catch(() => {});
  }
  function track(path, full, run, once) {
    const w = { id: ++wseq, path, full, run, tries: 0, once: !!once };
    if (full) lastFull[path] = w.id;
    return attempt(w);
  }

  /* 読み込み（onSnapshot）を見張る。make(ok, ng) で読み込みを始めて、止める関数を返す。止まったら少し待ってつなぎ直す */
  const lsn = new Set();
  function listen(make, cb, err) {
    const L = { off: null, t: 0, n: 0, dead: false };
    L.start = () => {
      clearTimeout(L.t);
      if (L.dead) return;
      try {
        L.off && L.off();
      } catch (_) {}
      L.off = make(
        s => {
          L.n = 0;
          if (SY.lerr.delete(L)) emit();
          if (cb) cb(s);
        },
        e => {
          L.off = null;
          SY.lerr.set(L, e);
          emit();
          console.warn("読み込みが止まりました", e);
          if (err) err(e);
          if (isBroken(e)) onBroken(e);
          if (!L.dead) L.t = setTimeout(L.start, [2, 5, 15, 30, 60][Math.min(L.n++, 4)] * 1000);
        },
      );
    };
    lsn.add(L);
    L.start();
    return () => {
      L.dead = true;
      clearTimeout(L.t);
      lsn.delete(L);
      if (SY.lerr.delete(L)) emit();
      try {
        L.off && L.off();
      } catch (_) {}
    };
  }
  /* 今すぐやり直す：止まった読み込みをつなぎ直し、保存できなかったものを保存し直す（all＝あきらめたものも） */
  function redo(all) {
    lsn.forEach(L => SY.lerr.has(L) && L.start());
    SY.fails.forEach(w => (all || !w.perm) && ((w.tries = Math.min(w.tries, RETRY_S.length - 1)), retryOne(w)));
  }
  let kick = () => {};
  SY.retry = () => {
    kick(true);
    redo(true);
  };

  /* Firestore に取り付ける（1回だけ）：裏から戻ったとき・電波が戻ったとき・保存が終わらないときに通信をつなぎ直す */
  let attached = false;
  function attach(F, fs, opt) {
    if (opt && opt.id) SY.id = opt.id;
    if (attached) return;
    attached = true;
    let kickAt = 0;
    kick = async force => {
      if (!force && Date.now() - kickAt < 15000) return;
      kickAt = Date.now();
      try {
        await F.disableNetwork(fs);
      } catch (_) {}
      try {
        await F.enableNetwork(fs);
      } catch (_) {}
    };
    let hiddenAt = 0;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) return void (hiddenAt = Date.now());
      if (hiddenAt && Date.now() - hiddenAt > 20000) kick();
      redo(false);
    });
    addEventListener("online", () => {
      SY.online = true;
      emit();
      F.enableNetwork(fs).catch(() => {});
      redo(false);
    });
    addEventListener("offline", () => {
      SY.online = false;
      emit();
    });
    setInterval(() => {
      if (document.hidden || !SY.online || !SY.pend.size) return;
      if (Date.now() - Math.min(...SY.pend.values()) > 20000) kick();
    }, 10000);
    /* 保存できていない変更があるときだけ、画面の下に小さく知らせる（状態表示を持たないアプリ用） */
    if (opt && opt.badge)
      SY.on(() => {
        const n = failDocs();
        bar("u-syncfail", false, n ? (SY.fails.size && [...SY.fails.values()].every(w => w.perm) ? `保存できなかった変更があります（${n}件）` : `保存できていない変更があります（${n}件）・自動で保存し直しています`) : "", "今すぐ保存", () => SY.retry());
      });
  }

  /* Firebase の関数と同じ書き方で使える版を作る（FitLife・ウリログ用） */
  function wrap(F, fs, opt) {
    attach(F, fs, opt);
    const isOpts = x => x && typeof x === "object" && typeof x.next !== "function" && !("next" in x);
    return {
      onSnapshot: (ref, ...a) => {
        const o = isOpts(a[0]) ? a.shift() : null;
        const [next, err] = a;
        return listen((ok, ng) => (o ? F.onSnapshot(ref, o, ok, ng) : F.onSnapshot(ref, ok, ng)), next, err);
      },
      setDoc: (ref, data, o) => track(ref.path, !(o && (o.merge || o.mergeFields)), () => (o ? F.setDoc(ref, data, o) : F.setDoc(ref, data))),
      updateDoc: (ref, ...a) => track(ref.path, false, () => F.updateDoc(ref, ...a)),
      deleteDoc: ref => track(ref.path, true, () => F.deleteDoc(ref)),
      /* 新しい文書：IDを先に決めてから書く（やり直しても二重にならない） */
      addDoc: (col, data) => {
        const r = F.doc(col);
        return track(r.path, true, () => F.setDoc(r, data)).then(() => r);
      },
      writeBatch: db => {
        const b = F.writeBatch(db),
          commit = b.commit.bind(b);
        b.commit = () => track(`batch-${wseq + 1}`, false, commit, true);
        return b;
      },
      runTransaction: (db, fn, o) => track(`tx-${wseq + 1}`, false, () => F.runTransaction(db, fn, o), true),
    };
  }

  return Object.assign(SY, { track, listen, attach, wrap });
})();
