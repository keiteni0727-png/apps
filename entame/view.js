/* ===================== 画面：左メニュー・番組表・ライブラリ一覧 ===================== */

/* ---------- 表示の部品：アイコン・左メニュー・上の切り替え・ラベル ---------- */
/* YouTubeの投稿者の切り替え（スマホの画面下メニュー）のアイコン */
const TB_ICON = {
  all: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
};
/* YouTubeの投稿者の絵文字（左メニュー・画面下メニュー） */
const EMO = { キヨ: "🐱", 牛沢: "🐮", レトルト: "🦀" };
/* PC：検索窓の上の切り替え（番組表／ライブラリ、YouTubeは投稿者）と設定の歯車 */
const GEAR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';
/* メニューのアイコン（線のアイコンで統一。色はそれぞれのメニューの色） */
const MODE_IC = {
  w: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h3M13.5 13.5h3M7.5 17h3"/></svg>',
  a: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 3l4 4 4-4"/></svg>',
  d: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8z"/><path d="M4 11l-.6-3.4a1 1 0 0 1 .8-1.2l13.6-2.4a1 1 0 0 1 1.2.8L19.6 7z"/><path d="M8.5 5.8l2.4 3.6M13.5 4.9l2.4 3.6"/></svg>',
  m: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 12h4M3 16h4M17 8h4M17 12h4M17 16h4"/></svg>',
  s: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18.5a10 10 0 0 1 0-13M19 5.5a10 10 0 0 1 0 13M8.2 15.3a5.5 5.5 0 0 1 0-6.6M15.8 8.7a5.5 5.5 0 0 1 0 6.6"/><path d="M10.6 9.8v4.4l3.6-2.2z" fill="currentColor"/></svg>',
  h: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/></svg>',
  yt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/></svg>',
};
/* PC：左の折りたためるメニュー */
let sbCollapsed = !!ls.get("adb.v3.sbc");
const sbFold = new Set(ls.get("adb.v3.sbf") || []); // 下の項目をたたんでいるメニュー
/* メニューを押したら、そのメニューだけ開いてほかは自動でたたむ */
function sbOnly(m) {
  sbFold.clear();
  MODE_KEYS.forEach(x => x !== "w" && x !== m && sbFold.add(x));
  ls.set("adb.v3.sbf", [...sbFold]);
}
/* メニューごとの対象（左メニューの件数用。ofKind と同じ考え方） */
const inMode = (m, i) =>
  m === "a" ? i.k === "a" : m === "d" ? i.k === "d" : m === "m" ? mediaOf(i).media === "movie" : m === "s" ? mediaOf(i).media === "stream" : false;
function renderSidebar() {
  const sb = $("#sb");
  if (!sb) return;
  document.body.classList.toggle("sbc", sbCollapsed);
  /* 左メニューは種別。アニメ・ドラマ＝TV／TV SP／映画／OVA／配信、映画＝アニメ映画／実写映画、配信＝アニメ／ドラマ・バラエティ、YouTube＝投稿者。▸▾で折りたためる
     視聴ステータスは一覧の上の切り替えで選ぶ */
  const oneT = state.type.length === 1 ? state.type[0] : state.type.length ? "*" : "";
  const subOf = m => {
    if (m === "yt") return ytAuthors().map(a => [`data-tb="${esc(a)}"`, (EMO[a] ? EMO[a] + " " : "") + a, yst.author === a, null]);
    if (m === "w" || m === "h") return [];
    const l = items.filter(i => inMode(m, i));
    if (m === "m")
      return [
        [`data-mk="all"`, "すべて", state.sub === "all", l.length],
        [`data-mk="a"`, "アニメ映画", state.sub === "a", l.filter(i => i.k === "a").length],
        [`data-mk="d"`, "実写映画", state.sub === "d", l.filter(i => i.k !== "a").length],
      ];
    if (m === "s")
      return [
        [`data-skgo="all"`, "すべて", state.sub === "all", l.length],
        [`data-skgo="a"`, "アニメ", state.sub === "a", l.filter(i => i.k === "a").length],
        [`data-skgo="x"`, "ドラマ・バラエティ", state.sub === "x", l.filter(i => i.k !== "a").length],
      ];
    const by = md => l.filter(i => mediaOf(i).media === md).length;
    return [[`data-tygo=""`, "すべて", !oneT, l.length], ...MEDIA.filter(([md]) => by(md)).map(([md, lab]) => [`data-tygo="${md}"`, lab, oneT === md, by(md)])];
  };
  const mode = (m, ic, l) => {
    const sub = subOf(m);
    const fold = sbFold.has(m);
    return `<div class="sbp${state.mode === m ? " cur" : ""}"><div class="sb-row"><button type="button" class="sb-it${state.mode === m ? " on" : ""}"${state.mode === m ? ' aria-current="page"' : ""} data-mode="${m}" title="${l}"><i aria-hidden="true">${ic}</i><span class="lbl">${l}</span></button>${sub.length ? `<button type="button" class="sb-fold lbl" data-sbfold="${m}" aria-expanded="${!fold}" aria-label="${l}の項目を${fold ? "開く" : "たたむ"}">${fold ? "▸" : "▾"}</button>` : ""}</div>${sub.length && !fold ? `<div class="sb-sub">${sub
      .map(
        ([attr, lab, on, n]) =>
          `<button type="button" class="sb-it${state.mode === m && on ? " on" : ""}"${state.mode === m && on ? ' aria-current="page"' : ""} data-go="${m}" ${attr}><span>${esc(lab)}</span>${n != null ? `<small>${n}</small>` : ""}</button>`,
      )
      .join("")}</div>` : ""}</div>`;
  };
  sb.innerHTML = `<div class="sb-top"><span class="sb-lamp">ON AIR</span><b class="lbl">エンタメ管理</b>${matchMedia("(max-width:899px)").matches ? `<button type="button" class="sb-tog" data-drawer="close" aria-label="メニューを閉じる">✕</button>` : `<button type="button" class="sb-tog" data-sbtog="1" aria-label="${sbCollapsed ? "メニューを開く" : "メニューを折りたたむ"}">${sbCollapsed ? "»" : "«"}</button>`}</div>
    <button type="button" class="sb-add" id="sbAdd" aria-label="追加">＋<span class="lbl"> 追加</span></button>
    <div class="sb-sec lbl">メニュー</div>
    ${MODE_KEYS.map(m => mode(m, `<span class="mic ${m}">${MODE_IC[m]}</span>`, MODE_NAME[m])).join("")}
    <div class="sb-foot"><button type="button" class="sb-it" data-gear="1" title="設定"><i aria-hidden="true">⚙️</i><span class="lbl">設定</span></button><div class="sb-st" id="sbSave">${saveNoteHtml()}</div></div>`;
}
function renderVbar() {
  const v = $("#vbar");
  if (!v) return;
  const yt = state.mode === "yt";
  const opts = yt
    ? ytAuthors().map(a => [a, a, yst.author === a])
    : state.mode === "m"
      ? [
          ["all", "すべて", state.sub === "all"],
          ["a", "アニメ映画", state.sub === "a"],
          ["d", "ドラマ・実写", state.sub === "d"],
        ]
      : [];
  v.innerHTML = `<div class="vseg" role="tablist"${opts.length ? "" : " hidden"}>${opts.map(([k, l, on]) => `<button type="button" role="tab" data-tb="${esc(k)}" aria-selected="${on}">${esc(l)}</button>`).join("")}</div><button type="button" class="vgear" id="gearBtn" aria-label="設定（マスタ）">${GEAR}</button>`;
}
function renderTabbar() {
  const nav = $("#tabbar");
  if (!nav) return;
  const yt = state.mode === "yt";
  const items = yt
    ? ytAuthors().map(a => [
        a,
        a,
        a === "すべて" ? TB_ICON.all : EMO[a] ? `<i class="temo" aria-hidden="true">${EMO[a]}</i>` : TB_ICON.user,
        yst.author === a,
      ])
    : state.mode === "w"
        ? weekDayTabs()
        : [];
  nav.className = "tabbar n" + items.length;
  const gear = $("#tbGear");
  if (gear && !gear.firstChild) gear.innerHTML = GEAR;
  const hs = $("#hseg");
  if (hs) {
    hs.innerHTML = items
      .map(([v, l, , on, html]) => `<button type="button" role="tab" data-tb="${esc(v)}" aria-selected="${on}"${html ? ' class="wdt"' : ""}>${html || esc(l)}</button>`)
      .join("");
    const on = hs.querySelector('[aria-selected="true"]');
    if (on && hs.scrollWidth > hs.clientWidth) hs.scrollLeft = on.offsetLeft - (hs.clientWidth - on.offsetWidth) / 2;
  }
  nav.innerHTML = items
    .map(
      ([v, l, ic, on]) =>
        `<button type="button" data-tb="${esc(v)}"${on ? ' aria-current="page"' : ""}>${ic}<span>${esc(l)}</span></button>`,
    )
    .join("");
}
/* 映画タブ：アニメ・ドラマの「種別＝映画」をまとめて出す（データは1件のまま、アニメ／ドラマ側にも出る） */
/* 配信タブ：種別「配信」（配信オリジナル）をジャンル問わずまとめて出す。リアリティ（k="r"）は映画・配信タブにだけ出る */
/* 作品詳細のシリーズ名から開いたときは、アニメ・ドラマ・映画・配信をまたいでそのシリーズを全部出す（xser） */
const ofKind = i =>
  (state.xser && state.series.length && state.mode !== "w" && state.mode !== "yt") ||
  ((state.mode !== "w" || i.k === "a" || i.k === "d") &&
  ((k => k === "all" || i.k === k || (state.mode === "m" && k === "d" && i.k === "f") || (k === "x" && i.k !== "a"))(curKind())) &&
  (state.mode !== "m" || mediaOf(i).media === "movie") &&
  (state.mode !== "s" || mediaOf(i).media === "stream"));
/* 配信サイトのクイック絞り込み（Netflix など）。配信オリジナルの配信元と、見られるサイトの両方を見る */
const vodsOf = i => [...new Set([...(i.plat || []), ...(i.vods || [])])];
const vodOk = i => !state.vod || vodsOf(i).includes(state.vod);
/* ジャンル：a=アニメ d=ドラマ f=映画（ドラマと関係ない実写映画） r=配信（恋愛リアリティ・バラエティなど、アニメでもドラマでもない配信番組） */
const KIND_LAB = { a: "アニメ", d: "ドラマ", f: "映画", r: "配信" };
const kindTag = i => `<span class="kind ${i.k}">${KIND_LAB[i.k] || "ドラマ"}</span>`;
/* 番組表の時刻の下に出す放送局（配信なら配信サイト） */
function stationTxt(i) {
  const m = mediaOf(i);
  const l = m.media === "stream" ? m.plat : hasSt(m.media) ? m.stations : [];
  return l.join("・");
}
/* 放送局・配信サイトのラベル。tag=true：作品詳細用。種別（TV・TV SP・映画・OVA・配信）を一覧と同じタグで先頭に出す */
function mediaLabels(i, tag) {
  const m = mediaOf(i);
  const head = tag ? mediaTag(i) : "";
  if (m.media === "stream")
    return `${head || `<span class="lab">配信</span>`}${m.plat.map(v => `${vlab(v)}`).join("")}`;
  return (
    head +
    (noSched(m.media) && !hasSt(m.media)
      ? tag
        ? ""
        : `<span class="lab">${MEDIA_LAB[m.media]}</span>`
      : (tag || !noSched(m.media) ? "" : `<span class="lab">${MEDIA_LAB[m.media]}</span>`) + m.stations.map(s => `<span class="lab">${esc(s)}</span>`).join("")) +
    m.vods.map(v => `${vlab(v)}`).join("")
  );
}
const SEASON_CLS = { 冬: "wi", 春: "sp", 夏: "su", 秋: "au" };
const courLab = c =>
  c === ALLYEAR
    ? `<span class="lab c al">通年</span>`
    : /^\d{4}/.test(c)
      ? `<span class="lab c ${SEASON_CLS[c.slice(4)] || ""}">${esc(c.slice(4))}<b>${esc(c.slice(0, 4))}</b></span>`
      : "";
const stPill = i =>
  `<span class="pill s-${esc(i.s)}" ${i.s ? "" : "style='background:var(--u-chip);color:var(--u-sub)'"}>${esc(stLabel(i.s || "未設定"))}</span>`;
const fmtD = d => (d ? d.slice(0, 10).replace(/-/g, "/") : "");
function periodOf(it) {
  if (mediaOf(it).media === "movie" || mediaOf(it).media === "sp") return fmtD(it.from || "");
  const eps = episodes(it).filter(e => e.t);
  const last = eps.length ? jst(eps[eps.length - 1].t).day : it.to;
  const first = it.from || (eps.length ? jst(eps[0].t).day : "");
  if (!first) return "";
  return fmtD(first) + " 〜 " + (last && last !== first ? fmtD(last) : "");
}

setInterval(() => {
  const c = $("#clock");
  if (c) c.innerHTML = weekTopHtml();
  /* 放送開始から1時間たった番組を翌週へ移すため、並びが変わるときだけ描き直す */
  if (c && state.mode === "w" && !$("#layer").innerHTML) {
    const old = weekSig;
    renderWeek();
    if (weekSig !== old) render();
  }
}, 30000);

/* ---------- ライブラリの一覧と、画面全体の描画 ---------- */
/* ライブラリ一覧のラベル：TV・配信・映画の大分類＋見られる配信サイト名だけ */
function libLabels(i) {
  const m = mediaOf(i);
  const cc = contCours(i);
  const pc =
    (i.series ? `<span class="lab s pconly">${esc(i.series)}</span>` : "") +
    (cc >= 2 ? `<span class="lab cc pconly">${cc}クール連続</span>` : "");
  const sites = [...new Set([...(m.media === "stream" ? m.plat : []), ...m.vods])];
  return (
    pc +
    sites.map(v => `${vlab(v)}`).join("")
  );
}
/* ライブラリ一覧でタイトルの前に出す種別（TV・映画・OVA・配信）。シリーズや配信サイトのラベルとは別の形・色 */
const mediaTag = i => {
  const md = mediaOf(i).media;
  return MEDIA_LAB[md] ? `<span class="mtag m-${md}">${MEDIA_LAB[md]}</span>` : "";
};
/* PCの一覧に出す追加の情報（放送クール・放送期間・OP/ED） */
function contCours(i) {
  const cs = coursOf(i)
    .filter(c => /^\d{4}/.test(c))
    .map(c => +c.slice(0, 4) * 4 + SEASONS.indexOf(c.slice(4)))
    .filter(n => n >= 0)
    .sort((a, b) => a - b);
  let best = cs.length ? 1 : 0,
    run = 1;
  for (let k = 1; k < cs.length; k++) {
    run = cs[k] === cs[k - 1] + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}
/* PCの一覧の右側：OP・ED・主題歌（種類ごとに最初の1曲。ほかにもあれば「ほかN曲」） */
function pcInfo(i) {
  const song = ["OP", "ED", "主題歌"]
    .map(t => {
      const l = songsOf(i).filter(x => x.type === t && x.s);
      if (!l.length) return "";
      const x = l[0],
        { st, ar } = songTA(x);
      return `<span class="pci-r${x.dl ? " dl" : ""}"><b>${t}</b><span class="pci-v">${x.dl ? '<i class="pci-dl" aria-label="DL済み">♪</i>' : ""}${esc(st)}${ar ? `<small>${esc(ar)}</small>` : ""}</span>${l.length > 1 ? `<em>ほか${l.length - 1}曲</em>` : ""}</span>`;
    })
    .join("");
  return `<span class="pci">${song}</span>`;
}
/* ライブラリの1行 */
function slotRow(i) {
  return `<div class="row${i.s === "視聴済み" ? " done" : ""} lst ls-${esc(i.s || "none")}"><button class="slot" type="button" data-id="${i.id}">
    <span class="time">${i.from ? `${+i.from.slice(5, 7)}/${+i.from.slice(8, 10)}` : "—"}${mediaTag(i)}${curKind() === "all" || state.xser ? kindTag(i) : ""}</span>
    <span class="ttl"><strong>${esc(i.t)}</strong><span class="meta"><span class="pmob">${stPill(i)}</span>${libLabels(i)}${missBadge(i)}</span></span>
    ${pcInfo(i)}<span class="pwide">${stPill(i)}</span></button></div>`;
}
/* 番組表：放送開始から1時間たった番組は、翌週の同じ曜日へ移す（深夜25時台などは前日の枠のまま） */
function nextSlotDay(i, now) {
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const m = mins(i.time);
  const hasT = m < 9999;
  for (let k = -1; k <= 7; k++) {
    const day = new Date(t0);
    day.setDate(t0.getDate() + k);
    if ((day.getDay() + 6) % 7 !== i.dow) continue;
    const start = new Date(day.getTime() + (hasT ? m : 0) * 60000);
    const cut = hasT ? start.getTime() + 60 * 60000 : day.getTime() + 24 * 3600000;
    if (cut > now.getTime()) return day;
  }
  return null;
}
let weekSig = "";
const dkey = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/* その日の枠で放送される話が最終回か */
function isFinOn(i, day) {
  const fi = finIdx(i);
  if (fi < 0) return false;
  const e = episodes(i)[fi];
  const j = jst(e.t);
  return !!j && j.day === day;
}
/* ---------- 番組表（アニメ・ドラマ）：作品が少ないので1作品を大きいカードで。PCは1週間を曜日ごとに2列、スマホは上の曜日タブで1日ずつ ---------- */
/* 番組表に出すのは「視聴中」で、今が放送期間の中の作品だけ（昔の作品は出さない）
   ・話の放送日がある：1話が1週間以内に始まる〜最終話の放送から14日以内（見逃した分を追いかける猶予）。最終話が先なら放送中
   ・放送日がない：放送開始日・終了日で同じように判断。日付が何もない作品は出さない
   ・通年の作品は、視聴中ならいつでも出す */
const AIR_GRACE = 14 * 1440,
  AIR_SOON = 7 * 1440;
function onAirNow(i) {
  if (coursOf(i).includes(ALLYEAR)) return true;
  const now = NOWMIN();
  const ts = episodes(i)
    .map(e => e.t)
    .filter(Boolean);
  if (ts.length) return Math.min(...ts) <= now + AIR_SOON && Math.max(...ts) >= now - AIR_GRACE;
  const dm = d => (d ? Math.floor(new Date(d.slice(0, 10) + "T00:00:00+09:00").getTime() / 60000) : null);
  const f = dm(i.from),
    t = dm(i.to);
  if (f == null) return false;
  /* 終了日がない作品は、放送開始から半年（2クール）までを放送中とみなす */
  return f <= now + AIR_SOON && (t != null ? t + 1440 >= now - AIR_GRACE : f >= now - 183 * 1440);
}
function weekPool() {
  return items.filter(i => ofKind(i) && i.s === "視聴中" && onAirNow(i) && (!state.unOnly || nextInfo(i).back.length));
}
/* 日ごとにまとめる：[{k:その日0時のms or "free", day:Date, list:[作品]}]（今日から順。曜日なしは最後に「その他」） */
function weekGroups() {
  const pool = weekPool();
  const now = new Date();
  const by = new Map();
  pool
    .filter(i => i.dow >= 0)
    .forEach(i => {
      const d = nextSlotDay(i, now);
      if (!d) return;
      const k = d.getTime();
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(i);
    });
  const g = [...by.keys()]
    .sort((a, b) => a - b)
    .map(k => ({ k: String(k), day: new Date(k), list: by.get(k).sort((a, b) => mins(a.time) - mins(b.time)) }));
  const free = pool.filter(i => i.dow < 0);
  if (free.length) g.push({ k: "free", day: null, list: free.sort((a, b) => a.t.localeCompare(b.t, "ja")) });
  return g;
}
/* 未視聴だけの表示中でも、曜日タブ・NEXT・ON AIR は全作品で決める */
function weekGroupsAll() {
  const keep = state.unOnly;
  state.unOnly = false;
  const g = weekGroups();
  state.unOnly = keep;
  return g;
}
const t0Today = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
};
const dayName = g => {
  if (!g.day) return "その他";
  const diff = Math.round((g.day.getTime() - t0Today()) / 86400e3);
  return diff === 0 ? "今日" : diff === 1 ? "明日" : diff === -1 ? "昨日" : DOW[(g.day.getDay() + 6) % 7] + "曜日";
};
/* スマホ：上の帯の曜日タブ（未視聴がある日は点） */
function weekDayTabs() {
  if (!loaded) return [];
  const g = weekGroupsAll();
  if (!g.length) return [];
  const cur = g.some(x => x.k === state.wday) ? state.wday : g[0].k;
  return g.map(x => {
    const lab = x.day ? DOW[(x.day.getDay() + 6) % 7] : "他";
    const sub = x.day ? (x.day.getTime() === t0Today() ? "今日" : `${x.day.getDate()}`) : "";
    const dot = x.list.some(i => nextInfo(i).back.length);
    return [x.k, lab, null, !state.unOnly && x.k === cur, `<b>${lab}</b>${sub ? `<small>${sub}</small>` : ""}${dot ? '<i class="wdot" aria-label="未視聴あり"></i>' : ""}`];
  });
}
/* 番組表の上：今の時刻と、未視聴のまとめ（押すと曜日に関係なく未視聴の作品だけを出す） */
function weekTopHtml() {
  const d = new Date();
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  const date = `${d.getMonth() + 1}月${d.getDate()}日（${"日月火水木金土"[d.getDay()]}）`;
  const unI = items.filter(i => ofKind(i) && i.s === "視聴中" && onAirNow(i) && nextInfo(i).back.length);
  const unE = unI.reduce((n, i) => n + nextInfo(i).back.length, 0);
  return `<div class="wt-clock"><time datetime="${d.toISOString()}">${hm}</time><span>${date}</span></div>
    <button type="button" class="wt-un${state.unOnly ? " on" : ""}" data-unsw aria-pressed="${state.unOnly}"${unI.length || state.unOnly ? "" : " disabled"}><span class="wt-l">未視聴</span><b>${unI.length}<small>作品</small> ${unE}<small>話</small></b><span class="wt-go">${state.unOnly ? "✕ 曜日に戻る" : unI.length ? "まとめて見る ›" : "なし"}</span></button>`;
}
/* カード1枚：時間・放送局・ジャンル・配信、タイトル、その日の話、進み具合、（PC）OP/ED・クール・期間、視聴ボタン */
function weekCard(i, dayKey, isNext, onAir, preferBack) {
  const eps = episodes(i);
  const { back } = nextInfo(i);
  const w = eps.filter(e => e.w).length;
  const e =
    (dayKey &&
      eps.find(x => {
        const j = jst(x.t);
        return j && j.day === dayKey;
      })) ||
    (preferBack ? back[0] || nextInfo(i).up : nextInfo(i).up || back[0]);
  const n = e ? epNum(e.n) : null;
  const m = mediaOf(i);
  const st = i.dow < 0 ? "" : stationTxt(i);
  const vods = [...new Set([...(m.media === "stream" ? m.plat : []), ...m.vods])];
  const fin = dayKey && isFinOn(i, dayKey);
  const per = periodOf(i);
  const cs = coursOf(i);
  const foot = cs.map(c => courLab(c)).join("") + (per ? `<span class="wc-per">${esc(per)}</span>` : "");
  /* カードの下いっぱいの帯：未視聴があれば「○話を見た」で視聴済みに、なければ状態だけ */
  const tick = back[0]
    ? `<button type="button" class="wc-tick" data-tick="${i.id}" aria-label="${esc(i.t)} ${esc(back[0].n)}を視聴済にする"><span class="ck" aria-hidden="true">✓</span>${esc(back[0].n)}を見た</button>`
    : `<span class="wc-ok">${eps.length && w === eps.length ? "全話視聴済み" : eps.length ? "放送済みの話はすべて視聴済み" : "話数未登録"}</span>`;
  return `<div class="wcard${onAir ? " live" : isNext ? " nx" : ""}${back.length ? " un" : ""}">${onAir ? `<span class="wc-badge live">● ON AIR</span>` : isNext ? `<span class="wc-badge nx">NEXT</span>` : ""}
    <button type="button" class="wc-main" data-id="${i.id}">
      <span class="wc-top"><span class="wc-time">${i.dow < 0 ? (m.media === "sp" && i.time ? esc(i.time) : ONE_LAB[m.media] || "配信") : esc(i.time || "--:--")}</span>${st ? `<span class="wc-st">${esc(st)}</span>` : ""}${kindTag(i)}${fin ? FIN : ""}<span class="wc-vods">${vods.map(vlab).join("")}</span></span>
      ${i.series ? `<span class="wc-ser"><span class="lab s">${esc(i.series)}</span></span>` : ""}
      <span class="wc-ttl">${esc(i.t)}</span>
      <span class="wc-ep">${e ? `<em>${!aired(e) ? "放送" : e.w ? "放送済" : "未視聴"}</em><b>${esc(e.n)}</b>${e.sub ? `「${esc(e.sub)}」` : ""}` : eps.length ? "放送予定の話はありません" : "話数未登録"}</span>
      ${eps.length ? `<span class="wc-prog"><span class="wc-bar"><i style="width:${Math.round((w / eps.length) * 100)}%"></i></span><span class="wc-cnt">${w}/${eps.length}話 視聴</span>${back.length ? `<span class="wc-un">未視聴 ${back.length}話</span>` : ""}</span>` : ""}
      ${foot || missingOf(i).length ? `<span class="wc-foot pconly">${foot}${missBadge(i)}</span>` : ""}
    </button>
    <div class="wc-act">${tick}</div>
  </div>`;
}
function renderWeek() {
  const g = weekGroups();
  const gAll = weekGroupsAll();
  const nowMs = Date.now();
  const startOf = (x, i) => x.day.getTime() + mins(i.time) * 60000;
  const hasT = i => mins(i.time) < 9999;
  /* 放送中（開始から30分）は ON AIR、その次に始まる枠を NEXT（どちらも今日以降の枠でいちばん近いもの） */
  let liveIds = new Set(),
    nxId = null;
  for (const x of gAll) {
    if (!x.day) continue;
    for (const i of x.list) {
      if (!hasT(i)) continue;
      const st = startOf(x, i);
      if (st <= nowMs && nowMs < st + 30 * 60000) liveIds.add(i.id + "@" + x.k);
      else if (st > nowMs && !nxId) nxId = i.id + "@" + x.k;
    }
    if (nxId) break;
  }
  weekSig = g.map(x => x.k + ":" + x.list.map(i => i.id).join(",")).join("|") + "#" + [...liveIds].join(",") + "#" + nxId;
  let h = `<div class="wtop" id="clock">${weekTopHtml()}</div>`;
  const card = (x, i, preferBack) => {
    const key = i.id + "@" + x.k;
    return weekCard(i, x.day && !preferBack ? dkey(x.day) : null, key === nxId, liveIds.has(key), preferBack);
  };
  if (!g.length) {
    h += state.unOnly
      ? `<p class="empty">未視聴の作品はありません。</p>`
      : `<p class="empty">放送中の視聴中の作品はありません。アニメ・ドラマのライブラリで作品を開き「視聴中」にすると、放送期間中はここに曜日ごとに並びます。</p>`;
    return h;
  }
  /* 未視聴だけ：曜日に関係なく1つにまとめる（未視聴の多い順） */
  if (state.unOnly) {
    const seen = new Set();
    const l = [];
    g.forEach(x => x.list.forEach(i => !seen.has(i.id) && (seen.add(i.id), l.push([x, i]))));
    l.sort((a, b) => nextInfo(b[1]).back.length - nextInfo(a[1]).back.length);
    h += `<section class="wday"><div class="wdayhd"><h2>未視聴のある作品</h2><small>${l.length}本</small></div><div class="wgrid">${l.map(([x, i]) => card(x, i, true)).join("")}</div></section>`;
    return h;
  }
  /* PC・スマホとも1日ずつ。PCは曜日タブを画面の上に、スマホは上の帯に出す */
  if (IS_PC())
    h += `<div class="wtabs" role="tablist" aria-label="曜日">${weekDayTabs()
      .map(([v, , , on, html]) => `<button type="button" role="tab" data-tb="${esc(v)}" aria-selected="${on}">${html}</button>`)
      .join("")}</div>`;
  const cur = g.find(x => x.k === state.wday) || g[0];
  h += `<section class="wday"><div class="wdayhd"><h2>${dayName(cur)}</h2>${cur.day ? `<span>${cur.day.getMonth() + 1}/${cur.day.getDate()}（${DOW[(cur.day.getDay() + 6) % 7]}）</span>` : `<span>曜日が決まっていない作品</span>`}<small>${cur.list.length}本</small></div><div class="wgrid">${cur.list.map(i => card(cur, i)).join("")}</div></section>`;
  return h;
}
/* 一覧の上の視聴ステータス切り替え（件数はステータス以外の絞り込みをかけた数） */
function stSegHtml() {
  const keep = state.sf;
  state.sf = [];
  const base = filtered();
  state.sf = keep;
  const one = keep.length === 1 ? keep[0] : keep.length ? "*" : "";
  const b = (v, lab, n) => `<button type="button" role="radio" data-stf="${esc(v)}" aria-checked="${one === v}">${lab}<small>${n}</small></button>`;
  return `<div class="stseg" role="radiogroup" aria-label="視聴ステータス">${b("", "すべて", base.length)}${STATUSES.map(v => b(v, stLabel(v), base.filter(i => i.s === v).length)).join("")}</div>`;
}
function filtered() {
  let list = items.filter(i => ofKind(i) && vodOk(i) && typeOk(i) && courOk(i) && seriesOk(i) && sfOk(i) && eraOk(i) && missOk(i));
  if (state.q) {
    const qq = state.q.toLowerCase();
    list = list.filter(i =>
      (
        i.t +
        " " +
        songText(i) +
        " " +
        (i.stations || []).join(" ") +
        " " +
        (i.plat || []).join(" ") +
        " " +
        (i.vods || []).join(" ") +
        " " +
        (i.series || "")
      )
        .toLowerCase()
        .includes(qq),
    );
  }
  const S = {
    time: (a, b) => (a.dow < 0 ? 9 : a.dow) - (b.dow < 0 ? 9 : b.dow) || mins(a.time) - mins(b.time),
    new: (a, b) => String(b.from || "").localeCompare(String(a.from || "")),
    old: (a, b) => String(a.from || "9").localeCompare(String(b.from || "9")),
    title: (a, b) => a.t.localeCompare(b.t, "ja"),
  };
  return list.sort(S[state.sort] || S.new);
}
/* ライブラリはクールごとに見出しを付けて並べる。2クール作品は両方のクールに出す。
   クール未設定の作品（過去作・映画など）は放送年ごと、日付もなければ「時期不明」 */
const SI = { 冬: 0, 春: 1, 夏: 2, 秋: 3 };
function groupKeysOf(i) {
  const g = state.grp;
  const f = String(i.from || "");
  if (g === "none") return ["*"];
  if (g === "year") return [yearOf(i) ? `Y${yearOf(i)}` : "?"];
  if (g === "month") return [/^\d{4}-\d{2}/.test(f) ? `M${f.slice(0, 7)}` : "?"];
  if (g === "series") return [i.series ? `S${i.series}` : "S"];
  let cs = coursOf(i);
  if (state.cour.length) cs = cs.filter(c => state.cour.includes(c));
  if (cs.length) return cs;
  const y = yearOf(i);
  return [y ? `Y${y}` : "?"];
}
const groupRank = k =>
  k === ALLYEAR
    ? 1e9
    : k === "?"
      ? -1e9
      : k[0] === "Y"
        ? +k.slice(1) * 4 - 0.5
        : k[0] === "M"
          ? +k.slice(1, 5) * 12 + +k.slice(6, 8)
          : +k.slice(0, 4) * 4 + SI[k.slice(4)];
const groupTitle = k =>
  k === "*"
    ? "すべて"
    : k[0] === "S"
      ? k.length > 1
        ? esc(k.slice(1))
        : "シリーズなし"
      : k[0] === "M"
        ? `${k.slice(1, 5)}年 ${+k.slice(6, 8)}月`
        : state.grp === "year" && k[0] === "Y"
          ? `${k.slice(1)}年`
          : k === ALLYEAR
    ? "通年"
    : k === "?"
      ? "時期不明"
      : k[0] === "Y"
        ? `${k.slice(1)}年<small>クール未設定・映画・OVA・TV SP</small>`
        : `${k.slice(0, 4)}年 <span class="sea ${SEASON_CLS[k.slice(4)] || ""}">${k.slice(4)}</span><small>${["1〜3月", "4〜6月", "7〜9月", "10〜12月"][SI[k.slice(4)]]}</small>`;
/* 見出しを押すと折りたたむ。開閉は端末に覚えておく */
const collapsed = new Set(ls.get("adb.v3.col") || []);
const saveCol = () => ls.set("adb.v3.col", [...collapsed]);
const gHead = (key, title, count) => {
  const c = collapsed.has(key);
  return `<h2 class="ghd"><button type="button" class="gtog" data-gtog="${esc(key)}" aria-expanded="${!c}"><span class="chev" aria-hidden="true">${c ? "▸" : "▾"}</span>${title}</button><span>${count}</span></h2>`;
};
const bulkBtns = keys =>
  keys.length > 1
    ? `<span class="gbulk"><button type="button" data-gall="open" data-keys="${esc(JSON.stringify(keys))}">すべて開く</button><button type="button" data-gall="close" data-keys="${esc(JSON.stringify(keys))}">すべて閉じる</button></span>`
    : "";
function groupedHtml(list) {
  const g = new Map();
  list.forEach(i =>
    groupKeysOf(i).forEach(k => {
      if (!g.has(k)) g.set(k, []);
      g.get(k).push(i);
    }),
  );
  const asc = state.sort === "old";
  const keys = [...g.keys()].sort((a, b) => {
    if (state.grp === "series") return a === "S" ? 1 : b === "S" ? -1 : a.localeCompare(b, "ja");
    const x = groupRank(a),
      y = groupRank(b);
    if (a === "?" || b === "?") return a === "?" ? 1 : -1;
    if (a === ALLYEAR || b === ALLYEAR) return a === ALLYEAR ? -1 : 1;
    return asc ? x - y : y - x;
  });
  let budget = state.limit,
    out = "",
    rest = 0;
  const ck = keys.map(k => "tv:" + k);
  if (state.grp === "none") return list.slice(0, state.limit).map(i => slotRow(i)).reduce((a, r) => a + r, `<div class="slots">`) + `</div>` + (list.length > state.limit ? `<button type="button" class="more" id="more">さらに表示（残り${list.length - state.limit}件）</button>` : "");
  for (const k of keys) {
    const l = g.get(k);
    const key = "tv:" + k;
    if (collapsed.has(key)) {
      out += `<section class="cgroup">${gHead(key, groupTitle(k), l.length + "作品")}</section>`;
      continue;
    }
    if (budget <= 0) {
      rest += l.length;
      continue;
    }
    const shown = l.slice(0, budget);
    budget -= shown.length;
    rest += l.length - shown.length;
    out += `<section class="cgroup">${gHead(key, groupTitle(k), l.length + "作品")}<div class="slots">${shown.map(i => slotRow(i)).join("")}</div></section>`;
  }
  return (
    bulkBtns(ck) +
    out +
    (rest ? `<button type="button" class="more" id="more">さらに表示（残り${rest}件）</button>` : "")
  );
}
function renderList() {
  const list = filtered();
  const sortHtml = `<div class="fgroup"><h5>並び順</h5><div class="chips sortlist" role="radiogroup" aria-label="並び順">${SORTS.map(([v, l]) => `<button type="button" role="radio" data-sort="${v}" aria-checked="${state.sort === v}" aria-pressed="${state.sort === v}">${state.sort === v ? "✓ " : ""}${l}</button>`).join("")}</div></div>
    <div class="fgroup"><h5>分け方</h5><div class="chips sortlist" role="radiogroup" aria-label="見出しの分け方">${GROUPS.map(([v, l]) => `<button type="button" role="radio" data-grp="${v}" aria-checked="${state.grp === v}" aria-pressed="${state.grp === v}">${state.grp === v ? "✓ " : ""}${l}</button>`).join("")}</div></div>`;
  const anyF = ["series", "type", "era", "cour", "sf"].some(k => state[k].length) || state.vod;
  /* 開いている絞り込みの中身だけ作る */
  const panel = { vod: vodPanelHtml, time: timePanelHtml, series: seriesPanelHtml, sv: svPanelHtml, sort: () => sortHtml }[state.fOpen];
  /* 未入力あり（PCだけ）：オンのときは項目ごとの件数ボタンで、さらに1項目に絞れる */
  const mBase = (() => {
    const keep = state.missOnly;
    state.missOnly = false;
    const l = filtered();
    state.missOnly = keep;
    return l;
  })().map(missingOf);
  const mN = mBase.filter(l => l.length).length;
  const msw = `<button type="button" class="unsw misw${state.missOnly ? " on" : ""}" data-missw role="switch" aria-checked="${state.missOnly}">未入力あり<small>${mN}件</small><span class="tr" aria-hidden="true"><i></i></span></button>`;
  let mkeys = "";
  if (state.missOnly) {
    const cnt = {};
    mBase.forEach(l => l.forEach(x => (cnt[x.k] = (cnt[x.k] || 0) + 1)));
    const ks = MISS_KEYS.filter(k => cnt[k] || state.missKey === k);
    if (ks.length)
      mkeys = `<div class="mkeys misw" role="group" aria-label="未入力の項目で絞り込み"><button type="button" data-mkey="" aria-pressed="${!state.missKey}">すべて</button>${ks.map(k => `<button type="button" data-mkey="${esc(k)}" aria-pressed="${state.missKey === k}">${esc(k)}<small>${cnt[k] || 0}</small></button>`).join("")}</div>`;
  }
  return `<div class="ftools"><input id="q" type="search" placeholder="タイトル・主題歌・放送局で検索" value="${esc(state.q)}" aria-label="検索"></div>
    ${stSegHtml()}
    ${state.xser && state.series.length ? `<div class="xser"><span><b>シリーズ「${esc(state.series.join("・"))}」</b>をアニメ・ドラマ・映画・配信まとめて表示しています</span><button type="button" class="u-btn sm" data-xseroff="1">${esc(MODE_NAME[state.mode])}だけにする</button></div>` : ""}
    <div class="fwrap">${fRowHtml(FKEYS)}${fPopHtml(panel ? panel() : "")}</div>
    <p class="count">${list.length}件${anyF ? `<button type="button" class="clear" data-unset="all">条件をすべて解除</button>` : ""}${msw}</p>${mkeys}
    ${list.length ? groupedHtml(list) : `<p class="empty">条件に合う作品はありません。</p>`}`;
}
let loaded = false;
/* 検索欄は作り直さない（作り直すと入力中の文字・日本語変換・カーソルが壊れるため） */
function setMain(html) {
  const main = $("#main");
  const m = /^\s*<div class="ftools">[\s\S]*?<\/div>/.exec(html);
  const box = main.querySelector(":scope > .ftools");
  const res = main.querySelector(":scope > #results");
  if (m && box && res) {
    const nid = (/id="([^"]+)"/.exec(m[0]) || [])[1];
    const cur = box.querySelector("input");
    if (cur && cur.id === nid) {
      res.innerHTML = html.slice(m.index + m[0].length);
      return;
    }
  }
  main.innerHTML = m ? m[0] + `<div id="results">${html.slice(m.index + m[0].length)}</div>` : html;
}
/* 画面上の名前の横に、左メニューで選んでいる下の項目（映画・アニメ映画など）をラベルで出す。「すべて」のときは出さない */
function hSubLab() {
  const m = state.mode;
  if (m === "a" || m === "d") return state.type.length === 1 ? (MEDIA.find(([md]) => md === state.type[0]) || [])[1] || "" : "";
  if (m === "m") return { a: "アニメ映画", d: "実写映画" }[state.sub] || "";
  if (m === "s") return { a: "アニメ", x: "ドラマ・バラエティ" }[state.sub] || "";
  return "";
}
function render() {
  const yt = state.mode === "yt";
  /* YouTubeは「すべて」をなくし、投稿者ごとのタブだけ。今の投稿者がいなければ先頭にする */
  const al = ytAuthors();
  if (al.length && !al.includes(yst.author)) yst.author = al[0];
  const hc = $("#hcur");
  if (hc)
    hc.innerHTML =
      `<span class="mic ${state.mode}" aria-hidden="true">${MODE_IC[state.mode]}</span><span class="hname">${MODE_NAME[state.mode]}</span>${hSubLab() ? `<span class="hsub ${state.mode}">${esc(hSubLab())}</span>` : ""}`;
  renderTabbar();
  renderVbar();
  renderSidebar();
  if (!loaded) return;
  const y = lockY ?? scrollY;
  let body = yt ? renderYt() : state.mode === "w" ? renderWeek() : state.mode === "h" ? renderHist() : renderList();
  /* 「すべて開く／閉じる」は件数と同じ行の右端に置く */
  const gb = /<span class="gbulk">[\s\S]*?<\/span>/.exec(body);
  const ci = body.indexOf('<p class="count">');
  if (gb && ci >= 0 && gb.index > ci) {
    body = body.slice(0, gb.index) + body.slice(gb.index + gb[0].length);
    const ce = body.indexOf("</p>", ci);
    body = body.slice(0, ce) + gb[0] + body.slice(ce);
  }
  setMain(body + `<p class="note savenote" id="saveNote">${saveNoteHtml()}</p>`);
  if (lockY === null) scrollTo(0, y);
  saveUI();
  const hd = document.querySelector("header");
  if (hd && hd.offsetHeight) document.documentElement.style.setProperty("--hdh", hd.offsetHeight + "px");
}
/* 画面の切り替え：左メニュー（番組表・アニメ…）を選ぶ。絞り込みとシリーズは外す */
function setMode(m) {
  if (state.mode === m) return;
  state.mode = m;
  state.sub = "all";
  state.wday = "";
  state.xser = false;
  if (m === "w" || m === "yt" || m === "h") return;
  if (m === "m" || m === "s") state.type = [];
  state.limit = 200;
  state.series = [];
}
/* 画面を変えて先頭から表示 */
const go = () => {
  render();
  scrollTo(0, 0);
};
/* シリーズの作品一覧を開く（アニメ・ドラマ・映画・配信をまたいで出す）。g＝番組表・YouTubeから開いたときに使うメニュー */
function showSeries(name, g) {
  close();
  if (state.mode === "w" || state.mode === "yt" || state.mode === "h") setMode(g === "d" ? "d" : "a");
  Object.assign(state, { series: [name], xser: true, sf: [], era: [], cour: [], type: [], sort: "old", limit: 200 });
  go();
}
