/* ===================== 操作の受け付け（クリック・入力・キー）。補助は helpers.js、起動は boot.js ===================== */

/* ---------- クリック ----------
   画面ごとの「割り当て表」（[ボタンの目印, 押したときの処理]）を上から順に試し、処理したところで止める（runActions は core.js） */

/* PC：左メニューの開閉と設定の歯車 */
const SHELL_ACTIONS = [
  ["[data-gear]", el => openSettings(el.dataset.gear === "1" ? "" : el.dataset.gear)],
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
/* 左メニュー・上の切り替え・未視聴のスイッチ・見出しの開閉 */
const NAV_ACTIONS = [
  /* 番組表の曜日タブ（スマホ） */
  [
    "[data-tb]",
    el => {
      state.wday = el.dataset.tb;
      state.unOnly = false;
      go();
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
  /* スマホの下メニュー・「その他」のタイル・上の「‹」 */
  [
    "[data-bnav]",
    el => {
      const m = el.dataset.bnav;
      /* 詳細・編集を開いていたら閉じてから移る */
      if ($("#layer").innerHTML) close();
      closeDD();
      leaveXser();
      if (state.mode === m && m !== "o") {
        scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setMode(m);
      go();
    },
  ],
  /* 左メニューの名前 */
  [
    "[data-mode]",
    el => {
      const m = el.dataset.mode;
      const wasX = leaveXser();
      /* 今のメニューをもう一度押したら先頭へ（スマホの下メニューと同じ） */
      if (!wasX && state.mode === m) return scrollTo({ top: 0, behavior: "smooth" });
      setMode(m);
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
  if (e.target.closest(".fsdrop,.fsbar,.frow,.fbar,.fsh,.fsum,#layer,#subPop,.u-toast") || !e.target.isConnected) return false;
  if ((state.mode === "sr" || state.mode === "mu") && lui.fp) {
    lui.fp = "";
    lui.fSub = "";
  } else if (state.mode === "yt" && yst.fp) {
    yst.fp = "";
    yst.fSub = "";
    saveYtUI();
  } else if (state.mode !== "yt" && state.fOpen) {
    state.fSub = "";
    state.fOpen = "";
    state.fSub = "";
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
      const i = l.findIndex(x => !done(x) && aired(x));
      if (i < 0) return;
      l[i].w = true;
      l[i].wt = Date.now();
      saveWatch(it, l, [i], `${it.t.slice(0, 14)} ${l[i].n}を視聴済みにしました`);
      askSub(it, i);
    },
  ],
  [
    "[data-spdone]",
    el => {
      const it = items.find(x => x.id === el.dataset.spdone);
      if (it) setStatus(it, "視聴済み");
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
  ["#sbAdd,#hAdd", () => (state.mode === "yt" ? ytOpenForm(null) : openForm(null))],
];
/* スワイプ（共通部品 u-swipe.js）：スマホの番組表で、画面を指に合わせて横に動かし、離すと隣の曜日へ */
const segBtns = () => [...document.querySelectorAll("#main .wtabs [data-tb]")];
const segIdx = () => segBtns().findIndex(b => b.getAttribute("aria-selected") === "true");
uSwipe({
  blocked: () => !!($("#layer").innerHTML || state.fOpen || yst.fp),
  pager: {
    el: "#main",
    block: "input,select,textarea,#ddPop,.fpop,.frow,.fbar,.fsh,.fsum,.bnav,.chips,#subPop,.u-toast",
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
  renderSidebar();
  /* 番組表はPCとスマホで形が違うので、幅が変わったら描き直す */
  if (state.mode === "w") render();
});
const CLICK_HANDLERS = [
  onDDClick,
  e => runActions(SHELL_ACTIONS, e),
  onSettingsClick,
  e => runActions(NAV_ACTIONS, e),
  closeDropdownOnOutsideClick,
  e => state.mode !== "yt" && runActions(SHEET_ACTIONS, e),
  onSubPopClick,
  e => state.mode === "yt" && runActions(YT_ACTIONS, e),
  e => (state.mode === "sr" || state.mode === "mu") && runActions(LIST_ACTIONS, e),
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
  /* 各話リストの貼り付け：日付も更新・ない話も追加 */
  /* 更新する項目（サブタイトル・放送日・話数） */
  [
    "[data-spu]",
    t => {
      if (!subPaste) return false;
      subPaste[t.dataset.spu] = t.checked;
      refreshSheet();
    },
  ],
  /* 上から順に合わせるとき、最初に合わせる話 */
  [
    "#spFrom",
    t => {
      if (!subPaste || !subPaste.parsed) return false;
      subPaste.from = +t.value;
      const it = items.find(x => x.id === openId);
      if (it) pasteRows(it);
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
  /* 開始日：入力中の欄を消さないよう、日付で変わる所（放送曜日の案内・放送クールの候補）だけ描き直す
     （全体を作り直すと、iPhoneでキーボードが閉じて画面が上に戻ってしまうため） */
  [
    "#f-from",
    () => {
      if (!form) return false;
      readForm();
      redrawParts(["#schedHint", "#coursBox"]);
    },
  ],
  [
    ".sg-t",
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
      const day = normDate(t.value);
      if (!day) {
        l[i].t = 0;
        return refreshEditor();
      }
      const hm = l[i].t ? jst(l[i].t).hm : hasTime(it) ? it.time : "9:00";
      if (!l[i].t) l[i].nt = !hasTime(it);
      const t0 = dayTimeToT(day, hm);
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
      if (t.id === "f-time") form.time = t.value;
      else form.from = normDate(t.value) || "";
      updSched();
    },
  ],
  [
    "#ddq",
    t => {
      const l = $("#ddList");
      if (l && ddOpen) l.innerHTML = ddRows(ddOpen, t.value);
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
  /* 整形の表：マスを直す（描き直さず、話数が読めるかの色だけ変える） */
  [
    "[data-g]",
    t => {
      const g = subPaste && subPaste.grid;
      if (!g) return false;
      const [i, j] = t.dataset.g.split(":").map(Number);
      const r = g.rows[i];
      if (!r || !g.cols) return;
      gSet(r, j, t.value);
      if (g.cols[j] === "n") t.closest("tr").classList.toggle("bad", gBad(g, r));
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
      if (t.classList.contains("er-n")) {
        const x = epEdit.list[i];
        if (t.value.trim()) Object.assign(x, parseEpIn(t.value));
        else x.n = t.dataset.orig || x.n;
        t.classList.remove("epbad");
      }
      if (t.classList.contains("er-s")) epEdit.list[i].sub = t.value;
    },
  ],
];
document.addEventListener("input", e => runInputs(INPUT_ACTIONS, e));
/* 話数の編集：話数を変えたら（欄を離れたとき）抜け・重複の表示を描き直す */
document.addEventListener("change", e => {
  if (epEdit && e.target.classList && e.target.classList.contains("er-n")) refreshEditor();
});
let sTimer = 0;
function searchSoon() {
  clearTimeout(sTimer);
  sTimer = setTimeout(render, 120);
}
/* 変換を確定した直後の時刻。Safari などは確定の Enter が「変換中ではない Enter」として届くので、その Enter を見分ける */
let compEndAt = 0;
document.addEventListener("compositionend", e => {
  compEndAt = Date.now();
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
/* 変換の確定の Enter：変換中フラグ・keyCode 229（Safari）・確定の直後に届いた Enter のどれか */
const imeEnter = e => e.isComposing || e.keyCode === 229 || Date.now() - compEndAt < 60;
const isEnter = e => e.key === "Enter" && !imeEnter(e);
/* 編集画面の入力欄で、変換の確定の Enter によってフォームが送信（保存）されないようにする */
document.addEventListener(
  "keydown",
  e => {
    if (e.key !== "Enter" || e.isComposing || !imeEnter(e)) return;
    const t = e.target;
    if (t && t.tagName === "INPUT" && t.form) e.preventDefault();
  },
  true,
);
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
  /* プルダウンを開いているとき：Escで閉じる・検索欄でEnterなら一番上の候補を選ぶ */
  [null, (t, e) => (e.key === "Escape" && ddOpen ? (e.preventDefault(), closeDD(true), true) : false)],
  ["#ddq", enterClick("#ddList [data-ddpick],#ddList [data-ddsernew]")],
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
  /* 絞り込みシート：Escで選択肢 → シートの順に閉じる。検索欄はEscでキャンセル */
  [
    null,
    (t, e) => {
      const open = state.mode === "yt" ? yst.fp === "all" : state.mode === "sr" || state.mode === "mu" ? lui.fp === "all" : state.fOpen === "all";
      if (e.key !== "Escape" || !open || $("#layer").innerHTML) return false;
      e.preventDefault();
      document.querySelector(document.querySelector(".fsh-sub") ? ".fsh-back" : ".fsh-x")?.click();
      return true;
    },
  ],
  ["#q", (t, e) => (e.key === "Escape" ? ($("[data-qtog='0']")?.click(), true) : false)],
  ["#lq", (t, e) => (e.key === "Escape" ? ($("[data-lqtog='0']")?.click(), true) : false)],
  ["#ytq", (t, e) => (e.key === "Escape" ? ($("[data-ytqtog='0']")?.click(), true) : false)],
  [".e1 input", enterEsc(() => $("#e1Save")?.click(), () => $("#e1Cancel")?.click())],
  [null, (t, e) => (e.key === "Escape" && form && form.inline ? closeInlineForm() : false)],
  [null, (t, e) => (e.key === "Escape" && yform && yform.inline ? ytCloseInline() || true : false)],
  [null, (t, e) => (e.key === "Escape" ? close() : false)],
  ["#f-serq", enterClick("#fSerSug [data-fser]")],
  ["#f-sernew", enterClick("[data-fsercreate]")],
  ["#seriesQ", enterClick("#serSug [data-seradd]")],
];
document.addEventListener("keydown", e => runInputs(KEY_ACTIONS, e));
