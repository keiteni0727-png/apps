const DOW = ["月", "火", "水", "木", "金", "土", "日"];
const STATUSES = ["未視聴", "視聴中", "視聴済み", "見ない"];
/* 表示の言い回し：保存データの値は「視聴済み」のまま、画面では「視聴済」と出す */
const stLabel = s => String(s ?? "").replace(/視聴済み/g, "視聴済");
const COLLAB_SUBS_DEF = ["TOP4", "最俺", "P-P"];
const TV_STATIONS = ["フジテレビ", "日本テレビ", "テレビ朝日", "TBS", "テレビ東京", "TOKYO MX", "NHK", "BS", "その他"];
/* よく見る3つ（Netflix・Disney＋・ABEMA）を先頭に固定 */
const VOD_TOP = ["Netflix", "Disney＋", "ABEMA"];
const VODS = [
  "Netflix",
  "Disney＋",
  "ABEMA",
  "U-NEXT",
  "Prime Video",
  "hulu",
  "FOD",
  "TELASA",
  "Lemino",
  "dアニメストア",
];
/* 配信サイトの色（ブランドカラー）[背景, 文字]。ロゴが白黒のサイトは黒系 */
const VOD_COLOR = {
  Netflix: ["#E50914", "#fff"],
  "Disney＋": ["#113CCF", "#fff"],
  ABEMA: ["#000000", "#fff"],
  "U-NEXT": ["#1F2A3A", "#fff"],
  "Prime Video": ["#1A98FF", "#fff"],
  hulu: ["#1CE783", "#0B0C0F"],
  FOD: ["#3A3A3A", "#fff"],
  TELASA: ["#2F3BD9", "#fff"],
  Lemino: ["#7B2CE0", "#fff"],
  dアニメストア: ["#F08300", "#fff"],
};
const vcStyle = v => {
  const c = VOD_COLOR[v];
  return c ? ` style="--vc:${c[0]};--vt:${c[1]}"` : "";
};
const vlab = v => `<span class="lab v${VOD_COLOR[v] ? " vc" : ""}"${vcStyle(v)}>${esc(v)}</span>`;
const MEDIA = [
  ["tv", "TV"],
  ["sp", "TVスペシャル"],
  ["movie", "映画"],
  ["ova", "OVA"],
  ["stream", "配信"],
];
const SONG_TYPES = ["OP", "ED", "主題歌", "挿入歌"];
const SEASONS = ["冬", "春", "夏", "秋"];
const ALLYEAR = "通年";
const SORTS = [
  ["new", "新しい順"],
  ["old", "古い順"],
  ["time", "曜日・時間順"],
  ["title", "タイトル順"],
];
/* ライブラリの見出しの分け方 */
const GROUPS = [
  ["cour", "クール別"],
  ["year", "年別"],
  ["month", "月別"],
  ["series", "シリーズ別"],
  ["none", "分けない"],
];
const K_UI = "adb.v3.ui",
  K_LOCAL = "adb.v3.local";
const ls = {
  get(k) {
    try {
      return JSON.parse(localStorage.getItem(k) || "null");
    } catch (e) {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  },
};
const $ = s => document.querySelector(s);
const esc = s =>
  String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const mins = t => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || "");
  return m ? +m[1] * 60 + +m[2] : 9999;
};

/* ---------- state ---------- */
let over = {}, // titles：作品（1作品1件）
  prog = {}; // progress：話数リストと視聴チェック
let items = [],
  eras = [];
const state = Object.assign(
  {
    kind: "all",
    view: "week",
    q: "",
    sf: "すべて",
    era: "すべて",
    type: "すべて",
    cour: "すべて",
    courY: new Date().getFullYear(),
    sort: "new",
    limit: 200,
  },
  ls.get(K_UI) || {},
  { q: "", series: "", limit: 200 },
);
/* 端末に覚えた表示状態のうち、今は無い値は外す */
const arrOf = v => (Array.isArray(v) ? v : v && v !== "すべて" ? [v] : []);
["sf", "era", "cour", "series", "type"].forEach(k => (state[k] = arrOf(state[k])));
state.sf = state.sf.filter(x => [...STATUSES, "未設定"].includes(x));
if (!SORTS.some(([v]) => v === state.sort)) state.sort = "new";
if (!GROUPS.some(([v]) => v === state.grp)) state.grp = "cour";
state.fOpen = "";
/* 前の版で「アニメ／ドラマの番組表」を開いていたら、新しい「番組表」メニューへ */
if ((state.mode === "a" || state.mode === "d") && state.view === "week") state.mode = "w";
if (!["w", "a", "d", "m", "s", "yt"].includes(state.mode)) state.mode = "w";
if (!["all", "a", "d"].includes(state.mk)) state.mk = "all";
if (typeof state.vod !== "string") state.vod = "";
state.unOnly = !!state.unOnly;
state.missOnly = !!state.missOnly;
if (typeof state.missKey !== "string") state.missKey = "";
if (state.mode === "m") state.kind = state.mk;
else if (state.mode === "s" || state.mode === "w") state.kind = "all";
else if (state.mode !== "yt") state.kind = state.mode;
/* 番組表はメニュー「番組表」だけ。アニメ・ドラマ・配信はライブラリ */
state.view = state.mode === "w" ? "week" : "list";
state.wday = ""; // スマホの番組表で選んでいる日
state.xser = false;
const saveUI = () =>
  ls.set(K_UI, {
    fOpen: state.fOpen || "",
    mode: state.mode,
    kind: state.kind,
    mk: state.mk,
    vod: state.vod,
    unOnly: state.unOnly,
    missOnly: state.missOnly,
    missKey: state.missKey,
    view: state.view,
    sf: state.sf,
    era: state.era,
    type: state.type,
    cour: state.cour,
    courY: state.courY,
    series: state.series,
    sort: state.sort,
    grp: state.grp,
  });
/* ---------- 保存したフィルタ（アニメ・ドラマで別々。マスタに保存するので端末をまたいで同じ） ---------- */
const SVK = ["sf", "era", "type", "cour", "series"];
const svKey = () => (state.mode === "m" || state.mode === "s" ? state.mode : state.kind);
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
function onSavedFilterClick(e) {
  if (state.mode === "yt") return false;
  const ap = e.target.closest("[data-svapply]");
  if (ap) {
    const f = svList().find(x => x.id === ap.dataset.svapply);
    if (!f) return true;
    if (svMatch(f)) {
      Object.assign(state, { sf: [], era: [], cour: [], series: [], type: [], sort: "new", limit: 200 });
    } else svApply(f);
    render();
    return true;
  }
  if (e.target.closest("[data-svnew]")) {
    state.svMode = "new";
    state.svName = null;
    render();
    const i = $("#svName");
    if (i) {
      i.focus();
      i.select();
    }
    return true;
  }
  if (e.target.closest("[data-svedit]")) {
    state.svMode = "edit";
    render();
    return true;
  }
  if (e.target.closest("[data-svcancel]")) {
    state.svMode = "";
    state.svName = null;
    render();
    return true;
  }
  const mv = e.target.closest("[data-svmove]");
  if (mv) {
    const [id, d] = mv.dataset.svmove.split(":");
    const l = [...svList()];
    const i = l.findIndex(x => x.id === id),
      j = i + +d;
    if (i < 0 || j < 0 || j >= l.length) return true;
    [l[i], l[j]] = [l[j], l[i]];
    setSv(l);
    render();
    return true;
  }
  const ov = e.target.closest("[data-svover]");
  if (ov) {
    const l = svList().map(x => {
      if (x.id !== ov.dataset.svover) return x;
      const n = { ...x, sort: state.sort };
      SVK.forEach(k => (n[k] = [...state[k]]));
      return n;
    });
    setSv(l);
    render();
    toast(`「${(l.find(x => x.id === ov.dataset.svover) || {}).name}」を今の条件で上書きしました`);
    return true;
  }
  const dl = e.target.closest("[data-svdel]");
  if (dl) {
    const old = svList();
    const f = old.find(x => x.id === dl.dataset.svdel);
    if (!f) return true;
    setSv(old.filter(x => x !== f));
    if (!svList().length) state.svMode = "";
    render();
    toastUndo(`「${f.name}」を削除しました`, () => {
      setSv(old);
      render();
    });
    return true;
  }
  return false;
}
const TYPES = [
  ["すべて", "すべて"],
  ["tv", "TV"],
  ["sp", "TVスペシャル"],
  ["stream", "配信"],
  ["movie", "映画"],
  ["ova", "OVA"],
];
const typeOk = i => !state.type.length || state.type.includes(mediaOf(i).media);
/* 放送形態: media＝tv（放送局 stations）・stream（配信サイト plat）・movie・ova。vods＝見られる配信サイト */
const mediaOf = i => ({ media: i.media || "tv", stations: i.stations || [], plat: i.plat || [], vods: i.vods || [] });
/* 映画・OVA・TVスペシャル：毎週の放送時間と放送クールを持たない（TVスペシャルは1回だけの放送。放送局はある） */
const noSched = m => m === "movie" || m === "ova" || m === "sp";
const hasSt = m => m === "tv" || m === "sp";
const MEDIA_LAB = { tv: "TV", sp: "SP", stream: "配信", movie: "映画", ova: "OVA" };
const ONE_LAB = { movie: "映画", ova: "OVA", sp: "SP" };
/* 主題歌: songs＝[{type,s,a,b,dl}] a〜b話で使われた曲 */
const songsOf = i => i.songs || [];
const songText = i =>
  songsOf(i)
    .map(x => x.type + " " + x.s)
    .join(" ");
/* 詳細のカード用：入力したとおりに表示（曲名・アーティストの自動区分はしない） */
/* 曲名とアーティストは入力欄ごとに別々に保存（自動で分けたりつないだりしない）。
   s は検索用に「曲名 アーティスト」を並べたもの。st がない古いデータは s をそのまま曲名として扱う */
const songTA = x => (x.st !== undefined ? { st: x.st || "", ar: x.ar || "" } : { st: x.s || "", ar: "" });
const songJoin = (st, ar) => [st.trim(), ar.trim()].filter(Boolean).join(" ");
/* 詳細のカード用：曲名とアーティストを2段で */
const songCard = x => {
  const { st, ar } = songTA(x);
  return `${st ? `<span class="stt">${esc(st)}</span>` : ""}${ar ? `<span class="sar">${esc(ar)}</span>` : ""}`;
};
function epSpan(it) {
  const ns = (it ? episodes(it) : []).map(e => parseInt(String(e.n).replace(/[^0-9]/g, ""), 10)).filter(n => !isNaN(n));
  return ns.length ? [Math.min(...ns), Math.max(...ns)] : null;
}
/* 曲の種類ごとの色（OP=青・ED=紫・主題歌=緑・挿入歌=橙） */
const SG_CLS = { OP: "t-op", ED: "t-ed", 主題歌: "t-th", 挿入歌: "t-in" };
const rangeTxt = x =>
  x.a == null && x.b == null ? "" : x.a != null && x.b === x.a ? `${x.a}話` : `${x.a ?? ""}〜${x.b ?? ""}話`;

/* 並び：o（Notionから取り込んだときの順番）→ あとから追加したものはidの順 */
const byOrder = ([a, x], [b, y]) => (x.o ?? 1e9) - (y.o ?? 1e9) || (a < b ? -1 : a > b ? 1 : 0);
/* 作品＝データベースの titles の各ドキュメント（1作品1件） */
function rebuild() {
  items = Object.entries(over)
    .filter(([, o]) => o && typeof o.t === "string" && !o.deleted)
    .sort(byOrder)
    .map(([id, o]) => ({ id, k: "a", s: "", dow: -1, time: "", from: "", series: "", url: "", ...o }));
  buildEras();
}

/* ---------- 放送クール: "2026秋" style keys, plus 通年 for shows that run regardless of cour ---------- */
const coursOf = i => i.cours || [];
const courLabel = c =>
  c === ALLYEAR ? "通年" : /^\d{4}/.test(c) ? `${c.slice(0, 4)}年${c.slice(4)}` : c;

/* ---------- era buckets: one per year, older years merged until each holds ~30 titles ---------- */
const yearOf = i => +String(i.from || "").slice(0, 4) || 0;
function buildEras() {
  const cnt = {};
  items.forEach(i => {
    if (yearOf(i)) cnt[yearOf(i)] = (cnt[yearOf(i)] || 0) + 1;
  });
  const years = Object.keys(cnt)
    .map(Number)
    .sort((a, b) => b - a);
  const MIN = 30;
  const out = [];
  let cur = null;
  years.forEach(y => {
    if (!cur && cnt[y] >= MIN) {
      out.push({ from: y, to: y, n: cnt[y] });
      return;
    }
    if (!cur) cur = { from: y, to: y, n: 0 };
    cur.from = y;
    cur.n += cnt[y];
    if (cur.n >= MIN) {
      out.push(cur);
      cur = null;
    }
  });
  if (cur) {
    if (out.length && out[out.length - 1].from !== out[out.length - 1].to)
      Object.assign(out[out.length - 1], { from: cur.from, n: out[out.length - 1].n + cur.n });
    else out.push(cur);
  }
  if (out.length) {
    const last = out[out.length - 1];
    if (last.from !== last.to) last.label = `〜${last.to}`;
  }
  out.forEach(b => (b.label = b.label || (b.from === b.to ? String(b.from) : `${b.from}–${String(b.to).slice(2)}`)));
  eras = [
    ...out.map(b => ({ key: b.label, test: i => yearOf(i) >= b.from && yearOf(i) <= b.to })),
    { key: "年不明", test: i => !yearOf(i) },
  ];
  state.era = state.era.filter(k => eras.some(e => e.key === k));
}
const courOk = i => !state.cour.length || coursOf(i).some(c => state.cour.includes(c));
const seriesOk = i => !state.series.length || state.series.includes(i.series);
const sfOk = i => !state.sf.length || state.sf.some(s => (s === "未設定" ? !i.s : i.s === s));
const eraOk = i => !state.era.length || eras.some(e => state.era.includes(e.key) && e.test(i));
const toggle = (arr, v) => (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

/* ---------- storage: artifact db, falling back to this browser ---------- */
let db = null,
  storeKind = "local";
const local = ls.get(K_LOCAL) || { titles: {}, progress: {} };
local.yt = local.yt || {};
local.master = local.master || {};
/* 保存状況：保存中の件数・最後に変更した時刻（各データに _at として記録し、どの端末でも同じ時刻を出す） */
let saving = 0,
  saveErr = false,
  lastAt = 0;
function calcLastAt() {
  let m = 0;
  [over, prog, ytOver].forEach(o =>
    Object.values(o || {}).forEach(d => {
      if (d && +d._at > m) m = +d._at;
    }),
  );
  if (m > lastAt) lastAt = m;
}
const fmtAt = t => {
  if (!t) return "";
  const d = new Date(t),
    n = new Date();
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  return d.toDateString() === n.toDateString()
    ? `今日 ${hm}`
    : `${d.getFullYear() !== n.getFullYear() ? d.getFullYear() + "/" : ""}${d.getMonth() + 1}/${d.getDate()} ${hm}`;
};
function saveNoteHtml() {
  const st = saving
    ? ["ing", "保存中…"]
    : saveErr
      ? ["err", "保存できませんでした"]
      : storeKind === "db" || storeKind === "fb"
        ? ["ok", "保存済み"]
        : ["loc", "この端末に保存"];
  return `<span class="sv ${st[0]}"><i></i>${st[1]}</span>${lastAt ? `<span class="svat">最終変更 ${fmtAt(lastAt)}</span>` : ""}`;
}
function updateSaveNote() {
  const n = $("#saveNote");
  if (n) n.innerHTML = saveNoteHtml();
  const b = $("#sbSave");
  if (b) b.innerHTML = saveNoteHtml();
}
async function removeDoc(col, id) {
  lastAt = Date.now();
  saving++;
  saveErr = false;
  updateSaveNote();
  try {
    if (db) await db.doc(`${col}/${id}`).delete();
    else {
      delete local[col][id];
      ls.set(K_LOCAL, local);
    }
  } catch (e) {
    saveErr = true;
    throw e;
  } finally {
    saving = Math.max(0, saving - 1);
    updateSaveNote();
  }
}
async function saveDoc(col, id, data) {
  data._at = Date.now();
  lastAt = data._at;
  saving++;
  saveErr = false;
  updateSaveNote();
  try {
    if (db) await db.doc(`${col}/${id}`).set(data);
    else {
      local[col][id] = data;
      ls.set(K_LOCAL, local);
    }
  } catch (e) {
    saveErr = true;
    throw e;
  } finally {
    saving = Math.max(0, saving - 1);
    updateSaveNote();
  }
}
/* ---------- マスタ（シリーズ・放送局・配信サイト・投稿者・グループ）：並び順と名前を保存 ---------- */
let master = {};
const MKEYS = [
  ["series", "シリーズ"],
  ["stations", "放送局"],
  ["vods", "配信サイト"],
  ["authors", "YouTube投稿者"],
  ["soloGroups", "一人実況のグループ"],
  ["groups", "コラボのグループ"],
];
function usedNames(key) {
  const c = {};
  const add = n => {
    if (n) c[n] = (c[n] || 0) + 1;
  };
  /* シリーズはアニメ・ドラマ・映画・配信で共通の1つ（実写化などをまたいで同じ名前を使う） */
  if (key === "series") items.forEach(i => add(i.series));
  else if (key === "stations") items.forEach(i => mediaOf(i).stations.forEach(add));
  else if (key === "vods")
    items.forEach(i => {
      const m = mediaOf(i);
      [...new Set([...m.plat, ...m.vods])].forEach(add);
    });
  else if (key === "authors") ytItems.forEach(x => add(x.a));
  else if (key === "groups") ytItems.forEach(x => add(ytSub(x)));
  else if (key === "soloGroups") ytItems.forEach(x => add(ytSolo(x)));
  return c;
}
const MDEF = { stations: TV_STATIONS, vods: VODS, groups: COLLAB_SUBS_DEF, soloGroups: ["シリーズ", "単発"] };
/* マスタの並び（保存した順 → まだマスタにない使用中の名前を件数順で後ろに） */
function M(key) {
  const c = usedNames(key);
  /* 前の版はシリーズをアニメ用・ドラマ用で別々に持っていたので、共通のものがまだなければ2つの並びをつなげて使う */
  const base = Array.isArray(master[key])
    ? master[key]
    : key === "series" && (Array.isArray(master.seriesA) || Array.isArray(master.seriesD))
      ? [...new Set([...(master.seriesA || []), ...(master.seriesD || [])])]
      : MDEF[key] || [];
  const rest = Object.keys(c)
    .filter(n => !base.includes(n))
    .sort((a, b) => c[b] - c[a] || a.localeCompare(b, "ja"));
  return [...base, ...rest];
}
async function saveMaster() {
  try {
    await saveDoc("master", "all", master);
  } catch (e) {
    fail(e);
  }
}
function banner(html) {
  $("#banner").innerHTML = html
    ? `<div class="banner" role="status"><div style="flex:1;min-width:200px">${html}</div></div>`
    : "";
}
/* ---------- 保存先への接続とログインは u-core.js（アプリ共通）。Firebase の設定は window.U_APP.fb に入れる ---------- */
const FB_CONFIG = U.app.fb;
async function doLogout() {
  const s = await U.store();
  if (s.logout) await s.logout();
  else location.reload();
}
/* 設定のいちばん下：ログアウト（Firebaseで動かしているときだけ） */
function accountHtml() {
  if (storeKind === "fb")
    return `<div class="bkbox"><p class="hint">claude.ai版で書き出したデータを、このアプリに取り込めます。</p><div class="bkrow"><button type="button" class="u-btn sm svbtn" data-movein="1">データを取り込む</button><button type="button" class="u-btn sm svbtn" data-logout="1">ログアウト</button></div></div>`;
  if (storeKind === "db")
    return `<div class="bkbox"><p class="hint">iPhone単独版への引っ越し用に、いまのデータをまるごと書き出します。</p><div class="bkrow"><button type="button" class="u-btn sm svbtn" data-moveout="1">引っ越し用に書き出す</button></div></div>`;
  return "";
}
/* ---------- 引っ越し：claude.ai版から書き出し → iPhone単独版（Firebase）で取り込み ---------- */
function moveText() {
  return JSON.stringify({
    app: "entame",
    v: 1,
    at: Date.now(),
    data: { titles: over, progress: prog, yt: ytOver, master: { all: master }, meta: { schema: { v: 2, lastAt, at: Date.now() } } },
  });
}
const moveCount = d => ["titles", "progress", "yt"].map(c => Object.keys((d && d[c]) || {}).length);
function copyText(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (e) {}
  ta.remove();
  return ok;
}
async function moveOut() {
  const text = moveText();
  const [a, b, c] = moveCount(JSON.parse(text).data);
  const what = `作品${a}・視聴記録${b}・YouTube${c}件`;
  /* まず「コピー」（押した直後でないと許可されないので最初に試す） */
  let copied = copyText(text);
  if (!copied) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (e) {}
  }
  /* 使えるときはファイルにも保存 */
  let saved = false;
  try {
    const dl = window.claude?.use ? await claude.use("downloads") : null;
    if (dl) {
      await dl.save({ filename: "entame-hikkoshi.json", data: text });
      saved = true;
    }
  } catch (e) {}
  if (copied || saved)
    U.toast(`${what}を${[copied ? "コピー" : "", saved ? "ファイルに保存" : ""].filter(Boolean).join("・")}しました`, { ms: 6000 });
  else U.toast("書き出せませんでした。もう一度押してみてください", { ms: 6000 });
}
/* Firestoreに入らない形（配列の中に配列）がないか */
const nestedArr = (v, inArr) =>
  Array.isArray(v)
    ? inArr || v.some(x => nestedArr(x, true))
    : !!v && typeof v === "object" && Object.values(v).some(x => nestedArr(x, false));
async function moveInRun(text, say) {
  let j = null;
  try {
    j = JSON.parse(text);
  } catch (e) {}
  if (!j || j.app !== "entame" || !j.data || typeof j.data !== "object") {
    say("データを読み取れませんでした。書き出したものをそのまま貼り付けてください（途中で切れていないか確かめてください）。", true);
    return false;
  }
  const jobs = [],
    skip = [];
  ["titles", "progress", "yt", "master", "meta"].forEach(col =>
    Object.entries(j.data[col] || {}).forEach(([id, d]) => {
      if (!id || id.includes("/") || !d || typeof d !== "object" || Array.isArray(d) || nestedArr(d, false)) skip.push(`${col}/${id}`);
      else jobs.push([`${col}/${id}`, d]);
    }),
  );
  const s = await U.store();
  if (s.kind !== "fb" || !s.db.setMany) {
    say("ログインしてから取り込んでください。", true);
    return false;
  }
  let n = 0;
  try {
    for (let i = 0; i < jobs.length; i += 200) {
      say(`取り込み中… ${n} / ${jobs.length}件（このまま待ってください）`);
      await s.db.setMany(jobs.slice(i, i + 200));
      n = Math.min(jobs.length, i + 200);
    }
  } catch (e) {
    say(`途中で止まりました（${n} / ${jobs.length}件まで完了）。電波のよい場所でもう一度「取り込む」を押してください。${e?.message || ""}`, true);
    return false;
  }
  const [a, b, c] = moveCount(j.data);
  say(`取り込みが終わりました：作品${a}・視聴記録${b}・YouTube${c}件${skip.length ? `（取り込めなかったもの ${skip.length}件：${skip.slice(0, 5).join("、")}）` : ""}`);
  return true;
}
function moveIn() {
  document.getElementById("moveBox")?.remove();
  const host = document.createElement("div");
  host.id = "moveBox";
  host.className = "u-login";
  host.innerHTML = `<form><h3>データを取り込む</h3>
    <p>claude.ai版の「引っ越し用に書き出す」でコピーしたデータを下に貼り付けるか、保存したファイルを選んで「取り込む」を押してください。同じ作品は書き出したときの内容で上書きされます。</p>
    <textarea placeholder="ここを長押しして「ペースト」" style="width:100%;height:90px;font:inherit;font-size:12px;padding:8px;border:1px solid var(--u-line);border-radius:var(--u-r);background:var(--u-bg);color:var(--u-ink);box-sizing:border-box"></textarea>
    <input type="file" accept=".json,application/json,text/plain" style="font-size:13px">
    <p data-msg role="status" style="min-height:1.5em"></p>
    <button type="submit">取り込む</button>
    <button type="button" data-x style="background:none;border:1px solid var(--u-line);color:var(--u-ink)">閉じる</button></form>`;
  document.body.appendChild(host);
  const ta = host.querySelector("textarea"),
    fi = host.querySelector("input"),
    msg = host.querySelector("[data-msg]"),
    go = host.querySelector("[type=submit]");
  const say = (t, bad) => {
    msg.textContent = t;
    msg.className = bad ? "u-login-err" : "";
  };
  host.querySelector("[data-x]").onclick = () => host.remove();
  host.querySelector("form").onsubmit = async ev => {
    ev.preventDefault();
    go.disabled = true;
    let text = ta.value.trim();
    try {
      if (fi.files[0]) text = (await fi.files[0].text()).trim();
    } catch (e) {}
    if (!text) say("データを貼り付けるか、ファイルを選んでください。", true);
    else if (await moveInRun(text, say)) ta.value = "";
    go.disabled = false;
  };
}
async function initStore() {
  const conn = await U.store();
  db = conn.db;
  if (conn.kind === "fb") {
    storeKind = "fb";
    $("#main").innerHTML = `<p class="loading">作品データを読み込み中…</p>`;
  } else if (conn.error && FB_CONFIG) {
    banner(`<b>保存先に接続できませんでした</b>${esc(conn.error?.message || "")}　電波のよい場所で開き直してください。`);
    return;
  }
  if (!db) {
    over = local.titles;
    prog = local.progress;
    ytOver = local.yt;
    master = local.master.all || {};
    storeKind = "local";
    loaded = true;
    calcLastAt();
    rebuild();
    ytRebuild();
    banner(
      "<b>この端末のブラウザに保存しています</b>サインインした状態でclaude.aiから開くと、アプリに保存した作品が表示され、どの端末でも同じ内容になります。",
    );
    render();
    return;
  }
  if (storeKind !== "fb") storeKind = "db";
  /* 移行時に記録した「最終変更」の時刻（当時は削除の印にも時刻があったため） */
  db.doc("meta/schema")
    .get()
    .then(s => {
      const t = s.exists ? +s.data().lastAt || 0 : 0;
      if (t > lastAt) {
        lastAt = t;
        updateSaveNote();
      }
    })
    .catch(() => {});
  const got = { titles: false, progress: false, yt: false };
  const done = () => {
    if (!got.titles || !got.progress) return;
    loaded = true;
    calcLastAt();
    rebuild();
    render();
    if (openId && !epEdit) refreshSheet();
  };
  const onErr = e =>
    banner(`<b>保存データを読み込めませんでした</b>${esc(e?.message || "")}　ページを開き直してください。`);
  db.collection("titles").onSnapshot(s => {
    const m = {};
    s.docs.forEach(d => (m[d.id] = d.data()));
    over = m;
    got.titles = true;
    done();
  }, onErr);
  db.collection("progress").onSnapshot(s => {
    const m = {};
    s.docs.forEach(d => (m[d.id] = d.data()));
    prog = m;
    got.progress = true;
    done();
  }, onErr);
  db.collection("master").onSnapshot(s => {
    const d = s.docs.find(x => x.id === "all");
    master = d ? d.data() : {};
    render();
    refreshSettings();
  }, onErr);
  db.collection("yt").onSnapshot(s => {
    const m = {};
    s.docs.forEach(d => (m[d.id] = d.data()));
    ytOver = m;
    calcLastAt();
    ytRebuild();
    render();
    if (ytOpen) ytRefresh();
  }, onErr);
}

/* ---------- episodes ---------- */
const NOWMIN = () => Math.floor(Date.now() / 60000);
const WEEK = 7 * 1440;
function dayTimeToT(day, hm) {
  // broadcast day + "25:23" style time (JST) -> minutes since epoch (UTC)
  if (!day) return 0;
  const [y, m, d] = day.split("-").map(Number);
  const v = mins(hm);
  return Math.floor(Date.UTC(y, m - 1, d) / 60000) + (v < 9999 ? v : 9 * 60) - 540;
}
const hasTime = it => mins(it.time) < 9999;
// a date with no broadcast time is stored at 0:00 UTC (= 9:00 JST); never print that as a time
const noTime = (e, it) => e.nt || (e.t % 1440 === 0 && !(it && mins(it.time) === 540));
const epWhen = (e, it, withYear) => {
  const j = jst(e.t);
  if (!j) return "";
  return `${withYear && j.y !== new Date().getFullYear() ? j.y + "/" : ""}${j.md}(${j.dow})${noTime(e, it) ? "" : " " + j.hm}`;
};
function episodes(it) {
  const p = prog[it.id];
  return p && Array.isArray(p.eps)
    ? p.eps.map(e => ({ n: e.n || "", sub: e.s || "", t: e.t || 0, w: !!e.w, nt: !!e.nt }))
    : [];
}
const aired = e => !e.t || e.t <= NOWMIN();
function nextInfo(it) {
  const l = episodes(it);
  const un = l.filter(e => !e.w);
  return { all: l, back: un.filter(aired), up: un.find(e => !aired(e)) };
}
function jst(t) {
  if (!t) return null;
  const d = new Date((t + 540) * 60000);
  let h = d.getUTCHours();
  const mi = d.getUTCMinutes();
  let day = d;
  if (h < 5) {
    h += 24;
    day = new Date(d.getTime() - 86400e3);
  }
  return {
    md: `${day.getUTCMonth() + 1}/${day.getUTCDate()}`,
    dow: "日月火水木金土"[day.getUTCDay()],
    hm: `${h}:${String(mi).padStart(2, "0")}`,
    y: day.getUTCFullYear(),
    day: day.toISOString().slice(0, 10),
  };
}
/* 最終回：通年の作品以外で、登録されている最後の話 */
const finIdx = it => {
  if (coursOf(it).includes(ALLYEAR)) return -1;
  const l = episodes(it);
  return l.length > 1 ? l.length - 1 : -1;
};
const FIN = '<span class="fin">最終回</span>';
/* 話数リストが未登録（未視聴・視聴中の作品、映画以外） */
/* ---------- 未入力チェック（PCだけで表示・絞り込み） ----------
   編集画面の項目のうち、その作品に関係あるものだけを見る。シリーズは「なければ空欄」なので対象外。
   k＝表示名、j＝押したときに開く編集項目（data-jump）、n＝「なし」にできる項目のキー（noF） */
const IS_PC = () => matchMedia("(min-width:900px)").matches;
function missingOf(i) {
  const m = mediaOf(i);
  const md = m.media,
    ns = noSched(md);
  const irr = !ns && !!i.from && (i.dow ?? -1) < 0;
  const sl = songsOf(i);
  const no = i.noSongs || [];
  const needSong = t => !no.includes(t) && !sl.some(x => x.type === t && (x.s || "").trim());
  const nf = i.noF || [];
  const out = [];
  const add = (k, j = "", n = "") => (!n || !nf.includes(n)) && out.push({ k, j, n });
  if (!i.s) add("ステータス");
  if (md !== "movie" && md !== "sp" && !episodes(i).length) add("話数");
  if (!i.from) add({ movie: "公開日", ova: "発売日", sp: "放送日" }[md] || "開始日", "f-from");
  if (!ns && !irr && !(i.time || "").trim()) add(md === "stream" ? "配信時間" : "放送時間", "f-time", "time");
  if (hasSt(md) && !m.stations.length) add("放送局", "fMedia", "st");
  if (md === "stream" && !m.plat.length) add("配信サイト", "fMedia", "plat");
  if (md !== "stream" && !m.vods.length) add("見られる配信", "fMedia", "vods");
  if (!ns && !(i.cours || []).length) add("放送クール", "coursBox", "cours");
  // OP・ED・主題歌のどれか1つでも入っていれば、曲の未入力は出さない
  const anySong = sl.some(x => (x.s || "").trim());
  if (!anySong) (i.k === "a" && md !== "movie" ? ["OP", "ED"] : ["主題歌"]).forEach(t => needSong(t) && add(t, "sgList"));
  /* 曲名・アーティストのどちらかだけ入っている曲（曲名とアーティストを別々に入れた曲だけを見る） */
  const half = sl.filter(x => x.st !== undefined);
  if (half.some(x => (x.st || "").trim() && !(x.ar || "").trim())) add("アーティスト", "sgList");
  if (half.some(x => !(x.st || "").trim() && (x.ar || "").trim())) add("曲名", "sgList");
  if (!(i.url || "").trim()) add("公式サイト", "f-url", "url");
  if (!(i.vurl || "").trim()) add("配信URL", "f-vurl", "vurl");
  return out;
}
/* 「なし」にできる項目（noF に入れる）。ステータス・話数・開始日は必ずあるはずなので「なし」にしない */
const NOF_LAB = { time: "時間", st: "放送局", plat: "配信サイト", vods: "見られる配信", cours: "放送クール", url: "公式サイト", vurl: "配信URL" };
const nofHas = (i, k) => (i.noF || []).includes(k);
const nofBox = (k, lab) =>
  `<label class="yr nofl" title="${lab || NOF_LAB[k]}なし"><input type="checkbox" class="nof" value="${k}" ${(form.noF || []).includes(k) ? "checked" : ""} aria-label="${lab || NOF_LAB[k]}なし"><span>なし</span></label>`;
const MISS_KEYS = ["ステータス", "話数", "開始日", "公開日", "発売日", "放送時間", "配信時間", "放送局", "配信サイト", "見られる配信", "放送クール", "OP", "ED", "主題歌", "曲名", "アーティスト", "公式サイト", "配信URL"];
/* 一覧のバッジ：先頭2項目＋「ほかN」。全部はマウスを乗せると出る（話数がないときだけ赤） */
function missBadge(i) {
  const l = missingOf(i);
  if (!l.length) return "";
  const names = l.map(x => x.k);
  const head = names.slice(0, 2).join("・") + (names.length > 2 ? ` ほか${names.length - 2}` : "");
  return `<span class="miss pconly${names.includes("話数") ? " hot" : ""}" title="未入力：${esc(names.join("・"))}"><b>未入力</b>${esc(head)}</span>`;
}
function missOk(i) {
  if (!state.missOnly || !IS_PC()) return true;
  const l = missingOf(i);
  return state.missKey ? l.some(x => x.k === state.missKey) : l.length > 0;
}
const epNum = n => {
  const m = /\d+/.exec(n || "");
  return m ? +m[0] : null;
};

