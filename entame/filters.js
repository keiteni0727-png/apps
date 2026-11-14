/* ===================== 絞り込み（ライブラリ） =====================
   絞り込みボタンの列・下から出す選択肢・保存したフィルタと、その操作 */

/* ---------- 絞り込み：画面幅に収まる1列のボタン。押すとその項目だけ下から出す ---------- */
/* 絞り込みボタン（視聴ステータスは一覧の上の切り替え、種別は左のメニューで選ぶ） */
const FKEYS = ["vod", "time", "series", "sv", "sort"];
const FTITLE = { vod: "配信サイト", time: "時期", series: "シリーズ", sv: "保存したフィルタ", sort: "並び順・分け方" };
const SORT_IC =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/></svg>';
function fBtnLab(k) {
  const many = (lab, l, one) => (!l.length ? [lab, false] : l.length === 1 ? [one(l[0]), true] : [`${lab} ${l.length}`, true]);
  if (k === "vod") return state.vod ? [state.vod, true] : ["配信", false];
  if (k === "time") return many("時期", [...state.cour, ...state.era], v => (/^\d{4}/.test(v) ? `${v.slice(2, 4)}年${v.slice(4)}` : v === ALLYEAR ? "通年" : v));
  if (k === "series") return many("シリーズ", state.series, v => v);
  if (k === "sv") {
    const cur = svCur();
    return cur ? ["★" + cur.name, true] : ["★保存", false];
  }
  return ["", state.sort !== "new" || state.grp !== "cour"];
}
function fRowHtml(keys) {
  const btns = keys
    .map(k => {
      const [lab, on] = fBtnLab(k);
      const open = state.fOpen === k;
      if (k === "sort")
        return `<button type="button" class="fb srt${on ? " on" : ""}" data-fpop="sort" aria-expanded="${open}" aria-label="並び順：${esc(SORTS.find(x => x[0] === state.sort)[1])}">${SORT_IC}</button>`;
      return `<button type="button" class="fb${on ? " on" : ""}" data-fpop="${k}" aria-expanded="${open}"><span class="v">${esc(lab)}</span><span class="chev" aria-hidden="true">▾</span></button>`;
    })
    .join("");
  return `<div class="frow${keys.length === 1 ? " one" : ""}" style="--fc:${Math.max(1, keys.filter(k => k !== "sort").length)}">${btns}</div>`;
}
function fPopHtml(body) {
  const k = state.fOpen;
  if (!body) return "";
  return `<div class="fpop-scrim"></div><div class="fsdrop fpop" role="dialog" aria-label="${FTITLE[k]}"><div class="fpop-h"><b>${FTITLE[k]}</b><button type="button" class="u-btn sm" data-fpop="${k}">完了</button></div>${body}</div>`;
}
function vodPanelHtml() {
  const used = new Set(items.filter(ofKind).flatMap(vodsOf));
  const l = [...new Set([...VOD_TOP, ...M("vods"), ...used])].filter(v => used.has(v) || v === state.vod || VOD_TOP.includes(v));
  const n = v => items.filter(i => ofKind(i) && vodsOf(i).includes(v)).length;
  return `<div class="fgroup"><h5>配信</h5><div class="chips">${chipBtn("data-vod", "", !state.vod, "すべて")}${l.map(v => chipBtn("data-vod", v, state.vod === v, v, n(v))).join("")}</div></div>`;
}
function seriesCounts() {
  const cnt = {};
  items.forEach(i => {
    if (i.series && ofKind(i)) cnt[i.series] = (cnt[i.series] || 0) + 1;
  });
  return cnt;
}
/* シリーズの候補：入力がなければ登録済みのシリーズをすべて（作品数の多い順）、入力があれば一致するもの。枠は高さを決めて中でスクロール */
function seriesSugHtml(q) {
  const nq = norm(q);
  const cnt = seriesCounts();
  let names = Object.keys(cnt).filter(n => !state.series.includes(n));
  if (nq)
    names = names
      .filter(n => norm(n).includes(nq))
      .sort((a, b) => norm(a).indexOf(nq) - norm(b).indexOf(nq) || cnt[b] - cnt[a]);
  else names.sort((a, b) => cnt[b] - cnt[a] || a.localeCompare(b, "ja"));
  if (!names.length)
    return nq ? `<span class="hint">「${esc(q)}」に一致するシリーズはありません</span>` : `<span class="hint">登録されているシリーズはありません</span>`;
  return `<span class="hint sershd">${nq ? `一致するシリーズ ${names.length}件` : `登録済みのシリーズ ${names.length}件（作品数の多い順）`}</span><div class="serbox">${names.map(n => `<button type="button" data-seradd="${esc(n)}">${esc(n)}<small>${cnt[n]}</small></button>`).join("")}</div>`;
}
/* 絞り込みの中身：シリーズ */
function seriesPanelHtml() {
  const cnt = seriesCounts();
  return `<div class="fgroup"><h5>シリーズ <span class="hint" style="font-weight:400">複数選べます</span></h5>
      ${state.series.length ? `<div class="chips" style="margin-bottom:8px">${state.series.map(n => `<button type="button" aria-pressed="true" data-serdel="${esc(n)}">${esc(n)}<small>${cnt[n] || 0}</small> ✕</button>`).join("")}</div>` : ""}
      <input id="seriesQ" type="search" autocomplete="off" placeholder="シリーズ名で検索（例：ガンダム、こなん）" aria-label="シリーズを検索">
      <div class="chips" id="serSug">${seriesSugHtml("")}</div></div>`;
}
/* 絞り込みの中身：時期（放送クール・放送年） */
function timePanelHtml() {
  const tb = items.filter(i => ofKind(i) && seriesOk(i) && typeOk(i));
  const chip = (attr, val, cur, label, n) =>
    `<button type="button" ${attr}="${esc(val)}" aria-pressed="${val === "すべて" ? !cur.length : cur.includes(val)}">${esc(label)}${n != null ? `<small>${n}</small>` : ""}</button>`;
  const courYears = [
    ...new Set(
      items
        .flatMap(i => coursOf(i))
        .filter(c => /^\d{4}/.test(c))
        .map(c => +c.slice(0, 4)),
    ),
  ].sort((a, b) => b - a);
  const cy = courYears.includes(state.courY) ? state.courY : courYears[0];
  const yAll = SEASONS.every(se => state.cour.includes(cy + se));
  return `<div class="fgroup"><h5>放送クール</h5><div class="chips">${chip("data-cour", "すべて", state.cour, "すべて")}${chip("data-cour", ALLYEAR, state.cour, "通年", tb.filter(i => coursOf(i).includes(ALLYEAR)).length)}
      <select id="courY" aria-label="クールの年">${courYears.map(y => `<option ${y === cy ? "selected" : ""}>${y}</option>`).join("")}</select>
      <button type="button" data-couryear="${cy}" aria-pressed="${yAll}">この年すべて</button>
      ${SEASONS.map(se => {
        const key = `${cy}${se}`;
        return chip("data-cour", key, state.cour, se, tb.filter(i => coursOf(i).includes(key)).length);
      }).join("")}</div></div>
    <div class="fgroup"><h5>放送年 <span class="hint" style="font-weight:400">クール未設定の作品も</span></h5><div class="chips">${chip("data-era", "すべて", state.era, "すべて")}${eras
      .map(e => {
        const n = tb.filter(e.test).length;
        return n ? chip("data-era", e.key, state.era, e.key, n) : "";
      })
      .join("")}</div></div>`;
}


/* ---------- 保存したフィルタ（アニメ・ドラマで別々。マスタに保存するので端末をまたいで同じ） ---------- */
const SVK = ["sf", "era", "type", "cour", "series"];
const svKey = () => (state.mode === "m" || state.mode === "s" ? state.mode : curKind());
const svList = () => {
  const all = master.savedFilters || {};
  return Array.isArray(all[svKey()]) ? all[svKey()] : [];
};
function setSv(l) {
  master = { ...master, savedFilters: { ...(master.savedFilters || {}), [svKey()]: l } };
  saveMaster();
}
const sameSet = (a, b) => {
  const x = [...arrOf(a)].sort(),
    y = [...arrOf(b)].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};
const svMatch = f => SVK.every(k => sameSet(f[k], state[k])) && (f.sort || "new") === state.sort;
const svCur = () => svList().find(svMatch);
const svEmpty = () => SVK.every(k => !state[k].length) && state.sort === "new";
function svApply(f) {
  SVK.forEach(k => (state[k] = [...arrOf(f[k])]));
  state.sf = state.sf.filter(x => [...STATUSES, "未設定"].includes(x));
  state.sort = SORTS.some(([v]) => v === f.sort) ? f.sort : "new";
  const y = state.cour.find(c => /^\d{4}/.test(c));
  if (y) state.courY = +y.slice(0, 4);
  state.limit = 200;
}
/* 条件を短い文字に（保存名の候補・編集画面の説明） */
function svDesc(f) {
  const p = [];
  arrOf(f.sf).forEach(v => p.push(stLabel(v)));
  arrOf(f.series).forEach(v => p.push(v));
  arrOf(f.type).forEach(v => p.push((TYPES.find(t => t[0] === v) || [, v])[1]));
  arrOf(f.era).forEach(v => p.push(v));
  arrOf(f.cour).forEach(v => p.push(courLabel(v)));
  const so = f.sort && f.sort !== "new" ? (SORTS.find(x => x[0] === f.sort) || [, ""])[1] : "";
  return p.join("・") + (so ? `（${so}）` : "");
}
function svPanelHtml() {
  const l = svList();
  const cur = svCur();
  const head = `<h5>保存済み</h5>`;
  if (state.svMode === "new") {
    const def = state.svName ?? svDesc(state).slice(0, 24);
    return `<div class="fgroup">${head}<form id="svF" class="svform" autocomplete="off"><input id="svName" maxlength="30" placeholder="名前（例：今期の視聴中）" value="${esc(def)}" aria-label="フィルタの名前"><button type="submit" class="u-btn sm svbtn pri">保存</button><button type="button" class="u-btn sm svbtn" data-svcancel="1">やめる</button><span class="hint">今の絞り込みと並び順を保存します</span></form></div>`;
  }
  if (state.svMode === "edit" && l.length) {
    return `<div class="fgroup">${head}<div class="svlist">${l
      .map(
        (f, i) => `<div class="svrow"><input value="${esc(f.name)}" maxlength="30" data-svren="${esc(f.id)}" aria-label="名前を変更"><button type="button" class="u-btn sm svbtn" data-svmove="${esc(f.id)}:-1" ${i ? "" : "disabled"} aria-label="上へ">↑</button><button type="button" class="u-btn sm svbtn" data-svmove="${esc(f.id)}:1" ${i < l.length - 1 ? "" : "disabled"} aria-label="下へ">↓</button><button type="button" class="u-btn sm svbtn" data-svover="${esc(f.id)}" ${svEmpty() || f === cur ? "disabled" : ""}>今の条件で上書き</button><button type="button" class="u-btn sm svbtn del" data-svdel="${esc(f.id)}">削除</button><p class="cond">${esc(svDesc(f) || "条件なし")}</p></div>`,
      )
      .join("")}<div class="done"><button type="button" class="u-btn sm svbtn pri" data-svcancel="1">完了</button></div></div></div>`;
  }
  return `<div class="fgroup">${head}<div class="chips">${l.map(f => `<button type="button" data-svapply="${esc(f.id)}" aria-pressed="${f === cur}">★ ${esc(f.name)}</button>`).join("")}${cur || svEmpty() ? "" : `<button type="button" class="svadd" data-svnew="1">＋今の条件を保存</button>`}${l.length ? `<button type="button" class="svedit" data-svedit="1">編集</button>` : ""}</div></div>`;
}
function svSubmit() {
  const inp = $("#svName");
  const name = (inp ? inp.value : "").trim();
  if (!name) return toast("名前を入れてください");
  if (svEmpty()) return toast("絞り込みか並び順を選んでから保存してください");
  if (svList().some(f => f.name === name)) return toast(`「${name}」はすでにあります`);
  const f = { id: Date.now().toString(36), name, sort: state.sort };
  SVK.forEach(k => (f[k] = [...state[k]]));
  setSv([...svList(), f]);
  state.svMode = "";
  state.svName = null;
  render();
  toast(`「${name}」を保存しました`);
}
/* 保存したフィルタの操作 */
const SAVED_FILTER_ACTIONS = [
  /* ★の名前：その条件にする（今その条件ならもう一度押すと解除） */
  [
    "[data-svapply]",
    el => {
      const f = svList().find(x => x.id === el.dataset.svapply);
      if (!f) return;
      if (svMatch(f)) Object.assign(state, { sf: [], era: [], cour: [], series: [], type: [], sort: "new", limit: 200 });
      else svApply(f);
      render();
    },
  ],
  [
    "[data-svnew]",
    () => {
      state.svMode = "new";
      state.svName = null;
      render();
      const i = $("#svName");
      if (i && !TOUCH) {
        i.focus();
        i.select();
      }
    },
  ],
  [
    "[data-svedit]",
    () => {
      state.svMode = "edit";
      render();
    },
  ],
  [
    "[data-svcancel]",
    () => {
      state.svMode = "";
      state.svName = null;
      render();
    },
  ],
  /* 並び替え（id:-1 で上へ、id:1 で下へ） */
  [
    "[data-svmove]",
    el => {
      const [id, d] = el.dataset.svmove.split(":");
      const l = [...svList()];
      const i = l.findIndex(x => x.id === id),
        j = i + +d;
      if (i < 0 || j < 0 || j >= l.length) return;
      [l[i], l[j]] = [l[j], l[i]];
      setSv(l);
      render();
    },
  ],
  /* 今の条件で上書き */
  [
    "[data-svover]",
    el => {
      const id = el.dataset.svover;
      const l = svList().map(x => {
        if (x.id !== id) return x;
        const n = { ...x, sort: state.sort };
        SVK.forEach(k => (n[k] = [...state[k]]));
        return n;
      });
      setSv(l);
      render();
      toast(`「${(l.find(x => x.id === id) || {}).name}」を今の条件で上書きしました`);
    },
  ],
  [
    "[data-svdel]",
    el => {
      const old = svList();
      const f = old.find(x => x.id === el.dataset.svdel);
      if (!f) return;
      setSv(old.filter(x => x !== f));
      if (!svList().length) state.svMode = "";
      render();
      toastUndo(`「${f.name}」を削除しました`, () => {
        setSv(old);
        render();
      });
    },
  ],
];
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
      if (!TOUCH) $("#seriesQ")?.focus();
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
