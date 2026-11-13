/* ---------- クリック ----------
   画面ごとの「割り当て表」（[ボタンの目印, 押したときの処理]）を上から順に試し、処理したところで止める（runActions は core.js） */

/* PC：左メニューの開閉と設定の歯車 */
const SHELL_ACTIONS = [
  ["#gearBtn,[data-gear]", () => openSettings()],
  [
    "[data-sbtog]",
    () => {
      sbCollapsed = !sbCollapsed;
      ls.set("adb.v3.sbc", sbCollapsed);
      document.body.classList.toggle("sbc", sbCollapsed);
      renderSidebar();
    },
  ],
];
/* 左メニュー・上の切り替え・未視聴／未入力のスイッチ・見出しの開閉 */
const NAV_ACTIONS = [
  /* ▸▾：メニューの下の項目を開く（開くとほかはたたむ）／たたむ */
  [
    "[data-sbfold]",
    el => {
      const m = el.dataset.sbfold;
      if (sbFold.has(m)) sbOnly(m);
      else {
        sbFold.add(m);
        ls.set("adb.v3.sbf", [...sbFold]);
      }
      renderSidebar();
    },
  ],
  /* アニメ・ドラマの下：TV・映画などの種別 */
  [
    "[data-tygo]",
    el => {
      setMode(el.dataset.go);
      state.type = el.dataset.tygo ? [el.dataset.tygo] : [];
      state.limit = 200;
      go();
    },
  ],
  /* 配信の下：アニメ／ドラマ・バラエティ */
  [
    "[data-skgo]",
    el => {
      setMode("s");
      state.sub = el.dataset.skgo;
      state.limit = 200;
      go();
    },
  ],
  /* 映画の下：アニメ映画／実写映画 */
  [
    "[data-mk]",
    el => {
      if (el.dataset.go) setMode(el.dataset.go);
      state.sub = el.dataset.mk;
      state.limit = 200;
      render();
    },
  ],
  /* 上の切り替え：YouTubeは投稿者、映画はアニメ映画／実写、番組表は曜日 */
  [
    "[data-tb]",
    el => {
      const v = el.dataset.tb;
      if (el.dataset.go) setMode(el.dataset.go);
      if (state.mode === "yt") {
        yst.author = v;
        saveYtUI();
      } else if (state.mode === "m") {
        state.sub = v;
        state.limit = 200;
      } else if (state.mode === "w") {
        state.wday = v;
        state.unOnly = false;
      }
      go();
    },
  ],
  [
    "[data-missw]",
    () => {
      state.missOnly = !state.missOnly;
      state.missKey = "";
      saveUI();
      render();
    },
  ],
  [
    "[data-mkey]",
    el => {
      const k = el.dataset.mkey;
      state.missKey = state.missKey === k ? "" : k;
      saveUI();
      render();
    },
  ],
  [
    "[data-unsw]",
    () => {
      state.unOnly = !state.unOnly;
      saveUI();
      render();
    },
  ],
  [
    "[data-vod]",
    el => {
      const v = el.dataset.vod;
      state.vod = state.vod === v ? "" : v;
      state.limit = 200;
      state.fOpen = "";
      render();
    },
  ],
  /* 左メニューの名前：そのメニューの「すべて」 */
  [
    "[data-mode]",
    el => {
      const m = el.dataset.mode;
      sbOnly(m);
      renderSidebar();
      if (state.mode === m && !state.type.length && state.sub === "all") return;
      setMode(m);
      state.type = [];
      state.sub = "all";
      go();
    },
  ],
  /* 見出しの開閉・すべて開く／閉じる */
  [
    "[data-gtog]",
    el => {
      const k = el.dataset.gtog;
      collapsed.has(k) ? collapsed.delete(k) : collapsed.add(k);
      saveCol();
      render();
    },
  ],
  [
    "[data-gall]",
    el => {
      JSON.parse(el.dataset.keys || "[]").forEach(k => (el.dataset.gall === "close" ? collapsed.add(k) : collapsed.delete(k)));
      saveCol();
      render();
    },
  ],
];
/* フィルタ・ソートの折りたたみは、外を押したら閉じる */
function closeDropdownOnOutsideClick(e) {
  if (e.target.closest(".fsdrop,.fsbar,.svbar,.frow,#layer,#subPop,.u-toast") || !e.target.isConnected) return false;
  if (state.mode === "yt" && yst.fp) {
    yst.fp = "";
    saveYtUI();
  } else if (state.mode !== "yt" && state.fOpen) {
    state.fOpen = "";
    state.svMode = "";
    state.svName = null;
    saveUI();
  } else return false;
  render();
  return !e.target.closest("header");
}
/* サブタイトル入力の小さな画面 */
function onSubPopClick(e) {
  if (!e.target.closest("#subPop")) return false;
  if (e.target.closest("[data-spopok]")) saveSub();
  else if (e.target.closest("[data-spopx]")) closeSub();
  return true;
}
/* 番組表・ライブラリの行：✓ボタンで次の話を視聴済にする、行を押すと詳細 */
const ROW_ACTIONS = [
  [
    "[data-tick]",
    el => {
      const it = items.find(x => x.id === el.dataset.tick);
      if (!it) return;
      const l = episodes(it);
      const i = l.findIndex(x => !x.w && aired(x));
      if (i < 0) return;
      l[i].w = true;
      saveEps(it, l, `${it.t.slice(0, 14)} ${l[i].n}を視聴済みにしました`);
      askSub(it, i);
    },
  ],
  ["[data-id]", el => openDetail(el.dataset.id)],
];
/* もっと見る・戻る・閉じる・追加 */
const COMMON_ACTIONS = [
  [
    "#more",
    () => {
      state.limit += 300;
      render();
    },
  ],
  [
    "[data-back]",
    () => {
      const id = form && form.id,
        yid = yform && yform.id;
      close();
      if (id) openDetail(id);
      else if (yid) ytOpenDetail(yid);
    },
  ],
  ["[data-close]", () => close()],
  ["#addBtn,#sbAdd", () => (state.mode === "yt" ? ytOpenForm(null) : openForm(null))],
];
/* スマホ：☰メニューの開閉。メニュー内で画面を選んだら閉じる */
function setDrawer(on) {
  document.body.classList.toggle("drawer", on);
  const b = document.querySelector(".hmenu");
  if (b) b.setAttribute("aria-expanded", on);
}
function onDrawerClick(e) {
  const d = e.target.closest("[data-drawer]");
  if (d) {
    if (d.dataset.drawer === "open") renderSidebar();
    setDrawer(d.dataset.drawer === "open");
    return true;
  }
  if (document.body.classList.contains("drawer") && e.target.closest("#sb [data-mode],#sb [data-go],#sb [data-tb],#sb [data-gear]"))
    setDrawer(false);
  return false;
}
/* スワイプ（共通部品 u-swipe.js）：メニューは指に合わせて開閉、画面は指に合わせて横に動かし、離すと番組表／ライブラリなど隣の画面へ */
const segBtns = () => [...document.querySelectorAll("#hseg [data-tb]")];
const segIdx = () => segBtns().findIndex(b => b.getAttribute("aria-selected") === "true");
uSwipe({
  sb: "#sb",
  scrim: ".dscrim",
  setDrawer,
  edge: 24,
  blocked: () => !!($("#layer").innerHTML || state.fOpen || yst.fp),
  pager: {
    el: "#main",
    block: "input,select,textarea,.fpop,.frow,.hseg,.vodbar,.svbar,.chips,#subPop,.u-toast",
    can: dir => {
      const i = segIdx();
      return i >= 0 && i + dir >= 0 && i + dir < segBtns().length;
    },
    go: dir => {
      const b = segBtns()[segIdx() + dir];
      if (b) b.click();
    },
  },
});
matchMedia("(max-width:899px)").addEventListener("change", () => {
  setDrawer(false);
  renderSidebar();
  /* 未入力の絞り込みはPCだけ・番組表はPCとスマホで形が違うので、幅が変わったら描き直す */
  if (state.missOnly || state.mode === "w") render();
});
const CLICK_HANDLERS = [
  onDrawerClick,
  e => runActions(SHELL_ACTIONS, e),
  onSettingsClick,
  e => runActions(NAV_ACTIONS, e),
  closeDropdownOnOutsideClick,
  onSubPopClick,
  e => state.mode === "yt" && runActions(YT_ACTIONS, e),
  e => runActions(ROW_ACTIONS, e),
  e => state.mode !== "yt" && runActions(SAVED_FILTER_ACTIONS, e),
  e => runActions(FILTER_ACTIONS, e),
  onTitleFormClick,
  onDetailClick,
  e => runActions(COMMON_ACTIONS, e),
];
document.addEventListener("click", e => {
  for (const h of CLICK_HANDLERS) if (h(e)) return;
});
/* ---------- 入力欄 ----------
   [入力欄のセレクタ, 処理(入力欄, イベント)] を上から順に試し、当てはまって処理した最初の1つで止める（null は毎回試す。false を返したら次へ） */
function runInputs(table, e) {
  const t = e.target;
  if (!t || !t.matches) return;
  for (const [sel, fn] of table) if ((!sel || t.matches(sel)) && fn(t, e) !== false) return;
}
const updSched = () => {
  const h = $("#schedHint");
  if (h) h.innerHTML = schedText();
};
document.addEventListener("submit", e => {
  const f = { svF: svSubmit, ytF: ytSubmit, titleF: submitForm }[e.target.id];
  if (!f) return;
  e.preventDefault();
  f();
});
/* 値を決めたとき（選択・チェック・日付・入力欄を離れたとき） */
const CHANGE_ACTIONS = [
  /* 編へ移動：その編を開いて先頭までスクロール */
  [
    "#arcJump",
    t => {
      const it = items.find(x => x.id === openId);
      const k = +t.value;
      const r = it && arcsOf(it)[k];
      if (!r) return;
      arcFold.set(arcKey(r), true);
      refreshSheet();
      const sh = $("#layer .sheet"),
        h = $("#arc-" + k);
      if (sh && h) {
        const hd = sh.querySelector(".dhead");
        sh.scrollTop += h.getBoundingClientRect().top - sh.getBoundingClientRect().top - (hd ? hd.offsetHeight : 0) - 8;
      }
    },
  ],
  /* 保存したフィルタの名前を変更 */
  [
    "[data-svren]",
    t => {
      const id = t.dataset.svren,
        name = t.value.trim();
      const f = svList().find(x => x.id === id);
      if (!f) return;
      if (!name || svList().some(x => x.id !== id && x.name === name)) {
        t.value = f.name;
        return toast(name ? `「${name}」はすでにあります` : "名前を入れてください");
      }
      if (name === f.name) return;
      setSv(svList().map(x => (x.id === id ? { ...x, name } : x)));
      render();
      toast("名前を変更しました");
    },
  ],
  ['input.inl[type="date"]', t => commitInline(t)],
  /* 各話リストの貼り付け：日付も更新・ない話も追加 */
  [
    "#spDate",
    t => {
      if (!subPaste) return false;
      subPaste.useDate = t.checked;
      refreshSheet();
    },
  ],
  [
    "#spAdd",
    t => {
      if (!subPaste) return false;
      subPaste.addMissing = t.checked;
      refreshSheet();
    },
  ],
  /* 編集画面：開始日（放送クールの候補が変わる）・「なし」・曲の種類（その種類の区切りへ移す）・クールの年 */
  [
    "#f-from,.sg-t",
    () => {
      if (!form) return false;
      readForm();
      redrawForm();
    },
  ],
  [
    ".nof",
    () => {
      if (!form) return false;
      readForm();
      updSched();
    },
  ],
  [
    "#f-cy",
    t => {
      if (!form) return false;
      form.cy = +t.value;
    },
  ],
  /* 絞り込み：放送クールの年 */
  [
    "#courY",
    t => {
      state.courY = +t.value;
      saveUI();
      render();
    },
  ],
  /* 話数の編集：日付を変えたら、その後の話も1週間おきにずらす（時刻はそれぞれのまま） */
  [
    ".er-d",
    t => {
      if (!epEdit) return false;
      const it = items.find(x => x.id === openId);
      const i = +t.closest("[data-er]").dataset.er;
      const l = epEdit.list;
      if (!t.value) {
        l[i].t = 0;
        return refreshEditor();
      }
      const hm = l[i].t ? jst(l[i].t).hm : hasTime(it) ? it.time : "9:00";
      if (!l[i].t) l[i].nt = !hasTime(it);
      const t0 = dayTimeToT(t.value, hm);
      l.forEach(x => (x.moved = false));
      for (let k = i; k < l.length; k++) {
        const keep = l[k].t ? jst(l[k].t).hm : hm;
        l[k].t = t0 + WEEK * (k - i) - (mins(hm) - mins(keep));
        l[k].moved = k > i;
      }
      refreshEditor();
    },
  ],
];
document.addEventListener("change", e => runInputs(CHANGE_ACTIONS, e));
/* 1文字打つごと */
const INPUT_ACTIONS = [
  ["#svName", t => void (state.svName = t.value)],
  [
    "#f-time,#f-from",
    t => {
      if (!form) return false;
      form[t.id === "f-time" ? "time" : "from"] = t.value;
      updSched();
    },
  ],
  [
    "#f-serq",
    t => {
      if (!form) return false;
      const b = $("#fSerSug");
      if (b) b.innerHTML = serSugForm(t.value);
    },
  ],
  [
    "#spText",
    t => {
      if (!subPaste) return false;
      subPaste.text = t.value;
    },
  ],
  [
    "#seriesQ",
    t => {
      const b = $("#serSug");
      if (b) b.innerHTML = seriesSugHtml(t.value);
    },
  ],
  [
    "#y-up",
    t => {
      const m = $("#yUpMsg");
      if (m) m.textContent = t.value.trim() && parseDay(t.value) === null ? "日付を読み取れません（例：2024/03/08）" : "";
    },
  ],
  [
    "#y-dur",
    t => {
      const m = $("#yDurMsg");
      if (!m) return;
      const v = parseDur(t.value);
      m.textContent = v && v !== t.value.trim() ? "→ " + v : "";
    },
  ],
  /* 検索（日本語の変換中は待つ） */
  [
    "#mq",
    (t, e) => {
      setQ = t.value;
      if (!e.isComposing) refreshSettings(false);
    },
  ],
  [
    "#ytq",
    (t, e) => {
      yst.q = t.value;
      if (!e.isComposing) searchSoon();
    },
  ],
  [
    "#q",
    (t, e) => {
      state.q = t.value;
      state.limit = 200;
      if (!e.isComposing) searchSoon();
    },
  ],
  /* 話数の編集：話数・サブタイトル */
  [
    "[data-er] input",
    t => {
      if (!epEdit) return false;
      const i = +t.closest("[data-er]").dataset.er;
      if (t.classList.contains("er-n")) epEdit.list[i].n = t.value;
      if (t.classList.contains("er-s")) epEdit.list[i].sub = t.value;
    },
  ],
];
document.addEventListener("input", e => runInputs(INPUT_ACTIONS, e));
let sTimer = 0;
function searchSoon() {
  clearTimeout(sTimer);
  sTimer = setTimeout(render, 120);
}
document.addEventListener("compositionend", e => {
  if (e.target.id === "q") {
    state.q = e.target.value;
    state.limit = 200;
    searchSoon();
  }
  if (e.target.id === "ytq") {
    yst.q = e.target.value;
    searchSoon();
  }
});
/* キー：Enter（日本語の変換中は除く）で決定、Escで取り消し・閉じる */
const isEnter = e => e.key === "Enter" && !e.isComposing;
/* Enter／Esc で別々の処理をする入力欄 */
const enterEsc = (onEnter, onEsc) => (t, e) => {
  if (isEnter(e)) {
    e.preventDefault();
    onEnter(t);
  } else if (e.key === "Escape") {
    e.preventDefault();
    onEsc(t);
  }
};
/* Enter で、そのボタンを押したことにする */
const enterClick = sel => (t, e) => {
  if (!isEnter(e)) return false;
  e.preventDefault();
  document.querySelector(sel)?.click();
};
const KEY_ACTIONS = [
  [
    "[data-svren]",
    (t, e) => {
      if (!isEnter(e)) return false;
      e.preventDefault();
      t.blur();
    },
  ],
  [".mren", enterEsc(() => commitRename(), () => commitRename(true))],
  ["#maddIn", enterClick("[data-madd]")],
  ["#spopIn", enterEsc(saveSub, closeSub)],
  [null, (t, e) => (e.key === "Escape" && subAsk ? closeSub() : false)],
  [".inl", enterEsc(t => commitInline(t), t => commitInline(t, true))],
  [null, (t, e) => (e.key === "Escape" && form && form.inline ? closeInlineForm() : false)],
  [null, (t, e) => (e.key === "Escape" ? close() : false)],
  ["#f-serq", enterClick("#fSerSug [data-fser]")],
  ["#f-sernew", enterClick("[data-fsercreate]")],
  ["#seriesQ", enterClick("#serSug [data-seradd]")],
];
document.addEventListener("keydown", e => runInputs(KEY_ACTIONS, e));

document.addEventListener("focusout", e => {
  if (e.target.classList && e.target.classList.contains("inl")) commitInline(e.target);
});
/* 日付の入力：20180825・2018/8/25・2018.8.25・2018年8月25日・8/25（今年）を打ち込むと 2018-08-25 に直す。
   8けたの数字は打ち終わった時点で、それ以外は入力欄を離れたときに変換。正しくない日付は元に戻す */
function normDate(v) {
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
  else if ((x = /^(\d{1,2})[\/.\-月](\d{1,2})日?$/.exec(v))) {
    y = new Date().getFullYear();
    [, m, d] = x;
  } else return null;
  const dt = new Date(+y, +m - 1, +d);
  if (dt.getFullYear() !== +y || dt.getMonth() !== +m - 1 || dt.getDate() !== +d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
document.addEventListener("focusin", e => {
  if (e.target.classList && e.target.classList.contains("dtx")) e.target.dataset.prev = e.target.value;
});
document.addEventListener(
  "input",
  e => {
    const el = e.target;
    if (!el.classList || !el.classList.contains("dtx")) return;
    if (/^[0-9０-９]{8}$/.test(el.value.trim())) {
      const n = normDate(el.value);
      if (n) {
        el.value = n;
        el.dataset.prev = n;
        el.dispatchEvent(new Event("change", { bubbles: true }));
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
    const n = normDate(el.value);
    if (n === null) {
      e.stopImmediatePropagation();
      toast("日付は 20180825 のように入力してください");
      el.value = el.dataset.prev || "";
      return;
    }
    if (n !== el.value) el.value = n;
    if (n === el.dataset.prev && e.isTrusted === false) return;
    el.dataset.prev = n;
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
document.addEventListener("change", e => {
  const pk = e.target.closest && e.target.closest("[data-dtfor]");
  if (!pk) return;
  const t = document.getElementById(pk.dataset.dtfor);
  if (!t || !pk.value) return;
  t.value = pk.value;
  t.dataset.prev = "";
  t.dispatchEvent(new Event("input", { bubbles: true }));
  t.dispatchEvent(new Event("change", { bubbles: true }));
});
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
    const show = lockY === null && scrollY > innerHeight * 0.9;
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
render();
initStore();
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
