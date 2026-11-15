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
    <span class="time">${x.up ? `${+x.up.slice(5, 7)}/${+x.up.slice(8, 10)}<small>${x.up.slice(0, 4)}</small>` : ""}${yst.author === "すべて" && x.a ? `<span class="kind yauth">${esc(x.a)}</span>` : ""}</span>
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
  return `<div class="frow yt">${b("genre", gLab, yst.genre !== "すべて")}<button type="button" class="fb srt${sOn ? " on" : ""}" data-ytpop="sort" aria-expanded="${yst.fp === "sort"}" aria-label="分け方・並び順：${esc(sortLab)}">${SORT_IC}</button></div>`;
}
function ytPopHtml(panels) {
  const k = yst.fp;
  if (!panels[k]) return "";
  const T = { genre: "ジャンル", sort: "分け方・並び順" };
  return `<div class="fpop-scrim"></div><div class="fsdrop fpop" role="dialog" aria-label="${T[k]}"><div class="fpop-h"><b>${T[k]}</b><button type="button" class="u-btn sm" data-ytpop="${k}">完了</button></div>${panels[k]}</div>`;
}
function renderYt() {
  /* 検索：全角・半角などのゆれをそろえ、空白で区切ると「どれも含む」 */
  const qs = yst.q ? yst.q.split(/[\s　]+/).map(norm).filter(Boolean) : [];
  const qOk = x => !qs.length || (h => qs.every(q => h.includes(q)))(norm(x.t + " " + x.a + " " + x.g + " " + ytCat(x)));
  const priOk = x => !yst.pri.length || yst.pri.includes(ytSt(x) || UNSEEN);
  const pre = ytItems.filter(x => (yst.author === "すべて" || x.a === yst.author) && ytGenreOk(x) && qOk(x));
  /* 未入力あり */
  const mN = pre.filter(x => priOk(x) && ytMissingOf(x).length).length;
  const segBase = pre.filter(x => !yst.missOnly || ytMissingOf(x).length > 0);
  let list = segBase.filter(priOk);
  const msw = `<button type="button" class="unsw misw${yst.missOnly ? " on" : ""}" data-ytmissw role="switch" aria-checked="${yst.missOnly}">未入力あり<small>${mN}件</small><span class="tr" aria-hidden="true"><i></i></span></button>`;
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
  const sBody = `<div class="sorth">分け方</div><div class="chips sortlist" role="radiogroup" aria-label="分け方">${YT_GRPS.map(([v, l]) => `<button type="button" role="radio" data-ytgrp="${v}" aria-checked="${yst.grp === v}" aria-pressed="${yst.grp === v}">${yst.grp === v ? "✓ " : ""}${l}</button>`).join("")}</div><div class="sorth">並び順</div><div class="chips sortlist" role="radiogroup" aria-label="並び順">${YT_SORTS.map(([v, l]) => `<button type="button" role="radio" data-ytsort="${v}" aria-checked="${yst.sort === v}" aria-pressed="${yst.sort === v}">${yst.sort === v ? "✓ " : ""}${l}</button>`).join("")}</div>`;
  const srt0 = YT_SORTS.find(x => x[0] === yst.sort) || YT_SORTS[0];
  const srt = [srt0[0], (yst.grp === "year" ? "年ごと・" : "ジャンルごと・") + srt0[1]];
  return `<div class="ftools"><input id="ytq" type="search" placeholder="動画タイトル・投稿者で検索" value="${esc(yst.q)}" aria-label="検索"></div>
    ${seg}
    <div class="fwrap">${ytRowHtml(srt[1])}${ytPopHtml({ genre: genreBody, sort: sBody })}</div>
    <p class="count">${list.length}本${act.length ? `<button type="button" class="clear" data-ytreset="1">条件をすべて解除</button>` : ""}${msw}</p>
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
  ["genre", "ジャンルごと"],
  ["year", "年ごと"],
];
const YT_SORTS = [
  ["new", "初回投稿日が新しい順"],
  ["old", "初回投稿日が古い順"],
  ["added", "追加した順"],
  ["title", "タイトル順"],
];
const chipBtn = (attr, val, on, label, n, cls) =>
  `<button type="button" ${attr}="${esc(val)}" aria-pressed="${on}" class="${on && cls ? "pri " + cls : ""}${attr === "data-vod" && VOD_COLOR[val] ? " vc" : ""}"${attr === "data-vod" ? vcStyle(val) : ""}>${esc(label)}${n != null ? `<small>${n}</small>` : ""}</button>`;

function startInline(el) {
  if (el.querySelector("input.inl")) return;
  const key = el.dataset.inl,
    type = el.dataset.inltype || "text",
    val = el.dataset.inlv || "";
  el.classList.add("editing");
  el.innerHTML = `<input class="inl${key === "up" ? " dto" : ""}" data-inlkey="${key}" type="${type}"${key === "up" ? ' inputmode="numeric"' : ""} value="${esc(val)}" ${type === "text" ? 'autocomplete="off"' : ""} aria-label="編集"><span class="inlhint">${type === "date" ? "日付を選ぶと保存" : "Enterで保存・Escで取消"}</span>`;
  const i = el.querySelector("input");
  i.dataset.orig = val;
  if (!TOUCH) i.focus();
  if (type === "text") {
    try {
      i.setSelectionRange(i.value.length, i.value.length);
    } catch (_) {}
  }
}
let inlBusy = false;
function commitInline(i, cancel) {
  if (inlBusy || !i.isConnected) return;
  inlBusy = true;
  const key = i.dataset.inlkey;
  let v = i.value.trim();
  const orig = i.dataset.orig || "";
  const done = () => {
    inlBusy = false;
  };
  if (cancel || v === orig || (key === "t" && !v)) {
    ytRefresh();
    done();
    return;
  }
  if (key === "n") v = Math.max(0, parseInt(v, 10) || 0);
  if (key === "up") {
    const p = parseDay(v);
    if (p === null) {
      toast("日付を読み取れませんでした（例：2024/03/08）");
      ytRefresh();
      done();
      return;
    }
    v = p;
  }
  if (key === "dur") v = parseDur(v);
  if (ytOpen) ytSave(ytOpen, { [key]: v }, "保存しました");
  done();
}
/* ---------- 詳細：作品の詳細と同じ形（上にジャンル・ステータスのラベルと編集・閉じる、タイトルとコピー、
   情報はカード（YOUTUBE）に「項目名　内容」で1行ずつ、進み具合もカード、リンクは下にボタンを並べる） ---------- */
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
  const nf = k => (x.noF || []).includes(k);
  const J = (k, v, t) => `<dt data-jump="${t}">${k}</dt><dd data-jump="${t}">${v || un("未設定")}</dd>`;
  const I = (k, v, key, ty, raw) => `<dt>${k}</dt><dd data-inl="${key}" data-inltype="${ty}" data-inlv="${esc(raw ?? "")}">${v || un("未設定")}<span class="pen" aria-hidden="true">✎</span></dd>`;
  const st = x.s || "";
  const stCls = "s-" + (st || UNSEEN);
  const stBtn = `<span class="stw"><button type="button" class="pill dst ${stCls}" id="ytStOpen" aria-haspopup="true" aria-expanded="${ytStMenu}">${esc(stLabel(st || UNSEEN))}<span class="stv" aria-hidden="true">▾</span></button>${ytStMenu ? `<span class="stmenu" role="menu">${YT_ST.map(([v, l]) => `<button type="button" role="menuitemradio" data-yts="${v}" aria-checked="${st === v}" class="s-${l}">${stLabel(l)}</button>`).join("")}</span>` : ""}</span>`;
  const rows = [
    J("投稿者", esc(x.a), "yfAuthor"),
    J("ジャンル", ytGenreLab(x), "yfGenre"),
    I("初回投稿日", x.up ? `<span class="inum">${esc(fmtD(x.up))}</span>` : "", "up", "text", fmtD(x.up)),
    I("再生時間", x.dur ? `<span class="inum">${esc(x.dur)}</span>` : nf("dur") ? un("なし") : "", "dur", "text", x.dur),
    I("パート数", n || x._at ? `${n ? `<span class="inum">全${n}本</span>` : ""}${x._at ? `<span class="lastmod">最終変更 ${fmtShortDay(x._at)}</span>` : ""}` : "", "n", "number", n || ""),
  ];
  const info = `<div class="icard ibc"><div class="ich"><span class="ilamp ytl">YOUTUBE</span></div><dl class="idl">${rows.join("")}</dl></div>`;
  const prog = `<div class="icard iprog"><div class="ich"><span class="ilamp progl">PROGRESS</span><span class="inow">${n ? `${pw} / ${n}本 見た` : "パート数を入れると進み具合を記録できます"}</span></div>${
    n
      ? `<div class="prog"><i style="width:${Math.min(100, (pw / n) * 100)}%"></i></div>
      <div class="ystep"><button type="button" data-ytp="-1" aria-label="1本戻す" ${pw <= 0 ? "disabled" : ""}>−</button><span><b>${pw}</b>本目まで見た</span><button type="button" data-ytp="1" aria-label="1本進める" ${pw >= n ? "disabled" : ""}>＋</button><button type="button" class="u-btn sm ghost" data-ytp="all" ${pw >= n ? "disabled" : ""}>最後まで見た</button>${pw ? `<button type="button" class="u-btn sm ghost" data-ytp="reset">リセット</button>` : ""}</div>`
      : ""
  }</div>`;
  const IC_EXT = `<svg class="iic" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M13.5 2.5 7.5 8.5M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const IC_PLAY = `<svg class="iic ply" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M6.5 5.2v5.6L11 8z" fill="#fff"/></svg>`;
  const links = `<div class="ilinks">${
    x.pl
      ? `<a class="ilk ivod" href="${esc(x.pl)}" target="_blank" rel="noopener">${IC_PLAY}<span class="ilt">再生リスト</span></a>`
      : nf("pl")
        ? ""
        : `<button type="button" class="ilk off" data-jump="y-pl">再生リスト未設定</button>`
  }${
    x.sm
      ? `<a class="ilk" href="${esc(x.sm)}" target="_blank" rel="noopener"><span class="ilt">まとめ動画</span>${IC_EXT}</a>`
      : nf("sm")
        ? ""
        : `<button type="button" class="ilk off" data-jump="y-sm">まとめ動画未設定</button>`
  }</div>`;
  const nv = ytNeighbors(x.id);
  const navB = (d, lab, ic) => `<button type="button" class="dnav" data-dnav="${d}" aria-label="${lab}" title="${lab}${TOUCH ? "" : `（${d < 0 ? "←" : "→"}キー）`}" ${nv[d < 0 ? 0 : 1] ? "" : "disabled"}>${ic}</button>`;
  return `<div class="dhead ydhead"><div class="hdrow"><div class="meta"><span class="kind yauth">YouTube</span>${stBtn}</div><div class="hdrow">${navB(-1, "前の作品", "‹")}${navB(1, "次の作品", "›")}<button type="button" class="editbtn" id="ytEdit">編集</button><button class="close" type="button" data-close aria-label="閉じる">✕</button></div></div>
    <h3>${esc(x.t)}<button type="button" class="tcopy" id="ytCopy" aria-label="タイトルをコピー" title="タイトルをコピー"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button></h3>${ytMissDetail(x)}</div>
    <div class="ydbody">${info}${prog}${links}
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
  if (!ytOpen || $("#ytIn input.inl")) return;
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

/* ---------- 追加・編集 ---------- */
let yform = null;
const ONLY_Y = { yfAuthor: "投稿者", yfGenre: "ジャンル" };
function ytFormHtml() {
  const f = yform;
  if (f.only && ONLY_Y[f.only]) {
    const authors = [...new Set([...ytAuthors(), f.a].filter(Boolean))];
    const k = f.only;
    const body =
      k === "yfAuthor"
        ? `<div class="field full"><div class="chips">${authors.map(a => `<button type="button" data-yfa="${esc(a)}" aria-pressed="${f.a === a}">${esc(a)}</button>`).join("")}<input id="y-anew" class="chipin" autocomplete="off" placeholder="＋ ほかの投稿者" value="${esc(authors.includes(f.a) ? "" : f.a)}"></div></div>`
        : `<div class="field full"><div class="segc" role="group" aria-label="ジャンル">${[SOLO, COLLAB].map(g => `<button type="button" data-yfg="${g}" aria-pressed="${ytCat(f) === g}">${g}</button>`).join("")}</div>
        ${
          ytCat(f) === COLLAB
            ? `<div class="chips" style="margin-top:8px" role="group" aria-label="コラボのグループ">${ytSubs()
                .map(
                  g =>
                    `<button type="button" data-yfsub="${esc(g)}" aria-pressed="${ytSub(f) === g}">${esc(g)}</button>`,
                )
                .join("")}</div>`
            : ""
        }
        ${
          ytCat(f) === SOLO
            ? `<div class="chips" style="margin-top:8px" role="group" aria-label="一人実況のグループ">${M("soloGroups")
                .map(
                  g =>
                    `<button type="button" data-yfsg="${esc(g)}" aria-pressed="${ytSolo(f) === g}">${esc(g)}</button>`,
                )
                .join("")}</div>`
            : ""
        }</div>`;
    return `<div class="hdrow"><h3 class="onlyh"><small>${esc(f.t)}</small>${ONLY_Y[k]}を編集</h3><button class="close" type="button" data-back="1" aria-label="戻る">✕</button></div>
      <form id="ytF" novalidate><div class="fgrid only">${body}</div>
      <div class="ffoot"><button type="button" class="u-btn ghost" data-back="1">キャンセル</button><button class="u-btn pri primary" type="submit">保存する</button></div></form>`;
  }
  const authors = [...new Set([...ytAuthors(), f.a].filter(Boolean))];
  const sec = (t, b) => `<section class="fsec"><h4>${t}</h4><div class="fgrid">${b}</div></section>`;
  return `<div class="hdrow"><h3>再生リストを${f.id ? "編集" : "追加"}</h3><button class="close" type="button" data-close aria-label="閉じる">✕</button></div>
    <form id="ytF" novalidate>
    ${sec(
      "基本情報",
      `
      <label class="field full"><span>動画タイトル</span><input id="y-t" autocomplete="off" placeholder="例：ゼルダの伝説 ティアーズ オブ ザ キングダム" value="${esc(f.t)}"></label>
      <div class="field full" id="yfAuthor"><span>投稿者</span><div class="chips">${authors.map(a => `<button type="button" data-yfa="${esc(a)}" aria-pressed="${f.a === a}">${esc(a)}</button>`).join("")}<input id="y-anew" class="chipin" autocomplete="off" placeholder="＋ ほかの投稿者" value="${esc(authors.includes(f.a) ? "" : f.a)}"></div></div>
      <div class="field full" id="yfGenre"><span>ジャンル</span><div class="segc" role="group" aria-label="ジャンル">${[SOLO, COLLAB].map(g => `<button type="button" data-yfg="${g}" aria-pressed="${ytCat(f) === g}">${g}</button>`).join("")}</div>
        ${
          ytCat(f) === COLLAB
            ? `<div class="chips" style="margin-top:8px" role="group" aria-label="コラボのグループ">${ytSubs()
                .map(
                  g =>
                    `<button type="button" data-yfsub="${esc(g)}" aria-pressed="${ytSub(f) === g}">${esc(g)}</button>`,
                )
                .join("")}</div>`
            : ""
        }
        ${
          ytCat(f) === SOLO
            ? `<div class="chips" style="margin-top:8px" role="group" aria-label="一人実況のグループ">${M("soloGroups")
                .map(
                  g =>
                    `<button type="button" data-yfsg="${esc(g)}" aria-pressed="${ytSolo(f) === g}">${esc(g)}</button>`,
                )
                .join("")}</div>`
            : ""
        }</div>
      <div class="field full"><span>視聴ステータス <span class="hint">選ばなければ未視聴</span></span><div class="segc" role="group" aria-label="視聴ステータス">${YT_STATUS.map(st => `<button type="button" data-yfs="${st}" aria-pressed="${f.s === st}">${stLabel(st)}</button>`).join("")}</div></div>`,
    )}
    ${sec(
      "動画の情報",
      `
      <label class="field"><span>初回投稿日 <span class="hint">YouTubeの日付を貼り付けできます</span></span><input id="y-up" class="dto" type="text" inputmode="numeric" autocomplete="off" placeholder="2024/03/08" value="${esc(fmtD(f.up))}"><span class="hint err" id="yUpMsg"></span></label>
      <label class="field"><span>パート数</span><input id="y-n" type="number" min="0" inputmode="numeric" placeholder="12" value="${f.n || ""}"></label>
      <label class="field"><span>再生時間 <span class="hint">「630」で6時間30分</span></span><input id="y-dur" inputmode="numeric" autocomplete="off" placeholder="630" value="${esc(f.dur)}"><span class="hint" id="yDurMsg"></span></label>`,
    )}
    ${sec(
      "リンク",
      `
      <label class="field full"><span>再生リスト</span><input id="y-pl" type="url" inputmode="url" autocomplete="off" placeholder="https://www.youtube.com/playlist?list=…" value="${esc(f.pl)}"></label>
      <label class="field full"><span>まとめ動画</span><input id="y-sm" type="url" inputmode="url" autocomplete="off" placeholder="https://youtu.be/…" value="${esc(f.sm)}"></label>`,
    )}
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
function ytRedrawForm() {
  const sh = $(".sheet.form");
  const y = sh.scrollTop;
  $("#ytFormIn").innerHTML = ytFormHtml();
  sh.scrollTop = y;
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
  ytOpen = null;
  openId = null;
  form = null;
  $("#layer").innerHTML =
    `<div class="scrim" data-close></div><div class="sheet form" role="dialog" aria-modal="true" aria-label="YouTubeを${yform.id ? "編集" : "追加"}"><div class="wrap" id="ytFormIn">${ytFormHtml()}</div></div>`;
  if (ONLY_Y[target]) {
    yform.only = target;
    $(".sheet.form").classList.add("mini");
    $("#ytFormIn").innerHTML = ytFormHtml();
  } else if (target && document.getElementById(target)) {
    const el = document.getElementById(target);
    el.scrollIntoView({ block: "center" });
    if (!TOUCH) el.focus({ preventScroll: true });
  } else if (!TOUCH) $("#y-t").focus({ preventScroll: true });
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
    $("#y-t").focus();
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
const YT_ACTIONS = [
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
  ["[data-ytmissw]", ytUI(() => (yst.missOnly = !yst.missOnly))],
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
  [
    "[data-inl]",
    (el, x, e) => {
      if (!e.target.closest("input")) startInline(el);
    },
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
