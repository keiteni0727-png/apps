/* ===================== おかね手帳の画面部品（エンタメ管理と同じ形にそろえたもの） =====================
  ・プルダウンの一覧・表示の切り替え・後ろの画面を止める処理は、エンタメ管理と共通の shared/u-ui.js
  ・UI.filter … 「絞り込み」ボタンと、ボタンのすぐ下に出る絞り込みパネル・条件のラベル
  ・UI.calc   … 金額欄の電卓キーボード。スマホは画面の下に、PCは欄のすぐ下に出る（PCはキーボードでも式を打てる）
  家計簿（kb.js）・支払い（pay.js）より先に読み込む */
const UI = {};
(() => {
  const esc = U.esc;
  const { TOUCH } = U;
  const CHECK = U.IC.check,
    X_IC = U.IC.x;
  const CHEV = `<svg class="fsh-cv" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`;
  UI.CHECK = CHECK;

  /* プルダウンの一覧を開くときは電卓をしまう */
  U.pick.onOpen = () => calcClose();
  const pkClose = () => U.pick.close();

  /* ===================== 絞り込み：ボタン・条件のラベル・パネル =====================
     UI.filter.define(id, { cfg, pick, reset })
       cfg()  … { rows: [{ k, label, opts: [{ v, label, n }], cur }], n（絞り込み後の件数）, unit }
       pick(k, v) … 選んだとき（画面の描き直しは呼ぶ側で）
       reset() … 条件をすべて外す
     UI.filter.btn(id, 条件の数) … 「絞り込み」ボタン
     UI.filter.sum(id, [条件の名前]) … 条件のラベル（2つまで＋他◯件・解除） */
  const FIC = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>';
  const defs = {};
  const fst = { id: "", sub: "", first: false, subFirst: false, at: 0 };
  UI.filter = {
    define(id, o) {
      defs[id] = o;
    },
    isOpen: id => fst.id === id,
    btn: (id, n) =>
      `<div class="fbar"><button type="button" class="u-btn fb fsh-b${n ? " on" : ""}" data-fsh="${id}" aria-haspopup="dialog" aria-expanded="${fst.id === id}">${FIC}<span class="v">絞り込み</span>${n ? `<b class="fsh-n">${n}</b>` : ""}</button></div>`,
    sum: (id, conds) =>
      conds.length
        ? `<div class="fsum"><div class="fsum-l">${conds
            .slice(0, 2)
            .map(t => `<button type="button" class="u-chip on fchip" data-fsh="${id}" title="${esc(t)}"><span>${esc(t)}</span></button>`)
            .join("")}${conds.length > 2 ? `<button type="button" class="u-chip fmore" data-fsh="${id}">他${conds.length - 2}件</button>` : ""}</div><button type="button" class="u-btn sm txt clear" data-fshreset="${id}">解除</button></div>`
        : "",
    refresh: () => fRender(),
    close: () => fClose(),
  };
  function fHost() {
    let h = document.getElementById("fshHost");
    if (!h) {
      h = document.createElement("div");
      h.id = "fshHost";
      document.body.appendChild(h);
    }
    return h;
  }
  function fRender() {
    const h = fHost();
    const d = defs[fst.id];
    if (!d) {
      h.innerHTML = "";
      document.documentElement.classList.remove("fshopen");
      return;
    }
    const c = d.cfg();
    const nConds = c.rows.filter(r => r.cur !== "").length;
    const body = c.rows
      .map(r => {
        const open = fst.sub === r.k;
        const curLab = (r.opts.find(o => o.v === r.cur) || {}).label;
        const val = r.cur === "" ? "すべて" : curLab || r.cur;
        return `<div class="fsh-it${open ? " open" : ""}"><button type="button" class="fsh-row" data-fshsub="${r.k}" aria-expanded="${open}"><span class="fsh-k">${esc(r.label)}</span><span class="fsh-v${r.cur !== "" ? " on" : ""}">${esc(val)}</span>${CHEV}</button>${
          open
            ? `<div class="fsh-sub${fst.subFirst ? " in" : ""}" role="group" aria-label="${esc(r.label)}"><div class="fsh-subh"><b>${esc(r.label)}</b><span class="fsh-hint">選ぶと閉じます</span></div><div class="fsh-subb dd-list" role="listbox">${[{ v: "", label: "すべて", n: r.all }, ...r.opts]
                .map(o => {
                  const on = o.v === r.cur;
                  return `<button type="button" class="dd-row${on ? " on" : ""}" role="option" aria-selected="${on}" data-fshk="${r.k}" data-fshv="${esc(o.v)}"><span class="dd-l">${o.html || esc(o.label)}${o.n != null ? `<small>${o.n}</small>` : ""}</span>${on ? CHECK : ""}</button>`;
                })
                .join("")}</div></div>`
            : ""
        }</div>`;
      })
      .join("");
    const sc = h.querySelector(".fsh-body")?.scrollTop || 0;
    h.innerHTML = `<div class="fsh-scrim" data-fshclose="1"></div><div class="fsh${fst.first ? " in" : ""}" role="dialog" aria-label="絞り込み">
      <div class="fsh-h"><b>絞り込み</b>${nConds ? `<button type="button" class="u-btn sm txt fsh-reset" data-fshreset="${fst.id}">リセット</button>` : ""}<button type="button" class="u-btn icon sm soft fsh-x" data-fshclose="1" aria-label="閉じる">${X_IC}</button></div>
      <div class="fsh-body">${body}</div>
      <div class="fsh-f"><button type="button" class="u-btn pri wide fsh-go" data-fshclose="1">${c.n}${c.unit}を表示</button></div></div>`;
    const b = h.querySelector(".fsh-body");
    if (b) b.scrollTop = sc;
    fst.first = fst.subFirst = false;
    document.documentElement.classList.add("fshopen");
    fPlace();
    document.querySelectorAll(`[data-fsh="${fst.id}"].fsh-b`).forEach(x => x.setAttribute("aria-expanded", "true"));
  }
  /* パネルを「絞り込み」ボタンのすぐ下に置く（スマホは幅いっぱい、下のメニューにかからない高さまで） */
  function fPlace() {
    const sh = document.querySelector("#fshHost .fsh");
    const b = [...document.querySelectorAll(`.fsh-b[data-fsh="${fst.id}"]`)].find(x => x.offsetParent);
    if (!sh || !b) return;
    const r = b.getBoundingClientRect();
    sh.style.top = r.bottom + 6 + "px";
    if (innerWidth >= 900) {
      sh.style.left = Math.max(8, Math.min(r.left, innerWidth - 388)) + "px";
      sh.style.maxHeight = innerHeight - r.bottom - 22 + "px";
    } else {
      sh.style.removeProperty("left");
      const nav = document.querySelector(".tbwrap");
      const nr = nav && nav.getBoundingClientRect();
      const bottom = nr && nr.height ? nr.top - 8 : innerHeight - 12;
      sh.style.maxHeight = Math.max(240, bottom - r.bottom - 6) + "px";
    }
  }
  addEventListener("resize", () => fst.id && fPlace());
  function fOpen(id) {
    calcClose();
    pkClose();
    /* ボタンが画面の上に隠れていたら、見えるところまで戻してから開く */
    const b = [...document.querySelectorAll(`.fsh-b[data-fsh="${id}"]`)].find(x => x.offsetParent);
    if (b) {
      const r = b.getBoundingClientRect(),
        hd = document.querySelector(".appbar")?.getBoundingClientRect().bottom || 60;
      if (r.top < hd + 4) scrollBy(0, r.top - hd - 12);
    }
    fst.id = id;
    fst.sub = "";
    fst.first = true;
    fRender();
    if (!TOUCH) document.querySelector("#fshHost .fsh-row")?.focus();
  }
  function fClose() {
    if (!fst.id) return;
    const id = fst.id;
    fst.id = fst.sub = "";
    fRender();
    document.querySelectorAll(`.fsh-b[data-fsh="${id}"]`).forEach(x => x.setAttribute("aria-expanded", "false"));
    if (!TOUCH) document.querySelector(`.fsh-b[data-fsh="${id}"]`)?.focus();
  }
  document.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest("[data-fsh],[data-fshclose],[data-fshsub],[data-fshk],[data-fshreset]");
    if (!t) return;
    const d = t.dataset;
    if (d.fshreset !== undefined) {
      const o = defs[d.fshreset];
      if (o) o.reset();
      if (fst.id) {
        fst.sub = "";
        fRender();
      }
    } else if (d.fsh !== undefined) {
      if (fst.id === d.fsh && t.classList.contains("fsh-b")) fClose();
      else fOpen(d.fsh);
    } else if (d.fshclose) fClose();
    else if (d.fshsub !== undefined) {
      fst.sub = fst.sub === d.fshsub ? "" : d.fshsub;
      fst.subFirst = !!fst.sub;
      fst.at = Date.now();
      fRender();
      const on = document.querySelector("#fshHost .fsh-sub .dd-row.on");
      if (on) on.scrollIntoView({ block: "nearest" });
      if (!TOUCH) (on || document.querySelector("#fshHost .fsh-sub .dd-row"))?.focus();
    } else if (d.fshk !== undefined) {
      /* 開いた直後の指の離れで、下に出てきた選択肢を押してしまわないように少し待つ */
      if (Date.now() - fst.at < 300) return;
      const o = defs[fst.id];
      const k = d.fshk;
      fst.sub = "";
      if (o) o.pick(k, d.fshv);
      fRender();
      if (!TOUCH) document.querySelector(`#fshHost .fsh-row[data-fshsub="${k}"]`)?.focus();
    }
  });
  document.addEventListener(
    "keydown",
    e => {
      if (e.key === "Escape" && fst.id) {
        e.preventDefault();
        e.stopPropagation();
        if (fst.sub) {
          fst.sub = "";
          fRender();
        } else fClose();
      }
    },
    true,
  );

  /* ===================== 電卓キーボード（金額欄） =====================
     対象：inputmode="numeric" の数字の欄（給料日など上限のある欄と data-nocalc は除く）
     ・入力した式（例 1200+300×2）の答えを、そのまま欄に入れていく（欄の input のイベントも出す）
     ・スマホは端末のキーボードを出さず、画面の下に電卓を出す。PCは欄のすぐ下に出し、数字・＋−＊／・Enter でも打てる */
  const CALC_SEL = 'input[type="number"][inputmode="numeric"]:not([max]):not([data-nocalc])';
  const OPS = { "+": "+", "-": "−", "*": "×", "/": "÷" };
  const cs = { el: null, id: "", expr: "", fresh: true, start: "" };
  UI.calcSel = CALC_SEL;
  /* スマホ：端末のキーボードを出さない（描き直して増えた欄にも付ける） */
  const markNoKb = root => {
    if (!TOUCH) return;
    const l = root.matches && root.matches(CALC_SEL) ? [root] : [];
    if (root.querySelectorAll) l.push(...root.querySelectorAll(CALC_SEL));
    l.forEach(el => {
      if (el.dataset.calc) return;
      el.dataset.calc = "1";
      el.setAttribute("inputmode", "none");
    });
  };
  const isCalc = el => el && el.matches && (el.matches(CALC_SEL) || (el.dataset && el.dataset.calc === "1" && el.type === "number"));
  if (TOUCH) {
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && markNoKb(n)))).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", () => markNoKb(document));
    markNoKb(document);
  }
  const fmt = s => s.replace(/\d+/g, n => Number(n).toLocaleString("ja-JP")).replace(/[+\-*/]/g, o => ` ${OPS[o]} `);
  function evalExpr(s) {
    s = s.replace(/[+\-*/]+$/, "");
    if (!s) return null;
    const tk = s.match(/\d+|[+\-*/]/g) || [];
    /* × ÷ を先に計算する */
    const st = [];
    let op = "+";
    for (const t of tk) {
      if (/\d/.test(t)) {
        const n = Number(t);
        if (op === "*") st.push(st.pop() * n);
        else if (op === "/") st.push(n ? st.pop() / n : st.pop());
        else st.push(op === "-" ? -n : n);
      } else op = t;
    }
    return Math.round(st.reduce((a, b) => a + b, 0));
  }
  const hasOp = s => /\d[+\-*/]/.test(s);
  function cLabel(el) {
    const l = (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest("label");
    const t = l ? [...l.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join("").trim() : "";
    return t || el.getAttribute("aria-label") || "金額";
  }
  function cBox() {
    let b = document.getElementById("calc");
    if (b) return b;
    b = document.createElement("div");
    b.id = "calc";
    b.setAttribute("role", "group");
    b.setAttribute("aria-label", "電卓");
    const k = (v, l, c) => `<button type="button" tabindex="-1" class="cky${c ? " " + c : ""}" data-cky="${v}">${l}</button>`;
    b.innerHTML = `<div class="c-h"><span class="c-lab" id="calcLab"></span><button type="button" tabindex="-1" class="c-nav" data-cnav="-1" aria-label="前の欄">‹</button><button type="button" tabindex="-1" class="c-nav" data-cnav="1" aria-label="次の欄">›</button><button type="button" tabindex="-1" class="c-done" data-cky="ok">完了</button></div>
      <div class="c-disp"><div class="c-expr" id="calcExpr"></div><div class="c-res" id="calcRes"></div></div>
      <div class="c-keys">${[
        k("C", "C", "fn"), k("bs", "⌫", "fn"), k("/", "÷", "op"), k("*", "×", "op"),
        k("7", "7"), k("8", "8"), k("9", "9"), k("-", "−", "op"),
        k("4", "4"), k("5", "5"), k("6", "6"), k("+", "+", "op"),
        k("1", "1"), k("2", "2"), k("3", "3"), k("=", "=", "eq"),
        k("0", "0"), k("00", "00"), k("000", "000"), k("ok", "完了", "go"),
      ].join("")}</div>
      <div class="c-hint">キーボードでも打てます（＋ − ＊ ／・Enter）</div>`;
    /* 押しても欄から離れないように（PCで欄の文字入れが続けられるように） */
    b.addEventListener("mousedown", e => e.preventDefault());
    b.addEventListener("click", e => {
      const n = e.target.closest("[data-cnav]");
      if (n) return cNav(+n.dataset.cnav);
      const t = e.target.closest("[data-cky]");
      if (t) cKey(t.dataset.cky);
    });
    document.body.appendChild(b);
    return b;
  }
  function cPaint() {
    const r = evalExpr(cs.expr);
    document.getElementById("calcExpr").textContent = cs.expr ? fmt(cs.expr) : "0";
    document.getElementById("calcRes").textContent = hasOp(cs.expr) && r != null ? "= ¥" + r.toLocaleString("ja-JP") : "";
  }
  /* 答えを欄に入れて、欄のイベントを出す（金額の合計などがその場で変わる） */
  function cWrite() {
    let el = cs.el;
    if (el && !el.isConnected && cs.id) el = cs.el = document.getElementById(cs.id);
    if (!el || !el.isConnected) return;
    const r = evalExpr(cs.expr);
    const v = r == null ? "" : String(Math.max(0, r));
    if (el.value === v) return;
    el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function cKey(k) {
    if (!cs.el) return;
    if (k === "ok") return calcClose(true);
    if (/^\d+$/.test(k)) {
      if (cs.fresh) cs.expr = "";
      cs.fresh = false;
      const m = cs.expr.match(/(\d*)$/)[1];
      if (m === "0") cs.expr = cs.expr.slice(0, -1) + (k.replace(/^0+/, "") || "0");
      else if (!m && /^0+$/.test(k)) cs.expr += "0";
      else if (m.length + k.length <= 12) cs.expr += k;
    } else if (OPS[k]) {
      cs.fresh = false;
      if (!cs.expr) return;
      cs.expr = /[+\-*/]$/.test(cs.expr) ? cs.expr.slice(0, -1) + k : cs.expr + k;
    } else if (k === "bs") {
      cs.fresh = false;
      cs.expr = cs.expr.slice(0, -1);
    } else if (k === "C") {
      cs.fresh = false;
      cs.expr = "";
    } else if (k === "=") {
      const r = evalExpr(cs.expr);
      cs.expr = r == null ? "" : String(Math.max(0, r));
      cs.fresh = true;
    }
    cPaint();
    cWrite();
  }
  /* 同じ画面（シートの中など）の、前・次の金額欄へ */
  function cTargets() {
    const root = cs.el.closest(".sheet,.pop,.rv,.view,section") || document;
    return [...root.querySelectorAll(CALC_SEL + ',input[data-calc="1"]')].filter(x => x.offsetParent && !x.disabled);
  }
  function cNav(d) {
    if (!cs.el) return;
    const l = cTargets(),
      i = l.indexOf(cs.el),
      n = l[i + d];
    if (n) n.focus();
  }
  function cPlace() {
    const b = cBox(),
      el = cs.el;
    if (!el) return;
    if (TOUCH) {
      b.className = "sheet-m";
      document.documentElement.style.setProperty("--calch", b.offsetHeight + "px");
      /* 欄が電卓に隠れないように動かす（シートの中はシートを、ほかは画面を） */
      requestAnimationFrame(() => {
        const r = el.getBoundingClientRect(),
          lim = innerHeight - b.offsetHeight - 16,
          top = (document.querySelector(".appbar")?.getBoundingClientRect().bottom || 56) + 8;
        const sc = el.closest(".sheet,.pop");
        const d = r.bottom > lim ? r.bottom - lim : r.top < top ? r.top - top : 0;
        if (!d) return;
        if (sc && sc.scrollHeight > sc.clientHeight) sc.scrollTop += d;
        else scrollBy(0, d);
      });
    } else {
      b.className = "pop-m";
      const w = b.offsetWidth,
        h = b.offsetHeight;
      let r = el.getBoundingClientRect();
      /* 上にも下にも入らないときは、欄の下に入るように画面を動かす */
      if (innerHeight - r.bottom - 12 < h && r.top - 12 < h && !cs.moved) {
        cs.moved = true;
        const top = (document.querySelector(".appbar")?.getBoundingClientRect().bottom || 56) + 8;
        const d = Math.min(r.bottom + h + 18 - innerHeight, r.top - top);
        const sc = el.closest(".sheet,.pop");
        if (d > 0) {
          if (sc && sc.scrollHeight > sc.clientHeight) sc.scrollTop += d;
          else scrollBy(0, d);
          r = el.getBoundingClientRect();
        }
      }
      let top = innerHeight - r.bottom - 12 >= h ? r.bottom + 6 : r.top - 12 >= h ? r.top - h - 6 : r.bottom + 6;
      /* どんなときも画面の中に収める */
      top = Math.max(8, Math.min(top, innerHeight - h - 8));
      b.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + "px";
      b.style.top = top + "px";
    }
  }
  function calcOpen(el) {
    const same = cs.el === el || (cs.el && cs.id && cs.id === el.id && !cs.el.isConnected);
    if (same && document.documentElement.classList.contains("calcopen")) {
      cs.el = el;
      cPlace();
      return;
    }
    if (cs.el && cs.el !== el) calcClose(false, true);
    pkClose();
    cs.el = el;
    cs.id = el.id || "";
    cs.expr = el.value && /^\d+$/.test(el.value) ? String(Number(el.value)) : "";
    cs.start = el.value;
    cs.fresh = true;
    cs.moved = false;
    const b = cBox();
    document.getElementById("calcLab").textContent = cLabel(el);
    b.hidden = false;
    document.documentElement.classList.add("calcopen");
    el.classList.add("calcon");
    const l = cTargets();
    b.querySelector('[data-cnav="-1"]').disabled = l.indexOf(el) <= 0;
    b.querySelector('[data-cnav="1"]').disabled = l.indexOf(el) >= l.length - 1;
    cPaint();
    cPlace();
  }
  /* 閉じる：式は答えにまとめて、変わっていれば change も出す */
  function calcClose(blur, keep) {
    const el = cs.el;
    if (!el) return;
    if (/[+\-*/]/.test(cs.expr)) cWrite();
    cs.el = null;
    el.classList.remove("calcon");
    if (el.isConnected && el.value !== cs.start) el.dispatchEvent(new Event("change", { bubbles: true }));
    if (keep) return;
    const b = document.getElementById("calc");
    if (b) b.hidden = true;
    document.documentElement.classList.remove("calcopen");
    if (blur && TOUCH && el.isConnected) el.blur();
  }
  UI.calcClose = () => calcClose();
  document.addEventListener("focusin", e => {
    if (isCalc(e.target)) calcOpen(e.target);
    else if (cs.el && !e.target.closest("#calc")) calcClose();
  });
  /* PC：ほかの所へ移ったら閉じる */
  document.addEventListener("focusout", e => {
    if (TOUCH || e.target !== cs.el) return;
    setTimeout(() => {
      if (cs.el && document.activeElement !== cs.el && !isCalc(document.activeElement)) calcClose();
    });
  });
  /* スマホ：欄と電卓の外を押したら閉じる */
  document.addEventListener(
    "pointerdown",
    e => {
      if (!cs.el || !e.target.closest) return;
      if (e.target.closest("#calc") || isCalc(e.target)) return;
      calcClose(true);
    },
    true,
  );
  /* 開いている欄を押し直したとき（スマホで閉じたあと、もう一度押したとき） */
  document.addEventListener("click", e => {
    if (isCalc(e.target) && !cs.el) calcOpen(e.target);
  });
  /* PC：キーボードで式を打つ */
  document.addEventListener(
    "keydown",
    e => {
      if (!cs.el || e.target !== cs.el || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      const k = e.key;
      let c = null;
      if (/^[0-9]$/.test(k)) c = k;
      else if (k === "+" || k === "-" || k === "*" || k === "/") c = k;
      else if (k === "x" || k === "X") c = "*";
      else if (k === "Backspace") c = "bs";
      else if (k === "Delete") c = "C";
      else if (k === "=") c = "=";
      else if (k === "Enter") {
        /* 確定して閉じる（Enterで保存する画面は、そのまま保存まで進む） */
        if (/[+\-*/]/.test(cs.expr)) cKey("=");
        calcClose();
        return;
      } else if (k === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        calcClose();
        return;
      } else if (k === "Tab") {
        calcClose();
        return;
      } else if (k === "ArrowUp" || k === "ArrowDown" || k === "." || k === "e" || k === "E") {
        e.preventDefault();
        return;
      }
      if (c) {
        e.preventDefault();
        cKey(c);
      }
    },
    true,
  );
  addEventListener("resize", () => cs.el && cPlace());
  document.addEventListener("scroll", e => cs.el && !TOUCH && !(e.target.closest && e.target.closest("#calc")) && cPlace(), true);
})();
