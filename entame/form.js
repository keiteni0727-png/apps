/* ===================== 作品の追加・編集（詳細の中でその項目だけ編集するときも） ===================== */
let form = null;
const chipsHtml = (attr, opts, sel, color) =>
  opts
    .map(v => `<button type="button" ${attr}="${esc(v)}" aria-pressed="${sel.includes(v)}"${color && VOD_COLOR[v] ? ` class="vc"${vcStyle(v)}` : ""}>${esc(v)}</button>`)
    .join("");
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
/* 編集画面のシリーズ検索：基本は同じジャンルのシリーズだけ。「○○のシリーズからも探す」で別ジャンルも出す */
function serSugForm(q) {
  const nq = norm(q);
  const grp = serGroup(form.k),
    other = grp === "a" ? "d" : "a";
  const { map, cnt } = seriesMainMap();
  const n0 = n => (cnt[n] ? cnt[n].a + cnt[n].d : 0);
  const hit = n => n !== form.series && (!nq || norm(n).includes(nq));
  const sort = l => (nq ? l.sort((x, y) => norm(x).indexOf(nq) - norm(y).indexOf(nq) || n0(y) - n0(x)) : l.sort((x, y) => n0(y) - n0(x)));
  const mine = sort(Object.keys(map).filter(n => map[n] === grp && hit(n)));
  const others = sort(Object.keys(map).filter(n => map[n] === other && hit(n)));
  const btn = (n, o) => `<button type="button" data-fser="${esc(n)}"${o ? ' class="ser-o"' : ""}>${esc(n)}<small>${n0(n)}</small>${o ? `<em>${SER_GL[other]}</em>` : ""}</button>`;
  let h = "";
  if (nq || form.serAll) {
    const shown = mine.slice(0, 20);
    if (form.serAll) h += `<span class="hint ser-oh">${SER_GL[grp]}のシリーズ</span>`;
    h += shown.length ? shown.map(n => btn(n)).join("") : `<span class="hint">${SER_GL[grp]}のシリーズに${nq ? `「${esc(q)}」は` : ""}ありません</span>`;
  }
  if (form.serAll) {
    if (others.length) h += `<span class="hint ser-oh">${SER_GL[other]}のシリーズ</span>` + others.slice(0, 30).map(n => btn(n, true)).join("");
    else h += `<span class="hint ser-oh">${SER_GL[other]}のシリーズに${nq ? `「${esc(q)}」は` : ""}ありません</span>`;
  } else if (others.length) h += `<button type="button" class="ser-all" data-fserall="1">${SER_GL[other]}のシリーズからも探す（${nq ? "一致 " : ""}${others.length}件）</button>`;
  return h;
}
/* 編集画面の曲：種類ごとの区切り（色の帯・見出し・＋追加・なし）に曲のカードを並べる */
const SONG_MAIN = ["OP", "ED", "主題歌"];
function songRowsHtml() {
  const f = form;
  /* OP・ED・主題歌はジャンル・種別に関係なくいつも出す（挿入歌は追加したときだけ） */
  const types = SONG_TYPES.filter(t => SONG_MAIN.includes(t) || t === "挿入歌" || f.songs.some(x => x.type === t));
  const main = SONG_MAIN;
  /* 「なし」は曲が1曲もないときだけ。OP・ED・主題歌まとめて1つ */
  const none = !f.songs.length && (f.noSongs || []).length > 0;
  const card = (x, k) => {
    return `<div class="sg" data-sg="${k}">
    <div class="sg-f"><label class="sg-q"><span>まとめて入力</span><input class="sg-qi" placeholder="「曲名」アーティスト で入れると下に分けて入ります" autocomplete="off" enterkeyhint="done"></label>
      <label><span>曲名</span><input class="sg-st" value="${esc(songTA(x).st)}" placeholder="例：エスコート" autocomplete="off"></label>
      <label><span>アーティスト</span><input class="sg-ar" value="${esc(songTA(x).ar)}" placeholder="例：THE BEAT GARDEN" autocomplete="off"></label></div>
    <div class="sg-r"><span class="sg-rl">使われた話</span><input class="sg-a" type="number" min="0" inputmode="numeric" value="${x.a ?? ""}" placeholder="最初" aria-label="使われた最初の話"><span>〜</span><input class="sg-b" type="number" min="0" inputmode="numeric" value="${x.b ?? ""}" placeholder="最後" aria-label="使われた最後の話"><span>話</span>${x.a == null && x.b == null ? `<span class="sg-all">全話</span>` : ""}
      <span class="sg-sp"></span>
      <label class="sg-dlw"><input type="checkbox" class="sg-dl" ${x.dl ? "checked" : ""}>♪ DL済み</label>
      <select class="sg-t" aria-label="種類を変える" title="種類を変える">${SONG_TYPES.map(t => `<option value="${t}" ${t === x.type ? "selected" : ""}>${t}${t === x.type ? "" : "に変える"}</option>`).join("")}</select>
      <button type="button" class="del" data-sgdel="${k}" aria-label="この曲を削除">削除</button></div></div>`;
  };
  const secs = types
    .map(t => {
      const l = f.songs.map((x, k) => [x, k]).filter(([x]) => x.type === t);
      if (!l.length && !main.includes(t)) return "";
      return `<div class="sgsec ${SG_CLS[t]}">
        <div class="sgh"><b class="sgn">${t}</b>${l.length ? `<small>${l.length}曲</small>` : ""}<span class="sg-sp"></span>
          <button type="button" class="sgadd" data-sgadd="${t}">＋ ${t}を追加</button></div>
        ${l.length ? l.map(([x, k]) => card(x, k)).join("") : none ? "" : `<p class="hint sgempty">まだ登録されていません</p>`}</div>`;
    })
    .join("");
  const noBox = f.songs.length ? "" : `<label class="nofl sgno sgall"><input type="checkbox" class="nos" ${none ? "checked" : ""}><span>OP・ED・主題歌 なし</span></label>`;
  return noBox + secs;
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
  "f-time": ["放送時間", ["time", "sched"]],
  fMedia: ["放送局・配信", ["media"]],
  "f-from": ["放送日", ["from", "sched"]],
  coursBox: ["放送クール", ["cours"]],
  sgList: ["OP・ED・主題歌", ["songs"]],
  "f-url": ["公式サイト", ["url"]],
  "f-vurl": ["配信サイトURL", ["vurl"]],
};
function formHtml() {
  const f = form;
  const y = new Date().getFullYear();
  const years = [];
  for (let k = y + 1; k >= 1960; k--) years.push(k);
  const dyn = f.cours.filter(c => c !== ALLYEAR);
  const songTypes = f.k === "a" ? ["OP", "ED", "主題歌", "挿入歌"] : ["主題歌", "挿入歌"];
  const sug = courOfDate(f.from);
  const sec = (title, body, note = "") =>
    `<section class="fsec"><h4>${title}${note ? `<span class="hint">${note}</span>` : ""}</h4><div class="fgrid">${body}</div></section>`;
  const P = {
    title: `<label class="field full"><span>タイトル</span><input id="f-t" autocomplete="off" placeholder="例：薬屋のひとりごと 第3期" value="${esc(f.t)}"></label>`,
    kind: `<div class="field"><span>ジャンル</span><div class="segc" role="group" aria-label="ジャンル">${seg(
      "data-fk",
      [
        ["a", "アニメ", "ka"],
        ["d", "ドラマ", "kd"],
        ["f", "映画", "kf"],
        ["r", "配信", "kr"],
      ],
      f.k,
    )}</div></div>`,
    status: `<div class="field"><span>ステータス</span><div class="segc" role="group" aria-label="ステータス">${seg(
      "data-fs",
      STATUSES.map(s => [s, stLabel(s)]),
      f.s,
    )}</div></div>`,
    series: `<div class="field full" id="fSeries"><span>シリーズ</span>
        ${
          f.series
            ? `<div class="serpick"><span class="lab s">${esc(f.series)}</span><button type="button" class="u-btn sm ghost" data-fserdel="1">変更する</button></div>`
            : f.serNew
              ? `<div class="sernew"><input id="f-sernew" autocomplete="off" placeholder="新しいシリーズ名" value="${esc(f.serNewName || "")}"><button type="button" data-fsercreate="1">作成</button><button type="button" class="u-btn sm ghost" data-fsernew="0">やめる</button></div>`
              : `<div class="sernew"><input id="f-serq" type="search" autocomplete="off" placeholder="シリーズを検索（なければ空欄）"><button type="button" data-fsernew="1">＋ 新しく作る</button></div><div class="chips" id="fSerSug">${serSugForm("")}</div>`
        }
      </div>`,
    media: `<div class="field full" id="fMedia"><span>放送形態</span><div class="segc" role="group" aria-label="放送形態">${seg("data-fm", MEDIA, f.media)}</div></div>
      ${hasSt(f.media) ? `<div class="field full"><span>放送局</span><div class="chips">${chipsHtml("data-fst", [...new Set([...M("stations"), ...f.stations])], f.stations)}</div>${nofBox("st")}</div>` : ""}
      ${f.media === "stream" ? `<div class="field full"><span>配信サイト</span><div class="chips">${chipsHtml("data-fplat", [...new Set([...M("vods"), ...f.plat])], f.plat, true)}</div>${nofBox("plat")}</div>` : ""}
      ${f.media !== "stream" ? `<div class="field full"><span>${noSched(f.media) ? "配信（見られるサイト）" : "配信（見逃し・見られるサイト）"}</span><div class="chips">${chipsHtml("data-fvod", [...new Set([...M("vods"), ...f.vods])], f.vods, true)}</div>${nofBox("vods", "見られる配信")}</div>` : ""}`,
    from: `<label class="field"><span>${{ movie: "公開日", ova: "発売日（第1話）", sp: "放送日" }[f.media] || "開始日（第1話）"}</span><span class="dtw"><input id="f-from" class="dtx" type="text" inputmode="numeric" autocomplete="off" placeholder="2018/08/25" value="${esc(dtShow(f.from))}"><button type="button" class="dtcal" data-dtcal="f-from" aria-label="カレンダーから選ぶ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></button><input type="date" class="dtpick" tabindex="-1" aria-hidden="true" data-dtfor="f-from"></span></label>`,
    time:
      noSched(f.media)
        ? ""
        : `<div class="field"><label class="field" for="f-time"><span>${f.media === "stream" ? "配信時間" : "放送時間"}</span></label><input id="f-time" placeholder="23:30　深夜は 25:00" inputmode="numeric" autocomplete="off" value="${esc(f.time)}">${nofBox("time", f.media === "stream" ? "配信時間（毎週の配信ではない）" : "放送時間（毎週の放送ではない）")}</div>`,
    sched: `<div class="field full"><div class="sched" id="schedHint">${schedText()}</div>
        </div>`,
    cours:
      noSched(f.media)
        ? ""
        : `<div class="field full"><span>放送クール</span>
        <div class="cours" id="coursBox">${f.cours.includes(ALLYEAR) ? `<span class="tag static">通年</span>` : ""}${dyn.map(c => `<button type="button" class="tag" data-courdel="${c}" aria-label="${courLabel(c)}を外す">${courLabel(c)}</button>`).join("")}${!f.cours.length ? `<span class="none">未設定</span>` : ""}
          ${sug && !f.cours.includes(sug) && !f.cours.includes(ALLYEAR) ? `<button type="button" class="sugbtn" data-courkey="${sug}">＋ ${courLabel(sug)}（開始日から）</button>` : ""}
          ${(() => {
            /* 2クール目以降：選んだ最後のクールの次をワンタップで */
            const last = dyn.filter(c => /^\d{4}/.test(c)).sort().pop();
            if (!last || f.cours.includes(ALLYEAR)) return "";
            const si = SEASONS.indexOf(last.slice(4)),
              nx = si === 3 ? `${+last.slice(0, 4) + 1}${SEASONS[0]}` : `${last.slice(0, 4)}${SEASONS[si + 1]}`;
            return f.cours.includes(nx) ? "" : `<button type="button" class="sugbtn" data-courkey="${nx}">＋ ${courLabel(nx)}（次のクール）</button>`;
          })()}
          <button type="button" class="sugbtn${f.cours.includes(ALLYEAR) ? " on" : ""}" data-courall="1" aria-pressed="${f.cours.includes(ALLYEAR)}">${f.cours.includes(ALLYEAR) ? "✓ 通年" : "＋ 通年"}</button>
          <button type="button" class="sugbtn ghost" data-courmore="1" aria-expanded="${!!f.courOpen}">ほかのクール ${f.courOpen ? "▴" : "▾"}</button></div>
        ${f.courOpen || f.only ? `<div class="courpick"><select id="f-cy" aria-label="年">${years.map(k => `<option ${k === f.cy ? "selected" : ""}>${k}</option>`).join("")}</select><div class="segc" role="group" aria-label="季節を追加">${SEASONS.map(s => `<button type="button" data-couradd="${s}">${s}</button>`).join("")}</div></div>` : ""}${nofBox("cours")}</div>`,
    n:
      f.id || f.media === "movie" || f.media === "sp"
        ? ""
        : `<label class="field"><span>全話数</span><input id="f-n" type="number" min="1" max="2000" inputmode="numeric" placeholder="12" value="${esc(f.n || "")}"><span class="hint">${f.media === "ova" ? "第1話に発売日を入れて話を作ります" : "開始日から毎週の日付で話を作ります"}</span></label>`,
    songs: `<div class="field full">
        <div class="sglist" id="sgList">${songRowsHtml()}</div>
        ${songTypes.includes("挿入歌") && !f.songs.some(x => x.type === "挿入歌") ? `<div class="chips" style="margin-top:2px"><button type="button" data-sgadd="挿入歌">＋ 挿入歌</button></div>` : ""}
        ${f.only ? `<p class="hint" style="margin:6px 0 0">話によって曲が変わるときは、使われた話の範囲を入れます</p>` : ""}</div>`,
    url: `<div class="field full"><label class="field" for="f-url"><span>公式サイト</span></label><input id="f-url" type="url" inputmode="url" autocomplete="off" placeholder="https://" value="${esc(f.url)}">${nofBox("url")}</div>`,
    vurl: `<div class="field full"><label class="field" for="f-vurl"><span>配信サイト（見るページのURL）</span></label><input id="f-vurl" type="url" inputmode="url" autocomplete="off" placeholder="https://www.netflix.com/title/…" value="${esc(f.vurl)}">${nofBox("vurl")}</div>`,
  };
  if (f.only && ONLY_A[f.only]) {
    let [lab, keys] = ONLY_A[f.only];
    return `<div class="hdrow"><h3 class="onlyh"><small>${esc(f.t)}</small>${lab}を編集</h3><button class="close" type="button" data-back="1" aria-label="戻る">✕</button></div>
    <form id="titleF" novalidate><div class="fgrid only">${keys.map(k => P[k]).join("")}</div>
    <div class="ffoot"><button type="button" class="u-btn ghost" data-back="1">キャンセル</button><button class="u-btn pri primary" type="submit">保存する</button></div></form>`;
  }
  return `<div class="hdrow"><h3>${f.id ? "作品を編集" : "作品を追加"}</h3><button class="close" type="button" data-close aria-label="閉じる">✕</button></div>
    <form id="titleF" novalidate>
    ${sec("基本情報", P.title + P.kind + P.status + P.series)}
    ${sec("放送", P.media + P.from + P.time + P.sched + P.cours + P.n)}
    ${sec("OP・ED・主題歌", P.songs, "話によって曲が変わるときは、使われた話の範囲を入れます")}
    ${sec("リンク", P.url + P.vurl)}
    <div class="ffoot"><button type="button" class="u-btn ghost" data-close>キャンセル</button><button class="u-btn pri primary" type="submit">${f.id ? "保存する" : "追加する"}</button></div>
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
  v("#f-n", "n");
  v("#f-sernew", "serNewName");
  const cy = g("#f-cy");
  if (cy) form.cy = +cy;
  document.querySelectorAll("#titleF .nof").forEach(c => {
    const l = (form.noF || []).filter(x => x !== c.value);
    form.noF = c.checked ? [...l, c.value] : l;
  });
  if ($("#sgList")) form.noSongs = document.querySelector(".nos:checked") ? [...SONG_MAIN] : [];
  if ($("#sgList"))
    form.songs = [...document.querySelectorAll("[data-sg]")].map(r => {
      const a = r.querySelector(".sg-a").value,
        b = r.querySelector(".sg-b").value;
      return {
        type: r.querySelector(".sg-t").value,
        st: r.querySelector(".sg-st").value,
        ar: r.querySelector(".sg-ar").value,
        s: songJoin(r.querySelector(".sg-st").value, r.querySelector(".sg-ar").value),
        a: a === "" ? null : +a,
        b: b === "" ? null : +b,
        ...(r.querySelector(".sg-dl")?.checked ? { dl: 1 } : {}),
      };
    });
}
function redrawForm() {
  const sh = $(".sheet.form") || $("#layer .sheet");
  const y = sh.scrollTop;
  $("#formIn").innerHTML = formHtml();
  sh.scrollTop = y;
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
  if (form.span)
    form.songs.forEach(x => {
      if (x.a == null && x.b == null) {
        x.a = form.span[0];
        x.b = form.span[1];
      }
    });
  /* 項目を指定したときは、作品の詳細の中でその項目だけ編集する */
  if (it && ONLY_A[target]) return openInlineForm(target, el);
  openId = null;
  $("#layer").innerHTML =
    `<div class="scrim" data-close></div><div class="sheet form" role="dialog" aria-modal="true" aria-label="${form.id ? "作品を編集" : "作品を追加"}"><div class="wrap" id="formIn">${formHtml()}</div></div>`;
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
  anc.insertAdjacentHTML("afterend", `<div class="ined" id="formIn">${formHtml()}</div>`);
  readForm();
  form.init = JSON.stringify({ ...form, init: 0 });
  const box = $("#formIn");
  const sh = box.closest(".sheet");
  if (anc.classList.contains("dhead") && sh) sh.scrollTop = 0;
  else if (typeof navScroll === "function") navScroll(box);
  else box.scrollIntoView({ block: "nearest" });
  const i = box.querySelector(".fgrid.only input:not([type=date]):not([type=checkbox]):not([type=file])");
  if (i && !TOUCH) i.focus({ preventScroll: true });
}
function closeInlineForm() {
  form = null;
  document.querySelectorAll("#sheetIn .ined").forEach(x => x.remove());
}
/* 変更があれば保存、なければ閉じるだけ */
function commitInlineForm() {
  if (!form || !form.inline) return;
  readForm();
  if (JSON.stringify({ ...form, init: 0 }) === form.init) closeInlineForm();
  else submitForm();
}
async function submitForm() {
  readForm();
  const f = form;
  const t = (f.t || "").trim();
  if (!t) {
    $("#f-t").focus();
    toast("タイトルを入れてください");
    return;
  }
  const songs = f.songs.map(x => ({ ...x, st: (x.st ?? x.s ?? "").trim(), ar: (x.ar || "").trim(), s: (x.s || "").trim() })).filter(x => x.s);
  const isMovie = noSched(f.media);
  const patch = {
    k: f.k,
    t,
    s: f.s,
    dow: isMovie || (f.noF || []).includes("time") || !f.from ? -1 : dowOfDate(f.from),
    time: isMovie ? "" : (f.time || "").trim().replace("：", ":"),
    from: f.from || "",
    media: f.media,
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
  };
  patch.noF = [...new Set(f.noF || [])].filter(k => k in clr);
  patch.noF.forEach(k => clr[k]());
  if (f.id && f.inline) {
    form = null;
    await saveTitle(f.id, patch, "保存しました");
    return;
  }
  if (f.id) {
    const id = f.id;
    close();
    await saveTitle(id, patch, "保存しました");
    openDetail(id);
    return;
  }
  const id = "u" + Date.now().toString(36);
  patch.added = Date.now();
  const n = Math.min(2000, +f.n || 0);
  close();
  await saveTitle(id, patch, "追加しました");
  /* TV SPは1話（放送日）を自動で作る */
  if (!n && f.media === "sp" && f.from) {
    const it = items.find(x => x.id === id);
    await saveEps(it, [{ n: "SP", sub: "", t: dayTimeToT(f.from, "9:00"), nt: true, w: false }]);
  }
  if (n) {
    const it = items.find(x => x.id === id);
    const l = [];
    for (let k = 0; k < n; k++) l.push(nextEp(it, l));
    await saveEps(it, l);
  }
}
/* ポップアップ表示中は背景を固定する（iOSでも効くように body を fixed にして位置を保存） */
const TOUCH = matchMedia("(hover:none) and (pointer:coarse)").matches;
let lockY = null;
function lockScroll(on) {
  const b = document.body;
  if (on && lockY === null) {
    lockY = scrollY;
    Object.assign(b.style, { position: "fixed", top: `-${lockY}px`, left: "0", right: "0", width: "100%" });
  } else if (!on && lockY !== null) {
    const y = lockY;
    lockY = null;
    Object.assign(b.style, { position: "", top: "", left: "", right: "", width: "" });
    scrollTo(0, y);
  }
}
new MutationObserver(() => lockScroll(!!$("#layer").firstElementChild)).observe($("#layer"), { childList: true });
/* 作品の追加・編集画面：入力中の内容を読み取ってから変えて、描き直す */
const formEdit = (fn, after) => el => {
  readForm();
  fn(el);
  redrawForm();
  if (after) after();
};
const FORM_ACTIONS = [
  ["[data-fm]", formEdit(el => (form.media = el.dataset.fm))],
  ["[data-fst]", formEdit(el => (form.stations = toggle(form.stations, el.dataset.fst)))],
  ["[data-fplat]", formEdit(el => (form.plat = toggle(form.plat, el.dataset.fplat)))],
  ["[data-fvod]", formEdit(el => (form.vods = toggle(form.vods, el.dataset.fvod)))],
  /* シリーズ：別のジャンルのシリーズからも探す */
  [
    "[data-fserall]",
    () => {
      form.serAll = true;
      const b = $("#fSerSug");
      if (b) b.innerHTML = serSugForm($("#f-serq")?.value || "");
    },
  ],
  ["[data-fser]", formEdit(el => (form.series = el.dataset.fser))],
  ["[data-fserdel]", formEdit(() => (form.series = ""), () => !TOUCH && $("#f-serq")?.focus())],
  [
    "[data-fsernew]",
    formEdit(
      el => {
        form.serNew = el.dataset.fsernew === "1";
        form.serNewName = $("#f-serq")?.value || "";
      },
      () => !TOUCH && $("#f-sernew")?.focus(),
    ),
  ],
  [
    "[data-fsercreate]",
    () => {
      readForm();
      const n = (form.serNewName || "").trim();
      if (!n) return toast("シリーズ名を入れてください");
      form.series = n;
      form.serNew = false;
      /* 新しく作ったシリーズのメインのジャンルは、作った作品のジャンルにする */
      if (!M("series").includes(n)) {
        master = { ...master, seriesMain: { ...(master.seriesMain || {}), [n]: serGroup(form.k) } };
        saveMaster();
      }
      redrawForm();
      toast(`シリーズ「${n}」を作りました`);
    },
  ],
  /* 曲を追加：前の曲の続きの話から最後の話まで */
  [
    "[data-sgadd]",
    formEdit(
      el => {
        const same = form.songs.filter(x => x.type === el.dataset.sgadd);
        const last = same[same.length - 1];
        const sp = form.span || (+form.n ? [1, +form.n] : null);
        const a0 = last && last.b != null && sp && last.b < sp[1] ? last.b + 1 : sp ? sp[0] : null;
        form.songs.push({ type: el.dataset.sgadd, s: "", st: "", ar: "", a: a0, b: sp ? sp[1] : null });
      },
      () => !TOUCH && document.querySelector(`.sg[data-sg="${form.songs.length - 1}"] .sg-qi`)?.focus(),
    ),
  ],
  ["[data-sgdel]", formEdit(el => form.songs.splice(+el.dataset.sgdel, 1))],
  /* ジャンル・ステータス。映画は放送形態も映画に、配信番組は配信に */
  [
    "[data-fk],[data-fs]",
    formEdit(el => {
      if (el.dataset.fk) {
        form.k = el.dataset.fk;
        if (form.k === "f") form.media = "movie";
        if (form.k === "r" && form.media !== "stream") form.media = "stream";
      }
      if (el.dataset.fs) form.s = el.dataset.fs;
    }),
  ],
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
  ["[data-courmore]", formEdit(() => (form.courOpen = !form.courOpen))],
  [
    "[data-couradd]",
    formEdit(el => {
      form.courOpen = true;
      const key = `${form.cy}${el.dataset.couradd}`;
      if (!form.cours.includes(key)) form.cours.push(key);
      form.cours.sort();
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
