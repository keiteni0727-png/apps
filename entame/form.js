/* ===================== 作品の追加・編集（詳細の中でその項目だけ編集するときも） ===================== */
let form = null;
/* シリーズのメインのジャンル（裏で持つ）：a=アニメ、d=ドラマ・実写（ドラマ・実写映画・配信番組）
   設定で決めたもの → 使っている作品で多い方 → アニメ */
const serGroup = k => (k === "a" ? "a" : "d");
const SER_GL = { a: "アニメ", d: "ドラマ・実写" };
function seriesMainMap() {
  const cnt = {};
  items.forEach(i => {
    if (!i.series) return;
    const c = (cnt[i.series] = cnt[i.series] || { a: 0, d: 0 });
    c[serGroup(i.k)]++;
  });
  const set = master.seriesMain || {};
  const map = {};
  M("series").forEach(n => {
    const c = cnt[n];
    map[n] = set[n] || (c && (c.a || c.d) ? (c.a >= c.d ? "a" : "d") : "a");
  });
  return { map, cnt };
}
/* 編集画面の曲：種類ごとの区切り（色の帯・見出し・＋追加・なし）に曲のカードを並べる */
const SONG_MAIN = ["OP", "ED", "主題歌"];
/* OP・ED・主題歌の「なし」：見出しのすぐ右に置く（曲が1曲もないときだけ） */
const sgNoneBox = () =>
  form.songs.length ? "" : `<label class="nofl sgno sghno"><input type="checkbox" class="nos" ${(form.noSongs || []).length ? "checked" : ""} aria-label="OP・ED・主題歌 なし"><span>なし</span></label>`;
/* 編集画面でたたんでいる曲（番号）。たためるのは同じ種類に2曲以上あるときだけ。ふだんは全部開いている */
/* 開いている曲（同じ種類に2曲以上のときは、最初はすべてたたむ） */
let sgOpen = new Set();
let sgAddK = -1;
function songRowsHtml() {
  const f = form;
  /* OP・ED・主題歌はジャンル・種別に関係なくいつも出す（挿入歌は追加したときだけ） */
  const types = SONG_TYPES.filter(t => SONG_MAIN.includes(t) || t === "挿入歌" || f.songs.some(x => x.type === t));
  const main = SONG_MAIN;
  /* multi＝同じ種類に2曲以上（たたむ行と並び替えの⠿を出す） */
  const card = (x, k, multi) => {
    /* 1話だけ：「最後」の欄を隠して、最初の話だけ入れる */
    const one = !!x.one;
    const { st, ar } = songTA(x);
    const open = sgOpen.has(k);
    /* 最初・最後が空の欄は、話数リストの最初・最後の話を入れて見せる（保存するときは、話数リストの最初・最後と同じなら空に戻す） */
    const sp = !one && f.span;
    const va = x.a ?? (sp ? sp[0] : ""),
      vb = x.b ?? (sp ? sp[1] : "");
    const rt = [rangeTxt(sp ? { a: va, b: vb } : x), ...exOf(x).map(exTxt)].filter(Boolean).join("・") || "全話";
    return `<div class="sg${open ? " open" : ""}${multi ? " multi" : ""}" data-sg="${k}"${multi ? " data-sortrow" : ""}>
    ${`<div class="sg-hd">${multi ? GRIP("sg") : ""}<button type="button" class="sg-sum" data-sgfold="${k}" aria-expanded="${open}"><span class="sg-sn"><span class="sg-st1">${st.trim() ? `『${esc(st)}』` : "曲名 未設定"}</span>${ar.trim() ? `<span class="sg-sa">${esc(ar)}</span>` : ""}</span><span class="sg-se">${esc(rt)}</span><span class="sg-sv">${FOLD_IC}</span></button></div>`}
    <div class="sg-body">
    <div class="sg-f2"><input class="sg-st" value="${esc(songTA(x).st)}" placeholder="曲名" aria-label="曲名" autocomplete="off"><input class="sg-ar" value="${esc(songTA(x).ar)}" placeholder="アーティスト" aria-label="アーティスト" autocomplete="off"></div>
    <div class="sg-r"><input class="sg-a" type="number" min="0" inputmode="numeric" value="${va}" placeholder="最初" aria-label="使われた最初の話"><span class="sg-bw${one ? " inv" : ""}" ${one ? 'aria-hidden="true"' : ""}><span>〜</span><input class="sg-b" type="number" min="0" inputmode="numeric" value="${vb}" placeholder="最後" aria-label="使われた最後の話"></span><span>話</span>${x.a == null && x.b == null && !one && !f.span ? `<span class="sg-all">全話</span>` : ""}
      <label class="sg-onew"><input type="checkbox" class="sg-one" data-sgone="${k}" ${one ? "checked" : ""}>1話だけ</label></div>
    ${(x.ex || [])
      .map(
        (r, j) =>
          `<div class="sg-r sg-x" data-sgx="${j}"><span class="sg-rl">ほか</span><input class="sg-xa" type="number" min="0" inputmode="numeric" value="${r.a ?? ""}" placeholder="最初" aria-label="ほかに使われた最初の話"><span>〜</span><input class="sg-xb" type="number" min="0" inputmode="numeric" value="${r.b ?? ""}" placeholder="最後" aria-label="ほかに使われた最後の話（1話だけなら空）"><span>話</span><span class="sg-sp"></span><button type="button" class="u-btn icon sm txt sg-xdel" data-sgxdel="${k}:${j}" aria-label="このほかの話を消す">×</button></div>`,
      )
      .join("")}
    <div class="sg-ft"><select class="sg-t" aria-label="種類を変える" title="種類を変える">${SONG_TYPES.map(t => `<option value="${t}" ${t === x.type ? "selected" : ""}>${t}</option>`).join("")}</select><button type="button" class="u-chip add sg-exadd" data-sgex="${k}">＋ 範囲を追加</button><button type="button" class="u-btn sm txt danger del" data-sgdel="${k}" aria-label="この曲を削除">削除</button></div></div></div>`;
  };
  const secs = types
    .map(t => {
      const l = f.songs.map((x, k) => [x, k]).filter(([x]) => x.type === t);
      if (!l.length && !main.includes(t)) return "";
      return `<div class="sgsec ${SG_CLS[t]}">
        <div class="sgh"><b class="sgn">${t}</b>${l.length ? `<small>${l.length}曲</small>` : ""}<span class="sg-sp"></span>
          ${l.length > 1 ? `<button type="button" class="u-btn sm txt sgfoldall" data-sgfoldall="${t}">${l.some(([, k]) => sgOpen.has(k)) ? "すべてたたむ" : "すべて開く"}</button>` : ""}
          ${l.length ? "" : `<button type="button" class="u-chip add sgadd" data-sgadd="${t}">＋ ${t}を追加</button>`}</div>
        ${l.length ? l.map(([x, k]) => card(x, k, l.length > 1)).join("") + `<button type="button" class="u-chip add sgnext" data-sgadd="${t}">＋ 次の${t}を追加</button>` : ""}</div>`;
    })
    .join("");
  return secs;
}
const dowOfDate = d => {
  if (!d) return -1;
  const [y, m, dd] = d.split("-").map(Number);
  if (!y) return -1;
  return (new Date(Date.UTC(y, m - 1, dd)).getUTCDay() + 6) % 7;
};
const courOfDate = d => {
  const y = +String(d || "").slice(0, 4);
  if (!y) return "";
  return `${y}${SEASONS[Math.floor(((+d.slice(5, 7) || 1) - 1) / 3)]}`;
};
function schedText() {
  const f = form;
  if (f.media === "movie") return f.from ? `${fmtD(f.from)} 公開` : "公開日を入れてください";
  if (f.media === "sp") return f.from ? `${fmtD(f.from)} 放送（TV SP）` : "放送日を入れてください";
  if (f.media === "ova") return f.from ? `${fmtD(f.from)}から発売` : "発売日を入れてください";
  if (!f.from) return "開始日を入れると、放送曜日が自動で決まります";
  /* 放送時間なし＝毎週の放送ではない（一挙配信・不定期など）：曜日を決めない */
  if ((f.noF || []).includes("time")) return `${fmtD(f.from)}から ${f.media === "stream" ? "配信" : "放送"}（曜日・時間なし）`;
  const d = dowOfDate(f.from);
  const t = (f.time || "").trim();
  return `毎週 <b>${DOW[d]}曜${t ? " " + esc(t) : ""}</b> ${f.media === "stream" ? "配信" : "放送"}　${fmtD(f.from)}〜`;
}
const ONLY_A = {
  fSeries: ["シリーズ", ["series"]],
  "f-time": ["放送時間", ["time"]],
  fMedia: ["放送局・配信", ["media", "vurl"]],
  "f-from": ["放送日", ["from"]],
  coursBox: ["放送クール", ["cours"]],
  sgList: ["OP・ED・主題歌", ["songs"]],
  relb: ["関連放送", ["relb"]],
  onair: ["基本情報", ["media", "vurl", "from", "time", "cours", "series", "url"]],
  "f-url": ["公式サイト", ["url"]],
  "f-vurl": ["配信サイトURL", ["vurl"]],
};
/* 日付の入力欄（yyyy/MM/dd・カレンダー付き）。開始日と同じ作り */
const dtField = (id, lab, v) =>
  `<label class="field"><span>${lab}</span><span class="dtw"><input id="${id}" class="dtx" type="text" inputmode="numeric" autocomplete="off" placeholder="2018/08/25" value="${esc(dtShow(v || ""))}"><button type="button" class="dtcal" data-dtcal="${id}" aria-label="カレンダーから選ぶ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></button><input type="date" class="dtpick" tabindex="-1" aria-hidden="true" data-dtfor="${id}"></span></label>`;
function formHtml() {
  const f = form;
  const y = new Date().getFullYear();
  const years = [];
  for (let k = y + 1; k >= 1960; k--) years.push(k);
  const dyn = f.cours.filter(c => c !== ALLYEAR);
  const songTypes = f.k === "a" ? ["OP", "ED", "主題歌", "挿入歌"] : ["主題歌", "挿入歌"];
  const sug = courOfDate(f.from);
  const sec = (title, body, note = "", side = "", cls = "") =>
    `<section class="fsec${cls ? " " + cls : ""}"><h4>${title}${side}${note ? `<span class="hint">${note}</span>` : ""}</h4><div class="fgrid">${body}</div></section>`;
  const P = {
    title: `<label class="field full"><span>タイトル</span><input id="f-t" autocomplete="off" placeholder="タイトル" value="${esc(f.t)}"></label>`,
    kind: `<div class="field"><span>ジャンル</span><div class="u-seg segc" role="group" aria-label="ジャンル">${seg(
      "data-fk",
      [
        ["a", "アニメ", "ka"],
        ["d", "ドラマ", "kd"],
        ["f", "映画", "kf"],
        ["r", "バラエティ", "kr"],
      ],
      f.k,
    )}</div></div>`,
    status: `<div class="field"><span>ステータス</span><div class="u-seg segc" role="group" aria-label="ステータス">${seg(
      "data-fs",
      STATUSES.map(s => [s, stLabel(s)]),
      f.s,
    )}</div></div>`,
    series: `<div class="field full" id="fSeries"><span>シリーズ</span>${ddBtn("ser")}</div>`,
    /* 放送形態：ジャンル映画は出さず「公開（映画館／配信）」だけ。バラエティは TV／配信 の2つ。どのジャンルでも映画なら公開を選べる */
    /* 放送形態・放送局・配信サイト：PCでは1行に横並び（スマホは縦） */
    media: `<div class="frow3 full">${f.k === "f" ? "" : `<div class="field" id="fMedia"><span>放送形態</span>${ddBtn("media")}</div>`}
      ${f.media === "movie" ? `<div class="field"${f.k === "f" ? ' id="fMedia"' : ""}><span>公開</span><div class="u-seg segc" role="group" aria-label="公開">${seg("data-frel", [["", "映画館"], ["stream", "配信"]], f.rel || "")}</div></div>` : ""}
      ${hasSt(f.media) ? `<div class="field"><span>放送局</span>${ddBtn("st")}</div>` : ""}
      ${f.media === "stream" ? `<div class="field"><span>配信サイト</span>${ddBtn("plat")}</div>` : ""}
      ${f.media !== "stream" ? `<div class="field"><span>配信サイト</span>${ddBtn("vods")}</div>` : ""}</div>`,
    from: `<label class="field"><span>${{ movie: "公開日", ova: "発売日（第1話）", sp: "放送日" }[f.media] || "開始日（第1話）"}</span><span class="dtw"><input id="f-from" class="dtx" type="text" inputmode="numeric" autocomplete="off" placeholder="2018/08/25" value="${esc(dtShow(f.from))}"><button type="button" class="dtcal" data-dtcal="f-from" aria-label="カレンダーから選ぶ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></button><input type="date" class="dtpick" tabindex="-1" aria-hidden="true" data-dtfor="f-from"></span></label>`,
    time:
      noSched(f.media)
        ? ""
        : `<div class="field"><label class="field" for="f-time"><span>${f.media === "stream" ? "配信時間" : "放送時間"}</span></label><input id="f-time" placeholder="23:30　深夜は 25:00" inputmode="numeric" autocomplete="off" value="${esc(f.time)}">${nofBox("time", f.media === "stream" ? "配信時間" : "放送時間")}</div>`,
    sched: `<div class="field full"><div class="sched" id="schedHint">${schedText()}</div>
        </div>`,
    cours:
      noSched(f.media)
        ? ""
        : `<div class="field full"><span>放送クール</span>
        <div class="cours" id="coursBox">${f.cours.includes(ALLYEAR) ? `<span class="tag static">通年</span>` : ""}${dyn.map(c => `<button type="button" class="u-chip tag" data-courdel="${c}" aria-label="${courLabel(c)}を外す">${courLabel(c)}</button>`).join("")}${!f.cours.length ? `<span class="none">未設定</span>` : ""}
          ${sug && !f.cours.includes(sug) && !f.cours.includes(ALLYEAR) ? `<button type="button" class="u-chip add sugbtn" data-courkey="${sug}">＋ ${courLabel(sug)}</button>` : ""}
          ${(() => {
            /* 2クール目以降：選んだ最後のクールの次をワンタップで */
            const last = dyn.filter(c => /^\d{4}/.test(c)).sort().pop();
            if (!last || f.cours.includes(ALLYEAR)) return "";
            const si = SEASONS.indexOf(last.slice(4)),
              nx = si === 3 ? `${+last.slice(0, 4) + 1}${SEASONS[0]}` : `${last.slice(0, 4)}${SEASONS[si + 1]}`;
            return f.cours.includes(nx) ? "" : `<button type="button" class="u-chip add sugbtn" data-courkey="${nx}">＋ ${courLabel(nx)}</button>`;
          })()}
          <button type="button" class="u-chip ${f.cours.includes(ALLYEAR) ? "on" : "add"} sugbtn" data-courall="1" aria-pressed="${f.cours.includes(ALLYEAR)}">${f.cours.includes(ALLYEAR) ? "✓ 通年" : "＋ 通年"}</button>
          <button type="button" class="u-chip fdd-mini" data-fdd="cour" aria-haspopup="listbox" aria-expanded="${ddOpen === "cour"}">ほかのクール ${DD_CHEV}</button></div>${nofBox("cours")}</div>`,
    songs: `<div class="field full">
        <div class="sglist" id="sgList">${songRowsHtml()}</div>
        ${songTypes.includes("挿入歌") && !f.songs.some(x => x.type === "挿入歌") ? `<div class="sgins"><button type="button" class="u-chip add sgadd" data-sgadd="挿入歌">＋ 挿入歌を追加</button></div>` : ""}
</div>`,
    /* 関連放送（旧作・再放送など）：タイトル・放送開始と終了・主題歌。主題歌の行は作品の主題歌と同じ作り */
    relb: `<label class="field full"><span>タイトル</span><input id="f-rbt" type="text" autocomplete="off" placeholder="旧作・再放送などのタイトル" value="${esc(f.rbT || "")}"></label>
        ${dtField("f-rbf", "放送開始", f.rbF)}${dtField("f-rbto", "放送終了", f.rbTo)}
        <div class="field full"><span>主題歌</span><div class="sglist" id="sgList">${songRowsHtml()}</div></div>`,
    url: `<div class="field full"><label class="field" for="f-url"><span>公式サイト</span></label><input id="f-url" type="url" inputmode="url" autocomplete="off" placeholder="https://" value="${esc(f.url)}">${nofBox("url")}</div>`,
    /* 配信URL：配信サイトを選んだときだけ出す（選んだサイトが1つならその名前を見出しに） */
    vurl: (() => {
      const sites = f.media === "stream" ? f.plat : f.vods;
      if (!sites.length && f.only !== "f-vurl") return "";
      return `<div class="field full"><label class="field" for="f-vurl"><span>${sites.length === 1 ? `${esc(sites[0])}のURL` : "配信URL"}</span></label><input id="f-vurl" type="url" inputmode="url" autocomplete="off" placeholder="https://" value="${esc(f.vurl)}">${nofBox("vurl")}</div>`;
    })(),
  };
  if (f.only && ONLY_A[f.only]) {
    let [lab, keys] = ONLY_A[f.only];
    /* OP・ED・主題歌の「なし」は見出しの行の右に（曲が1曲もないときだけ） */
    const sgNone = f.only === "sgList" ? sgNoneBox() : "";
    return `<div class="hdrow"><h3 class="onlyh"><small>${esc(f.t)}</small>${lab}を編集</h3>${sgNone}<button class="u-btn icon sm soft close" type="button" data-back="1" aria-label="戻る">✕</button></div>
    <form id="titleF" novalidate><div class="fgrid only">${keys.map(k => P[k]).join("")}</div>
    <div class="ffoot">${f.only === "relb" && f.rbK !== "new" ? `<button type="button" class="u-btn sm txt danger delsm" id="rbDel" aria-label="この関連放送を削除">削除</button>` : ""}<button type="button" class="u-btn" data-back="1">キャンセル</button><button class="u-btn pri primary" type="submit">保存する</button></div></form>`;
  }
  /* 上：タイトル、その下にジャンル・ステータス（色付きの札。押すと選択肢が開く） */
  const KINDS = [
    ["a", "アニメ", "ka"],
    ["d", "ドラマ", "kd"],
    ["f", "映画", "kf"],
    ["r", "バラエティ", "kr"],
  ];
  const ck = KINDS.find(x => x[0] === f.k) || KINDS[0];
  const head = `<div class="fhead"><input id="f-t" class="ftitle" autocomplete="off" placeholder="タイトル" aria-label="タイトル" value="${esc(f.t)}">
    <div class="fchips"><button type="button" class="u-chip fchip ${ck[2]}" data-fx="kind" aria-expanded="${f.fx === "kind"}" aria-label="ジャンル：${ck[1]}">${ck[1]}${DD_CHEV}</button><button type="button" class="u-chip fchip s-${esc(f.s)}" data-fx="status" aria-expanded="${f.fx === "status"}" aria-label="ステータス：${esc(stLabel(f.s))}">${esc(stLabel(f.s))}${DD_CHEV}</button></div>
    ${f.fx === "kind" ? `<div class="u-seg segc fxopt" role="group" aria-label="ジャンル">${seg("data-fk", KINDS, f.k)}</div>` : ""}${f.fx === "status" ? `<div class="u-seg segc fxopt fxst" role="group" aria-label="ステータス">${seg("data-fs", STATUSES.map(x => [x, stLabel(x), "s-" + x]), f.s)}</div>` : ""}</div>`;
  return `<div class="hdrow"><h3>${f.id ? "作品を編集" : "作品を追加"}</h3><button class="u-btn icon sm soft close" type="button" data-close aria-label="閉じる">✕</button></div>
    <form id="titleF" novalidate>
    ${head}
    ${sec("放送", P.media + P.vurl + P.from + P.time + P.cours, "", "", "ftbl")}
    ${sec("曲", P.songs, "", sgNoneBox(), "fsongs")}
    ${sec("そのほか", P.series + P.url, "", "", "ftbl")}
    <div class="ffoot"><button type="button" class="u-btn" data-close>キャンセル</button><button class="u-btn pri primary" type="submit">${f.id ? "保存する" : "追加する"}</button></div>
    </form>`;
}
function seg(attr, opts, cur) {
  return opts
    .map(
      ([v, l, c]) =>
        `<button type="button" ${attr}="${v}" class="${c || ""}" aria-pressed="${String(cur) === String(v)}">${l}</button>`,
    )
    .join("");
}
function readForm() {
  if (!$("#titleF")) return;
  const g = id => $(id)?.value;
  const v = (id, key) => {
    const x = g(id);
    if (x !== undefined) form[key] = x;
  };
  v("#f-t", "t");
  v("#f-time", "time");
  if ($("#f-from")) form.from = normDate($("#f-from").value) || "";
  v("#f-url", "url");
  v("#f-vurl", "vurl");
  v("#f-rbt", "rbT");
  if ($("#f-rbf")) form.rbF = normDate($("#f-rbf").value) || "";
  if ($("#f-rbto")) form.rbTo = normDate($("#f-rbto").value) || "";
  const cy = g("#f-cy");
  if (cy) form.cy = +cy;
  document.querySelectorAll("#titleF .nof").forEach(c => {
    const l = (form.noF || []).filter(x => x !== c.value);
    form.noF = c.checked ? [...l, c.value] : l;
  });
  if ($("#sgList")) form.noSongs = document.querySelector(".nos:checked") ? [...SONG_MAIN] : [];
  if ($("#sgList"))
    form.songs = [...document.querySelectorAll("[data-sg]")].map(r => {
      const one = !!r.querySelector(".sg-one")?.checked;
      let a = r.querySelector(".sg-a").value,
        b = one ? a : r.querySelector(".sg-b").value;
      /* 話数リストの最初・最後と同じ数字は空で持つ（話数が増えても表示が追いつくように） */
      if (!one && form.span) {
        if (a !== "" && +a === form.span[0]) a = "";
        if (b !== "" && +b === form.span[1]) b = "";
      }
      const old = form.songs[+r.dataset.sg];
      return {
        /* 主題歌メニューで付けた「DL済み」は、編集しても消さない */
        ...(old && old.dl ? { dl: true } : {}),
        type: r.querySelector(".sg-t").value,
        st: r.querySelector(".sg-st").value,
        ar: r.querySelector(".sg-ar").value,
        s: songJoin(r.querySelector(".sg-st").value, r.querySelector(".sg-ar").value),
        a: a === "" ? null : +a,
        b: b === "" ? null : +b,
        /* 飛び飛びの追加の話（「最初」が空の行は捨てない：入力途中でも消えないように残す） */
        ...(r.querySelector(".sg-x")
          ? {
              ex: [...r.querySelectorAll(".sg-x")].map(e => {
                const xa = e.querySelector(".sg-xa").value,
                  xb = e.querySelector(".sg-xb").value;
                return { a: xa === "" ? null : +xa, b: xb === "" ? null : +xb };
              }),
            }
          : {}),
        ...(one ? { one: 1 } : {}),
      };
    });
}
function redrawForm() {
  const sh = $(".sheet.form") || $("#layer .sheet");
  const y = sh.scrollTop;
  $("#formIn").innerHTML = formHtml();
  sh.scrollTop = y;
}
/* 編集画面の一部だけ描き直す（sels に合う所を、今の form で作った中身と入れかえる） */
function redrawParts(sels) {
  const box = $("#formIn");
  if (!box) return;
  const t = document.createElement("template");
  t.innerHTML = formHtml();
  sels.forEach(s => {
    const a = box.querySelector(s),
      b = t.content.querySelector(s);
    if (a && b) a.replaceWith(b);
  });
}
/* 作品の追加・編集画面を開く。it＝編集する作品（なければ追加）、target・el＝詳細で押した項目（その項目だけ詳細の中で編集） */
function openForm(it, target, el) {
  epEdit = null;
  const y = new Date().getFullYear();
  if (it) {
    const m = mediaOf(it);
    form = {
      id: it.id,
      k: it.k,
      t: it.t,
      s: it.s || "未視聴",
      dow: it.dow ?? -1,
      time: it.time || "",
      from: it.from || "",
      media: m.media,
      rel: it.rel || "",
      stations: [...m.stations],
      plat: [...m.plat],
      vods: [...m.vods],
      songs: songsOf(it).map(x => ({ ...x })),
      span: epSpan(it),
      noSongs: [...(it.noSongs || [])],
      noF: [...(it.noF || [])],
      series: it.series || "",
      url: it.url || "",
      vurl: it.vurl || "",
      cours: [...coursOf(it)],
      cy: yearOf(it) || y,
    };
  } else
    form = {
      id: null,
      k: state.mode === "s" ? "r" : state.mode === "m" ? (state.sub === "a" ? "a" : "f") : state.mode === "d" ? "d" : "a",
      t: "",
      s: "未視聴",
      dow: -1,
      time: "",
      from: "",
      media: state.mode === "m" ? "movie" : state.mode === "s" ? "stream" : "tv",
      stations: [],
      plat: [],
      vods: [],
      songs: [],
      noF: [],
      series: state.series.length === 1 ? state.series[0] : "",
      url: "",
      vurl: "",
      cours: [],
      cy: y,
    };
  /* 関連放送の編集：主題歌の欄はその関連放送の曲に入れ替えて開く（保存も関連放送にだけ書く） */
  if (it && target === "relb") {
    const k = el && el.dataset && el.dataset.rbk != null ? el.dataset.rbk : "new";
    const r = k === "new" ? {} : (it.relb || [])[+k] || {};
    Object.assign(form, { rbK: k, rbT: r.t || "", rbF: r.from || "", rbTo: r.to || "", songs: (r.songs || []).map(x => ({ ...x })) });
  }
  sgOpen = new Set();
  /* 1話だけの曲（最初＝最後）は「1話だけ」にチェックを入れて開く */
  form.songs.forEach(x => {
    if (x.a != null && x.b === x.a) x.one = 1;
  });
  /* 使われた話が空の曲は空のまま開く（空＝全話。開いて保存しただけで範囲が入らないように） */
  /* 項目を指定したときは、作品の詳細の中でその項目だけ編集する */
  if (it && ONLY_A[target]) return openInlineForm(target, el);
  form.fromDetail = !!it && openId === it.id; // 詳細から開いたか（戻るときに前・次の並びを引き継ぐ）
  openId = null;
  $("#layer").innerHTML =
    `<div class="scrim" data-close></div><div class="sheet form" role="dialog" aria-modal="true" aria-label="${form.id ? "作品を編集" : "作品を追加"}"><div class="wrap" id="formIn">${formHtml()}</div></div>`;
  readForm();
  form.init = JSON.stringify({ ...form, init: 0 });
  if (!TOUCH) $("#f-t").focus({ preventScroll: true });
}
/* 作品の詳細画面で、押した項目をその場で編集する（編集画面は開かない）
   Enter・保存で保存、詳細の別の場所を押すと保存して閉じる、✕・キャンセル・Escで取り消し */
function inlineAnchor(target, el) {
  /* 押した場所の下に出す。押した場所が描き直しで消えていたら、見えている同じ項目を探す */
  if (!el || !el.isConnected) {
    const l = [...document.querySelectorAll(`#sheetIn [data-jump="${target}"]`)];
    el = l.find(x => x.offsetParent !== null) || l[0];
  }
  if (!el) return null;
  /* 未入力アラート（上に固定の見出しの中）から開いたときは、見出しの中ではなく見出しのすぐ下に出す。
     見出しの中に出すと、固定の見出しが伸びてスクロールや矢印キーでの移動がおかしくなるため */
  if (el.closest(".dhead")) return el.closest(".dhead");
  if (target === "relb" && el.closest(".links")) return el.closest(".links");
  return el.closest(".icard,.dmiss,.ilinks") || el;
}
function openInlineForm(target, el) {
  const anc = inlineAnchor(target, el);
  if (!anc) {
    form = null;
    return;
  }
  form.only = target;
  form.inline = true;
  document.querySelectorAll("#sheetIn .ined").forEach(x => x.remove());
  document.querySelectorAll("#sheetIn .icard[hidden]").forEach(x => (x.hidden = false));
  /* カードの「編集」ボタンから開いたときは、そのカードの場所がそのまま編集画面になる（元の表示は隠す） */
  const inCard = !!(el && el.closest && el.closest(".iedit") && anc.classList.contains("icard"));
  anc.insertAdjacentHTML(inCard ? "beforebegin" : "afterend", `<div class="ined${inCard ? " incard" : ""}" id="formIn">${formHtml()}</div>`);
  if (inCard) anc.hidden = true;
  readForm();
  form.init = JSON.stringify({ ...form, init: 0 });
  const box = $("#formIn");
  const sh = box.closest(".sheet");
  if (anc.classList.contains("dhead") && sh) sh.scrollTop = 0;
  else if (inCard && sh) {
    /* 編集画面の上端を、上に固定の見出しのすぐ下に合わせる（長い編集画面でも一番下へ飛ばない） */
    const hd = sh.querySelector(".dhead");
    const top = sh.getBoundingClientRect().top + (hd ? hd.getBoundingClientRect().height : 0) + 8;
    const d = box.getBoundingClientRect().top - top;
    sh.scrollTop += d;
  } else if (typeof navScroll === "function") navScroll(box);
  else box.scrollIntoView({ block: "nearest" });
  const i = box.querySelector(".fgrid.only input:not([type=date]):not([type=checkbox]):not([type=file])");
  if (i && !TOUCH) i.focus({ preventScroll: true });
}
function closeInlineForm() {
  closeDD();
  form = null;
  document.querySelectorAll("#sheetIn .ined").forEach(x => x.remove());
  document.querySelectorAll("#sheetIn .icard[hidden]").forEach(x => (x.hidden = false));
}
/* 変更があれば保存、なければ閉じるだけ */
function commitInlineForm() {
  if (!form || !form.inline) return;
  readForm();
  if (JSON.stringify({ ...form, init: 0 }) === form.init) closeInlineForm();
  else submitForm();
}
/* 編集画面の中身から、保存する項目を作る */
function buildPatch(f) {
  const t = (f.t || "").trim();
  const songs = f.songs
    .map(({ ex, one, dl, ...x }) => {
      /* 飛び飛びの話：「最初」が空の行は保存しない。最後が最初より小さいときは入れ替える */
      const e = (ex || []).filter(r => r && r.a != null).map(r => (r.b != null && r.b < r.a ? { a: r.b, b: r.a } : r.b === r.a ? { a: r.a, b: null } : r));
      return { ...x, ...(e.length ? { ex: e } : {}), st: (x.st ?? x.s ?? "").trim(), ar: (x.ar || "").trim(), s: (x.s || "").trim() };
    })
    .filter(x => x.s);
  const isMovie = noSched(f.media);
  const patch = {
    k: f.k,
    t,
    s: f.s,
    dow: isMovie || (f.noF || []).includes("time") || !f.from ? -1 : dowOfDate(f.from),
    time: isMovie ? "" : (f.time || "").trim().replace("：", ":"),
    from: f.from || "",
    media: f.media,
    rel: f.media === "movie" && f.rel === "stream" ? "stream" : "",
    stations: hasSt(f.media) ? f.stations : [],
    plat: f.media === "stream" ? f.plat : [],
    vods: f.media === "stream" ? [] : f.vods,
    cours: isMovie ? [] : f.cours,
    songs,
    noSongs: songs.length ? [] : f.noSongs || [],
    noF: [],
    series: (f.series || "").trim(),
    url: (f.url || "").trim(),
    vurl: normVurl(f.vurl),
  };
  /* 入力した項目の「なし」は自動で外す */
  /* 「なし」にした項目は入力欄を隠しているので、残っている値は消して「なし」を優先 */
  const clr = {
    time: () => (patch.time = ""),
    st: () => (patch.stations = []),
    plat: () => (patch.plat = []),
    vods: () => (patch.vods = []),
    cours: () => (patch.cours = []),
    url: () => (patch.url = ""),
    vurl: () => (patch.vurl = ""),
    ser: () => (patch.series = ""),
  };
  patch.noF = [...new Set(f.noF || [])].filter(k => k in clr);
  patch.noF.forEach(k => clr[k]());
  return patch;
}
/* 関連放送を保存（k＝何番目か。null で削除） */
async function saveRelb(f, del) {
  const it = items.find(x => x.id === f.id);
  if (!it) return;
  const l = (it.relb || []).map(x => ({ ...x }));
  const k = f.rbK === "new" ? -1 : +f.rbK;
  if (del) {
    if (k >= 0) l.splice(k, 1);
  } else {
    const r = { t: (f.rbT || "").trim(), from: f.rbF || "", to: f.rbTo || "", songs: buildPatch(f).songs };
    if (!r.t && !r.from && !r.to && !r.songs.length) {
      closeInlineForm();
      return;
    }
    if (k >= 0) l[k] = r;
    else l.push(r);
  }
  form = null;
  await saveTitle(f.id, { relb: l }, del ? "関連放送を削除しました" : "保存しました");
}
async function submitForm() {
  readForm();
  const f = form;
  if (f.only === "relb") return saveRelb(f);
  const t = (f.t || "").trim();
  if (!t) {
    $("#f-t").focus();
    toast("タイトルを入れてください");
    return;
  }
  const patch = buildPatch(f);
  /* 開いたときから変わった項目だけ保存する（触っていない項目で、ほかの端末の変更を消さないため） */
  if (f.id && f.init) {
    const base = buildPatch(JSON.parse(f.init));
    Object.keys(patch).forEach(key => JSON.stringify(patch[key]) === JSON.stringify(base[key]) && delete patch[key]);
    if (!Object.keys(patch).length) {
      if (f.inline) closeInlineForm();
      else {
        close();
        openDetail(f.id, 0, f.fromDetail);
      }
      return;
    }
  }
  if (f.id && f.inline) {
    form = null;
    await saveTitle(f.id, patch, "保存しました");
    return;
  }
  if (f.id) {
    const id = f.id;
    close();
    await saveTitle(id, patch, "保存しました");
    openDetail(id, 0, f.fromDetail);
    return;
  }
  const id = "u" + Date.now().toString(36);
  patch.added = Date.now();
  close();
  await saveTitle(id, patch, "追加しました");
}
/* ポップアップ表示中は背景を固定する（共通部品 U.lock） */
const TOUCH = U.TOUCH;
const lockScroll = U.lock;
new MutationObserver(() => lockScroll(!!$("#layer").firstElementChild)).observe($("#layer"), { childList: true });
/* 作品の追加・編集画面：入力中の内容を読み取ってから変えて、描き直す */
let sgExK = -1; // 飛び飛びの話を足した曲（足したあとその入力欄へ移るため）
const formEdit = (fn, after) => el => {
  readForm();
  fn(el);
  redrawForm();
  if (after) after();
};
const FORM_ACTIONS = [
  [
    "#rbDel",
    el => {
      if (!form) return;
      /* 1回目は確認（もう1回押すと削除） */
      if (!el.classList.contains("armed")) {
        el.classList.add("armed");
        el.textContent = "もう一度押す";
        return;
      }
      saveRelb(form, true);
    },
  ],
  ["[data-fm]", formEdit(el => (form.media = el.dataset.fm))],
  ["[data-frel]", formEdit(el => (form.rel = el.dataset.frel))],
  [
    "[data-fdd]",
    el => {
      const k = el.dataset.fdd;
      if (ddOpen === k) return closeDD(true);
      openDD(k, el);
    },
  ],
  /* シリーズ：別のジャンルのシリーズからも探す */
  /* 曲を追加：前の曲の続きの話から最後の話まで */
  [
    "[data-sgadd]",
    formEdit(
      el => {
        const tp = el.dataset.sgadd;
        const same = form.songs.filter(x => x.type === tp);
        const last = same[same.length - 1];
        const sp = form.span;
        let nu;
        /* 前の曲が「1話だけ」なら、次の曲もその次の1話だけ（例：1話→2話→3話…） */
        if (last && last.one && last.a != null) nu = { a: last.a + 1, b: last.a + 1, one: 1 };
        /* 前の曲の範囲の続き（例：1〜6話の次は7〜最後）。それ以外は空（＝全話） */
        else if (last && last.b != null && sp && last.b < sp[1]) nu = { a: last.b + 1, b: sp[1] };
        else nu = { a: null, b: null };
        /* 同じ種類の最後の曲のすぐ後ろに入れる（種類ごとの並びを保つ） */
        const at = last ? form.songs.lastIndexOf(last) + 1 : form.songs.length;
        form.songs.splice(at, 0, { type: tp, s: "", st: "", ar: "", ...nu });
        sgOpen = new Set([...[...sgOpen].map(k => (k >= at ? k + 1 : k)), at]);
        sgAddK = at;
      },
      () => {
        const c = document.querySelector(`.sg[data-sg="${sgAddK}"]`);
        if (!c) return;
        if (!TOUCH) c.querySelector(".sg-st")?.focus({ preventScroll: true });
        c.scrollIntoView({ block: "nearest" });
      },
    ),
  ],
  [
    "[data-sgdel]",
    formEdit(el => {
      const d = +el.dataset.sgdel;
      form.songs.splice(d, 1);
      sgOpen = new Set([...sgOpen].filter(k => k !== d).map(k => (k > d ? k - 1 : k)));
    }),
  ],
  /* 1話だけ：チェックで「最後」の欄を出したり隠したり */
  ["[data-sgone]", formEdit(() => {})],
  /* 曲をたたむ／開く（同じ種類に2曲以上あるときだけ） */
  [
    "[data-sgfold]",
    formEdit(el => {
      const k = +el.dataset.sgfold;
      if (sgOpen.has(k)) sgOpen.delete(k);
      else sgOpen.add(k);
    }),
  ],
  [
    "[data-sgfoldall]",
    formEdit(el => {
      const ks = form.songs.map((x, k) => [x, k]).filter(([x]) => x.type === el.dataset.sgfoldall);
      const anyOpen = ks.some(([, k]) => sgOpen.has(k));
      ks.forEach(([, k]) => (anyOpen ? sgOpen.delete(k) : sgOpen.add(k)));
    }),
  ],
  /* 飛び飛びの話：行を足す／消す */
  [
    "[data-sgex]",
    formEdit(
      el => {
        sgExK = +el.dataset.sgex;
        const x = form.songs[sgExK];
        if (x) x.ex = [...(x.ex || []), { a: null, b: null }];
      },
      () => {
        const l = document.querySelectorAll(`.sg[data-sg="${sgExK}"] .sg-xa`);
        if (!TOUCH && l.length) l[l.length - 1].focus();
      },
    ),
  ],
  [
    "[data-sgxdel]",
    formEdit(el => {
      const [k, j] = el.dataset.sgxdel.split(":").map(Number);
      const x = form.songs[k];
      if (x && x.ex) x.ex.splice(j, 1);
    }),
  ],
  /* ジャンル・ステータス。映画は放送形態も映画に、配信番組は配信に */
  [
    "[data-fk],[data-fs]",
    formEdit(el => {
      if (el.dataset.fk) {
        form.k = el.dataset.fk;
        if (form.k === "f") form.media = "movie";
        if (form.k === "r" && form.media !== "tv" && form.media !== "stream") form.media = "stream";
      }
      if (el.dataset.fs) form.s = el.dataset.fs;
      form.fx = null;
    }),
  ],
  /* ジャンル・ステータスの札：押すと選択肢を開く／閉じる */
  ["[data-fx]", formEdit(el => (form.fx = form.fx === el.dataset.fx ? null : el.dataset.fx))],
  /* 放送クール */
  [
    "[data-courkey]",
    formEdit(el => {
      if (!form.cours.includes(el.dataset.courkey)) form.cours.push(el.dataset.courkey);
      form.cours.sort();
    }),
  ],
  [
    "[data-courall]",
    formEdit(() => {
      const on = form.cours.includes(ALLYEAR);
      form.cours = form.cours.filter(c => c !== ALLYEAR);
      if (!on) form.cours.unshift(ALLYEAR);
    }),
  ],
  ["[data-courdel]", formEdit(el => (form.cours = form.cours.filter(c => c !== el.dataset.courdel)))],
];
/* 詳細の中でその場で編集しているとき：✕で取り消し、外を押したら保存して閉じる（別の項目を押したらそのまま次を編集） */
function onTitleFormClick(e) {
  if (form && form.inline) {
    if (e.target.closest(".ined [data-back]")) {
      closeInlineForm();
      return true;
    }
    /* 描き直しで消えた場所へのクリックは「外を押した」ではない */
    if (!e.target.isConnected) return true;
    if (!e.target.closest(".ined")) {
      const jp = e.target.closest("#sheetIn [data-jump]");
      const tgt = jp && jp.dataset.jump;
      commitInlineForm();
      closeInlineForm();
      if (!tgt || e.target.closest("a,button:not([data-jump])")) return false; // ほかのボタン（閉じる・タブなど）はそのまま動かす
      const it = items.find(x => x.id === openId);
      if (it) openForm(it, tgt, jp);
      return true;
    }
  }
  return !!form && runActions(FORM_ACTIONS, e);
}

/* 曲の並び替え：⠿を押さえたまま上下に動かす（同じ種類の中だけ）。
   画面の並び＝保存する並びなので、入力内容を読み直してたたみ状態だけ番号を付けかえる */
SORT_DONE.sg = () => {
  if (!form) return;
  const old = [...document.querySelectorAll("#sgList [data-sg]")].map(c => +c.dataset.sg);
  readForm();
  sgOpen = new Set(old.map((k, i) => (sgOpen.has(k) ? i : -1)).filter(i => i >= 0));
  redrawForm();
};
