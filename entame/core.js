/* ===================== エンタメ管理：土台 =====================
   決まった値・画面の状態・作品データの組み立て・保存（Firebase）・マスタ・話数・未入力チェック。
   ファイルの読み込み順：core → view → filters → detail → form → settings → yt → events（最後に起動） */

const DOW = ["月", "火", "水", "木", "金", "土", "日"];
/* 左メニュー */
const MODE_NAME = { w: "番組表", a: "アニメ", d: "ドラマ", m: "映画", s: "バラエティ", yt: "YouTube", sr: "シリーズ", mu: "主題歌", h: "視聴記録", o: "その他" };
/* o＝スマホの下メニュー「その他」（映画・バラエティ・YouTube・視聴記録のタイル）。左メニューには出さない */
const MODE_KEYS = Object.keys(MODE_NAME).filter(k => k !== "o");
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
  ["sp", "TV SP"],
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
const K_UI = "adb.v3.ui";
/* 共通部品（shared/u-core.js）：端末に覚える設定・エスケープ */
const ls = U.ls;
const esc = U.esc;
const $ = s => document.querySelector(s);
/* クリックの割り当て表を上から順に試す。表は [目印のセレクタ, 処理(押した要素, 作品など, イベント)] の並び。
   セレクタが null の行は毎回試す。処理が false を返したら「ここでは扱わない」として次の行へ。どれかが扱ったら true */
function runActions(table, e, ctx) {
  for (const [sel, fn] of table) {
    const el = sel ? e.target.closest(sel) : e.target;
    if (el && fn(el, ctx, e) !== false) return true;
  }
  return false;
}
const mins = t => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || "");
  return m ? +m[1] * 60 + +m[2] : 9999;
};

/* ---------- 画面の状態 ---------- */
let over = {}, // titles：作品（1作品1件）
  prog = {}; // progress：話数リストと視聴チェック
let items = [],
  eras = [];
/* 画面の状態。mode＝メニュー（w 番組表・a アニメ・d ドラマ・m 映画・s バラエティ・yt YouTube・sr シリーズ・mu 主題歌・h 視聴記録・o その他）、
   sub＝映画の絞り込み「種類」（all/a アニメ映画/d 実写）。
   そのほかは絞り込み（sf 視聴・era 放送年・type 種別・cour 放送クール・series シリーズ・vod 配信サイト）と並び順 */
const SUBS = { m: ["all", "a", "d"] };
const state = Object.assign(
  {
    mode: "w",
    sub: "all",
    q: "",
    sf: [],
    era: [],
    type: [],
    cour: [],
    courY: new Date().getFullYear(),
    sort: "new",
    grp: "cour",
    vod: "",
    unOnly: false,
    missOnly: false,
    missKey: "",
    fm: {},
  },
  ls.get(K_UI) || {},
  { q: "", limit: 200, fOpen: "", fSub: "", qOpen: false, wday: "", xser: false },
);
/* 端末に覚えた表示状態のうち、今は無い値は外す */
const arrOf = v => (Array.isArray(v) ? v : v && v !== "すべて" ? [v] : []);
["sf", "era", "cour", "type", "series"].forEach(k => (state[k] = arrOf(state[k])));
if (!state.fm || typeof state.fm !== "object") state.fm = {};
state.sf = state.sf.filter(x => [...STATUSES, "未設定"].includes(x));
if (!SORTS.some(([v]) => v === state.sort)) state.sort = "new";
if (!GROUPS.some(([v]) => v === state.grp)) state.grp = "cour";
if (!MODE_KEYS.includes(state.mode) && state.mode !== "o") state.mode = "w";
if (!(SUBS[state.mode] || ["all"]).includes(state.sub)) state.sub = "all";
if (typeof state.vod !== "string") state.vod = "";
state.unOnly = !!state.unOnly;
state.missOnly = !!state.missOnly;
if (typeof state.missKey !== "string") state.missKey = "";
/* 今の一覧のジャンル：all＝すべて、a＝アニメ、d＝ドラマ（映画では実写映画も）、x＝アニメ以外 */
const curKind = () => (state.mode === "a" || state.mode === "d" ? state.mode : SUBS[state.mode] ? state.sub : "all");
const saveUI = () =>
  ls.set(K_UI, {
    mode: state.mode,
    sub: state.sub,
    vod: state.vod,
    unOnly: state.unOnly,
    missOnly: state.missOnly,
    missKey: state.missKey,
    sf: state.sf,
    era: state.era,
    type: state.type,
    cour: state.cour,
    courY: state.courY,
    sort: state.sort,
    grp: state.grp,
    series: state.series,
    fm: state.fm,
  });
/* ---------- 作品のデータ：放送形態・主題歌・並び ---------- */
const TYPES = [
  ["すべて", "すべて"],
  ["tv", "TV"],
  ["sp", "TV SP"],
  ["stream", "配信"],
  ["movie", "映画"],
  ["ova", "OVA"],
];
const typeOk = i => !state.type.length || state.type.includes(mediaOf(i).media);
/* 放送形態: media＝tv（放送局 stations）・stream（配信サイト plat）・movie・ova。vods＝見られる配信サイト */
const mediaOf = i => ({ media: i.media || "tv", stations: i.stations || [], plat: i.plat || [], vods: i.vods || [] });
/* 映画・OVA・TV SP：毎週の放送時間と放送クールを持たない（TV SPは1回だけの放送。放送局はある） */
const noSched = m => m === "movie" || m === "ova" || m === "sp";
const hasSt = m => m === "tv" || m === "sp";
const MEDIA_LAB = { tv: "TV", sp: "TV SP", stream: "配信", movie: "映画", ova: "OVA" };
/* 映画の公開：rel＝"stream" なら配信で公開（Netflix映画など）。放送形態は映画のまま */
const relStream = i => mediaOf(i).media === "movie" && i.rel === "stream";
/* 放送形態のラベル [文字, 色クラス]。ジャンル映画の劇場公開はジャンルと同じなので出さない */
const mediaLabOf = i => {
  const md = mediaOf(i).media;
  if (md === "movie") return relStream(i) ? [i.k === "f" ? "配信" : "配信映画", "stream"] : i.k === "f" ? null : ["映画", "movie"];
  return MEDIA_LAB[md] ? [MEDIA_LAB[md], md] : null;
};
const ONE_LAB = { movie: "映画", ova: "OVA", sp: "TV SP" };
/* 主題歌: songs＝[{type,s,a,b,ex}] a〜b話で使われた曲。ex＝飛び飛びのときの追加の話 [{a,b}] */
const songsOf = i => i.songs || [];
/* 曲名とアーティストは入力欄ごとに別々に保存（自動で分けたりつないだりしない）。
   s は検索用に「曲名 アーティスト」を並べたもの。st がない古いデータは s をそのまま曲名として扱う */
const songTA = x => (x.st !== undefined ? { st: x.st || "", ar: x.ar || "" } : { st: x.s || "", ar: "" });
const songJoin = (st, ar) => [st.trim(), ar.trim()].filter(Boolean).join(" ");
function epSpan(it) {
  const ns = (it ? episodes(it) : []).map(e => epNum(e.n)).filter(n => n != null);
  return ns.length ? [Math.min(...ns), Math.max(...ns)] : null;
}
/* 曲の種類ごとの色（OP=青・ED=紫・主題歌=緑・挿入歌=橙） */
const SG_CLS = { OP: "t-op", ED: "t-ed", 主題歌: "t-th", 挿入歌: "t-in" };
const rangeTxt = x =>
  x.a == null && x.b == null ? "" : x.a != null && x.b === x.a ? `${x.a}話` : `${x.a ?? ""}〜${x.b ?? ""}話`;
/* 飛び飛びのときの追加の話：ex＝[{a,b}]。b が空なら a 話だけ */
const exOf = x => (x.ex || []).filter(r => r && r.a != null);
const exTxt = r => (r.b == null || r.b === r.a ? `${r.a}話` : `${r.a}〜${r.b}話`);
/* 使われた話を、範囲ごとのラベルの配列に（話の順に並べる） */
const rangeItems = x => {
  const l = [];
  if (x.a != null || x.b != null) l.push({ a: x.a ?? 1, b: x.b, t: rangeTxt(x) });
  exOf(x).forEach(r => l.push({ a: r.a, b: r.b ?? r.a, t: exTxt(r) }));
  return l.sort((p, q) => p.a - q.a);
};
const rangeList = x => rangeItems(x).map(r => r.t);
/* n話がどの範囲に入るか（rangeList の何番目か。入らなければ -1） */
const rangeHit = (x, n) => rangeItems(x).findIndex(r => n >= r.a && (r.b == null || n <= r.b));

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

/* ---------- 放送クール：「2026秋」の形。クールに関係なく続く作品は「通年」 ---------- */
const coursOf = i => i.cours || [];
const courLabel = c =>
  c === ALLYEAR ? "通年" : /^\d{4}/.test(c) ? `${c.slice(0, 4)}年${c.slice(4)}` : c;

/* ---------- 放送年の区切り：1年ずつ。古い年は30作品くらいになるまでまとめる ---------- */
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
/* 検索用に文字をそろえる（共通部品 U.norm） */
const norm = U.norm;

/* ---------- 保存（Firebase）。保存先への接続とログインは u-core.js（アプリ共通） ---------- */
let db = null;
/* 保存状況：保存中・未保存・再接続などは共通の U.sync（u-core.js）が見張る。
   ここで持つのは最後に変更した時刻だけ（各データに _at として記録し、どの端末でも同じ時刻を出す） */
let lastAt = 0;
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
const SV_CLS = { ok: "ok", busy: "ing", wait: "ing", err: "err" };
function saveNoteHtml() {
  const [k, t, why] = U.sync.view(!db || isSynced());
  return `<span class="sv ${SV_CLS[k]}"${why ? ` title="${esc(why)}"` : ""}><i></i>${t}</span>${lastAt ? `<span class="svat">最終変更 ${fmtAt(lastAt)}</span>` : ""}`;
}
function updateSaveNote() {
  const h = saveNoteHtml();
  ["#saveNote", "#sbSave"].forEach(q => {
    const n = $(q);
    if (n) n.innerHTML = h;
  });
}
function removeDoc(col, id) {
  lastAt = Date.now();
  return db.doc(`${col}/${id}`).delete();
}
function saveDoc(col, id, data) {
  data._at = Date.now();
  lastAt = data._at;
  return db.doc(`${col}/${id}`).set(data);
}
/* 渡した項目だけ書きかえる（ほかの端末で変えた項目は消さない） */
function mergeDoc(col, id, patch) {
  const data = { ...patch, _at: Date.now() };
  lastAt = data._at;
  return db.doc(`${col}/${id}`).set(data, { merge: true });
}
/* ---------- 同期：最新のデータ（fromCache=false）が届くまで「同期中」。裏から戻ったときのつなぎ直しは U.sync が行う ---------- */
var syncOk = { titles: false, progress: false };
const isSynced = () => syncOk.titles && syncOk.progress;
/* 話数の編集など、リストをまとめて保存するものは同期中は止める（視聴チェックは話ごとに保存するので止めない） */
function syncBlock() {
  if (isSynced()) return false;
  toast("最新のデータを読み込み中です。少しだけ待ってからもう一度お試しください");
  return true;
}
U.sync.on(updateSaveNote);
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
  /* シリーズはアニメ・ドラマ・映画・バラエティで共通の1つ（実写化などをまたいで同じ名前を使う） */
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
  const base = Array.isArray(master[key]) ? master[key] : MDEF[key] || [];
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
async function doLogout() {
  const s = await U.store();
  if (s.logout) await s.logout();
  else location.reload();
}
/* 前の版の形で保存されているデータを、今の形に直して保存し直す（最初に読み込んだとき1回だけ。直すものがなければ何もしない）
   ・シリーズの並び：アニメ用（seriesA）・ドラマ用（seriesD）の2つ → 共通の1つ（series）に。作品がないドラマ用のシリーズはメインのジャンルをドラマに
   ・「毎週の放送ではない」作品（曜日なし・放送時間なしの印なし） → 「放送時間なし」に
   最終変更の時刻（_at）は変えない */
let oldFixed = false;
function fixOldData() {
  if (oldFixed) return;
  oldFixed = true;
  const put = (path, data) => db.doc(path).set(data).catch(fail);
  if (Array.isArray(master.seriesA) || Array.isArray(master.seriesD)) {
    const { seriesA = [], seriesD = [], ...m } = master;
    if (!Array.isArray(m.series)) m.series = [...new Set([...seriesA, ...seriesD])];
    const used = new Set(Object.values(over).map(o => o && o.series));
    const sm = { ...(m.seriesMain || {}) };
    seriesD.forEach(n => !sm[n] && !used.has(n) && (sm[n] = "d"));
    m.seriesMain = sm;
    master = m;
    put("master/all", m);
  }
  Object.entries(over).forEach(([id, o]) => {
    if (!o || typeof o.t !== "string" || o.deleted) return;
    const md = o.media || "tv";
    if (noSched(md) || !o.from || (o.dow ?? -1) >= 0 || (o.noF || []).includes("time")) return;
    over[id] = { ...o, noF: [...(o.noF || []), "time"] };
    mergeDoc("titles", id, { noF: over[id].noF }).catch(fail);
    if (loaded) rebuild();
  });
}
/* 前の版で TV SP を追加したときに自動で作っていた話「SP」（1話だけ）を消す（番組表は放送日で出すので不要。最初に読み込んだとき1回だけ） */
let spDropped = false;
function dropAutoSp() {
  if (spDropped || !db) return;
  spDropped = true;
  Object.entries(prog).forEach(([id, p]) => {
    const o = over[id];
    if (!o || o.media !== "sp" || !p || !Array.isArray(p.eps) || p.eps.length !== 1 || p.eps[0].n !== "SP") return;
    delete prog[id];
    removeDoc("progress", id).catch(fail);
  });
}
/* ゴミ箱：削除した作品は deleted（削除した日時）を付けて30日残し、過ぎたら完全に削除する（最新のデータが届いたあと1回だけ） */
const TRASH_DAYS = 30;
const purged = { titles: false, yt: false };
function trashGone(col, id) {
  const src = col === "yt" ? ytOver : over;
  delete src[id];
  removeDoc(col, id).catch(fail);
  if (col === "titles") {
    delete prog[id];
    removeDoc("progress", id).catch(fail);
  }
}
function purgeTrash(col) {
  if (purged[col] || !db) return;
  purged[col] = true;
  const lim = Date.now() - TRASH_DAYS * 864e5;
  Object.entries(col === "yt" ? ytOver : over).forEach(([id, o]) => {
    if (o && o.deleted && +o.deleted < lim) trashGone(col, id);
  });
}
/* 保存先につないで、作品・視聴記録・マスタ・YouTube を読み込む（ほかの端末で変えた分も自動で反映） */
async function initStore() {
  const conn = await U.store();
  if (!conn.db) {
    banner(`<b>保存先に接続できませんでした</b>${esc(conn.error?.message || "")}　電波のよい場所で開き直してください。`);
    return;
  }
  db = conn.db;
  const got = { titles: false, progress: false, master: false };
  const done = () => {
    if (got.titles && got.master) fixOldData();
    if (!got.titles || !got.progress) return;
    loaded = true;
    dropAutoSp();
    calcLastAt();
    rebuild();
    render();
    if (openId && !epEdit) refreshSheet();
    setTimeout(maybeAskSgFix, 800);
  };
  /* 読み込みが止まったときは U.sync が自動でつなぎ直す。ここでは「同期中」に戻すだけ */
  const onErr = k => () => {
    if (k && syncOk[k]) {
      syncOk[k] = false;
      updateSaveNote();
    }
  };
  const docsOf = s => {
    const m = {};
    s.docs.forEach(d => (m[d.id] = d.data()));
    return m;
  };
  /* fromCache＝端末に残っていた古いデータ。最新（fromCache=false）が届いたら同期完了 */
  const syncMark = (k, s) => {
    const ok = s.fromCache === false;
    if (syncOk[k] !== ok) {
      syncOk[k] = ok;
      updateSaveNote();
    }
  };
  db.collection("titles").onSnapshot(
    s => {
      syncMark("titles", s);
      over = docsOf(s);
      if (s.fromCache === false) purgeTrash("titles");
      got.titles = true;
      done();
    },
    onErr("titles"),
    { meta: true },
  );
  db.collection("progress").onSnapshot(
    s => {
      syncMark("progress", s);
      prog = docsOf(s);
      got.progress = true;
      done();
      if (s.fromCache === false) migrateProg();
    },
    onErr("progress"),
    { meta: true },
  );
  db.collection("master").onSnapshot(s => {
    const d = s.docs.find(x => x.id === "all");
    master = d ? d.data() : {};
    got.master = true;
    if (got.titles) fixOldData();
    render();
    refreshSettings();
  }, onErr());
  db.collection("yt").onSnapshot(s => {
    ytOver = docsOf(s);
    if (s.fromCache === false) purgeTrash("yt");
    calcLastAt();
    ytRebuild();
    render();
    if (ytOpen) ytRefresh();
  }, onErr());
}
/* ---------- 話数（放送日時は「分」で持つ。日本時間の深夜25時台は前日扱い） ---------- */
const NOWMIN = () => Math.floor(Date.now() / 60000);
const WEEK = 7 * 1440;
function dayTimeToT(day, hm) {
  // 放送日＋「25:23」のような時刻（日本時間）→ 1970年からの分（世界時）
  if (!day) return 0;
  const [y, m, d] = day.split("-").map(Number);
  const v = mins(hm);
  return Math.floor(Date.UTC(y, m - 1, d) / 60000) + (v < 9999 ? v : 9 * 60) - 540;
}
const hasTime = it => mins(it.time) < 9999;
// 時刻なしの日付は 0:00 UTC（日本時間 9:00）で持っているので、時刻としては出さない
const noTime = (e, it) => e.nt || (e.t % 1440 === 0 && !(it && mins(it.time) === 540));
const epWhen = (e, it, withYear) => {
  const j = jst(e.t);
  if (!j) return "";
  return `${withYear && j.y !== new Date().getFullYear() ? j.y + "/" : ""}${j.md}(${j.dow})${noTime(e, it) ? "" : " " + j.hm}`;
};
/* 話ごとの「見た」の印は progress の w に { 話のキー: 見た日時 } で持つ（1＝日時なし、null・なし＝未視聴）。
   話のキー＝話の名前（同じ名前が2つ以上あるときは2つ目から「#2」…を付ける）。
   w がない作品は前の形（eps の各話に w・wt）として読む */
function epKeys(list) {
  const c = {};
  return list.map((e, i) => {
    const b = String(e.n || "").trim() || `#${i + 1}`;
    c[b] = (c[b] || 0) + 1;
    return c[b] > 1 ? `${b}#${c[b]}` : b;
  });
}
const hasWMap = p => !!(p && p.w && typeof p.w === "object" && !Array.isArray(p.w));
function episodes(it) {
  const p = prog[it.id];
  if (!p || !Array.isArray(p.eps)) return [];
  const m = hasWMap(p) ? p.w : null;
  const ks = m ? epKeys(p.eps) : null;
  return p.eps.map((e, i) => {
    const v = m ? +m[ks[i]] || 0 : e.w ? +e.wt || 1 : 0;
    return { n: e.n || "", sub: e.s || "", t: e.t || 0, w: v > 0, nt: !!e.nt, wt: v > 1 ? v : 0, sp: !!e.sp, go: e.go || 0 };
  });
}
/* 話数リストまるごとの保存用の中身（eps の w・wt は前の版の画面が開いたままの端末のための控え。読むときは w の印を使う） */
function progDoc(list) {
  const ks = epKeys(list),
    w = {};
  list.forEach((e, i) => {
    if (e.w) w[ks[i]] = e.wt || 1;
  });
  return {
    eps: list.map(e => ({ n: e.n, s: e.sub || "", t: e.t || 0, ...(e.nt ? { nt: 1 } : {}), ...(e.sp ? { sp: 1 } : {}), ...(e.go && e.go === e.t ? { go: e.go } : {}), ...(e.w ? { w: 1 } : {}), ...(e.w && e.wt ? { wt: e.wt } : {}) })),
    w,
  };
}
/* 前の形のままの話数を、今の形に直して保存し直す（最新のデータが届いたあと、1回だけ） */
let progMigrated = false;
async function migrateProg() {
  if (progMigrated || !db) return;
  progMigrated = true;
  const list = Object.entries(prog)
    .filter(([, p]) => p && Array.isArray(p.eps) && !hasWMap(p))
    .map(([id, p]) => {
      const d = progDoc(episodes({ id }));
      if (p._at) d._at = p._at;
      prog[id] = d;
      return [`progress/${id}`, d];
    });
  if (!list.length) return;
  try {
    for (let i = 0; i < list.length; i += 400) await db.setMany(list.slice(i, i + 400));
  } catch (e) {
    fail(e);
  }
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
/* 話数リストが未登録（未視聴・視聴中の作品、映画・OVA・TV SP以外） */
/* ---------- 未入力チェック（一覧のバッジ・詳細のアラート・絞り込み） ----------
   編集画面の項目のうち、その作品に関係あるものだけを見る。シリーズは「なければ空欄」なので対象外。
   k＝表示名、j＝押したときに開く編集項目（data-jump）、n＝「なし」にできる項目のキー（noF） */
/* 今日（日本時間）のクール：1〜3月＝冬、4〜6月＝春、7〜9月＝夏、10〜12月＝秋 */
const nowCour = () => {
  const d = new Date(Date.now() + 540 * 60000);
  return `${d.getUTCFullYear()}${SEASONS[Math.floor(d.getUTCMonth() / 3)]}`;
};
const IS_PC = () => matchMedia("(min-width:900px)").matches;
/* ---------- 話数の日付のチェック（話数タブの「要確認」・未入力アラートの「日付の確認」） ----------
   rev＝前の話より前の日付 / gap＝前の話から180日以上空いている / start＝1話の日付が開始日と違う /
   dow＝放送曜日と1日ずれている（深夜枠で実際の日付と「木 26:00」の書き方が混ざったとき。-1＝1日前にずらす、1＝1日後に）
   映画は対象外。OVAは発売の間が空くことが多いので gap を見ない。
   「問題なし」を押した話は rev・gap を見ない（go＝押したときの日時。日付を変えたらまたチェックする）。全話が同じ日（まとめて配信）のときは曜日を見ない */
const dayNo = d => Math.round(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86400e3);
const DATE_WHY = { rev: "前の話より前の日付です", gap: "前の話から半年以上空いています", start: "開始日と違います", dow: "放送曜日と1日ずれています" };
function epDateCheck(it) {
  const md = mediaOf(it).media;
  const l = episodes(it);
  const out = { eps: l.map(() => null), start: "", dowN: 0, n: 0 };
  if (md === "movie") return out;
  const ds = l.map(e => (e.t ? jst(e.t).day : ""));
  const dated = ds.filter(Boolean);
  if (!dated.length) return out;
  const mark = (i, k, v = true) => ((out.eps[i] = out.eps[i] || {})[k] = v);
  let prev = -1;
  ds.forEach((d, i) => {
    if (!d) return;
    if (prev >= 0) {
      const g = dayNo(d) - dayNo(ds[prev]);
      const ok = l[i].go && l[i].go === l[i].t;
      if (g < 0) !ok && mark(i, "rev");
      else if (g >= 180 && md !== "ova" && !ok) mark(i, "gap");
    }
    prev = i;
  });
  const f = normDate(it.from || "");
  if (f && ds[0] && ds[0] !== f) {
    mark(0, "start");
    out.start = ds[0];
  }
  const weekly = !noSched(md) && f && !(it.noF || []).includes("time") && !dated.every(d => d === dated[0]);
  if (weekly) {
    const fd = (dayNo(f) + 4) % 7; // 1970/1/1＝木
    ds.forEach((d, i) => {
      if (!d) return;
      const df = ((dayNo(d) + 4) % 7 - fd + 7) % 7;
      if (df === 1 || df === 6) {
        mark(i, "dow", df === 1 ? -1 : 1);
        out.dowN++;
      }
    });
  }
  out.n = out.eps.filter(Boolean).length;
  return out;
}
const todayStr = () => new Date(Date.now() + 540 * 60000).toISOString().slice(0, 10);
/* 最初のクールが、開始日（または2週間後）の季節と合っているか（9月末スタートの秋アニメなど） */
function courMismatch(i) {
  const cs = coursOf(i).filter(c => /^\d{4}/.test(c) && c !== ALLYEAR);
  if (!cs.length) return false;
  const first = cs.slice().sort((a, b) => courKey(a) - courKey(b))[0];
  const f = Date.parse(i.from.slice(0, 10) + "T00:00:00Z");
  if (isNaN(f)) return false;
  const cour = t => {
    const d = new Date(t);
    return `${d.getUTCFullYear()}${SEASONS[Math.floor(d.getUTCMonth() / 3)]}`;
  };
  return ![0, 14].some(k => cour(f + k * 86400e3) === first);
}
const courKey = c => +c.slice(0, 4) * 10 + SEASONS.indexOf(c.slice(4));
/* 配信URLのドメインから配信サイトを判定（分からないURLは null） */
const VURL_SITES = [
  [/netflix\.com/, "netflix"],
  [/disneyplus\.com|disney\.co\.jp/, "disney"],
  [/abema\.tv|abema\.app/, "abema"],
  [/unext\.jp/, "unext"],
  [/primevideo\.com|amazon\.co\.jp|amazon\.com/, "amazon"],
  [/hulu\.jp/, "hulu"],
  [/animestore\.docomo\.ne\.jp/, "danime"],
  [/lemino\.docomo\.ne\.jp/, "lemino"],
  [/fod\.fujitv\.co\.jp/, "fod"],
  [/tver\.jp/, "tver"],
  [/youtube\.com|youtu\.be/, "youtube"],
  [/tv\.apple\.com/, "apple"],
  [/crunchyroll\.com/, "crunchyroll"],
];
const vurlSite = u => {
  const s = String(u || "").toLowerCase();
  const hit = s && VURL_SITES.find(([re]) => re.test(s));
  return hit ? hit[1] : null;
};
/* 配信サイト名を判定用の名前に（Netflix・Disney＋・ABEMA・U-NEXT・Prime Video・dアニメストアなど） */
const normVod = v => {
  const s = String(v || "").normalize("NFKC").toLowerCase().replace(/[\s\-・＋+]/g, "");
  if (/netflix|ネトフリ/.test(s)) return "netflix";
  if (/disney|ディズニー/.test(s)) return "disney";
  if (/abema|アベマ/.test(s)) return "abema";
  if (/unext/.test(s)) return "unext";
  if (/prime|amazon|アマゾン/.test(s)) return "amazon";
  if (/hulu/.test(s)) return "hulu";
  if (/dアニメ|danime/.test(s)) return "danime";
  if (/lemino/.test(s)) return "lemino";
  if (/fod/.test(s)) return "fod";
  if (/tver/.test(s)) return "tver";
  if (/youtube/.test(s)) return "youtube";
  if (/apple/.test(s)) return "apple";
  if (/crunchyroll/.test(s)) return "crunchyroll";
  return s;
};
/* タイトルの重複：空白・記号・全角半角・大文字小文字の違いは同じとみなす。items が変わったときだけ数え直す */
const normTitle = t => String(t || "").normalize("NFKC").toLowerCase().replace(/[\s・:：\-－!！?？、。,.「」『』（）()]/g, "");
let dupCache = { src: null, set: new Set() };
function dupTitles() {
  if (dupCache.src === items) return dupCache.set;
  const cnt = {};
  items.forEach(x => {
    const k = normTitle(x.t);
    if (k) cnt[k] = (cnt[k] || 0) + 1;
  });
  dupCache = { src: items, set: new Set(Object.keys(cnt).filter(k => cnt[k] > 1)) };
  return dupCache.set;
}
function missingOf(i) {
  const m = mediaOf(i);
  const md = m.media,
    ns = noSched(md);
  const sl = songsOf(i);
  const nf = i.noF || [];
  const out = [];
  const add = (k, j = "", n = "") => (!n || !nf.includes(n)) && out.push({ k, j, n });
  if (!i.s) add("ステータス");
  if (!ns && !episodes(i).length) add("話数");
  /* アニメ：登録済みの話のうち、1話でもサブタイトルが空なら（「なし」にはできない。サブタイトル欄はアニメだけ）
     今クール・通年の作品はサブタイトル未定が多いので対象外 */
  if (i.k === "a" && !(ns && episodes(i).length < 2) && !coursOf(i).some(c => c === ALLYEAR || c === nowCour()) && episodes(i).some(e => !(e.sub || "").trim())) add("サブタイトル");
  if (episodes(i).some(e => !epVal(e.n) && !e.sp)) add("話数の表記");
  if (epDateCheck(i).n) add("日付の確認");
  /* 「視聴済み」なのにチェックが付いていない話がある（勝手には付けない。話数タブで自分で付ける） */
  if (i.s === "視聴済み" && episodes(i).some(e => !e.w)) add("未チェックの話");
  /* 話数の抜け（1・2・4話…）・重複（同じ話数が2つ）。数字の話数だけ見る（5.5話などは抜けに数えない） */
  const nums = episodes(i).filter(e => !e.sp).map(e => epNum(e.n)).filter(n => n != null);
  const ints = [...new Set(nums.filter(n => Number.isInteger(n)))].sort((a, b) => a - b);
  if (ints.length > 1 && ints[ints.length - 1] - ints[0] + 1 > ints.length) add("話数の抜け");
  if (new Set(nums).size < nums.length) add("話数の重複");
  /* ステータスのずれ：視聴中なのにチェック0話／未視聴なのにチェックあり／放送前なのに視聴済み */
  const eps = episodes(i);
  if ((i.s === "視聴中" && eps.length && !eps.some(e => e.w)) || (i.s === "未視聴" && eps.some(e => e.w)) || (i.s === "視聴済み" && i.from && i.from.slice(0, 10) > todayStr())) add("ステータスのずれ");
  if (!i.from) add({ movie: "公開日", ova: "発売日", sp: "放送日" }[md] || "開始日", "f-from");
  if (!ns && !(i.time || "").trim()) add(md === "stream" ? "配信時間" : "放送時間", "f-time", "time");
  if (hasSt(md) && !m.stations.length) add("放送局", "fMedia", "st");
  if (md === "stream" && !m.plat.length) add("配信サイト", "fMedia", "plat");
  if (md !== "stream" && !m.vods.length) add("配信サイト", "fMedia", "vods");
  if (!ns && !(i.cours || []).length) add("放送クール", "coursBox", "cours");
  /* クールと開始日が合わない（最初のクールが開始日の季節と違う。9月末スタートの秋アニメなどは2週間までずれてよい） */
  if (!ns && i.from && courMismatch(i)) add("クールのずれ", "coursBox");
  // 曲が1曲もなく「なし」にもしていないときだけ（OP・ED・主題歌まとめて1項目）
  if (!sl.some(x => (x.s || "").trim()) && !(i.noSongs || []).length) out.push({ k: "OP・ED・主題歌", j: "sgList", n: "", ns: 1 });
  /* 曲名・アーティストのどちらかだけ入っている曲（編集画面の2つの入力欄と同じ中身で判定） */
  const ta = sl.filter(x => (x.s || "").trim()).map(x => ({ st: songTA(x).st.trim(), ar: songTA(x).ar.trim() }));
  if (ta.some(x => x.st && !x.ar)) add("アーティスト", "sgList");
  if (ta.some(x => !x.st && x.ar)) add("曲名", "sgList");
  /* 曲の使われた話が、登録されている話数を超えている（OPが1〜30話なのに24話まで、など） */
  const em = Math.max(0, ...nums);
  if (em && sl.some(x => [x.a, x.b, ...exOf(x).flatMap(r => [r.a, r.b])].some(v => v != null && +v > em))) add("曲の話数", "sgList");
  if (!(i.url || "").trim()) add("公式サイト", "f-url", "url");
  if (!(i.vurl || "").trim()) add("配信URL", "f-vurl", "vurl");
  /* 配信URLのサイトが、作品の配信サイトに入っていない（URLからサイトが分かるときだけ） */
  const us = vurlSite(i.vurl);
  if (us && ![...m.plat, ...m.vods].some(v => normVod(v) === us)) add("配信URLのずれ", "f-vurl");
  /* 同じタイトルの作品がほかにもある（二重登録かも） */
  if (dupTitles().has(normTitle(i.t))) add("タイトルの重複", "f-t");
  return out;
}
/* 「なし」にできる項目（noF に入れる）。ステータス・話数・開始日は必ずあるはずなので「なし」にしない */
const NOF_LAB = { time: "時間", st: "放送局", plat: "配信サイト", vods: "配信サイト", cours: "放送クール", url: "公式サイト", vurl: "配信URL" };
const nofHas = (i, k) => (i.noF || []).includes(k);
const nofBox = (k, lab) =>
  `<label class="yr nofl" title="${lab || NOF_LAB[k]}なし"><input type="checkbox" class="nof" value="${k}" ${(form.noF || []).includes(k) ? "checked" : ""} aria-label="${lab || NOF_LAB[k]}なし"><span>なし</span></label>`;
/* 絞り込みの「要確認」の選択肢のまとまり */
const MISS_GROUPS = [
  ["話数", ["話数", "話数の表記", "話数の抜け", "話数の重複", "サブタイトル", "日付の確認", "未チェックの話"]],
  ["基本情報", ["ステータス", "開始日", "公開日", "発売日", "放送時間", "配信時間", "放送局", "配信サイト", "放送クール", "公式サイト", "配信URL"]],
  ["曲", ["OP・ED・主題歌", "曲名", "アーティスト", "曲の話数"]],
  ["ずれ・重複", ["ステータスのずれ", "クールのずれ", "配信URLのずれ", "タイトルの重複"]],
];
const MISS_KEYS = ["ステータス", "話数", "話数の表記", "話数の抜け", "話数の重複", "日付の確認", "未チェックの話", "ステータスのずれ", "サブタイトル", "開始日", "公開日", "発売日", "放送時間", "配信時間", "放送局", "配信サイト", "放送クール", "クールのずれ", "OP・ED・主題歌", "曲名", "アーティスト", "曲の話数", "公式サイト", "配信URL", "配信URLのずれ", "タイトルの重複"];
/* 一覧のバッジ：先頭2項目＋「ほかN」。全部はマウスを乗せると出る（話数がないときだけ赤） */
function missBadge(i) {
  const l = missingOf(i);
  if (!l.length) return "";
  const names = l.map(x => x.k);
  const head = names.slice(0, 2).join("・") + (names.length > 2 ? ` ほか${names.length - 2}` : "");
  return `<span class="miss${names.includes("話数") ? " hot" : ""}" title="要確認：${esc(names.join("・"))}"><b>要確認</b><span class="mh">${esc(head)}</span></span>`;
}
function missOk(i) {
  if (!state.missOnly) return true;
  const l = missingOf(i);
  return state.missKey ? l.some(x => x.k === state.missKey) : l.length > 0;
}
/* 話数は数字だけ（5.5 など小数も可）。「1話」「第1話」「1」「第一話」「第一幕」は数字の話数（漢数字・「第◯」の後ろの単位も可。EP_NUM・EP_NOT・kanjiNum は paste.js）。
   それ以外（OVA・総集編など）は「文字で入力」にチェック（sp）した話だけ文字で持てる。チェックなしの文字の話数は表記アラートの対象 */
let EP_PLAIN = null;
const epVal = n => {
  EP_PLAIN = EP_PLAIN || new RegExp(`^(?:第\\s*(${EP_NUM})\\s*(?:${EP_NOT}\\p{L})?|(${EP_NUM})\\s*[話回幕夜]?)$`, "u");
  const m = EP_PLAIN.exec(String(n ?? "").trim());
  if (!m) return "";
  const t = zen(m[1] || m[2]);
  const k = /^[\d.]+$/.test(t) ? +t : kanjiNum(t);
  return Number.isFinite(k) ? String(k) : "";
};
/* 並び順・照合用の話数（数字の話数でなければ、文字の中の最初の数字） */
const epNum = n => {
  const v = epVal(n);
  if (v) return +v;
  const m = /\d+(?:\.\d+)?/.exec(n || "");
  return m ? +m[0] : null;
};
const epLab = v => `${+v}話`;
/* 折りたたみの印（FOLD_IC）と並び替え（GRIP／SORT_DONE）は、ほかのアプリと共通で shared/u-core.js にある */
