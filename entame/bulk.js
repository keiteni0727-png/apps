/* ---------- 一括選択・一括編集（ライブラリ） ----------
   「選択」を押すと選択モード。行を押すと選ぶ／外す、見出しの「全部選ぶ」でグループごと、下の帯から一括編集 */
let bsel = null; // 選択モード中は選んだ作品の id の Set、ふだんは null
let bGroups = new Map(); // 見出しのキー → その見出しの作品 id（groupedHtml が描くたびに入れ直す）
let bOpen = ""; // 一括編集の画面で開いている項目
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

/* ---------- 一括編集の画面 ---------- */
const bItems = () => items.filter(i => bsel && bsel.has(i.id));
const B_NOF = [...Object.entries(NOF_LAB).map(([k, l]) => [k, l]), ["OP", "OP"], ["ED", "ED"], ["主題歌", "主題歌"]];
function bulkHtml() {
  const n = bsel.size;
  const sec = (k, ic, lab, body) =>
    `<div class="bsec${bOpen === k ? " open" : ""}${k === "del" ? " dng" : ""}"><button type="button" class="bhd" data-bopen="${k}" aria-expanded="${bOpen === k}"><span class="bic" aria-hidden="true">${ic}</span>${lab}<span class="bchev" aria-hidden="true">${bOpen === k ? "▾" : "›"}</span></button>${bOpen === k ? `<div class="bbody">${body}</div>` : ""}</div>`;
  const chip = (attr, v, on, l, st = "") => `<button type="button" ${attr}="${esc(v)}" aria-pressed="${!!on}"${st}>${esc(l)}</button>`;
  const apply = (lab = `${n}件に適用`) => `<div class="bap"><button type="button" class="u-btn" data-bopen="">キャンセル</button><button type="button" class="u-btn pri" data-bapply="${bOpen}">${lab}</button></div>`;
  const d = bDraft;
  const ser = M("series");
  return `<div class="hdrow"><h3>${n}件をまとめて変える</h3><button class="close" type="button" data-close aria-label="閉じる">✕</button></div>
    <div class="blist">
    ${sec("st", "◉", "視聴ステータス", `<div class="chips">${STATUSES.map(v => chip("data-bv", v, d.st === v, stLabel(v))).join("")}</div>${apply()}`)}
    ${sec("ser", "▤", "シリーズ", `<input id="bSer" list="bSerL" value="${esc(d.ser || "")}" placeholder="シリーズ名（登録済みから選ぶか、新しく入力）" autocomplete="off"><datalist id="bSerL">${ser.map(x => `<option value="${esc(x)}">`).join("")}</datalist><p class="hint">空のまま適用すると、シリーズを外します。</p>${apply()}`)}
    ${sec("vod", "▶", "見られる配信", `<div class="chips">${[["add", "足す"], ["del", "外す"], ["set", "置き換える"]].map(([v, l]) => chip("data-bvm", v, (d.vm || "add") === v, l)).join("")}</div><div class="chips">${M("vods").map(v => `<button type="button" data-bvod="${esc(v)}" aria-pressed="${(d.vods || []).includes(v)}" class="${VOD_COLOR[v] ? "vc" : ""}"${vcStyle(v)}>${esc(v)}</button>`).join("")}</div>${apply()}`)}
    ${sec("nof", "⊘", "「なし」の設定", `<div class="chips">${[["on", "なしにする"], ["off", "なしを外す"]].map(([v, l]) => chip("data-bnm", v, (d.nm || "on") === v, l)).join("")}</div><div class="chips">${B_NOF.map(([k, l]) => chip("data-bnof", k, (d.nof || []).includes(k), l + "なし")).join("")}</div><p class="hint">「なしにする」は、その項目に入っている値も消します（OP・ED・主題歌は曲が入っていない作品だけ）。</p>${apply()}`)}
    ${sec("ep", "✓", "全話を視聴済みにする／外す", `<div class="chips">${[["on", "全話を視聴済みにする"], ["off", "視聴済みを全部外す"]].map(([v, l]) => chip("data-bem", v, (d.em || "on") === v, l)).join("")}</div><p class="hint">話数が登録されている作品だけ変わります。ステータスも自動で変わります。</p>${apply()}`)}
    ${sec("del", "🗑", "削除", `<p class="hint">選んだ${n}件を削除します。削除のあと少しの間は「元に戻す」ができます。</p>${apply(d.delArm ? `もう一度押すと${n}件を削除` : `${n}件を削除`)}`)}
    </div>`;
}
function openBulk() {
  if (!bsel || !bsel.size) return;
  openId = null;
  form = null;
  bOpen = "";
  bDraft = {};
  lockScroll(true);
  $("#layer").innerHTML =
    `<div class="scrim" data-close></div><div class="sheet form bsheet" role="dialog" aria-modal="true" aria-label="一括編集"><div class="wrap" id="bIn">${bulkHtml()}</div></div>`;
}
function refreshBulk() {
  const el = $("#bIn");
  if (!el) return;
  if ($("#bSer")) bDraft.ser = $("#bSer").value;
  el.innerHTML = bulkHtml();
}
/* 作品ごとの変更をまとめて書く（変えた項目だけ） */
async function bPatchAll(fn, msg) {
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
function bApply(k) {
  const d = bDraft;
  if (k === "st") {
    if (!d.st) return toast("ステータスを選んでください");
    bPatchAll(it => (it.s === d.st ? null : { s: d.st }), "ステータス");
  } else if (k === "ser") {
    const v = ($("#bSer")?.value || "").trim();
    bPatchAll(it => ((it.series || "") === v ? null : { series: v }), "シリーズ");
  } else if (k === "vod") {
    const vs = d.vods || [];
    const vm = d.vm || "add";
    if (!vs.length && vm !== "set") return toast("配信サイトを選んでください");
    bPatchAll(it => {
      const cur = mediaOf(it).vods;
      const nx = vm === "set" ? [...vs] : vm === "add" ? [...new Set([...cur, ...vs])] : cur.filter(v => !vs.includes(v));
      return nx.length === cur.length && nx.every(v => cur.includes(v)) ? null : { vods: nx };
    }, "見られる配信");
  } else if (k === "nof") {
    const ks = d.nof || [];
    if (!ks.length) return toast("項目を選んでください");
    const on = (d.nm || "on") === "on";
    const songs = ks.filter(x => SONG_TYPES.includes(x)),
      fs = ks.filter(x => !SONG_TYPES.includes(x));
    const clr = { time: { time: "" }, st: { stations: [] }, plat: { plat: [] }, vods: { vods: [] }, cours: { cours: [] }, url: { url: "" }, vurl: { vurl: "" } };
    bPatchAll(it => {
      const nf0 = it.noF || [],
        ns0 = it.noSongs || [];
      const sl = songsOf(it);
      const nf = on ? [...new Set([...nf0, ...fs])] : nf0.filter(x => !fs.includes(x));
      const addS = on ? songs.filter(t => !sl.some(x => x.type === t && (x.s || "").trim())) : [];
      const ns = on ? [...new Set([...ns0, ...addS])] : ns0.filter(x => !songs.includes(x));
      const p = {};
      if (nf.length !== nf0.length) {
        p.noF = nf;
        if (on) fs.filter(x => !nf0.includes(x)).forEach(x => Object.assign(p, clr[x]));
      }
      if (ns.length !== ns0.length) p.noSongs = ns;
      return Object.keys(p).length ? p : null;
    }, "「なし」の設定");
  } else if (k === "ep") {
    if (syncBlock()) return;
    const on = (d.em || "on") === "on";
    let n = 0;
    bItems().forEach(it => {
      const l = episodes(it);
      if (!l.length || l.every(e => !!e.w === on)) return;
      const now = Date.now();
      saveEps(
        it,
        l.map(e => ({ ...e, w: on, wt: on ? e.wt || now : 0 })),
      );
      n++;
    });
    toast(n ? `${n}件の話数を${on ? "全話視聴済みに" : "未視聴に"}しました` : "変わった作品はありませんでした");
  } else if (k === "del") {
    if (!d.delArm) {
      d.delArm = true;
      refreshBulk();
      return;
    }
    const list = bItems();
    const prev = list.map(it => [it.id, { ...(over[it.id] || {}) }]);
    list.forEach(it => delete over[it.id]);
    bsel = new Set();
    rebuild();
    close();
    render();
    list.forEach(it => removeDoc("titles", it.id).catch(fail));
    toastUndo(`${list.length}件を削除しました`, () => {
      prev.forEach(([id, o]) => {
        over[id] = o;
        saveDoc("titles", id, o).catch(fail);
      });
      rebuild();
      render();
    });
    return;
  }
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
  [
    "[data-bopen]",
    el => {
      bOpen = bOpen === el.dataset.bopen ? "" : el.dataset.bopen;
      bDraft.delArm = false;
      refreshBulk();
    },
  ],
  ["[data-bv]", el => ((bDraft.st = el.dataset.bv), refreshBulk())],
  ["[data-bvm]", el => ((bDraft.vm = el.dataset.bvm), refreshBulk())],
  [
    "[data-bvod]",
    el => {
      const v = el.dataset.bvod,
        l = bDraft.vods || [];
      bDraft.vods = l.includes(v) ? l.filter(x => x !== v) : [...l, v];
      refreshBulk();
    },
  ],
  ["[data-bnm]", el => ((bDraft.nm = el.dataset.bnm), refreshBulk())],
  [
    "[data-bnof]",
    el => {
      const v = el.dataset.bnof,
        l = bDraft.nof || [];
      bDraft.nof = l.includes(v) ? l.filter(x => x !== v) : [...l, v];
      refreshBulk();
    },
  ],
  ["[data-bem]", el => ((bDraft.em = el.dataset.bem), refreshBulk())],
  ["[data-bapply]", el => bApply(el.dataset.bapply)],
];
function onBulkClick(e) {
  if ($("#bIn") && e.target.closest("#bIn")) return runActions(BULK_SHEET_ACTIONS, e);
  return runActions(BULK_ACTIONS, e);
}
