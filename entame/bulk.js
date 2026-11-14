/* ---------- 一括選択・一括編集（ライブラリ） ----------
   「選択」を押すと選択モード。行を押すと選ぶ／外す、見出しの「全部選ぶ」でグループごと、下の帯から一括編集 */
let bsel = null; // 選択モード中は選んだ作品の id の Set、ふだんは null
let bGroups = new Map(); // 見出しのキー → その見出しの作品 id（groupedHtml が描くたびに入れ直す）

let bDraft = {}; // 一括編集の画面の入力中の値
const bOn = () => !!bsel && state.mode !== "w" && state.mode !== "yt" && state.mode !== "h";

/* 件数の行の「選択」ボタン */
const bSelBtn = () =>
  `<button type="button" class="bselbtn${bsel ? " on" : ""}" data-bsel="toggle" aria-pressed="${!!bsel}">${bsel ? "✓ 選択中" : "選択"}</button>`;
/* 見出しの「全部選ぶ／外す」 */
function bGrpBtn(key) {
  if (!bOn()) return "";
  const ids = bGroups.get(key) || [];
  const all = ids.length && ids.every(id => bsel.has(id));
  return `<button type="button" class="bgrp" data-bgrp="${esc(key)}"><span class="bgl">このグループを</span>${all ? "外す" : "全部選ぶ"}</button>`;
}
/* 下の帯 */
function bDockHtml() {
  if (!bOn()) return "";
  const n = bsel.size;
  return `<div class="bdock" role="region" aria-label="一括選択"><b>${n}件選択中</b>
    <button type="button" data-ball="1">表示中を全部選ぶ</button>
    <span class="bsp"></span>
    <button type="button" data-bclear="1"${n ? "" : " disabled"}>解除</button>
    <button type="button" class="pri" data-bedit="1"${n ? "" : " disabled"}>一括編集</button>
    <button type="button" class="bx" data-bsel="toggle" aria-label="選択をやめる">✕</button></div>`;
}
function bRefresh() {
  /* 行のチェックと帯だけ書きかえる（全部描き直すと重いので） */
  document.querySelectorAll(".row.lst [data-id]").forEach(b => {
    const on = bsel && bsel.has(b.dataset.id);
    b.closest(".row").classList.toggle("bsel", !!on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  document.querySelectorAll("[data-bgrp]").forEach(b => (b.outerHTML = bGrpBtn(b.dataset.bgrp)));
  const d = $("#bdockw");
  if (d) d.innerHTML = bDockHtml();
}

/* ---------- 一括編集の画面：作品の編集画面と同じ形（セクション・項目名・下に保存）。項目ごとに「どうするか」を選ぶ
   今は放送クールだけ。項目は必要に応じて足す ---------- */
const bItems = () => items.filter(i => bsel && bsel.has(i.id));
const B_COP = [
  ["", "変更しない"],
  ["set", "置き換える"],
  ["add", "足す"],
  ["del", "外す"],
  ["none", "なしにする"],
];
function bulkHtml() {
  const d = bDraft;
  const list = bItems();
  const sch = list.filter(i => !noSched(mediaOf(i).media));
  const n = list.length,
    skip = n - sch.length;
  /* 選んだ作品の今のクール（多い順に少しだけ） */
  const cnt = {};
  sch.forEach(i => {
    const cs = coursOf(i);
    const ks = cs.length ? cs : [(i.noF || []).includes("cours") ? "なし" : "未設定"];
    ks.forEach(k => (cnt[k] = (cnt[k] || 0) + 1));
  });
  const now = Object.entries(cnt)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, v]) => `<span class="bnow">${esc(k === ALLYEAR ? "通年" : /^\d{4}/.test(k) ? courLabel(k) : k)}<small>${v}</small></span>`)
    .join("");
  const y = new Date().getFullYear();
  const years = [];
  for (let k = y + 1; k >= 1960; k--) years.push(k);
  const op = d.cop || "";
  const pick = op === "set" || op === "add" || op === "del";
  const dc = d.cours || [];
  const field = `<div class="field full"><span>放送クール</span>
      <div class="segc bop" role="radiogroup" aria-label="放送クールをどうするか">${B_COP.map(([v, l]) => `<button type="button" role="radio" data-bcop="${v}" aria-checked="${op === v}" aria-pressed="${op === v}">${l}</button>`).join("")}</div>
      ${pick ? `<div class="cours">${dc.includes(ALLYEAR) ? `<button type="button" class="tag" data-bcdel="${ALLYEAR}">通年</button>` : ""}${dc.filter(c => c !== ALLYEAR).map(c => `<button type="button" class="tag" data-bcdel="${c}" aria-label="${courLabel(c)}を外す">${courLabel(c)}</button>`).join("")}${dc.length ? "" : `<span class="none">${op === "del" ? "外すクールを選んでください" : "クールを選んでください"}</span>`}
        <button type="button" class="sugbtn${dc.includes(ALLYEAR) ? " on" : ""}" data-bcall="1" aria-pressed="${dc.includes(ALLYEAR)}">${dc.includes(ALLYEAR) ? "✓ 通年" : "＋ 通年"}</button></div>
        <div class="courpick"><select id="bCy" aria-label="年">${years.map(k => `<option ${k === (d.cy || y) ? "selected" : ""}>${k}</option>`).join("")}</select><div class="segc" role="group" aria-label="季節を追加">${SEASONS.map(x => `<button type="button" data-bcadd="${x}">${x}</button>`).join("")}</div></div>` : ""}
      <p class="hint" style="margin:6px 0 0">${{ "": "変えないときはこのまま。", set: "選んだクールに入れ替えます。", add: "今のクールはそのままで、選んだクールを足します。", del: "選んだクールを外します。", none: "クールを空にして「放送クールなし」にします（未入力アラートが出なくなります）。" }[op]}${skip ? `映画・OVA・TV SPの${skip}件は放送クールがないので変わりません。` : ""}</p>
      ${now ? `<div class="bnowl"><span class="hint">選んだ作品の今のクール</span>${now}</div>` : ""}</div>`;
  const sec = (title, body) => `<section class="fsec"><h4>${title}</h4><div class="fgrid">${body}</div></section>`;
  return `<div class="hdrow"><h3>${n}件をまとめて編集</h3><button class="close" type="button" data-close aria-label="閉じる">✕</button></div>
    <div class="bform">${sec("放送", field)}</div>
    <div class="ffoot"><button type="button" class="u-btn ghost" data-close>キャンセル</button><button type="button" class="u-btn pri primary" data-bsave="1"${op && (op === "none" || dc.length) ? "" : " disabled"}>${n}件に保存</button></div>`;
}
function openBulk() {
  if (!bsel || !bsel.size) return;
  openId = null;
  form = null;
  bDraft = { cy: new Date().getFullYear() };
  lockScroll(true);
  $("#layer").innerHTML =
    `<div class="scrim" data-close></div><div class="sheet form bsheet" role="dialog" aria-modal="true" aria-label="一括編集"><div class="wrap" id="bIn">${bulkHtml()}</div></div>`;
}
function refreshBulk() {
  const el = $("#bIn");
  if (!el) return;
  const cy = $("#bCy");
  if (cy) bDraft.cy = +cy.value;
  el.innerHTML = bulkHtml();
}
/* 作品ごとの変更をまとめて書く（変えた項目だけ） */
function bPatchAll(fn, msg) {
  const ch = [];
  bItems().forEach(it => {
    const p = fn(it);
    if (!p) return;
    over[it.id] = { ...(over[it.id] || {}), ...p };
    ch.push([it.id, p]);
  });
  rebuild();
  render();
  toast(ch.length ? `${ch.length}件の${msg}を変えました` : "変わった作品はありませんでした");
  for (const [id, p] of ch) mergeDoc("titles", id, p).catch(fail);
}
function bSave() {
  const d = bDraft,
    op = d.cop,
    dc = d.cours || [];
  if (!op) return;
  const same = (a, b) => a.length === b.length && a.every(x => b.includes(x));
  bPatchAll(it => {
    if (noSched(mediaOf(it).media)) return null;
    const cur = coursOf(it),
      nf = it.noF || [];
    let nx;
    if (op === "none") {
      if (!cur.length && nf.includes("cours")) return null;
      return { cours: [], noF: [...new Set([...nf, "cours"])] };
    }
    if (op === "set") nx = [...dc];
    else if (op === "add") nx = [...new Set([...cur, ...dc])];
    else nx = cur.filter(c => !dc.includes(c));
    const p = {};
    if (!same(nx, cur)) p.cours = nx;
    if (op !== "del" && nf.includes("cours")) p.noF = nf.filter(x => x !== "cours");
    return Object.keys(p).length ? p : null;
  }, "放送クール");
  close();
  bRefresh();
}
const BULK_ACTIONS = [
  [
    "[data-bsel]",
    () => {
      bsel = bsel ? null : new Set();
      document.body.classList.toggle("bmode", !!bsel);
      render();
    },
  ],
  [
    "[data-bgrp]",
    el => {
      const ids = bGroups.get(el.dataset.bgrp) || [];
      const all = ids.every(id => bsel.has(id));
      ids.forEach(id => (all ? bsel.delete(id) : bsel.add(id)));
      bRefresh();
    },
  ],
  [
    "[data-ball]",
    () => {
      filtered().forEach(i => bsel.add(i.id));
      bRefresh();
    },
  ],
  [
    "[data-bclear]",
    () => {
      bsel.clear();
      bRefresh();
    },
  ],
  ["[data-bedit]", () => openBulk()],
  /* 選択モード中は、行を押すと選ぶ／外す（詳細は開かない） */
  [
    ".row.lst [data-id]",
    el => {
      if (!bOn()) return false;
      const id = el.dataset.id;
      bsel.has(id) ? bsel.delete(id) : bsel.add(id);
      bRefresh();
    },
  ],
];
/* 一括編集の画面の中 */
const BULK_SHEET_ACTIONS = [
  ["[data-bcop]", el => ((bDraft.cop = el.dataset.bcop), refreshBulk())],
  [
    "[data-bcadd]",
    el => {
      const cy = $("#bCy");
      const k = `${cy ? cy.value : new Date().getFullYear()}${el.dataset.bcadd}`;
      const l = bDraft.cours || [];
      if (!l.includes(k)) bDraft.cours = [...l, k].sort((a, b) => (a === ALLYEAR ? -1 : b === ALLYEAR ? 1 : groupRank(a) - groupRank(b)));
      refreshBulk();
    },
  ],
  [
    "[data-bcall]",
    () => {
      const l = bDraft.cours || [];
      bDraft.cours = l.includes(ALLYEAR) ? l.filter(x => x !== ALLYEAR) : [ALLYEAR, ...l];
      refreshBulk();
    },
  ],
  [
    "[data-bcdel]",
    el => {
      bDraft.cours = (bDraft.cours || []).filter(x => x !== el.dataset.bcdel);
      refreshBulk();
    },
  ],
  ["[data-bsave]", () => bSave()],
];
function onBulkClick(e) {
  if ($("#bIn") && e.target.closest("#bIn")) return runActions(BULK_SHEET_ACTIONS, e);
  return runActions(BULK_ACTIONS, e);
}
