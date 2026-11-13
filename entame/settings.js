/* ===================== 設定：各種マスタの追加・名前変更・削除・並び替え、ログアウト ===================== */
let setKey = "series",
  setQ = "",
  setDel = null,
  setRen = null;
function commitRename(cancel) {
  const i = $(".mren");
  const from = setRen;
  setRen = null;
  if (!i || cancel) {
    refreshSettings();
    return;
  }
  const to = i.value.trim();
  if (!to || to === from) {
    refreshSettings();
    return;
  }
  const l = M(setKey);
  /* シリーズのメインのジャンルも新しい名前に引き継ぐ */
  if (setKey === "series" && master.seriesMain && master.seriesMain[from]) {
    const sm = { ...master.seriesMain };
    if (!sm[to]) sm[to] = sm[from];
    delete sm[from];
    master = { ...master, seriesMain: sm };
  }
  const k = propagate(setKey, from, to);
  const nl = l.includes(to) ? l.filter(x => x !== from) : l.map(x => (x === from ? to : x));
  setMasterList(setKey, nl);
  toast(
    `「${from}」を「${to}」に変えました${k ? `（${k}件）` : ""}${l.includes(to) ? "・同じ名前とまとめました" : ""}`,
  );
}
/* 設定のシリーズ：数が多いので並び替えはせず、ジャンルで分けて五十音順／作品数順。名前を押すとその作品一覧、✎で名前の変更 */
let setSerG = "all",
  setSerSort = "kana";
function seriesSettingsHtml() {
  const cnt = usedNames("series");
  const smap = seriesMainMap().map;
  const q = norm(setQ);
  const all = M("series");
  const nG = g => all.filter(n => g === "all" || smap[n] === g).length;
  let rows = all.filter(n => (setSerG === "all" || smap[n] === setSerG) && (!q || norm(n).includes(q)));
  rows.sort(setSerSort === "count" ? (a, b) => (cnt[b] || 0) - (cnt[a] || 0) || a.localeCompare(b, "ja") : (a, b) => a.localeCompare(b, "ja"));
  const seg = (attr, cur, opts) => `<div class="sseg" role="radiogroup">${opts.map(([v, l]) => `<button type="button" role="radio" ${attr}="${v}" aria-checked="${cur === v}">${l}</button>`).join("")}</div>`;
  return `<p class="hint" style="margin:8px 0">名前：作品一覧を開く　✎：名前を変更（作品もまとめて変わる）　ラベル：ジャンルを切り替え</p>
    <div class="sbar">${seg("data-serg", setSerG, [["all", `すべて <small>${nG("all")}</small>`], ["a", `アニメ <small>${nG("a")}</small>`], ["d", `ドラマ・実写 <small>${nG("d")}</small>`]])}${seg("data-sersort", setSerSort, [["kana", "五十音順"], ["count", "作品数順"]])}</div>
    <input id="mq" type="search" class="mq" placeholder="名前で絞り込み" value="${esc(setQ)}" autocomplete="off">
    <div class="mlist slist">${
      rows.length
        ? rows
            .map(n => {
              const c = cnt[n] || 0;
              return `<div class="srow${c ? "" : " zero"}">
      ${setRen === n ? `<input class="mren" data-mold="${esc(n)}" value="${esc(n)}" autocomplete="off" aria-label="新しい名前">` : `<button type="button" class="sname" data-seropen="${esc(n)}" title="作品一覧を開く">${esc(n)}</button>`}
      <small class="mcnt" title="${c}作品">${c}</small>
      <button type="button" class="smain sm-${smap[n]}" data-sermain="${esc(n)}" title="メインのジャンル（押すと切り替え）">${smap[n] === "a" ? "アニメ" : "ドラマ"}</button>
      <button type="button" class="sren" data-mrename="${esc(n)}" aria-label="${esc(n)}の名前を変更">✎</button>
      <button type="button" class="delsm${setDel === n ? " armed" : ""}" data-mdel="${esc(n)}">${setDel === n ? (c ? `${c}件から外して削除` : "もう一度で削除") : "削除"}</button></div>`;
            })
            .join("")
        : `<p class="hint" style="padding:10px">${q ? "一致するシリーズはありません" : "まだありません"}</p>`
    }</div>`;
}
/* 設定のシリーズ以外（放送局・配信サイト・投稿者・グループ）：⠿で並び替え、名前を押すと変更 */
function masterListHtml() {
  const cnt = usedNames(setKey);
  const unit = setKey === "authors" || setKey === "groups" || setKey === "soloGroups" ? "本" : "作品";
  const rows = M(setKey);
  return `<p class="hint" style="margin:8px 0">⠿をドラッグして並び順を変えると、編集画面の選択肢やフィルタの並びに反映されます。名前を押すと変更できます。名前を変えると、使っている作品もまとめて変わります。</p>
    <div class="mlist">${
      rows.length
        ? rows
            .map(
              (n, i) => `<div class="mrow2" data-mi="${i}">
      <span class="mgrip" data-mgrip="1" aria-hidden="true">⠿</span>
      ${setRen === n ? `<input class="mren" data-mold="${esc(n)}" value="${esc(n)}" autocomplete="off" aria-label="新しい名前">` : `<button type="button" class="mname" data-mrename="${esc(n)}">${esc(n)}</button>`}
      <small class="mcnt">${cnt[n] || 0}${unit}</small>
      <button type="button" class="delsm${setDel === n ? " armed" : ""}" data-mdel="${esc(n)}">${setDel === n ? (cnt[n] ? `${cnt[n]}件から外して削除` : "もう一度押すと削除") : "削除"}</button></div>`,
            )
            .join("")
        : `<p class="hint">まだありません</p>`
    }</div>`;
}
function settingsHtml() {
  const ser = setKey === "series";
  return `<div class="hdrow"><h3>設定</h3><button class="close" type="button" data-close aria-label="閉じる">✕</button></div>
    <div class="mtabs" role="tablist">${MKEYS.map(([k, l]) => `<button type="button" role="tab" data-mkey="${k}" aria-selected="${k === setKey}">${l}</button>`).join("")}</div>
    ${ser ? seriesSettingsHtml() : masterListHtml()}
    <div class="sernew madd2"><input id="maddIn" autocomplete="off" placeholder="${ser ? "追加するシリーズ名" : "追加する名前"}"><button type="button" data-madd="1">＋ 追加</button></div>
    ${accountHtml()}`;
}
/* 設定の一覧：⠿を押さえたまま上下に動かして並び替え（マウス・指どちらでも） */
let mDrag = null;
document.addEventListener("pointerdown", e => {
  const g = e.target.closest("[data-mgrip]");
  if (!g || e.button > 0) return;
  const row = g.closest(".mrow2"),
    box = row.parentElement;
  e.preventDefault();
  try {
    g.setPointerCapture(e.pointerId);
  } catch (_) {}
  mDrag = { row, box, y: e.clientY, g };
  row.classList.add("dragging");
  box.classList.add("sorting");
});
document.addEventListener("pointermove", e => {
  if (!mDrag) return;
  const { row, box } = mDrag;
  const r = box.getBoundingClientRect();
  if (e.clientY < r.top + 24) box.scrollTop -= 8;
  else if (e.clientY > r.bottom - 24) box.scrollTop += 8;
  const rows = [...box.querySelectorAll(".mrow2")].filter(x => x !== row);
  const next = rows.find(x => {
    const b = x.getBoundingClientRect();
    return e.clientY < b.top + b.height / 2;
  });
  if (next !== row.nextElementSibling) box.insertBefore(row, next || null);
});
const endDrag = () => {
  if (!mDrag) return;
  const { row, box } = mDrag;
  row.classList.remove("dragging");
  box.classList.remove("sorting");
  mDrag = null;
  /* 表示中の行（絞り込み中はその一部）の新しい順番を、全体の並びの同じ位置に当てはめる */
  const l = M(setKey);
  const shown = [...box.querySelectorAll(".mrow2")].map(x => +x.dataset.mi);
  const slots = [...shown].sort((a, b) => a - b);
  const nl = [...l];
  slots.forEach((pos, k) => (nl[pos] = l[shown[k]]));
  if (nl.some((x, k) => x !== l[k])) {
    setDel = null;
    setMasterList(setKey, nl);
  } else refreshSettings();
};
document.addEventListener("pointerup", endDrag);
document.addEventListener("pointercancel", endDrag);
function openSettings() {
  openId = null;
  ytOpen = null;
  form = null;
  setQ = "";
  setDel = null;
  setRen = null;
  $("#layer").innerHTML =
    `<div class="scrim" data-close></div><div class="sheet form setsheet" role="dialog" aria-modal="true" aria-label="設定"><div class="wrap" id="setIn">${settingsHtml()}</div></div>`;
}
function refreshSettings(keepScroll = true) {
  const el = $("#setIn");
  if (!el || mDrag) return;
  const sh = el.closest(".sheet");
  const y = sh.scrollTop;
  const ly = el.querySelector(".mlist")?.scrollTop || 0;
  const f = document.activeElement && document.activeElement.id;
  el.innerHTML = settingsHtml();
  if (keepScroll) {
    sh.scrollTop = y;
    const l = el.querySelector(".mlist");
    if (l) l.scrollTop = ly;
  }
  if (f === "mq") {
    const q = $("#mq");
    q.focus();
    q.setSelectionRange(q.value.length, q.value.length);
  }
}
function setMasterList(key, list) {
  master = { ...master, [key]: list };
  saveMaster();
  render();
  refreshSettings();
}
/* 名前の変更・削除を作品にも反映する（to=""で外す） */
function propagate(key, from, to) {
  if (key === "authors" || key === "groups" || key === "soloGroups") {
    const ids = ytItems
      .filter(x => (key === "authors" ? x.a === from : key === "groups" ? ytSub(x) === from : ytSolo(x) === from))
      .map(x => x.id);
    ids.forEach(id => {
      const p = key === "authors" ? { a: to } : key === "groups" ? { g: to || COLLAB } : { sg: to };
      ytOver[id] = { ...(ytOver[id] || {}), ...p };
    });
    if (ids.length) {
      ytRebuild();
      ids.forEach(id => saveDoc("yt", id, ytOver[id]).catch(fail));
    }
    return ids.length;
  }
  const ch = [];
  items.forEach(i => {
    if (key === "series") {
      if (i.series === from) ch.push([i.id, { series: to }]);
      return;
    }
    const m = mediaOf(i);
    const sw = l => [...new Set(l.map(v => (v === from ? to : v)).filter(Boolean))];
    if (key === "stations" && m.stations.includes(from)) {
      const st = sw(m.stations);
      ch.push([
        i.id,
        { media: m.media, stations: st, plat: m.plat, vods: m.vods },
      ]);
    }
    if (key === "vods" && (m.plat.includes(from) || m.vods.includes(from))) {
      const pl = sw(m.plat),
        vd = sw(m.vods);
      ch.push([
        i.id,
        { media: m.media, stations: m.stations, plat: pl, vods: vd },
      ]);
    }
  });
  ch.forEach(([id, p]) => {
    over[id] = { ...(over[id] || {}), ...p };
  });
  if (ch.length) {
    rebuild();
    ch.forEach(([id]) => saveDoc("titles", id, over[id]).catch(fail));
  }
  return ch.length;
}
function close() {
  lockScroll(false);
  ytOpen = null;
  yform = null;
  openId = null;
  epEdit = null;
  form = null;
  $("#layer").innerHTML = "";
}
/* 通知は共通部品（U.toast） */
function toastUndo(m, undo) {
  U.toast(stLabel(m), {
    undo: () => {
      undo();
      toast("元に戻しました");
    },
    ms: 6000,
  });
}
function toast(m) {
  U.toast(stLabel(m), { ms: 2000 });
}
/* 設定画面の中の操作 */
const SETTINGS_ACTIONS = [
  ["[data-logout]", () => doLogout()],
  /* 上のタブ（シリーズ・放送局…） */
  [
    "[data-mkey]",
    el => {
      setKey = el.dataset.mkey;
      setQ = "";
      setDel = null;
      setRen = null;
      refreshSettings(false);
    },
  ],
  /* シリーズ：ジャンルで分ける・並び順 */
  [
    "[data-serg]",
    el => {
      setSerG = el.dataset.serg;
      refreshSettings(false);
    },
  ],
  [
    "[data-sersort]",
    el => {
      setSerSort = el.dataset.sersort;
      refreshSettings(false);
    },
  ],
  /* シリーズ名：その作品一覧を開く */
  ["[data-seropen]", el => showSeries(el.dataset.seropen, seriesMainMap().map[el.dataset.seropen])],
  /* シリーズのメインのジャンルを切り替え */
  [
    "[data-sermain]",
    el => {
      const n = el.dataset.sermain;
      const cur = seriesMainMap().map[n] || "a";
      master = { ...master, seriesMain: { ...(master.seriesMain || {}), [n]: cur === "a" ? "d" : "a" } };
      saveMaster();
      refreshSettings();
    },
  ],
  /* 名前の変更（入力欄を出す） */
  [
    "[data-mrename]",
    el => {
      setRen = el.dataset.mrename;
      setDel = null;
      refreshSettings();
      const i = $(".mren");
      if (i) {
        i.focus();
        i.select();
      }
    },
  ],
  /* 削除：もう一度押すと削除。使っている作品からも外す */
  [
    "[data-mdel]",
    el => {
      const n = el.dataset.mdel;
      if (setDel !== n) {
        setDel = n;
        refreshSettings();
        return;
      }
      setDel = null;
      const k = propagate(setKey, n, "");
      setMasterList(
        setKey,
        M(setKey).filter(x => x !== n),
      );
      toast(`「${n}」を削除しました${k ? `（${k}件から外しました）` : ""}`);
    },
  ],
  [
    "[data-madd]",
    () => {
      const v = ($("#maddIn")?.value || "").trim();
      if (!v) return $("#maddIn")?.focus();
      const l = M(setKey);
      if (l.includes(v)) return toast(`「${v}」はすでにあります`);
      setMasterList(setKey, [...l, v]);
      toast(`「${v}」を追加しました`);
      setTimeout(() => $("#maddIn")?.focus(), 0);
    },
  ],
  /* ほかの場所を押したら、名前の変更を確定 */
  [
    null,
    (el, x, e) => {
      if (!e.target.closest(".mren") && setRen) commitRename();
    },
  ],
];
/* 設定画面の中のクリックは、ここで全部受ける（✕・外側は閉じる） */
function onSettingsClick(e) {
  if (!$("#setIn") || !e.target.closest("#setIn") || e.target.closest("[data-close]")) return false;
  runActions(SETTINGS_ACTIONS, e);
  return true;
}
