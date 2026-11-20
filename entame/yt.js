/* ================= YouTube 再生リスト ================= */
/* 視聴ステータス: 視聴済み / 見ない。どちらでもないものは「未視聴」 */
const YT_STATUS = ["視聴中", "視聴済み", "見ない"];
const UNSEEN = "未視聴";
const YT_CLS = { 未視聴: "s-未視聴", 視聴中: "s-視聴中", 視聴済み: "s-視聴済み", 見ない: "s-見ない" };
/* ジャンル: 一人実況 / コラボ実況（TOP4・最俺・P-P などのグループ） */
const SOLO = "一人実況",
  COLLAB = "コラボ実況";
const ytCat = x => (!x.g ? "" : x.g === SOLO ? SOLO : COLLAB);
const ytSub = x => (ytCat(x) === COLLAB && x.g !== COLLAB ? x.g : "");
const ytSubs = () => M("groups");
/* 一人実況のグループ（シリーズ・単発など）。編集画面で選んだものだけ（自動では決めない） */
const ytSolo = x => (ytCat(x) === SOLO ? x.sg || "" : "");
const ytGrp = x => (ytCat(x) === SOLO ? ytSolo(x) : ytSub(x));
const ytGenreLab = x => {
  const c = ytCat(x);
  if (!c) return "";
  const sb = ytGrp(x);
  return `<span class="lab s">${c}${sb ? `・${esc(sb)}` : ""}</span>`;
};
const ytGenreOk = x =>
  yst.genre === "すべて" || (ytCat(x) === yst.genre && (yst.sub === "すべて" || ytGrp(x) === yst.sub));
let ytOver = {},
  ytItems = [];
const yst = Object.assign(
  {
    author: "すべて",
    genre: "すべて",
    sub: "すべて",
    q: "",
    pri: [],
    sort: "new",
    fp: "",
    grp: "genre",
    missOnly: false,
    missKey: "",
  },
  ls.get("adb.v3.yt") || {},
  { q: "", fSub: "", qOpen: false },
);
/* 端末に覚えた表示状態のうち、今は無い値は外す */
yst.pri = [...new Set(arrOf(yst.pri))].filter(p => [UNSEEN, ...YT_STATUS].includes(p));
if (!["すべて", SOLO, COLLAB].includes(yst.genre)) yst.genre = "すべて";
yst.fp = "";
const saveYtUI = () =>
  ls.set("adb.v3.yt", {
    author: yst.author,
    genre: yst.genre,
    sub: yst.sub,
    pri: yst.pri,
    sort: yst.sort,
    fp: yst.fp,
    grp: yst.grp,
    missOnly: yst.missOnly,
    missKey: yst.missKey,
  });
/* 再生リスト＝データベースの yt の各ドキュメント */
function ytRebuild() {
  ytItems = Object.entries(ytOver)
    .filter(([, o]) => o && o.t && !o.deleted)
    .sort(byOrder)
    .map(([id, o]) => ({ id, a: "", g: "", s: "", up: "", dur: "", n: 0, pl: "", sm: "", ...o }));
}
const ytAuthors = () => M("authors");
const ytSt = x => (YT_STATUS.includes(x.s) ? x.s : "");
function ytPill(s) {
  s = s || UNSEEN;
  return `<span class="pill ${YT_CLS[s]}">${esc(stLabel(s))}</span>`;
}
/* 貼り付けた日付を yyyy-mm-dd に（2024/03/08・2024年3月8日・2024-3-8・Mar 8, 2024 など） */
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function parseDay(t) {
  t = String(t || "")
    .normalize("NFKC")
    .trim();
  if (!t) return "";
  let m;
  if ((m = /(\d{4})\s*[\/\-.年]\s*(\d{1,2})\s*[\/\-.月]\s*(\d{1,2})/.exec(t)));
  else if ((m = /([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(t))) m = [0, m[3], MON[m[1].toLowerCase()], m[2]];
  else if ((m = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/.exec(t))) m = [0, m[3], MON[m[2].toLowerCase()], m[1]];
  else if ((m = /^(\d{4})(\d{2})(\d{2})$/.exec(t)));
  else return null;
  const y = +m[1],
    mo = +m[2],
    d = +m[3];
  if (!y || !mo || mo > 12 || !d || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
/* 再生時間：「630」→6時間30分、「45」→45分、「6:30」→6時間30分。すでに「〜時間〜分」ならそのまま */
function parseDur(t) {
  t = String(t || "")
    .normalize("NFKC")
    .trim();
  if (!t) return "";
  if (/時間|分/.test(t)) return t;
  let h = 0,
    mi = 0,
    m;
  if ((m = /^(\d+):(\d{1,2})(?::\d{1,2})?$/.exec(t))) {
    h = +m[1];
    mi = +m[2];
  } else if (/^\d+$/.test(t)) {
    if (t.length <= 2) mi = +t;
    else {
      h = +t.slice(0, -2);
      mi = +t.slice(-2);
    }
  } else return t;
  if (mi >= 60) {
    h += Math.floor(mi / 60);
    mi %= 60;
  }
  return (h ? `${h}時間` : "") + (mi || !h ? `${mi}分` : "");
}
/* 未入力の項目（作品の未入力アラートと同じ形）。「なし」にできる項目は noF に入れる */
const YT_NOF_LAB = { dur: "再生時間", pl: "再生リスト", sm: "まとめ動画" };
/* 「未入力あり」をオンにしたときの項目ボタンの並び（作品の MISS_KEYS と同じ考え方） */
const YT_MISS_KEYS = ["投稿者", "ジャンル", "初回投稿日", "再生時間", "パート数", "再生リスト", "まとめ動画"];
if (!YT_MISS_KEYS.includes(yst.missKey)) yst.missKey = "";
function ytMissingOf(x) {
  const nf = x.noF || [],
    out = [];
  const add = (k, j, n = "") => (!n || !nf.includes(n)) && out.push({ k, j, n });
  if (!x.a) add("投稿者", "yfAuthor");
  if (!ytCat(x)) add("ジャンル", "yfGenre");
  if (!x.up) add("初回投稿日", "y-up");
  if (!x.dur) add("再生時間", "y-dur", "dur");
  if (!+x.n) add("パート数", "y-n");
  if (!String(x.pl || "").trim()) add("再生リスト", "y-pl", "pl");
  if (!String(x.sm || "").trim()) add("まとめ動画", "y-sm", "sm");
  return out;
}
function ytMissBadge(x) {
  return missPill(ytMissingOf(x).map(m => m.k), false);
}
/* 詳細のアラート（作品の詳細と同じ）：たたまずに、足りない項目のボタンを最初から全部出す。ボタンを押すとその項目だけ詳細の中で編集 */
function ytMissDetail(x) {
  const l = ytMissingOf(x);
  if (!l.length) return "";
  const btn = m =>
    `<span class="mi"><button type="button" data-jump="${m.j}">✎ ${esc(m.k)}</button>${m.n ? `<button type="button" class="nb" data-ynof="${m.n}" title="${esc(m.k)}を「なし」にする">なし</button>` : ""}</span>`;
  return `<div class="dmiss" role="group" aria-label="要確認 ${l.length}項目"><div class="dmh">⚠ 要確認 ${l.length}項目</div><div class="mbtns">${l.map(btn).join("")}</div></div>`;
}
function ytRow(x) {
  const pw = +x.pw || 0,
    n = +x.n || 0;
  return `<div class="row yrow lst ls-${esc(ytSt(x) || UNSEEN)}${/視聴済み/.test(x.s) ? " done" : ""}"><button class="slot" type="button" data-yt="${x.id}">
    <span class="time">${x.up ? `${+x.up.slice(5, 7)}/${+x.up.slice(8, 10)}<small>${x.up.slice(0, 4)}</small>` : ""}</span>
    <span class="ttl"><strong>${esc(x.t)}</strong><span class="meta"><span class="pmob">${ytPill(ytSt(x))}</span>${ytGenreLab(x)}${n ? `<span class="lab">全${n}本</span>` : ""}${x.dur ? `<span class="lab">${esc(x.dur)}</span>` : ""}${ytMissBadge(x)}</span>
      ${pw && n ? `<span class="next"><span class="ybar"><i style="width:${Math.min(100, (pw / n) * 100)}%"></i></span><span>${pw}/${n}本</span></span>` : ""}</span>
    <span class="pwide">${ytPill(ytSt(x))}</span></button>
    ${x.pl ? `<a class="tick yplay" href="${esc(x.pl)}" target="_blank" rel="noopener" aria-label="${esc(x.t)}をYouTubeで開く"><span>▶</span>再生</a>` : ""}</div>`;
}
function ytSortFn() {
  return yst.sort === "title"
    ? (a, b) => String(a.t).localeCompare(String(b.t), "ja")
    : yst.sort === "added"
      ? (a, b) => String(b.added || "").localeCompare(String(a.added || ""))
      : yst.sort === "old"
        ? (a, b) => String(a.up || "9").localeCompare(String(b.up || "9"))
        : (a, b) => String(b.up || "").localeCompare(String(a.up || ""));
}
/* ジャンルごと：一人実況（設定の順）→ コラボ実況（設定の順）→ コラボ（グループなし）→ 未設定 */
function ytGenreGroups(list) {
  const secs = [
    ...M("soloGroups").map(g => [SOLO, g]),
    [SOLO, ""],
    ...ytSubs().map(g => [COLLAB, g]),
    [COLLAB, ""],
    ["", ""],
  ];
  const by = new Map();
  list.forEach(x => {
    const k = ytCat(x) + "|" + (ytCat(x) ? ytGrp(x) : "");
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(x);
  });
  const keys = secs.map(([c, g]) => c + "|" + g).filter(k => by.has(k));
  [...by.keys()].forEach(k => {
    if (!keys.includes(k)) keys.push(k);
  });
  const ck = keys.map(k => "ytg:" + k);
  return (
    bulkBtns(ck) +
    keys
      .map(k => {
        const [c, g] = k.split("|");
        const l = by.get(k).sort(ytSortFn());
        const key = "ytg:" + k;
        const title = !c ? "ジャンル未設定" : g ? `${c}・${g}` : c;
        return `<section class="cgroup">${gHead(key, title, l.length + "本")}${collapsed.has(key) ? "" : `<div class="slots">${l.map(ytRow).join("")}</div>`}</section>`;
      })
      .join("")
  );
}
function ytPopHtml(panels) {
  const k = yst.fp;
  if (!panels[k]) return "";
  const T = { genre: "ジャンル", sort: "並び替え" };
  return `<div class="fpop-scrim"></div><div class="fsdrop fpop k-${k}" role="dialog" aria-label="${T[k]}"><div class="fpop-h"><b>${T[k]}</b><button type="button" class="u-btn sm" data-ytpop="${k}">完了</button></div>${panels[k]}</div>`;
}
function renderYt() {
  /* 検索：全角・半角などのゆれをそろえ、空白で区切ると「どれも含む」 */
  const qs = yst.q ? yst.q.split(/[\s　]+/).map(norm).filter(Boolean) : [];
  const qOk = x => !qs.length || (h => qs.every(q => h.includes(q)))(norm(x.t + " " + x.a + " " + x.g + " " + ytCat(x)));
  const priOk = x => !yst.pri.length || yst.pri.includes(ytSt(x) || UNSEEN);
  const pre = ytItems.filter(x => (yst.author === "すべて" || x.a === yst.author) && ytGenreOk(x) && qOk(x));
  /* 未入力あり：オンのときは項目ごとの件数ボタンで、さらに1項目に絞れる（作品と同じ） */
  const mBase = pre.filter(priOk).map(ytMissingOf);
  const mN = mBase.filter(l => l.length).length;
  const missOk = x => {
    if (!yst.missOnly) return true;
    const l = ytMissingOf(x);
    return yst.missKey ? l.some(m => m.k === yst.missKey) : l.length > 0;
  };
  const segBase = pre.filter(missOk);
  let list = segBase.filter(priOk);
  const ab = ytItems.filter(x => yst.author === "すべて" || x.a === yst.author);
  const by = new Map();
  list.forEach(x => {
    const y = String(x.up || "").slice(0, 4) || "?";
    if (!by.has(y)) by.set(y, []);
    by.get(y).push(x);
  });
  const years = [...by.keys()].sort((a, b) => (a === "?" ? 1 : b === "?" ? -1 : b - a));
  const keys = years.map(y => "yt:" + y);
  const pris = [UNSEEN, ...YT_STATUS];
  const act = [];
  yst.pri.forEach(p => act.push(["data-ytpri", p, "視聴：" + stLabel(p)]));
  if (yst.genre !== "すべて") act.push(["data-ytg", "すべて", yst.genre]);
  if (yst.sub !== "すべて") act.push(["data-ytsub", "すべて", yst.sub]);
  /* 一覧の上の視聴ステータス（アニメ・ドラマなどと同じ。1つだけ選ぶ。同じものをもう一度押すと「すべて」） */
  const one = yst.pri.length === 1 ? yst.pri[0] : yst.pri.length ? "*" : "";
  /* 並び順・分け方：作品と同じ順番・見た目（並び順が上、分け方が下） */
  const sBody = sortSteps([
    { h: "グループ", attr: "data-ytgrp", cur: yst.grp, opts: YT_GRPS },
    { h: "並び替え", attr: "data-ytsort", cur: yst.sort, opts: YT_SORTS },
  ]);
  const srt0 = YT_SORTS.find(x => x[0] === yst.sort) || YT_SORTS[0];
  const srt = [srt0[0], (yst.grp === "year" ? "年別・" : "ジャンル別・") + srt0[1]];
  /* アニメ・ドラマと同じ形：絞り込み（シート）・並び順・検索、条件のラベル、件数 */
  const conds = [...(yst.author !== "すべて" ? [yst.author] : []), ...yst.pri.map(stLabel), ...(yst.genre !== "すべて" ? [yst.genre] : []), ...(yst.sub !== "すべて" ? [yst.sub] : []), ...(yst.missOnly ? [yst.missKey ? `要確認：${yst.missKey}` : "要確認あり"] : [])];
  const searching = yst.qOpen || !!yst.q;
  const grpOpts = yst.genre === SOLO ? M("soloGroups") : ytSubs();
  const all = ytItems.filter(x => ytGenreOk(x) && qOk(x));
  const rows = [
    ["au", "投稿者", yst.author, () => fOpt("data-ytau", "すべて", "すべて", yst.author === "すべて", all.length) + ytAuthors().map(a => fOpt("data-ytau", a, (EMO[a] ? EMO[a] + " " : "") + esc(a), yst.author === a, all.filter(x => x.a === a).length)).join("")],
    ["st", "視聴ステータス", one ? stLabel(one) : "すべて", () => fOpt("data-ytstf", "", "すべて", !yst.pri.length, segBase.length) + pris.map(p => fOpt("data-ytstf", p, stLabel(p), one === p, segBase.filter(x => (ytSt(x) || UNSEEN) === p).length)).join("")],
    ["genre", "ジャンル", yst.genre, () => fOpt("data-ytg", "すべて", "すべて", yst.genre === "すべて", ab.length) + [SOLO, COLLAB].map(g => fOpt("data-ytg", g, esc(g), yst.genre === g, ab.filter(x => ytCat(x) === g).length)).join("")],
  ];
  if (yst.genre !== "すべて") rows.push(["sub", "グループ", yst.sub, () => fOpt("data-ytsub", "すべて", "すべて", yst.sub === "すべて", ab.filter(x => ytCat(x) === yst.genre).length) + grpOpts.map(g => fOpt("data-ytsub", g, esc(g), yst.sub === g, ab.filter(x => ytCat(x) === yst.genre && ytGrp(x) === g).length)).join("")]);
  const mCnt = {};
  mBase.forEach(l => l.forEach(m => (mCnt[m.k] = (mCnt[m.k] || 0) + 1)));
  rows.push(["miss", "要確認", missVal(yst.missOnly, yst.missKey), () => missPanel("data-ytfmiss", yst.missOnly, yst.missKey, mCnt, mN, [["項目", YT_MISS_KEYS]]), "grid"]);
  const sheet =
    yst.fp === "all"
      ? fshShell({ id: "yt", a: YA, rows, sub: yst.fSub, nConds: conds.length, n: list.length, unit: "本" })
      : fshClosed();
  return `${searching ? fshSearch({ id: "ytq", ph: "動画タイトル・投稿者で検索", q: yst.q, a: "data-ytqtog" }) : ""}
    <div class="fwrap">${searching ? "" : fshBar({ a: YA, n: conds.length, open: yst.fp === "all", srtOn: yst.sort !== "new" || yst.grp !== "genre", srtOpen: yst.fp === "sort", srtLab: srt[1] })}${ytPopHtml({ sort: sBody })}</div>
    ${fshSum(conds, YA)}
    ${fshCount(list.length, "本", yst.q)}
    <div id="fshBox">${sheet}</div>
    ${
      !list.length
        ? ""
        : yst.grp !== "year"
          ? ytGenreGroups(list)
          : yst.sort === "title" || yst.sort === "added"
            ? `<section class="cgroup"><div class="slots">${list
                .sort(
                  yst.sort === "title"
                    ? (a, b) => String(a.t).localeCompare(String(b.t), "ja")
                    : (a, b) => String(b.added || "").localeCompare(String(a.added || "")),
                )
                .map(ytRow)
                .join("")}</div></section>`
            : bulkBtns(keys) +
              (yst.sort === "old" ? [...years].sort((a, b) => (a === "?" ? 1 : b === "?" ? -1 : a - b)) : years)
                .map(y => {
                  const asc = yst.sort === "old";
                  const l = by
                    .get(y)
                    .sort((a, b) =>
                      asc
                        ? String(a.up || "9").localeCompare(String(b.up || "9"))
                        : String(b.up || "").localeCompare(String(a.up || "")),
                    );
                  const key = "yt:" + y;
                  return `<section class="cgroup">${gHead(key, y === "?" ? "初回投稿日不明" : `${y}年`, l.length + "本")}${collapsed.has(key) ? "" : `<div class="slots">${l.map(ytRow).join("")}</div>`}</section>`;
                })
                .join("")
    }
    ${list.length ? "" : `<p class="empty">条件に合う動画はありません。</p>`}`;
}
const YA = { sheet: 'data-ytsheet="1"', sort: 'data-ytpop="sort"', q: "data-ytqtog", reset: 'data-ytreset="1"', close: 'data-ytshclose="1"', sub: "data-ytfsub" };
const YT_GRPS = [
  ["genre", "ジャンル別"],
  ["year", "年別"],
];
/* 新しい順・古い順は初回投稿日で並べる */
const YT_SORTS = [
  ["new", "新しい順"],
  ["old", "古い順"],
  ["added", "追加した順"],
  ["title", "タイトル順"],
];
