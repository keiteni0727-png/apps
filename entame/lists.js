/* ===================== シリーズ・主題歌（「その他」の中のメニュー） ===================== */

/* ---------- 共通：簡単な絞り込みシート・並び順・検索の状態 ---------- */
const lst = Object.assign(
  { sr: { g: "all", prog: "all", sort: "count" }, mu: { t: "all", dl: "all", k: "all", grp: "ar" } },
  ls.get("adb.v3.lists") || {},
);
lst.sr = Object.assign({ g: "all", prog: "all", sort: "count" }, lst.sr);
lst.mu = Object.assign({ t: "all", dl: "all", k: "all", grp: "ar" }, lst.mu);
const lui = { q: "", qOpen: false, fp: "", fSub: "" }; // 端末に覚えない
const saveLists = () => ls.set("adb.v3.lists", { sr: lst.sr, mu: lst.mu });
const LA = { sheet: 'data-lsheet="1"', sort: 'data-lpop="sort"', q: "data-lqtog", reset: 'data-lreset="1"', close: 'data-lshclose="1"', sub: "data-lfsub", miss: "data-lnomiss" };
/* 選択肢の中身：[値, 名前, 件数] の並び */
const lOpts = (key, cur, opts) => opts.map(([v, l, n]) => fOpt("data-lset", `${key}:${v}`, esc(l), cur === v, n)).join("");
function lSheet(id, rows, n, unit, nConds) {
  if (lui.fp !== "all") return fshClosed();
  /* 未入力の行はないので消す */
  return fshShell({ id, a: LA, rows, sub: lui.fSub, nConds, n, unit, miss: { on: false, n: 0, keys: "" } }).replace(/<div class="fsh-it"><button type="button" class="fsh-row fsh-sw[\s\S]*?<\/button><\/div>/, "");
}
function lSortPop(title, key, cur, opts) {
  if (lui.fp !== "sort") return "";
  return `<div class="fpop-scrim"></div><div class="fsdrop fpop" role="dialog" aria-label="${title}"><div class="fpop-h"><b>${title}</b><button type="button" class="u-btn sm" data-lpop="sort">完了</button></div><div class="fgroup"><h5>${title}</h5><div class="chips sortlist" role="radiogroup">${opts.map(([v, l]) => `<button type="button" role="radio" data-lsort="${key}:${v}" aria-checked="${cur === v}" aria-pressed="${cur === v}">${cur === v ? "✓ " : ""}${l}</button>`).join("")}</div></div></div>`;
}
const lHead = (bar, conds, n, unit) =>
  `${lui.qOpen || lui.q ? fshSearch({ id: "lq", ph: state.mode === "sr" ? "シリーズ名で検索" : "曲名・アーティスト・作品名で検索", q: lui.q, a: "data-lqtog" }) : ""}
  <div class="fwrap">${lui.qOpen || lui.q ? "" : bar}${state.mode === "sr" ? lSortPop("並び順", "sr.sort", lst.sr.sort, SR_SORTS) : lSortPop("分け方", "mu.grp", lst.mu.grp, MU_GRPS)}</div>
  ${fshSum(conds, LA)}${fshCount(n, unit, lui.q)}`;

/* ---------- シリーズ ---------- */
const SR_SORTS = [["count", "作品数の多い順"], ["name", "名前順"], ["new", "新しい作品がある順"], ["left", "未視聴が多い順"]];
function seriesStats() {
  const m = new Map();
  items.forEach(i => {
    if (!i.series) return;
    if (!m.has(i.series)) m.set(i.series, { name: i.series, l: [] });
    m.get(i.series).l.push(i);
  });
  const main = seriesMainMap().map;
  return [...m.values()].map(x => {
    const c = s => x.l.filter(i => i.s === s).length;
    const kinds = [...new Set(x.l.map(i => (i.k === "a" ? "a" : "d")))];
    return { ...x, main: main[x.name] || kinds[0] || "a", kinds, done: c("視聴済み"), now: c("視聴中"), want: x.l.filter(i => !i.s || i.s === "未視聴").length, drop: c("見ない"), last: x.l.reduce((a, i) => (String(i.from || "") > a ? String(i.from || "") : a), "") };
  });
}
function renderSeries() {
  const all = seriesStats();
  const f = lst.sr;
  const nq = norm(lui.q);
  const gOk = x => f.g === "all" || x.main === f.g;
  const pOk = x => f.prog === "all" || (f.prog === "left" ? x.want + x.now > 0 : f.prog === "done" ? x.want + x.now === 0 && x.done > 0 : true);
  const qOk = x => !nq || norm(x.name).includes(nq);
  const S = { count: (a, b) => b.l.length - a.l.length, name: (a, b) => a.name.localeCompare(b.name, "ja"), new: (a, b) => b.last.localeCompare(a.last), left: (a, b) => b.want + b.now - (a.want + a.now) };
  const list = all.filter(x => gOk(x) && pOk(x) && qOk(x)).sort((a, b) => S[f.sort](a, b) || a.name.localeCompare(b.name, "ja"));
  const GL = { all: "すべて", a: "アニメ", d: "ドラマ・実写" };
  const PL = { all: "すべて", left: "まだ見ていない作品がある", done: "全部見た" };
  const conds = [...(f.g !== "all" ? [GL[f.g]] : []), ...(f.prog !== "all" ? [PL[f.prog]] : [])];
  const cnt = (fn, keep) => all.filter(x => keep(x) && qOk(x) && fn(x)).length;
  const rows = [
    ["g", "ジャンル", GL[f.g], () => lOpts("sr.g", f.g, ["all", "a", "d"].map(v => [v, GL[v], cnt(x => v === "all" || x.main === v, pOk)]))],
    ["prog", "見た作品", PL[f.prog], () => lOpts("sr.prog", f.prog, ["all", "left", "done"].map(v => [v, PL[v], cnt(x => (v === "all" ? true : v === "left" ? x.want + x.now > 0 : x.want + x.now === 0 && x.done > 0), gOk)]))],
  ];
  const bar = `<div class="fbar">
    <button type="button" class="fb fsh-b${conds.length ? " on" : ""}" ${LA.sheet} aria-haspopup="dialog">${FSH_IC}<span class="v">絞り込み</span>${conds.length ? `<b class="fsh-n">${conds.length}</b>` : ""}</button>
    <button type="button" class="fb srmgr" data-gear="series"><span class="v">管理</span></button>
    <button type="button" class="fb srt${f.sort !== "count" ? " on" : ""}" ${LA.sort} aria-label="並び順">${SORT_IC}</button>
    <button type="button" class="fb fq" data-lqtog="1" aria-label="検索">${FQ_IC}</button></div>`;
  const card = x => {
    const tot = x.l.length - x.drop;
    const pct = tot ? Math.round((x.done / tot) * 100) : 0;
    const other = x.kinds.filter(k => k !== x.main);
    return `<button type="button" class="srcard" data-seropen2="${esc(x.name)}"><span class="srt1"><b>${esc(x.name)}</b><span class="kind ${x.main}">${x.main === "a" ? "アニメ" : "ドラマ"}</span>${other.map(k => `<span class="kind ${k}">${k === "a" ? "アニメ" : "実写"}</span>`).join("")}<small>${x.l.length}作品</small></span><span class="srbar" aria-label="見た割合 ${pct}%"><i style="width:${pct}%"></i></span><span class="srmini">${x.done ? `<span class="w">視聴済 ${x.done}</span>` : ""}${x.now ? `<span class="c">視聴中 ${x.now}</span>` : ""}${x.want ? `<span class="n">未視聴 ${x.want}</span>` : ""}${x.drop ? `<span>見ない ${x.drop}</span>` : ""}</span></button>`;
  };
  return `${lHead(bar, conds, list.length, "シリーズ")}
    <div id="fshBox">${lSheet("sr", rows, list.length, "シリーズ", conds.length)}</div>
    ${list.length ? `<div class="srlist">${list.slice(0, state.limit).map(card).join("")}</div>${list.length > state.limit ? `<button type="button" class="more" id="more">さらに表示（残り${list.length - state.limit}件）</button>` : ""}` : `<p class="empty">${all.length ? "条件に合うシリーズはありません。" : "シリーズが付いた作品はまだありません。"}</p>`}`;
}

/* ---------- 主題歌 ---------- */
const MU_GRPS = [["ar", "アーティスト別"], ["work", "作品別"], ["none", "分けない（曲名順）"]];
const MU_TYPES = ["OP", "ED", "主題歌", "挿入歌"];
function songRows() {
  const out = [];
  items.forEach(i =>
    songsOf(i).forEach((x, k) => {
      const { st, ar } = songTA(x);
      if (!st.trim() && !ar.trim()) return;
      out.push({ it: i, k, type: x.type || "OP", st: st.trim(), ar: ar.trim(), dl: !!x.dl });
    }),
  );
  return out;
}
function renderSongs() {
  const all = songRows();
  const f = lst.mu;
  const nq = norm(lui.q);
  const tOk = r => f.t === "all" || r.type === f.t;
  const dOk = r => f.dl === "all" || (f.dl === "yes" ? r.dl : !r.dl);
  const kOk = r => f.k === "all" || (f.k === "a" ? r.it.k === "a" : r.it.k !== "a");
  const qOk = r => !nq || norm(r.st + " " + r.ar + " " + r.it.t).includes(nq);
  const list = all.filter(r => tOk(r) && dOk(r) && kOk(r) && qOk(r));
  const DL = { all: "すべて", no: "未DLだけ", yes: "DL済みだけ" };
  const KL = { all: "すべて", a: "アニメ", d: "ドラマ・そのほか" };
  const conds = [...(f.t !== "all" ? [f.t] : []), ...(f.dl !== "all" ? [DL[f.dl]] : []), ...(f.k !== "all" ? [KL[f.k]] : [])];
  const cnt = (fn, a, b) => all.filter(r => a(r) && b(r) && qOk(r) && fn(r)).length;
  const rows = [
    ["t", "種類", f.t === "all" ? "すべて" : f.t, () => lOpts("mu.t", f.t, [["all", "すべて", cnt(() => true, dOk, kOk)], ...MU_TYPES.map(t => [t, t, cnt(r => r.type === t, dOk, kOk)])])],
    ["dl", "ダウンロード", DL[f.dl], () => lOpts("mu.dl", f.dl, ["all", "no", "yes"].map(v => [v, DL[v], cnt(r => (v === "all" ? true : v === "yes" ? r.dl : !r.dl), tOk, kOk)]))],
    ["k", "ジャンル", KL[f.k], () => lOpts("mu.k", f.k, ["all", "a", "d"].map(v => [v, KL[v], cnt(r => (v === "all" ? true : v === "a" ? r.it.k === "a" : r.it.k !== "a"), tOk, dOk)]))],
  ];
  const bar = fshBar({ a: LA, n: conds.length, open: lui.fp === "all", srtOn: f.grp !== "ar", srtOpen: lui.fp === "sort", srtLab: (MU_GRPS.find(x => x[0] === f.grp) || MU_GRPS[0])[1] });
  const row = r =>
    `<div class="murow"><span class="mut ${SG_CLS[r.type] || ""}">${esc(r.type)}</span><button type="button" class="mux" data-id="${r.it.id}"><b>${esc(r.st || "（曲名なし）")}</b><small>${f.grp === "ar" ? esc(r.it.t) : `${esc(r.ar || "アーティスト未入力")}${f.grp === "none" ? "・" + esc(r.it.t) : ""}`}</small></button><button type="button" class="mudl${r.dl ? " on" : ""}" data-mudl="${r.it.id}:${r.k}" aria-pressed="${r.dl}" aria-label="${esc(r.st)}を${r.dl ? "未ダウンロードに戻す" : "ダウンロード済みにする"}">${r.dl ? "♪DL済" : "DL"}</button></div>`;
  let body = "";
  if (f.grp === "none") body = `<div class="mulist">${list.sort((a, b) => a.st.localeCompare(b.st, "ja")).slice(0, state.limit).map(row).join("")}</div>`;
  else {
    const g = new Map();
    list.forEach(r => {
      const key = f.grp === "ar" ? r.ar || "（アーティスト未入力）" : r.it.t;
      if (!g.has(key)) g.set(key, []);
      g.get(key).push(r);
    });
    const keys = [...g.keys()].sort((a, b) => (a.startsWith("（") ? 1 : b.startsWith("（") ? -1 : f.grp === "ar" ? g.get(b).length - g.get(a).length || a.localeCompare(b, "ja") : a.localeCompare(b, "ja")));
    let budget = state.limit;
    body = keys
      .map(key => {
        if (budget <= 0) return "";
        const l = g.get(key).slice(0, budget);
        budget -= l.length;
        return `<section class="mugrp"><h3 class="muh">${esc(key)}<small>${g.get(key).length}曲</small></h3><div class="mulist">${l.map(row).join("")}</div></section>`;
      })
      .join("");
  }
  return `${lHead(bar, conds, list.length, "曲")}
    <div id="fshBox">${lSheet("mu", rows, list.length, "曲", conds.length)}</div>
    ${list.length ? body + (list.length > state.limit ? `<button type="button" class="more" id="more">さらに表示</button>` : "") : `<p class="empty">${all.length ? "条件に合う曲はありません。" : "まだ曲が登録されていません。"}</p>`}`;
}

/* ---------- 操作 ---------- */
const lRender = () => {
  saveLists();
  render();
};
const LIST_ACTIONS = [
  ["[data-lsheet]", () => ((lui.fp = lui.fp === "all" ? "" : "all"), (lui.fSub = ""), lRender())],
  ["[data-lshclose]", () => ((lui.fp = ""), (lui.fSub = ""), lRender())],
  ["[data-lpop]", () => ((lui.fp = lui.fp === "sort" ? "" : "sort"), lRender())],
  [
    "[data-lfsub]",
    el => {
      const was = lui.fSub;
      lui.fSub = el.dataset.lfsub && lui.fSub !== el.dataset.lfsub ? el.dataset.lfsub : "";
      fSubOpenedAt = Date.now();
      render();
      fshFocusAfter(was);
    },
  ],
  [
    "[data-lset]",
    el => {
      if (Date.now() - fSubOpenedAt < 300) return;
      const [path, v] = el.dataset.lset.split(":");
      const [a, b] = path.split(".");
      lst[a][b] = v;
      lui.fSub = "";
      lRender();
    },
  ],
  [
    "[data-lsort]",
    el => {
      const [path, v] = el.dataset.lsort.split(":");
      const [a, b] = path.split(".");
      lst[a][b] = v;
      lui.fp = "";
      lRender();
    },
  ],
  [
    "[data-lreset]",
    () => {
      if (state.mode === "sr") Object.assign(lst.sr, { g: "all", prog: "all" });
      else Object.assign(lst.mu, { t: "all", dl: "all", k: "all" });
      lui.fSub = "";
      lRender();
    },
  ],
  [
    "[data-lqtog]",
    el => {
      const on = el.dataset.lqtog === "1";
      lui.qOpen = on;
      lui.fp = "";
      if (!on) lui.q = "";
      render();
      if (on) fshFocusQ("#lq");
    },
  ],
  /* シリーズを押すと、アニメ・ドラマ・映画をまたいでその作品を古い順に */
  ["[data-seropen2]", el => showSeries(el.dataset.seropen2, seriesMainMap().map[el.dataset.seropen2])],
  /* 主題歌：DL済み・未DLの切り替え（その場で保存） */
  [
    "[data-mudl]",
    el => {
      const [id, k] = el.dataset.mudl.split(":");
      const it = items.find(x => x.id === id);
      if (!it) return;
      const songs = songsOf(it).map((x, i) => (i === +k ? { ...x, dl: !x.dl } : x));
      saveTitle(id, { songs }, songs[+k].dl ? "DL済みにしました" : "未DLに戻しました");
    },
  ],
];
document.addEventListener("input", e => {
  if (e.target.id !== "lq") return;
  lui.q = e.target.value;
  state.limit = 200;
  if (!e.isComposing) render();
});
