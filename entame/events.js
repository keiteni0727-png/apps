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
/* 画面の切り替え：左メニュー（番組表・アニメ…）を選ぶ。絞り込みとシリーズは外す */
function setMode(m) {
  if (state.mode === m) return;
  state.mode = m;
  state.sub = "all";
  state.wday = "";
  state.xser = false;
  if (m === "w" || m === "yt") return;
  if (m === "m" || m === "s") state.type = [];
  state.limit = 200;
  state.series = [];
}
/* 画面を変えて先頭から表示 */
const go = () => {
  render();
  scrollTo(0, 0);
};
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
/* シリーズの作品一覧を開く（アニメ・ドラマ・映画・配信をまたいで出す）。g＝番組表・YouTubeから開いたときに使うメニュー */
function showSeries(name, g) {
  close();
  if (state.mode === "w" || state.mode === "yt") setMode(g === "d" ? "d" : "a");
  Object.assign(state, { series: [name], xser: true, sf: [], era: [], cour: [], type: [], sort: "old", limit: 200 });
  go();
}
/* ライブラリの絞り込み・並び順 */
const FILTER_ACTIONS = [
  /* 絞り込みボタン：押すとその項目の選択肢を出す／閉じる */
  [
    "[data-fpop]",
    el => {
      const v = el.dataset.fpop;
      state.fOpen = state.fOpen === v ? "" : v;
      state.svMode = "";
      state.svName = null;
      render();
    },
  ],
  [
    "[data-couryear]",
    el => {
      const ks = SEASONS.map(se => el.dataset.couryear + se);
      const all = ks.every(k => state.cour.includes(k));
      state.cour = all ? state.cour.filter(c => !ks.includes(c)) : [...new Set([...state.cour, ...ks])];
      state.limit = 200;
      render();
    },
  ],
  [
    "[data-era]",
    el => {
      state.era = el.dataset.era === "すべて" ? [] : toggle(state.era, el.dataset.era);
      state.limit = 200;
      render();
    },
  ],
  [
    "[data-seradd]",
    el => {
      state.series = [...state.series, el.dataset.seradd];
      if (state.sort === "new") state.sort = "old";
      state.limit = 200;
      render();
      $("#seriesQ")?.focus();
    },
  ],
  [
    "[data-serdel]",
    el => {
      state.series = state.series.filter(x => x !== el.dataset.serdel);
      state.limit = 200;
      render();
    },
  ],
  [
    "[data-cour]",
    el => {
      state.cour = el.dataset.cour === "すべて" ? [] : toggle(state.cour, el.dataset.cour);
      state.limit = 200;
      render();
    },
  ],
  /* 作品詳細の「シリーズ作品」 */
  [
    "[data-series]",
    el => {
      const it = items.find(x => x.id === openId);
      showSeries(el.dataset.series, it && it.k === "d" ? "d" : "a");
    },
  ],
  /* 一覧の上の視聴ステータス（1つだけ選ぶ。同じものをもう一度押すと「すべて」） */
  [
    "[data-stf]",
    el => {
      const v = el.dataset.stf;
      state.sf = !v || (state.sf.length === 1 && state.sf[0] === v) ? [] : [v];
      state.limit = 200;
      saveUI();
      render();
    },
  ],
  [
    "[data-xseroff]",
    () => {
      state.xser = false;
      render();
    },
  ],
  [
    "[data-grp]",
    el => {
      state.grp = el.dataset.grp;
      state.limit = 200;
      state.fOpen = "";
      saveUI();
      render();
    },
  ],
  [
    "[data-sort]",
    el => {
      state.sort = el.dataset.sort;
      state.fOpen = "";
      saveUI();
      render();
    },
  ],
  /* 条件をすべて解除 */
  [
    "[data-unset]",
    () => {
      Object.assign(state, { sf: [], era: [], cour: [], series: [], type: [], vod: "", limit: 200 });
      render();
    },
  ],
];
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
document.addEventListener("submit", e => {
  if (e.target.id === "svF") {
    e.preventDefault();
    svSubmit();
    return;
  }
  if (e.target.id === "ytF") {
    e.preventDefault();
    ytSubmit();
    return;
  }
  if (e.target.id === "titleF") {
    e.preventDefault();
    submitForm();
  }
});
document.addEventListener("change", e => {
  if (e.target.id === "arcJump") {
    const it = items.find(x => x.id === openId);
    const k = +e.target.value;
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
    return;
  }
  if (e.target.dataset && e.target.dataset.svren) {
    const id = e.target.dataset.svren,
      name = e.target.value.trim();
    const f = svList().find(x => x.id === id);
    if (!f) return;
    if (!name || svList().some(x => x.id !== id && x.name === name)) {
      e.target.value = f.name;
      toast(name ? `「${name}」はすでにあります` : "名前を入れてください");
      return;
    }
    if (name !== f.name) {
      setSv(svList().map(x => (x.id === id ? { ...x, name } : x)));
      render();
      toast("名前を変更しました");
    }
    return;
  }
  if (e.target.classList.contains("inl") && e.target.type === "date") {
    commitInline(e.target);
    return;
  }
  if (e.target.id === "spDate" && subPaste) {
    subPaste.useDate = e.target.checked;
    refreshSheet();
    return;
  }
  if (e.target.id === "spAdd" && subPaste) {
    subPaste.addMissing = e.target.checked;
    refreshSheet();
    return;
  }
  if (e.target.id === "f-from" && form) {
    readForm();
    redrawForm();
    return;
  }
  if (e.target.classList.contains("nof") && form) {
    readForm();
    const h = $("#schedHint");
    if (h) h.innerHTML = schedText();
    return;
  }
  /* 曲の種類を変えたら、その種類の区切りへ移す */
  if (e.target.classList.contains("sg-t") && form) {
    readForm();
    redrawForm();
    return;
  }
  if (e.target.id === "f-cy" && form) {
    form.cy = +e.target.value;
    return;
  }
  if (e.target.id === "courY") {
    state.courY = +e.target.value;
    saveUI();
    render();
    return;
  }
  if (e.target.classList.contains("er-d") && epEdit) {
    const it = items.find(x => x.id === openId);
    const i = +e.target.closest("[data-er]").dataset.er;
    const l = epEdit.list;
    if (!e.target.value) {
      l[i].t = 0;
      refreshEditor();
      return;
    }
    const hm = l[i].t ? jst(l[i].t).hm : hasTime(it) ? it.time : "9:00";
    if (!l[i].t) l[i].nt = !hasTime(it);
    const t0 = dayTimeToT(e.target.value, hm);
    l.forEach(x => (x.moved = false));
    for (let k = i; k < l.length; k++) {
      const keep = l[k].t ? jst(l[k].t).hm : hm; // each episode keeps its own time of day
      l[k].t = t0 + WEEK * (k - i) - (mins(hm) - mins(keep));
      l[k].moved = k > i;
    }
    refreshEditor();
    return;
  }
});
document.addEventListener("input", e => {
  if (e.target.id === "svName") {
    state.svName = e.target.value;
    return;
  }
  if ((e.target.id === "f-time" || e.target.id === "f-from") && form) {
    form[e.target.id === "f-time" ? "time" : "from"] = e.target.value;
    const h = $("#schedHint");
    if (h) h.innerHTML = schedText();
    return;
  }
  if (e.target.id === "f-serq" && form) {
    const b = $("#fSerSug");
    if (b) b.innerHTML = serSugForm(e.target.value);
    return;
  }
  if (e.target.id === "spText" && subPaste) {
    subPaste.text = e.target.value;
    return;
  }
  if (e.target.id === "seriesQ") {
    const b = $("#serSug");
    if (b) b.innerHTML = seriesSugHtml(e.target.value);
    return;
  }
  if (e.target.id === "y-up") {
    const p = parseDay(e.target.value);
    const m = $("#yUpMsg");
    if (m) m.textContent = e.target.value.trim() && p === null ? "日付を読み取れません（例：2024/03/08）" : "";
    return;
  }
  if (e.target.id === "y-dur") {
    const m = $("#yDurMsg");
    if (m) {
      const v = parseDur(e.target.value);
      m.textContent = v && v !== e.target.value.trim() ? "→ " + v : "";
    }
    return;
  }
  if (e.target.id === "mq") {
    setQ = e.target.value;
    if (!e.isComposing) refreshSettings(false);
    return;
  }
  if (e.target.id === "ytq") {
    yst.q = e.target.value;
    if (!e.isComposing) searchSoon();
    return;
  }
  if (e.target.id === "q") {
    state.q = e.target.value;
    state.limit = 200;
    if (!e.isComposing) searchSoon();
    return;
  }
  if (epEdit && e.target.closest("[data-er]")) {
    const i = +e.target.closest("[data-er]").dataset.er;
    if (e.target.classList.contains("er-n")) epEdit.list[i].n = e.target.value;
    if (e.target.classList.contains("er-s")) epEdit.list[i].sub = e.target.value;
  }
});
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
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.dataset && e.target.dataset.svren && !e.isComposing) {
    e.preventDefault();
    e.target.blur();
    return;
  }
  if (e.target.classList && e.target.classList.contains("mren")) {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      commitRename(true);
    }
    return;
  }
  if (e.target.id === "maddIn" && e.key === "Enter" && !e.isComposing) {
    e.preventDefault();
    document.querySelector("[data-madd]")?.click();
    return;
  }
  if (e.target.id === "spopIn") {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      saveSub();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeSub();
    }
    return;
  }
  if (e.key === "Escape" && subAsk) {
    closeSub();
    return;
  }
  if (e.target.classList && e.target.classList.contains("inl")) {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      commitInline(e.target);
    } else if (e.key === "Escape") {
      e.preventDefault();
      commitInline(e.target, true);
    }
    return;
  }
  if (e.key === "Escape" && form && form.inline) {
    closeInlineForm();
    return;
  }
  if (e.key === "Escape") close();
  if (e.key === "Enter" && e.target.id === "f-serq") {
    e.preventDefault();
    document.querySelector("#fSerSug [data-fser]")?.click();
    return;
  }
  if (e.key === "Enter" && e.target.id === "f-sernew") {
    e.preventDefault();
    document.querySelector("[data-fsercreate]")?.click();
    return;
  }
  if (e.key === "Enter" && e.target.id === "seriesQ") {
    e.preventDefault();
    const b = document.querySelector("#serSug [data-seradd]");
    if (b) b.click();
  }
});

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
