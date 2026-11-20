/* ===================== 編集画面のプルダウン（放送形態・放送局・配信サイト・シリーズ・ほかのクール・整形の表の列） ===================== */
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
