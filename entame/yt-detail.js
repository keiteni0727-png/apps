/* ===================== YouTube：詳細・追加と編集・操作（一覧と絞り込みは yt.js） ===================== */
/* ---------- 詳細：作品の詳細と同じ形
   上：投稿者・ジャンル・視聴ステータスのラベル／前・次・編集・閉じる、タイトルとコピー
   YOUTUBEカード：「項目名　内容」を1行ずつ（再生リスト・まとめ動画も行の中）。中身を押しても編集しない。
   編集はカードの見出しの右の「編集」から、そのカードの場所でまとめて編集（作品の ON AIR と同じ） ---------- */
let ytOpen = null;
let ytStMenu = false; // 視聴ステータスの選択肢を開いているか
const YT_ST = [
  ["", UNSEEN],
  ["視聴中", "視聴中"],
  ["視聴済み", "視聴済み"],
  ["見ない", "見ない"],
];
function ytDetailHtml(x) {
  const pw = +x.pw || 0,
    n = +x.n || 0;
  const un = t => `<span class="unset">${t}</span>`;
  const nn = t => `<span class="nosong">${t}</span>`;
  const nf = k => (x.noF || []).includes(k);
  const row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  const st = x.s || "";
  const stCls = "s-" + (st || UNSEEN);
  const stBtn = `<span class="stw"><button type="button" class="pill dst ${stCls}" id="ytStOpen" aria-haspopup="true" aria-expanded="${ytStMenu}">${esc(stLabel(st || UNSEEN))}<span class="stv" aria-hidden="true">▾</span></button>${ytStMenu ? `<span class="stmenu" role="menu">${YT_ST.map(([v, l]) => `<button type="button" role="menuitemradio" data-yts="${v}" aria-checked="${st === v}" class="s-${l}">${stLabel(l)}</button>`).join("")}</span>` : ""}</span>`;
  const IC_EXT = `<svg class="iic" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M13.5 2.5 7.5 8.5M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const IC_PLAY = `<svg class="iic ply" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M6.5 5.2v5.6L11 8z" fill="#fff"/></svg>`;
  const rows = [
    row("初回投稿日", x.up ? `<span class="inum">${esc(fmtD(x.up))}</span>` : un("未設定")),
    row("再生時間", x.dur ? `<span class="inum">${esc(x.dur)}</span>` : nf("dur") ? nn("なし") : un("未設定")),
    row("パート数", n ? `<span class="inum">全${n}本</span>` : un("未設定")),
    row("再生リスト", x.pl ? `<a class="ilnk" href="${esc(x.pl)}" target="_blank" rel="noopener" aria-label="${esc(x.t)}をYouTubeで見る">${IC_PLAY}YouTubeで見る</a>` : nf("pl") ? nn("なし") : un("未設定")),
    row("まとめ動画", x.sm ? `<a class="ilnk" href="${esc(x.sm)}" target="_blank" rel="noopener">まとめ動画を開く${IC_EXT}</a>` : nf("sm") ? nn("なし") : un("未設定")),
  ];
  const info = `<div class="icard ibc"><div class="ich"><span class="ilamp ytl">YOUTUBE</span><button type="button" class="u-btn sm iedit" data-jump="ycard" aria-label="基本情報を編集">編集</button></div><dl class="idl">${rows.join("")}</dl></div>`;
  const prog = `<div class="icard iprog"><div class="ich"><span class="ilamp progl">PROGRESS</span><span class="inow">${n ? `${pw} / ${n}本 見た` : "パート数を入れると進み具合を記録できます"}</span></div>${
    n
      ? `<div class="prog"><i style="width:${Math.min(100, (pw / n) * 100)}%"></i></div>
      <div class="ystep"><button type="button" data-ytp="-1" class="u-btn icon" aria-label="1本戻す" ${pw <= 0 ? "disabled" : ""}>−</button><span><b>${pw}</b>本目まで見た</span><button type="button" data-ytp="1" class="u-btn icon" aria-label="1本進める" ${pw >= n ? "disabled" : ""}>＋</button><button type="button" class="u-btn sm" data-ytp="all" ${pw >= n ? "disabled" : ""}>最後まで見た</button>${pw ? `<button type="button" class="u-btn sm" data-ytp="reset">リセット</button>` : ""}</div>`
      : ""
  }</div>`;
  const nv = ytNeighbors(x.id),
    busy = !!(yform && yform.inline);
  const navB = (d, lab) => `<button type="button" class="u-btn icon sm dnav" data-dnav="${d}" aria-label="${lab}" title="${lab}${TOUCH ? "" : `（${d < 0 ? "←" : "→"}キー）`}" ${nv[d < 0 ? 0 : 1] && !busy ? "" : "disabled"}>${CHEV(d)}</button>`;
  /* 上段のラベル：投稿者（作品のジャンルの位置）→ ジャンル（作品の種別の位置。押すとジャンルを編集）→ 視聴ステータス */
  const c = ytCat(x),
    sb = ytGrp(x);
  const gBtn = c ? `<button type="button" class="dmt lab s" data-jump="yfGenre" title="ジャンルを変える">${c}${sb ? `・${esc(sb)}` : ""}</button>` : "";
  return `<div class="dhead ydhead"><div class="hdrow"><div class="meta"><span class="kind yauth">${esc(x.a || "YouTube")}</span>${gBtn}${stBtn}</div><div class="hdrow">${navB(-1, "前の作品")}${navB(1, "次の作品")}<button type="button" class="u-btn sm" id="ytEdit" aria-label="再生リストを編集">編集</button><button class="u-btn icon sm soft close" type="button" data-close aria-label="閉じる">✕</button></div></div>
    <h3>${esc(x.t)}<button type="button" class="tcopy" id="ytCopy" aria-label="タイトルをコピー" title="タイトルをコピー"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button></h3>${ytMissDetail(x)}</div>
    <div class="ydbody">${info}${prog}
    <div class="links"><button type="button" class="u-btn sm txt danger delsm" id="ytDel">削除</button></div></div>`;
}
/* 前・次の作品：詳細を開いた画面に出ていた並び（作品の詳細と同じ） */
let ytNavIds = [];
function ytScreenIds() {
  const seen = new Set();
  return [...document.querySelectorAll("#main [data-yt]")].map(el => el.dataset.yt).filter(id => !seen.has(id) && seen.add(id) && ytItems.some(x => x.id === id));
}
function ytNeighbors(id) {
  const i = ytNavIds.indexOf(id);
  return i < 0 ? [null, null] : [ytNavIds[i - 1] || null, ytNavIds[i + 1] || null];
}
function ytDetailNav(d) {
  if (!ytOpen || (yform && yform.inline)) return;
  const id = ytNeighbors(ytOpen)[d < 0 ? 0 : 1];
  if (id) ytOpenDetail(id, d);
}
function ytOpenDetail(id, dir) {
  const x = ytItems.find(y => y.id === id);
  if (!x) return;
  if (!dir) ytNavIds = ytScreenIds();
  ytOpen = id;
  ytStMenu = false;
  openId = null;
  form = null;
  yform = null;
  /* 前・次へ移るときはシートを作り直さず中身だけ入れかえ */
  const inn = dir && $("#layer .sheet #ytIn");
  if (inn) {
    const sh = inn.closest(".sheet");
    sh.setAttribute("aria-label", x.t);
    inn.innerHTML = ytDetailHtml(x);
    sh.scrollTop = 0;
    return;
  }
  $("#layer").innerHTML =
    `<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(x.t)}"><div class="wrap" id="ytIn">${ytDetailHtml(x)}</div></div>`;
}
function ytRefresh() {
  const x = ytItems.find(y => y.id === ytOpen);
  const el = $("#ytIn");
  if (!x || !el) return;
  /* 描き直すと詳細の中の編集画面も消えるので、編集中の状態も終わりにする */
  if (yform && yform.inline) yform = null;
  el.innerHTML = ytDetailHtml(x);
}
async function ytSave(id, patch, msg) {
  const o = { ...(ytOver[id] || {}), ...patch, _at: Date.now() };
  ytOver[id] = o;
  ytRebuild();
  render();
  ytRefresh();
  if (msg) toast(msg);
  try {
    await saveDoc("yt", id, o);
  } catch (e) {
    fail(e);
  }
}

/* ---------- 追加・編集 ----------
   項目ごとの部品（P）を組み合わせて、全体の編集画面と「その項目だけ」の編集画面を作る（作品の編集画面と同じ作り） */
let yform = null;
/* その項目だけ編集するときの見出しと部品。詳細の中で開く（ycard＝YOUTUBEカードの「編集」、ほかは未入力アラートの項目ボタン） */
const ONLY_Y = {
  ycard: ["基本情報", ["author", "genre", "up", "n", "dur", "pl", "sm"]],
  yfAuthor: ["投稿者", ["author"]],
  yfGenre: ["ジャンル", ["genre"]],
  "y-up": ["初回投稿日", ["up"]],
  "y-n": ["パート数", ["n"]],
  "y-dur": ["再生時間", ["dur"]],
  "y-pl": ["再生リスト", ["pl"]],
  "y-sm": ["まとめ動画", ["sm"]],
};
function ytFormHtml() {
  const f = yform;
  const authors = [...new Set([...ytAuthors(), f.a].filter(Boolean))];
  const subChips = (lab, list, attr, cur) =>
    `<div class="chips" style="margin-top:8px" role="group" aria-label="${lab}">${list.map(g => `<button type="button" ${attr}="${esc(g)}" aria-pressed="${cur === g}">${esc(g)}</button>`).join("")}</div>`;
  const P = {
    title: `<label class="field full"><span>動画タイトル</span><input id="y-t" autocomplete="off" placeholder="動画タイトル" value="${esc(f.t)}"></label>`,
    author: `<div class="field full" id="yfAuthor"><span>投稿者</span><div class="chips">${authors.map(a => `<button type="button" data-yfa="${esc(a)}" aria-pressed="${f.a === a}">${esc(a)}</button>`).join("")}<input id="y-anew" class="chipin" autocomplete="off" placeholder="＋ ほかの投稿者" value="${esc(authors.includes(f.a) ? "" : f.a)}"></div></div>`,
    genre: `<div class="field full" id="yfGenre"><span>ジャンル</span><div class="u-seg segc" role="group" aria-label="ジャンル">${[SOLO, COLLAB].map(g => `<button type="button" data-yfg="${g}" aria-pressed="${ytCat(f) === g}">${g}</button>`).join("")}</div>${
      ytCat(f) === COLLAB ? subChips("コラボのグループ", ytSubs(), "data-yfsub", ytSub(f)) : ytCat(f) === SOLO ? subChips("一人実況のグループ", M("soloGroups"), "data-yfsg", ytSolo(f)) : ""
    }</div>`,
    /* 視聴ステータス：作品と同じく「未視聴」も入れた4つから選ぶ */
    status: `<div class="field full"><span>ステータス</span><div class="u-seg segc" role="group" aria-label="ステータス">${YT_ST.map(([v, l]) => `<button type="button" data-yfs="${v}" aria-pressed="${(f.s || "") === v}">${stLabel(l)}</button>`).join("")}</div></div>`,
    up: `<label class="field"><span>初回投稿日</span><input id="y-up" class="dto" type="text" inputmode="numeric" autocomplete="off" placeholder="2024/03/08" value="${esc(fmtD(f.up))}"><span class="hint err" id="yUpMsg"></span></label>`,
    n: `<label class="field"><span>パート数</span><input id="y-n" type="number" min="0" inputmode="numeric" placeholder="12" value="${f.n || ""}"></label>`,
    dur: `<label class="field"><span>再生時間 <span class="hint">「630」で6時間30分</span></span><input id="y-dur" inputmode="numeric" autocomplete="off" placeholder="630" value="${esc(f.dur)}"><span class="hint" id="yDurMsg"></span></label>`,
    pl: `<label class="field full"><span>再生リスト</span><input id="y-pl" type="url" inputmode="url" autocomplete="off" placeholder="https://www.youtube.com/playlist?list=…" value="${esc(f.pl)}"></label>`,
    /* まとめ動画は「なし」にできる（作品の公式サイト・配信URLと同じチェック。入れて保存するとURLは消える） */
    sm: `<div class="field full"><label class="field" for="y-sm"><span>まとめ動画</span></label><input id="y-sm" type="url" inputmode="url" autocomplete="off" placeholder="https://youtu.be/…" value="${esc(f.sm)}"><label class="yr nofl" title="まとめ動画なし"><input type="checkbox" class="ynof" value="sm" ${(f.noF || []).includes("sm") ? "checked" : ""} aria-label="まとめ動画なし"><span>なし</span></label></div>`,
  };
  if (f.only && ONLY_Y[f.only]) {
    const [lab, keys] = ONLY_Y[f.only];
    return `<div class="hdrow"><h3 class="onlyh"><small>${esc(f.t)}</small>${lab}を編集</h3><button class="u-btn icon sm soft close" type="button" data-back="1" aria-label="戻る">✕</button></div>
      <form id="ytF" novalidate><div class="fgrid only">${keys.map(k => P[k]).join("")}</div>
      <div class="ffoot"><button type="button" class="u-btn" data-back="1">キャンセル</button><button class="u-btn pri primary" type="submit">保存する</button></div></form>`;
  }
  const sec = (t, b) => `<section class="fsec"><h4>${t}</h4><div class="fgrid">${b}</div></section>`;
  return `<div class="hdrow"><h3>再生リストを${f.id ? "編集" : "追加"}</h3><button class="u-btn icon sm soft close" type="button" data-close aria-label="閉じる">✕</button></div>
    <form id="ytF" novalidate>
    ${sec("基本情報", P.title + P.author + P.genre + P.status)}
    ${sec("動画の情報", P.up + P.n + P.dur)}
    ${sec("リンク", P.pl + P.sm)}
    <div class="ffoot"><button type="button" class="u-btn" data-close>キャンセル</button><button class="u-btn pri primary" type="submit">${f.id ? "保存する" : "追加する"}</button></div>
    </form>`;
}
function ytReadForm() {
  if (!$("#ytF")) return;
  const g = id => $(id)?.value ?? "";
  const o = id => ($(id) ? $(id).value : undefined);
  ["t", "up", "dur", "pl"].forEach(k => {
    let v = o("#y-" + k);
    if (v === undefined) return;
    if (k === "up") {
      const p = parseDay(v);
      v = p === null ? yform.up : p;
    }
    if (k === "dur") v = parseDur(v);
    yform[k] = v;
  });
  if (o("#y-n") !== undefined) yform.n = o("#y-n");
  if (o("#y-sm") !== undefined) yform.sm = o("#y-sm");
  const na = g("#y-anew").trim();
  if (na) yform.a = na;
  document.querySelectorAll("#ytF .ynof").forEach(c => {
    const l = (yform.noF || []).filter(k => k !== c.value);
    yform.noF = c.checked ? [...l, c.value] : l;
  });
}
/* 開いたときから変わったかを比べるための中身（見た目の状態は除く） */
const ytFormSig = f => {
  const { init, inline, only, ...c } = f;
  return JSON.stringify({ ...c, n: String(c.n || "") });
};
function ytRedrawForm() {
  const box = $("#ytFormIn");
  if (!box) return;
  const sh = box.closest(".sheet");
  const y = sh ? sh.scrollTop : 0;
  box.innerHTML = ytFormHtml();
  if (sh) sh.scrollTop = y;
}
function ytOpenForm(x, target) {
  yform = x
    ? {
        id: x.id,
        t: x.t,
        a: x.a || "",
        g: x.g || "",
        ...(x.sg !== undefined ? { sg: x.sg } : {}),
        s: x.s || "",
        up: x.up || "",
        n: x.n || "",
        dur: x.dur || "",
        pl: x.pl || "",
        sm: x.sm || "",
        noF: [...(x.noF || [])],
      }
    : {
        id: null,
        t: "",
        a: yst.author !== "すべて" ? yst.author : "",
        g: "",
        s: "",
        up: "",
        n: "",
        dur: "",
        pl: "",
        sm: "",
        noF: [],
      };
  /* 詳細から項目を指定したときは、詳細の中でその項目だけ編集する（作品の詳細と同じ） */
  if (x && ONLY_Y[target] && ytOpen === x.id && $("#layer .sheet:not(.form) #ytIn")) return ytOpenInline(target);
  ytOpen = null;
  openId = null;
  form = null;
  $("#layer").innerHTML =
    `<div class="scrim" data-close></div><div class="sheet form" role="dialog" aria-modal="true" aria-label="YouTubeを${yform.id ? "編集" : "追加"}"><div class="wrap" id="ytFormIn">${ytFormHtml()}</div></div>`;
  if (target && document.getElementById(target)) {
    const el = document.getElementById(target);
    el.scrollIntoView({ block: "center" });
    if (!TOUCH) el.focus({ preventScroll: true });
  } else if (!TOUCH) $("#y-t").focus({ preventScroll: true });
}
/* 詳細の中で編集：カードの「編集」はそのカードの場所がそのまま編集画面に、未入力アラートの項目は見出しのすぐ下に出す */
function ytOpenInline(target) {
  const inn = $("#ytIn");
  yform.only = target;
  yform.inline = true;
  inn.querySelectorAll(".ined").forEach(x => x.remove());
  inn.querySelectorAll(".icard[hidden]").forEach(x => (x.hidden = false));
  const card = target === "ycard" && inn.querySelector(".icard.ibc");
  const anc = card || inn.querySelector(".ydhead");
  if (!anc) {
    yform = null;
    return;
  }
  anc.insertAdjacentHTML(card ? "beforebegin" : "afterend", `<div class="ined${card ? " incard" : ""}" id="ytFormIn">${ytFormHtml()}</div>`);
  if (card) card.hidden = true;
  yform.init = ytFormSig(yform);
  /* 編集中は前・次の矢印を押せないように */
  inn.querySelectorAll(".dnav").forEach(b => (b.disabled = true));
  const box = $("#ytFormIn");
  const sh = box.closest(".sheet");
  if (!card && sh) sh.scrollTop = 0;
  else if (sh) {
    const hd = sh.querySelector(".dhead");
    const top = sh.getBoundingClientRect().top + (hd ? hd.getBoundingClientRect().height : 0) + 8;
    sh.scrollTop += box.getBoundingClientRect().top - top;
  }
  const i = box.querySelector(".fgrid.only input:not([type=checkbox])");
  if (i && !TOUCH) i.focus({ preventScroll: true });
}
/* 詳細の中の編集をやめる（取り消し） */
function ytCloseInline() {
  yform = null;
  ytRefresh();
}
async function ytSubmit() {
  {
    const ui = $("#y-up");
    if (ui && ui.value.trim() && parseDay(ui.value) === null) {
      ui.focus();
      toast("初回投稿日を読み取れませんでした（例：2024/03/08）");
      return;
    }
  }
  ytReadForm();
  const f = yform;
  const t = f.t.trim();
  if (!t) {
    $("#y-t")?.focus();
    toast("動画タイトルを入れてください");
    return;
  }
  const patch = {
    t,
    a: f.a.trim(),
    g: f.g,
    ...(f.sg !== undefined ? { sg: f.sg } : {}),
    s: f.s,
    up: f.up,
    n: Math.max(0, +f.n || 0),
    dur: f.dur.trim(),
    pl: f.pl.trim(),
    sm: String(f.sm || "").trim(),
    noF: [...new Set(f.noF || [])],
  };
  if (patch.noF.includes("sm")) patch.sm = "";
  const id = f.id || "y" + Date.now().toString(36);
  /* 詳細の中の編集：変わっていなければ閉じるだけ、変わっていれば保存して詳細を描き直す */
  if (f.inline) {
    if (ytFormSig(f) === f.init) return ytCloseInline();
    yform = null;
    await ytSave(id, patch, "保存しました");
    return;
  }
  if (!f.id) patch.added = Date.now();
  yform = null;
  close();
  await ytSave(id, patch, f.id ? "保存しました" : "追加しました");
  if (f.id) ytOpenDetail(id);
}

/* シートで選んだら、その項目を閉じて戻る（開いた直後の指の離れは無視） */
function ytPicked(set) {
  if (Date.now() - fSubOpenedAt < 300) return;
  set();
  if (!IS_PC()) yst.fSub = "";
  saveYtUI();
  render();
  if (!TOUCH) document.querySelector(".fsh-row[aria-expanded]")?.focus();
}
/* YouTube の操作（YouTubeの画面を開いているときだけ） */
const ytUI = fn => el => {
  fn(el);
  saveYtUI();
  render();
};
/* 詳細の中で編集しているとき：✕・キャンセルで取り消し、外を押したら保存して閉じる（別の項目を押したらそのまま次を編集）。作品の詳細と同じ */
function ytCommitInline() {
  if (!yform || !yform.inline) return;
  ytReadForm();
  if (ytFormSig(yform) === yform.init) ytCloseInline();
  else ytSubmit();
}
function ytInlineClick(e) {
  if (!yform || !yform.inline) return false;
  if (e.target.closest(".ined [data-back]")) {
    ytCloseInline();
    return true;
  }
  /* 描き直しで消えた場所へのクリックは「外を押した」ではない */
  if (!e.target.isConnected) return true;
  if (e.target.closest(".ined")) return false;
  const jp = e.target.closest("#ytIn [data-jump]");
  const tgt = jp && jp.dataset.jump;
  ytCommitInline();
  if (yform && yform.inline) return true; // 入力の誤りで保存できなかったときは編集を続ける
  if (!tgt || e.target.closest("a,button:not([data-jump])")) return false; // ほかのボタン（閉じる・ステータスなど）はそのまま動かす
  const it = ytItems.find(y => y.id === ytOpen);
  if (it) ytOpenForm(it, tgt);
  return true;
}
const YT_ACTIONS = [
  [null, (el, x, e) => ytInlineClick(e)],
  /* 絞り込み・並び順 */
  ["[data-ytpop]", ytUI(el => (yst.fp = yst.fp === el.dataset.ytpop ? "" : el.dataset.ytpop))],
  [
    "[data-ytgrp]",
    ytUI(el => {
      yst.grp = el.dataset.ytgrp;
      yst.fp = "";
    }),
  ],
  [
    "[data-ytsort]",
    ytUI(el => {
      yst.sort = el.dataset.ytsort;
      yst.fp = "";
    }),
  ],
  ["[data-ytreset]", ytUI(() => Object.assign(yst, { author: "すべて", pri: [], genre: "すべて", sub: "すべて", missOnly: false, missKey: "", fSub: "" }))],
  /* 絞り込みシート（アニメ・ドラマと同じ動き） */
  [
    "[data-ytsheet]",
    ytUI(() => {
      yst.fp = yst.fp === "all" ? "" : "all";
      yst.fSub = "";
    }),
  ],
  ["[data-ytshclose]", ytUI(() => ((yst.fp = ""), (yst.fSub = "")))],
  [
    "[data-ytfsub]",
    el => {
      const was = yst.fSub;
      yst.fSub = !el.dataset.ytfsub ? "" : IS_PC() || yst.fSub !== el.dataset.ytfsub ? el.dataset.ytfsub : "";
      fSubOpenedAt = Date.now();
      render();
      fshFocusAfter(was);
      document.querySelector(".fsh-sub .dd-row.on")?.scrollIntoView({ block: "nearest" });
    },
  ],
  [
    "[data-ytqtog]",
    el => {
      const on = el.dataset.ytqtog === "1";
      yst.qOpen = on;
      yst.fp = "";
      yst.fSub = "";
      if (!on) yst.q = "";
      render();
      if (on) fshFocusQ("#ytq");
    },
  ],
  [
    "[data-ytg]",
    el => ytPicked(() => {
      yst.genre = el.dataset.ytg;
      yst.sub = "すべて";
    }),
  ],
  ["[data-ytsub]", el => ytPicked(() => (yst.sub = el.dataset.ytsub))],
  ["[data-ytau]", el => ytPicked(() => (yst.author = el.dataset.ytau))],
  ["[data-ytstf]", el => ytPicked(() => (yst.pri = !el.dataset.ytstf || (yst.pri.length === 1 && yst.pri[0] === el.dataset.ytstf) ? [] : [el.dataset.ytstf]))],
  ["[data-ytfmiss]", el => ytPicked(() => missSet(yst, el.dataset.ytfmiss))],
  ["[data-yt]", el => ytOpenDetail(el.dataset.yt)],
  [null, (el, x, e) => !!yform && runActions(YT_FORM_ACTIONS, e)],
  [
    null,
    (el, x, e) => {
      const it = ytOpen && ytItems.find(y => y.id === ytOpen);
      return !!it && runActions(YT_DETAIL_ACTIONS, e, it);
    },
  ],
];
/* 追加・編集画面：入力中の内容を読み取ってから変えて、描き直す */
const ytFormEdit = fn => el => {
  ytReadForm();
  fn(el);
  ytRedrawForm();
};
const YT_FORM_ACTIONS = [
  [
    "[data-yfa]",
    ytFormEdit(el => {
      yform.a = el.dataset.yfa;
      const i = $("#y-anew");
      if (i) i.value = "";
    }),
  ],
  [
    "[data-yfg]",
    ytFormEdit(el => {
      const v = el.dataset.yfg;
      yform.g = ytCat(yform) === v ? "" : v === SOLO ? SOLO : ytSub(yform) || COLLAB;
    }),
  ],
  ["[data-yfsg]", ytFormEdit(el => (yform.sg = ytSolo(yform) === el.dataset.yfsg ? "" : el.dataset.yfsg))],
  ["[data-yfsub]", ytFormEdit(el => (yform.g = ytSub(yform) === el.dataset.yfsub ? COLLAB : el.dataset.yfsub))],
  ["[data-yfs]", ytFormEdit(el => (yform.s = yform.s === el.dataset.yfs ? "" : el.dataset.yfs))],
];
/* 詳細画面（x＝開いている再生リスト） */
const YT_DETAIL_ACTIONS = [
  ["#ytEdit", (el, x) => ytOpenForm(x)],
  ["[data-dnav]", el => ytDetailNav(+el.dataset.dnav)],
  /* 未入力アラートの「なし」 */
  [
    "[data-ynof]",
    (el, x) => {
      const k = el.dataset.ynof;
      ytSave(x.id, { noF: [...new Set([...(x.noF || []), k])] }, `${YT_NOF_LAB[k]}を「なし」にしました`);
    },
  ],
  /* 視聴ステータスのラベル：押すと選択肢を開く／閉じる。ほかの場所を押したら閉じる */
  [
    "#ytStOpen",
    () => {
      ytStMenu = !ytStMenu;
      ytRefresh();
    },
  ],
  [
    null,
    el => {
      if (ytStMenu && !el.closest(".stw")) {
        ytStMenu = false;
        ytRefresh();
      }
      return false;
    },
  ],
  [
    "#ytCopy",
    (el, x) => U.copy(x.t).then(ok => toast(ok ? "タイトルをコピーしました" : "コピーできませんでした")),
  ],
  ["[data-jump]", (el, x) => ytOpenForm(x, el.dataset.jump)],
  [
    "[data-yts]",
    (el, x) => {
      const v = el.dataset.yts;
      ytStMenu = false;
      if ((x.s || "") !== v) ytSave(x.id, { s: v }, v ? `「${v}」にしました` : "未視聴にしました");
      else ytRefresh();
    },
  ],
  /* 見たところ：−・＋・最後まで・リセット。最後まで見たら視聴済み、途中なら視聴中に */
  [
    "[data-ytp]",
    (el, x) => {
      const n = +x.n || 0;
      const v = el.dataset.ytp;
      const pw = v === "all" ? n : v === "reset" ? 0 : Math.max(0, Math.min(n, (+x.pw || 0) + +v));
      const patch = { pw };
      let msg = `${pw}本目まで見ました`;
      if (n && pw >= n && x.s !== "視聴済み") {
        patch.s = "視聴済み";
        msg = "最後まで見たので「視聴済み」にしました";
      } else if (pw > 0 && pw < n && !x.s) {
        patch.s = "視聴中";
        msg = `${pw}本目まで見ました（視聴中にしました）`;
      }
      ytSave(x.id, patch, msg);
    },
  ],
  /* 削除：もう一度押すと削除（元に戻せる） */
  [
    "#ytDel",
    (el, x) => {
      if (!el.dataset.c) {
        el.dataset.c = "1";
        el.textContent = "もう一度押すと削除";
        el.classList.add("armed");
        return;
      }
      const id = x.id,
        at = Date.now();
      ytOver[id] = { ...(ytOver[id] || {}), deleted: at };
      ytRebuild();
      close();
      render();
      mergeDoc("yt", id, { deleted: at }).catch(fail);
      toastUndo(`「${x.t.slice(0, 18)}」をゴミ箱に移しました`, () => trashRestore("yt", id, true));
    },
  ],
];
