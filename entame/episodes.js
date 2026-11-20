/* ===================== 作品の詳細：話数タブ（視聴チェック・1話だけ編集・話数の編集・〇〇編） ===================== */
let epOne = null; // 1話だけ編集中の話の番号
let epMenu = false; // 話数タブの「…」を開いているか
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
/* 話数の編集：⠿で1話ずつ並び替え（しくみは shared/u-core.js の GRIP） */
SORT_DONE.ep = (box, rows) => {
  if (!epEdit) return;
  const l = epEdit.list;
  epEdit.list = rows.map(r => l[+r.dataset.er]).filter(Boolean);
  refreshEditor();
};
