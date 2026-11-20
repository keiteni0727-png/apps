/* ===================== 共通の画面部品：おかね手帳・エンタメ管理で同じファイルを使う（u-core.js のあとに読み込む） =====================
  U.TOUCH        … 指で操作する端末か（スマホ・iPad）
  U.sheetMode()  … 下から出すシートの形にする画面幅か（スマホ）。U.noSheet を true にしたアプリは、スマホでも欄のすぐ下に出す
  U.lock(on)     … シートなどを開いている間、後ろの画面をスクロールさせない（iPhoneでも効くよう body を固定）。U.lockY は固定前の位置
  表示の切り替えボタン（#hTheme）… 自動 → ライト → ダーク → 自動。押したときの処理とアイコンはここで行う
  U.pick         … プルダウン（select）を開くと、端末標準ではなく同じ見た目の一覧を出す。スマホは下から、PCは欄のすぐ下
    U.pick.close() … 開いている一覧を閉じる
    U.pick.onOpen  … 一覧を開く直前に呼ぶ関数（ほかの部品を閉じるときに使う）
    data-native を付けた select は端末標準のまま */
U.TOUCH = matchMedia("(hover:none) and (pointer:coarse)").matches;
U.sheetMode = () => !U.noSheet && matchMedia("(max-width:699px)").matches;
/* 欄のすぐ下に出した一覧を、画面の大きさの変化・スクロールで閉じてよいか（スマホでキーボードが出たとき・一覧の中の欄に入力中は閉じない） */
U.popKeep = box => U.TOUCH || !!(document.activeElement && document.activeElement.closest && document.activeElement.closest(box));
U.IC = {
  check: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  x: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  search: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
};

/* ---------- 後ろの画面を止める ---------- */
U.lockY = null;
U.lock = on => {
  const b = document.body.style;
  if (on && U.lockY === null) {
    U.lockY = scrollY;
    Object.assign(b, { position: "fixed", top: `-${U.lockY}px`, left: "0", right: "0", width: "100%" });
  } else if (!on && U.lockY !== null) {
    const y = U.lockY;
    U.lockY = null;
    Object.assign(b, { position: "", top: "", left: "", right: "", width: "" });
    scrollTo(0, y);
  }
};

/* ---------- 表示の切り替えボタン ---------- */
(() => {
  const IC = {
    auto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>`,
    light: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
    dark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>`,
  };
  const paint = () =>
    document.querySelectorAll("#hTheme").forEach(b => {
      const v = U.theme();
      b.innerHTML = IC[v];
      b.setAttribute("aria-label", `表示：${U.THEME_NAME[v]}（押すと切り替え）`);
      b.title = `表示：${U.THEME_NAME[v]}`;
    });
  document.addEventListener("u-theme", paint);
  document.addEventListener("click", e => {
    if (!e.target.closest || !e.target.closest("#hTheme")) return;
    const nx = { auto: "light", light: "dark", dark: "auto" }[U.theme()];
    U.setTheme(nx);
    U.toast(`表示：${U.THEME_NAME[nx]}`);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint);
  else paint();
})();

/* ---------- プルダウン：選択の一覧 ----------
   使いにくくならない工夫：
   ・今の値にチェックを付け、開いたときにその位置までスクロール
   ・項目が10個を超えるときだけ上に「探す」欄（スマホでは自動でキーボードを出さない）
   ・選んだらすぐ閉じる。外を押す・✕・Escでも閉じる
   ・開いた直後の指の離れで下の項目を選ばないよう、0.3秒は選べない
   ・PCは ↑↓ で項目を移動、Enterで決定。スマホは開いている間、後ろの画面がスクロールしない */
U.pick = (() => {
  const esc = U.esc;
  const SEL = "select:not([data-native])";
  let cur = null,
    at = 0,
    t0 = null;
  const api = { onOpen: null };
  /* 一覧の見出し：aria-label、なければ欄の名前（label の文字） */
  function title(sel) {
    const a = sel.getAttribute("aria-label");
    if (a) return a;
    const l = (sel.id && document.querySelector(`label[for="${sel.id}"]`)) || sel.closest("label");
    const t = l ? [...l.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join("").trim() : "";
    return t || "選ぶ";
  }
  function close(refocus) {
    const s = cur;
    cur = null;
    document.getElementById("pkPop")?.remove();
    document.documentElement.classList.remove("pkopen");
    if (s && refocus && !U.TOUCH && s.isConnected) s.focus();
  }
  function rows() {
    const opts = [...cur.options].filter(o => !o.hidden);
    return opts
      .map(o => {
        const on = cur.selectedIndex === o.index;
        return `<button type="button" class="dd-row${on ? " on" : ""}" role="option" aria-selected="${on}" data-pki="${o.index}"${o.disabled ? " disabled" : ""}><span class="dd-l">${esc(o.textContent)}</span>${on ? U.IC.check : ""}</button>`;
      })
      .join("");
  }
  function open(sel) {
    close();
    if (api.onOpen) api.onOpen();
    cur = sel;
    at = Date.now();
    const tt = title(sel);
    const sheet = U.sheetMode();
    const box = document.createElement("div");
    box.id = "pkPop";
    box.className = sheet ? "sheetmode" : "popmode";
    box.innerHTML = `<div class="dd-scrim" data-pkclose="1"></div><div class="dd-box" role="dialog" aria-label="${esc(tt)}">
      ${sheet ? `<div class="dd-h"><b>${esc(tt)}</b><span>選ぶと閉じます</span><button type="button" class="dd-x" data-pkclose="1" aria-label="閉じる">${U.IC.x}</button></div>` : ""}
      <div class="dd-list" role="listbox" id="pkList">${rows()}</div></div>`;
    document.body.appendChild(box);
    if (sheet) document.documentElement.classList.add("pkopen");
    else {
      /* PC：欄のすぐ下（下に場所がなければ上）に出す */
      const r = sel.getBoundingClientRect(),
        b = box.querySelector(".dd-box");
      const w = Math.min(Math.max(r.width, 220), 420);
      b.style.width = w + "px";
      b.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + "px";
      const below = innerHeight - r.bottom - 12,
        above = r.top - 12;
      if (below >= 240 || below >= above) {
        b.style.top = r.bottom + 6 + "px";
        b.style.maxHeight = Math.min(420, below) + "px";
      } else {
        b.style.bottom = innerHeight - r.top + 6 + "px";
        b.style.maxHeight = Math.min(420, above) + "px";
      }
    }
    const on = box.querySelector(".dd-row.on");
    if (on) on.scrollIntoView({ block: "center" });
    if (!U.TOUCH) (on || box.querySelector(".dd-row"))?.focus();
  }
  function pick(i) {
    const s = cur;
    if (!s || Date.now() - at < 300) return;
    close();
    if (s.selectedIndex !== i) {
      s.selectedIndex = i;
      s.dispatchEvent(new Event("input", { bubbles: true }));
      s.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (!U.TOUCH && s.isConnected) s.focus();
  }
  const hit = e => e.target.closest && e.target.closest(SEL);
  /* PC：標準の選択を開かせずに、こちらの一覧を出す */
  document.addEventListener(
    "mousedown",
    e => {
      const s = hit(e);
      if (!s || e.button !== 0 || s.disabled) return;
      e.preventDefault();
      s.focus();
      open(s);
    },
    true,
  );
  /* スマホ：指を動かさずに離したときだけ開く（スクロールのつもりで触れたときは開かない） */
  document.addEventListener(
    "touchstart",
    e => {
      const s = hit(e);
      t0 = s && e.touches.length === 1 ? { s, x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    },
    { capture: true, passive: true },
  );
  document.addEventListener(
    "touchend",
    e => {
      const s = hit(e);
      if (!s || s.disabled) return;
      e.preventDefault();
      const t = e.changedTouches[0];
      if (!t0 || t0.s !== s || Math.abs(t.clientX - t0.x) > 10 || Math.abs(t.clientY - t0.y) > 10) return;
      open(s);
    },
    { capture: true, passive: false },
  );
  document.addEventListener(
    "click",
    e => {
      /* PC：プルダウンを押したときのクリック（一覧が開いたあと、画面全体に届く）は捨てる */
      if (cur && Date.now() - at < 800 && !(e.target.closest && e.target.closest("#pkPop .dd-box"))) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      if (!e.target.closest || !e.target.closest("#pkPop")) return;
      e.stopPropagation();
      const r = e.target.closest("[data-pki]");
      if (r) pick(+r.dataset.pki);
      else if (e.target.closest("[data-pkclose]")) close(true);
    },
    true,
  );
  /* キーボード：選択欄で Enter・Space・↑↓ を押すと開く。一覧の中は ↑↓・Home・End で移動、Escで閉じる。
     アプリ側の一覧（編集画面のプルダウン・絞り込みの選択肢）も同じ動き */
  document.addEventListener(
    "keydown",
    e => {
      const t = e.target;
      if (!t || !t.closest) return;
      if (t.matches && t.matches(SEL) && ["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key) && !cur) {
        e.preventDefault();
        e.stopPropagation();
        open(t);
        return;
      }
      if (cur && e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close(true);
        return;
      }
      const box = t.closest(".dd-box,.fsh-sub");
      if (!box || !["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      const rs = [...box.querySelectorAll(".dd-row")];
      if (!rs.length) return;
      e.preventDefault();
      const i = rs.indexOf(t.closest(".dd-row"));
      const n = e.key === "Home" ? 0 : e.key === "End" ? rs.length - 1 : i < 0 ? 0 : Math.max(0, Math.min(rs.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)));
      rs[n].focus();
      rs[n].scrollIntoView({ block: "nearest" });
    },
    true,
  );
  /* PC：画面の大きさが変わったり、後ろをスクロールしたら閉じる（欄からずれるため） */
  addEventListener("resize", () => cur && !U.sheetMode() && !U.popKeep("#pkPop") && close());
  document.addEventListener("scroll", e => cur && !U.sheetMode() && !(e.target.closest && e.target.closest("#pkPop")) && !(U.TOUCH && document.activeElement && document.activeElement.closest && document.activeElement.closest("#pkPop")) && close(), true);
  api.close = close;
  api.isOpen = () => !!cur;
  return api;
})();
