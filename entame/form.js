/* ===================== 作品の追加・編集（詳細の中でその項目だけ編集するときも） ===================== */
let form = null;
/* ===== 編集画面のプルダウン（1つだけ選ぶ。選んだらすぐ閉じる）=====
   一覧は詳細・編集のシートの外（body直下の #ddPop）に出す：シートの中だとはみ出して切れるため。
   スマホは下から出る一覧、PCはボタンのすぐ下（下に場所がなければ上）に小さく出す */
const DD_NOF = { st: "st", plat: "plat", vods: "vods" };
const DD_TITLE = { cour: "ほかのクール", media: "放送形態", st: "放送局", plat: "配信サイト", vods: "配信サイト", ser: "シリーズ" };
const DD_NONE = { st: "なし（放送局なし）", plat: "なし（配信なし）", vods: "なし（配信なし）", ser: "なし（シリーズなし）" };
const DD_CHEV = `<svg class="fdd-cv" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
const DD_CHECK = U.IC.check;
let ddOpen = null; // 開いているプルダウン（media・st・plat・vods・ser）
const ddArr = k => (k === "st" ? form.stations : k === "plat" ? form.plat : form.vods);
const ddMedia = () => (form.k === "r" ? MEDIA.filter(([m]) => m === "tv" || m === "stream") : MEDIA);
const ddChip = (v, vod) => (vod && VOD_COLOR[v] ? `<span class="fdd-c vc"${vcStyle(v)}>${esc(v)}</span>` : `<span class="fdd-c">${esc(v)}</span>`);
/* 閉じているときの中身：選んだもの（前に2つ以上入れた作品は「ほか○」）・なし・未選択 */
function ddValue(k) {
  const ph = t => `<span class="fdd-ph">${t}</span>`;
  if (k === "media") return esc((MEDIA.find(([m]) => m === form.media) || [, "選ぶ"])[1]);
  if (k === "ser") return form.series ? esc(form.series) : ph("なし");
  if ((form.noF || []).includes(DD_NOF[k])) return ph("なし");
  const a = ddArr(k);
  if (!a.length) return ph("選ぶ");
  return ddChip(a[0], k !== "st") + (a.length > 1 ? `<span class="fdd-more">ほか${a.length - 1}</span>` : "");
}
const ddBtn = k =>
  `<button type="button" class="fdd" data-fdd="${k}" aria-haspopup="listbox" aria-expanded="${ddOpen === k}" aria-label="${DD_TITLE[k]}を選ぶ"><span class="fdd-v">${ddValue(k)}</span>${DD_CHEV}</button>`;
/* 一覧の行 */
function ddRows(k, q) {
  /* 整形の表：列の役割 */
  if (k.startsWith("gcol:")) {
    const g = subPaste && subPaste.grid,
      cur = g ? g.cols[+k.slice(5)] : "";
    return Object.entries(G_ROLE)
      .map(([v, l]) => `<button type="button" class="dd-row${cur === v ? " on" : ""}" role="option" aria-selected="${cur === v}" data-ddpick="${v}"><span class="dd-l">${l}</span>${cur === v ? DD_CHECK : ""}</button>`)
      .join("") + `<button type="button" class="dd-row dd-del" role="option" aria-selected="false" data-ddpick="__del"><span class="dd-l">この列を消す</span></button>`;
  }
  const nq = norm(q || "");
  const hit = t => !nq || norm(t).includes(nq);
  const row = (v, lab, on, extra = "") =>
    `<button type="button" class="dd-row${on ? " on" : ""}" role="option" aria-selected="${on}" data-ddpick="${esc(v)}">${extra}<span class="dd-l">${lab}</span>${on ? DD_CHECK : ""}</button>`;
  const none = on => (nq ? "" : `<button type="button" class="dd-row none${on ? " on" : ""}" role="option" aria-selected="${on}" data-ddnone="1"><span class="dd-l">${DD_NONE[k]}</span>${on ? DD_CHECK : ""}</button>`);
  if (k === "media") return ddMedia().map(([v, l]) => row(v, esc(l), form.media === v)).join("");
  /* ほかのクール：上で年を切り替え、季節を選ぶと追加（付いているものを選ぶと外す） */
  if (k === "cour") {
    const y = form.cy;
    return `<div class="dd-year"><button type="button" class="dd-yb" data-ddcy="-1" aria-label="前の年">‹</button><b>${y}年</b><button type="button" class="dd-yb" data-ddcy="1" aria-label="次の年">›</button></div>${SEASONS.map(x => row(x, `${y}年${x}`, form.cours.includes(`${y}${x}`))).join("")}`;
  }
  if (k === "ser") {
    const grp = serGroup(form.k);
    const { map, cnt } = seriesMainMap();
    const n0 = n => (cnt[n] ? cnt[n].a + cnt[n].d : 0);
    const names = Object.keys(map).filter(hit);
    const sort = l => l.sort((x, y) => (nq ? norm(x).indexOf(nq) - norm(y).indexOf(nq) : 0) || n0(y) - n0(x));
    const mine = sort(names.filter(n => map[n] === grp)),
      other = sort(names.filter(n => map[n] !== grp));
    const r = n => row(n, `${esc(n)}<small>${n0(n)}</small>${map[n] !== grp ? `<em>${SER_GL[map[n]]}</em>` : ""}`, form.series === n);
    const exact = names.some(n => norm(n) === nq);
    return (
      none(!form.series) +
      [...mine, ...other].slice(0, 60).map(r).join("") +
      (nq && !exact ? `<button type="button" class="dd-row add" data-ddsernew="${esc(q.trim())}"><span class="dd-l">＋「${esc(q.trim())}」を新しく作る</span></button>` : "") +
      (!nq ? `<p class="dd-hint">名前を入れると、なければ新しく作れます</p>` : "")
    );
  }
  const a = ddArr(k),
    nof = (form.noF || []).includes(DD_NOF[k]);
  const opts = [...new Set([...(k === "st" ? M("stations") : M("vods")), ...a])].filter(hit);
  const dot = v => (k !== "st" ? `<i class="dd-dot"${vcStyle(v)}></i>` : "");
  return none(nof) + (opts.length ? opts.map(v => row(v, esc(v), !nof && a[0] === v && a.length === 1 ? true : !nof && a.includes(v), dot(v))).join("") : `<p class="dd-hint">「${esc(q)}」は見つかりません</p>`);
}
const ddSheetMode = U.sheetMode;
const ddTitle = k => (k.startsWith("gcol:") ? `${gLetter(+k.slice(5))}列` : DD_TITLE[k]);
const ddBtnOf = k => document.querySelector(k.startsWith("gcol:") ? `[data-gcol="${k.slice(5)}"]` : `[data-fdd="${k}"]`);
function openDD(k, btn) {
  closeDD();
  ddOpen = k;
  btn.setAttribute("aria-expanded", "true");
  const search = k !== "media" && k !== "cour" && !k.startsWith("gcol:");
  const box = document.createElement("div");
  box.id = "ddPop";
  const sheet = ddSheetMode();
  box.className = sheet ? "sheetmode" : "popmode";
  box.innerHTML = `<div class="dd-scrim" data-ddclose="1"></div><div class="dd-box" role="dialog" aria-label="${ddTitle(k)}">
    ${sheet ? `<div class="dd-h"><b>${ddTitle(k)}</b><span>${k === "cour" ? "選ぶと追加・外す" : "選ぶと閉じます"}</span><button type="button" class="dd-x" data-ddclose="1" aria-label="閉じる">✕</button></div>` : ""}
    ${search ? `<label class="dd-q"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="ddq" type="search" autocomplete="off" placeholder="${DD_TITLE[k]}を探す${k === "ser" ? "・新しく作る" : ""}" aria-label="${DD_TITLE[k]}を探す"></label>` : ""}
    <div class="dd-list" role="listbox" id="ddList">${ddRows(k, "")}</div></div>`;
  document.body.appendChild(box);
  ddAt = Date.now();
  if (sheet) document.documentElement.classList.add("pkopen");
  if (!sheet) {
    const r = btn.getBoundingClientRect(),
      b = box.querySelector(".dd-box");
    const w = Math.min(Math.max(r.width, 300), 420);
    b.style.width = w + "px";
    b.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + "px";
    const below = innerHeight - r.bottom - 12,
      above = r.top - 12;
    if (below >= 260 || below >= above) {
      b.style.top = r.bottom + 6 + "px";
      b.style.maxHeight = Math.min(440, below) + "px";
    } else {
      b.style.bottom = innerHeight - r.top + 6 + "px";
      b.style.maxHeight = Math.min(440, above) + "px";
    }
  }
  const sel = box.querySelector(".dd-row.on");
  if (sel) sel.scrollIntoView({ block: "center" });
  if (!TOUCH) (box.querySelector("#ddq") || sel || box.querySelector(".dd-row"))?.focus();
}
let ddAt = 0; // 開いた時刻（開いた直後の指の離れで下の項目を選ばないため）
function closeDD(refocus) {
  const k = ddOpen;
  ddOpen = null;
  $("#ddPop")?.remove();
  document.documentElement.classList.remove("pkopen");
  const b = k && ddBtnOf(k);
  if (b) {
    b.setAttribute("aria-expanded", "false");
    if (refocus && !TOUCH) b.focus();
  }
}
/* 選んだ：入力中の内容を読み取ってから値を入れ、閉じて描き直す */
function ddPick(v, none) {
  const k = ddOpen;
  if (k && k.startsWith("gcol:")) {
    if (subPaste && subPaste.grid) {
      gSnap();
      if (v === "__del") gDelCol(subPaste.grid, +k.slice(5)) || toast("最後の列は消せません");
      else gSetCol(subPaste.grid, +k.slice(5), v);
    }
    closeDD();
    refreshSheet();
    if (!TOUCH) ddBtnOf(k)?.focus();
    return;
  }
  if (!k || !form) return closeDD();
  readForm();
  if (k === "media") form.media = v;
  else if (k === "cour") {
    const key = `${form.cy}${v}`;
    form.cours = form.cours.includes(key) ? form.cours.filter(c => c !== key) : [...form.cours.filter(c => c !== ALLYEAR), key].sort();
  } else if (k === "ser") form.series = none ? "" : v;
  else {
    const nk = DD_NOF[k];
    const l = (form.noF || []).filter(x => x !== nk);
    form.noF = none ? [...l, nk] : l;
    const val = none ? [] : [v];
    if (k === "st") form.stations = val;
    else if (k === "plat") form.plat = val;
    else form.vods = val;
  }
  closeDD();
  redrawForm();
  if (!TOUCH) document.querySelector(`[data-fdd="${k}"]`)?.focus();
}
/* プルダウンの一覧の中のクリック（詳細の中の編集の「外を押した」にしないため、いちばん先に受ける） */
function onDDClick(e) {
  if (!e.target.closest("#ddPop")) return false;
  if (Date.now() - ddAt < 300 && !e.target.closest("[data-ddclose]")) return true;
  const p = e.target.closest("[data-ddpick]");
  if (p) ddPick(p.dataset.ddpick, false);
  else if (e.target.closest("[data-ddnone]")) ddPick("", true);
  else if (e.target.closest("[data-ddcy]")) {
    form.cy = (+form.cy || new Date().getFullYear()) + +e.target.closest("[data-ddcy]").dataset.ddcy;
    $("#ddList").innerHTML = ddRows("cour", "");
  }
  else if (e.target.closest("[data-ddsernew]")) {
    const n = e.target.closest("[data-ddsernew]").dataset.ddsernew;
    if (n && !M("series").includes(n)) {
      master = { ...master, seriesMain: { ...(master.seriesMain || {}), [n]: serGroup(form.k) } };
      saveMaster();
      toast(`シリーズ「${n}」を作りました`);
    }
    ddPick(n, false);
  } else if (e.target.closest("[data-ddclose]")) closeDD(true);
  return true;
}
addEventListener("resize", () => ddOpen && !ddSheetMode() && closeDD());
document.addEventListener(
  "scroll",
  e => ddOpen && !ddSheetMode() && !(e.target.closest && e.target.closest("#ddPop")) && closeDD(),
  true,
);
/* シリーズのメインのジャンル（裏で持つ）：a=アニメ、d=ドラマ・実写（ドラマ・実写映画・配信番組）
   設定で決めたもの → 使っている作品で多い方 → アニメ */
const serGroup = k => (k === "a" ? "a" : "d");
const SER_GL = { a: "アニメ", d: "ドラマ・実写" };
function seriesMainMap() {
  const cnt = {};
  items.forEach(i => {
    if (!i.series) return;
    const c = (cnt[i.series] = cnt[i.series] || { a: 0, d: 0 });
    c[serGroup(i.k)]++;
  });
  const set = master.seriesMain || {};
  const map = {};
  M("series").forEach(n => {
    const c = cnt[n];
    map[n] = set[n] || (c && (c.a || c.d) ? (c.a >= c.d ? "a" : "d") : "a");
  });
  return { map, cnt };
}
/* 編集画面のシリーズ検索：基本は同じジャンルのシリーズだけ。「○○のシリーズからも探す」で別ジャンルも出す */
function serSugForm(q) {
  const nq = norm(q);
  const grp = serGroup(form.k),
    other = grp === "a" ? "d" : "a";
  const { map, cnt } = seriesMainMap();
  const n0 = n => (cnt[n] ? cnt[n].a + cnt[n].d : 0);
  const hit = n => n !== form.series && (!nq || norm(n).includes(nq));
  const sort = l => (nq ? l.sort((x, y) => norm(x).indexOf(nq) - norm(y).indexOf(nq) || n0(y) - n0(x)) : l.sort((x, y) => n0(y) - n0(x)));
  const mine = sort(Object.keys(map).filter(n => map[n] === grp && hit(n)));
  const others = sort(Object.keys(map).filter(n => map[n] === other && hit(n)));
  const btn = (n, o) => `<button type="button" data-fser="${esc(n)}"${o ? ' class="ser-o"' : ""}>${esc(n)}<small>${n0(n)}</small>${o ? `<em>${SER_GL[other]}</em>` : ""}</button>`;
  let h = "";
  if (nq || form.serAll) {
    const shown = mine.slice(0, 20);
    if (form.serAll) h += `<span class="hint ser-oh">${SER_GL[grp]}のシリーズ</span>`;
    h += shown.length ? shown.map(n => btn(n)).join("") : `<span class="hint">${SER_GL[grp]}のシリーズに${nq ? `「${esc(q)}」は` : ""}ありません</span>`;
  }
  if (form.serAll) {
    if (others.length) h += `<span class="hint ser-oh">${SER_GL[other]}のシリーズ</span>` + others.slice(0, 30).map(n => btn(n, true)).join("");
    else h += `<span class="hint ser-oh">${SER_GL[other]}のシリーズに${nq ? `「${esc(q)}」は` : ""}ありません</span>`;
  } else if (others.length) h += `<button type="button" class="ser-all" data-fserall="1">${SER_GL[other]}のシリーズからも探す（${nq ? "一致 " : ""}${others.length}件）</button>`;
  return h;
}
/* 編集画面の曲：種類ごとの区切り（色の帯・見出し・＋追加・なし）に曲のカードを並べる */
const SONG_MAIN = ["OP", "ED", "主題歌"];
/* OP・ED・主題歌の「なし」：見出しのすぐ右に置く（曲が1曲もないときだけ） */
const sgNoneBox = () =>
  form.songs.length ? "" : `<label class="nofl sgno sghno"><input type="checkbox" class="nos" ${(form.noSongs || []).length ? "checked" : ""} aria-label="OP・ED・主題歌 なし"><span>なし</span></label>`;
/* 編集画面でたたんでいる曲（番号）。たためるのは同じ種類に2曲以上あるときだけ。ふだんは全部開いている */
/* 開いている曲（同じ種類に2曲以上のときは、最初はすべてたたむ） */
let sgOpen = new Set();
let sgAddK = -1;
function songRowsHtml() {
  const f = form;
  /* OP・ED・主題歌はジャンル・種別に関係なくいつも出す（挿入歌は追加したときだけ） */
  const types = SONG_TYPES.filter(t => SONG_MAIN.includes(t) || t === "挿入歌" || f.songs.some(x => x.type === t));
  const main = SONG_MAIN;
  /* multi＝同じ種類に2曲以上（たたむ行と並び替えの⠿を出す） */
  const card = (x, k, multi) => {
    /* 1話だけ：「最後」の欄を隠して、最初の話だけ入れる */
    const one = !!x.one;
    const { st, ar } = songTA(x);
    const open = !multi || sgOpen.has(k);
    /* 最初・最後が空の欄は、話数リストの最初・最後の話を入れて見せる（保存するときは、話数リストの最初・最後と同じなら空に戻す） */
    const sp = !one && f.span;
    const va = x.a ?? (sp ? sp[0] : ""),
      vb = x.b ?? (sp ? sp[1] : "");
    const rt = [rangeTxt(sp ? { a: va, b: vb } : x), ...exOf(x).map(exTxt)].filter(Boolean).join("・") || "全話";
    return `<div class="sg${open ? " open" : ""}${multi ? " multi" : ""}" data-sg="${k}"${multi ? " data-sortrow" : ""}>
    ${multi ? `<div class="sg-hd">${GRIP("sg")}<button type="button" class="sg-sum" data-sgfold="${k}" aria-expanded="${open}"><span class="sg-sn"><span class="sg-st1">${st.trim() ? `『${esc(st)}』` : "曲名 未設定"}</span>${ar.trim() ? `<span class="sg-sa">${esc(ar)}</span>` : ""}</span><span class="sg-se">${esc(rt)}</span><span class="sg-sv">${FOLD_IC}</span></button></div>` : ""}
    <div class="sg-body">
    <div class="sg-f2"><input class="sg-st" value="${esc(songTA(x).st)}" placeholder="曲名" aria-label="曲名" autocomplete="off"><input class="sg-ar" value="${esc(songTA(x).ar)}" placeholder="アーティスト" aria-label="アーティスト" autocomplete="off"></div>
    <div class="sg-r"><input class="sg-a" type="number" min="0" inputmode="numeric" value="${va}" placeholder="最初" aria-label="使われた最初の話"><span class="sg-bw${one ? " inv" : ""}" ${one ? 'aria-hidden="true"' : ""}><span>〜</span><input class="sg-b" type="number" min="0" inputmode="numeric" value="${vb}" placeholder="最後" aria-label="使われた最後の話"></span><span>話</span>${x.a == null && x.b == null && !one && !f.span ? `<span class="sg-all">全話</span>` : ""}
      <label class="sg-onew"><input type="checkbox" class="sg-one" data-sgone="${k}" ${one ? "checked" : ""}>1話だけ</label></div>
    ${(x.ex || [])
      .map(
        (r, j) =>
          `<div class="sg-r sg-x" data-sgx="${j}"><span class="sg-rl">ほか</span><input class="sg-xa" type="number" min="0" inputmode="numeric" value="${r.a ?? ""}" placeholder="最初" aria-label="ほかに使われた最初の話"><span>〜</span><input class="sg-xb" type="number" min="0" inputmode="numeric" value="${r.b ?? ""}" placeholder="最後" aria-label="ほかに使われた最後の話（1話だけなら空）"><span>話</span><span class="sg-sp"></span><button type="button" class="sg-xdel" data-sgxdel="${k}:${j}" aria-label="このほかの話を消す">×</button></div>`,
      )
      .join("")}
    <div class="sg-ft"><select class="sg-t" aria-label="種類を変える" title="種類を変える">${SONG_TYPES.map(t => `<option value="${t}" ${t === x.type ? "selected" : ""}>${t}</option>`).join("")}</select><button type="button" class="sg-exadd" data-sgex="${k}">＋ 範囲を追加</button><button type="button" class="del" data-sgdel="${k}" aria-label="この曲を削除">削除</button></div></div></div>`;
  };
  const secs = types
    .map(t => {
      const l = f.songs.map((x, k) => [x, k]).filter(([x]) => x.type === t);
      if (!l.length && !main.includes(t)) return "";
      return `<div class="sgsec ${SG_CLS[t]}">
        <div class="sgh"><b class="sgn">${t}</b>${l.length ? `<small>${l.length}曲</small>` : ""}<span class="sg-sp"></span>
          ${l.length > 1 ? `<button type="button" class="sgfoldall" data-sgfoldall="${t}">${l.some(([, k]) => sgOpen.has(k)) ? "すべてたたむ" : "すべて開く"}</button>` : ""}
          ${l.length ? "" : `<button type="button" class="sgadd" data-sgadd="${t}">＋ ${t}を追加</button>`}</div>
        ${l.length ? l.map(([x, k]) => card(x, k, l.length > 1)).join("") + `<button type="button" class="sgnext" data-sgadd="${t}">＋ 次の${t}を追加</button>` : ""}</div>`;
    })
    .join("");
  return secs;
}
const dowOfDate = d => {
  if (!d) return -1;
  const [y, m, dd] = d.split("-").map(Number);
  if (!y) return -1;
  return (new Date(Date.UTC(y, m - 1, dd)).getUTCDay() + 6) % 7;
};
const courOfDate = d => {
  const y = +String(d || "").slice(0, 4);
  if (!y) return "";
  return `${y}${SEASONS[Math.floor(((+d.slice(5, 7) || 1) - 1) / 3)]}`;
};
function schedText() {
  const f = form;
  if (f.media === "movie") return f.from ? `${fmtD(f.from)} 公開` : "公開日を入れてください";
  if (f.media === "sp") return f.from ? `${fmtD(f.from)} 放送（TV SP）` : "放送日を入れてください";
  if (f.media === "ova") return f.from ? `${fmtD(f.from)}から発売` : "発売日を入れてください";
  if (!f.from) return "開始日を入れると、放送曜日が自動で決まります";
  /* 放送時間なし＝毎週の放送ではない（一挙配信・不定期など）：曜日を決めない */
  if ((f.noF || []).includes("time")) return `${fmtD(f.from)}から ${f.media === "stream" ? "配信" : "放送"}（曜日・時間なし）`;
  const d = dowOfDate(f.from);
  const t = (f.time || "").trim();
  return `毎週 <b>${DOW[d]}曜${t ? " " + esc(t) : ""}</b> ${f.media === "stream" ? "配信" : "放送"}　${fmtD(f.from)}〜`;
}
const ONLY_A = {
  fSeries: ["シリーズ", ["series"]],
  "f-time": ["放送時間", ["time"]],
  fMedia: ["放送局・配信", ["media", "vurl"]],
  "f-from": ["放送日", ["from"]],
  coursBox: ["放送クール", ["cours"]],
  sgList: ["OP・ED・主題歌", ["songs"]],
  relb: ["関連放送", ["relb"]],
  onair: ["基本情報", ["media", "vurl", "from", "time", "cours", "series", "url", "syoboi"]],
  "f-url": ["公式サイト", ["url"]],
  "f-vurl": ["配信サイトURL", ["vurl"]],
};
/* 日付の入力欄（yyyy/MM/dd・カレンダー付き）。開始日と同じ作り */
const dtField = (id, lab, v) =>
  `<label class="field"><span>${lab}</span><span class="dtw"><input id="${id}" class="dtx" type="text" inputmode="numeric" autocomplete="off" placeholder="2018/08/25" value="${esc(dtShow(v || ""))}"><button type="button" class="dtcal" data-dtcal="${id}" aria-label="カレンダーから選ぶ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></button><input type="date" class="dtpick" tabindex="-1" aria-hidden="true" data-dtfor="${id}"></span></label>`;
function formHtml() {
  const f = form;
  const y = new Date().getFullYear();
  const years = [];
  for (let k = y + 1; k >= 1960; k--) years.push(k);
  const dyn = f.cours.filter(c => c !== ALLYEAR);
  const songTypes = f.k === "a" ? ["OP", "ED", "主題歌", "挿入歌"] : ["主題歌", "挿入歌"];
  const sug = courOfDate(f.from);
  const sec = (title, body, note = "", side = "") =>
    `<section class="fsec"><h4>${title}${side}${note ? `<span class="hint">${note}</span>` : ""}</h4><div class="fgrid">${body}</div></section>`;
  const P = {
    title: `<label class="field full"><span>タイトル</span><input id="f-t" autocomplete="off" placeholder="例：薬屋のひとりごと 第3期" value="${esc(f.t)}"></label>`,
    kind: `<div class="field"><span>ジャンル</span><div class="segc" role="group" aria-label="ジャンル">${seg(
      "data-fk",
      [
        ["a", "アニメ", "ka"],
        ["d", "ドラマ", "kd"],
        ["f", "映画", "kf"],
        ["r", "バラエティ", "kr"],
      ],
      f.k,
    )}</div></div>`,
    status: `<div class="field"><span>ステータス</span><div class="segc" role="group" aria-label="ステータス">${seg(
      "data-fs",
      STATUSES.map(s => [s, stLabel(s)]),
      f.s,
    )}</div></div>`,
    series: `<div class="field full" id="fSeries"><span>シリーズ</span>${ddBtn("ser")}</div>`,
    /* 放送形態：ジャンル映画は出さず「公開（映画館／配信）」だけ。バラエティは TV／配信 の2つ。どのジャンルでも映画なら公開を選べる */
    /* 放送形態・放送局・配信サイト：PCでは1行に横並び（スマホは縦） */
    media: `<div class="frow3 full">${f.k === "f" ? "" : `<div class="field" id="fMedia"><span>放送形態</span>${ddBtn("media")}</div>`}
      ${f.media === "movie" ? `<div class="field"${f.k === "f" ? ' id="fMedia"' : ""}><span>公開</span><div class="segc" role="group" aria-label="公開">${seg("data-frel", [["", "映画館"], ["stream", "配信"]], f.rel || "")}</div></div>` : ""}
      ${hasSt(f.media) ? `<div class="field"><span>放送局</span>${ddBtn("st")}</div>` : ""}
      ${f.media === "stream" ? `<div class="field"><span>配信サイト</span>${ddBtn("plat")}</div>` : ""}
      ${f.media !== "stream" ? `<div class="field"><span>配信サイト</span>${ddBtn("vods")}</div>` : ""}</div>`,
    from: `<label class="field"><span>${{ movie: "公開日", ova: "発売日（第1話）", sp: "放送日" }[f.media] || "開始日（第1話）"}</span><span class="dtw"><input id="f-from" class="dtx" type="text" inputmode="numeric" autocomplete="off" placeholder="2018/08/25" value="${esc(dtShow(f.from))}"><button type="button" class="dtcal" data-dtcal="f-from" aria-label="カレンダーから選ぶ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></button><input type="date" class="dtpick" tabindex="-1" aria-hidden="true" data-dtfor="f-from"></span></label>`,
    time:
      noSched(f.media)
        ? ""
        : `<div class="field"><label class="field" for="f-time"><span>${f.media === "stream" ? "配信時間" : "放送時間"}</span></label><input id="f-time" placeholder="23:30　深夜は 25:00" inputmode="numeric" autocomplete="off" value="${esc(f.time)}">${nofBox("time", f.media === "stream" ? "配信時間" : "放送時間")}</div>`,
    sched: `<div class="field full"><div class="sched" id="schedHint">${schedText()}</div>
        </div>`,
    cours:
      noSched(f.media)
        ? ""
        : `<div class="field full"><span>放送クール</span>
        <div class="cours" id="coursBox">${f.cours.includes(ALLYEAR) ? `<span class="tag static">通年</span>` : ""}${dyn.map(c => `<button type="button" class="tag" data-courdel="${c}" aria-label="${courLabel(c)}を外す">${courLabel(c)}</button>`).join("")}${!f.cours.length ? `<span class="none">未設定</span>` : ""}
          ${sug && !f.cours.includes(sug) && !f.cours.includes(ALLYEAR) ? `<button type="button" class="sugbtn" data-courkey="${sug}">＋ ${courLabel(sug)}</button>` : ""}
          ${(() => {
            /* 2クール目以降：選んだ最後のクールの次をワンタップで */
            const last = dyn.filter(c => /^\d{4}/.test(c)).sort().pop();
            if (!last || f.cours.includes(ALLYEAR)) return "";
            const si = SEASONS.indexOf(last.slice(4)),
              nx = si === 3 ? `${+last.slice(0, 4) + 1}${SEASONS[0]}` : `${last.slice(0, 4)}${SEASONS[si + 1]}`;
            return f.cours.includes(nx) ? "" : `<button type="button" class="sugbtn" data-courkey="${nx}">＋ ${courLabel(nx)}</button>`;
          })()}
          <button type="button" class="sugbtn${f.cours.includes(ALLYEAR) ? " on" : ""}" data-courall="1" aria-pressed="${f.cours.includes(ALLYEAR)}">${f.cours.includes(ALLYEAR) ? "✓ 通年" : "＋ 通年"}</button>
          <button type="button" class="sugbtn ghost fdd-mini" data-fdd="cour" aria-haspopup="listbox" aria-expanded="${ddOpen === "cour"}">ほかのクール ${DD_CHEV}</button></div>${nofBox("cours")}</div>`,
    songs: `<div class="field full">
        <div class="sglist" id="sgList">${songRowsHtml()}</div>
        ${songTypes.includes("挿入歌") && !f.songs.some(x => x.type === "挿入歌") ? `<div class="chips" style="margin-top:2px"><button type="button" data-sgadd="挿入歌">＋ 挿入歌</button></div>` : ""}
</div>`,
    /* 関連放送（旧作・再放送など）：タイトル・放送開始と終了・主題歌。主題歌の行は作品の主題歌と同じ作り */
    relb: `<label class="field full"><span>タイトル</span><input id="f-rbt" type="text" autocomplete="off" placeholder="HUNTER×HUNTER（1999年版）・再放送 など" value="${esc(f.rbT || "")}"></label>
        ${dtField("f-rbf", "放送開始", f.rbF)}${dtField("f-rbto", "放送終了", f.rbTo)}
        <div class="field full"><span>主題歌</span><div class="sglist" id="sgList">${songRowsHtml()}</div></div>`,
    url: `<div class="field full"><label class="field" for="f-url"><span>公式サイト</span></label><input id="f-url" type="url" inputmode="url" autocomplete="off" placeholder="https://" value="${esc(f.url)}">${nofBox("url")}</div>`,
    /* 配信URL：配信サイトを選んだときだけ出す（選んだサイトが1つならその名前を見出しに） */
    vurl: (() => {
      const sites = f.media === "stream" ? f.plat : f.vods;
      if (!sites.length && f.only !== "f-vurl") return "";
      return `<div class="field full"><label class="field" for="f-vurl"><span>${sites.length === 1 ? `${esc(sites[0])}のURL` : "配信URL"}</span></label><input id="f-vurl" type="url" inputmode="url" autocomplete="off" placeholder="https://www.netflix.com/title/…" value="${esc(f.vurl)}">${nofBox("vurl")}</div>`;
    })(),
    /* しょぼいカレンダーの作品ページ（アニメだけ。各話リストの貼り付け画面の欄と同じ） */
    syoboi: f.k === "a" ? `<div class="field full"><label class="field" for="f-syoboi"><span>しょぼいカレンダー</span></label><input id="f-syoboi" type="url" inputmode="url" autocomplete="off" placeholder="https://cal.syoboi.jp/tid/…" value="${esc(f.syoboi || "")}"></div>` : "",
  };
  if (f.only && ONLY_A[f.only]) {
    let [lab, keys] = ONLY_A[f.only];
    /* OP・ED・主題歌の「なし」は見出しの行の右に（曲が1曲もないときだけ） */
    const sgNone = f.only === "sgList" ? sgNoneBox() : "";
    return `<div class="hdrow"><h3 class="onlyh"><small>${esc(f.t)}</small>${lab}を編集</h3>${sgNone}<button class="close" type="button" data-back="1" aria-label="戻る">✕</button></div>
    <form id="titleF" novalidate><div class="fgrid only">${keys.map(k => P[k]).join("")}</div>
    <div class="ffoot">${f.only === "relb" && f.rbK !== "new" ? `<button type="button" class="delsm" id="rbDel" aria-label="この関連放送を削除">削除</button>` : ""}<button type="button" class="u-btn ghost" data-back="1">キャンセル</button><button class="u-btn pri primary" type="submit">保存する</button></div></form>`;
  }
  return `<div class="hdrow"><h3>${f.id ? "作品を編集" : "作品を追加"}</h3><button class="close" type="button" data-close aria-label="閉じる">✕</button></div>
    <form id="titleF" novalidate>
    ${sec("基本情報", P.title + P.kind + P.status + P.series + P.url + P.syoboi)}
    ${sec("放送", P.media + P.vurl + P.from + P.time + P.cours)}
    ${sec("OP・ED・主題歌", P.songs, "", sgNoneBox())}
    <div class="ffoot"><button type="button" class="u-btn ghost" data-close>キャンセル</button><button class="u-btn pri primary" type="submit">${f.id ? "保存する" : "追加する"}</button></div>
    </form>`;
}
function seg(attr, opts, cur) {
  return opts
    .map(
      ([v, l, c]) =>
        `<button type="button" ${attr}="${v}" class="${c || ""}" aria-pressed="${String(cur) === String(v)}">${l}</button>`,
    )
    .join("");
}
function readForm() {
  if (!$("#titleF")) return;
  const g = id => $(id)?.value;
  const v = (id, key) => {
    const x = g(id);
    if (x !== undefined) form[key] = x;
  };
  v("#f-t", "t");
  v("#f-time", "time");
  if ($("#f-from")) form.from = normDate($("#f-from").value) || "";
  v("#f-url", "url");
  v("#f-vurl", "vurl");
  v("#f-syoboi", "syoboi");
  v("#f-rbt", "rbT");
  if ($("#f-rbf")) form.rbF = normDate($("#f-rbf").value) || "";
  if ($("#f-rbto")) form.rbTo = normDate($("#f-rbto").value) || "";
  v("#f-sernew", "serNewName");
  const cy = g("#f-cy");
  if (cy) form.cy = +cy;
  document.querySelectorAll("#titleF .nof").forEach(c => {
    const l = (form.noF || []).filter(x => x !== c.value);
    form.noF = c.checked ? [...l, c.value] : l;
  });
  if ($("#sgList")) form.noSongs = document.querySelector(".nos:checked") ? [...SONG_MAIN] : [];
  if ($("#sgList"))
    form.songs = [...document.querySelectorAll("[data-sg]")].map(r => {
      const one = !!r.querySelector(".sg-one")?.checked;
      let a = r.querySelector(".sg-a").value,
        b = one ? a : r.querySelector(".sg-b").value;
      /* 話数リストの最初・最後と同じ数字は空で持つ（話数が増えても表示が追いつくように） */
      if (!one && form.span) {
        if (a !== "" && +a === form.span[0]) a = "";
        if (b !== "" && +b === form.span[1]) b = "";
      }
      const old = form.songs[+r.dataset.sg];
      return {
        /* 主題歌メニューで付けた「DL済み」は、編集しても消さない */
        ...(old && old.dl ? { dl: true } : {}),
        type: r.querySelector(".sg-t").value,
        st: r.querySelector(".sg-st").value,
        ar: r.querySelector(".sg-ar").value,
        s: songJoin(r.querySelector(".sg-st").value, r.querySelector(".sg-ar").value),
        a: a === "" ? null : +a,
        b: b === "" ? null : +b,
        /* 飛び飛びの追加の話（「最初」が空の行は捨てない：入力途中でも消えないように残す） */
        ...(r.querySelector(".sg-x")
          ? {
              ex: [...r.querySelectorAll(".sg-x")].map(e => {
                const xa = e.querySelector(".sg-xa").value,
                  xb = e.querySelector(".sg-xb").value;
                return { a: xa === "" ? null : +xa, b: xb === "" ? null : +xb };
              }),
            }
          : {}),
        ...(one ? { one: 1 } : {}),
      };
    });
}
function redrawForm() {
  const sh = $(".sheet.form") || $("#layer .sheet");
  const y = sh.scrollTop;
  $("#formIn").innerHTML = formHtml();
  sh.scrollTop = y;
}
/* 編集画面の一部だけ描き直す（sels に合う所を、今の form で作った中身と入れかえる） */
function redrawParts(sels) {
  const box = $("#formIn");
  if (!box) return;
  const t = document.createElement("template");
  t.innerHTML = formHtml();
  sels.forEach(s => {
    const a = box.querySelector(s),
      b = t.content.querySelector(s);
    if (a && b) a.replaceWith(b);
  });
}
/* 作品の追加・編集画面を開く。it＝編集する作品（なければ追加）、target・el＝詳細で押した項目（その項目だけ詳細の中で編集） */
function openForm(it, target, el) {
  epEdit = null;
  const y = new Date().getFullYear();
  if (it) {
    const m = mediaOf(it);
    form = {
      id: it.id,
      k: it.k,
      t: it.t,
      s: it.s || "未視聴",
      dow: it.dow ?? -1,
      time: it.time || "",
      from: it.from || "",
      media: m.media,
      rel: it.rel || "",
      stations: [...m.stations],
      plat: [...m.plat],
      vods: [...m.vods],
      songs: songsOf(it).map(x => ({ ...x })),
      span: epSpan(it),
      noSongs: [...(it.noSongs || [])],
      noF: [...(it.noF || [])],
      series: it.series || "",
      url: it.url || "",
      vurl: it.vurl || "",
      syoboi: it.syoboi || "",
      cours: [...coursOf(it)],
      cy: yearOf(it) || y,
    };
  } else
    form = {
      id: null,
      k: state.mode === "s" ? "r" : state.mode === "m" ? (state.sub === "a" ? "a" : "f") : state.mode === "d" ? "d" : "a",
      t: "",
      s: "未視聴",
      dow: -1,
      time: "",
      from: "",
      media: state.mode === "m" ? "movie" : state.mode === "s" ? "stream" : "tv",
      stations: [],
      plat: [],
      vods: [],
      songs: [],
      noF: [],
      series: state.series.length === 1 ? state.series[0] : "",
      url: "",
      vurl: "",
      syoboi: "",
      cours: [],
      cy: y,
    };
  /* 関連放送の編集：主題歌の欄はその関連放送の曲に入れ替えて開く（保存も関連放送にだけ書く） */
  if (it && target === "relb") {
    const k = el && el.dataset && el.dataset.rbk != null ? el.dataset.rbk : "new";
    const r = k === "new" ? {} : (it.relb || [])[+k] || {};
    Object.assign(form, { rbK: k, rbT: r.t || "", rbF: r.from || "", rbTo: r.to || "", songs: (r.songs || []).map(x => ({ ...x })) });
  }
  sgOpen = new Set();
  /* 1話だけの曲（最初＝最後）は「1話だけ」にチェックを入れて開く */
  form.songs.forEach(x => {
    if (x.a != null && x.b === x.a) x.one = 1;
  });
  /* 使われた話が空の曲は空のまま開く（空＝全話。開いて保存しただけで範囲が入らないように） */
  /* 項目を指定したときは、作品の詳細の中でその項目だけ編集する */
  if (it && ONLY_A[target]) return openInlineForm(target, el);
  form.fromDetail = !!it && openId === it.id; // 詳細から開いたか（戻るときに前・次の並びを引き継ぐ）
  openId = null;
  $("#layer").innerHTML =
    `<div class="scrim" data-close></div><div class="sheet form" role="dialog" aria-modal="true" aria-label="${form.id ? "作品を編集" : "作品を追加"}"><div class="wrap" id="formIn">${formHtml()}</div></div>`;
  readForm();
  form.init = JSON.stringify({ ...form, init: 0 });
  if (!TOUCH) $("#f-t").focus({ preventScroll: true });
}
/* 作品の詳細画面で、押した項目をその場で編集する（編集画面は開かない）
   Enter・保存で保存、詳細の別の場所を押すと保存して閉じる、✕・キャンセル・Escで取り消し */
function inlineAnchor(target, el) {
  /* 押した場所の下に出す。押した場所が描き直しで消えていたら、見えている同じ項目を探す */
  if (!el || !el.isConnected) {
    const l = [...document.querySelectorAll(`#sheetIn [data-jump="${target}"]`)];
    el = l.find(x => x.offsetParent !== null) || l[0];
  }
  if (!el) return null;
  /* 未入力アラート（上に固定の見出しの中）から開いたときは、見出しの中ではなく見出しのすぐ下に出す。
     見出しの中に出すと、固定の見出しが伸びてスクロールや矢印キーでの移動がおかしくなるため */
  if (el.closest(".dhead")) return el.closest(".dhead");
  if (target === "relb" && el.closest(".links")) return el.closest(".links");
  return el.closest(".icard,.dmiss,.ilinks") || el;
}
function openInlineForm(target, el) {
  const anc = inlineAnchor(target, el);
  if (!anc) {
    form = null;
    return;
  }
  form.only = target;
  form.inline = true;
  document.querySelectorAll("#sheetIn .ined").forEach(x => x.remove());
  document.querySelectorAll("#sheetIn .icard[hidden]").forEach(x => (x.hidden = false));
  /* カードの「編集」ボタンから開いたときは、そのカードの場所がそのまま編集画面になる（元の表示は隠す） */
  const inCard = !!(el && el.closest && el.closest(".iedit") && anc.classList.contains("icard"));
  anc.insertAdjacentHTML(inCard ? "beforebegin" : "afterend", `<div class="ined${inCard ? " incard" : ""}" id="formIn">${formHtml()}</div>`);
  if (inCard) anc.hidden = true;
  readForm();
  form.init = JSON.stringify({ ...form, init: 0 });
  const box = $("#formIn");
  const sh = box.closest(".sheet");
  if (anc.classList.contains("dhead") && sh) sh.scrollTop = 0;
  else if (inCard && sh) {
    /* 編集画面の上端を、上に固定の見出しのすぐ下に合わせる（長い編集画面でも一番下へ飛ばない） */
    const hd = sh.querySelector(".dhead");
    const top = sh.getBoundingClientRect().top + (hd ? hd.getBoundingClientRect().height : 0) + 8;
    const d = box.getBoundingClientRect().top - top;
    sh.scrollTop += d;
  } else if (typeof navScroll === "function") navScroll(box);
  else box.scrollIntoView({ block: "nearest" });
  const i = box.querySelector(".fgrid.only input:not([type=date]):not([type=checkbox]):not([type=file])");
  if (i && !TOUCH) i.focus({ preventScroll: true });
}
function closeInlineForm() {
  closeDD();
  form = null;
  document.querySelectorAll("#sheetIn .ined").forEach(x => x.remove());
  document.querySelectorAll("#sheetIn .icard[hidden]").forEach(x => (x.hidden = false));
}
/* 変更があれば保存、なければ閉じるだけ */
function commitInlineForm() {
  if (!form || !form.inline) return;
  readForm();
  if (JSON.stringify({ ...form, init: 0 }) === form.init) closeInlineForm();
  else submitForm();
}
/* 編集画面の中身から、保存する項目を作る */
function buildPatch(f) {
  const t = (f.t || "").trim();
  const songs = f.songs
    .map(({ ex, one, dl, ...x }) => {
      /* 飛び飛びの話：「最初」が空の行は保存しない。最後が最初より小さいときは入れ替える */
      const e = (ex || []).filter(r => r && r.a != null).map(r => (r.b != null && r.b < r.a ? { a: r.b, b: r.a } : r.b === r.a ? { a: r.a, b: null } : r));
      return { ...x, ...(e.length ? { ex: e } : {}), st: (x.st ?? x.s ?? "").trim(), ar: (x.ar || "").trim(), s: (x.s || "").trim() };
    })
    .filter(x => x.s);
  const isMovie = noSched(f.media);
  const patch = {
    k: f.k,
    t,
    s: f.s,
    dow: isMovie || (f.noF || []).includes("time") || !f.from ? -1 : dowOfDate(f.from),
    time: isMovie ? "" : (f.time || "").trim().replace("：", ":"),
    from: f.from || "",
    media: f.media,
    rel: f.media === "movie" && f.rel === "stream" ? "stream" : "",
    stations: hasSt(f.media) ? f.stations : [],
    plat: f.media === "stream" ? f.plat : [],
    vods: f.media === "stream" ? [] : f.vods,
    cours: isMovie ? [] : f.cours,
    songs,
    noSongs: songs.length ? [] : f.noSongs || [],
    noF: [],
    series: (f.series || "").trim(),
    url: (f.url || "").trim(),
    vurl: normVurl(f.vurl),
    ...(f.k === "a" ? { syoboi: (f.syoboi || "").trim() } : {}),
  };
  /* 入力した項目の「なし」は自動で外す */
  /* 「なし」にした項目は入力欄を隠しているので、残っている値は消して「なし」を優先 */
  const clr = {
    time: () => (patch.time = ""),
    st: () => (patch.stations = []),
    plat: () => (patch.plat = []),
    vods: () => (patch.vods = []),
    cours: () => (patch.cours = []),
    url: () => (patch.url = ""),
    vurl: () => (patch.vurl = ""),
  };
  patch.noF = [...new Set(f.noF || [])].filter(k => k in clr);
  patch.noF.forEach(k => clr[k]());
  return patch;
}
/* 関連放送を保存（k＝何番目か。null で削除） */
async function saveRelb(f, del) {
  const it = items.find(x => x.id === f.id);
  if (!it) return;
  const l = (it.relb || []).map(x => ({ ...x }));
  const k = f.rbK === "new" ? -1 : +f.rbK;
  if (del) {
    if (k >= 0) l.splice(k, 1);
  } else {
    const r = { t: (f.rbT || "").trim(), from: f.rbF || "", to: f.rbTo || "", songs: buildPatch(f).songs };
    if (!r.t && !r.from && !r.to && !r.songs.length) {
      closeInlineForm();
      return;
    }
    if (k >= 0) l[k] = r;
    else l.push(r);
  }
  form = null;
  await saveTitle(f.id, { relb: l }, del ? "関連放送を削除しました" : "保存しました");
}
async function submitForm() {
  readForm();
  const f = form;
  if (f.only === "relb") return saveRelb(f);
  const t = (f.t || "").trim();
  if (!t) {
    $("#f-t").focus();
    toast("タイトルを入れてください");
    return;
  }
  const patch = buildPatch(f);
  /* 開いたときから変わった項目だけ保存する（触っていない項目で、ほかの端末の変更を消さないため） */
  if (f.id && f.init) {
    const base = buildPatch(JSON.parse(f.init));
    Object.keys(patch).forEach(key => JSON.stringify(patch[key]) === JSON.stringify(base[key]) && delete patch[key]);
    if (!Object.keys(patch).length) {
      if (f.inline) closeInlineForm();
      else {
        close();
        openDetail(f.id, 0, f.fromDetail);
      }
      return;
    }
  }
  if (f.id && f.inline) {
    form = null;
    await saveTitle(f.id, patch, "保存しました");
    return;
  }
  if (f.id) {
    const id = f.id;
    close();
    await saveTitle(id, patch, "保存しました");
    openDetail(id, 0, f.fromDetail);
    return;
  }
  const id = "u" + Date.now().toString(36);
  patch.added = Date.now();
  close();
  await saveTitle(id, patch, "追加しました");
}
/* ポップアップ表示中は背景を固定する（共通部品 U.lock） */
const TOUCH = U.TOUCH;
const lockScroll = U.lock;
new MutationObserver(() => lockScroll(!!$("#layer").firstElementChild)).observe($("#layer"), { childList: true });
/* 作品の追加・編集画面：入力中の内容を読み取ってから変えて、描き直す */
let sgExK = -1; // 飛び飛びの話を足した曲（足したあとその入力欄へ移るため）
const formEdit = (fn, after) => el => {
  readForm();
  fn(el);
  redrawForm();
  if (after) after();
};
const FORM_ACTIONS = [
  [
    "#rbDel",
    el => {
      if (!form) return;
      /* 1回目は確認（もう1回押すと削除） */
      if (!el.classList.contains("armed")) {
        el.classList.add("armed");
        el.textContent = "もう一度押す";
        return;
      }
      saveRelb(form, true);
    },
  ],
  ["[data-fm]", formEdit(el => (form.media = el.dataset.fm))],
  ["[data-frel]", formEdit(el => (form.rel = el.dataset.frel))],
  [
    "[data-fdd]",
    el => {
      const k = el.dataset.fdd;
      if (ddOpen === k) return closeDD(true);
      openDD(k, el);
    },
  ],
  /* シリーズ：別のジャンルのシリーズからも探す */
  [
    "[data-fserall]",
    () => {
      form.serAll = true;
      const b = $("#fSerSug");
      if (b) b.innerHTML = serSugForm($("#f-serq")?.value || "");
    },
  ],
  ["[data-fser]", formEdit(el => (form.series = el.dataset.fser))],
  ["[data-fserdel]", formEdit(() => (form.series = ""), () => !TOUCH && $("#f-serq")?.focus())],
  [
    "[data-fsernew]",
    formEdit(
      el => {
        form.serNew = el.dataset.fsernew === "1";
        form.serNewName = $("#f-serq")?.value || "";
      },
      () => !TOUCH && $("#f-sernew")?.focus(),
    ),
  ],
  [
    "[data-fsercreate]",
    () => {
      readForm();
      const n = (form.serNewName || "").trim();
      if (!n) return toast("シリーズ名を入れてください");
      form.series = n;
      form.serNew = false;
      /* 新しく作ったシリーズのメインのジャンルは、作った作品のジャンルにする */
      if (!M("series").includes(n)) {
        master = { ...master, seriesMain: { ...(master.seriesMain || {}), [n]: serGroup(form.k) } };
        saveMaster();
      }
      redrawForm();
      toast(`シリーズ「${n}」を作りました`);
    },
  ],
  /* 曲を追加：前の曲の続きの話から最後の話まで */
  [
    "[data-sgadd]",
    formEdit(
      el => {
        const tp = el.dataset.sgadd;
        const same = form.songs.filter(x => x.type === tp);
        const last = same[same.length - 1];
        const sp = form.span;
        let nu;
        /* 前の曲が「1話だけ」なら、次の曲もその次の1話だけ（例：1話→2話→3話…） */
        if (last && last.one && last.a != null) nu = { a: last.a + 1, b: last.a + 1, one: 1 };
        /* 前の曲の範囲の続き（例：1〜6話の次は7〜最後）。それ以外は空（＝全話） */
        else if (last && last.b != null && sp && last.b < sp[1]) nu = { a: last.b + 1, b: sp[1] };
        else nu = { a: null, b: null };
        /* 同じ種類の最後の曲のすぐ後ろに入れる（種類ごとの並びを保つ） */
        const at = last ? form.songs.lastIndexOf(last) + 1 : form.songs.length;
        form.songs.splice(at, 0, { type: tp, s: "", st: "", ar: "", ...nu });
        sgOpen = new Set([...[...sgOpen].map(k => (k >= at ? k + 1 : k)), at]);
        sgAddK = at;
      },
      () => {
        const c = document.querySelector(`.sg[data-sg="${sgAddK}"]`);
        if (!c) return;
        if (!TOUCH) c.querySelector(".sg-st")?.focus({ preventScroll: true });
        c.scrollIntoView({ block: "nearest" });
      },
    ),
  ],
  [
    "[data-sgdel]",
    formEdit(el => {
      const d = +el.dataset.sgdel;
      form.songs.splice(d, 1);
      sgOpen = new Set([...sgOpen].filter(k => k !== d).map(k => (k > d ? k - 1 : k)));
    }),
  ],
  /* 1話だけ：チェックで「最後」の欄を出したり隠したり */
  ["[data-sgone]", formEdit(() => {})],
  /* 曲をたたむ／開く（同じ種類に2曲以上あるときだけ） */
  [
    "[data-sgfold]",
    formEdit(el => {
      const k = +el.dataset.sgfold;
      if (sgOpen.has(k)) sgOpen.delete(k);
      else sgOpen.add(k);
    }),
  ],
  [
    "[data-sgfoldall]",
    formEdit(el => {
      const ks = form.songs.map((x, k) => [x, k]).filter(([x]) => x.type === el.dataset.sgfoldall);
      const anyOpen = ks.some(([, k]) => sgOpen.has(k));
      ks.forEach(([, k]) => (anyOpen ? sgOpen.delete(k) : sgOpen.add(k)));
    }),
  ],
  /* 飛び飛びの話：行を足す／消す */
  [
    "[data-sgex]",
    formEdit(
      el => {
        sgExK = +el.dataset.sgex;
        const x = form.songs[sgExK];
        if (x) x.ex = [...(x.ex || []), { a: null, b: null }];
      },
      () => {
        const l = document.querySelectorAll(`.sg[data-sg="${sgExK}"] .sg-xa`);
        if (!TOUCH && l.length) l[l.length - 1].focus();
      },
    ),
  ],
  [
    "[data-sgxdel]",
    formEdit(el => {
      const [k, j] = el.dataset.sgxdel.split(":").map(Number);
      const x = form.songs[k];
      if (x && x.ex) x.ex.splice(j, 1);
    }),
  ],
  /* ジャンル・ステータス。映画は放送形態も映画に、配信番組は配信に */
  [
    "[data-fk],[data-fs]",
    formEdit(el => {
      if (el.dataset.fk) {
        form.k = el.dataset.fk;
        if (form.k === "f") form.media = "movie";
        if (form.k === "r" && form.media !== "tv" && form.media !== "stream") form.media = "stream";
      }
      if (el.dataset.fs) form.s = el.dataset.fs;
    }),
  ],
  /* 放送クール */
  [
    "[data-courkey]",
    formEdit(el => {
      if (!form.cours.includes(el.dataset.courkey)) form.cours.push(el.dataset.courkey);
      form.cours.sort();
    }),
  ],
  [
    "[data-courall]",
    formEdit(() => {
      const on = form.cours.includes(ALLYEAR);
      form.cours = form.cours.filter(c => c !== ALLYEAR);
      if (!on) form.cours.unshift(ALLYEAR);
    }),
  ],
  ["[data-courdel]", formEdit(el => (form.cours = form.cours.filter(c => c !== el.dataset.courdel)))],
];
/* 詳細の中でその場で編集しているとき：✕で取り消し、外を押したら保存して閉じる（別の項目を押したらそのまま次を編集） */
function onTitleFormClick(e) {
  if (form && form.inline) {
    if (e.target.closest(".ined [data-back]")) {
      closeInlineForm();
      return true;
    }
    /* 描き直しで消えた場所へのクリックは「外を押した」ではない */
    if (!e.target.isConnected) return true;
    if (!e.target.closest(".ined")) {
      const jp = e.target.closest("#sheetIn [data-jump]");
      const tgt = jp && jp.dataset.jump;
      commitInlineForm();
      closeInlineForm();
      if (!tgt || e.target.closest("a,button:not([data-jump])")) return false; // ほかのボタン（閉じる・タブなど）はそのまま動かす
      const it = items.find(x => x.id === openId);
      if (it) openForm(it, tgt, jp);
      return true;
    }
  }
  return !!form && runActions(FORM_ACTIONS, e);
}

/* 曲の並び替え：⠿を押さえたまま上下に動かす（同じ種類の中だけ）。
   画面の並び＝保存する並びなので、入力内容を読み直してたたみ状態だけ番号を付けかえる */
SORT_DONE.sg = () => {
  if (!form) return;
  const old = [...document.querySelectorAll("#sgList [data-sg]")].map(c => +c.dataset.sg);
  readForm();
  sgOpen = new Set(old.map((k, i) => (sgOpen.has(k) ? i : -1)).filter(i => i >= 0));
  redrawForm();
};
