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
      <span class="cyb" role="group" aria-label="クールの年"><button type="button" data-couryb="1" aria-label="前の年" ${courYears.indexOf(cy) >= courYears.length - 1 ? "disabled" : ""}>‹</button><b>${cy}年</b><button type="button" data-couryb="-1" aria-label="次の年" ${courYears.indexOf(cy) <= 0 ? "disabled" : ""}>›</button></span>
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
        f => `<div class="svrow" data-sortrow data-svid="${esc(f.id)}">${GRIP("sv")}<input value="${esc(f.name)}" maxlength="30" data-svren="${esc(f.id)}" aria-label="名前を変更"><button type="button" class="u-btn sm svbtn" data-svover="${esc(f.id)}" ${svEmpty() || f === cur ? "disabled" : ""}>今の条件で上書き</button><button type="button" class="u-btn sm svbtn del" data-svdel="${esc(f.id)}">削除</button><p class="cond">${esc(svDesc(f) || "条件なし")}</p></div>`,
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
      if (state.fSub === "st" && Date.now() - fSubOpenedAt < 300) return;
      state.sf = !v || (state.sf.length === 1 && state.sf[0] === v) ? [] : [v];
      state.fSub = "";
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
      Object.assign(state, { sf: [], era: [], cour: [], series: [], type: [], vod: "", missOnly: false, missKey: "", fSub: "", limit: 200 });
      if (state.mode === "m") state.sub = "all";
      saveUI();
      render();
    },
  ],
];

/* 保存したフィルタの並び替え：⠿を押さえたまま上下に動かす（しくみは core.js の GRIP） */
SORT_DONE.sv = (box, rows) => {
  const l = svList();
  const ids = rows.map(r => r.dataset.svid);
  const nl = ids.map(id => l.find(x => x.id === id)).filter(Boolean);
  if (nl.length === l.length && nl.some((x, k) => x !== l[k])) setSv(nl);
  render();
};

/* ===================== 絞り込みシート（2026-11 見直し） =====================
   一覧の上は「絞り込み 数」「★保存」「並び順」「検索」の4つだけ。
   絞り込みを押すと、スマホは下から出るシート、PCは右のパネル。項目を押すと選択肢が開く
   （スマホはシートの上に重ねて出し、1つ選ぶと自動で戻る。PCは項目のすぐ下に開く） */
const FSH_X = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const FSH_IC = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>';
const FQ_IC = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
const FSH_CHEV = '<svg class="fsh-cv" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
/* その条件だけ外したときの件数（選択肢の横の数字） */
function fCountWithout(keys, fn) {
  const keep = {};
  keys.forEach(k => (keep[k] = state[k]));
  keys.forEach(k => (state[k] = Array.isArray(state[k]) ? [] : typeof state[k] === "boolean" ? false : ""));
  const l = filtered();
  Object.assign(state, keep);
  return fn ? l.filter(fn).length : l.length;
}
/* 今かかっている条件（ラベル用）。並びは 視聴 → シリーズ → 配信 → 種別 → 時期 → 未入力 */
function fConds() {
  const c = [];
  state.sf.forEach(v => c.push(stLabel(v)));
  state.series.forEach(v => c.push(v));
  if (state.vod) c.push(state.vod);
  if (state.mode === "m" && state.sub !== "all") c.push(state.sub === "a" ? "アニメ映画" : "実写映画");
  state.type.forEach(v => c.push(MEDIA_LAB[v] || v));
  state.cour.forEach(v => c.push(/^\d{4}/.test(v) ? `${v.slice(0, 4)}年${v.slice(4)}` : v));
  state.era.forEach(v => c.push(v));
  if (state.missOnly) c.push(state.missKey ? `未入力：${state.missKey}` : "未入力あり");
  return c;
}
/* 一覧の上の1列：絞り込み・★保存・並び順・検索 */
function fBarHtml() {
  const n = fConds().length;
  const [svLab, svOn] = fBtnLab("sv");
  const [, srtOn] = fBtnLab("sort");
  return `<div class="fbar">
    <button type="button" class="fb fsh-b${n ? " on" : ""}" data-fsheet="1" aria-haspopup="dialog" aria-expanded="${state.fOpen === "all"}">${FSH_IC}<span class="v">絞り込み</span>${n ? `<b class="fsh-n">${n}</b>` : ""}</button>
    <button type="button" class="fb fsv${svOn ? " on" : ""}" data-fpop="sv" aria-expanded="${state.fOpen === "sv"}"><span class="v">${esc(svLab)}</span></button>
    <button type="button" class="fb srt${srtOn ? " on" : ""}" data-fpop="sort" aria-expanded="${state.fOpen === "sort"}" aria-label="並び順：${esc(SORTS.find(x => x[0] === state.sort)[1])}">${SORT_IC}</button>
    <button type="button" class="fb fq" data-qtog="1" aria-label="検索">${FQ_IC}</button>
  </div>`;
}
/* 検索欄（虫めがねを押したときだけ。キャンセルで閉じて検索も消す） */
const fSearchHtml = () =>
  `<div class="ftools"><input id="q" type="search" enterkeyhint="search" autocomplete="off" placeholder="タイトル・主題歌・放送局で検索" value="${esc(state.q)}" aria-label="検索"><button type="button" class="fq-x" data-qtog="0">キャンセル</button></div>`;
/* 条件のラベル：2つまで出して、残りは「他○件」。押すと絞り込みシート */
function fSumHtml(n) {
  const c = fConds();
  const show = c.slice(0, 2);
  const rest = c.length - show.length;
  return `<div class="fsum">${c.length ? `<div class="fsum-l">${show.map(t => `<button type="button" class="fchip" data-fsheet="1" title="${esc(t)}"><span>${esc(t)}</span></button>`).join("")}${rest ? `<button type="button" class="fmore" data-fsheet="1">他${rest}件</button>` : ""}</div><button type="button" class="clear" data-unset="all">解除</button>` : `<div class="fsum-l"></div>`}<span class="fsum-n">${state.q ? `「${esc(state.q)}」` : ""}${n}件</span></div>`;
}
/* シートの選択肢の行（1つ選ぶ・選んだら戻る） */
const fOpt = (attr, v, lab, on, n) =>
  `<button type="button" class="dd-row${on ? " on" : ""}" role="option" aria-selected="${on}" ${attr}="${esc(v)}"><span class="dd-l">${lab}${n != null ? `<small>${n}</small>` : ""}</span>${on ? DD_CHECK : ""}</button>`;
function fSubBody(k) {
  if (k === "st") {
    const one = state.sf.length === 1 ? state.sf[0] : "";
    return fOpt("data-stf", "", "すべて", !state.sf.length, fCountWithout(["sf"])) + STATUSES.map(v => fOpt("data-stf", v, stLabel(v), one === v, fCountWithout(["sf"], i => i.s === v))).join("");
  }
  if (k === "type") {
    if (state.mode === "m")
      return [["all", "すべて"], ["a", "アニメ映画"], ["d", "実写映画"]]
        .map(([v, l]) => {
          const keep = state.sub;
          state.sub = v;
          const n = fCountWithout([]);
          state.sub = keep;
          return fOpt("data-fmk", v, l, state.sub === v, n);
        })
        .join("");
    const one = state.type.length === 1 ? state.type[0] : "";
    return fOpt("data-ftype", "", "すべて", !state.type.length, fCountWithout(["type"])) + MEDIA.map(([md, l]) => [md, l, fCountWithout(["type"], i => mediaOf(i).media === md)]).filter(([md, , n]) => n || one === md).map(([md, l, n]) => fOpt("data-ftype", md, esc(l), one === md, n)).join("");
  }
  if (k === "vod") {
    const used = new Set(items.filter(ofKind).flatMap(vodsOf));
    const l = [...new Set([...VOD_TOP, ...M("vods"), ...used])].filter(v => used.has(v) || v === state.vod);
    return fOpt("data-fvod", "", "すべて", !state.vod, fCountWithout(["vod"])) + l.map(v => fOpt("data-fvod", v, `<i class="dd-dot"${vcStyle(v)}></i>${esc(v)}`, state.vod === v, fCountWithout(["vod"], i => vodsOf(i).includes(v)))).join("");
  }
  if (k === "time") return timePanelHtml();
  if (k === "series") return seriesPanelHtml();
  return "";
}
function fSheetHtml() {
  if (state.fOpen !== "all") return "";
  const one = (l, all = "すべて") => (l.length ? l.join("・") : all);
  const rows = [["st", "視聴ステータス", one(state.sf.map(stLabel))]];
  if (state.mode === "a" || state.mode === "d") rows.push(["type", "種別", one(state.type.map(v => MEDIA_LAB[v] || v))]);
  if (state.mode === "m") rows.push(["type", "種類", { a: "アニメ映画", d: "実写映画" }[state.sub] || "すべて"]);
  rows.push(["vod", "配信", state.vod || "すべて"]);
  rows.push(["time", "時期", one([...state.cour.map(v => (/^\d{4}/.test(v) ? `${v.slice(0, 4)}年${v.slice(4)}` : v)), ...state.era])]);
  rows.push(["series", "シリーズ", one(state.series)]);
  const multi = k => k === "time" || k === "series";
  const body = rows
    .map(([k, lab, val]) => {
      const open = state.fSub === k;
      const on = val !== "すべて";
      return `<div class="fsh-it${open ? " open" : ""}"><button type="button" class="fsh-row" data-fsub="${k}" aria-expanded="${open}"><span class="fsh-k">${lab}</span><span class="fsh-v${on ? " on" : ""}">${esc(val)}</span>${FSH_CHEV}</button>${
        open
          ? `<div class="fsh-sub" role="group" aria-label="${lab}"><div class="fsh-subh"><button type="button" class="fsh-back" data-fsub="" aria-label="戻る"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></button><b>${lab}</b><span class="fsh-hint">${multi(k) ? "複数選べます" : "選ぶと閉じます"}</span>${multi(k) ? `<button type="button" class="u-btn sm pri" data-fsub="">完了</button>` : ""}</div><div class="fsh-subb${multi(k) ? " chipsmode" : " dd-list"}" role="${multi(k) ? "group" : "listbox"}">${fSubBody(k)}</div></div>`
          : ""
      }</div>`;
    })
    .join("");
  /* 未入力あり：オンのときは項目ごとにさらに絞れる */
  const mBase = (() => {
    const keep = state.missOnly;
    state.missOnly = false;
    const l = filtered();
    state.missOnly = keep;
    return l;
  })().map(missingOf);
  const mN = mBase.filter(l => l.length).length;
  let mkeys = "";
  if (state.missOnly) {
    const cnt = {};
    mBase.forEach(l => l.forEach(x => (cnt[x.k] = (cnt[x.k] || 0) + 1)));
    const ks = MISS_KEYS.filter(k => cnt[k] || state.missKey === k);
    if (ks.length) mkeys = `<div class="mkeys fsh-mk" role="group" aria-label="未入力の項目で絞り込み"><button type="button" data-mkey="" aria-pressed="${!state.missKey}">すべて</button>${ks.map(k => `<button type="button" data-mkey="${esc(k)}" aria-pressed="${state.missKey === k}">${esc(k)}<small>${cnt[k] || 0}</small></button>`).join("")}</div>`;
  }
  const n = filtered().length;
  return `<div class="fsh-scrim" data-fshclose="1"></div><div class="fsh${state.fSub ? " subopen" : ""}" role="dialog" aria-label="絞り込み">
    <div class="fsh-grab" aria-hidden="true"></div>
    <div class="fsh-h"><b>絞り込み</b>${fConds().length ? `<button type="button" class="fsh-reset" data-unset="all">リセット</button>` : ""}<button type="button" class="fsh-x" data-fshclose="1" aria-label="閉じる">${FSH_X}</button></div>
    <div class="fsh-body">${body}
      <div class="fsh-it"><button type="button" class="fsh-row fsh-sw${state.missOnly ? " on" : ""}" data-missw role="switch" aria-checked="${state.missOnly}"><span class="fsh-k">未入力ありだけ</span><span class="fsh-v">${mN}件</span><span class="tr" aria-hidden="true"><i></i></span></button>${mkeys}</div>
    </div>
    <div class="fsh-f"><button type="button" class="fsh-go" data-fshclose="1">${n}件を表示</button></div>
  </div>`;
}
/* シートの操作 */
const SHEET_ACTIONS = [
  [
    "[data-fsheet]",
    () => {
      state.fOpen = state.fOpen === "all" ? "" : "all";
      state.fSub = "";
      state.svMode = "";
      render();
      if (state.fOpen && !TOUCH) document.querySelector(".fsh .fsh-row")?.focus();
    },
  ],
  [
    "[data-fshclose]",
    () => {
      state.fOpen = "";
      state.fSub = "";
      saveUI();
      render();
      if (!TOUCH) document.querySelector(".fsh-b")?.focus();
    },
  ],
  /* 項目を開く・閉じる（data-fsub="" は戻る・完了） */
  [
    "[data-fsub]",
    el => {
      const k = el.dataset.fsub;
      const was = state.fSub;
      state.fSub = k && state.fSub !== k ? k : "";
      fSubOpenedAt = Date.now();
      render();
      if (!TOUCH) {
        const t = state.fSub ? document.querySelector(".fsh-sub .dd-row.on,.fsh-sub .dd-row,.fsh-sub #seriesQ,.fsh-sub button") : document.querySelector(`.fsh-row[data-fsub="${was}"]`);
        t?.focus();
      }
      const on = document.querySelector(".fsh-sub .dd-row.on");
      if (on) on.scrollIntoView({ block: "nearest" });
    },
  ],
  ["[data-ftype]", el => fPicked(() => (state.type = el.dataset.ftype ? [el.dataset.ftype] : []))],
  ["[data-fmk]", el => fPicked(() => (state.sub = el.dataset.fmk))],
  ["[data-fvod]", el => fPicked(() => (state.vod = el.dataset.fvod))],
  /* クールの年：登録のある年だけを順に（‹ 前の年・› 次の年） */
  ["[data-couryb]", el => {
    const ys = [...new Set(items.flatMap(i => coursOf(i)).filter(c => /^\d{4}/.test(c)).map(c => +c.slice(0, 4)))].sort((a, b) => b - a);
    const i = Math.max(0, ys.indexOf(state.courY));
    state.courY = ys[Math.min(ys.length - 1, Math.max(0, i + +el.dataset.couryb))] || state.courY;
    saveUI();
    render();
  }],
  [
    "[data-qtog]",
    el => {
      const on = el.dataset.qtog === "1";
      state.qOpen = on;
      state.fOpen = "";
      state.fSub = "";
      if (!on) state.q = "";
      state.limit = 200;
      render();
      if (on) {
        const i = $("#q");
        if (i) {
          i.focus();
          i.setSelectionRange(i.value.length, i.value.length);
        }
      }
    },
  ],
];
/* 開いた直後の指の離れで、下に出てきた選択肢を押してしまわないように少し待つ */
let fSubOpenedAt = 0;
function fPicked(set) {
  if (Date.now() - fSubOpenedAt < 300) return;
  set();
  state.fSub = "";
  state.limit = 200;
  saveUI();
  render();
  if (!TOUCH) document.querySelector(".fsh-row[aria-expanded]")?.focus();
}
