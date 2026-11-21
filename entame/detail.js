/* ===================== 作品の詳細：基本情報のカード・前後の作品への移動・ステータス・保存 =====================
   話数（視聴チェック・話数の編集・〇〇編）は episodes.js、各話リストの貼り付けは epaste.js */
let openId = null, // 開いている作品
  epEdit = null; // 話数の編集中の下書き
let stMenu = false; // 視聴ステータスの選択肢を開いているか
let navIds = []; // 詳細を開いた画面に出ていた作品の並び（前・次の作品へ移る順）
/* 一覧・番組表に出ている作品を、画面の上から順に（同じ作品は1回）
   シリーズの一覧（xser）は、見出しを閉じているクールや「さらに表示」の先の作品も含めて、シリーズの作品を全部たどれるようにする */
function screenIds() {
  const seen = new Set();
  const ids = xserAllIds() || [...document.querySelectorAll("#main [data-id]")].map(el => el.dataset.id);
  return ids.filter(id => !seen.has(id) && seen.add(id) && items.some(x => x.id === id));
}
function navNeighbors(id) {
  const i = navIds.indexOf(id);
  return i < 0 ? [null, null] : [navIds[i - 1] || null, navIds[i + 1] || null];
}
/* 基本情報：放送・主題歌・リンクのカード。カードの「編集」ボタンで、そのカードの項目をその場で編集 */
/* 配信ボタンの名前：配信サイトが1つだけならその名前、それ以外は「配信」 */
function vodName(it) {
  const m = mediaOf(it);
  const l = [...new Set(m.media === "stream" ? m.plat : m.vods)];
  return l.length === 1 ? l[0] : "配信";
}
/* 詳細のMUSICでたたんでいる種類（OP・EDなど）。作品をまたいで同じ状態を保つ */
const musFold = new Set();
/* 関連放送の小見出し（OP・EDなど）で開いている種類。最初はたたんだ状態 */
const rbUnfold = new Set();
function infoCards(it, { md, ns, mv, stv, cs, songRows }) {
  const un = t => `<span class="unset">${t}</span>`;
  const nn = t => `<span class="nosong">${t}</span>`;
  const when = [it.dow >= 0 ? DOW[it.dow] + "曜 " : "", it.time || ""].join("").trim();
  const per = periodOf(it);
  const cour = cs.map(courLabel).join("・");
  /* ON AIR：「項目名　内容」を1行ずつ */
  const m = mediaOf(it);
  /* 中身を押しても編集画面は出さない（編集は見出しの右の「編集」ボタンから） */
  const row = (lab, val) => `<dt>${lab}</dt><dd>${val}</dd>`;
  const courChip = cour ? `<span class="icour">${esc(cour)}</span>` : "";
  const edB = (jump, lab) => `<button type="button" class="u-btn sm iedit" data-jump="${jump}" aria-label="${lab}を編集">編集</button>`;
  const rows = [];
  if (!ns) {
    const tLab = md === "stream" ? "配信時間" : "放送時間";
    if (when || !nofHas(it, "time")) rows.push(row(tLab, `${when ? `<b class="iwhen">${esc(when)}</b>` : un("未設定")}${courChip}`, "f-time"));
    else if (cour) rows.push(row("放送クール", courChip, "coursBox"));
  }
  const perLab = mv ? "公開日" : md === "sp" ? "放送日" : md === "ova" ? "発売期間" : md === "stream" ? "配信期間" : "放送期間";
  rows.push(row(perLab, per ? `<span class="inum">${esc(per)}</span>` : un("未設定"), "f-from"));
  const labsOr = (l, html, nofKey) => (l.length ? `<span class="labs">${html}</span>` : nofHas(it, nofKey) ? nn("なし") : un("未設定"));
  if (md === "stream") rows.push(row("配信サイト", labsOr(m.plat, m.plat.map(vlab).join(""), "plat"), "fMedia"));
  else {
    if (hasSt(md)) rows.push(row("放送局", labsOr(m.stations, m.stations.map(x => `<span class="lab">${esc(x)}</span>`).join(""), "st"), "fMedia"));
    if (it.k === "d") rows.push(row("放送枠", it.slot ? `<span class="lab sl">${esc(it.slot)}</span>` : nofHas(it, "slot") ? nn("なし") : un("未設定"), "fSlot"));
    rows.push(row("配信サイト", labsOr(m.vods, m.vods.map(vlab).join(""), "vods"), "fMedia"));
  }
  /* 外部リンクのアイコン（公式サイト＝外に開く、配信＝再生） */
  const IC_EXT = `<svg class="iic" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M13.5 2.5 7.5 8.5M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const IC_PLAY = `<svg class="iic ply" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M6.5 5.2v5.6L11 8z" fill="#fff"/></svg>`;
  /* シリーズ・公式サイト・配信URLも、放送の項目と同じ並びの行で（押すとシリーズの作品一覧・サイトを開く） */
  const host = u => {
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch (e) {
      return u;
    }
  };
  rows.push(row("シリーズ", it.series ? `<button type="button" class="ilnk" data-series="${esc(it.series)}">${esc(it.series)}<span class="ilar" aria-hidden="true">›</span></button>` : nofHas(it, "ser") ? nn("なし") : un("未設定")));
  rows.push(row("公式サイト", it.url ? `<a class="ilnk" href="${esc(it.url)}" target="_blank" rel="noopener">${esc(host(it.url))}${IC_EXT}</a>` : nofHas(it, "url") ? nn("なし") : un("未設定")));
  rows.push(row("配信URL", it.vurl ? `<a class="ilnk" href="${esc(it.vurl)}" target="_blank" rel="noopener" aria-label="${esc(vodName(it))}で見る">${IC_PLAY}${esc(vodName(it))}</a>` : nofHas(it, "vurl") ? nn("なし") : un("未設定")));
  const bc = `<div class="icard ibc"><div class="ich"><span class="ilamp onair">ON AIR</span>${edB("onair", "基本情報")}</div><dl class="idl">${rows.join("")}</dl></div>`;
  /* MUSIC：1曲1行。左に『曲名』アーティスト、右端に使われた話 */
  /* 種類ごとに小見出し（OP・ED…）を付けて区切る。曲の行は押しても編集しない */
  const songs = songRows
    .map((r, j) => {
      const { st, ar } = songTA(r.x);
      /* 2行目：「歌」ラベル＋アーティスト、使われた話は枠つきの小さなラベルで見分けやすく */
      /* 話は範囲ごとに1つずつの枠ラベル（飛び飛びでも [1〜10話] [13話] [20〜30話] と分けて並べる） */
      const sub = [r.rng.length ? `<span class="ieps">${r.rng.map((t, j) => `<span class="iep inum${j === r.now ? " now " + SG_CLS[r.k] : ""}">${esc(t)}</span>`).join("")}</span>` : ""].filter(Boolean).join("");
      /* 同じ種類に2曲以上あるときは、小見出しを押してたためる（初めは開いている） */
      const cnt = songRows.filter(q => q.k === r.k).length;
      const fold = musFold.has(r.k);
      const head =
        j === 0 || songRows[j - 1].k !== r.k
          ? `<button type="button" class="imt ${SG_CLS[r.k]}" data-imfold="${r.k}" aria-expanded="${!fold}"><b>${r.k}</b><small>${cnt}曲</small>${FOLD_IC}</button>`
          : "";
      if (fold) return head;
      return `${head}<div class="imsg ${SG_CLS[r.k]}${songRows.nowN == null ? "" : r.now >= 0 ? " isnow" : " notnow"}"><span class="imn">${st.trim() ? `『${esc(st)}』` : un("曲名 未設定")}${ar.trim() ? `<span class="iarn">${esc(ar)}</span>` : ""}</span>${sub ? `<span class="ima">${sub}</span>` : ""}</div>`;
    })
    .join("");

  /* 関連放送（旧作・再放送など）：MUSICの中に点線で区切って、タイトルと放送期間の下に曲を並べる */
  const rbRng = x => (x.a == null ? "" : x.b == null || x.b === x.a ? `${x.a}話${x.b == null && x.a !== 1 ? "〜" : ""}` : `${x.a}〜${x.b}話`);
  /* 関連放送：見出し（タイトル・放送期間）の下に、OP・EDなどの小見出し。小見出しは最初たたんだ状態で、押すと開く（開いた種類はアプリを開いている間覚える） */
  const relb = (it.relb || [])
    .map((r, k) => {
      const per = r.from || r.to ? `${r.from ? fmtD(r.from) : ""}〜${r.to ? fmtD(r.to) : ""}` : "";
      const name = esc(r.t || "関連放送");
      const hd = `<div class="irbh"><span class="irbtx"><span class="irbn">${name}</span>${per ? `<span class="irbd inum">${esc(per)}</span>` : ""}</span><button type="button" class="u-btn sm iedit" data-jump="relb" data-rbk="${k}" aria-label="${name}を編集">編集</button></div>`;
      const sl = r.songs || [];
      const rows = sl
        .map((x, j) => {
          const t = x.type || "";
          const cnt = sl.filter(q => (q.type || "") === t).length;
          const fk = "rb:" + t,
            fold = !rbUnfold.has(fk);
          const head =
            j === 0 || (sl[j - 1].type || "") !== t
              ? `<button type="button" class="imt ${SG_CLS[t] || ""}" data-rbtfold="${esc(fk)}" aria-expanded="${!fold}"><b>${esc(t)}</b><small>${cnt}曲</small>${FOLD_IC}</button>`
              : "";
          if (fold) return head;
          const { st, ar } = songTA(x);
          const rg = rbRng(x);
          return `${head}<div class="imsg ${SG_CLS[t] || ""}"><span class="imn">${st.trim() ? `『${esc(st)}』` : un("曲名 未設定")}${ar.trim() ? `<span class="iarn">${esc(ar)}</span>` : ""}</span>${rg ? `<span class="ima"><span class="ieps"><span class="iep inum">${esc(rg)}</span></span></span>` : ""}</div>`;
        })
        .join("");
      return `<div class="irb">${hd}${rows || `<p class="inos">${un("主題歌 未登録")}</p>`}</div>`;
    })
    .join("");
  /* 曲が1曲もなくてもカードは出す（「編集」ボタンから登録できるように） */
  const noS = !songs && ((it.noSongs || []).length ? nn("OP・ED・主題歌 なし") : un("未登録"));
  return bc + `<div class="icard imusic"><div class="ich"><span class="ilamp music">MUSIC</span>${songRows.nowN != null ? `<span class="inow">${songRows.nowN}話で流れた曲</span>` : ""}${edB("sgList", "OP・ED・主題歌")}</div>${songs || `<p class="inos">${noS}</p>`}${relb}</div>`;
}
/* 前・次の矢印（文字だと丸の中で上下左右にずれるので図形で描く） */
const CHEV = d => `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="${d < 0 ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function renderDetail(it) {
  const cs = coursOf(it);
  const stv = mediaLabels(it);
  /* 最初・最後が空の曲は、話数リストの最初・最後の話を入れて出す（保存は空のまま。話数が増えると表示も変わる） */
  const sl = songsOf(it);
  /* 1曲1行：曲名／アーティスト・使われた話。同じ種類が複数ある作品だけ話数の列を出す */
  const byType = SONG_TYPES.map(tp => [tp, sl.map((x, k) => [x, k]).filter(([x]) => x.type === tp)]);
  /* 話数の列：話が2話以上ある作品は常に出す */
  const showRng = episodes(it).length > 1 || byType.some(([, l]) => l.length > 1 && l.some(([x]) => rangeList(x).length));
  /* 曲の行のデータ（種類の順・同じ種類の中は登録順）。rng＝使われた話 */
  /* 視聴中の作品は、最後に見た話（並びで一番後ろの視聴済みの話）で流れた曲を目立たせる。now＝塗るラベルの番号 */
  const lastW = it.s === "視聴中" ? [...episodes(it)].reverse().find(e => e.w) : null;
  const nowN = lastW ? epNum(lastW.n) : NaN;
  const hasNow = showRng && Number.isFinite(nowN) && nowN > 0;
  const songRows = byType.flatMap(([tp, l]) =>
    l.map(([x, k]) => {
      const rl = rangeList(x, epSpan(it));
      const rng = showRng ? (rl.length ? rl : ["全話"]) : [];
      const now = !hasNow || !rng.length ? -1 : rl.length ? rangeHit(x, nowN, epSpan(it)) : 0;
      return { k: tp, x, i: k, rng, now };
    }),
  );
  songRows.nowN = hasNow && songRows.some(r => r.now >= 0) ? nowN : null;
  const md = mediaOf(it).media,
    mv = md === "movie",
    ns = noSched(md);
  const eps = episodes(it);
  const w = watchable(eps).filter(e => e.w).length;
  const nx = eps[nextIdx(eps)];
  /* 映画・OVA・TV SPで話数が1話以下のときは話数タブを出さず、番組情報の下に目立たない「＋ 話数を追加」だけ置く */
  const noEp = ns && eps.length < 2 && !epEdit;
  /* 視聴ステータスはラベル1つ。押すと4つの選択肢が開く */
  const stBtn = `<span class="stw"><button type="button" class="pill dst ${it.s ? "s-" + esc(it.s) : "s-none"}" id="stOpen" aria-haspopup="true" aria-expanded="${stMenu}">${esc(stLabel(it.s || "未設定"))}<span class="stv" aria-hidden="true">▾</span></button>${stMenu ? `<span class="stmenu" role="menu">${STATUSES.map(s => `<button type="button" role="menuitemradio" data-set="${s}" aria-checked="${it.s === s}" class="s-${s}">${stLabel(s)}</button>`).join("")}</span>` : ""}</span>`;
  const nv = navNeighbors(it.id),
    busy = !!(epEdit || arcEdit || subPaste || epOne != null);
  const navB = (d, lab, ic) => `<button type="button" class="u-btn icon sm dnav" data-dnav="${d}" aria-label="${lab}" title="${lab}${TOUCH ? "" : `（${d < 0 ? "←" : "→"}キー）`}" ${nv[d < 0 ? 0 : 1] && !busy ? "" : "disabled"}>${ic}</button>`;
  return `${detailHeroHtml(it)}<div class="dhead"><div class="hdrow"><div class="meta">${kindTag(it)}${(l => (l ? `<button type="button" class="dmt mtag m-${l[1]}" data-jump="fMedia" title="放送形態を変える">${l[0]}</button>` : ""))(mediaLabOf(it))}${stBtn}</div><div class="hdrow">${navB(-1, "前の作品", CHEV(-1))}${navB(1, "次の作品", CHEV(1))}<button type="button" class="u-btn sm" id="editItem" aria-label="作品を編集">編集</button><button class="u-btn icon sm soft close" type="button" data-close aria-label="閉じる">✕</button></div></div>
    <h3>${esc(it.t)}<button type="button" class="tcopy" id="copyTitle" aria-label="タイトルをコピー" title="タイトルをコピー"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button></h3>
    ${missDetail(it)}
    ${noEp ? "" : `<div class="dtabs" role="tablist"><button type="button" role="tab" data-dtab="info">番組情報</button><button type="button" role="tab" data-dtab="ep">話数${eps.length ? ` <small>${w}/${watchable(eps).length}</small>` : ""}</button></div>`}</div>
    <div class="dpane dp-info">${detailSideHtml(it)}${infoCards(it, { md, ns, mv, stv, cs, songRows })}
    <div class="links">${imgAddChip(it)}${noEp ? `<button type="button" class="u-chip add epadd" id="epAddMv">＋ 話数を追加</button>` : ""}<button type="button" class="u-chip add epadd" data-jump="relb" data-rbk="new">＋ 関連放送を追加</button><button type="button" class="u-btn sm txt danger delsm" id="delItem">削除</button></div></div>
    <div class="dpane dp-ep"><h4><span class="h4l">話数</span> <small>${eps.length && !epEdit ? `${w} / ${watchable(eps).length}話${nx ? `<span class="nxt">次は ${esc(nx.n)}</span>` : ""}` : ""}</small></h4>
    <div id="epArea">${subPaste ? subPasteHtml(it) : epEdit ? epEditorHtml(it) : epListHtml(it, eps)}</div></div>`;
}
/* 詳細のアラート：ふだんは1行に畳み、開くと項目ボタン。ボタンを押すとその項目だけの編集画面へ */
let dmissKeep = false;
function missDetail(it) {
  const l = missingOf(it);
  if (!l.length) return "";
  const hot = l.some(x => x.k === "話数");
  /* 項目ボタン（話数は話数タブへ、ステータスは上のボタンで選ぶ）＋「なし」ボタン */
  const main = x =>
    x.k === "話数"
      ? `<button type="button" data-dtab="ep">話数を登録</button>`
      : ["サブタイトル", "話数の表記", "話数の抜け", "話数の重複", "日付の確認", "未チェックの話"].includes(x.k)
        ? `<button type="button" data-dtab="ep">✎ ${x.k}</button>`
        : x.j
        ? `<button type="button" data-jump="${x.j}">✎ ${esc(x.k)}</button>`
        : `<button type="button" class="st" tabindex="-1">${esc(x.k)}（上で選択）</button>`;
  const btn = x =>
    `<span class="mi">${main(x)}${x.ns ? `<button type="button" class="nb" data-nosong="all" title="OP・ED・主題歌を「なし」にする">なし</button>` : x.n ? `<button type="button" class="nb" data-nof="${x.n}" title="${esc(x.k)}を「なし」にする">なし</button>` : ""}</span>`;
  /* たたまずに、足りない項目のボタンを最初から全部出す */
  return `<div class="dmiss${hot ? " hot" : ""}" role="group" aria-label="要確認 ${l.length}項目"><div class="dmh">⚠ 要確認 ${l.length}項目</div><div class="mbtns">${l.map(btn).join("")}</div></div>`;
}
function refreshSheet() {
  if (form && form.inline) return;
  const it = items.find(x => x.id === openId);
  const el = $("#sheetIn");
  if (!it || !el) return;
  /* 前・次へ移ったときの横スライドは1回だけ。描き直した中身にまたかからないよう外す（保存のたびに揺れて見えるため） */
  el.classList.remove("dsl-l", "dsl-r");
  /* 描き直してもスクロール位置はそのまま */
  const sh = $("#layer .sheet");
  const pos = [el, sh].map(x => x && [x.scrollTop, x.scrollLeft]);
  const inner = [".gw", ".sp-list"].map(c => el.querySelector(c)).map((x, i) => x && [[".gw", ".sp-list"][i], x.scrollTop, x.scrollLeft]).filter(Boolean);
  el.innerHTML = renderDetail(it);
  [el, sh].forEach((x, i) => x && pos[i] && ((x.scrollTop = pos[i][0]), (x.scrollLeft = pos[i][1])));
  inner.forEach(([c, t, l]) => {
    const x = el.querySelector(c);
    if (x) (x.scrollTop = t), (x.scrollLeft = l);
  });
  noTabInfo();
}
/* 話数タブがない詳細（話数のない映画・OVA・TV SP）は、番組情報を表示する */
function noTabInfo() {
  const sh = $("#layer .sheet");
  if (sh && !sh.querySelector(".dtabs") && sh.classList.contains("t-ep")) setDTab("info");
}
function refreshEditor() {
  const it = items.find(x => x.id === openId);
  const a = $("#epArea");
  if (it && a && epEdit && !subPaste) a.innerHTML = epEditorHtml(it);
}
function openDetail(id, dir, keepNav) {
  const it = items.find(x => x.id === id);
  if (!it) return;
  /* 前・次の作品へ移るときはシートを作り直さず中身だけ入れかえ、今のタブもそのまま */
  const sh = dir && $("#layer .sheet");
  /* 編集画面から戻るときは前の並びのまま（編集で絞り込みから外れても、前・次へ移れるように） */
  if (!dir && !(keepNav && navIds.includes(id))) navIds = screenIds();
  openId = id;
  stMenu = false;
  epEdit = null;
  subPaste = null;
  epOne = null;
  epMenu = false;
  erMore = false;
  arcEdit = null;
  arcFold = new Map();
  dmissKeep = false;
  if (sh) {
    const tab = sh.classList.contains("t-ep") ? "ep" : "info";
    sh.setAttribute("aria-label", it.t);
    const w = $("#sheetIn");
    w.innerHTML = renderDetail(it);
    w.classList.remove("dsl-l", "dsl-r");
    void w.offsetWidth;
    w.classList.add(dir > 0 ? "dsl-r" : "dsl-l");
    setDTab(tab);
    noTabInfo();
    return;
  }
  $("#layer").innerHTML =
    `<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(it.t)}"><div class="wrap" id="sheetIn">${renderDetail(it)}</div></div>`;
  setDTab("info");
  if (!TOUCH) $(".sheet .close").focus({ preventScroll: true });
}
/* 詳細を「基本情報／話数」タブで切り替え（PC・スマホ共通）（タブの状態はシート自体のクラスで持つ） */
function setDTab(t) {
  const sh = $("#layer .sheet");
  if (!sh) return;
  sh.classList.toggle("t-info", t === "info");
  sh.classList.toggle("t-ep", t === "ep");
  sh.scrollTop = 0;
  if (t === "ep")
    requestAnimationFrame(() => {
      const n = sh.querySelector(".dp-ep .tl.next");
      if (n) {
        const hd = sh.querySelector(".dhead");
        const sr = sh.getBoundingClientRect(),
          nr = n.getBoundingClientRect();
        if (nr.bottom > sr.bottom - 20) sh.scrollTop += nr.top - sr.top - (hd ? hd.offsetHeight : 0) - 110;
      }
    });
}
/* 保存できなかったとき：一時的なものは自動で保存し直す（U.sync）ので、知らせるだけ */
function fail(e) {
  toast(e && e.code && !["permission-denied", "invalid-argument", "failed-precondition"].includes(e.code) ? "保存できませんでした。自動で保存し直します" : "保存できませんでした。もう一度お試しください");
  console.warn(e);
}
async function saveTitle(id, patch, msg) {
  const o = { ...(over[id] || {}), ...patch };
  over[id] = o;
  rebuild();
  render();
  if (openId === id && !epEdit) refreshSheet();
  if (msg) toast(msg);
  try {
    /* 変えた項目だけ保存（まるごと上書きすると、ほかの端末で入れた曲やクールが古いまま戻ってしまうため） */
    await mergeDoc("titles", id, patch);
  } catch (e) {
    fail(e);
  }
}
const setStatus = (it, s) => {
  if (it.s !== s) saveTitle(it.id, { s }, `「${s}」にしました`);
};
/* 視聴チェックからステータスを自動で決める：全話✓→視聴済み、1話でも✓→視聴中（「見ない」はそのまま） */
function autoStatus(it, list) {
  if (it.s === "見ない" || !list.length) return null;
  const all = list.every(done),
    any = list.some(e => e.w);
  if (all) return it.s !== "視聴済み" ? "視聴済み" : null;
  if (any && it.s !== "視聴中") return "視聴中";
  if (!any && it.s === "視聴済み") return "視聴中";
  return null;
}
/* 視聴チェックで作品のステータスが変わるときは、ステータスも保存してメッセージに足す */
function applyAutoStatus(it, list, msg) {
  const ns = autoStatus(it, list);
  if (!ns) return msg;
  over[it.id] = { ...(over[it.id] || {}), s: ns };
  rebuild();
  mergeDoc("titles", it.id, { s: ns }).catch(fail);
  return (msg ? msg + "・" : "") + `「${ns}」にしました`;
}
/* 作品の詳細画面（it＝開いている作品） */
const DETAIL_ACTIONS = [
  ["#editItem", (el, it) => openForm(it)],
  [
    "[data-imfold]",
    el => {
      const k = el.dataset.imfold;
      if (musFold.has(k)) musFold.delete(k);
      else musFold.add(k);
      refreshSheet();
    },
  ],
  [
    "[data-rbtfold]",
    el => {
      const k = el.dataset.rbtfold;
      if (rbUnfold.has(k)) rbUnfold.delete(k);
      else rbUnfold.add(k);
      refreshSheet();
    },
  ],
  ["#copyTitle", (el, it) => U.copy(it.t).then(ok => toast(ok ? "タイトルをコピーしました" : "コピーできませんでした"))],
  /* 未入力アラートの「なし」 */
  [
    "[data-nof]",
    (el, it) => {
      const k = el.dataset.nof;
      dmissKeep = true;
      saveTitle(it.id, { noF: [...new Set([...(it.noF || []), k])] }, `${NOF_LAB[k]}を「なし」にしました`);
    },
  ],
  [
    "[data-nosong]",
    (el, it) => {
      dmissKeep = true;
      saveTitle(it.id, { noSongs: ["OP", "ED", "主題歌"] }, "OP・ED・主題歌を「なし」にしました");
    },
  ],
  /* 項目を押したら、その場で編集（作品の詳細では、その項目の入力欄を詳細の中に出す） */
  [
    "[data-jump]",
    (el, it, e) => {
      if (e.target.closest("a,button:not([data-jump])")) return false;
      openForm(it, el.dataset.jump, el);
    },
  ],
  ["[data-dtab]", el => setDTab(el.dataset.dtab)],
  /* 1話だけ編集 */
  [
    "[data-epone]",
    (el, it) => {
      epOne = +el.dataset.epone;
      refreshSheet();
      const r = $(".e1");
      /* スマホでは自動でキーボードを出さない（入力欄を押したときだけ） */
      if (r && !TOUCH) (r.querySelector(".e1-s") || r.querySelector(".e1-n")).focus({ preventScroll: true });
    },
  ],
  [
    "#e1Cancel",
    () => {
      epOne = null;
      refreshSheet();
    },
  ],
  ["#e1Save", (el, it) => saveEpOne(it)],
  /* 話数の抜けをそのまま登録（抜けた場所に足す） */
  [
    "[data-gapadd]",
    (el, it) => {
      const [a, b] = el.dataset.gapadd.split("-").map(Number);
      const l = episodes(it);
      const n = gapFill(it, l, a, b);
      saveEps(it, l, `${a === b ? a : `${a}〜${b}`}話を追加しました`);
    },
  ],
  /* 話数の抜けを「問題なし」に（配信にない総集編など。その作品のその抜けは数えない） */
  [
    "[data-gapnok]",
    (el, it) => {
      const k = el.dataset.gapnok;
      const ok = [...new Set([...(it.gapOk || []), k])];
      saveTitle(it.id, { gapOk: ok }, `${k.split("-")[0] === k.split("-")[1] ? k.split("-")[0] : k.replace("-", "〜")}話の抜けを問題なしにしました`);
    },
  ],
  /* 1話だけ削除：誤タップ防止のため、1回目で「本当に削除」に変わり、2回目で削除 */
  [
    "#e1Del",
    (el, it) => {
      if (!el.classList.contains("arm")) {
        el.classList.add("arm");
        el.textContent = "本当に削除";
        return;
      }
      const l = episodes(it);
      const x = l[epOne];
      epOne = null;
      if (!x) return refreshSheet();
      l.splice(l.indexOf(x), 1);
      saveEps(it, l, `${x.n}を削除しました`);
    },
  ],
  [
    "[data-set]",
    (el, it) => {
      stMenu = false;
      if (it.s === el.dataset.set) return refreshSheet();
      setStatus(it, el.dataset.set);
      refreshSheet();
    },
  ],
  /* 視聴ステータスのラベル：押すと選択肢を開く／閉じる。ほかの場所を押したら閉じる */
  [
    "#stOpen",
    () => {
      stMenu = !stMenu;
      refreshSheet();
    },
  ],
  [
    null,
    el => {
      if (stMenu && !el.closest(".stw")) {
        stMenu = false;
        refreshSheet();
      }
      return false;
    },
  ],
  /* 前・次の作品 */
  ["[data-dnav]", el => detailNav(+el.dataset.dnav)],
  /* 話の視聴チェック */
  [
    "[data-ep]",
    (el, it) => {
      const i = +el.dataset.ep;
      toggleEp(it, i, !episodes(it)[i].w);
    },
  ],
  [
    "#epMenuBtn",
    () => {
      epMenu = !epMenu;
      refreshSheet();
    },
  ],
  [
    "#allAired",
    (el, it) => {
      epMenu = false;
      const l = episodes(it),
        ch = [];
      l.forEach((x, i) => {
        if (aired(x) && !done(x)) {
          x.w = true;
          /* まとめて付けた印：押した日時に0.5を足して区別する（1話ずつ見た印と見分けられるように、データの形はこのまま残す） */
          x.wt = Date.now() + 0.5;
          ch.push(i);
        }
      });
      saveWatch(it, l, ch, "放送済みの話を全部チェックしました");
    },
  ],
  [
    "#clearAll",
    (el, it) => {
      epMenu = false;
      const l = episodes(it),
        ch = [];
      l.forEach((x, i) => {
        if (x.w) {
          x.w = false;
          x.wt = 0;
          ch.push(i);
        }
      });
      saveWatch(it, l, ch, "チェックを全部外しました");
    },
  ],
  /* 編（〇〇編）の登録 */
  [
    "#arcOpenEd",
    (el, it) => {
      epMenu = false;
      arcEdit = arcsOf(it).map(r => ({ ...r }));
      if (!arcEdit.length) arcEdit.push({ name: "", a: 1, b: null });
      refreshSheet();
    },
  ],
  [null, (el, it, e) => !!arcEdit && runActions(ARC_ACTIONS, e, it)],
  /* 編の見出し：開く／たたむ */
  /* 日付のアラート：曜日のずれた話を1日ずらす（時刻はそのまま） */
  [
    "#epFixDow",
    (el, it) => {
      const dc = epDateCheck(it);
      const l = episodes(it);
      let n = 0;
      dc.eps.forEach((x, i) => {
        if (x && x.dow && l[i].t) {
          l[i].t += x.dow * 1440;
          n++;
        }
      });
      if (n) saveEps(it, l, `${n}話の日付を1日ずらしました`);
    },
  ],
  /* 日付のアラート：日付の逆転・半年以上の空きが問題ない話を確認済みにする（その話の日付を変えるまで） */
  [
    "[data-gapok]",
    (el, it) => {
      const l = episodes(it);
      const e = l[+el.dataset.gapok];
      if (!e || !e.t) return;
      e.go = e.t;
      saveEps(it, l, `${epVal(e.n) ? epVal(e.n) + "話" : e.n}の日付を確認済みにしました`);
    },
  ],
  /* 曜日のずれをまとめて「問題なし」に（途中で放送曜日・時間帯が変わった作品など） */
  [
    "#epDowOk",
    (el, it) => {
      const l = episodes(it),
        dc = epDateCheck(it);
      let n = 0;
      l.forEach((e, i) => {
        if (dc.eps[i] && dc.eps[i].dow && e.t) {
          e.go = e.t;
          n++;
        }
      });
      if (n) saveEps(it, l, `曜日のずれ${n}話を問題なしにしました`);
    },
  ],
  /* 日付のアラート：開始日を1話の日付にする（毎週の曜日も合わせる） */
  [
    "#epFixStart",
    (el, it) => {
      const d = epDateCheck(it).start;
      if (!d) return;
      const o = over[it.id] || {};
      saveTitle(it.id, { from: d, ...((o.dow ?? -1) >= 0 ? { dow: dowOfDate(d) } : {}) }, `開始日を${fmtD(d)}にしました`);
    },
  ],
  /* 日付のアラート：話数リストを開始日に合わせる（1話を開始日にして、ほかの話も同じ日数ずらす。日付のない話はそのまま） */
  [
    "#epShiftStart",
    (el, it) => {
      const d = epDateCheck(it).start,
        f = normDate(it.from || "");
      if (!d || !f) return;
      const g = dayNo(f) - dayNo(d);
      if (!g) return;
      const l = episodes(it);
      let n = 0;
      l.forEach(e => {
        if (!e.t) return;
        if (e.go && e.go === e.t) e.go += g * 1440;
        e.t += g * 1440;
        n++;
      });
      if (n) saveEps(it, l, `${n}話の日付を${Math.abs(g)}日${g > 0 ? "後" : "前"}にずらしました`);
    },
  ],
  /* 要確認の最初の話へ（たたんだ編の中なら開いてから） */
  [
    "#epWarnGo",
    (el, it) => {
      const l = episodes(it),
        wo = epWarn(it);
      const i = l.findIndex((e, k) => warnAny(wo(e, k)));
      if (i < 0) return;
      const n = epNum(l[i].n);
      const r = arcsOf(it).find(r => n != null && n >= r.a && (r.b == null || n <= r.b));
      if (r && arcFold.get(arcKey(r)) !== true) {
        arcFold.set(arcKey(r), true);
        refreshSheet();
      }
      requestAnimationFrame(() => document.getElementById("epr-" + i)?.scrollIntoView({ block: "center", behavior: "smooth" }));
    },
  ],
  [
    "[data-arc]",
    el => {
      arcFold.set(el.dataset.arc, el.getAttribute("aria-expanded") !== "true");
      refreshSheet();
    },
  ],
  /* 各話リスト（サブタイトル）の貼り付け */
  ["#spOpen", (el, it) => openPaste(it)],
  [null, (el, it, e) => !!subPaste && runActions(PASTE_ACTIONS, e, it)],
  /* 話数の編集 */
  [
    "#epEditBtn",
    (el, it) => {
      subPaste = null;
      epOne = null;
      epMenu = false;
      erMore = false;
      epEdit = { list: episodes(it).map(x => ({ ...x })) };
      refreshSheet();
    },
  ],
  /* 話数のない映画・OVA・TV SP：番組情報の下の「＋ 話数を追加」から話数の編集を開く */
  [
    "#epAddMv",
    (el, it) => {
      subPaste = null;
      epOne = null;
      epEdit = { list: episodes(it).map(x => ({ ...x })) };
      refreshSheet();
      setDTab("ep");
    },
  ],
  [null, (el, it, e) => !!epEdit && runActions(EPEDIT_ACTIONS, e, it)],
  /* 削除：もう一度押すとゴミ箱へ（30日間は設定のゴミ箱から戻せる） */
  [
    "#delItem",
    (el, it) => {
      if (!el.dataset.c) {
        el.dataset.c = "1";
        el.textContent = "もう一度押すと削除";
        el.classList.add("armed");
        return;
      }
      const id = it.id,
        at = Date.now();
      over[id] = { ...(over[id] || {}), deleted: at };
      rebuild();
      close();
      render();
      mergeDoc("titles", id, { deleted: at }).catch(fail);
      toastUndo(`「${it.t.slice(0, 18)}」をゴミ箱に移しました`, () => trashRestore("titles", id, true));
    },
  ],
];
/* 横スライドが終わったらクラスを外す（その後に項目をその場で編集したときなどに、またスライドしないように） */
document.addEventListener("animationend", e => {
  if (e.animationName === "dslr" || e.animationName === "dsll") e.target.parentElement?.classList.remove("dsl-l", "dsl-r");
});
/* 前・次の作品へ（話数の編集などの途中は移らない） */
function detailNav(d) {
  if (!openId || epEdit || arcEdit || subPaste || epOne != null || (form && form.inline)) return;
  const id = navNeighbors(openId)[d < 0 ? 0 : 1];
  if (id) openDetail(id, d);
}
function onDetailClick(e) {
  const it = openId && items.find(x => x.id === openId);
  return !!it && runActions(DETAIL_ACTIONS, e, it);
}
