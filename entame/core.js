/* ===================== エンタメ管理：土台 =====================
   決まった値・画面の状態・作品データの組み立て・保存（Firebase）・マスタ・話数・未入力チェック。
   ファイルの読み込み順：core → view → filters → detail → form → settings → yt → events（最後に起動） */

const DOW = ["月", "火", "水", "木", "金", "土", "日"];
/* 左メニュー */
const MODE_NAME = { w: "番組表", a: "アニメ", d: "ドラマ", m: "映画", s: "配信", yt: "YouTube" };
const MODE_KEYS = Object.keys(MODE_NAME);
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
/* 画面の状態。mode＝左メニュー（w 番組表・a アニメ・d ドラマ・m 映画・s 配信・yt YouTube）、
   sub＝映画・配信の中の下の項目（映画：all/a アニメ映画/d 実写、配信：all/a アニメ/x ドラマ・バラエティ）。
   そのほかは絞り込み（sf 視聴・era 放送年・type 種別・cour 放送クール・series シリーズ・vod 配信サイト）と並び順 */
const SUBS = { m: ["all", "a", "d"], s: ["all", "a", "x"] };
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
  },
  ls.get(K_UI) || {},
  { q: "", series: [], limit: 200, fOpen: "", wday: "", xser: false },
);
/* 端末に覚えた表示状態のうち、今は無い値は外す */
const arrOf = v => (Array.isArray(v) ? v : v && v !== "すべて" ? [v] : []);
["sf", "era", "cour", "type"].forEach(k => (state[k] = arrOf(state[k])));
state.sf = state.sf.filter(x => [...STATUSES, "未設定"].includes(x));
if (!SORTS.some(([v]) => v === state.sort)) state.sort = "new";
if (!GROUPS.some(([v]) => v === state.grp)) state.grp = "cour";
if (!MODE_KEYS.includes(state.mode)) state.mode = "w";
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
  });
/* ---------- 作品のデータ：放送形態・主題歌・並び ---------- */
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
/* 検索用に文字をそろえる（大文字小文字・全角半角・カタカナ→ひらがな、記号や空白は無視） */
const norm = t =>
  String(t || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s・、。!！?？〜~\-－]/g, "");

/* ---------- 保存（Firebase）。保存先への接続とログインは u-core.js（アプリ共通） ---------- */
let db = null;
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
  const st = saving ? ["ing", "保存中…"] : saveErr ? ["err", "保存できませんでした"] : ["ok", "保存済み"];
  return `<span class="sv ${st[0]}"><i></i>${st[1]}</span>${lastAt ? `<span class="svat">最終変更 ${fmtAt(lastAt)}</span>` : ""}`;
}
function updateSaveNote() {
  const n = $("#saveNote");
  if (n) n.innerHTML = saveNoteHtml();
  const b = $("#sbSave");
  if (b) b.innerHTML = saveNoteHtml();
}
/* 書き込み（保存・削除）を1回分：保存中の表示を出し、失敗したら「保存できませんでした」 */
async function write(job) {
  saving++;
  saveErr = false;
  updateSaveNote();
  try {
    await job();
  } catch (e) {
    saveErr = true;
    throw e;
  } finally {
    saving = Math.max(0, saving - 1);
    updateSaveNote();
  }
}
function removeDoc(col, id) {
  lastAt = Date.now();
  return write(() => db.doc(`${col}/${id}`).delete());
}
function saveDoc(col, id, data) {
  data._at = Date.now();
  lastAt = data._at;
  return write(() => db.doc(`${col}/${id}`).set(data));
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
/* 設定のいちばん下：ログアウト */
const accountHtml = () =>
  `<div class="bkbox"><div class="bkrow"><button type="button" class="u-btn sm svbtn" data-logout="1">ログアウト</button></div></div>`;
/* 前の版の形で保存されているデータを、今の形に直して保存し直す（最初に読み込んだとき1回だけ。直すものがなければ何もしない）
   ・シリーズの並び：アニメ用（seriesA）・ドラマ用（seriesD）の2つ → 共通の1つ（series）に。作品がないドラマ用のシリーズはメインのジャンルをドラマに
   ・「毎週の放送ではない」作品（曜日なし・放送時間なしの印なし） → 「放送時間なし」に
   最終変更の時刻（_at）は変えない */
let oldFixed = false;
function fixOldData() {
  if (oldFixed) return;
  oldFixed = true;
  const put = (path, data) => write(() => db.doc(path).set(data)).catch(fail);
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
    put("titles/" + id, over[id]);
    if (loaded) rebuild();
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
    calcLastAt();
    rebuild();
    render();
    if (openId && !epEdit) refreshSheet();
  };
  const onErr = e =>
    banner(`<b>保存データを読み込めませんでした</b>${esc(e?.message || "")}　ページを開き直してください。`);
  const docsOf = s => {
    const m = {};
    s.docs.forEach(d => (m[d.id] = d.data()));
    return m;
  };
  db.collection("titles").onSnapshot(s => {
    over = docsOf(s);
    got.titles = true;
    done();
  }, onErr);
  db.collection("progress").onSnapshot(s => {
    prog = docsOf(s);
    got.progress = true;
    done();
  }, onErr);
  db.collection("master").onSnapshot(s => {
    const d = s.docs.find(x => x.id === "all");
    master = d ? d.data() : {};
    got.master = true;
    if (got.titles) fixOldData();
    render();
    refreshSettings();
  }, onErr);
  db.collection("yt").onSnapshot(s => {
    ytOver = docsOf(s);
    calcLastAt();
    ytRebuild();
    render();
    if (ytOpen) ytRefresh();
  }, onErr);
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
  const sl = songsOf(i);
  const nf = i.noF || [];
  const out = [];
  const add = (k, j = "", n = "") => (!n || !nf.includes(n)) && out.push({ k, j, n });
  if (!i.s) add("ステータス");
  if (md !== "movie" && md !== "sp" && !episodes(i).length) add("話数");
  if (!i.from) add({ movie: "公開日", ova: "発売日", sp: "放送日" }[md] || "開始日", "f-from");
  if (!ns && !(i.time || "").trim()) add(md === "stream" ? "配信時間" : "放送時間", "f-time", "time");
  if (hasSt(md) && !m.stations.length) add("放送局", "fMedia", "st");
  if (md === "stream" && !m.plat.length) add("配信サイト", "fMedia", "plat");
  if (md !== "stream" && !m.vods.length) add("見られる配信", "fMedia", "vods");
  if (!ns && !(i.cours || []).length) add("放送クール", "coursBox", "cours");
  // 曲が1曲もなく「なし」にもしていないときだけ（OP・ED・主題歌まとめて1項目）
  if (!sl.some(x => (x.s || "").trim()) && !(i.noSongs || []).length) out.push({ k: "OP・ED・主題歌", j: "sgList", n: "", ns: 1 });
  /* 曲名・アーティストのどちらかだけ入っている曲（編集画面の2つの入力欄と同じ中身で判定） */
  const ta = sl.filter(x => (x.s || "").trim()).map(x => ({ st: songTA(x).st.trim(), ar: songTA(x).ar.trim() }));
  if (ta.some(x => x.st && !x.ar)) add("アーティスト", "sgList");
  if (ta.some(x => !x.st && x.ar)) add("曲名", "sgList");
  if (!(i.url || "").trim()) add("公式サイト", "f-url", "url");
  if (!(i.vurl || "").trim()) add("配信URL", "f-vurl", "vurl");
  return out;
}
/* 「なし」にできる項目（noF に入れる）。ステータス・話数・開始日は必ずあるはずなので「なし」にしない */
const NOF_LAB = { time: "時間", st: "放送局", plat: "配信サイト", vods: "見られる配信", cours: "放送クール", url: "公式サイト", vurl: "配信URL" };
const nofHas = (i, k) => (i.noF || []).includes(k);
const nofBox = (k, lab) =>
  `<label class="yr nofl" title="${lab || NOF_LAB[k]}なし"><input type="checkbox" class="nof" value="${k}" ${(form.noF || []).includes(k) ? "checked" : ""} aria-label="${lab || NOF_LAB[k]}なし"><span>なし</span></label>`;
const MISS_KEYS = ["ステータス", "話数", "開始日", "公開日", "発売日", "放送時間", "配信時間", "放送局", "配信サイト", "見られる配信", "放送クール", "OP・ED・主題歌", "曲名", "アーティスト", "公式サイト", "配信URL"];
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

