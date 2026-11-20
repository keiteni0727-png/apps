/* ===================== 画面：左メニュー・番組表・ライブラリ一覧 ===================== */

/* ---------- 表示の部品：アイコン・左メニュー・上の切り替え・ラベル ---------- */
/* YouTubeの投稿者の絵文字（左メニュー・上の帯の切り替え） */
const EMO = { キヨ: "🐱", 牛沢: "🐮", レトルト: "🦀" };
/* メニューのアイコン（線のアイコンで統一。色はそれぞれのメニューの色） */
const MODE_IC = {
  w: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h3M13.5 13.5h3M7.5 17h3"/></svg>',
  a: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 3l4 4 4-4"/></svg>',
  d: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8z"/><path d="M4 11l-.6-3.4a1 1 0 0 1 .8-1.2l13.6-2.4a1 1 0 0 1 1.2.8L19.6 7z"/><path d="M8.5 5.8l2.4 3.6M13.5 4.9l2.4 3.6"/></svg>',
  m: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 12h4M3 16h4M17 8h4M17 12h4M17 16h4"/></svg>',
  s: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18.5a10 10 0 0 1 0-13M19 5.5a10 10 0 0 1 0 13M8.2 15.3a5.5 5.5 0 0 1 0-6.6M15.8 8.7a5.5 5.5 0 0 1 0 6.6"/><path d="M10.6 9.8v4.4l3.6-2.2z" fill="currentColor"/></svg>',
  yt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/></svg>',
  sr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 7.5 12 12l9-4.5z"/><path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5"/></svg>',
  mu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  o: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>',
};
/* スマホの下メニュー：番組表・アニメ・ドラマ・その他（映画・バラエティ・YouTube・シリーズ・主題歌は「その他」の中） */
const OTHER_MODES = ["m", "s", "yt", "sr", "mu"];
function renderBnav() {
  const nav = $("#bnav");
  if (!nav) return;
  const cur = OTHER_MODES.includes(state.mode) ? "o" : state.mode;
  nav.innerHTML = ["w", "a", "d", "o"]
    .map(m => `<button type="button" data-bnav="${m}"${cur === m ? ' aria-current="page"' : ""}>${MODE_IC[m].replace("<svg ", '<svg aria-hidden="true" ')}${MODE_NAME[m]}</button>`)
    .join("");
}
/* 「その他」の画面：タイルで並べる */
function renderOther() {
  const n = m => (m === "yt" ? ytItems.length : m === "sr" ? new Set(items.map(i => i.series).filter(Boolean)).size : m === "mu" ? songRows().length : items.filter(i => inMode(m, i)).length);
  const sub = { m: "作品", s: "作品", yt: "本", sr: "シリーズ", mu: "曲" };
  return `<div class="otiles">${OTHER_MODES.map(m => {
    const c = n(m);
    return `<button type="button" class="otile ${m}" data-bnav="${m}"><span class="mic ${m}" aria-hidden="true">${MODE_IC[m]}</span><b>${MODE_NAME[m]}</b><small>${c}${sub[m]}</small></button>`;
  }).join("")}</div>`;
}
/* PC：左の折りたためるメニュー */
let sbCollapsed = !!ls.get("adb.v3.sbc");
/* メニューごとの対象（左メニューの件数用。ofKind と同じ考え方） */
const inMode = (m, i) =>
  m === "a" ? i.k === "a" : m === "d" ? i.k === "d" : m === "m" ? mediaOf(i).media === "movie" : m === "s" ? i.k === "r" : false;
function renderSidebar() {
  const sb = $("#sb");
  if (!sb) return;
  document.body.classList.toggle("sbc", sbCollapsed);
  /* 左メニューはメニュー名だけ（種別・配信サイト・投稿者などは一覧の「絞り込み」で選ぶ） */
  const mode = (m, ic, l) =>
    `<div class="sbp${state.mode === m ? " cur" : ""}"><div class="sb-row"><button type="button" class="sb-it${state.mode === m ? " on" : ""}"${state.mode === m ? ' aria-current="page"' : ""} data-mode="${m}" title="${l}"><i aria-hidden="true">${ic}</i><span class="lbl">${l}</span></button></div></div>`;
  /* PC：左上に☰（左メニューの折りたたみ）。上の帯と高さ・線をそろえる。ロゴはアプリアイコンと同じマーク（スマホは下メニューなので出さない） */
  sb.innerHTML = `<div class="sb-top"><button type="button" class="sb-ham" data-sbtog="1" aria-label="${sbCollapsed ? "メニューを開く" : "メニューを折りたたむ"}" aria-expanded="${!sbCollapsed}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><svg class="sb-logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--u-accent)"/><rect x="7" y="9" width="18" height="12.5" rx="2.5" fill="#fff"/><path d="M14.2 12.3v6l5-3z" fill="var(--u-accent)"/><rect x="11.5" y="23.5" width="9" height="1.8" rx=".9" fill="#fff"/></svg><b class="lbl">エンタメ管理</b></div>
    <button type="button" class="sb-add" id="sbAdd" aria-label="追加">＋<span class="lbl"> 追加</span></button>
    <div class="sb-sec lbl">メニュー</div>
    ${MODE_KEYS.map(m => mode(m, `<span class="mic ${m}">${MODE_IC[m]}</span>`, MODE_NAME[m])).join("")}
    <div class="sb-foot"><button type="button" class="sb-it" data-gear="1" title="設定"><i aria-hidden="true">⚙️</i><span class="lbl">設定</span></button><div class="sb-st" id="sbSave">${saveNoteHtml()}</div></div>`;
}
/* 映画タブ：アニメ・ドラマの「種別＝映画」をまとめて出す（データは1件のまま、アニメ／ドラマ側にも出る） */
/* バラエティタブ：ジャンル「バラエティ」（k="r"、恋愛リアリティなど）だけ。配信オリジナルのアニメ・ドラマはそれぞれの側で放送形態「配信」として出る */
/* 作品詳細のシリーズ名から開いたときは、アニメ・ドラマ・映画・バラエティをまたいでそのシリーズを全部出す（xser） */
const ofKind = i =>
  (state.xser && state.series.length && state.mode !== "w" && state.mode !== "yt") ||
  ((state.mode !== "w" || i.k === "a" || i.k === "d") &&
  ((k => k === "all" || i.k === k || (state.mode === "m" && k === "d" && i.k === "f") || (k === "x" && i.k !== "a"))(curKind())) &&
  (state.mode !== "m" || mediaOf(i).media === "movie") &&
  (state.mode !== "s" || i.k === "r"));
/* 絞り込みの「配信」（Netflix など）。配信オリジナルの配信元と、見られるサイトの両方を見る */
const vodsOf = i => [...new Set([...(i.plat || []), ...(i.vods || [])])];
const vodOk = i => !state.vod || vodsOf(i).includes(state.vod);
/* ジャンル：a=アニメ d=ドラマ f=映画（ドラマと関係ない実写映画） r=バラエティ（恋愛リアリティなど、アニメでもドラマでもない配信番組） */
const KIND_LAB = { a: "アニメ", d: "ドラマ", f: "映画", r: "バラエティ" };
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
  /* 全話が同じ日（まとめて配信など）・開始日と終了日が同じなら、日付だけ（「〜」を付けない） */
  if (last && last === first) return fmtD(first);
  return fmtD(first) + " 〜 " + (last ? fmtD(last) : "");
}

setInterval(() => {
  const c = $("#clock");
  if (c) c.innerHTML = weekTopHtml();
  /* 放送が終わった番組を翌週へ移すため、並びが変わるときだけ描き直す */
  if (c && state.mode === "w" && !$("#layer").innerHTML) {
    const old = weekSig;
    renderWeek();
    if (weekSig !== old) render();
  }
}, 30000);

/* ---------- ライブラリの一覧と、画面全体の描画 ---------- */
/* ライブラリ一覧のラベル：見られる配信サイト名、そのあとにシリーズ（PCのみ） */
function libLabels(i) {
  const m = mediaOf(i);
  const cc = contCours(i);
  const pc =
    (i.series ? `<span class="lab s pconly">${esc(i.series)}</span>` : "") +
    (cc >= 2 ? `<span class="lab cc pconly">${cc}クール連続</span>` : "");
  const sites = [...new Set([...(m.media === "stream" ? m.plat : []), ...m.vods])];
  /* 並び：配信サイト → シリーズ・クール連続 */
  return sites.map(v => `${vlab(v)}`).join("") + pc;
}
/* ライブラリ一覧でタイトルの前に出す種別（TV・映画・OVA・配信）。シリーズや配信サイトのラベルとは別の形・色 */
const mediaTag = i => {
  const l = mediaLabOf(i);
  return l ? `<span class="mtag m-${l[1]}">${l[0]}</span>` : "";
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
/* ライブラリの1行 */
function slotRow(i) {
  return `<div class="row${i.s === "視聴済み" ? " done" : ""} lst ls-${esc(i.s || "none")}"><button class="slot" type="button" data-id="${i.id}">
    <span class="time">${i.from ? `${+i.from.slice(5, 7)}/${+i.from.slice(8, 10)}` : "—"}${mediaTag(i)}${curKind() === "all" || (state.xser && state.series.length) ? kindTag(i) : ""}</span>
    <span class="ttl"><strong>${esc(i.t)}</strong><span class="meta"><span class="pmob">${stPill(i)}</span>${libLabels(i)}${missBadge(i)}</span></span>
    <span class="pwide">${stPill(i)}</span></button></div>`;
}
/* 放送の長さ（分）：アニメ30分・ドラマ60分。ON AIR の表示と、番組表で翌週へ移すときに使う */
const airLen = i => (i.k === "d" ? 60 : 30);
/* 番組表：放送が終わった番組は、翌週の同じ曜日へ移す（深夜25時台などは前日の枠のまま） */
function nextSlotDay(i, now) {
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const m = mins(i.time);
  const hasT = m < 9999;
  for (let k = -1; k <= 7; k++) {
    const day = new Date(t0);
    day.setDate(t0.getDate() + k);
    if ((day.getDay() + 6) % 7 !== i.dow) continue;
    const start = new Date(day.getTime() + (hasT ? m : 0) * 60000);
    const cut = hasT ? start.getTime() + airLen(i) * 60000 : day.getTime() + 24 * 3600000;
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
   ・放送期間（開始日〜終了日）で判断：開始日の1週間前〜終了日の14日後（見逃した分を追いかける猶予）。話数の日付は使わない
   ・終了日がない作品は開始日から半年まで。ただし話数リストの最後の放送日が半年より後なら、そこまで延ばす（2クール以上の作品）。開始日がない作品は出さない
   ・TV SP は放送日（開始日）の1日だけの放送として同じように判断
   ・通年の作品は、視聴中ならいつでも出す */
const AIR_GRACE = 14 * 1440,
  AIR_SOON = 7 * 1440;
function onAirNow(i) {
  if (coursOf(i).includes(ALLYEAR)) return true;
  const now = NOWMIN();
  const dm = d => (d ? Math.floor(new Date(d.slice(0, 10) + "T00:00:00+09:00").getTime() / 60000) : null);
  const f = dm(i.from);
  let t = isSp(i) ? f : dm(i.to);
  if (f == null) return false;
  /* 終了日がない作品は、放送開始から半年（2クール）か、話数リストの最後の放送日の遅いほうまでを放送中とみなす */
  if (t == null) {
    const last = Math.max(-Infinity, ...episodes(i).filter(e => e.t).map(e => dm(jst(e.t).day)));
    t = Math.max(f + 183 * 1440 - AIR_GRACE - 1440, last);
  }
  return f <= now + AIR_SOON && t + 1440 >= now - AIR_GRACE;
}
/* TV SP：番組表では放送日（開始日）に1回だけ出す。spT＝放送の時刻（分）、spDay＝放送日（端末の日付の0時） */
const isSp = i => mediaOf(i).media === "sp";
const spT = i => (i.from ? dayTimeToT(i.from.slice(0, 10), hasTime(i) ? i.time : "0:00") : 0);
const spDay = i => {
  const [y, m, d] = String(i.from || "").slice(0, 10).split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};
/* TV SP で話数を登録していない作品は、ステータスで見たかどうかを決める（放送後で視聴中なら「見た」ボタン） */
const spUnseen = i => isSp(i) && !episodes(i).length && i.s === "視聴中" && spT(i) && spT(i) <= NOWMIN();
function weekPool() {
  return items.filter(i => ofKind(i) && i.s === "視聴中" && onAirNow(i) && (!state.unOnly || nextInfo(i).back.length));
}
/* 日ごとにまとめる：[{k:その日0時のms or "free", day:Date, list:[作品]}]（今日から順。曜日なしは最後に「その他」） */
function weekGroups() {
  const pool = weekPool();
  const now = new Date();
  const by = new Map();
  const free = pool.filter(i => i.dow < 0 && !isSp(i));
  /* TV SP：これからの放送（今日を含む）はその日に、放送が過ぎたものは「その他」に */
  pool.filter(isSp).forEach(i => {
    const d = spDay(i);
    if (!d || d.getTime() < t0Today()) return free.push(i);
    const k = d.getTime();
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(i);
  });
  pool
    .filter(i => i.dow >= 0 && !isSp(i))
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
    const dot = x.list.some(i => nextInfo(i).back.length || spUnseen(i));
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
/* カード1枚：時間（左の列）、ラベル（状態・ジャンル・配信サイト・放送局）、タイトル、その日の話、進み具合、視聴ボタン
   v＝"row"：スマホのタイムライン・PCの曜日の列の1件 ／ "hero"：放送中・次の放送を大きく（上に1枚） */
function weekEp(i, dayKey, preferBack) {
  const eps = episodes(i);
  const { back, up } = nextInfo(i);
  return (
    (dayKey &&
      eps.find(x => {
        const j = jst(x.t);
        return j && j.day === dayKey;
      })) ||
    (preferBack ? back[0] || up : up || back[0])
  );
}
/* 話の1行：「次回：7話「サブタイトル」」の形（放送中・未視聴・放送済も同じ形） */
function weekEpLine(i, e, onAir) {
  const eps = episodes(i);
  if (!e && isSp(i) && !eps.length) {
    const j = jst(spT(i));
    return `<span class="wc-ep">${j ? `<em class="p-${spT(i) <= NOWMIN() ? "放送済" : "次回"}">${spT(i) <= NOWMIN() ? "放送済" : "放送日"}：</em>${j.md}(${j.dow})` : "放送日未設定"}</span>`;
  }
  if (!e) return `<span class="wc-ep">${eps.length ? "放送予定の話はありません" : "話数未登録"}</span>`;
  const pre = onAir ? "放送中" : !aired(e) ? "次回" : e.w ? "放送済" : "未視聴";
  return `<span class="wc-ep"><em class="p-${pre}">${pre}：</em>${esc(e.n)}${e.sub ? `「${esc(e.sub)}」` : ""}</span>`;
}
function weekCard(i, dayKey, isNext, onAir, preferBack, v = "row") {
  const eps = episodes(i);
  const { back } = nextInfo(i);
  /* 進み具合は見ない話（配信にない総集編など）を除いて数える */
  const w = watchable(eps).filter(e => e.w).length,
    wn = watchable(eps).length;
  const e = weekEp(i, dayKey, preferBack);
  const m = mediaOf(i);
  const st = i.dow < 0 ? "" : stationTxt(i);
  const fin = dayKey && isFinOn(i, dayKey);
  const time = i.dow < 0 ? (m.media === "sp" && i.time ? esc(i.time) : ONE_LAB[m.media] || "配信") : esc(i.time || "--:--");
  const badge = onAir
    ? `<span class="wc-b live"><i aria-hidden="true"></i>ON AIR</span>`
    : isNext
      ? `<span class="wc-b nx">NEXT</span>`
      : back.length
        ? `<span class="wc-b un">未視聴${back.length > 1 ? ` ${back.length}話` : ""}</span>`
        : "";
  const per = periodOf(i);
  const foot = v === "hero" ? coursOf(i).map(c => courLab(c)).join("") + (per ? `<span class="wc-per">${esc(per)}</span>` : "") : "";
  /* 視聴ボタン：未視聴があれば「○話を見た」 */
  const tick = back[0]
    ? `<button type="button" class="u-btn pri wc-tick" data-tick="${i.id}" aria-label="${esc(i.t)} ${esc(epVal(back[0].n) ? epVal(back[0].n) + "話" : back[0].n)}を視聴済にする">${esc(epVal(back[0].n) ? epVal(back[0].n) + "話" : back[0].n)}を見た</button>`
    : spUnseen(i)
      ? `<button type="button" class="u-btn pri wc-tick" data-spdone="${i.id}" aria-label="${esc(i.t)}を視聴済にする">見た</button>`
      : "";
  /* PCの曜日の列：どのカードも同じ高さ（ラベルは1行・タイトルと話は2行まで、下端に視聴ボタンか状態） */
  if (v === "col") {
    const sites = [...new Set([...(m.media === "stream" ? m.plat : []), ...m.vods])];
    const more = sites.length - 1;
    const okMsg = !eps.length ? (isSp(i) ? "放送前" : "話数未登録") : w === wn ? "全話視聴済" : "放送済みは視聴済";
    return `<div class="wcard v-col${onAir ? " live" : isNext ? " nx" : ""}${back.length ? " un" : ""}">
      <button type="button" class="wc-main" data-id="${i.id}">
        <span class="wc-row1"><span class="wc-time">${time}</span>${st ? `<span class="wc-st">${esc(st)}</span>` : ""}${badge}</span>
        <span class="wc-tags">${kindTag(i)}${fin ? FIN : ""}${sites[0] ? vlab(sites[0]) : ""}${more > 0 ? `<span class="wc-more">ほか${more}</span>` : ""}</span>
        <span class="wc-ttl">${esc(i.t)}</span>
        ${weekEpLine(i, e, onAir)}
      </button>
      ${tick || `<span class="wc-okmsg">${okMsg}</span>`}
    </div>`;
  }
  const pips =
    v === "hero" && eps.length && eps.length <= 26
      ? `<span class="wc-pips" aria-hidden="true">${eps.map(x => `<i class="${x.w ? "w" : x === e ? "c" : ""}"></i>`).join("")}</span>`
      : "";
  return `<div class="wcard v-${v}${onAir ? " live" : isNext ? " nx" : ""}${back.length ? " un" : ""}">
    <div class="wc-rail"><span class="wc-time">${time}</span></div>
    <div class="wc-body">
      <button type="button" class="wc-main" data-id="${i.id}">
        <span class="wc-tags">${badge}<span class="wc-htime">${time}${i.dow < 0 ? "" : "〜"}</span>${kindTag(i)}${fin ? FIN : ""}${libLabels(i)}${st ? `<span class="wc-st">${esc(st)}</span>` : ""}</span>
        <span class="wc-ttl">${esc(i.t)}</span>
        ${weekEpLine(i, e, onAir)}
        ${pips}
        ${eps.length ? `<span class="wc-prog"><span class="wc-bar"><i style="width:${Math.round((w / (wn || 1)) * 100)}%"></i></span><span class="wc-cnt">${w}/${wn}話 視聴済</span></span>` : ""}
        ${foot || (v === "hero" && missingOf(i).length) ? `<span class="wc-foot pconly">${foot}${missBadge(i)}</span>` : ""}
      </button>
      ${tick}
    </div>
  </div>`;
}
function renderWeek() {
  const g = weekGroups();
  const gAll = weekGroupsAll();
  const nowMs = Date.now();
  const startOf = (x, i) => x.day.getTime() + mins(i.time) * 60000;
  const hasT = i => mins(i.time) < 9999;
  /* 放送中（開始から放送の長さの間）は ON AIR、その次に始まる枠を NEXT（どちらも今日以降の枠でいちばん近いもの） */
  let liveIds = new Set(),
    nxId = null;
  for (const x of gAll) {
    if (!x.day) continue;
    for (const i of x.list) {
      if (!hasT(i)) continue;
      const st = startOf(x, i);
      if (st <= nowMs && nowMs < st + airLen(i) * 60000) liveIds.add(i.id + "@" + x.k);
      else if (st > nowMs && !nxId) nxId = i.id + "@" + x.k;
    }
    if (nxId) break;
  }
  weekSig = g.map(x => x.k + ":" + x.list.map(i => i.id).join(",")).join("|") + "#" + [...liveIds].join(",") + "#" + nxId;
  const pc = IS_PC();
  const card = (x, i, preferBack, v) => {
    const key = i.id + "@" + x.k;
    return weekCard(i, x.day && !preferBack ? dkey(x.day) : null, key === nxId, liveIds.has(key), preferBack, v);
  };
  /* 上に大きく出す1枚：放送中、なければ（PCだけ）次に始まる番組 */
  const heroKey = [...liveIds][0] || (pc ? nxId : null);
  let hero = "";
  if (heroKey && !state.unOnly) {
    const [hid, hk] = heroKey.split("@");
    const hx = gAll.find(x => x.k === hk);
    const hi = hx && hx.list.find(i => i.id === hid);
    if (hi) hero = card(hx, hi, false, "hero");
  }
  let h = `<div class="wtop${hero && pc ? " has-hero" : ""}" id="clock">${hero && pc ? hero : ""}<div class="wtop-side">${weekTopHtml()}</div></div>`;
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
    h += `<section class="wday"><div class="wdayhd"><h2>未視聴のある作品</h2><small>${l.length}本</small></div><div class="wgrid wun">${l.map(([x, i]) => card(x, i, true, "row")).join("")}</div></section>`;
    return h;
  }
  /* PC：1週間を曜日ごとの列で。曜日が決まっていない作品は下にまとめる */
  if (pc) {
    const first = g.find(x => x.day);
    const t0 = new Date(t0Today());
    const start = first && first.day.getTime() < t0.getTime() ? first.day : t0;
    const cols = [];
    for (let k = 0; k < 7; k++) {
      const d = new Date(start);
      d.setDate(start.getDate() + k);
      const x = g.find(y => y.day && dkey(y.day) === dkey(d)) || { k: String(d.getTime()), day: d, list: [] };
      const isT = d.getTime() === t0.getTime();
      const sub = isT ? "今日" : d.getTime() === t0.getTime() + 86400e3 ? "明日" : `${d.getDate()}`;
      const dot = x.list.some(i => nextInfo(i).back.length || spUnseen(i));
      cols.push(
        `<section class="wcol${isT ? " today" : ""}" aria-label="${DOW[(d.getDay() + 6) % 7]}曜日"><div class="wcol-hd"><small>${sub}</small><b>${DOW[(d.getDay() + 6) % 7]}</b>${dot ? '<i class="wdot" aria-label="未視聴あり"></i>' : ""}</div>${x.list.map(i => card(x, i, false, "col")).join("") || `<p class="wcol-none">なし</p>`}</section>`,
      );
    }
    h += `<div class="wcols">${cols.join("")}</div>`;
    const free = g.find(x => x.k === "free");
    if (free) h += `<section class="wday"><div class="wdayhd"><h2>曜日が決まっていない作品</h2><small>${free.list.length}本</small></div><div class="wgrid wun">${free.list.map(i => card(free, i, false, "row")).join("")}</div></section>`;
    return h;
  }
  /* スマホ：上の曜日タブで1日ずつ。放送中を上に大きく、その下はタイムライン */
  h += `<div class="wtabs" role="tablist" aria-label="曜日">${weekDayTabs()
    .map(([v, , , on, html]) => `<button type="button" role="tab" data-tb="${esc(v)}" aria-selected="${on}">${html}</button>`)
    .join("")}</div>`;
  const cur = g.find(x => x.k === state.wday) || g[0];
  const heroHere = hero && heroKey.split("@")[1] === cur.k;
  const rest = cur.list.filter(i => !(heroHere && i.id === heroKey.split("@")[0]));
  h += `<section class="wday"><div class="wdayhd"><h2>${dayName(cur)}</h2>${cur.day ? `<span>${cur.day.getMonth() + 1}/${cur.day.getDate()}（${DOW[(cur.day.getDay() + 6) % 7]}）</span>` : `<span>曜日が決まっていない作品</span>`}<small>${cur.list.length}本</small></div>${heroHere ? hero : ""}${rest.length ? `${heroHere ? `<div class="wsub">このあと・見のがし</div>` : ""}<div class="wline">${rest.map(i => card(cur, i, false, "row")).join("")}</div>` : ""}</section>`;
  return h;
}
function filtered() {
  let list = items.filter(i => ofKind(i) && vodOk(i) && typeOk(i) && courOk(i) && seriesOk(i) && sfOk(i) && eraOk(i) && missOk(i));
  if (state.q) {
    /* 全角・半角、ひらがな・カタカナ、大文字・小文字、記号のゆれをそろえて探す。空白で区切ると「どれも含む」 */
    const qs = state.q.split(/[\s　]+/).map(norm).filter(Boolean);
    list = list.filter(i => {
      /* 探すのはタイトルだけ（放送局・主題歌などは絞り込みや専用メニューで探す） */
      const h = norm(i.t || "");
      return qs.every(q => h.includes(q));
    });
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
        ? state.mode === "m" || state.mode === "s"
          ? `${k.slice(1)}年`
          : `${k.slice(1)}年<small>クール未設定</small>`
        : `${k.slice(0, 4)}年 <span class="sea ${SEASON_CLS[k.slice(4)] || ""}">${k.slice(4)}</span><small>${["1〜3月", "4〜6月", "7〜9月", "10〜12月"][SI[k.slice(4)]]}</small>`;
/* 見出しを押すと折りたたむ。開閉は端末に覚えておく */
const collapsed = new Set(ls.get("adb.v3.col") || []);
const saveCol = () => ls.set("adb.v3.col", [...collapsed]);
const gHead = (key, title, count) => {
  const c = collapsed.has(key);
  /* 見出しの行のどこを押しても開け閉めできる（右の件数も含めてボタン） */
  return `<h2 class="ghd"><button type="button" class="gtog" data-gtog="${esc(key)}" aria-expanded="${!c}"><span class="chev">${FOLD_IC}</span>${title}<span class="gcnt">${count}</span></button></h2>`;
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
  if (state.grp === "none") return list.slice(0, state.limit).map(i => slotRow(i)).reduce((a, r) => a + r, `<div class="slots">`) + `</div>` + (list.length > state.limit ? `<button type="button" class="u-btn wide more" id="more">さらに表示（残り${list.length - state.limit}件）</button>` : "");
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
    (rest ? `<button type="button" class="u-btn wide more" id="more">さらに表示（残り${rest}件）</button>` : "")
  );
}
function renderList() {
  const list = filtered();
  const sortHtml = sortSteps([
    { h: "グループ", attr: "data-grp", cur: state.grp, opts: GROUPS },
    { h: "並び替え", attr: "data-sort", cur: state.sort, opts: SORTS },
  ]);
  /* ★保存・並び順は今までどおりボタンの下に出す。絞り込みはシート（fSheetHtml） */
  const panel = { sv: svPanelHtml, sort: () => sortHtml }[state.fOpen];
  const searching = state.qOpen || !!state.q;
  return `${searching ? fSearchHtml() : ""}
    <div class="fwrap">${searching ? "" : fBarHtml()}${fPopHtml(panel ? panel() : "")}</div>
    ${fSumHtml()}
    ${fshCount(list.length, "件", state.q)}
    <div id="fshBox">${fSheetHtml()}</div>
    ${list.length ? groupedHtml(list) : `<p class="empty">${state.q ? `「${esc(state.q)}」に一致する作品はありません。` : "条件に合う作品はありません。"}</p>`}`;
}
let loaded = false;
/* 検索欄は作り直さない（作り直すと入力中の文字・日本語変換・カーソルが壊れるため） */
/* 絞り込みのパネルを「絞り込み」ボタンのすぐ下に置く。高さは固定して、項目を切り替えても下が見切れないように
   （下に十分な空きがないときは上に寄せる） */
function placeFsh() {
  const sh = document.querySelector(".fsh");
  if (!sh) return;
  const b = document.querySelector(".fsh-b");
  if (!b) return;
  const r = b.getBoundingClientRect();
  const hd = document.querySelector("header");
  const minTop = (hd ? hd.getBoundingClientRect().bottom : 0) + 6;
  let top = Math.max(minTop, r.bottom + 6);
  if (IS_PC()) {
    const want = 560;
    if (innerHeight - 16 - top < 360) top = Math.max(minTop, innerHeight - 16 - want);
    sh.style.top = top + "px";
    sh.style.left = Math.max(8, Math.min(r.left, innerWidth - sh.offsetWidth - 8)) + "px";
    sh.style.maxHeight = "none";
    sh.style.height = Math.min(want, innerHeight - 16 - top) + "px";
  } else {
    /* スマホ：幅いっぱい、下メニューの上まで */
    sh.style.removeProperty("left");
    const nav = document.querySelector(".tbwrap");
    const nr = nav && nav.getBoundingClientRect();
    const bottom = nr && nr.height ? nr.top - 20 : innerHeight - 20;
    if (bottom - top < 360) top = Math.max(minTop, bottom - 360);
    sh.style.top = top + "px";
    sh.style.height = "";
    /* 長くなりすぎないように、画面の6割くらいまで */
    sh.style.maxHeight = Math.min(bottom - top, Math.round(innerHeight * 0.6)) + "px";
  }
}
addEventListener("resize", () => placeFsh());
function setMain(html) {
  const main = $("#main");
  /* 絞り込みシートを開いたまま選んだときは、シートの中だけ描き直す（後ろの一覧まで作り直すと画面が揺れるため。一覧は閉じたときに描き直す） */
  const fb = main.querySelector("#fshBox");
  if (fb && fb.firstElementChild && html.includes('<div id="fshBox"><div class="fsh-scrim"')) {
    const t = document.createElement("template");
    t.innerHTML = html;
    const nb = t.content.querySelector("#fshBox");
    if (nb) {
      const sc = fb.querySelector(".fsh-body")?.scrollTop || 0;
      fb.innerHTML = nb.innerHTML;
      const b = fb.querySelector(".fsh-body");
      if (b) b.scrollTop = sc;
      /* 上の「絞り込み 数」のボタン・条件ラベル・件数だけ合わせる */
      const ow = main.querySelector(".fwrap"),
        nw = t.content.querySelector(".fwrap");
      if (ow && nw) {
        main.querySelector(".fsum")?.remove();
        const ns = t.content.querySelector(".fsum");
        ow.outerHTML = nw.outerHTML + (ns ? ns.outerHTML : "");
      }
      const oc = main.querySelector(".count .cnt"),
        nc = t.content.querySelector(".count .cnt");
      if (oc && nc) oc.innerHTML = nc.innerHTML;
      placeFsh();
      return;
    }
  }
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
/* シリーズをまたいで見る表示（xser）に入る前の一覧の状態（絞り込み・並び順・見出しの開閉・スクロール位置） */
let xserBack = null;
/* シリーズの絞り込みを外したら、入る前の一覧の状態に戻す */
function restoreXser() {
  const b = xserBack;
  xserBack = null;
  state.xser = false;
  if (!b || b.mode !== state.mode) return;
  Object.assign(state, b.st);
  collapsed.clear();
  b.col.forEach(k => collapsed.add(k));
  saveCol();
  xserY = b.y;
}
let xserY = null;
/* シリーズをまたいで見る表示（xser）をやめる（左メニューなどを押したとき）。入る前の一覧の状態に戻す。やめたら true */
function leaveXser() {
  if (!state.xser) return false;
  state.series = [];
  restoreXser();
  xserY = null;
  return true;
}
function render() {
  /* シリーズの絞り込みを外したら、ジャンルをまたぐ表示（アニメ・ドラマのラベルも）も終わり */
  if (state.xser && !state.series.length) restoreXser();
  const yt = state.mode === "yt";
  /* YouTubeは「すべて」をなくし、投稿者ごとのタブだけ。今の投稿者がいなければ先頭にする */
  const al = ytAuthors();
  /* YouTubeは最初「すべて」。投稿者は絞り込みで選ぶ（消えた投稿者が選ばれたままなら「すべて」に戻す） */
  if (yst.author !== "すべて" && !al.includes(yst.author)) yst.author = "すべて";
  const hc = $("#hcur");
  if (hc)
    hc.innerHTML =
      `<span class="mic ${state.mode}" aria-hidden="true">${MODE_IC[state.mode]}</span><span class="hname">${MODE_NAME[state.mode]}</span>`;
  renderSidebar();
  renderBnav();
  document.documentElement.classList.toggle("fshopen", state.mode === "yt" ? yst.fp === "all" : state.mode === "sr" || state.mode === "mu" ? lui.fp === "all" : state.fOpen === "all");
  if (!loaded) return;
  const y = U.lockY ?? scrollY;
  let body = yt ? renderYt() : state.mode === "w" ? renderWeek() : state.mode === "o" ? renderOther() : state.mode === "sr" ? renderSeries() : state.mode === "mu" ? renderSongs() : renderList();
  /* 「すべて開く／閉じる」は件数と同じ行の右端に置く */
  const gb = /<span class="gbulk">[\s\S]*?<\/span>/.exec(body);
  const ci = body.indexOf('<p class="count">');
  if (gb && ci >= 0 && gb.index > ci) {
    body = body.slice(0, gb.index) + body.slice(gb.index + gb[0].length);
    const ce = body.indexOf("</p>", ci);
    body = body.slice(0, ce) + gb[0] + body.slice(ce);
  }
  setMain(body);
  if (xserY != null) {
    scrollTo(0, xserY);
    xserY = null;
  } else if (U.lockY === null) scrollTo(0, y);
  placeFsh();
  if (typeof markStuck === "function") markStuck();
  saveUI();
  const hd = document.querySelector("header");
  if (hd && hd.offsetHeight) document.documentElement.style.setProperty("--hdh", hd.offsetHeight + "px");
}
/* 画面の切り替え：左メニュー（番組表・アニメ…）を選ぶ。絞り込みとシリーズは外す */
/* 絞り込みはメニューごとに別々に覚える（アニメの条件はアニメだけ。メニューを移っても引き継がない） */
const FKEEP = ["sf", "era", "cour", "series", "type", "vod", "missOnly", "missKey", "sub"];
const FEMPTY = { sf: [], era: [], cour: [], series: [], type: [], vod: "", missOnly: false, missKey: "", sub: "all" };
function setMode(m) {
  if (state.mode === m) return;
  Object.assign(lui, { q: "", qOpen: false, fp: "", fSub: "" });
  if (!state.xser && !["w", "yt", "o", "sr", "mu"].includes(state.mode)) state.fm[state.mode] = Object.fromEntries(FKEEP.map(k => [k, state[k]]));
  const saved = state.fm[m] || {};
  Object.assign(state, FEMPTY, Object.fromEntries(FKEEP.filter(k => k in saved).map(k => [k, saved[k]])));
  state.mode = m;
  state.sub = "all";
  state.wday = "";
  state.xser = false;
  state.fOpen = "";
  state.fSub = "";
  state.qOpen = false;
  state.q = "";
  if (["w", "yt", "o", "sr", "mu"].includes(m)) return;
  if (m === "m" || m === "s") state.type = [];
  state.limit = 200;
}
/* 画面を変えて先頭から表示 */
const go = () => {
  render();
  scrollTo(0, 0);
};
/* シリーズの作品一覧を開く（アニメ・ドラマ・映画・バラエティをまたいで出す）。g＝番組表・YouTubeから開いたときに使うメニュー */
function showSeries(name, g) {
  close();
  if (!["a", "d", "m", "s"].includes(state.mode)) setMode(g === "d" ? "d" : "a");
  if (!state.xser)
    xserBack = { mode: state.mode, st: Object.fromEntries([...FKEEP, "sort", "limit"].map(k => [k, Array.isArray(state[k]) ? [...state[k]] : state[k]])), col: [...collapsed], y: scrollY };
  Object.assign(state, { series: [name], xser: true, sf: [], era: [], cour: [], type: [], limit: 200 });
  go();
}
