/* ===================== AniList の画面：作品の追加画面の「AniListから探す」・登録済みの作品の「AniListで確認」・番組表の「新作・続編のお知らせ」 =====================
   取り出しは anilist.js（AL）。ここは画面と、作品データへの当てはめだけ。
   AniList から入れる項目：タイトル・放送形態・開始日・放送時間・放送クール・画像・公式サイト・配信サイト（Netflix とそのURLだけ）・シリーズ */

/* ---------- 共通：AniList の値 → アプリの値 ---------- */
const AL_FMT = { TV: "TV", TV_SHORT: "TV（ショート）", MOVIE: "映画", SPECIAL: "TV SP", OVA: "OVA", ONA: "配信", MUSIC: "MV" };
const AL_MEDIA = { TV: "tv", TV_SHORT: "tv", MOVIE: "movie", SPECIAL: "sp", OVA: "ova", ONA: "stream" };
const AL_SEASON = { WINTER: "冬", SPRING: "春", SUMMER: "夏", FALL: "秋" };
const alTitle = m => (m.title && (m.title.native || m.title.romaji || m.title.english)) || "";
const alYmd = d => (d && d.year ? `${d.year}-${String(d.month || 1).padStart(2, "0")}-${String(d.day || 1).padStart(2, "0")}` : "");
/* いつから：放送中／2027年1月〜／2027年〜／未定 */
function alWhen(m) {
  if (m.status === "RELEASING") return "放送中";
  const s = m.startDate || {};
  if (m.status === "FINISHED") return s.year ? `${s.year}年${s.month ? s.month + "月" : ""} 放送済` : "放送済";
  if (s.year && s.month) return `${s.year}年${s.month}月${s.day ? s.day + "日" : ""}〜`;
  if (m.season && m.seasonYear) return `${m.seasonYear}年${AL_SEASON[m.season]}〜`;
  return s.year ? `${s.year}年〜` : "放送日未定";
}
const alSub = m => [AL_FMT[m.format] || m.format, m.seasonYear ? `${m.seasonYear}年${AL_SEASON[m.season] || ""}` : m.startDate?.year ? `${m.startDate.year}年` : "", m.episodes ? `全${m.episodes}話` : ""].filter(Boolean).join("・");
/* 開始から終了までのクール（2クール以上もまとめて。わからなければ最初のクールだけ） */
function alCours(from, to, first) {
  const a = first || courOfDate(from);
  if (!a) return [];
  const ci = c => +c.slice(0, 4) * 4 + SEASONS.indexOf(c.slice(4));
  const b = courOfDate(to);
  const n = b && ci(b) >= ci(a) ? Math.min(ci(b) - ci(a), 7) : 0;
  return Array.from({ length: n + 1 }, (_, k) => {
    const v = ci(a) + k;
    return `${Math.floor(v / 4)}${SEASONS[v % 4]}`;
  });
}
/* 登録済みの作品から、この AniList の作品に合うシリーズを探す（つながりのある作品のシリーズ → タイトルにシリーズ名が入っている） */
function alGuessSeries(m) {
  const ids = new Set((m.relations?.edges || []).map(e => e.node.id));
  const hit = items.find(i => i.series && i.al && ids.has(i.al));
  if (hit) return hit.series;
  const names = alNames(m);
  const rel = (m.relations?.edges || []).filter(e => e.node.type === "ANIME").flatMap(e => alNames(e.node));
  const it = items.find(i => i.series && i.k === "a" && rel.some(n => alSame(n, alNorm(i.t))));
  if (it) return it.series;
  return M("series").find(s => alNorm(s).length >= 3 && names.some(n => n.includes(alNorm(s)))) || "";
}
/* AniList のくわしい情報 → アプリの値（入れる項目だけ） */
function alToForm(m) {
  const media = AL_MEDIA[m.format] || "tv";
  const sch = (m.airingSchedule?.nodes || []).filter(x => x.episode && x.airingAt).sort((a, b) => a.episode - b.episode);
  const first = sch[0] && jst(Math.floor(sch[0].airingAt / 60));
  /* 放送予定が1話からそろっていないとき（最初の数話がまとめて放送された・長い作品は最近の分だけ）は、開始日は AniList の開始日 */
  const from = first && sch[0].episode === 1 ? first.day : alYmd(m.startDate) || (first ? first.day : "");
  const weekly = media === "tv" || media === "stream";
  const time = weekly && first ? first.hm : "";
  const lastS = sch[sch.length - 1] && jst(Math.floor(sch[sch.length - 1].airingAt / 60));
  const to = m.status === "FINISHED" || (m.episodes && sch.length >= m.episodes) ? (lastS ? lastS.day : alYmd(m.endDate)) : "";
  const links = m.externalLinks || [];
  const off = links.find(l => l.site === "Official Site" && (l.language === "Japanese" || !l.language)) || links.find(l => l.site === "Official Site");
  const nf = links.find(l => l.site === "Netflix");
  return {
    t: alTitle(m),
    media,
    from,
    time,
    /* 最初のクールは AniList の季節（9月末に先行放送した秋アニメなどを「夏」にしないため） */
    cours: weekly ? alCours(from, to, m.season && m.seasonYear ? `${m.seasonYear}${AL_SEASON[m.season]}` : "") : [],
    url: off ? off.url : "",
    netflix: !!nf,
    vurl: nf ? nf.url : "",
    series: alGuessSeries(m),
    cover: m.coverImage?.large || m.coverImage?.medium || "",
  };
}
/* 画像を AniList から取って保存（貼り付けと同じ流れで縮小） */
async function alSaveCover(id, url) {
  if (!url || typeof setImage !== "function") return;
  try {
    const b = await AL.image(url);
    await setImage(id, new File([b], "cover.jpg", { type: b.type || "image/jpeg" }));
  } catch (e) {
    toast("画像は取得できませんでした（あとで貼り付けてください）");
  }
}
/* 検索結果の1行（追加画面・AniListで確認 で共通） */
const alResHtml = (res, attr) =>
  res.length
    ? `<div class="alx-res">${res
        .map(
          m => `<button type="button" class="alx-it" ${attr}="${m.id}"><span class="alx-im">${m.coverImage?.medium ? `<img src="${esc(m.coverImage.medium)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</span>
        <span class="alx-tx"><b>${esc(alTitle(m))}</b>${m.title?.romaji && m.title.romaji !== alTitle(m) ? `<small>${esc(m.title.romaji)}</small>` : ""}<small class="alx-meta">${esc(alSub(m))}</small></span></button>`,
        )
        .join("")}</div>`
    : `<p class="alx-msg">見つかりませんでした。別の書き方（ローマ字・略さない名前など）でお試しください</p>`;
const AL_ERR = "AniListにつながりませんでした。少し時間をおいてお試しください";

/* ---------- 作品の追加画面：AniList から探す ---------- */
let alS = { q: "", busy: "", res: null, err: "", got: null };
const alReset = () => (alS = { q: "", busy: "", res: null, err: "", got: null });
function alBoxHtml() {
  if (!form || form.id || form.only) return "";
  const g = alS.got;
  if (g)
    return `<div class="alx done" id="alBox"><div class="alx-ok"><span class="alx-im">${g.cover ? `<img src="${esc(g.cover)}" alt="">` : ""}</span><span class="alx-tx"><b>AniListから入力しました</b><small>${esc(g.sum)}</small><small>違うところは下で直せます${form.al?.cover ? "。画像は「追加する」で一緒に保存します" : ""}</small></span><button type="button" class="u-btn sm txt" data-alclear>やめる</button></div></div>`;
  return `<div class="alx" id="alBox"><div class="alx-row"><input id="alQ" class="u-input" type="search" enterkeyhint="search" autocomplete="off" placeholder="AniListでアニメを検索（例：フリーレン）" value="${esc(alS.q)}"><button type="button" class="u-btn sm pri" data-alsearch>${alS.busy === "q" ? "検索中…" : "検索"}</button></div>
    ${alS.busy === "p" ? `<p class="alx-msg">作品の情報を取得しています…</p>` : ""}${alS.err ? `<p class="alx-msg err">${esc(alS.err)}</p>` : ""}${alS.busy || !alS.res ? "" : alResHtml(alS.res, "data-alpick")}</div>`;
}
function alRedrawBox() {
  const b = $("#alBox");
  if (!b) return;
  const t = document.createElement("template");
  t.innerHTML = alBoxHtml();
  b.replaceWith(t.content.firstElementChild || "");
}
async function alSearch() {
  const q = ($("#alQ")?.value || "").trim();
  if (!q || alS.busy) return;
  readForm();
  Object.assign(alS, { q, busy: "q", err: "", res: null });
  alRedrawBox();
  try {
    alS.res = await AL.search(q);
  } catch (e) {
    alS.err = AL_ERR;
  }
  alS.busy = "";
  alRedrawBox();
}
/* 作品を選んだ：くわしい情報を取って、編集画面に入れる。extra＝お知らせから開いたときのシリーズなど */
async function alPick(id, extra = {}) {
  if (alS.busy) return;
  if (form) readForm();
  Object.assign(alS, { busy: "p", err: "" });
  alRedrawBox();
  try {
    const m = await AL.detail(id);
    if (!form) return;
    const v = alToForm(m);
    const sites = v.netflix ? ["Netflix"] : [];
    Object.assign(form, {
      t: v.t,
      k: "a",
      media: v.media,
      from: v.from,
      time: v.time,
      cours: v.cours,
      url: v.url,
      vods: v.media === "stream" ? [] : sites,
      plat: v.media === "stream" ? sites : [],
      vurl: v.vurl,
      series: v.series || extra.series || form.series || "",
      al: { id: m.id, cover: v.cover },
    });
    form.noF = (form.noF || []).filter(k => !(k === "url" && v.url));
    alS.got = { cover: m.coverImage?.medium || "", sum: alGotSum(v) };
  } catch (e) {
    alS.err = "作品の情報を取得できませんでした。少し時間をおいてお試しください";
  }
  alS.busy = "";
  if (form) redrawForm();
}
const alGotSum = v =>
  [v.from && "開始日", v.time && "放送時間", v.cours.length && "放送クール", v.url && "公式サイト", v.netflix && "Netflix", v.series && "シリーズ", v.cover && "画像"].filter(Boolean).join("・") || "タイトル・放送形態";
/* 追加したあと：画像を保存する */
function alAfterAdd(id, al) {
  if (al.cover) alSaveCover(id, al.cover);
}
const AL_FORM_ACTIONS = [
  ["[data-alsearch]", () => alSearch()],
  ["[data-alpick]", el => alPick(+el.dataset.alpick)],
  [
    "[data-alclear]",
    () => {
      /* 入れた値を消して、空の追加画面に戻す */
      const k = form.k;
      openForm(null);
      form.k = k;
      alReset();
      redrawForm();
    },
  ],
];
function onAlClick(e) {
  if (!$("#alBox") && !e.target.closest("[data-alnote],[data-alcheck],.alsheet,.alchk")) return false;
  return runActions(AL_FORM_ACTIONS, e) || runActions(AL_NOTE_ACTIONS, e) || runActions(AL_CHK_ACTIONS, e);
}
document.addEventListener(
  "keydown",
  e => {
    const id = e.target && e.target.id;
    if ((id === "alQ" || id === "alCQ") && e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      e.stopPropagation();
      if (id === "alQ") alSearch();
      else alChkSearch();
    }
  },
  true,
);

/* ---------- 登録済みの作品：AniListで確認 ----------
   作品の詳細の「AniListで確認」から。AniList の作品とつないで（未接続ならタイトルで探す）、今の値と AniList の値を並べる。
   チェックを付けた項目は更新しない。最初から付いているのは、入力済み・「なし」で、AniList と違う項目（空の項目は付けない＝入れる） */
let alC = null; // { id, step: "busy"|"pick"|"cmp", q, res, m, v, rows, msg, err }
const alDay = d => (d ? d.replace(/-/g, "/") : "");
const alSites = (media, it) => {
  const m = mediaOf(it);
  return media === "stream" ? m.plat : m.vods;
};
/* 比べる項目：[キー, 名前, 今の値（表示）, AniList の値（表示）, 「なし」のキー] */
function alRowsOf(it, v) {
  const nf = k => (it.noF || []).includes(k);
  const cm = mediaOf(it);
  const site = cm.media === "stream" ? "plat" : "vods";
  const has = alSites(cm.media, it);
  const rows = [
    ["t", "タイトル", it.t, v.t],
    ["media", "放送形態", MEDIA_LAB[cm.media] || "", MEDIA_LAB[v.media] || ""],
    ["from", "開始日", alDay(it.from), alDay(v.from)],
    ["time", "放送時間", it.time || "", noSched(v.media) ? "" : v.time, "time"],
    ["cours", "放送クール", coursOf(it).map(courLabel).join("・"), v.cours.map(courLabel).join("・"), "cours"],
    ["url", "公式サイト", it.url || "", v.url, "url"],
    ["vod", "配信サイト", has.join("・"), v.netflix ? (has.includes("Netflix") ? has.join("・") : [...has, "Netflix"].join("・")) : "", site],
    ["vurl", "NetflixのURL", it.vurl || "", v.vurl, "vurl"],
    ["series", "シリーズ", it.series || "", v.series, "ser"],
    ["img", "画像", it.img ? "あり" : "", v.cover ? (it.img ? "AniListの画像に差し替え" : "AniListの画像") : ""],
  ];
  return rows
    .filter(([, , , nv]) => nv)
    .map(([k, lab, cur, nv, n]) => {
      const none = !!n && nf(n) && !cur;
      const same = k !== "img" && String(cur) === String(nv);
      /* 空なら入れる。入力済み・「なし」で違うものは、最初は「更新しない」 */
      return { k, lab, cur: none ? "なし" : cur, nv, n, same, skip: !same && (none || !!cur) };
    });
}
/* URLは「https://」を外して1行で（長い分は…） */
const alIsUrl = r => r.k === "url" || r.k === "vurl";
const alShow = (r, v) => (alIsUrl(r) && v !== "なし" ? String(v || "").replace(/^https?:\/\/(www\.)?/, "") : v);
function alChkHtml() {
  const it = items.find(x => x.id === alC.id);
  if (!it) return "";
  let body = "";
  if (alC.step === "busy") body = `<p class="alx-msg">${esc(alC.msg || "AniListで探しています…")}</p>`;
  else if (alC.step === "pick")
    body = `<p class="aln-note">AniListの作品を選んでください</p>
      <div class="alx-row"><input id="alCQ" class="u-input" type="search" enterkeyhint="search" autocomplete="off" value="${esc(alC.q)}" aria-label="AniListで探す"><button type="button" class="u-btn sm pri" data-alc="search">検索</button></div>
      ${alC.res ? alResHtml(alC.res, "data-alcpick") : ""}`;
  else if (alC.step === "cmp") {
    const diff = alC.rows.filter(r => !r.same),
      same = alC.rows.filter(r => r.same);
    const m = alC.m;
    body = `<div class="alc-hit"><span class="alx-im">${m.coverImage?.medium ? `<img src="${esc(m.coverImage.medium)}" alt="" onerror="this.remove()">` : ""}</span><span class="alx-tx"><small>AniListの作品</small><b>${esc(alTitle(m))}</b><small class="alx-meta">${esc(alSub(m))}</small></span><button type="button" class="u-btn sm txt" data-alc="other">違う作品</button></div>
      ${
        diff.length
          ? `<div class="alc-tbl"><div class="alc-hd"><span>項目</span><span>今</span><span>AniList</span><span>更新しない</span></div>${diff
              .map(
                r => `<label class="alc-r${r.skip ? " skip" : ""}"><span class="alc-k">${esc(r.lab)}</span><span class="alc-c${r.cur ? "" : " none"}${alIsUrl(r) ? " u" : ""}">${esc(alShow(r, r.cur) || "未入力")}</span><span class="alc-n${alIsUrl(r) ? " u" : ""}">${esc(alShow(r, r.nv))}</span><span class="alc-x"><input type="checkbox" data-alcskip="${r.k}" ${r.skip ? "checked" : ""} aria-label="${esc(r.lab)}を更新しない"></span></label>`,
              )
              .join("")}</div>`
          : `<p class="alx-msg">AniListと違う項目はありません</p>`
      }
      ${same.length ? `<p class="alc-same">同じ：${same.map(r => esc(r.lab)).join("・")}</p>` : ""}`;
  }
  const n = alC.step === "cmp" ? alC.rows.filter(r => !r.same && !r.skip).length : 0;
  return `<div class="scrim" data-alc="back"></div><div class="sheet alchk" role="dialog" aria-modal="true" aria-label="AniListで確認"><div class="wrap">
    <div class="hdrow"><h3><small>${esc(it.t)}</small>AniListで確認</h3><button class="u-btn icon sm soft close" type="button" data-alc="back" aria-label="戻る">✕</button></div>
    ${alC.err ? `<p class="alx-msg err">${esc(alC.err)}</p>` : ""}${body}
    ${alC.step === "cmp" ? `<div class="ffoot"><button type="button" class="u-btn" data-alc="back">キャンセル</button><button type="button" class="u-btn pri primary" data-alc="apply"${n || !it.al ? "" : " disabled"}>${n ? `${n}項目を更新する` : it.al ? "更新なし" : "つなぐだけ"}</button></div>` : ""}</div></div>`;
}
const alChkDraw = () => alC && ($("#layer").innerHTML = alChkHtml());
async function alChkOpen(id) {
  const it = items.find(x => x.id === id);
  if (!it) return;
  alC = { id, step: "busy", q: it.t };
  alChkDraw();
  if (it.al) return alChkLoad(it.al);
  try {
    const res = await AL.search(it.t);
    /* 同じタイトル（括弧・記号の違いは無視）で、開始年も合うものが1つだけなら、それに決める */
    const n = alNorm(it.t),
      y = yearOf(it);
    const ok = res.filter(m => alNames(m).includes(n) && (!y || !m.startDate?.year || m.startDate.year === y));
    if (ok.length === 1) return alChkLoad(ok[0].id);
    Object.assign(alC, { step: "pick", res });
  } catch (e) {
    Object.assign(alC, { step: "pick", res: null, err: AL_ERR });
  }
  alChkDraw();
}
async function alChkLoad(alId) {
  Object.assign(alC, { step: "busy", msg: "作品の情報を取得しています…", err: "" });
  alChkDraw();
  try {
    const m = await AL.detail(alId);
    const it = items.find(x => x.id === alC.id);
    const v = alToForm(m);
    Object.assign(alC, { step: "cmp", m, v, rows: alRowsOf(it, v) });
  } catch (e) {
    Object.assign(alC, { step: "pick", err: "作品の情報を取得できませんでした。少し時間をおいてお試しください" });
  }
  alChkDraw();
}
async function alChkSearch() {
  const q = ($("#alCQ")?.value || "").trim();
  if (!q) return;
  Object.assign(alC, { q, step: "busy", msg: "AniListで探しています…", err: "" });
  alChkDraw();
  try {
    alC.res = await AL.search(q);
  } catch (e) {
    alC.err = AL_ERR;
  }
  alC.step = "pick";
  alChkDraw();
}
/* 更新する：チェックを付けていない違う項目だけ書きかえ、AniList の作品番号を持つ */
async function alChkApply() {
  const it = items.find(x => x.id === alC.id);
  if (!it) return;
  const v = alC.v,
    on = new Set(alC.rows.filter(r => !r.same && !r.skip).map(r => r.k));
  const patch = { al: alC.m.id };
  const cm = mediaOf(it);
  const media = on.has("media") ? v.media : cm.media;
  if (on.has("t")) patch.t = v.t;
  if (on.has("media")) {
    patch.media = v.media;
    /* 配信 ⇔ ほかの形態に変えたときは、配信サイトの入れ物（plat・vods）も移す */
    if ((v.media === "stream") !== (cm.media === "stream")) {
      const l = alSites(cm.media, it);
      patch.plat = v.media === "stream" ? l : [];
      patch.vods = v.media === "stream" ? [] : l;
    }
    if (noSched(v.media)) Object.assign(patch, { time: "", cours: [] });
  }
  if (on.has("from")) patch.from = v.from;
  if (on.has("time")) patch.time = v.time;
  if (on.has("cours")) patch.cours = v.cours;
  if (on.has("url")) patch.url = v.url;
  if (on.has("vurl")) patch.vurl = v.vurl;
  if (on.has("series")) patch.series = v.series;
  if (on.has("vod")) {
    const key = media === "stream" ? "plat" : "vods";
    const base = patch[key] || alSites(media, it);
    patch[key] = base.includes("Netflix") ? base : [...base, "Netflix"];
  }
  /* 入れた項目の「なし」は外す */
  const offN = alC.rows.filter(r => on.has(r.k) && r.n).map(r => r.n);
  if (offN.length) patch.noF = (it.noF || []).filter(k => !offN.includes(k));
  /* 曜日：開始日・放送時間・放送形態を変えたら決め直す（作品の編集と同じ考え方） */
  if (on.has("from") || on.has("time") || on.has("media")) {
    const from = patch.from ?? it.from,
      noT = (patch.noF || it.noF || []).includes("time");
    patch.dow = noSched(media) || noT || !from ? -1 : dowOfDate(from);
  }
  const id = it.id,
    cover = on.has("img") ? v.cover : "";
  alC = null;
  close();
  await saveTitle(id, patch, on.size ? `AniListから${on.size}項目を更新しました` : "AniListとつなぎました");
  openDetail(id);
  if (cover) alSaveCover(id, cover);
}
const AL_CHK_ACTIONS = [
  ["[data-alcheck]", (el, ctx) => alChkOpen(openId)],
  ["[data-alcpick]", el => alChkLoad(+el.dataset.alcpick)],
  ['[data-alc="search"]', () => alChkSearch()],
  [
    '[data-alc="other"]',
    () => {
      Object.assign(alC, { step: "pick", res: null, err: "" });
      alChkSearch();
    },
  ],
  ['[data-alc="apply"]', () => alChkApply()],
  [
    '[data-alc="back"]',
    () => {
      const id = alC && alC.id;
      alC = null;
      close();
      if (id) openDetail(id);
    },
  ],
];
document.addEventListener("change", e => {
  const k = e.target && e.target.dataset && e.target.dataset.alcskip;
  if (!k || !alC || !alC.rows) return;
  const r = alC.rows.find(x => x.k === k);
  if (r) r.skip = e.target.checked;
  alChkDraw();
});

/* ---------- 番組表：新作・続編のお知らせ ----------
   今のクール・次のクール・それより先に決まっている新作のうち、登録済みのアニメにつながるもの（続編・外伝・リメイクなど）。
   1日1回だけ取りに行き、この端末に控える。「表示しない」にしたものは設定（master.alHide）に保存して、どの端末でも出さない */
const K_AL = "entame.al.feed.v1";
const AL_REL = { PREQUEL: "続編", PARENT: "派生作品", SIDE_STORY: "関連作品", ALTERNATIVE: "別バージョン" };
let alFeed = (ls.get(K_AL) || null),
  alFeedBusy = false;
/* 名前を比べる形にそろえる（「第2期」なども残す。完全一致・前方一致で見る） */
/* 括弧・記号も外して比べる（【推しの子】と「推しの子」を同じに） */
const alNorm = t => norm(t).replace(/[【】「」『』()（）\[\]＜＞〈〉《》<>:：/／.,，．'"’”]/g, "");
const alNames = m => [m.title?.native, m.title?.romaji, m.title?.english, ...(m.synonyms || [])].filter(Boolean).map(alNorm).filter(Boolean);
const alSame = (a, b) => !!a && !!b && (a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a))));
/* 控えに残す分だけにする（端末の容量を使いすぎないように） */
const alSlim = m => ({
  id: m.id,
  title: m.title,
  synonyms: (m.synonyms || []).slice(0, 6),
  format: m.format,
  status: m.status,
  episodes: m.episodes,
  season: m.season,
  seasonYear: m.seasonYear,
  startDate: m.startDate,
  coverImage: { medium: m.coverImage?.medium || "" },
  relations: { edges: (m.relations?.edges || []).filter(e => e.node.type === "ANIME" && AL_REL[e.relationType]).map(e => ({ relationType: e.relationType, node: { id: e.node.id, type: e.node.type, title: e.node.title, synonyms: (e.node.synonyms || []).slice(0, 6) } })) },
});
async function alRefresh(force) {
  if (alFeedBusy || typeof AL === "undefined") return;
  if (!force && alFeed && Date.now() - alFeed.at < 12 * 3600e3) return;
  alFeedBusy = true;
  try {
    const l = await AL.upcoming();
    alFeed = { at: Date.now(), list: l.filter(m => m.format !== "MUSIC").map(alSlim) };
    ls.set(K_AL, alFeed);
  } catch (e) {
    console.warn("AniList", e);
  }
  alFeedBusy = false;
  if (state.mode === "w" && $("#clock")) $("#clock").innerHTML = weekTopHtml();
  if ($(".alsheet")) alOpenNotes();
}
/* お知らせの中身：[{ m, base: 登録済みの作品, why }] */
function alNotes() {
  if (!alFeed) return [];
  const hide = new Set(master.alHide || []);
  const anime = items.filter(i => i.k === "a");
  const have = new Set(anime.map(i => i.al).filter(Boolean));
  const own = anime.map(i => ({ i, n: alNorm(i.t) }));
  const out = [];
  alFeed.list.forEach(m => {
    if (hide.has(m.id) || have.has(m.id)) return;
    const mine = alNames(m);
    /* すでに登録してある（同じタイトル） */
    if (own.some(o => mine.includes(o.n))) return;
    let hit = null;
    for (const e of m.relations.edges) {
      const ns = alNames(e.node);
      const o = own.find(o => o.i.al === e.node.id || ns.some(n => alSame(n, o.n)));
      if (o) {
        hit = { base: o.i, why: AL_REL[e.relationType] };
        break;
      }
    }
    /* つながりが未登録の新作：タイトルが登録済みの作品名で始まる */
    if (!hit) {
      const o = own.find(o => o.n.length >= 4 && mine.some(n => n !== o.n && n.includes(o.n)));
      if (o) hit = { base: o.i, why: "関連作品" };
    }
    if (hit) out.push({ m, ...hit });
  });
  const rank = m => (m.status === "RELEASING" ? 0 : 1);
  const key = m => alYmd(m.startDate) || (m.seasonYear ? `${m.seasonYear}-${String(["WINTER", "SPRING", "SUMMER", "FALL"].indexOf(m.season) * 3 + 1).padStart(2, "0")}-01` : "9999");
  return out.sort((a, b) => rank(a.m) - rank(b.m) || (key(a.m) < key(b.m) ? -1 : key(a.m) > key(b.m) ? 1 : 0));
}
/* 番組表の上：お知らせがあるときだけ小さな札を出す */
function alNoteBtn() {
  const n = alNotes().length;
  if (!n) return "";
  return `<button type="button" class="wt-al" data-alnote="open"><span class="wt-l">新作・続編</span><b>${n}<small>件</small></b><span class="wt-go">見る ›</span></button>`;
}
function alNoteRow(x) {
  const m = x.m;
  return `<div class="aln" data-alid="${m.id}"><span class="alx-im">${m.coverImage?.medium ? `<img src="${esc(m.coverImage.medium)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</span>
    <div class="aln-tx"><span class="aln-tags"><span class="aln-when${m.status === "RELEASING" ? " now" : ""}">${esc(alWhen(m))}</span>${m.format ? `<span class="aln-fmt">${esc(AL_FMT[m.format] || m.format)}</span>` : ""}</span>
      <b>${esc(alTitle(m))}</b><small>「${esc(x.base.t)}」の${esc(x.why)}</small>
      <span class="aln-btns"><button type="button" class="u-btn sm pri" data-alnote="add">登録する</button><button type="button" class="u-btn sm txt" data-alnote="hide">表示しない</button></span></div></div>`;
}
function alOpenNotes() {
  const l = alNotes();
  const body = l.length ? l.map(alNoteRow).join("") : `<p class="alx-msg">登録済みのアニメにつながる新作は、今のところありません</p>`;
  const at = alFeed ? fmtAt(alFeed.at) : "";
  $("#layer").innerHTML =
    `<div class="scrim" data-close></div><div class="sheet alsheet" role="dialog" aria-modal="true" aria-label="新作・続編のお知らせ"><div class="wrap">
    <div class="hdrow"><h3>新作・続編のお知らせ</h3><button class="u-btn icon sm soft close" type="button" data-close aria-label="閉じる">✕</button></div>
    <p class="aln-note">今のクール・次のクール・発表済みの新作から、登録済みのアニメにつながるものを出しています（AniListの情報・${esc(at)}に確認）</p>
    <div class="aln-list">${body}</div></div></div>`;
}
const AL_NOTE_ACTIONS = [
  ['[data-alnote="open"]', () => alOpenNotes()],
  [
    '[data-alnote="add"]',
    el => {
      const id = +el.closest("[data-alid]").dataset.alid;
      const x = alNotes().find(n => n.m.id === id);
      close();
      openForm(null);
      form.k = "a";
      alReset();
      redrawForm();
      alPick(id, { series: x && x.base.series });
    },
  ],
  [
    '[data-alnote="hide"]',
    el => {
      const id = +el.closest("[data-alid]").dataset.alid;
      master.alHide = [...new Set([...(master.alHide || []), id])];
      saveMaster();
      el.closest(".aln").remove();
      if (!document.querySelector(".aln")) alOpenNotes();
      if (state.mode === "w" && $("#clock")) $("#clock").innerHTML = weekTopHtml();
      toast("このお知らせを表示しないようにしました");
    },
  ],
];
