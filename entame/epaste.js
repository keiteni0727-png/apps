/* ===================== 作品の詳細：各話リストの貼り付けの画面（読み取り自体は paste.js） ===================== */
/* 整形の表（Excelの形）：元のマスを列のまま並べる。列の見出し（A・B…）で役割を選び、マスは押して直す。✕ で行を消す。
   ふだんは開かない（自動で読み取れなかったときと、結果の画面で「整形」を押したときだけ） */
function gridHtml(g) {
  gColsInit(g);
  const bad = g.rows.filter(r => gBad(g, r)).length;
  const nj = g.cols.indexOf("n");
  const head = g.cols
    .map(
      (c, j) =>
        `<th class="gh r-${c}"><button type="button" class="gcolb" data-gcol="${j}" aria-haspopup="listbox" aria-expanded="${ddOpen === "gcol:" + j}" aria-label="${gLetter(j)}列の役割：${G_ROLE[c]}"><span class="gl">${gLetter(j)}</span><span class="gr">${G_ROLE[c]}</span>${DD_CHEV}</button></th>`,
    )
    .join("");
  const rows = g.rows
    .map((r, i) => {
      const cells = g.cols.map((c, j) => `<td class="r-${c}"><input class="gc" data-g="${i}:${j}" value="${esc(gCell(r, j))}" autocomplete="off" aria-label="${i + 1}行目 ${gLetter(j)}列（${G_ROLE[c]}）"></td>`).join("");
      return `<tr class="${gBad(g, r) ? "bad" : ""}" data-gr="${i}"><td class="gx"><button type="button" data-gdel="${i}" aria-label="${i + 1}行目を消す">✕</button></td><td class="gno">${i + 1}</td>${cells}</tr>`;
    })
    .join("");
  return `<div class="spaste spgrid">
    <p class="hint" style="margin:0 0 8px">${subPaste.back ? "" : "自動で読み取れなかった所があります。"}列の見出しで役割を選び、マスを直してから「この形で読み取る」を押してください</p>
    ${g.dropped ? `<p class="hint" style="margin:0 0 8px">見出しなど${g.dropped}行は外しています</p>` : ""}
    ${nj < 0 ? `<p class="hint" style="margin:0 0 8px">話数の列がないので、上から順に1話・2話…と付けます</p>` : bad ? `<button type="button" class="u-btn sm gdelbad" id="gDelBad">話数がない行（赤い行）を${bad}行まとめて消す</button>` : ""}
    <div class="gw"><table class="sgt"><thead><tr><th class="gx"></th><th class="gno"></th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
    <div class="ffoot"><button type="button" class="u-btn" id="gBack">${subPaste.back ? "戻る" : "貼り直す"}</button><button type="button" class="u-btn pri primary" id="gRead">この形で読み取る</button></div></div>`;
}
let subPaste = null; // {text, rows:[{n,sub,idx,old}], addMissing}（話数の編集の中で開き、編集中の話数に反映する）
function subPasteHtml(it) {
  const p = subPaste;
  if (p.grid) return gridHtml(p.grid);
  if (!p.rows)
    return `<div class="spaste">
    ${it.k === "a" ? `<div class="sylink">${syoboiA(it, "syb")}<input id="spSyoboi" type="url" inputmode="url" autocomplete="off" placeholder="作品のページのURLを貼ると、次からそこを開きます" value="${esc(it.syoboi || "")}" aria-label="しょぼいカレンダーのURL"></div>` : ""}
    <textarea id="spText" rows="8" placeholder="各話リストの表をコピーして、ここに貼り付けてください">${esc(p.text || "")}</textarea>
    <div class="ffoot"><button type="button" class="u-btn" id="spCancel">キャンセル</button><button type="button" class="u-btn pri primary" id="spRead">読み取る</button></div></div>`;
  const ch = p.useSub ? p.rows.filter(r => r.idx >= 0 && r.old !== r.sub).length : 0,
    nch = p.match === "order" ? p.rows.filter(r => r.numCh).length : 0,
    same = p.rows.filter(r => r.idx >= 0 && r.old === r.sub && !r.dateCh).length,
    miss = p.rows.filter(r => r.idx < 0).length,
    dch = p.rows.filter(r => r.dateCh).length;
  const md = d => (d ? `${+d.slice(5, 7)}/${+d.slice(8, 10)}(${"日月火水木金土"[new Date(d).getUTCDay()]})` : "");
  /* 変わる所は「今の値（灰色）→ 更新後（太字）」。日付は年が違うときだけ年も出す */
  const yd = (d, o) => (d && o && d.slice(0, 4) !== o.slice(0, 4) ? `${d.slice(0, 4)}/` : "");
  const subCell = r => (!p.useSub && r.idx >= 0 ? `<span>${esc(r.old || "")}</span>` : r.idx >= 0 && r.old && r.old !== r.sub ? `<span class="spv"><span class="was">今：${esc(r.old)}</span><b>${esc(r.sub)}</b></span>` : `<span>${esc(r.sub || r.old)}</span>`);
  const dateCell = r =>
    r.dateCh
      ? `<small class="dch${p.useDate ? " on" : ""}">日付 <span class="was">${yd(r.oldDay, r.date)}${md(r.oldDay)}</span> → <b>${yd(r.date, r.oldDay)}${md(r.date)}</b></small>`
      : r.date
        ? `<small class="dsame">日付 ${md(r.date)}</small>`
        : "";
  return `<div class="spaste">
    <div class="sp-opt"><span class="sp-ol">合わせ方</span><div class="u-seg sp-seg"><button type="button" data-spm="num" class="${p.match === "num" ? "on" : ""}">話数で</button><button type="button" data-spm="order" class="${p.match === "order" ? "on" : ""}">上から順に</button></div>${p.match === "order" ? `<select id="spFrom" aria-label="最初に合わせる話">${(epEdit ? epEdit.list : episodes(it)).map((e, i) => `<option value="${i}" ${i === p.from ? "selected" : ""}>${esc(e.n)}</option>`).join("")}</select><span class="sp-oh">から</span>` : ""}</div>
    <div class="sp-opt"><span class="sp-ol">更新する</span><label class="sp-ck"><input type="checkbox" data-spu="useSub" ${p.useSub ? "checked" : ""}>サブタイトル</label>${dch ? `<label class="sp-ck"><input type="checkbox" data-spu="useDate" ${p.useDate ? "checked" : ""}>放送日<small>${dch}話違う</small></label>` : ""}${nch ? `<label class="sp-ck"><input type="checkbox" data-spu="useNum" ${p.useNum ? "checked" : ""}>話数<small>${nch}話違う</small></label>` : ""}</div>
    <p class="sp-sum">${p.rows.length}話分を読み取りました。${p.useSub ? `<b>${ch}話</b>のサブタイトルを更新します${same ? `（${same}話は同じ）` : ""}。` : ""}</p>
    <div class="sp-list">${p.rows.map(r => `<div class="sp-r${r.idx < 0 ? " nomatch" : r.old === r.sub ? " same" : ""}"><span class="epn">${r.idx >= 0 && r.numCh ? (p.useNum ? `<span class="was">${esc(r.oldN)}</span>${r.n}話` : `${esc(r.oldN)}<small class="was">←${r.n}</small>`) : `${r.n}話`}</span><span class="spc">${subCell(r)}${dateCell(r)}</span><span class="sp-st">${r.idx < 0 ? "話がない" : !p.useSub ? (r.dateCh && p.useDate ? "日付" : r.numCh && p.useNum ? "話数" : "") : r.old === r.sub ? (r.dateCh ? "日付のみ" : "同じ") : r.old ? "更新" : "追加"}</span></div>`).join("")}</div>
    ${miss ? `<label class="yr"><input type="checkbox" id="spAdd" ${p.addMissing ? "checked" : ""}>登録されていない${miss}話も新しく追加する</label>` : ""}
    <div class="ffoot"><button type="button" class="u-btn" id="spBack">貼り直す</button><button type="button" class="u-btn" id="spFmt">整形</button><button type="button" class="u-btn pri primary" id="spApply" ${ch || (miss && p.addMissing) || (dch && p.useDate) || (nch && p.useNum) ? "" : "disabled"}>${epEdit ? "話数に反映" : "更新する"}</button></div></div>`;
}
/* 貼り付けた各話リストを読み取り、登録済みの話と比べた一覧を出す */
function readPaste(it) {
  const text = $("#spText").value;
  /* 表をコピーしたもの（タブ区切り）：表として読み、読めない行が上の見出しだけなら、そのまま結果の画面へ */
  if (text.includes("\t")) {
    const g = gridBest(text, it.from);
    const parsed = gridParse(g, it.from);
    if (gridClean(g) && parsed.length && parsed.every(x => x.sub)) return buildPaste(it, parsed, text, g);
    subPaste = { text, grid: g };
    return refreshSheet();
  }
  const parsed = parseSubtitles(text, { from: it.from });
  if (!parsed.length) {
    /* 1話も読み取れないときは、整形の表を開く */
    subPaste = { text, grid: gridBest(text, it.from) };
    refreshSheet();
    return;
  }
  buildPaste(it, parsed, text, null);
}
/* 整形の表を開かなくてよいか：話数が読めない行（赤い行）が、表の上の見出しの行だけ */
function gridClean(g) {
  const bad = g.rows.map(r => gBad(g, r));
  const first = bad.indexOf(false);
  return first >= 0 && bad.slice(first).every(b => !b);
}
/* 読み取った各話（{n, sub, date か md}）を登録済みの話と比べる。grid＝整形から来たとき（戻る先）
   サブタイトルの列がない・空のときは今のサブタイトルのまま（日付だけ直したいとき用） */
function buildPaste(it, parsed, text, grid) {
  const eps = epEdit ? epEdit.list : episodes(it);
  subPaste = {
    text,
    ...(grid ? { fromGrid: grid } : {}),
    parsed,
    addMissing: !eps.length,
    useDate: false,
    /* 更新する項目と合わせ方。match＝"num"（話数で合わせる）／"order"（上から順に合わせる。from＝最初に合わせる登録済みの話） */
    useSub: true,
    useNum: false,
    match: "num",
    from: 0,
  };
  pasteRows(it);
  refreshSheet();
}
/* 読み取った各話を、登録済みの話と組み合わせる（合わせ方で変わる） */
function pasteRows(it) {
  const p = subPaste;
  const eps = epEdit ? epEdit.list : episodes(it);
  const fy = yearOf(it) || new Date().getFullYear();
  p.rows = p.parsed.map((r, k) => {
      const idx = p.match === "order" ? (p.from + k < eps.length ? p.from + k : -1) : eps.findIndex(x => epNum(x.n) === r.n);
      const cur = idx >= 0 ? eps[idx] : null;
      let date = r.date;
      if (!date && r.md) {
        const y = cur && cur.t ? jst(cur.t).y : fy;
        date = `${y}-${String(r.md[0]).padStart(2, "0")}-${String(r.md[1]).padStart(2, "0")}`;
      }
      const oldDay = cur && cur.t ? jst(cur.t).day : "";
      return {
        ...r,
        sub: r.sub || (cur ? cur.sub || "" : ""),
        date,
        idx,
        old: cur ? cur.sub || "" : "",
        oldN: cur ? cur.n : "",
        oldDay,
        dateCh: !!(date && cur && date !== oldDay),
        numCh: !!(cur && epNum(cur.n) !== r.n),
      };
  });
}
/* 読み取った内容でサブタイトル（選んだときは日付も）を更新し、ない話は追加 */
function applyPaste(it) {
  const l = epEdit ? epEdit.list : episodes(it);
  let n = 0,
    dn = 0;
  const p = subPaste;
  const at = (day, old) => {
    const hm = old && old.t ? jst(old.t).hm : hasTime(it) ? it.time : "9:00";
    return dayTimeToT(day, hm);
  };
  let nn = 0;
  p.rows.forEach(r => {
    if (r.idx < 0) return;
    const x = l[r.idx];
    if (p.useSub && x.sub !== r.sub) {
      x.sub = r.sub;
      n++;
    }
    /* 上から順に合わせたときだけ：話数を貼り付けた番号に変える（選んだときだけ） */
    if (p.useNum && p.match === "order" && r.numCh) {
      x.n = `${r.n}話`;
      x.sp = false;
      nn++;
    }
    if (p.useDate && r.dateCh) {
      x.t = at(r.date, x);
      if (!x.t || !hasTime(it)) x.nt = x.nt || !hasTime(it);
      dn++;
    }
  });
  if (p.addMissing) {
    p.rows
      .filter(r => r.idx < 0)
      .sort((a, b) => a.n - b.n)
      .forEach(r => {
        const x = nextEp(it, l);
        x.n = `${r.n}話`;
        x.sub = p.useSub ? r.sub : "";
        if (r.date) {
          x.t = at(r.date, null);
          x.nt = !hasTime(it);
        }
        l.push(x);
        n++;
      });
    l.sort((a, b) => (epNum(a.n) ?? 0) - (epNum(b.n) ?? 0));
  }
  subPaste = null;
  const msg = [n ? `サブタイトル${n}話` : "", dn ? `日付${dn}話` : "", nn ? `話数${nn}話` : ""].filter(Boolean).join("・") || "変更なし";
  /* 話数の編集の中から開いたときは、編集中の話数に入れて編集画面に戻る（保存は「話数を保存」で） */
  if (epEdit) {
    refreshSheet();
    toast(`${msg}を反映しました。「話数を保存」で保存されます`);
    return;
  }
  saveEps(it, l, msg + "を更新しました");
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
  /* 整形：貼り付けた文字を表にする */
  [
    "#spFmt",
    () => {
      /* 読み取った結果の画面から開く。前に整形した表があれば続きから。「戻る」で結果の画面へ */
      const p = subPaste;
      subPaste = { text: p.text, grid: p.fromGrid || gridBest(p.text, (items.find(x => x.id === openId) || {}).from), back: p };
      refreshSheet();
    },
  ],
  /* 列の役割を選ぶ（下から出るリスト。選ぶと閉じる） */
  [
    "[data-gcol]",
    el => {
      const k = "gcol:" + el.dataset.gcol;
      if (ddOpen === k) return closeDD(true);
      openDD(k, el);
    },
  ],
  [
    "[data-gdel]",
    el => {
      subPaste.grid.rows.splice(+el.dataset.gdel, 1);
      refreshSheet();
    },
  ],
  [
    "#gDelBad",
    () => {
      const g = subPaste.grid;
      g.rows = g.rows.filter(r => !gBad(g, r));
      refreshSheet();
    },
  ],
  [
    "#gBack",
    () => {
      subPaste = subPaste.back || { text: subPaste.text };
      refreshSheet();
    },
  ],
  [
    "#gRead",
    (el, it) => {
      const g = subPaste.grid;
      const parsed = gridParse(g, it.from);
      if (!parsed.length) return toast("話数を読み取れる行がありません。話数のマスを確かめてください");
      buildPaste(it, parsed, subPaste.text, g);
    },
  ],
  ["#spApply", (el, it) => applyPaste(it)],
];
