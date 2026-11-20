/* ===================== 作品の詳細：各話リストの貼り付けの画面（読み取り自体は paste.js） =====================
   しょぼいカレンダーのサブタイトルの一覧・放送時間の表を貼る → 読み取った結果を確かめる → 反映。
   話数で合わせて、サブタイトルと放送日・時刻（放送時間の表のときだけ）を入れ、登録されていない話は追加する */
let subPaste = null; // {text}（貼り付け中）／{text, rows}（読み取った結果）。話数の編集の中で開き、編集中の話数に反映する
function subPasteHtml(it) {
  const p = subPaste;
  if (!p.rows)
    return `<div class="spaste">
    <p class="hint sp-how">しょぼいカレンダーの「サブタイトル」の一覧、または「放送時間」の表をコピーして貼り付けてください</p>
    <textarea id="spText" rows="8" placeholder="#1 サブタイトル&#10;#2 サブタイトル">${esc(p.text || "")}</textarea>
    <div class="ffoot"><button type="button" class="u-btn" id="spCancel">キャンセル</button><button type="button" class="u-btn pri" id="spRead">読み取る</button></div></div>`;
  const subN = p.rows.filter(r => r.subCh).length,
    dateN = p.rows.filter(r => r.dateCh).length,
    addN = p.rows.filter(r => r.idx < 0).length;
  const md = d => (d ? `${+d.slice(5, 7)}/${+d.slice(8, 10)}(${"日月火水木金土"[new Date(d).getUTCDay()]})` : "");
  /* 日付は年が違うときだけ年も出す */
  const yd = (d, o) => (d && o && d.slice(0, 4) !== o.slice(0, 4) ? `${d.slice(0, 4)}/` : "");
  /* 変わる所は「今の値（灰色）→ 反映後（太字）」 */
  const subCell = r => (r.subCh && r.old ? `<span class="spv"><span class="was">今：${esc(r.old)}</span><b>${esc(r.sub)}</b></span>` : `<span>${esc(r.sub || r.old)}</span>`);
  const tm = t => (t ? ` ${hmOf(t)}` : "");
  const dateCell = r =>
    r.dateCh && r.oldDay
      ? `<small class="dch on">日付 <span class="was">${yd(r.oldDay, r.date)}${md(r.oldDay)}${tm(r.oldHm)}</span> → <b>${yd(r.date, r.oldDay)}${md(r.date)}${tm(r.time)}</b></small>`
      : r.date
        ? `<small class="dsame">日付 ${md(r.date)}${tm(r.time)}</small>`
        : "";
  const tag = r => (r.idx < 0 ? "追加" : r.subCh || r.dateCh ? "更新" : "同じ");
  const sum = [subN ? `サブタイトル${subN}話` : "", dateN ? `放送日${dateN}話` : ""].filter(Boolean).join("・");
  const any = subN || dateN || addN;
  return `<div class="spaste">
    <p class="sp-sum">${p.rows.length}話分を読み取りました。${any ? `${sum ? `<b>${sum}</b>を更新${addN ? "、" : ""}` : ""}${addN ? `<b>${addN}話</b>を追加` : ""}します。` : "登録済みの内容と同じです。"}</p>
    <div class="sp-list">${p.rows.map(r => `<div class="sp-r${r.idx < 0 ? " nomatch" : !r.subCh && !r.dateCh ? " same" : ""}"><span class="epn">${r.n}話</span><span class="spc">${subCell(r)}${dateCell(r)}</span><span class="sp-st">${tag(r)}</span></div>`).join("")}</div>
    <div class="ffoot"><button type="button" class="u-btn" id="spBack">貼り直す</button><button type="button" class="u-btn pri" id="spApply" ${any ? "" : "disabled"}>${epEdit ? "話数に反映" : "反映する"}</button></div></div>`;
}
/* 「24:30」「09:00」→「24:30」「9:00」（jst の hm と同じ書き方） */
const hmOf = t => t.replace(/^0(\d)/, "$1");
/* 貼り付けた文字を読み取り、登録済みの話と比べた一覧を出す */
function readPaste(it) {
  const text = $("#spText").value;
  const parsed = parseSubtitles(text);
  if (!parsed.length) return toast("読み取れませんでした。しょぼいカレンダーのサブタイトルの一覧か、放送時間の表をコピーしてください");
  const eps = epEdit ? epEdit.list : episodes(it);
  /* 話数で合わせる。サブタイトルが空の話は今のサブタイトルのまま */
  const rows = parsed.map(r => {
    const idx = eps.findIndex(x => epNum(x.n) === r.n);
    const cur = idx >= 0 ? eps[idx] : null;
    const old = cur ? cur.sub || "" : "",
      j = cur && cur.t ? jst(cur.t) : null,
      oldDay = j ? j.day : "",
      oldHm = j && !cur.nt ? j.hm : "";
    /* 放送日か放送時刻（読み取れたとき）が今と違えば直す */
    const dateCh = !!(cur && r.date && (r.date !== oldDay || (r.time && hmOf(r.time) !== oldHm)));
    return { ...r, sub: r.sub || old, idx, old, oldDay, oldHm, subCh: !!(cur && r.sub && r.sub !== old), dateCh };
  });
  subPaste = { text, rows };
  refreshSheet();
}
/* 読み取った内容を反映：サブタイトル・放送日を入れ、登録されていない話は追加 */
function applyPaste(it) {
  const l = epEdit ? epEdit.list : episodes(it);
  const p = subPaste;
  /* 放送日の時刻：読み取った時刻、なければその話の今の時刻、それもなければ作品の放送時間 */
  const at = (r, old) => dayTimeToT(r.date, r.time ? hmOf(r.time) : old && old.t && !old.nt ? jst(old.t).hm : hasTime(it) ? it.time : "9:00");
  const noTm = r => !r.time && !hasTime(it);
  let sn = 0,
    dn = 0,
    an = 0;
  p.rows.forEach(r => {
    if (r.idx < 0) return;
    const x = l[r.idx];
    if (r.subCh) {
      x.sub = r.sub;
      sn++;
    }
    if (r.dateCh) {
      x.t = at(r, x);
      x.nt = noTm(r);
      dn++;
    }
  });
  p.rows
    .filter(r => r.idx < 0)
    .forEach(r => {
      const x = nextEp(it, l);
      x.n = `${r.n}話`;
      x.sub = r.sub;
      if (r.date) {
        x.t = at(r, null);
        x.nt = noTm(r);
      }
      l.push(x);
      an++;
    });
  if (an) l.sort((a, b) => (epNum(a.n) ?? 0) - (epNum(b.n) ?? 0));
  subPaste = null;
  const msg = [sn ? `サブタイトル${sn}話` : "", dn ? `放送日${dn}話` : "", an ? `${an}話の追加` : ""].filter(Boolean).join("・") || "変更なし";
  /* 話数の編集の中から開いたときは、編集中の話数に入れて編集画面に戻る（保存は「話数を保存」で） */
  if (epEdit) {
    refreshSheet();
    toast(`${msg}を反映しました。「話数を保存」で保存されます`);
    return;
  }
  saveEps(it, l, msg + "を反映しました");
  refreshSheet();
}
/* 各話リストの貼り付け中 */
const PASTE_ACTIONS = [
  [
    "#spCancel",
    () => {
      subPaste = null;
      refreshSheet();
    },
  ],
  [
    "#spBack",
    () => {
      subPaste = { text: subPaste.text };
      refreshSheet();
    },
  ],
  ["#spRead", (el, it) => readPaste(it)],
  ["#spApply", (el, it) => applyPaste(it)],
];
