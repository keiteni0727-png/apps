/* ===================== 作品の詳細：基本情報・話数（視聴チェック・各話リストの貼り付け・話数の編集・〇〇編） ===================== */
let openId = null, // 開いている作品
  epEdit = null; // 話数の編集中の下書き
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
let epOne = null; // 1話だけ編集中の話の番号
let epMenu = false; // 話数タブの「…」を開いているか
let stMenu = false; // 視聴ステータスの選択肢を開いているか
let navIds = []; // 詳細を開いた画面に出ていた作品の並び（前・次の作品へ移る順）
/* 一覧・番組表に出ている作品を、画面の上から順に（同じ作品は1回） */
function screenIds() {
  const seen = new Set();
  return [...document.querySelectorAll("#main [data-id]")].map(el => el.dataset.id).filter(id => !seen.has(id) && seen.add(id) && items.some(x => x.id === id));
}
function navNeighbors(id) {
  const i = navIds.indexOf(id);
  return i < 0 ? [null, null] : [navIds[i - 1] || null, navIds[i + 1] || null];
}
/* 長編の「〇〇編」：作品の arcs = [{name, a:最初の話, b:最後の話(なし=最後まで)}] */
let arcEdit = null, // 編集中の下書き
  arcFold = new Map(); // 編ごとの開閉を手で変えたもの（名前#最初の話 → 開いているか）
const arcsOf = it => (it.arcs || []).filter(r => r && r.name && r.a != null).slice().sort((x, y) => x.a - y.a);
const arcKey = r => `${r.name}#${r.a}`;
const arcRange = r => `#${r.a}–${r.b ?? ""}`;
function arcEditHtml() {
  const row = (r, i) => `<div class="ar" data-ar="${i}">
      <input class="ar-nm" value="${esc(r.name || "")}" placeholder="編の名前" aria-label="編の名前" autocomplete="off">
      <input class="ar-a" type="number" min="0" inputmode="numeric" value="${r.a ?? ""}" placeholder="最初" aria-label="最初の話"><span>〜</span><input class="ar-b" type="number" min="0" inputmode="numeric" value="${r.b ?? ""}" placeholder="最後" aria-label="最後の話"><span>話</span>
      <button type="button" class="u-btn icon sm txt del" data-ardel="${i}" aria-label="この編を削除">✕</button></div>`;
  return `<div class="spaste arced">
    <p class="hint" style="margin:0 0 8px">話数は登録済みの番号で（最後を空けると最後まで）</p>
    <div class="arl">${arcEdit.length ? arcEdit.map(row).join("") : `<p class="empty" style="padding:10px 0;text-align:left">まだ編がありません。下のボタンで追加してください。</p>`}</div>
    <button type="button" class="u-btn sm" id="arAdd">＋ 編を追加</button>
    <div class="ffoot"><button type="button" class="u-btn" id="arCancel">キャンセル</button><button type="button" class="u-btn pri primary" id="arSave">保存</button></div></div>`;
}
function arcSync() {
  if (!arcEdit) return;
  document.querySelectorAll("[data-ar]").forEach(el => {
    const r = arcEdit[+el.dataset.ar];
    if (!r) return;
    const num = v => (v.trim() === "" ? null : Math.max(0, parseInt(v, 10) || 0));
    r.name = el.querySelector(".ar-nm").value;
    r.a = num(el.querySelector(".ar-a").value);
    r.b = num(el.querySelector(".ar-b").value);
  });
}
/* しょぼいカレンダーへのリンク（アニメだけ）：作品のページのURLを登録していればそこ、なければ作品名で検索。
   番組詳細の下と、各話リストの貼り付け画面の両方に出す（登録したURLはどちらにも使う） */
const syoboiUrl = it => it.syoboi || `https://cal.syoboi.jp/find?kw=${encodeURIComponent(it.t || "")}`;
const syoboiLab = it => (it.syoboi ? "しょぼいカレンダーを開く ↗" : "しょぼいカレンダーで探す ↗");
const syoboiA = (it, cls) => `<a class="${cls}" href="${esc(syoboiUrl(it))}" target="_blank" rel="noopener">${syoboiLab(it)}</a>`;
const extLinks = it => (it.k === "a" ? `<span class="xlinks">${syoboiA(it, "syb")}</span>` : "");
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
/* 次に見る話：放送済みで未チェックの最初の話（なければ未チェックの最初の話） */
function nextIdx(eps) {
  const a = eps.findIndex(e => !done(e) && aired(e));
  return a >= 0 ? a : eps.findIndex(e => !done(e));
}
/* 話数リストでアラートの対象になっている話：数字以外の話数で「文字で入力」なし／サブタイトルのアラートが出ている作品の空のサブタイトル */
function epWarn(it) {
  const subA = it.k === "a" && missingOf(it).some(x => x.k === "サブタイトル");
  const dc = epDateCheck(it);
  const gd = epGapDup(episodes(it), it.gapOk);
  return (e, i) => ({ n: !epVal(e.n) && !e.sp, s: subA && !(e.sub || "").trim(), d: dc.eps[i] || null, gap: gd.gap.get(i) || null, dup: gd.dup.has(i) });
}
const warnAny = x => x.n || x.s || x.d || x.gap || x.dup;
function epListHtml(it, eps) {
  if (arcEdit) return arcEditHtml();
  const A = it.k === "a";
  if (!eps.length)
    return (
      (A
        ? `<p class="empty" style="padding:12px 0;text-align:left">話数がまだ登録されていません。「話数を登録」から、各話リストを貼り付けるか、1話ずつ追加できます。</p><div class="ephead"><button type="button" class="u-btn sm pri ephb" id="epEditBtn">話数を登録</button></div>`
        : `<p class="empty" style="padding:12px 0;text-align:left">話数がまだ登録されていません。「話数を登録」から追加できます。</p><div class="ephead"><button type="button" class="u-btn sm pri ephb" id="epEditBtn">話数を登録</button></div>`)
    );
  /* 進み具合は見ない話を除いて数える */
  const w = watchable(eps).filter(e => e.w).length,
    wt = watchable(eps).length || 1;
  const nx = nextIdx(eps);
  const arcs = arcsOf(it);
  const warnOf = epWarn(it);
  const warnN = eps.filter((e, i) => warnAny(warnOf(e, i))).length;
  const dc = epDateCheck(it);
  /* 日付のアラートを直すボタン：曜日のずれ（まとめて1日ずらす）・開始日を1話の日付に合わせる */
  const fixDow = dc.dowN ? `<button type="button" id="epFixDow">曜日を放送日に合わせる（${dc.dowN}話を1日ずらす）</button><button type="button" id="epDowOk">曜日のずれ${dc.dowN}話を全部問題なしにする</button>` : "";
  const fixStart = dc.start && !dc.eps[0]?.dow ? `<button type="button" id="epFixStart">開始日を1話の日付（${fmtD(dc.start)}）に合わせる</button><button type="button" id="epShiftStart">話数リストを開始日（${fmtD(normDate(it.from || ""))}）に合わせる</button>` : "";
  const fixBar = fixDow || fixStart ? `<div class="epfix">${fixDow}${fixStart}</div>` : "";
  const arcOfNum = e => {
    const n = epNum(e.n);
    return n == null ? null : arcs.findIndex(r => n >= r.a && (r.b == null || n <= r.b));
  };
  /* 総集編・特別編など数字でない話は、直前の話と同じ編に入れる（先頭なら次の話の編）。編の途中で見出しが分かれないように */
  const arcMap = new Map();
  if (arcs.length) {
    const raw = eps.map(arcOfNum);
    let prev = null;
    raw.forEach((k, i) => {
      if (k == null) k = prev ?? raw.slice(i + 1).find(x => x != null) ?? -1;
      arcMap.set(eps[i], k);
      prev = k;
    });
  }
  const arcIdx = e => (arcMap.has(e) ? arcMap.get(e) : -1);
  /* 1話の行：押すと視聴チェック（見た話は番号の丸を塗る）、右端の ✎ でその話だけ編集。2行目は放送日（見た日は出さない） */
  /* 1話の行（タイムライン）：左の印を押したときだけ視聴チェック（行のほかの所では付かない）。右端の ✎ でその話だけ編集
     見た話は印を塗る・次の話は大きな輪・放送前は点線・特別話（数字以外の話数）はひし形 */
  const epRow = (e, i) => {
    if (epOne === i) return epOneHtml(it, e, i);
    const fut = !aired(e);
    const v = epVal(e.n);
    const nlab = v ? `${v}話` : e.n;
    const when = epWhen(e, it, true);
    const whenTx = when ? `${when}${fut ? " 放送予定" : " 放送"}` : "";
    const st = e.x ? " skip" : e.w ? " seen" : fut ? " future" : " unseen";
    const wn = warnOf(e, i);
    const why = wn.d ? Object.keys(wn.d).map(k => (k === "start" ? `開始日（${fmtD(normDate(it.from || ""))}）と違います` : k === "dow" ? `放送曜日（${"日月火水木金土"[new Date(normDate(it.from || "")).getUTCDay()]}）と1日ずれています` : DATE_WHY[k])).join("・") : "";
    const why2 = [why, wn.dup ? "同じ話数がほかにもあります" : ""].filter(Boolean).join("・");
    const gapRow = wn.gap ? `<div class="tlgap" role="listitem"><span>⚠ ${wn.gap[0] === wn.gap[1] ? `${wn.gap[0]}話` : `${wn.gap[0]}〜${wn.gap[1]}話`}がありません</span><button type="button" class="u-btn sm tlok" data-gapadd="${wn.gap[0]}-${wn.gap[1]}">話数を追加</button><button type="button" class="u-btn sm tlok" data-gapnok="${wn.gap[0]}-${wn.gap[1]}">問題なし</button></div>` : "";
    const meta = `<span class="tlmeta"><b class="tln${wn.n || wn.dup ? " tlbad" : ""}">${wn.n || wn.dup ? "⚠ " : ""}${esc(nlab)}</b>${whenTx ? `<span${wn.d ? ' class="tldbad"' : ""}>${wn.d ? "⚠ " : ""}${whenTx}</span>` : ""}${e.x ? `<b class="epskip">見ない話</b>` : !e.w && !fut ? `<b class="epun">未視聴</b>` : ""}${why2 ? `<span class="tlwhy">${why2}${wn.d && (wn.d.gap || wn.d.rev || wn.d.dow) ? `<button type="button" class="u-btn sm tlok" data-gapok="${i}">問題なし</button>` : ""}</span>` : ""}</span>`;
    const ttl = A && e.sub ? `<span class="tlt">${esc(e.sub)}</span>` : wn.s ? `<span class="tlt tlmiss">⚠ サブタイトル未入力</span>` : "";
    return gapRow + `<div class="tl${st}${i === nx ? " next" : ""}${v ? "" : " sp"}${warnAny(wn) ? " warn" : ""}" role="listitem" id="epr-${i}"><button type="button" class="tlm" role="checkbox" aria-checked="${e.w}"${e.x ? " disabled" : ""} aria-label="${esc(nlab)}${A && e.sub ? " " + esc(e.sub) : ""}を見た" data-ep="${i}"><i class="tll" aria-hidden="true"></i><span class="tld" aria-hidden="true">${e.w ? TL_CHK : ""}</span></button><div class="tlb">${meta}${ttl}</div><button type="button" class="epe" data-epone="${i}" aria-label="${esc(nlab)}を編集" title="この話だけ編集">✎</button></div>`;
  };

  /* 編がある作品：編ごとに見出しを入れ、見終わった編はたたむ（次に見る話がある編は開く） */
  let rowsHtml,
    arcBar = "";
  if (arcs.length) {
    const groups = [];
    eps.forEach((e, i) => {
      const k = arcIdx(e);
      const g = groups[groups.length - 1];
      if (g && g.k === k) g.l.push([e, i]);
      else groups.push({ k, l: [[e, i]] });
    });
    const stat = arcs.map((r, k) => {
      const l = eps.filter(e => arcIdx(e) === k);
      return { w: watchable(l).filter(e => e.w).length, n: watchable(l).length };
    });
    const curK = nx >= 0 ? arcIdx(eps[nx]) : -1;
    rowsHtml = groups
      .map(g => {
        if (g.k < 0) return g.l.map(([e, i]) => epRow(e, i)).join("");
        const r = arcs[g.k],
          st = stat[g.k],
          done = st.n > 0 && st.w === st.n,
          key = arcKey(r);
        /* 開いた直後はすべての編をたたむ（見出しを押すと開く。開いた状態はこの作品を開いている間だけ覚える） */
        const open = arcFold.has(key) ? arcFold.get(key) : false;
        return `<button type="button" class="archd${done ? " done" : ""}${g.k === curK ? " cur" : ""}" data-arc="${esc(key)}" id="arc-${g.k}" aria-expanded="${open}"><span class="arcar">${FOLD_IC}</span><span class="arcnm">${esc(r.name)}</span><span class="arcrg">${arcRange(r)}</span><span class="arcct">${done ? "✓ " : ""}${st.w}/${st.n}</span></button>${open ? g.l.map(([e, i]) => epRow(e, i)).join("") : ""}`;
      })
      .join("");
    arcBar = `<div class="arcbar"><select id="arcJump" aria-label="編へ移動">${arcs.map((r, k) => `<option value="${k}" ${k === curK ? "selected" : ""}>${esc(r.name)}（${arcRange(r)}）${stat[k].w}/${stat[k].n}</option>`).join("")}</select></div>`;
  } else rowsHtml = eps.map(epRow).join("");
  /* 上の段：進み具合のバー・話数を編集・…（あまり使わない操作：まとめてチェック・編の登録） */
  const menu = epMenu
    ? `<div class="epmenu" role="menu"><button type="button" role="menuitem" id="allAired">放送済みの話を全部チェック</button>${w ? `<button type="button" role="menuitem" id="clearAll">チェックを全部外す</button>` : ""}<button type="button" role="menuitem" id="arcOpenEd">${arcs.length ? "編（〇〇編）を編集" : "編（〇〇編）を登録"}</button></div>`
    : "";
  return `<div class="ephead"><div class="prog"><i style="width:${(w / wt) * 100}%"></i></div><button type="button" class="u-btn sm ephb" id="epEditBtn">話数を編集</button><button type="button" class="u-btn icon sm ephb ephm" id="epMenuBtn" aria-haspopup="menu" aria-expanded="${epMenu}" aria-label="そのほかの操作">…</button>${menu}</div>
    ${warnN ? `<button type="button" class="epwarn" id="epWarnGo">⚠ 要確認 ${warnN}話<span>押すと最初の話へ</span></button>` : ""}${fixBar}${arcBar}<div class="eps${A ? "" : " nosub"}" role="list">${rowsHtml}</div>`;
}
/* 年なしの日付を入れたときに使う年：直前の話の日付（1話目は作品の開始日） */
function epRef(it, list, i) {
  for (let k = i - 1; k >= 0; k--) {
    const j = list[k] && jst(list[k].t);
    if (j) return j.day;
  }
  return normDate(it.from || "") || (yearOf(it) ? `${yearOf(it)}-01-01` : "");
}
/* 1話だけ編集：その行を話数・サブタイトル・放送日の入力欄にする */
function epOneHtml(it, e, i) {
  const A = it.k === "a";
  const j = jst(e.t);
  return `<div class="epw e1${A ? "" : " nosub"}${e.w ? " seen" : ""}" role="listitem" data-e1="${i}">
    ${epNumInput("e1-n", e.n, e.sp)}
    ${A ? `<input class="e1-s" value="${esc(e.sub)}" placeholder="サブタイトル" aria-label="サブタイトル" autocomplete="off">` : ""}
    <input class="e1-d dtx" type="text" inputmode="numeric" autocomplete="off" placeholder="2018/08/25" data-ref="${epRef(it, episodes(it), i)}" value="${j ? dtShow(j.day) : ""}" aria-label="放送日（例：2018/08/25）">
    <label class="e1-x"><input type="checkbox" class="e1-xc" ${e.x ? "checked" : ""}><span>見ない話（配信にない総集編など）</span></label>
    <div class="e1-b"><button type="button" class="u-btn sm txt danger e1-del" id="e1Del">削除</button><button type="button" id="e1Cancel">キャンセル</button><button type="button" class="u-btn sm pri" id="e1Save">保存</button></div></div>`;
}
const TL_CHK = `<svg width="10" height="10" viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
/* 話数の入力欄：1つの文字の欄。数字（「3」「第3話」など）なら「3話」、それ以外（SP・総集編など）は書いたとおりの名前にする（parseEpIn）
   数字でも名前でも登録されていない古い書き方の話数は赤枠（そのまま保存すると、書いてあるとおりの名前になる） */
function epNumInput(cls, n, sp) {
  const v = epVal(n);
  const bad = !v && !sp;
  return `<input class="${cls}${bad ? " epbad" : ""}" type="text" value="${esc(v && !sp ? v : n)}" data-orig="${esc(n)}" placeholder="話数" aria-label="話数（数字か、SP・総集編などの名前）" autocomplete="off" autocapitalize="off" spellcheck="false"${bad ? ' title="数字以外の古い書き方の話数です。数字か名前を入れ直してください"' : ""}>`;
}
let erMore = false; // 話数の編集の「その他」を開いているか
function epEditorHtml(it) {
  const l = epEdit.list;
  const A = it.k === "a";
  const gd = epGapDup(l, it.gapOk);
  const n = l.length;
  /* 上の操作：貼り付け・1話追加・その他（まとめて追加・日付・並べ替え） */
  const more = erMore
    ? `<div class="edmore">
      <div class="edm-r"><span>まとめて</span><input id="erBulk" type="number" min="1" max="200" value="${n ? 4 : 12}" inputmode="numeric" aria-label="追加する話数"><span>話</span><button type="button" id="erBulkGo">追加</button></div>
      ${n ? `<button type="button" id="erWeekly" title="日付が空いている話に、前の話の1週間後の日付を入れます">空いた日付を1週間おきに埋める</button>` : ""}
    </div>`
    : "";
  const top = `<div class="edtop">${A ? `<button type="button" class="u-btn pri edpri" id="spOpen">各話リストを貼り付け</button>` : ""}<button type="button" class="u-btn" id="erAdd">＋ 1話追加</button><button type="button" class="u-btn edmb" id="erMore" aria-expanded="${erMore}">その他 ${erMore ? "▴" : "▾"}</button></div>${more}`;
  const head = n ? `<div class="erh${A ? "" : " nosub"}" aria-hidden="true"><span></span><span>話数</span>${A ? "<span>サブタイトル</span>" : ""}<span>放送日</span><span></span></div>` : "";
  const rows = n
    ? l
        .map((e, i) => {
          const j = jst(e.t);
          /* 話数の抜け・重複（抜けた場所に行を入れる。重複した話は赤枠） */
          const g = gd.gap.get(i);
          const gapRow = g ? `<div class="ergap"><span>⚠ ${g[0] === g[1] ? `${g[0]}話` : `${g[0]}〜${g[1]}話`}がありません</span><button type="button" data-ergap="${g[0]}-${g[1]}">追加</button></div>` : "";
          return (
            gapRow +
            `<div class="er${e.moved ? " moved" : ""}${gd.dup.has(i) ? " dup" : ""}" data-er="${i}" data-sortrow>${GRIP("ep")}${epNumInput("er-n", e.n, e.sp)}${A ? `<input class="er-s" value="${esc(e.sub)}" placeholder="サブタイトル" aria-label="サブタイトル" autocomplete="off">` : ""}<input class="er-d dtx" type="text" inputmode="numeric" autocomplete="off" placeholder="2018/08/25" data-ref="${epRef(it, l, i)}" value="${j ? dtShow(j.day) : ""}" aria-label="放送日（例：2018/08/25）"><button type="button" class="u-btn icon sm txt del" data-erdel="${i}" aria-label="${esc(e.n)}を削除">✕</button>${gd.dup.has(i) ? `<span class="erwhy">⚠ 同じ話数がほかにもあります</span>` : ""}</div>`
          );
        })
        .join("")
    : `<p class="empty" style="padding:14px">話がありません。${A ? "各話リストを貼り付けるか、" : ""}「＋ 1話追加」で追加してください。</p>`;
  return `${top}${head}<div class="eped${A ? "" : " nosub"}">${rows}</div>
    <div class="ffoot"><button type="button" class="u-btn" id="erCancel">キャンセル</button><button type="button" class="u-btn pri primary" id="erSave">話数を保存</button></div>`;
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
  rows.push(row("シリーズ", it.series ? `<button type="button" class="ilnk" data-series="${esc(it.series)}">${esc(it.series)}<span class="ilar" aria-hidden="true">›</span></button>` : un("未設定")));
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
  return `<div class="dhead"><div class="hdrow"><div class="meta">${kindTag(it)}${(l => (l ? `<button type="button" class="dmt mtag m-${l[1]}" data-jump="fMedia" title="放送形態を変える">${l[0]}</button>` : ""))(mediaLabOf(it))}${stBtn}</div><div class="hdrow">${navB(-1, "前の作品", CHEV(-1))}${navB(1, "次の作品", CHEV(1))}<button type="button" class="u-btn sm" id="editItem" aria-label="作品を編集">編集</button><button class="u-btn icon sm soft close" type="button" data-close aria-label="閉じる">✕</button></div></div>
    <h3>${esc(it.t)}<button type="button" class="tcopy" id="copyTitle" aria-label="タイトルをコピー" title="タイトルをコピー"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button></h3>
    ${missDetail(it)}
    ${noEp ? "" : `<div class="dtabs" role="tablist"><button type="button" role="tab" data-dtab="info">番組情報</button><button type="button" role="tab" data-dtab="ep">話数${eps.length ? ` <small>${w}/${watchable(eps).length}</small>` : ""}</button></div>`}</div>
    <div class="dpane dp-info">${infoCards(it, { md, ns, mv, stv, cs, songRows })}
    <div class="links">${extLinks(it)}${noEp ? `<button type="button" class="u-chip add epadd" id="epAddMv">＋ 話数を追加</button>` : ""}<button type="button" class="u-chip add epadd" data-jump="relb" data-rbk="new">＋ 関連放送を追加</button><button type="button" class="u-btn sm txt danger delsm" id="delItem">削除</button></div></div>
    <div class="dpane dp-ep"><h4><span class="h4l">話数</span> <small>${eps.length && !epEdit ? `${w} / ${watchable(eps).length}話${nx ? `<span class="nxt">次は ${esc(nx.n)}</span>` : ""}` : ""}</small></h4>
    <div id="epArea">${epEdit ? (subPaste ? subPasteHtml(it) : epEditorHtml(it)) : epListHtml(it, eps)}</div></div>`;
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
  /* 描き直してもスクロール位置はそのまま（整形の表で行を消したときに一番上へ戻らないように） */
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
function epsChanged(it, msg) {
  render();
  if (openId === it.id && !epEdit) refreshSheet();
  if (msg) toast(msg);
}
/* 話数リストをまるごと保存（話数・サブタイトルの編集など） */
async function saveEps(it, list, msg) {
  /* リストをまとめて保存するので、最新のデータが届くまでは保存しない（古い話数で上書きしないため） */
  if (syncBlock()) {
    if (openId === it.id && !epEdit) refreshSheet();
    return;
  }
  msg = applyAutoStatus(it, list, msg);
  const p = progDoc(list);
  prog[it.id] = p;
  epsChanged(it, msg);
  try {
    await saveDoc("progress", it.id, p);
  } catch (e) {
    fail(e);
  }
}
/* 「見た」の印だけを話ごとに保存（idxs＝変えた話の番号）。ほかの端末で同時にチェックしても消し合わない */
async function saveWatch(it, list, idxs, msg) {
  const p = prog[it.id];
  /* 前の形のままの作品は、まとめて保存して今の形にする */
  if (!hasWMap(p) || !db) return saveEps(it, list, msg);
  const ks = epKeys(list),
    patch = {};
  idxs.forEach(i => (patch[ks[i]] = list[i].w ? list[i].wt || 1 : null));
  if (!Object.keys(patch).length) return;
  msg = applyAutoStatus(it, list, msg);
  const at = Date.now();
  prog[it.id] = { ...p, w: { ...p.w, ...patch }, _at: at };
  lastAt = at;
  epsChanged(it, msg);
  try {
    await db.doc(`progress/${it.id}`).update({ w: patch, _at: at });
  } catch (e) {
    fail(e);
  }
}
function toggleEp(it, idx, val) {
  const l = episodes(it);
  if (!l[idx]) return;
  l[idx].w = val;
  l[idx].wt = val ? Date.now() : 0;
  saveWatch(it, l, [idx], `${l[idx].n}を${val ? "視聴済み" : "未視聴"}にしました`);
  if (val) askSub(it, idx);
}
/* サブタイトルが空の話を視聴済みにしたら、その場で入力できる小さな画面を出す（アニメのみ） */
let subAsk = null;
function askSub(it, idx) {
  const e = episodes(it)[idx];
  if (it.k !== "a" || !e || (e.sub || "").trim()) return;
  subAsk = { id: it.id, idx };
  let box = $("#subPop");
  if (!box) {
    box = document.createElement("div");
    box.id = "subPop";
    document.body.appendChild(box);
  }
  box.innerHTML = `<div class="spop-scrim" data-spopx></div><div class="spop" role="dialog" aria-modal="true" aria-label="サブタイトルを入力">
    <p class="spop-h"><small>${esc(it.t)}</small><b>${esc(e.n)}</b>のサブタイトル</p>
    <input id="spopIn" autocomplete="off" enterkeyhint="done" placeholder="サブタイトルを入力" aria-label="サブタイトル">
    <div class="spop-f"><button type="button" class="u-btn" data-spopx>あとで</button><button type="button" class="u-btn pri primary" data-spopok>保存</button></div></div>`;
  if (!TOUCH) setTimeout(() => $("#spopIn")?.focus(), 30);
}
function closeSub() {
  subAsk = null;
  const b = $("#subPop");
  if (b) b.innerHTML = "";
}
function saveSub() {
  if (!subAsk) return;
  const v = ($("#spopIn")?.value || "").trim();
  const it = items.find(x => x.id === subAsk.id);
  const idx = subAsk.idx;
  closeSub();
  if (!v || !it) return;
  const l = episodes(it);
  if (!l[idx]) return;
  l[idx].sub = v;
  saveEps(it, l, "サブタイトルを保存しました");
}
function nextEp(it, list) {
  const last = list[list.length - 1];
  const n = last ? epNum(last.n) : null;
  const ova = mediaOf(it).media === "ova";
  const t = last ? (last.t && !ova ? last.t + WEEK : 0) : it.from ? dayTimeToT(it.from, it.time) : 0;
  return { n: `${n != null ? Math.floor(n) + 1 : list.length + 1}話`, sub: "", t, w: false, nt: last ? !!last.nt : !hasTime(it) };
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
  /* 各話リストの貼り付けの合わせ方：話数で／上から順に */
  [
    "[data-spm]",
    (el, it) => {
      if (!subPaste || !subPaste.parsed) return;
      subPaste.match = el.dataset.spm;
      if (subPaste.match === "num") subPaste.useNum = false;
      pasteRows(it);
      refreshSheet();
    },
  ],
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
  [
    "#spOpen",
    () => {
      subPaste = { text: "" };
      refreshSheet();
      if (!TOUCH) $("#spText")?.focus({ preventScroll: true });
    },
  ],
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
/* 編の編集中 */
const ARC_ACTIONS = [
  [
    "#arCancel",
    () => {
      arcEdit = null;
      refreshSheet();
    },
  ],
  [
    "#arAdd",
    () => {
      arcSync();
      const last = arcEdit[arcEdit.length - 1];
      arcEdit.push({ name: "", a: last ? (last.b != null ? last.b + 1 : null) : 1, b: null });
      refreshSheet();
      const ins = document.querySelectorAll(".ar-nm");
      if (!TOUCH) ins[ins.length - 1]?.focus();
    },
  ],
  [
    "[data-ardel]",
    el => {
      arcSync();
      arcEdit.splice(+el.dataset.ardel, 1);
      refreshSheet();
    },
  ],
  [
    "#arSave",
    (el, it) => {
      arcSync();
      const l = arcEdit.map(r => ({ name: (r.name || "").trim(), a: r.a, b: r.b })).filter(r => r.name || r.a != null || r.b != null);
      if (l.some(r => !r.name || r.a == null)) return toast("編の名前と最初の話を入れてください");
      if (l.some(r => r.b != null && r.b < r.a)) return toast("最後の話が最初の話より前になっている編があります");
      l.sort((x, y) => x.a - y.a);
      arcEdit = null;
      saveTitle(it.id, { arcs: l }, l.length ? "編を保存しました" : "編を消しました");
    },
  ],
];
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
/* 話数の編集中 */
const EPEDIT_ACTIONS = [
  [
    "#erCancel",
    () => {
      epEdit = null;
      subPaste = null;
      refreshSheet();
    },
  ],
  [
    "#erSave",
    (el, it) => {
      const l = epEdit.list.map(({ moved, ...x }) => x);
      epEdit = null;
      saveEps(it, l, "話数を保存しました");
      refreshSheet();
    },
  ],
  [
    "#erMore",
    () => {
      erMore = !erMore;
      refreshEditor();
    },
  ],
  /* 日付のない話を、前の日付のある話から1週間おきに埋める（最初の話に日付がなければ開始日から） */
  [
    "#erWeekly",
    (el, it) => {
      const l = epEdit.list;
      let prev = null,
        n = 0;
      l.forEach((x, k) => {
        if (x.t) return void (prev = x);
        let t = 0;
        if (prev) t = prev.t + WEEK;
        else if (!k && it.from) t = dayTimeToT(normDate(it.from), hasTime(it) ? it.time : "9:00");
        if (!t) return;
        x.t = t;
        x.nt = prev ? prev.nt : !hasTime(it);
        x.moved = true;
        prev = x;
        n++;
      });
      toast(n ? `${n}話に日付を入れました` : "埋める話がありません（1話か開始日の日付が必要です）");
      refreshEditor();
    },
  ],
  [
    "#erAdd",
    (el, it) => {
      epEdit.list.push(nextEp(it, epEdit.list));
      refreshEditor();
    },
  ],
  [
    "#erBulkGo",
    (el, it) => {
      const n = Math.min(200, +$("#erBulk").value || 0);
      for (let k = 0; k < n; k++) epEdit.list.push(nextEp(it, epEdit.list));
      refreshEditor();
    },
  ],
  /* 編集画面：抜けている話数を、抜けた場所に足す（保存するまで反映しない） */
  [
    "[data-ergap]",
    (el, it) => {
      const [a, b] = el.dataset.ergap.split("-").map(Number);
      gapFill(it, epEdit.list, a, b);
      refreshEditor();
    },
  ],
  [
    "[data-erdel]",
    el => {
      epEdit.list.splice(+el.dataset.erdel, 1);
      refreshEditor();
    },
  ],
];
/* 抜けている話数（a〜b話）を、抜けた場所（b+1話の前）に足す。日付は前の話の1週間おき（前の話に日付がなければ空） */
function gapFill(it, list, a, b) {
  const nums = list.map(e => (e.sp ? null : epNum(e.n)));
  let at = nums.findIndex(n => n != null && n > b);
  if (at < 0) at = list.length;
  const prev = list.slice(0, at).filter(e => e.t).pop() || null;
  const add = [];
  for (let k = a; k <= b; k++) {
    const base = add.length ? add[add.length - 1] : prev;
    const e = { ...nextEp(it, base ? [base] : []), n: `${k}話` };
    if (!base || !base.t) e.t = 0;
    add.push(e);
  }
  list.splice(at, 0, ...add);
  return add.length;
}
/* 1話だけ編集の保存：その話だけを書き換える（ほかの話の日付はずらさない） */
function saveEpOne(it) {
  const r = $(".e1");
  const l = episodes(it);
  const x = r && l[epOne];
  if (!x) {
    epOne = null;
    return refreshSheet();
  }
  const dI = r.querySelector(".e1-d");
  const day = normDate(dI.value, dI.dataset.ref);
  if (day === null) return toast("日付は 2018/08/25 のように入力してください");
  const nv = r.querySelector(".e1-n").value.trim();
  if (nv) Object.assign(x, parseEpIn(nv));
  const s = r.querySelector(".e1-s");
  if (s) x.sub = s.value.trim();
  x.x = !!r.querySelector(".e1-xc")?.checked;
  const j = jst(x.t);
  if (!day) x.t = 0;
  else if (!j || j.day !== day) {
    const hm = j ? j.hm : hasTime(it) ? it.time : "9:00";
    if (!x.t) x.nt = !hasTime(it);
    x.t = dayTimeToT(day, hm);
  }
  const name = x.n;
  epOne = null;
  saveEps(it, l, `${name}を保存しました`);
}
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

/* 話数の編集：⠿で1話ずつ並び替え（しくみは shared/u-core.js の GRIP） */
SORT_DONE.ep = (box, rows) => {
  if (!epEdit) return;
  const l = epEdit.list;
  epEdit.list = rows.map(r => l[+r.dataset.er]).filter(Boolean);
  refreshEditor();
};
