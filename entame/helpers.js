/* ===================== 操作の補助：見出しの固定・詳細のスワイプ・矢印キーでの移動・日付と配信URLの入力 ===================== */
/* 一覧のグループ見出し：画面の上に貼りついている見出しに下線を付け、下を流れる作品との境目をはっきりさせる */
function markStuck() {
  document.querySelectorAll(".ghd").forEach(el => {
    const nx = el.nextElementSibling;
    const r = el.getBoundingClientRect();
    el.classList.toggle("stuck", !!nx && nx.getBoundingClientRect().top < r.bottom - 1 && nx.getBoundingClientRect().bottom > r.bottom);
  });
}
let ghdRaf = 0;
addEventListener(
  "scroll",
  () => {
    if (!ghdRaf)
      ghdRaf = requestAnimationFrame(() => {
        ghdRaf = 0;
        markStuck();
      });
  },
  { passive: true },
);
/* 作品・YouTubeの詳細：← → キーで前・次の作品へ（入力欄・選択肢にカーソルがないとき） */
document.addEventListener("keydown", e => {
  if ((e.key !== "ArrowLeft" && e.key !== "ArrowRight") || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const yt = ytOpen && $("#layer .sheet:not(.form) #ytIn");
  if (!yt && (!openId || !$("#layer .sheet:not(.form) #sheetIn") || subAsk)) return;
  const t = e.target;
  if (t && t.closest && t.closest("input,textarea,select,[contenteditable]")) return;
  e.preventDefault();
  (yt ? ytDetailNav : detailNav)(e.key === "ArrowLeft" ? -1 : 1);
});
/* 作品の詳細：スマホは左右にスワイプして前・次の作品へ（縦のスクロールや入力欄の操作とは区別する） */
let dSw = null;
document.addEventListener(
  "touchstart",
  e => {
    dSw = null;
    const sh = e.target.closest && e.target.closest("#layer .sheet:not(.form)");
    if (!sh || !(openId || ytOpen) || e.touches.length !== 1 || e.target.closest("input,textarea,select,.sp-list,.stmenu")) return;
    const p = e.touches[0];
    dSw = { x: p.clientX, y: p.clientY, t: Date.now() };
  },
  { passive: true },
);
document.addEventListener(
  "touchend",
  e => {
    if (!dSw) return;
    const p = e.changedTouches[0],
      dx = p.clientX - dSw.x,
      dy = p.clientY - dSw.y;
    const ok = Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2 && Date.now() - dSw.t < 700;
    dSw = null;
    if (ok) (ytOpen ? ytDetailNav : detailNav)(dx < 0 ? 1 : -1);
  },
  { passive: true },
);
/* 矢印キーで入力欄を移る（PC）
   話数の編集・編の登録（表の形）：↑↓＝上下の行の同じ欄、←→＝カーソルが文字の端にあるときだけ隣の欄
   作品・YouTubeの編集画面：↑↓＝前・次の入力欄（数字の欄も増減ではなく移動）。1話だけ編集：↑↓・端の←→で前・次の欄 */
const ARROWS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
const navOk = el =>
  el.tagName === "INPUT" &&
  !["checkbox", "radio", "hidden", "date", "range", "file", "color", "button", "submit"].includes(el.type) &&
  !el.classList.contains("dtpick") &&
  !el.disabled &&
  !el.readOnly &&
  el.offsetParent !== null;
const navInputs = box => [...box.querySelectorAll("input")].filter(navOk);
function navGo(e, el) {
  if (!el) return false;
  e.preventDefault();
  el.focus({ preventScroll: true });
  navScroll(el);
  if (!isDt(el))
    try {
      el.select();
    } catch (_) {}
  return true;
}
/* 移った欄が見えるようにスクロール。上に固定の見出し（作品名・タブ）、下に固定のボタン（保存など）があるので、
   その下・上に隠れないよう、さらに1行分の余白をとって先回りしてスクロールする */
function navScroll(el) {
  const sc = el.closest(".sheet");
  if (!sc) return el.scrollIntoView({ block: "nearest" });
  const box = sc.getBoundingClientRect(),
    r = el.getBoundingClientRect();
  const vis = x => x && x.offsetParent !== null && getComputedStyle(x).position === "sticky";
  const hd = [...sc.querySelectorAll(".dhead")].find(vis),
    ft = [...sc.querySelectorAll(".ffoot")].find(vis);
  const top = box.top + (hd ? hd.getBoundingClientRect().height : 0),
    bot = box.bottom - (ft ? ft.getBoundingClientRect().height : 0);
  const row = el.closest("[data-er],[data-ar],.sg,.field,label") || el;
  const pad = Math.min(64, row.getBoundingClientRect().height + 8);
  if (r.top < top + pad) sc.scrollTop -= top + pad - r.top;
  else if (r.bottom > bot - pad) sc.scrollTop += r.bottom - (bot - pad);
}
/* カーソルが文字の左端・右端にあるか（数字の欄など、カーソル位置が取れない欄は端とみなす） */
const atEdge = (t, left) => {
  let s;
  try {
    s = t.selectionStart;
  } catch (_) {
    s = null;
  }
  if (s == null) return true;
  if (s === 0 && t.selectionEnd === t.value.length) return true; // 全部選んだ状態（移ってきた直後）も端とみなす
  if (s !== t.selectionEnd) return false;
  return left ? s === 0 : s === t.value.length;
};
document.addEventListener("keydown", e => {
  if (!ARROWS.includes(e.key) || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || imeEnter(e)) return;
  const t = e.target;
  if (!t || !navOk(t)) return;
  const up = e.key === "ArrowUp",
    down = e.key === "ArrowDown",
    left = e.key === "ArrowLeft";
  /* 表の形：話数の編集の行・編の行 */
  const row = t.closest("[data-er],[data-ar]");
  if (row) {
    const cells = navInputs(row),
      c = cells.indexOf(t);
    if (up || down) {
      let r = row;
      do r = up ? r.previousElementSibling : r.nextElementSibling;
      while (r && !r.matches("[data-er],[data-ar]"));
      if (!navGo(e, r && navInputs(r)[Math.min(c, navInputs(r).length - 1)]) && t.type === "number") e.preventDefault();
      return;
    }
    if (atEdge(t, left)) navGo(e, cells[c + (left ? -1 : 1)]);
    return;
  }
  /* 1話だけ編集・作品／YouTubeの編集画面：前・次の入力欄 */
  const box = t.closest(".e1,#titleF,#ytF");
  if (!box) return;
  const l = navInputs(box),
    i = l.indexOf(t);
  if (up || down) {
    if (!navGo(e, l[i + (up ? -1 : 1)]) && t.type === "number") e.preventDefault();
    return;
  }
  if (box.classList.contains("e1") && atEdge(t, left)) navGo(e, l[i + (left ? -1 : 1)]);
});

/* 日付の入力：20180825・2018/8/25・2018.8.25・2018年8月25日・8/25（今年）を打ち込むと 2018-08-25 に直す。
   8けたの数字は打ち終わった時点で、それ以外は入力欄を離れたときに変換。正しくない日付は元に戻す */
function normDate(v, ref) {
  v = zen(String(v || ""))
    .trim()
    .replace(/\s+/g, "");
  if (!v) return "";
  let y, m, d, x;
  if ((x = /^(\d{4})(\d{2})(\d{2})$/.exec(v))) [, y, m, d] = x;
  else if ((x = /^(\d{4})(\d)(\d)$/.exec(v))) [, y, m, d] = x; // 201845 → 2018/4/5
  else if ((x = /^(\d{4})(\d{3})$/.exec(v))) {
    /* 2018415 → 4/15、2018105 → 10/5（ありえる方。どちらもありえるときは月1けたを優先） */
    y = x[1];
    const a = [x[2][0], x[2].slice(1)],
      b = [x[2].slice(0, 2), x[2][2]];
    const ok = ([mm, dd]) => +mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31;
    [m, d] = ok(a) && !(a[1][0] === "0" && ok(b)) ? a : b; // 日が0始まり（2018105）なら10/5と読む
  }
  else if ((x = /^(\d{4})[\/.\-年](\d{1,2})[\/.\-月](\d{1,2})日?$/.exec(v))) [, y, m, d] = x;
  else if ((x = /^(\d{1,2})[\/.\-月](\d{1,2})日?$/.exec(v)) || (ref && (x = /^(\d{2})(\d{2})$/.exec(v)))) {
    /* 年なし：ref（直前の話の日付）があればその年。直前の話より前の日付になるときは翌年。なければ今年 */
    [, m, d] = x;
    const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ref || "");
    y = r ? +r[1] : new Date().getFullYear();
    if (r && `${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}` < r[2] + r[3]) y++;
  } else return null;
  const dt = new Date(+y, +m - 1, +d);
  if (dt.getFullYear() !== +y || dt.getMonth() !== +m - 1 || dt.getDate() !== +d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
/* 日付は yyyy/MM/dd で表示する（保存は 2018-08-25 のまま。読むときは normDate を通す） */
const dtShow = d => (d ? String(d).replace(/-/g, "/") : "");
const isDt = el => !!(el && el.classList && (el.classList.contains("dtx") || el.classList.contains("dto")));
const DT_FULL = /^\d{4}\/\d{2}\/\d{2}$/;
const dtFmt = s => s.slice(0, 4) + (s.length > 4 ? "/" + s.slice(4, 6) : "") + (s.length > 6 ? "/" + s.slice(6, 8) : "");
const dtSend = el => {
  el.dataset.sent = el.value;
  el.dispatchEvent(new Event("change", { bubbles: true }));
};
/* 入力欄に入ったとき：カーソルは押した位置のまま（ふつうの入力欄と同じ） */
document.addEventListener("focusin", e => {
  const el = e.target;
  if (!isDt(el)) return;
  el.dataset.prev = el.value;
  el.dataset.sent = el.value;
});
/* 数字を打つ：空・末尾に足すときは打った順に yyyy/MM/dd の形で入る（/ は自動）。
   途中にカーソルを置いて打つ・消すのはふつうの入力欄と同じ。最後の数字まで打つか、入力欄を離れたら確定 */
document.addEventListener(
  "beforeinput",
  e => {
    const el = e.target;
    if (!isDt(el)) return;
    const t = e.inputType,
      v = el.value,
      p = el.selectionStart ?? v.length,
      q = el.selectionEnd ?? p;
    const set = (val, c) => {
      el.value = val;
      try {
        el.setSelectionRange(c, c);
      } catch (_) {}
    };
    if (t === "insertText" || t === "insertReplacementText") {
      const ds = zen(e.data || "").replace(/\D/g, "");
      if (!ds || ds.length !== (e.data || "").length) return;
      const all = p === 0 && q === v.length;
      /* 途中にカーソルがある・一部を選んでいるときは、ふつうに入力（離れたときに日付の形に直す） */
      if (!all && (p !== q || p !== v.length)) return;
      if (!all && DT_FULL.test(v)) return;
      /* 空・末尾（全部選んで打ち直すときも）：後ろに足していく */
      const base = all ? "" : v;
      /* 「1/」のように自分で / を打っている途中は、ふつうに入力（離れたときに日付の形に直す） */
      if (!/^[\d/]*$/.test(base) || base !== dtFmt(base.replace(/\D/g, ""))) return;
      e.preventDefault();
      const s = (base.replace(/\D/g, "") + ds).slice(0, 8);
      set(dtFmt(s), dtFmt(s).length);
      if (s.length === 8) dtSend(el);
      return;
    }
  },
  true,
);
/* 途中まで上書きして離れたときも確定する */
document.addEventListener("focusout", e => {
  const el = e.target;
  if (!isDt(el) || !el.isConnected) return;
  if (el.value.endsWith("/")) el.value = el.value.replace(/\/+$/, "");
  if (el.value !== el.dataset.sent) dtSend(el);
});
document.addEventListener(
  "input",
  e => {
    const el = e.target;
    if (!el.classList || !el.classList.contains("dtx")) return;
    if (/^[0-9０-９]{8}$/.test(el.value.trim())) {
      const n = normDate(el.value);
      if (n) {
        el.value = dtShow(n);
        el.dataset.prev = el.value;
        dtSend(el);
      }
    }
  },
  true,
);
document.addEventListener(
  "change",
  e => {
    const el = e.target;
    if (!el.classList || !el.classList.contains("dtx")) return;
    const n = normDate(el.value, el.dataset.ref);
    if (n === null) {
      e.stopImmediatePropagation();
      toast("日付は 2018/08/25 のように入力してください");
      el.value = el.dataset.prev || "";
      return;
    }
    const sh = dtShow(n);
    if (sh !== el.value) el.value = sh;
    el.dataset.sent = sh;
    if (sh === el.dataset.prev && e.isTrusted === false) return;
    el.dataset.prev = sh;
  },
  true,
);
/* カレンダーのボタン：隠した日付入力のカレンダーを開き、選んだ日を入力欄へ */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-dtcal]");
  if (!b) return;
  const id = b.dataset.dtcal;
  const t = document.getElementById(id);
  const pk = b.parentElement.querySelector(`[data-dtfor="${id}"]`);
  if (!t || !pk) return;
  pk.value = normDate(t.value) || "";
  try {
    pk.showPicker();
  } catch (_) {
    pk.focus();
    pk.click();
  }
});
/* スマホ：カレンダーのボタンの上に透明の日付入力を重ね、直接タップでiPhoneのカレンダーを開く。開く前に今の日付を入れておく */
const dtSeed = e => {
  const pk = e.target.closest && e.target.closest("[data-dtfor]");
  if (!pk) return;
  const t = document.getElementById(pk.dataset.dtfor);
  if (t) pk.value = normDate(t.value) || "";
};
document.addEventListener("touchstart", dtSeed, { passive: true, capture: true });
document.addEventListener("pointerdown", dtSeed, true);
const dtTake = e => {
  const pk = e.target.closest && e.target.closest("[data-dtfor]");
  if (!pk) return;
  const t = document.getElementById(pk.dataset.dtfor);
  if (!t || !pk.value) return;
  t.value = pk.value;
  t.dataset.prev = "";
  t.dispatchEvent(new Event("input", { bubbles: true }));
  t.dispatchEvent(new Event("change", { bubbles: true }));
};
document.addEventListener("change", dtTake);
document.addEventListener("input", dtTake);
/* 配信URL：NetflixのURLは作品ページ（/title/番号）の形に直す
   browse・検索・ジャンル画面の ?jbv=番号（PCで作品を開いたとき）・title/番号?…（共有リンク）を変換。watch/番号は1話分なのでそのまま */
function normVurl(u) {
  u = String(u || "").trim();
  const m = /^(?:https?:\/\/)?(?:www\.)?netflix\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:title\/(\d+)|[^?#]*\?(?:.*&)?jbv=(\d+))/i.exec(u);
  if (m) return `https://www.netflix.com/title/${m[1] || m[2]}`;
  /* U-NEXT：作品はSID番号。作品ページ（/title/SID…）・再生画面（/play/SID…/ED…）・後ろに ?… が付いた共有リンクを作品ページの形に */
  const un = /^(?:https?:\/\/)?video\.unext\.jp\/.*?\b(SID\d+)/i.exec(u);
  if (un) return `https://video.unext.jp/title/${un[1].toUpperCase()}`;
  return u;
}
document.addEventListener("input", e => {
  if (e.target.id !== "f-vurl") return;
  const v = normVurl(e.target.value);
  if (v !== e.target.value.trim()) {
    e.target.value = v;
    toast("配信URLを作品ページの形に直しました");
  }
});


/* ================= 起動 ================= */
/* トップへ戻る: 画面1枚分以上スクロールしたら右下に出す */
(() => {
  const btn = $("#toTop");
  let raf = 0;
  const upd = () => {
    raf = 0;
    const show = U.lockY === null && scrollY > innerHeight * 0.9;
    btn.hidden = false;
    btn.classList.toggle("hide", !show);
    btn.tabIndex = show ? 0 : -1;
    btn.setAttribute("aria-hidden", String(!show));
  };
  addEventListener(
    "scroll",
    () => {
      if (!raf) raf = requestAnimationFrame(upd);
    },
    { passive: true },
  );
  btn.addEventListener("click", () => {
    scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
  btn.hidden = false;
  btn.classList.add("hide");
  btn.tabIndex = -1;
})();
