/* ===================== 作品の詳細：基本情報・話数（視聴チェック・各話リストの貼り付け・話数の編集・〇〇編） ===================== */
let openId = null, // 開いている作品
  epEdit = null; // 話数の編集中の下書き
/* 貼り付けた各話リストから「話数 → サブタイトル」を読み取る */
const KN = { 〇: 0, 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
function kanjiNum(t) {
  if (/^\d+$/.test(t)) return +t;
  let total = 0,
    cur = 0;
  for (const c of t) {
    if (c in KN) cur = cur * 10 + KN[c];
    else if (c === "十") {
      total += (cur || 1) * 10;
      cur = 0;
    } else if (c === "百") {
      total += (cur || 1) * 100;
      cur = 0;
    } else return NaN;
  }
  return total + cur;
}
const EP_RE =
  /^\s*(?:第\s*([0-9０-９〇零一二三四五六七八九十百]+)\s*[話回]|#\s*([0-9０-９]+)|([0-9０-９]+)\s*[話回]|([0-9０-９]+)(?=\t))\s*[\t:：.．\s]*(.*)$/;
const zen = s => s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
function cleanSub(s) {
  return s
    .replace(/\[(?:各回補足|注釈?|注|脚注|補足)?\s*[0-9０-９a-zA-Z]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^「(.*)」$|^『(.*)』$|^"(.*)"$/, (m, a, b, c) => (a ?? b ?? c)); // 全体を囲むカッコだけ外す（途中の『』は残す）
}
function parseSubtitles(text) {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split("\n");
  const out = [];
  let open = null,
    last = null; // open: 直前の行がサブタイトルで終わっていて、次の行に続きがある可能性
  let yearHead = null, // 「2002年」だけの行（以降の放送日の年）
    leadMode = false, // 「放送日 → 話数 → サブタイトル」の順の表
    prevLead = null;
  for (const raw of lines) {
    let line = raw.replace(/ /g, " ");
    const yh = zen(line).match(/^\s*(\d{4})\s*年\s*$/);
    if (yh) {
      yearHead = +yh[1];
      open = null;
      continue;
    }
    // 先頭が放送日の行（例: 10月3日<TAB>1<TAB>サブタイトル）は日付を外して話数の行として読む
    let lead = null;
    const ld = zen(line).match(/^\s*(?:(\d{4})\s*年\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*\t/);
    if (ld && EP_RE.test(line.slice(ld[0].length))) {
      if (ld[1]) yearHead = +ld[1];
      lead = `${yearHead ? yearHead + "年" : ""}${ld[2]}月${ld[3]}日`;
      line = line.slice(ld[0].length);
      leadMode = true;
    }
    const m = EP_RE.exec(line);
    if (m) {
      // 2話連続放送などで日付の列が空の行は、直前の放送日を引き継ぐ
      if (!lead && leadMode && prevLead) lead = prevLead;
      if (lead) prevLead = lead;
      const n = kanjiNum(zen(m[1] || m[2] || m[3] || m[4]));
      if (!Number.isFinite(n)) {
        open = null;
        continue;
      }
      const rest = m[5] || "";
      const parts = rest.split("\t");
      let sub = parts[0],
        blk = parts.slice(1).join(" ");
      if (!line.includes("\t") && /「.+」/.test(rest)) {
        const q = rest.match(/「(.+?)」/);
        sub = q[1];
        blk = rest.slice(q.index + q[0].length);
      } // 「第1話「タイトル」」形式
      const e = { n, sub: cleanSub(sub), blk, lead };
      out.push(e);
      last = e;
      open = parts.length === 1 && line.includes("\t") ? e : null;
      continue;
    }
    let rest2 = line;
    if (open) {
      const ps = line.split("\t");
      const first = ps[0].trim();
      if (first && !/^(\d{4}年|\d{1,2}月\d{1,2}日|第\d+シーズン|第[一二三四五六七八九十]+期)/.test(first)) {
        open.sub = cleanSub(open.sub + " " + first);
        rest2 = ps.slice(1).join(" ");
      }
      open = null;
    }
    if (/^\s*第\s*[0-9０-９一二三四五六七八九十]+\s*(シーズン|期|部|章)/.test(line)) {
      last = null;
      continue;
    }
    if (last) last.blk += " " + rest2;
  }
  // 初放送日: 各話の行と続きの行から最後の日付を拾う。年が省略された行は直前の年を引き継ぐ
  let year = null,
    prevM = 0;
  out.forEach(e => {
    const t = zen(e.lead || e.blk || "");
    delete e.lead;
    const re = /(?:(\d{4})\s*[年\/\-.]\s*)?(\d{1,2})\s*[月\/\-.]\s*(\d{1,2})\s*日?/g;
    let m,
      hit = null;
    while ((m = re.exec(t))) if (+m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31) hit = m;
    if (!hit) {
      delete e.blk;
      return;
    }
    let y = hit[1] ? +hit[1] : year;
    const mo = +hit[2],
      d = +hit[3];
    if (!hit[1] && y && mo < prevM) y++;
    if (y) {
      year = y;
      prevM = mo;
      e.date = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    } else e.md = [mo, d];
    delete e.blk;
  });
  // 同じ話数が複数あれば最初のもの（第2シーズンで番号が戻る場合は別の範囲として貼る）
  const seen = new Set();
  return out.filter(e => e.sub && !seen.has(e.n) && seen.add(e.n));
}

let subPaste = null; // {text, rows:[{n,sub,idx,old}], addMissing}（話数の編集の中で開き、編集中の話数に反映する）
let epOne = null; // 1話だけ編集中の話の番号
let stMenu = false; // 視聴ステータスの選択肢を開いているか
let navIds = []; // 詳細を開いた画面に出ていた作品の並び（前・次の作品へ移る順）
/* 一覧・番組表・視聴記録に出ている作品を、画面の上から順に（同じ作品は1回） */
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
      <input class="ar-nm" value="${esc(r.name || "")}" placeholder="例：サイヤ人編" aria-label="編の名前" autocomplete="off">
      <input class="ar-a" type="number" min="0" inputmode="numeric" value="${r.a ?? ""}" placeholder="最初" aria-label="最初の話"><span>〜</span><input class="ar-b" type="number" min="0" inputmode="numeric" value="${r.b ?? ""}" placeholder="最後" aria-label="最後の話"><span>話</span>
      <button type="button" class="del" data-ardel="${i}" aria-label="この編を削除">✕</button></div>`;
  return `<div class="spaste arced">
    <p class="hint" style="margin:0 0 8px">長い作品を「〇〇編」で区切ります。話数は登録済みの話の番号で入れてください（最後の話を空けると、最後まで）。</p>
    <div class="arl">${arcEdit.length ? arcEdit.map(row).join("") : `<p class="empty" style="padding:10px 0;text-align:left">まだ編がありません。下のボタンで追加してください。</p>`}</div>
    <button type="button" class="u-btn ghost sm" id="arAdd">＋ 編を追加</button>
    <div class="ffoot"><button type="button" class="u-btn ghost" id="arCancel">キャンセル</button><button type="button" class="u-btn pri primary" id="arSave">保存</button></div></div>`;
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
function subPasteHtml(it) {
  const p = subPaste;
  if (!p.rows)
    return `<div class="spaste">
    <p class="hint" style="margin:0 0 8px">Wikipediaの「各話リスト」などをそのまま貼り付けてください。話数とサブタイトルだけを読み取り、ほかの列（絵コンテ・演出・放送日など）は無視します。</p>
    <textarea id="spText" rows="8" placeholder="第一話	人生万事塞翁が虎	五十嵐卓哉 …&#10;第二話	或る爆弾	…">${esc(p.text || "")}</textarea>
    <div class="ffoot"><button type="button" class="u-btn ghost" id="spCancel">キャンセル</button><button type="button" class="u-btn pri primary" id="spRead">読み取る</button></div></div>`;
  const ch = p.rows.filter(r => r.idx >= 0 && r.old !== r.sub).length,
    same = p.rows.filter(r => r.idx >= 0 && r.old === r.sub && !r.dateCh).length,
    miss = p.rows.filter(r => r.idx < 0).length,
    dch = p.rows.filter(r => r.dateCh).length;
  const md = d => (d ? `${+d.slice(5, 7)}/${+d.slice(8, 10)}` : "");
  return `<div class="spaste">
    <p class="sp-sum">${p.rows.length}話分を読み取りました。<b>${ch}話</b>のサブタイトルを更新します${same ? `（${same}話は同じ）` : ""}。</p>
    <div class="sp-list">${p.rows.map(r => `<div class="sp-r${r.idx < 0 ? " miss" : r.old === r.sub ? " same" : ""}"><span class="epn">${r.n}話</span><span>${esc(r.sub)}${r.idx >= 0 && r.old && r.old !== r.sub ? `<small>今：${esc(r.old)}</small>` : ""}</span>${r.dateCh ? `<small class="dch${p.useDate ? " on" : ""}">日付 ${md(r.oldDay)} → <b>${md(r.date)}</b>${r.date.slice(0, 4) !== r.oldDay.slice(0, 4) ? `（${r.date.slice(0, 4)}年）` : ""}</small>` : ""}<span class="sp-st">${r.idx < 0 ? "話がない" : r.old === r.sub ? (r.dateCh ? "日付のみ" : "同じ") : r.old ? "更新" : "追加"}</span></div>`).join("")}</div>
    ${dch ? `<div class="dconfirm"><b>貼り付けた放送日が、登録済みの日付と${dch}話分違います。</b><label class="yr"><input type="checkbox" id="spDate" ${p.useDate ? "checked" : ""}>日付も貼り付けた内容に更新する（時刻はそのまま）</label></div>` : ""}
    ${miss ? `<label class="yr"><input type="checkbox" id="spAdd" ${p.addMissing ? "checked" : ""}>登録されていない${miss}話も新しく追加する</label>` : ""}
    <div class="ffoot"><button type="button" class="u-btn ghost" id="spBack">貼り直す</button><button type="button" class="u-btn pri primary" id="spApply" ${ch || (miss && p.addMissing) || (dch && p.useDate) ? "" : "disabled"}>${epEdit ? "話数に反映" : dch && p.useDate ? "サブタイトルと日付を更新" : "サブタイトルを更新"}</button></div></div>`;
}
/* 次に見る話：放送済みで未チェックの最初の話（なければ未チェックの最初の話） */
function nextIdx(eps) {
  const a = eps.findIndex(e => !e.w && aired(e));
  return a >= 0 ? a : eps.findIndex(e => !e.w);
}
function epListHtml(it, eps) {
  if (arcEdit) return arcEditHtml();
  const A = it.k === "a";
  if (!eps.length)
    return (
      (A
        ? `<p class="empty" style="padding:12px 0;text-align:left">話数がまだ登録されていません。「話数を編集」から追加してください（その中の「Wikiから貼り付け」で各話リストも取り込めます）。</p><div class="epset"><button type="button" id="epEditBtn">話数を編集</button></div>`
        : `<p class="empty" style="padding:12px 0;text-align:left">話数がまだ登録されていません。「話数を編集」から追加できます。</p><div class="epset"><button type="button" id="epEditBtn">話数を編集</button></div>`)
    );
  const w = eps.filter(e => e.w).length;
  const nx = nextIdx(eps);
  const arcs = arcsOf(it);
  const arcIdx = e => {
    const n = epNum(e.n);
    return arcs.findIndex(r => n >= r.a && (r.b == null || n <= r.b));
  };
  /* 1話の行：押すと視聴チェック、右端の ✎ でその話だけ編集 */
  const epRow = (e, i) => {
    if (epOne === i) return epOneHtml(it, e, i);
    const fut = !aired(e);
    return `<div class="epw${e.w ? " seen" : ""}${i === nx ? " next" : ""}" role="listitem"><button type="button" class="ep${fut ? " future" : ""}${e.w ? " seen" : ""}${i === nx ? " next" : ""}" role="checkbox" aria-checked="${e.w}" data-ep="${i}"><span class="box">${e.w ? "✓" : ""}</span><span class="epn">${esc(e.n)}</span><span class="eps-sub">${A ? esc(e.sub || "") : ""}</span><span class="epd">${epWhen(e, it, true)}</span></button><button type="button" class="epe" data-epone="${i}" aria-label="${esc(e.n)}を編集" title="この話だけ編集">✎</button></div>`;
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
      return { w: l.filter(e => e.w).length, n: l.length };
    });
    const curK = nx >= 0 ? arcIdx(eps[nx]) : -1;
    rowsHtml = groups
      .map(g => {
        if (g.k < 0) return g.l.map(([e, i]) => epRow(e, i)).join("");
        const r = arcs[g.k],
          st = stat[g.k],
          done = st.n > 0 && st.w === st.n,
          key = arcKey(r);
        const open = arcFold.has(key) ? arcFold.get(key) : !done || g.k === curK;
        return `<button type="button" class="archd${done ? " done" : ""}${g.k === curK ? " cur" : ""}" data-arc="${esc(key)}" id="arc-${g.k}" aria-expanded="${open}"><span class="arcar" aria-hidden="true">${open ? "▼" : "▶"}</span><span class="arcnm">${esc(r.name)}</span><span class="arcrg">${arcRange(r)}</span><span class="arcct">${done ? "✓ " : ""}${st.w}/${st.n}</span></button>${open ? g.l.map(([e, i]) => epRow(e, i)).join("") : ""}`;
      })
      .join("");
    arcBar = `<div class="arcbar"><select id="arcJump" aria-label="編へ移動">${arcs.map((r, k) => `<option value="${k}" ${k === curK ? "selected" : ""}>${esc(r.name)}（${arcRange(r)}）${stat[k].w}/${stat[k].n}</option>`).join("")}</select></div>`;
  } else rowsHtml = eps.map(epRow).join("");
  return `<div class="epset"><button type="button" id="allAired">放送済み<span class="epx">を全部</span> ✓</button>${w ? `<button type="button" id="clearAll">全部外す</button>` : ""}<button type="button" id="epEditBtn">話数を編集</button><button type="button" id="arcOpenEd">編を登録</button></div>
    ${arcBar}<div class="prog"><i style="width:${(w / eps.length) * 100}%"></i></div><div class="eps" role="list">${rowsHtml}</div>`;
}
/* 1話だけ編集：その行を話数・サブタイトル・放送日の入力欄にする */
function epOneHtml(it, e, i) {
  const A = it.k === "a";
  const j = jst(e.t);
  return `<div class="epw e1${A ? "" : " nosub"}" role="listitem" data-e1="${i}">
    <input class="e1-n" value="${esc(e.n)}" aria-label="話数" autocomplete="off">
    ${A ? `<input class="e1-s" value="${esc(e.sub)}" placeholder="サブタイトル" aria-label="サブタイトル" autocomplete="off">` : ""}
    <input class="e1-d dtx" type="text" inputmode="numeric" autocomplete="off" placeholder="2018/08/25" value="${j ? dtShow(j.day) : ""}" aria-label="放送日（例：2018/08/25）">
    <div class="e1-b"><button type="button" class="e1-del" id="e1Del">削除</button><button type="button" id="e1Cancel">キャンセル</button><button type="button" class="pri" id="e1Save">保存</button></div></div>`;
}
function epEditorHtml(it) {
  const l = epEdit.list;
  const A = it.k === "a";
  return `${A ? `<div class="edtop"><button type="button" id="spOpen">Wikiから貼り付け</button><span class="hint">各話リストからサブタイトル・放送日を読み取ります</span></div>` : ""}<div class="eped${A ? "" : " nosub"}">${
    l.length
      ? l
          .map((e, i) => {
            const j = jst(e.t);
            return `<div class="er${e.moved ? " moved" : ""}" data-er="${i}">
      <input class="er-n" value="${esc(e.n)}" aria-label="話数">
      ${A ? `<input class="er-s" value="${esc(e.sub)}" placeholder="サブタイトル" aria-label="サブタイトル">` : ""}
      <input class="er-d dtx" type="text" inputmode="numeric" autocomplete="off" placeholder="2018/08/25" value="${j ? dtShow(j.day) : ""}" aria-label="放送日（例：2018/08/25）">
      <button type="button" class="del" data-erdel="${i}" aria-label="${esc(e.n)}を削除">✕</button></div>`;
          })
          .join("")
      : `<p class="empty" style="padding:14px">話がありません。下のボタンで追加してください。</p>`
  }</div>
    <div class="edfoot"><button type="button" id="erAdd">＋ 1話追加</button><span>まとめて</span><input id="erBulk" type="number" min="1" max="200" value="${l.length ? 4 : 12}" inputmode="numeric" aria-label="追加する話数"><button type="button" id="erBulkGo">話追加</button></div>
    <p class="hint" style="margin:8px 0 0">日付を変えると、その後の話も1週間おきに自動でずれます。時刻は${esc(it.time || "各話の時刻")}のままです。</p>
    <div class="ffoot"><button type="button" class="u-btn ghost" id="erCancel">キャンセル</button><button type="button" class="u-btn pri primary" id="erSave">話数を保存</button></div>`;
}
/* 基本情報：放送・主題歌・リンクのカード。各部分を押すと、その項目を開いた状態の編集画面へ */
/* 配信ボタンの名前：配信サイトが1つだけならその名前、それ以外は「配信」 */
function vodName(it) {
  const m = mediaOf(it);
  const l = [...new Set(m.media === "stream" ? m.plat : m.vods)];
  return l.length === 1 ? l[0] : "配信";
}
function infoCards(it, { md, ns, mv, stv, cs, songRows }) {
  const un = t => `<span class="unset">${t}</span>`;
  const nn = t => `<span class="nosong">${t}</span>`;
  const when = [it.dow >= 0 ? DOW[it.dow] + "曜 " : "", it.time || ""].join("").trim();
  const per = periodOf(it);
  const cour = cs.map(courLabel).join("・");
  /* ON AIR：「項目名　内容」を1行ずつ。押すとその項目をその場で編集 */
  const m = mediaOf(it);
  const row = (lab, val, jump) => `<dt data-jump="${jump}">${lab}</dt><dd data-jump="${jump}">${val}</dd>`;
  const courChip = cour ? `<span class="icour" data-jump="coursBox">${esc(cour)}</span>` : "";
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
    rows.push(row("配信", labsOr(m.vods, m.vods.map(vlab).join(""), "vods"), "fMedia"));
  }
  const bc = `<div class="icard ibc"><div class="ich"><span class="ilamp onair">ON AIR</span></div><dl class="idl">${rows.join("")}</dl></div>`;
  /* 外部リンクのアイコン（公式サイト＝外に開く、配信＝再生） */
  const IC_EXT = `<svg class="iic" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M13.5 2.5 7.5 8.5M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const IC_PLAY = `<svg class="iic ply" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M6.5 5.2v5.6L11 8z" fill="#fff"/></svg>`;
  /* MUSIC：1曲1行。左に種類、曲名（太字）、その下に「アーティスト・使われた話」、右端にDL */
  const songs = songRows
    .map(r => {
      const { st, ar } = songTA(r.x);
      /* 2行目：「歌」ラベル＋アーティスト、使われた話は枠つきの小さなラベルで見分けやすく */
      /* 話は範囲ごとに1つずつの枠ラベル（飛び飛びでも [1〜10話] [13話] [20〜30話] と分けて並べる） */
      const sub = [ar.trim() ? `<span class="iar"><b>歌</b>${esc(ar)}</span>` : "", r.rng.length ? `<span class="ieps">${r.rng.map((t, j) => `<span class="iep inum${j === r.now ? " now " + SG_CLS[r.k] : ""}">${esc(t)}</span>`).join("")}</span>` : ""].filter(Boolean).join("");
      return `<div class="imsg${songRows.nowN == null ? "" : r.now >= 0 ? " isnow" : " notnow"}" data-jump="sgList"><span class="itag ${SG_CLS[r.k]}">${r.k}</span><span class="imn">${st.trim() ? esc(st) : un("曲名 未設定")}</span>${sub ? `<span class="ima">${sub}</span>` : ""}<button type="button" class="dlb${r.x.dl ? " on" : ""}" data-sgdl="${r.i}" aria-pressed="${!!r.x.dl}" aria-label="${esc(r.x.s)}を${r.x.dl ? "未ダウンロードに戻す" : "ダウンロード済みにする"}">${r.x.dl ? "♪DL" : "DL"}</button></div>`;
    })
    .join("");
  const links = `<div class="ilinks">${
    it.series
      ? `<button type="button" class="ilk" data-series="${esc(it.series)}">シリーズ作品</button>`
      : `<button type="button" class="ilk off" data-jump="fSeries">シリーズ未設定</button>`
  }${
    it.url
      ? `<a class="ilk" href="${esc(it.url)}" target="_blank" rel="noopener"><span class="ilt">公式サイト</span>${IC_EXT}</a>`
      : `<button type="button" class="ilk off" data-jump="f-url">公式サイト${nofHas(it, "url") ? "なし" : "未設定"}</button>`
  }${
    it.vurl
      ? `<a class="ilk ivod" href="${esc(it.vurl)}" target="_blank" rel="noopener" aria-label="${esc(vodName(it))}で見る">${IC_PLAY}<span class="ilt">${esc(vodName(it))}</span></a>`
      : `<button type="button" class="ilk off" data-jump="f-vurl">配信URL${nofHas(it, "vurl") ? "なし" : "未設定"}</button>`
  }</div>`;
  return bc + (songs ? `<div class="icard imusic"><div class="ich"><span class="ilamp music">MUSIC</span>${songRows.nowN != null ? `<span class="inow">${songRows.nowN}話で流れた曲</span>` : ""}</div>${songs}</div>` : "") + links;
}
function renderDetail(it) {
  const cs = coursOf(it);
  const stv = mediaLabels(it);
  const span = it.k === "a" ? epSpan(it) : null;
  const sl = songsOf(it).map(x =>
    span && (x.type === "OP" || x.type === "ED") && x.a == null && x.b == null && !exOf(x).length ? { ...x, a: span[0], b: span[1] } : x,
  );
  /* 1曲1行：種類・使われた話・曲名／アーティスト・DL。同じ種類が複数ある作品だけ話数の列を出す */
  const byType = SONG_TYPES.map(tp => [tp, sl.map((x, k) => [x, k]).filter(([x]) => x.type === tp)]);
  /* 話数の列：話が2話以上ある作品は常に出す。範囲を入れていない曲は全話で使われる曲として「全話」 */
  const showRng = episodes(it).length > 1 || byType.some(([, l]) => l.length > 1 && l.some(([x]) => rangeList(x).length));
  /* 曲の行のデータ（種類の順・同じ種類の中は登録順）。rng＝使われた話 */
  /* 視聴中の作品は、最後に見た話（並びで一番後ろの視聴済みの話）で流れた曲を目立たせる。now＝塗るラベルの番号 */
  const lastW = it.s === "視聴中" ? [...episodes(it)].reverse().find(e => e.w) : null;
  const nowN = lastW ? epNum(lastW.n) : NaN;
  const hasNow = showRng && Number.isFinite(nowN) && nowN > 0;
  const songRows = byType.flatMap(([tp, l]) =>
    l.map(([x, k]) => {
      const rl = rangeList(x);
      const rng = showRng ? (rl.length ? rl : l.length === 1 ? ["全話"] : []) : [];
      const now = !hasNow || !rng.length ? -1 : rl.length ? rangeHit(x, nowN) : 0;
      return { k: tp, x, i: k, rng, now };
    }),
  );
  songRows.nowN = hasNow && songRows.some(r => r.now >= 0) ? nowN : null;
  const md = mediaOf(it).media,
    mv = md === "movie",
    ns = noSched(md);
  const eps = episodes(it);
  const w = eps.filter(e => e.w).length;
  const nx = eps[nextIdx(eps)];
  /* 視聴ステータスはラベル1つ。押すと4つの選択肢が開く */
  const stBtn = `<span class="stw"><button type="button" class="pill dst ${it.s ? "s-" + esc(it.s) : "s-none"}" id="stOpen" aria-haspopup="true" aria-expanded="${stMenu}">${esc(stLabel(it.s || "未設定"))}<span class="stv" aria-hidden="true">▾</span></button>${stMenu ? `<span class="stmenu" role="menu">${STATUSES.map(s => `<button type="button" role="menuitemradio" data-set="${s}" aria-checked="${it.s === s}" class="s-${s}">${stLabel(s)}</button>`).join("")}</span>` : ""}</span>`;
  const nv = navNeighbors(it.id),
    busy = !!(epEdit || arcEdit || subPaste || epOne != null);
  const navB = (d, lab, ic) => `<button type="button" class="dnav" data-dnav="${d}" aria-label="${lab}" title="${lab}${TOUCH ? "" : `（${d < 0 ? "←" : "→"}キー）`}" ${nv[d < 0 ? 0 : 1] && !busy ? "" : "disabled"}>${ic}</button>`;
  return `<div class="dhead"><div class="hdrow"><div class="meta">${kindTag(it)}${(l => (l ? `<button type="button" class="dmt mtag m-${l[1]}" data-jump="fMedia" title="放送形態を変える">${l[0]}</button>` : ""))(mediaLabOf(it))}${stBtn}</div><div class="hdrow">${navB(-1, "前の作品", "‹")}${navB(1, "次の作品", "›")}<button type="button" class="editbtn" id="editItem">編集</button><button class="close" type="button" data-close aria-label="閉じる">✕</button></div></div>
    <h3>${esc(it.t)}<button type="button" class="tcopy" id="copyTitle" aria-label="タイトルをコピー" title="タイトルをコピー"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button></h3>
    ${missDetail(it)}
    <div class="dtabs" role="tablist"><button type="button" role="tab" data-dtab="info">番組情報</button><button type="button" role="tab" data-dtab="ep">話数${eps.length ? ` <small>${w}/${eps.length}</small>` : ""}</button></div></div>
    <div class="dpane dp-info">${infoCards(it, { md, ns, mv, stv, cs, songRows })}
    <div class="links"><button type="button" class="delsm" id="delItem">削除</button></div></div>
    <div class="dpane dp-ep"><h4><span class="h4l">話数</span> <small>${eps.length && !epEdit ? `${w} / ${eps.length}話 視聴済${nx ? `<span class="nxt">次は ${esc(nx.n)}</span>` : ""}` : ""}</small></h4>
    <div id="epArea">${epEdit ? (subPaste ? subPasteHtml(it) : epEditorHtml(it)) : epListHtml(it, eps)}</div></div>`;
}
/* 詳細のアラート（PCだけ）：ふだんは1行に畳み、開くと項目ボタン。ボタンを押すとその項目だけの編集画面へ */
let dmissKeep = false;
function missDetail(it) {
  const l = missingOf(it);
  if (!l.length) return "";
  const hot = l.some(x => x.k === "話数");
  /* 項目ボタン（話数は話数タブへ、ステータスは上のボタンで選ぶ）＋「なし」ボタン */
  const main = x =>
    x.k === "話数"
      ? `<button type="button" data-dtab="ep">話数を登録</button>`
      : x.j
        ? `<button type="button" data-jump="${x.j}">✎ ${esc(x.k)}</button>`
        : `<button type="button" class="st" tabindex="-1">${esc(x.k)}（上で選択）</button>`;
  const btn = x =>
    `<span class="mi">${main(x)}${x.ns ? `<button type="button" class="nb" data-nosong="all" title="OP・ED・主題歌を「なし」にする">なし</button>` : x.n ? `<button type="button" class="nb" data-nof="${x.n}" title="${esc(x.k)}を「なし」にする">なし</button>` : ""}</span>`;
  return `<details class="dmiss${hot ? " hot" : ""}"${dmissKeep ? " open" : ""}><summary><span>⚠ 未入力 ${l.length}項目</span><span class="mn">${esc(l.map(x => x.k).join("・"))}</span><span class="ar" aria-hidden="true">▼</span></summary><div class="mbtns">${l.map(btn).join("")}</div></details>`;
}
function refreshSheet() {
  if (form && form.inline) return;
  const it = items.find(x => x.id === openId);
  const el = $("#sheetIn");
  if (it && el) el.innerHTML = renderDetail(it);
}
function refreshEditor() {
  const it = items.find(x => x.id === openId);
  const a = $("#epArea");
  if (it && a && epEdit && !subPaste) a.innerHTML = epEditorHtml(it);
}
function openDetail(id, dir) {
  const it = items.find(x => x.id === id);
  if (!it) return;
  /* 前・次の作品へ移るときはシートを作り直さず中身だけ入れかえ、今のタブもそのまま */
  const sh = dir && $("#layer .sheet");
  if (!dir) navIds = screenIds();
  openId = id;
  stMenu = false;
  epEdit = null;
  subPaste = null;
  epOne = null;
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
      const n = sh.querySelector(".dp-ep .ep.next");
      if (n) {
        const hd = sh.querySelector(".dhead");
        const sr = sh.getBoundingClientRect(),
          nr = n.getBoundingClientRect();
        if (nr.bottom > sr.bottom - 20) sh.scrollTop += nr.top - sr.top - (hd ? hd.offsetHeight : 0) - 110;
      }
    });
}
function fail(e) {
  toast("保存できませんでした。もう一度お試しください");
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
    await saveDoc("titles", id, o);
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
  const all = list.every(e => e.w),
    any = list.some(e => e.w);
  if (all) return it.s !== "視聴済み" ? "視聴済み" : null;
  if (any && it.s !== "視聴中") return "視聴中";
  if (!any && it.s === "視聴済み") return "視聴中";
  return null;
}
async function saveEps(it, list, msg) {
  const ns = autoStatus(it, list);
  if (ns) {
    const o = { ...(over[it.id] || {}), s: ns };
    over[it.id] = o;
    rebuild();
    msg = (msg ? msg + "・" : "") + `「${ns}」にしました`;
    saveDoc("titles", it.id, o).catch(fail);
  }
  const p = {
    /* wt＝チェックを付けた日時（視聴記録用）。チェックを外した話は持たない */
    eps: list.map(e => ({ n: e.n, s: e.sub || "", t: e.t || 0, w: e.w ? 1 : 0, ...(e.nt ? { nt: 1 } : {}), ...(e.w && e.wt ? { wt: e.wt } : {}) })),
  };
  prog[it.id] = p;
  render();
  if (openId === it.id && !epEdit) refreshSheet();
  if (msg) toast(msg);
  try {
    await saveDoc("progress", it.id, p);
  } catch (e) {
    fail(e);
  }
}
function toggleEp(it, idx, val) {
  const l = episodes(it);
  if (!l[idx]) return;
  l[idx].w = val;
  l[idx].wt = val ? Date.now() : 0;
  saveEps(it, l, `${l[idx].n}を${val ? "視聴済み" : "未視聴"}にしました`);
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
    <div class="spop-f"><button type="button" class="u-btn ghost" data-spopx>あとで</button><button type="button" class="u-btn pri primary" data-spopok>保存</button></div></div>`;
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
  return { n: `${n != null ? n + 1 : list.length + 1}話`, sub: "", t, w: false, nt: last ? !!last.nt : !hasTime(it) };
}
/* 貼り付けた各話リストを読み取り、登録済みの話と比べた一覧を出す */
function readPaste(it) {
  const text = $("#spText").value;
  const parsed = parseSubtitles(text);
  if (!parsed.length) {
    subPaste = { text };
    refreshSheet();
    toast("話数とサブタイトルを読み取れませんでした。「第1話」「1話」などで始まる行が必要です");
    return;
  }
  const eps = epEdit ? epEdit.list : episodes(it);
  const fy = yearOf(it) || new Date().getFullYear();
  subPaste = {
    text,
    addMissing: !eps.length,
    useDate: false,
    rows: parsed.map(r => {
      const idx = eps.findIndex(x => epNum(x.n) === r.n);
      const cur = idx >= 0 ? eps[idx] : null;
      let date = r.date;
      if (!date && r.md) {
        const y = cur && cur.t ? jst(cur.t).y : fy;
        date = `${y}-${String(r.md[0]).padStart(2, "0")}-${String(r.md[1]).padStart(2, "0")}`;
      }
      const oldDay = cur && cur.t ? jst(cur.t).day : "";
      return {
        ...r,
        date,
        idx,
        old: cur ? cur.sub || "" : "",
        oldDay,
        dateCh: !!(date && cur && date !== oldDay),
      };
    }),
  };
  refreshSheet();
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
  p.rows.forEach(r => {
    if (r.idx < 0) return;
    const x = l[r.idx];
    if (x.sub !== r.sub) {
      x.sub = r.sub;
      n++;
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
        x.sub = r.sub;
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
  const msg = [n ? `サブタイトル${n}話` : "", dn ? `日付${dn}話` : ""].filter(Boolean).join("・");
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
  /* 曲のDL済み */
  [
    "[data-sgdl]",
    (el, it) => {
      const k = +el.dataset.sgdl;
      const l = songsOf(it).map(x => ({ ...x }));
      if (!l[k]) return;
      l[k].dl = l[k].dl ? 0 : 1;
      saveTitle(it.id, { songs: l }, l[k].dl ? "ダウンロード済みにしました" : "未ダウンロードに戻しました");
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
    "#allAired",
    (el, it) => {
      const l = episodes(it);
      l.forEach(x => {
        if (aired(x)) x.w = true;
      });
      saveEps(it, l, "放送済みの話を全部チェックしました");
    },
  ],
  [
    "#clearAll",
    (el, it) => {
      const l = episodes(it);
      l.forEach(x => (x.w = false));
      saveEps(it, l, "チェックを全部外しました");
    },
  ],
  /* 編（〇〇編）の登録 */
  [
    "#arcOpenEd",
    (el, it) => {
      arcEdit = arcsOf(it).map(r => ({ ...r }));
      if (!arcEdit.length) arcEdit.push({ name: "", a: 1, b: null });
      refreshSheet();
    },
  ],
  [null, (el, it, e) => !!arcEdit && runActions(ARC_ACTIONS, e, it)],
  /* 編の見出し：開く／たたむ */
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
      epEdit = { list: episodes(it).map(x => ({ ...x })) };
      refreshSheet();
    },
  ],
  [null, (el, it, e) => !!epEdit && runActions(EPEDIT_ACTIONS, e, it)],
  /* 削除：もう一度押すと削除（元に戻せる） */
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
        prev = { ...(over[id] || {}) };
      delete over[id];
      rebuild();
      close();
      render();
      removeDoc("titles", id).catch(fail);
      toastUndo(`「${it.t.slice(0, 18)}」を削除しました`, () => {
        over[id] = prev;
        rebuild();
        render();
        saveDoc("titles", id, prev).catch(fail);
      });
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
  [
    "[data-erdel]",
    el => {
      epEdit.list.splice(+el.dataset.erdel, 1);
      refreshEditor();
    },
  ],
];
/* 1話だけ編集の保存：その話だけを書き換える（ほかの話の日付はずらさない） */
function saveEpOne(it) {
  const r = $(".e1");
  const l = episodes(it);
  const x = r && l[epOne];
  if (!x) {
    epOne = null;
    return refreshSheet();
  }
  const day = normDate(r.querySelector(".e1-d").value);
  if (day === null) return toast("日付は 2018/08/25 のように入力してください");
  x.n = r.querySelector(".e1-n").value.trim() || x.n;
  const s = r.querySelector(".e1-s");
  if (s) x.sub = s.value.trim();
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
