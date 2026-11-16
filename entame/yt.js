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
  { q: "" },
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
const fmtShortDay = t => {
  if (!t) return "";
  const d = new Date(t),
    n = new Date();
  return `${d.getFullYear() !== n.getFullYear() ? d.getFullYear() + "/" : ""}${d.getMonth() + 1}/${d.getDate()}`;
};
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
  const names = ytMissingOf(x).map(m => m.k);
  if (!names.length) return "";
  const head = names.slice(0, 2).join("・") + (names.length > 2 ? ` ほか${names.length - 2}` : "");
  /* PCは項目名まで、スマホは件数だけ */
  return `<span class="miss" title="未入力：${esc(names.join("・"))}"><b>未入力</b><span class="mh">${esc(head)}</span><span class="mc">${names.length}</span></span>`;
}
/* 詳細のアラート（作品の詳細と同じ）：ふだんは1行に畳み、開くと項目ボタン */
let ytMissKeep = false;
function ytMissDetail(x) {
  const l = ytMissingOf(x);
  if (!l.length) return "";
  const btn = m =>
    `<span class="mi"><button type="button" data-jump="${m.j}">✎ ${esc(m.k)}</button>${m.n ? `<button type="button" class="nb" data-ynof="${m.n}" title="${esc(m.k)}を「なし」にする">なし</button>` : ""}</span>`;
  return `<details class="dmiss"${ytMissKeep ? " open" : ""}><summary><span>⚠ 未入力 ${l.length}項目</span><span class="mn">${esc(l.map(m => m.k).join("・"))}</span><span class="ar">${FOLD_IC}</span></summary><div class="mbtns">${l.map(btn).join("")}</div></details>`;
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
        const title = !c ? "ジャンル未設定" : g ? `${c}・${g}` : `${c}（グループなし）`;
        return `<section class="cgroup">${gHead(key, title, l.length + "本")}${collapsed.has(key) ? "" : `<div class="slots">${l.map(ytRow).join("")}</div>`}</section>`;
      })
      .join("")
  );
}
/* YouTubeの絞り込み：アニメ・ドラマと同じ1列のボタン＋下に出る選択肢 */
function ytRowHtml(sortLab) {
  const b = (k, lab, on) =>
    `<button type="button" class="fb${on ? " on" : ""}" data-ytpop="${k}" aria-expanded="${yst.fp === k}"><span class="v">${esc(lab)}</span><span class="chev" aria-hidden="true">▾</span></button>`;
  const gLab = yst.genre === "すべて" ? "ジャンル" : yst.genre + (yst.sub !== "すべて" ? "・" + yst.sub : "");
  const sOn = yst.sort !== "new" || yst.grp !== "genre";
  return `<div class="frow yt">${b("genre", gLab, yst.genre !== "すべて")}<button type="button" class="fb srt${sOn ? " on" : ""}" data-ytpop="sort" aria-expanded="${yst.fp === "sort"}" aria-label="並び順：${esc(sortLab)}">${SORT_IC}</button></div>`;
}
function ytPopHtml(panels) {
  const k = yst.fp;
  if (!panels[k]) return "";
  const T = { genre: "ジャンル", sort: "並び順・分け方" };
  return `<div class="fpop-scrim"></div><div class="fsdrop fpop" role="dialog" aria-label="${T[k]}"><div class="fpop-h"><b>${T[k]}</b><button type="button" class="u-btn sm" data-ytpop="${k}">完了</button></div>${panels[k]}</div>`;
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
  const msw = `<button type="button" class="unsw misw${yst.missOnly ? " on" : ""}" data-ytmissw role="switch" aria-checked="${yst.missOnly}">未入力あり<small>${mN}件</small><span class="tr" aria-hidden="true"><i></i></span></button>`;
  let mkeys = "";
  if (yst.missOnly) {
    const cnt = {};
    mBase.forEach(l => l.forEach(m => (cnt[m.k] = (cnt[m.k] || 0) + 1)));
    const ks = YT_MISS_KEYS.filter(k => cnt[k] || yst.missKey === k);
    if (ks.length)
      mkeys = `<div class="mkeys misw" role="group" aria-label="未入力の項目で絞り込み"><button type="button" data-ytmkey="" aria-pressed="${!yst.missKey}">すべて</button>${ks.map(k => `<button type="button" data-ytmkey="${esc(k)}" aria-pressed="${yst.missKey === k}">${esc(k)}<small>${cnt[k] || 0}</small></button>`).join("")}</div>`;
  }
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
  const grp = (lab, body) => `<div class="fgroup"><h5>${lab}</h5>${body}</div>`;
  /* 一覧の上の視聴ステータス（アニメ・ドラマなどと同じ。1つだけ選ぶ。同じものをもう一度押すと「すべて」） */
  const one = yst.pri.length === 1 ? yst.pri[0] : yst.pri.length ? "*" : "";
  const sb = (v, lab, n) => `<button type="button" role="radio" data-ytstf="${esc(v)}" aria-checked="${one === v}">${lab}<small>${n}</small></button>`;
  const seg = `<div class="stseg" role="radiogroup" aria-label="視聴ステータス">${sb("", "すべて", segBase.length)}${pris.map(p => sb(p, stLabel(p), segBase.filter(x => (ytSt(x) || UNSEEN) === p).length)).join("")}</div>`;
  const genreBody =
    grp(
      "ジャンル",
      `<div class="chips" role="group" aria-label="ジャンル">${chipBtn("data-ytg", "すべて", yst.genre === "すべて", "すべて")}${[SOLO, COLLAB].map(g => chipBtn("data-ytg", g, yst.genre === g, g, ab.filter(x => ytCat(x) === g).length)).join("")}</div>`,
    ) +
    (yst.genre !== "すべて"
      ? grp(
          "グループ",
          `<div class="chips" role="group" aria-label="グループ">${chipBtn("data-ytsub", "すべて", yst.sub === "すべて", "すべて")}${(yst.genre === SOLO ? M("soloGroups") : ytSubs()).map(g => chipBtn("data-ytsub", g, yst.sub === g, g, ab.filter(x => ytCat(x) === yst.genre && ytGrp(x) === g).length)).join("")}</div>`,
        )
      : "");
  /* 並び順・分け方：作品と同じ順番・見た目（並び順が上、分け方が下） */
  const sBody = `<div class="fgroup"><h5>並び順</h5><div class="chips sortlist" role="radiogroup" aria-label="並び順">${YT_SORTS.map(([v, l]) => `<button type="button" role="radio" data-ytsort="${v}" aria-checked="${yst.sort === v}" aria-pressed="${yst.sort === v}">${yst.sort === v ? "✓ " : ""}${l}</button>`).join("")}</div></div>
    <div class="fgroup"><h5>分け方</h5><div class="chips sortlist" role="radiogroup" aria-label="見出しの分け方">${YT_GRPS.map(([v, l]) => `<button type="button" role="radio" data-ytgrp="${v}" aria-checked="${yst.grp === v}" aria-pressed="${yst.grp === v}">${yst.grp === v ? "✓ " : ""}${l}</button>`).join("")}</div></div>`;
  const srt0 = YT_SORTS.find(x => x[0] === yst.sort) || YT_SORTS[0];
  const srt = [srt0[0], (yst.grp === "year" ? "年別・" : "ジャンル別・") + srt0[1]];
  return `<div class="ftools"><input id="ytq" type="search" placeholder="動画タイトル・投稿者で検索" value="${esc(yst.q)}" aria-label="検索"></div>
    ${seg}
    <div class="fwrap">${ytRowHtml(srt[1])}${ytPopHtml({ genre: genreBody, sort: sBody })}</div>
    <p class="count">${list.length}本${act.length ? `<button type="button" class="clear" data-ytreset="1">条件をすべて解除</button>` : ""}${msw}</p>${mkeys}
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
const chipBtn = (attr, val, on, label, n, cls) =>
  `<button type="button" ${attr}="${esc(val)}" aria-pressed="${on}" class="${on && cls ? "pri " + cls : ""}${attr === "data-vod" && VOD_COLOR[val] ? " vc" : ""}"${attr === "data-vod" ? vcStyle(val) : ""}>${esc(label)}${n != null ? `<small>${n}</small>` : ""}</button>`;

/* ---------- 詳細：作品の詳細と同じ形
   上：投稿者・ジャンル・視聴ステータスのラベル／前・次・編集・閉じる、タイトルとコピー
   YOUTUBEカード：「項目名　内容」を1行ずつ（再生リスト・まとめ動画も行の中）。中身を押しても編集しない。
   編集はカードの見出しの右の「✎ 編集」から、そのカードの場所でまとめて編集（作品の ON AIR と同じ） ---------- */
let ytOpen = null;
let ytStMenu = false; // 視聴ステータスの選択肢を開いているか
const YT_ST = [
  ["", UNSEEN],
  ["視聴中", "視聴中"],
  ["視聴済み", "視聴済み"],
  ["見ない", "見ない"],
];
function ytDetailHtml(x) {
  const pw = +x.pw || 0,
    n = +x.n || 0;
  const un = t => `<span class="unset">${t}</span>`;
  const nn = t => `<span class="nosong">${t}</span>`;
  const nf = k => (x.noF || []).includes(k);
  const row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  const st = x.s || "";
  const stCls = "s-" + (st || UNSEEN);
  const stBtn = `<span class="stw"><button type="button" class="pill dst ${stCls}" id="ytStOpen" aria-haspopup="true" aria-expanded="${ytStMenu}">${esc(stLabel(st || UNSEEN))}<span class="stv" aria-hidden="true">▾</span></button>${ytStMenu ? `<span class="stmenu" role="menu">${YT_ST.map(([v, l]) => `<button type="button" role="menuitemradio" data-yts="${v}" aria-checked="${st === v}" class="s-${l}">${stLabel(l)}</button>`).join("")}</span>` : ""}</span>`;
  const IC_EXT = `<svg class="iic" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M13.5 2.5 7.5 8.5M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const IC_PLAY = `<svg class="iic ply" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M6.5 5.2v5.6L11 8z" fill="#fff"/></svg>`;
  const rows = [
    row("初回投稿日", x.up ? `<span class="inum">${esc(fmtD(x.up))}</span>` : un("未設定")),
    row("再生時間", x.dur ? `<span class="inum">${esc(x.dur)}</span>` : nf("dur") ? nn("なし") : un("未設定")),
    row("パート数", n ? `<span class="inum">全${n}本</span>` : un("未設定")),
    row("再生リスト", x.pl ? `<a class="ilnk" href="${esc(x.pl)}" target="_blank" rel="noopener" aria-label="${esc(x.t)}をYouTubeで見る">${IC_PLAY}YouTubeで見る</a>` : nf("pl") ? nn("なし") : un("未設定")),
    row("まとめ動画", x.sm ? `<a class="ilnk" href="${esc(x.sm)}" target="_blank" rel="noopener">まとめ動画を開く${IC_EXT}</a>` : nf("sm") ? nn("なし") : un("未設定")),
  ];
  const info = `<div class="icard ibc"><div class="ich"><span class="ilamp ytl">YOUTUBE</span><button type="button" class="editbtn iedit" data-jump="ycard" aria-label="基本情報を編集">✎ 編集</button></div><dl class="idl">${rows.join("")}</dl></div>`;
  const prog = `<div class="icard iprog"><div class="ich"><span class="ilamp progl">PROGRESS</span><span class="inow">${n ? `${pw} / ${n}本 見た` : "パート数を入れると進み具合を記録できます"}</span></div>${
    n
      ? `<div class="prog"><i style="width:${Math.min(100, (pw / n) * 100)}%"></i></div>
      <div class="ystep"><button type="button" data-ytp="-1" aria-label="1本戻す" ${pw <= 0 ? "disabled" : ""}>−</button><span><b>${pw}</b>本目まで見た</span><button type="button" data-ytp="1" aria-label="1本進める" ${pw >= n ? "disabled" : ""}>＋</button><button type="button" class="u-btn sm ghost" data-ytp="all" ${pw >= n ? "disabled" : ""}>最後まで見た</button>${pw ? `<button type="button" class="u-btn sm ghost" data-ytp="reset">リセット</button>` : ""}</div>`
      : ""
  }</div>`;
  const nv = ytNeighbors(x.id),
    busy = !!(yform && yform.inline);
  const navB = (d, lab) => `<button type="button" class="dnav" data-dnav="${d}" aria-label="${lab}" title="${lab}${TOUCH ? "" : `（${d < 0 ? "←" : "→"}キー）`}" ${nv[d < 0 ? 0 : 1] && !busy ? "" : "disabled"}>${CHEV(d)}</button>`;
  /* 上段のラベル：投稿者（作品のジャンルの位置）→ ジャンル（作品の種別の位置。押すとジャンルを編集）→ 視聴ステータス */
  const c = ytCat(x),
    sb = ytGrp(x);
  const gBtn = c ? `<button type="button" class="dmt lab s" data-jump="yfGenre" title="ジャンルを変える">${c}${sb ? `・${esc(sb)}` : ""}</button>` : "";
  return `<div class="dhead ydhead"><div class="hdrow"><div class="meta"><span class="kind yauth">${esc(x.a || "YouTube")}</span>${gBtn}${stBtn}</div><div class="hdrow">${navB(-1, "前の作品")}${navB(1, "次の作品")}<button type="button" class="editbtn" id="ytEdit" aria-label="再生リストを編集">✎ 編集</button><button class="close" type="button" data-close aria-label="閉じる">✕</button></div></div>
    <h3>${esc(x.t)}<button type="button" class="tcopy" id="ytCopy" aria-label="タイトルをコピー" title="タイトルをコピー"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button></h3>${ytMissDetail(x)}</div>
    <div class="ydbody">${info}${prog}
    <div class="links"><button type="button" class="delsm" id="ytDel">削除</button></div></div>`;
}
/* 前・次の作品：詳細を開いた画面に出ていた並び（作品の詳細と同じ） */
let ytNavIds = [];
function ytScreenIds() {
  const seen = new Set();
  return [...document.querySelectorAll("#main [data-yt]")].map(el => el.dataset.yt).filter(id => !seen.has(id) && seen.add(id) && ytItems.some(x => x.id === id));
}
function ytNeighbors(id) {
  const i = ytNavIds.indexOf(id);
  return i < 0 ? [null, null] : [ytNavIds[i - 1] || null, ytNavIds[i + 1] || null];
}
function ytDetailNav(d) {
  if (!ytOpen || (yform && yform.inline)) return;
  const id = ytNeighbors(ytOpen)[d < 0 ? 0 : 1];
  if (id) ytOpenDetail(id, d);
}
function ytOpenDetail(id, dir) {
  const x = ytItems.find(y => y.id === id);
  if (!x) return;
  if (!dir) ytNavIds = ytScreenIds();
  ytOpen = id;
  ytStMenu = false;
  ytMissKeep = false;
  openId = null;
  form = null;
  yform = null;
  /* 前・次へ移るときはシートを作り直さず中身だけ入れかえ */
  const inn = dir && $("#layer .sheet #ytIn");
  if (inn) {
    const sh = inn.closest(".sheet");
    sh.setAttribute("aria-label", x.t);
    inn.innerHTML = ytDetailHtml(x);
    sh.scrollTop = 0;
    return;
  }
  $("#layer").innerHTML =
    `<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(x.t)}"><div class="wrap" id="ytIn">${ytDetailHtml(x)}</div></div>`;
}
function ytRefresh() {
  const x = ytItems.find(y => y.id === ytOpen);
  const el = $("#ytIn");
  if (!x || !el) return;
  /* 描き直すと詳細の中の編集画面も消えるので、編集中の状態も終わりにする */
  if (yform && yform.inline) yform = null;
  const d = el.querySelector(".dmiss");
  if (d) ytMissKeep = d.open;
  el.innerHTML = ytDetailHtml(x);
}
async function ytSave(id, patch, msg) {
  const o = { ...(ytOver[id] || {}), ...patch, _at: Date.now() };
  ytOver[id] = o;
  ytRebuild();
  render();
  ytRefresh();
  if (msg) toast(msg);
  try {
    await saveDoc("yt", id, o);
  } catch (e) {
    fail(e);
  }
}

/* ---------- 追加・編集 ----------
   項目ごとの部品（P）を組み合わせて、全体の編集画面と「その項目だけ」の編集画面を作る（作品の編集画面と同じ作り） */
let yform = null;
/* その項目だけ編集するときの見出しと部品。詳細の中で開く（ycard＝YOUTUBEカードの「✎ 編集」、ほかは未入力アラートの項目ボタン） */
const ONLY_Y = {
  ycard: ["基本情報", ["author", "genre", "up", "n", "dur", "pl", "sm"]],
  yfAuthor: ["投稿者", ["author"]],
  yfGenre: ["ジャンル", ["genre"]],
  "y-up": ["初回投稿日", ["up"]],
  "y-n": ["パート数", ["n"]],
  "y-dur": ["再生時間", ["dur"]],
  "y-pl": ["再生リスト", ["pl"]],
  "y-sm": ["まとめ動画", ["sm"]],
};
function ytFormHtml() {
  const f = yform;
  const authors = [...new Set([...ytAuthors(), f.a].filter(Boolean))];
  const subChips = (lab, list, attr, cur) =>
    `<div class="chips" style="margin-top:8px" role="group" aria-label="${lab}">${list.map(g => `<button type="button" ${attr}="${esc(g)}" aria-pressed="${cur === g}">${esc(g)}</button>`).join("")}</div>`;
  const P = {
    title: `<label class="field full"><span>動画タイトル</span><input id="y-t" autocomplete="off" placeholder="例：ゼルダの伝説 ティアーズ オブ ザ キングダム" value="${esc(f.t)}"></label>`,
    author: `<div class="field full" id="yfAuthor"><span>投稿者</span><div class="chips">${authors.map(a => `<button type="button" data-yfa="${esc(a)}" aria-pressed="${f.a === a}">${esc(a)}</button>`).join("")}<input id="y-anew" class="chipin" autocomplete="off" placeholder="＋ ほかの投稿者" value="${esc(authors.includes(f.a) ? "" : f.a)}"></div></div>`,
    genre: `<div class="field full" id="yfGenre"><span>ジャンル</span><div class="segc" role="group" aria-label="ジャンル">${[SOLO, COLLAB].map(g => `<button type="button" data-yfg="${g}" aria-pressed="${ytCat(f) === g}">${g}</button>`).join("")}</div>${
      ytCat(f) === COLLAB ? subChips("コラボのグループ", ytSubs(), "data-yfsub", ytSub(f)) : ytCat(f) === SOLO ? subChips("一人実況のグループ", M("soloGroups"), "data-yfsg", ytSolo(f)) : ""
    }</div>`,
    /* 視聴ステータス：作品と同じく「未視聴」も入れた4つから選ぶ */
    status: `<div class="field full"><span>ステータス</span><div class="segc" role="group" aria-label="ステータス">${YT_ST.map(([v, l]) => `<button type="button" data-yfs="${v}" aria-pressed="${(f.s || "") === v}">${stLabel(l)}</button>`).join("")}</div></div>`,
    up: `<label class="field"><span>初回投稿日 <span class="hint">YouTubeの日付を貼り付けできます</span></span><input id="y-up" class="dto" type="text" inputmode="numeric" autocomplete="off" placeholder="2024/03/08" value="${esc(fmtD(f.up))}"><span class="hint err" id="yUpMsg"></span></label>`,
    n: `<label class="field"><span>パート数</span><input id="y-n" type="number" min="0" inputmode="numeric" placeholder="12" value="${f.n || ""}"></label>`,
    dur: `<label class="field"><span>再生時間 <span class="hint">「630」で6時間30分</span></span><input id="y-dur" inputmode="numeric" autocomplete="off" placeholder="630" value="${esc(f.dur)}"><span class="hint" id="yDurMsg"></span></label>`,
    pl: `<label class="field full"><span>再生リスト</span><input id="y-pl" type="url" inputmode="url" autocomplete="off" placeholder="https://www.youtube.com/playlist?list=…" value="${esc(f.pl)}"></label>`,
    sm: `<label class="field full"><span>まとめ動画</span><input id="y-sm" type="url" inputmode="url" autocomplete="off" placeholder="https://youtu.be/…" value="${esc(f.sm)}"></label>`,
  };
  if (f.only && ONLY_Y[f.only]) {
    const [lab, keys] = ONLY_Y[f.only];
    return `<div class="hdrow"><h3 class="onlyh"><small>${esc(f.t)}</small>${lab}を編集</h3><button class="close" type="button" data-back="1" aria-label="戻る">✕</button></div>
      <form id="ytF" novalidate><div class="fgrid only">${keys.map(k => P[k]).join("")}</div>
      <div class="ffoot"><button type="button" class="u-btn ghost" data-back="1">キャンセル</button><button class="u-btn pri primary" type="submit">保存する</button></div></form>`;
  }
  const sec = (t, b) => `<section class="fsec"><h4>${t}</h4><div class="fgrid">${b}</div></section>`;
  return `<div class="hdrow"><h3>再生リストを${f.id ? "編集" : "追加"}</h3><button class="close" type="button" data-close aria-label="閉じる">✕</button></div>
    <form id="ytF" novalidate>
    ${sec("基本情報", P.title + P.author + P.genre + P.status)}
    ${sec("動画の情報", P.up + P.n + P.dur)}
    ${sec("リンク", P.pl + P.sm)}
    <div class="ffoot"><button type="button" class="u-btn ghost" data-close>キャンセル</button><button class="u-btn pri primary" type="submit">${f.id ? "保存する" : "追加する"}</button></div>
    </form>`;
}
function ytReadForm() {
  if (!$("#ytF")) return;
  const g = id => $(id)?.value ?? "";
  const o = id => ($(id) ? $(id).value : undefined);
  ["t", "up", "dur", "pl"].forEach(k => {
    let v = o("#y-" + k);
    if (v === undefined) return;
    if (k === "up") {
      const p = parseDay(v);
      v = p === null ? yform.up : p;
    }
    if (k === "dur") v = parseDur(v);
    yform[k] = v;
  });
  if (o("#y-n") !== undefined) yform.n = o("#y-n");
  if (o("#y-sm") !== undefined) yform.sm = o("#y-sm");
  const na = g("#y-anew").trim();
  if (na) yform.a = na;
}
/* 開いたときから変わったかを比べるための中身（見た目の状態は除く） */
const ytFormSig = f => {
  const { init, inline, only, ...c } = f;
  return JSON.stringify({ ...c, n: String(c.n || "") });
};
function ytRedrawForm() {
  const box = $("#ytFormIn");
  if (!box) return;
  const sh = box.closest(".sheet");
  const y = sh ? sh.scrollTop : 0;
  box.innerHTML = ytFormHtml();
  if (sh) sh.scrollTop = y;
}
function ytOpenForm(x, target) {
  yform = x
    ? {
        id: x.id,
        t: x.t,
        a: x.a || "",
        g: x.g || "",
        ...(x.sg !== undefined ? { sg: x.sg } : {}),
        s: x.s || "",
        up: x.up || "",
        n: x.n || "",
        dur: x.dur || "",
        pl: x.pl || "",
        sm: x.sm || "",
      }
    : {
        id: null,
        t: "",
        a: yst.author !== "すべて" ? yst.author : "",
        g: "",
        s: "",
        up: "",
        n: "",
        dur: "",
        pl: "",
        sm: "",
      };
  /* 詳細から項目を指定したときは、詳細の中でその項目だけ編集する（作品の詳細と同じ） */
  if (x && ONLY_Y[target] && ytOpen === x.id && $("#layer .sheet:not(.form) #ytIn")) return ytOpenInline(target);
  ytOpen = null;
  openId = null;
  form = null;
  $("#layer").innerHTML =
    `<div class="scrim" data-close></div><div class="sheet form" role="dialog" aria-modal="true" aria-label="YouTubeを${yform.id ? "編集" : "追加"}"><div class="wrap" id="ytFormIn">${ytFormHtml()}</div></div>`;
  if (target && document.getElementById(target)) {
    const el = document.getElementById(target);
    el.scrollIntoView({ block: "center" });
    if (!TOUCH) el.focus({ preventScroll: true });
  } else if (!TOUCH) $("#y-t").focus({ preventScroll: true });
}
/* 詳細の中で編集：カードの「✎ 編集」はそのカードの場所がそのまま編集画面に、未入力アラートの項目は見出しのすぐ下に出す */
function ytOpenInline(target) {
  const inn = $("#ytIn");
  yform.only = target;
  yform.inline = true;
  inn.querySelectorAll(".ined").forEach(x => x.remove());
  inn.querySelectorAll(".icard[hidden]").forEach(x => (x.hidden = false));
  const card = target === "ycard" && inn.querySelector(".icard.ibc");
  const anc = card || inn.querySelector(".ydhead");
  if (!anc) {
    yform = null;
    return;
  }
  anc.insertAdjacentHTML(card ? "beforebegin" : "afterend", `<div class="ined${card ? " incard" : ""}" id="ytFormIn">${ytFormHtml()}</div>`);
  if (card) card.hidden = true;
  yform.init = ytFormSig(yform);
  /* 編集中は前・次の矢印を押せないように */
  inn.querySelectorAll(".dnav").forEach(b => (b.disabled = true));
  const box = $("#ytFormIn");
  const sh = box.closest(".sheet");
  if (!card && sh) sh.scrollTop = 0;
  else if (sh) {
    const hd = sh.querySelector(".dhead");
    const top = sh.getBoundingClientRect().top + (hd ? hd.getBoundingClientRect().height : 0) + 8;
    sh.scrollTop += box.getBoundingClientRect().top - top;
  }
  const i = box.querySelector(".fgrid.only input:not([type=checkbox])");
  if (i && !TOUCH) i.focus({ preventScroll: true });
}
/* 詳細の中の編集をやめる（取り消し） */
function ytCloseInline() {
  yform = null;
  ytRefresh();
}
async function ytSubmit() {
  {
    const ui = $("#y-up");
    if (ui && ui.value.trim() && parseDay(ui.value) === null) {
      ui.focus();
      toast("初回投稿日を読み取れませんでした（例：2024/03/08）");
      return;
    }
  }
  ytReadForm();
  const f = yform;
  const t = f.t.trim();
  if (!t) {
    $("#y-t")?.focus();
    toast("動画タイトルを入れてください");
    return;
  }
  const patch = {
    t,
    a: f.a.trim(),
    g: f.g,
    ...(f.sg !== undefined ? { sg: f.sg } : {}),
    s: f.s,
    up: f.up,
    n: Math.max(0, +f.n || 0),
    dur: f.dur.trim(),
    pl: f.pl.trim(),
    sm: String(f.sm || "").trim(),
  };
  const id = f.id || "y" + Date.now().toString(36);
  /* 詳細の中の編集：変わっていなければ閉じるだけ、変わっていれば保存して詳細を描き直す */
  if (f.inline) {
    if (ytFormSig(f) === f.init) return ytCloseInline();
    yform = null;
    await ytSave(id, patch, "保存しました");
    return;
  }
  if (!f.id) patch.added = Date.now();
  yform = null;
  close();
  await ytSave(id, patch, f.id ? "保存しました" : "追加しました");
  if (f.id) ytOpenDetail(id);
}

/* YouTube の操作（YouTubeの画面を開いているときだけ） */
const ytUI = fn => el => {
  fn(el);
  saveYtUI();
  render();
};
/* 詳細の中で編集しているとき：✕・キャンセルで取り消し、外を押したら保存して閉じる（別の項目を押したらそのまま次を編集）。作品の詳細と同じ */
function ytCommitInline() {
  if (!yform || !yform.inline) return;
  ytReadForm();
  if (ytFormSig(yform) === yform.init) ytCloseInline();
  else ytSubmit();
}
function ytInlineClick(e) {
  if (!yform || !yform.inline) return false;
  if (e.target.closest(".ined [data-back]")) {
    ytCloseInline();
    return true;
  }
  /* 描き直しで消えた場所へのクリックは「外を押した」ではない */
  if (!e.target.isConnected) return true;
  if (e.target.closest(".ined")) return false;
  const jp = e.target.closest("#ytIn [data-jump]");
  const tgt = jp && jp.dataset.jump;
  ytCommitInline();
  if (yform && yform.inline) return true; // 入力の誤りで保存できなかったときは編集を続ける
  if (!tgt || e.target.closest("a,button:not([data-jump])")) return false; // ほかのボタン（閉じる・ステータスなど）はそのまま動かす
  const it = ytItems.find(y => y.id === ytOpen);
  if (it) ytOpenForm(it, tgt);
  return true;
}
const YT_ACTIONS = [
  [null, (el, x, e) => ytInlineClick(e)],
  /* 絞り込み・並び順 */
  ["[data-ytpop]", ytUI(el => (yst.fp = yst.fp === el.dataset.ytpop ? "" : el.dataset.ytpop))],
  [
    "[data-ytgrp]",
    ytUI(el => {
      yst.grp = el.dataset.ytgrp;
      yst.fp = "";
    }),
  ],
  [
    "[data-ytsort]",
    ytUI(el => {
      yst.sort = el.dataset.ytsort;
      yst.fp = "";
    }),
  ],
  ["[data-ytreset]", ytUI(() => Object.assign(yst, { pri: [], genre: "すべて", sub: "すべて" }))],
  [
    "[data-ytg]",
    ytUI(el => {
      yst.genre = el.dataset.ytg;
      yst.sub = "すべて";
    }),
  ],
  ["[data-ytsub]", ytUI(el => (yst.sub = el.dataset.ytsub))],
  ["[data-ytstf]", ytUI(el => (yst.pri = !el.dataset.ytstf || (yst.pri.length === 1 && yst.pri[0] === el.dataset.ytstf) ? [] : [el.dataset.ytstf]))],
  [
    "[data-ytmissw]",
    ytUI(() => {
      yst.missOnly = !yst.missOnly;
      yst.missKey = "";
    }),
  ],
  ["[data-ytmkey]", ytUI(el => (yst.missKey = yst.missKey === el.dataset.ytmkey ? "" : el.dataset.ytmkey))],
  ["[data-yt]", el => ytOpenDetail(el.dataset.yt)],
  [null, (el, x, e) => !!yform && runActions(YT_FORM_ACTIONS, e)],
  [
    null,
    (el, x, e) => {
      const it = ytOpen && ytItems.find(y => y.id === ytOpen);
      return !!it && runActions(YT_DETAIL_ACTIONS, e, it);
    },
  ],
];
/* 追加・編集画面：入力中の内容を読み取ってから変えて、描き直す */
const ytFormEdit = fn => el => {
  ytReadForm();
  fn(el);
  ytRedrawForm();
};
const YT_FORM_ACTIONS = [
  [
    "[data-yfa]",
    ytFormEdit(el => {
      yform.a = el.dataset.yfa;
      const i = $("#y-anew");
      if (i) i.value = "";
    }),
  ],
  [
    "[data-yfg]",
    ytFormEdit(el => {
      const v = el.dataset.yfg;
      yform.g = ytCat(yform) === v ? "" : v === SOLO ? SOLO : ytSub(yform) || COLLAB;
    }),
  ],
  ["[data-yfsg]", ytFormEdit(el => (yform.sg = ytSolo(yform) === el.dataset.yfsg ? "" : el.dataset.yfsg))],
  ["[data-yfsub]", ytFormEdit(el => (yform.g = ytSub(yform) === el.dataset.yfsub ? COLLAB : el.dataset.yfsub))],
  ["[data-yfs]", ytFormEdit(el => (yform.s = yform.s === el.dataset.yfs ? "" : el.dataset.yfs))],
];
/* 詳細画面（x＝開いている再生リスト） */
const YT_DETAIL_ACTIONS = [
  ["#ytEdit", (el, x) => ytOpenForm(x)],
  ["[data-dnav]", el => ytDetailNav(+el.dataset.dnav)],
  /* 未入力アラートの「なし」 */
  [
    "[data-ynof]",
    (el, x) => {
      const k = el.dataset.ynof;
      ytMissKeep = true;
      ytSave(x.id, { noF: [...new Set([...(x.noF || []), k])] }, `${YT_NOF_LAB[k]}を「なし」にしました`);
    },
  ],
  /* 視聴ステータスのラベル：押すと選択肢を開く／閉じる。ほかの場所を押したら閉じる */
  [
    "#ytStOpen",
    () => {
      ytStMenu = !ytStMenu;
      ytRefresh();
    },
  ],
  [
    null,
    el => {
      if (ytStMenu && !el.closest(".stw")) {
        ytStMenu = false;
        ytRefresh();
      }
      return false;
    },
  ],
  [
    "#ytCopy",
    (el, x) => U.copy(x.t).then(ok => toast(ok ? "タイトルをコピーしました" : "コピーできませんでした")),
  ],
  ["[data-jump]", (el, x) => ytOpenForm(x, el.dataset.jump)],
  [
    "[data-yts]",
    (el, x) => {
      const v = el.dataset.yts;
      ytStMenu = false;
      if ((x.s || "") !== v) ytSave(x.id, { s: v }, v ? `「${v}」にしました` : "未視聴にしました");
      else ytRefresh();
    },
  ],
  /* 見たところ：−・＋・最後まで・リセット。最後まで見たら視聴済み、途中なら視聴中に */
  [
    "[data-ytp]",
    (el, x) => {
      const n = +x.n || 0;
      const v = el.dataset.ytp;
      const pw = v === "all" ? n : v === "reset" ? 0 : Math.max(0, Math.min(n, (+x.pw || 0) + +v));
      const patch = { pw };
      let msg = `${pw}本目まで見ました`;
      if (n && pw >= n && x.s !== "視聴済み") {
        patch.s = "視聴済み";
        msg = "最後まで見たので「視聴済み」にしました";
      } else if (pw > 0 && pw < n && !x.s) {
        patch.s = "視聴中";
        msg = `${pw}本目まで見ました（視聴中にしました）`;
      }
      ytSave(x.id, patch, msg);
    },
  ],
  /* 削除：もう一度押すと削除（元に戻せる） */
  [
    "#ytDel",
    (el, x) => {
      if (!el.dataset.c) {
        el.dataset.c = "1";
        el.textContent = "もう一度押すと削除";
        el.classList.add("armed");
        return;
      }
      const id = x.id,
        at = Date.now();
      ytOver[id] = { ...(ytOver[id] || {}), deleted: at };
      ytRebuild();
      close();
      render();
      mergeDoc("yt", id, { deleted: at }).catch(fail);
      toastUndo(`「${x.t.slice(0, 18)}」をゴミ箱に移しました`, () => trashRestore("yt", id, true));
    },
  ],
];
