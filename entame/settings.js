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
/* シリーズの管理：検索・ジャンル・並び順は1行に収める。名前を押すと作品一覧、✎で名前の変更、削除は右上の「編集」を押したときだけ */
function seriesSettingsHtml() {
  const cnt = usedNames("series");
  const smap = seriesMainMap().map;
  const q = norm(setQ);
  const all = M("series");
  const nG = g => all.filter(n => g === "all" || smap[n] === g).length;
  let rows = all.filter(n => (setSerG === "all" || smap[n] === setSerG) && (!q || norm(n).includes(q)));
  rows.sort(setSerSort === "count" ? (a, b) => (cnt[b] || 0) - (cnt[a] || 0) || a.localeCompare(b, "ja") : (a, b) => a.localeCompare(b, "ja"));
  return `<div class="smbar">
      <div class="sseg" role="radiogroup" aria-label="ジャンル">${[["all", "すべて"], ["a", "アニメ"], ["d", "ドラマ"]].map(([v, l]) => `<button type="button" role="radio" data-serg="${v}" aria-checked="${setSerG === v}">${l}<small>${nG(v)}</small></button>`).join("")}</div>
      <button type="button" class="smsort" data-sersort="${setSerSort === "count" ? "name" : "count"}" aria-label="並び順を切り替え">${SORT_IC}<span>${setSerSort === "count" ? "作品数" : "名前"}</span></button>
    </div>
    <div class="ftools mqbox"><input id="mq" type="search" class="u-input mq" enterkeyhint="search" placeholder="シリーズ名で検索" value="${esc(setQ)}" autocomplete="off" aria-label="シリーズ名で検索">${setQ ? `<button type="button" class="u-btn txt fq-x" data-mqclr="1">キャンセル</button>` : ""}</div>
    <div class="mlist slist">${
      rows.length
        ? rows
            .map(n => {
              const c = cnt[n] || 0;
              return `<div class="srow${c ? "" : " zero"}">
      ${
        setRen === n
          ? `<input class="mren" data-mold="${esc(n)}" value="${esc(n)}" autocomplete="off" aria-label="新しい名前">`
          : setEdit
            ? `<button type="button" class="sname ed" data-mrename="${esc(n)}" aria-label="${esc(n)}の名前を変更">${esc(n)}</button>`
            : `<button type="button" class="sname" data-seropen="${esc(n)}" title="作品一覧を開く">${esc(n)}</button>`
      }
      ${setEdit ? `<button type="button" class="kind ${smap[n] === "a" ? "a" : "d"} kindsw" data-sermain="${esc(n)}" aria-label="ジャンルを切り替え">${smap[n] === "a" ? "アニメ" : "ドラマ"} ⇄</button>` : `<span class="kind ${smap[n] === "a" ? "a" : "d"}">${smap[n] === "a" ? "アニメ" : "ドラマ"}</span>`}
      <small class="mcnt">${c}作品</small>
      ${setEdit && smap[n] !== "a" ? `<button type="button" class="u-btn sm txt toslot" data-toslot="${esc(n)}" title="このシリーズの作品をまとめて放送枠に移します">放送枠へ</button>` : ""}${setEdit ? `<button type="button" class="u-btn sm txt danger delsm${setDel === n ? " pri armed" : ""}" data-mdel="${esc(n)}">${setDel === n ? (c ? `${c}件から外して削除` : "もう一度で削除") : "削除"}</button>` : ""}</div>`;
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
  return `<p class="hint" style="margin:8px 0">⠿で並び替え。名前の変更・削除は右上の「編集」から</p>
    <div class="mlist">${
      rows.length
        ? rows
            .map(
              (n, i) => `<div class="mrow2" data-mi="${i}" data-sortrow>
      ${GRIP("master")}
      ${setRen === n ? `<input class="mren" data-mold="${esc(n)}" value="${esc(n)}" autocomplete="off" aria-label="新しい名前">` : setEdit ? `<button type="button" class="mname ed" data-mrename="${esc(n)}" aria-label="${esc(n)}の名前を変更">${esc(n)}</button>` : `<span class="mname">${esc(n)}</span>`}
      <small class="mcnt">${cnt[n] || 0}${unit}</small>
      ${setEdit ? `<button type="button" class="u-btn sm txt danger delsm${setDel === n ? " pri armed" : ""}" data-mdel="${esc(n)}">${setDel === n ? (cnt[n] ? `${cnt[n]}件から外して削除` : "もう一度押すと削除") : "削除"}</button>` : ""}</div>`,
            )
            .join("")
        : `<p class="hint">まだありません</p>`
    }</div>`;
}
/* 設定は「表示・選択肢の管理・データ・アカウント」の一覧。項目を押すとその中身の画面へ（setPage） */
let setPage = "",
  setEdit = false; // 「編集」を押したときだけ削除ボタンを出す
const SET_IC = {
  theme: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  series: '<path d="M12 3 3 7.5 12 12l9-4.5z"/><path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5"/>',
  stations: '<path d="M4 10a8 8 0 0 1 16 0M7.5 11a4.5 4.5 0 0 1 9 0"/><circle cx="12" cy="12" r="1.5"/><path d="M12 13.5V21"/>',
  slots: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M7 14h4"/>',
  vods: '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="m10 9 5 2.5-5 2.5z"/>',
  authors: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  soloGroups: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  groups: '<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M15 14.5a5 5 0 0 1 6.5 4.5"/>',
  bk: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  save: '<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z"/><path d="m9.5 13.5 2 2 3.5-4"/>',
  size: '<ellipse cx="12" cy="5.5" rx="8" ry="2.5"/><path d="M4 5.5v13c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-13M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5"/>',
  dev: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  speed: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 18 4-5"/>',
  chk: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  out: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
};
const setIc = k => `<svg class="seti" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SET_IC[k]}</svg>`;
const SET_TITLE = { bk: "バックアップ", trash: "ゴミ箱", ...Object.fromEntries(MKEYS) };
function settingsHtml() {
  const th = U.theme();
  if (setPage) {
    const isM = MKEYS.some(([k]) => k === setPage);
    const head = `<div class="hdrow sethd"><button type="button" class="u-btn icon sm txt setback" data-setpg="" aria-label="設定に戻る"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></button><h3>${esc(SET_TITLE[setPage] || "設定")}</h3>${isM ? `<button type="button" class="u-btn sm setedit${setEdit ? " pri" : ""}" data-setedit="1">${setEdit ? "完了" : "編集"}</button>` : ""}<button class="u-btn icon sm soft close" type="button" data-close aria-label="閉じる">✕</button></div>`;
    if (setPage === "bk") return head + backupHtml();
    if (setPage === "trash") return head + trashHtml();
    const ser = setPage === "series";
    return `${head}${ser ? seriesSettingsHtml() : masterListHtml()}
    <div class="sernew madd2"><input id="maddIn" autocomplete="off" placeholder="${ser ? "追加するシリーズ名" : "追加する名前"}"><button type="button" class="u-btn sm" data-madd="1">＋ 追加</button></div>`;
  }
  const row = (k, lab, val, attr = `data-setpg="${k}"`) => `<button type="button" class="setrow" ${attr}>${setIc(k)}<span class="setl">${lab}</span><span class="setv">${val}</span><svg class="setcv" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>`;
  const tl = trashList().length;
  return `<div class="hdrow"><h3>設定</h3><button class="u-btn icon sm soft close" type="button" data-close aria-label="閉じる">✕</button></div>
    <div class="setsec">表示</div>
    <div class="setgrp"><div class="setrow static">${setIc("theme")}<span class="setl">テーマ</span><div class="u-seg hseg3 setthm3" role="radiogroup" aria-label="テーマ">${[["auto", "自動"], ["light", "ライト"], ["dark", "ダーク"]].map(([v, l]) => `<button type="button" role="radio" data-setthm="${v}" aria-selected="${th === v}" aria-checked="${th === v}">${l}</button>`).join("")}</div></div></div>
    <div class="setsec">選択肢の管理</div>
    <div class="setgrp">${MKEYS.map(([k, l]) => row(k, l, M(k).length)).join("")}</div>
    <div class="setsec">データ</div>
    <div class="setgrp">${row("bk", "バックアップ", "書き出す・戻す")}${row("trash", "ゴミ箱", tl ? `${tl}件` : "空")}<div class="setrow static">${setIc("chk")}<span class="setl">確認チェック<small class="setsm">PCの作品詳細</small></span><div class="u-seg hseg3 setthm3" role="radiogroup" aria-label="確認チェック">${[["0", "表示"], ["1", "消す"]].map(([v, l]) => `<button type="button" role="radio" data-chkoff="${v}" aria-selected="${!!master.chkOff === (v === "1")}" aria-checked="${!!master.chkOff === (v === "1")}">${l}</button>`).join("")}</div></div></div>
    <div class="setsec">アカウント</div>
    <div class="setgrp"><div class="setrow static">${setIc("save")}<span class="setl">保存</span><span class="setv">${saveNoteHtml()}</span></div>${usageRows()}<button type="button" class="setrow danger" data-logout="1">${setIc("out")}<span class="setl">ログアウト</span></button></div>`;
}
/* ---------- 使用量（設定のアカウント）：データ量・端末の保存容量・起動の速さ ---------- */
const fmtB = b => (b >= 1048576 ? `${(b / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(b / 1024))}KB`);
function usageRows() {
  const live = o => Object.values(o || {}).filter(x => x && !x.deleted);
  const ti = live(over),
    yt = live(ytOver);
  const epN = Object.values(prog).reduce((a, p) => a + (Array.isArray(p && p.eps) ? p.eps.length : 0), 0);
  const imgN = [...ti, ...yt].filter(x => x.img).length;
  /* 作品・話数・YouTube の文字データの大きさ（画像は別に保存していて、ここには入らない） */
  const bytes = new Blob([JSON.stringify([over, prog, ytOver])]).size;
  const sec = t => (t ? `${(t / 1000).toFixed(1)}秒` : "—");
  /* 端末の保存容量は読み取りに少しかかるので、出してから書き込む */
  if (navigator.storage && navigator.storage.estimate)
    navigator.storage
      .estimate()
      .then(e => {
        const el = $("#setDev");
        if (el) el.textContent = fmtB(e.usage || 0);
      })
      .catch(() => {});
  return `<div class="setrow static">${setIc("size")}<span class="setl">データ</span><span class="setv">作品${ti.length + yt.length}・${epN}話・画像${imgN}枚／${fmtB(bytes)}</span></div><div class="setrow static">${setIc("dev")}<span class="setl">端末の保存容量</span><span class="setv" id="setDev">—</span></div><div class="setrow static">${setIc("speed")}<span class="setl">起動</span><span class="setv">表示 ${sec(bootT.show)}・最新 ${sec(bootT.sync)}</span></div>`;
}
/* ---------- ゴミ箱：削除した作品（アニメ・ドラマなどとYouTube）。30日間は戻せる ---------- */
let trashOpen = false,
  trashArm = "";
function trashList() {
  const a = Object.entries(over)
    .filter(([, o]) => o && o.deleted && typeof o.t === "string")
    .map(([id, o]) => ({ col: "titles", id, t: o.t, at: +o.deleted, tag: kindTag({ k: "a", ...o }) }));
  const b = Object.entries(ytOver)
    .filter(([, o]) => o && o.deleted && o.t)
    .map(([id, o]) => ({ col: "yt", id, t: o.t, at: +o.deleted, tag: `<span class="kind yauth">YouTube</span>` }));
  return [...a, ...b].sort((x, y) => y.at - x.at);
}
function trashHtml() {
  const l = trashList();
  const row = x => {
    const key = `${x.col}/${x.id}`,
      d = new Date(x.at),
      left = Math.max(1, Math.ceil((x.at + TRASH_DAYS * 864e5 - Date.now()) / 864e5)),
      arm = trashArm === key;
    return `<div class="trrow"><span class="trk">${x.tag}</span><span class="trt"><b>${esc(x.t)}</b><small>${d.getMonth() + 1}/${d.getDate()} に削除・あと${left}日で完全に削除</small></span><span class="trb"><button type="button" class="u-btn sm" data-trback="${esc(key)}">戻す</button><button type="button" class="u-btn sm${arm ? " armed" : ""}" data-trdel="${esc(key)}">${arm ? "もう一度押すと完全に削除" : "完全に削除"}</button></span></div>`;
  };
  return `<div class="bkbox bkdata trash"><div class="bkhd"><b>ゴミ箱</b><span class="trn">${l.length ? `${l.length}件` : "空です"}</span>${
    l.length ? `<span class="bkrow"><button type="button" class="u-btn sm" data-trtog="1" aria-expanded="${trashOpen}">${trashOpen ? "閉じる" : "中を見る"}${FOLD_IC}</button></span>` : ""
  }</div>
    <p class="hint">${TRASH_DAYS}日間はここから戻せます</p>
    ${trashOpen && l.length ? `<div class="trlist">${l.map(row).join("")}</div>` : ""}</div>`;
}
/* ゴミ箱から戻す（fromToast＝削除した直後の「元に戻す」から） */
function trashRestore(col, id, fromToast) {
  const src = col === "yt" ? ytOver : over;
  if (!src[id]) return;
  src[id] = { ...src[id], deleted: null };
  if (col === "yt") ytRebuild();
  else rebuild();
  render();
  refreshSettings();
  mergeDoc(col, id, { deleted: null }).catch(fail);
  if (!fromToast) toast(`「${String(src[id].t || "").slice(0, 18)}」を戻しました`);
}
/* ---------- バックアップ：全データ（作品・話数・マスタ・YouTube）を1つのファイルに書き出す／ファイルから戻す ---------- */
let bkPending = null; // 読み込んだファイルの中身（戻す前の確認中）
let bkArm = false;
const BK_COLS = [
  ["titles", "作品", () => over],
  ["progress", "話数", () => prog],
  ["master", "マスタ", () => ({ all: master })],
  ["yt", "YouTube", () => ytOver],
];
function backupHtml() {
  const p = bkPending;
  const cnt = d => BK_COLS.map(([k, l]) => `${l} ${Object.keys(d[k] || {}).length}件`).join("・");
  return `<div class="bkbox bkdata"><div class="bkhd"><b>データのバックアップ</b><span class="bkrow"><button type="button" class="u-btn sm" data-bkout="1">ファイルに書き出す</button><label class="u-btn sm bkin">ファイルから戻す<input type="file" id="bkFile" accept="application/json,.json" hidden></label></span></div>
    
    ${
      p
        ? `<div class="bkconf"><p><b>${esc(p.name)}</b>（${esc(p.at)}）<br>${cnt(p.data)}</p><p class="hint">ファイルにある作品などを、ファイルの内容で上書きします。ファイルにない作品はそのまま残ります。</p><div class="bkrow"><button type="button" class="u-btn sm" data-bkcancel="1">やめる</button><button type="button" class="u-btn sm pri${bkArm ? " armed" : ""}" data-bkgo="1">${bkArm ? "もう一度押すと戻す" : "このファイルで戻す"}</button></div></div>`
        : ""
    }</div>`;
}
function backupOut() {
  const data = {};
  BK_COLS.forEach(([k, , f]) => (data[k] = f()));
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const blob = new Blob([JSON.stringify({ app: "entame", v: 1, at: d.toISOString(), data })], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `entame-backup-${ymd}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
  toast("バックアップのファイルを書き出しました");
}
async function backupRead(file) {
  try {
    const j = JSON.parse(await file.text());
    if (!j || j.app !== "entame" || !j.data || typeof j.data.titles !== "object") throw new Error("形式が違います");
    const at = j.at ? new Date(j.at) : null;
    bkPending = { name: file.name, at: at ? `${at.getFullYear()}/${at.getMonth() + 1}/${at.getDate()} ${at.getHours()}:${String(at.getMinutes()).padStart(2, "0")} に書き出し` : "日時不明", data: j.data };
  } catch (e) {
    bkPending = null;
    toast("このファイルは読み込めませんでした（エンタメ管理のバックアップではありません）");
  }
  bkArm = false;
  refreshSettings();
}
async function backupRestore() {
  const d = bkPending && bkPending.data;
  if (!d || !db) return;
  const list = [];
  BK_COLS.forEach(([k]) => Object.entries(d[k] || {}).forEach(([id, v]) => v && typeof v === "object" && list.push([`${k}/${id}`, v])));
  bkPending = null;
  bkArm = false;
  refreshSettings();
  toast(`${list.length}件を戻しています…`);
  try {
    for (let i = 0; i < list.length; i += 400) await db.setMany(list.slice(i, i + 400));
    toast(`${list.length}件をバックアップから戻しました`);
  } catch (e) {
    fail(e);
  }
}
document.addEventListener("change", e => {
  if (e.target.id === "bkFile" && e.target.files[0]) backupRead(e.target.files[0]);
});
/* 設定の一覧：⠿を押さえたまま上下に動かして並び替え（しくみは core.js の GRIP） */
SORT_DONE.master = (box, rows) => {
  /* 表示中の行（絞り込み中はその一部）の新しい順番を、全体の並びの同じ位置に当てはめる */
  const l = M(setKey);
  const shown = rows.map(x => +x.dataset.mi);
  const slots = [...shown].sort((a, b) => a - b);
  const nl = [...l];
  slots.forEach((pos, k) => (nl[pos] = l[shown[k]]));
  if (nl.some((x, k) => x !== l[k])) {
    setDel = null;
    setMasterList(setKey, nl);
  } else refreshSettings();
};
function openSettings(page = "") {
  setPage = page || "";
  setEdit = false;
  if (MKEYS.some(([k]) => k === setPage)) setKey = setPage;
  bkPending = null;
  trashOpen = setPage === "trash";
  trashArm = "";
  bkArm = false;
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
  if (!el || gDrag) return;
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
    if (key === "slots") {
      if (i.slot === from) ch.push([i.id, { slot: to }]);
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
    ch.forEach(([id, p]) => mergeDoc("titles", id, p).catch(fail));
  }
  return ch.length;
}
function close() {
  closeDD();
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
  });
}
const toast = m => U.toast(stLabel(m));
/* 設定画面の中の操作 */
const SETTINGS_ACTIONS = [
  [
    "[data-setedit]",
    () => {
      setEdit = !setEdit;
      setDel = null;
      refreshSettings();
    },
  ],
  /* 設定の中の画面を移る（data-setpg="" は一覧に戻る） */
  [
    "[data-setpg]",
    el => {
      setPage = el.dataset.setpg;
      setEdit = false;
      if (MKEYS.some(([k]) => k === setPage)) setKey = setPage;
      setQ = "";
      setDel = null;
      setRen = null;
      trashOpen = setPage === "trash";
      refreshSettings(false);
      const sh = $("#setIn")?.closest(".sheet");
      if (sh) sh.scrollTop = 0;
    },
  ],
  /* 表示：自動・ライト・ダーク（スマホは上の帯の月マークをなくしたので、ここで切り替える） */
  [
    "[data-setthm]",
    el => {
      U.setTheme(el.dataset.setthm);
      refreshSettings();
    },
  ],
  /* 確認チェック（一時的な機能）を出す・消す。チェックした内容は作品に残る */
  [
    "[data-chkoff]",
    el => {
      master.chkOff = el.dataset.chkoff === "1";
      saveMaster();
      refreshSettings();
      render();
    },
  ],
  /* シリーズの検索：キャンセルで消す（ライブラリの検索と同じ） */
  [
    "[data-mqclr]",
    () => {
      setQ = "";
      refreshSettings(false);
    },
  ],
  ["[data-logout]", () => doLogout()],
  [
    "[data-trtog]",
    () => {
      trashOpen = !trashOpen;
      trashArm = "";
      refreshSettings();
    },
  ],
  [
    "[data-trback]",
    el => {
      const [col, id] = el.dataset.trback.split("/");
      trashArm = "";
      trashRestore(col, id);
    },
  ],
  [
    "[data-trdel]",
    el => {
      const key = el.dataset.trdel;
      if (trashArm !== key) {
        trashArm = key;
        refreshSettings();
        return;
      }
      const [col, id] = key.split("/");
      const src = col === "yt" ? ytOver : over;
      const t = String((src[id] || {}).t || "").slice(0, 18);
      trashArm = "";
      trashGone(col, id);
      refreshSettings();
      toast(`「${t}」を完全に削除しました`);
    },
  ],
  ["[data-bkout]", () => backupOut()],
  [
    "[data-bkcancel]",
    () => {
      bkPending = null;
      bkArm = false;
      refreshSettings();
    },
  ],
  [
    "[data-bkgo]",
    () => {
      if (!bkArm) {
        bkArm = true;
        refreshSettings();
        return;
      }
      backupRestore();
    },
  ],
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
  /* シリーズに入れていた放送枠（月9など）を、放送枠に移す：そのシリーズの作品は放送枠をその名前にしてシリーズを外し、シリーズの一覧から消す */
  [
    "[data-toslot]",
    el => {
      const n = el.dataset.toslot;
      const ch = items.filter(i => i.series === n).map(i => [i.id, { series: "", slot: n }]);
      ch.forEach(([id, p]) => (over[id] = { ...(over[id] || {}), ...p }));
      const sm = { ...(master.seriesMain || {}) };
      delete sm[n];
      master = { ...master, series: M("series").filter(x => x !== n), seriesMain: sm, slots: M("slots").includes(n) ? M("slots") : [...M("slots"), n] };
      rebuild();
      ch.forEach(([id, p]) => mergeDoc("titles", id, p).catch(fail));
      saveMaster();
      render();
      refreshSettings();
      toast(`「${n}」を放送枠に移しました${ch.length ? `（${ch.length}作品）` : ""}`);
    },
  ],
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
      if (i && !TOUCH) {
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
