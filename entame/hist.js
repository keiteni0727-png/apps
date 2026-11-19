/* ===================== 視聴記録：話にチェックを付けた日時（wt）から、今日・週・月に見た話を出す =====================
   「放送済みを全部 ✓」でまとめて付けた話も押した日時で出す（日時に0.5を足して区別し、見る時間帯の集計には入れない）。
   チェックを外すと日時も消える */
const hist = Object.assign({ p: "d", off: 0 }, ls.get("adb.v3.hist") || {}, { off: 0 });
if (!["d", "w", "m", "s"].includes(hist.p)) hist.p = "d";
const saveHist = () => ls.set("adb.v3.hist", { p: hist.p });

/* 見た話をすべて（新しい順） */
function histAll() {
  const out = [];
  for (const it of items) episodes(it).forEach((e, i) => e.w && e.wt && out.push({ it, e, i, wt: e.wt }));
  return out.sort((a, b) => b.wt - a.wt);
}
const dayStart = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const hdk = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dlab = d => `${d.getMonth() + 1}/${d.getDate()}(${DOW[(d.getDay() + 6) % 7]})`;
/* 今の期間の [始まり, 終わり)。週は月曜はじまり */
function histRange() {
  const t = dayStart(new Date());
  if (hist.p === "d") {
    const a = addDays(t, hist.off);
    return [a, addDays(a, 1)];
  }
  if (hist.p === "w") {
    const a = addDays(t, -((t.getDay() + 6) % 7) + hist.off * 7);
    return [a, addDays(a, 7)];
  }
  const a = new Date(t.getFullYear(), t.getMonth() + hist.off, 1);
  return [a, new Date(a.getFullYear(), a.getMonth() + 1, 1)];
}
function histTitle([a, b]) {
  if (hist.p === "d") return hist.off === 0 ? `今日 ${dlab(a)}` : hist.off === -1 ? `昨日 ${dlab(a)}` : dlab(a);
  if (hist.p === "w") return `${hist.off === 0 ? "今週 " : ""}${dlab(a)}〜${dlab(addDays(b, -1))}`;
  return `${a.getFullYear() !== new Date().getFullYear() ? a.getFullYear() + "年" : ""}${a.getMonth() + 1}月${hist.off === 0 ? "（今月）" : ""}`;
}
/* 1日分を作品ごとにまとめた行。話は番号順に、続いていれば「3話〜5話」 */
function histRows(list) {
  const by = new Map();
  list.forEach(x => {
    const g = by.get(x.it.id) || { it: x.it, l: [], last: 0 };
    g.l.push(x);
    g.last = Math.max(g.last, x.wt);
    by.set(x.it.id, g);
  });
  return [...by.values()]
    .sort((a, b) => b.last - a.last)
    .map(g => {
      const l = g.l.sort((a, b) => a.i - b.i);
      const nums = l.map(x => epNum(x.e.n));
      const seq = nums.every((n, k) => n != null && (k === 0 || n === nums[k - 1] + 1));
      const A = g.it.k === "a";
      const eps =
        l.length === 1
          ? `<span class="hn">${esc(l[0].e.n)}</span>${A && l[0].e.sub ? `<span class="hsb">${esc(l[0].e.sub)}</span>` : ""}`
          : `<span class="hn">${seq ? `${esc(l[0].e.n)}〜${esc(l[l.length - 1].e.n)}` : l.map(x => esc(x.e.n)).join("・")}</span>`;
      const tm = new Date(g.last);
      return `<button type="button" class="hrow" data-id="${esc(g.it.id)}"><span class="hk">${kindTag(g.it)}</span><span class="hm"><b class="ht">${esc(g.it.t)}</b><span class="he">${eps}</span></span><span class="hr">${l.length > 1 ? `<b class="hc">${l.length}話</b>` : ""}<small>${tm.getHours()}:${String(tm.getMinutes()).padStart(2, "0")}</small></span></button>`;
    })
    .join("");
}
/* ---------- 集計（1年ごと）：月ごとの推移・種別の内訳・よく見た作品・見る時間帯 ---------- */
const KIND_VAR = { a: "--anime", d: "--drama", f: "--movie", r: "--stream" };
/* 時間帯（深夜0〜5時は前の日の夜ふかしとして前の日に数える） */
const BANDS = [
  ["朝", 5, 11],
  ["昼", 11, 17],
  ["夜", 17, 22],
  ["深夜", 22, 29],
];
function bandOf(d) {
  let h = d.getHours(),
    dow = (d.getDay() + 6) % 7;
  if (h < 5) {
    h += 24;
    dow = (dow + 6) % 7;
  }
  return [dow, BANDS.findIndex(([, a, b]) => h >= a && h < b)];
}
function renderStats(all) {
  const y = new Date().getFullYear() + hist.off;
  const inY = all.filter(x => new Date(x.wt).getFullYear() === y);
  const nowY = hist.off === 0;
  const head = `<div class="hnav"><button type="button" data-hnav="-1" aria-label="前の年">‹</button><b>${y}年${nowY ? "（今年）" : ""}</b><button type="button" data-hnav="1" aria-label="次の年" ${nowY ? "disabled" : ""}>›</button></div>`;
  if (!inY.length)
    return `${head}<p class="empty">${y}年に見た話はありません。<br><small>話にチェックを付けると、ここに記録されます（まとめてチェックした話は除く）</small></p>`;
  /* 月ごと */
  const mon = Array(12).fill(0);
  inY.forEach(x => mon[new Date(x.wt).getMonth()]++);
  const mMax = Math.max(1, ...mon),
    best = mon.indexOf(Math.max(...mon)),
    curM = nowY ? new Date().getMonth() : -1;
  const bars = `<div class="hbars y" role="list">${mon
    .map(
      (n, m) =>
        `<button type="button" class="hb${n ? "" : " z"}${m === curM ? " td" : ""}" role="listitem" data-hmon="${m}" ${nowY && m > curM ? "disabled" : ""} aria-label="${m + 1}月 ${n}話"><span class="hbn">${n || ""}</span><span class="hbt"><i style="height:${(n / mMax) * 100}%"></i></span><span class="hbl">${m + 1}</span></button>`,
    )
    .join("")}</div>`;
  /* 種別の内訳 */
  const kc = {};
  inY.forEach(x => (kc[x.it.k] = (kc[x.it.k] || 0) + 1));
  const kinds = Object.entries(kc).sort((a, b) => b[1] - a[1]);
  const kHtml = kinds
    .map(([k, n]) => {
      const p = Math.round((n / inY.length) * 100);
      return `<div class="skr"><span class="kind ${esc(k)}">${KIND_LAB[k] || "ドラマ"}</span><span class="skb"><i style="width:${p}%;background:var(${KIND_VAR[k] || "--drama"})"></i></span><span class="skn"><b>${n}</b>話<small>${p}%</small></span></div>`;
    })
    .join("");
  /* よく見た作品 */
  const wc = new Map();
  inY.forEach(x => {
    const g = wc.get(x.it.id) || { it: x.it, n: 0 };
    g.n++;
    wc.set(x.it.id, g);
  });
  const top = [...wc.values()].sort((a, b) => b.n - a.n || String(a.it.t).localeCompare(String(b.it.t), "ja")).slice(0, 5);
  const tHtml = top
    .map(
      (g, k) =>
        `<button type="button" class="hrow srank" data-id="${esc(g.it.id)}"><span class="srk">${k + 1}</span><span class="hm"><b class="ht">${esc(g.it.t)}</b><span class="he">${kindTag(g.it)}</span></span><span class="hr"><b class="hc">${g.n}話</b></span></button>`,
    )
    .join("");
  /* 見る時間帯（曜日×時間帯） */
  const grid = DOW.map(() => BANDS.map(() => 0));
  inY.filter(x => Number.isInteger(x.wt)).forEach(x => {
    const [d, b] = bandOf(new Date(x.wt));
    if (b >= 0) grid[d][b]++;
  });
  const gMax = Math.max(1, ...grid.flat());
  let pk = [0, 0];
  grid.forEach((r, d) => r.forEach((n, b) => n > grid[pk[0]][pk[1]] && (pk = [d, b])));
  const heat = `<div class="sheat" role="table" aria-label="曜日と時間帯ごとの話数"><span></span>${BANDS.map(([l]) => `<span class="shh" role="columnheader">${l}</span>`).join("")}${DOW.map(
    (dl, d) =>
      `<span class="shd" role="rowheader">${dl}</span>${grid[d]
        .map(n => `<span class="shc${n ? "" : " z"}" role="cell" style="--a:${n ? 0.15 + (n / gMax) * 0.85 : 0}" title="${dl}曜 ${n}話">${n || ""}</span>`)
        .join("")}`,
  ).join("")}</div>`;
  const card = (t, sub, body) => `<section class="scard"><h3 class="sch">${t}${sub ? `<small>${sub}</small>` : ""}</h3>${body}</section>`;
  return `${head}
    <div class="hsum"><div><b>${inY.length}</b><span>話</span></div><div><b>${wc.size}</b><span>作品</span></div></div>
    ${card("月ごとの話数", `いちばん見た月：${best + 1}月（${mon[best]}話）`, bars)}
    ${card("種別の内訳", "", `<div class="skind">${kHtml}</div>`)}
    ${card("よく見た作品", "上位5作品", `<div class="hlist">${tHtml}</div>`)}
    ${card("見る時間帯", `いちばん多いのは ${DOW[pk[0]]}曜の${BANDS[pk[1]][0]}`, heat + `<p class="shint">朝 5〜11時・昼 11〜17時・夜 17〜22時・深夜 22〜翌5時</p>`)}`;
}
function renderHist() {
  const seg = [
    ["d", "今日"],
    ["w", "週"],
    ["m", "月"],
    ["s", "集計"],
  ]
    .map(([v, l]) => `<button type="button" role="tab" data-hp="${v}" aria-selected="${hist.p === v}">${l}</button>`)
    .join("");
  if (hist.p === "s") return `<div class="hist"><div class="hseg3 s4" role="tablist" aria-label="期間">${seg}</div>${renderStats(histAll())}</div>`;
  const rg = histRange();
  const [a, b] = rg;
  const all = histAll();
  const inR = all.filter(x => x.wt >= a.getTime() && x.wt < b.getTime());
  const nWorks = new Set(inR.map(x => x.it.id)).size;
  /* 日ごとに分ける */
  const byDay = new Map();
  inR.forEach(x => {
    const k = hdk(new Date(x.wt));
    byDay.set(k, [...(byDay.get(k) || []), x]);
  });
  /* 週・月：日ごとの棒グラフ。押すとその日の一覧へ */
  let bars = "";
  if (hist.p !== "d") {
    const days = [];
    for (let d = a; d < b; d = addDays(d, 1)) days.push(d);
    const max = Math.max(1, ...days.map(d => (byDay.get(hdk(d)) || []).length));
    const today = hdk(new Date());
    bars = `<div class="hbars ${hist.p}" role="list">${days
      .map((d, k) => {
        const n = (byDay.get(hdk(d)) || []).length;
        const lab = hist.p === "w" ? DOW[k] : d.getDate() === 1 || d.getDate() % 5 === 0 ? d.getDate() : "";
        const fut = d.getTime() > Date.now();
        return `<button type="button" class="hb${n ? "" : " z"}${hdk(d) === today ? " td" : ""}" role="listitem" data-hday="${hdk(d)}" ${fut ? "disabled" : ""} aria-label="${dlab(d)} ${n}話"><span class="hbn">${n || ""}</span><span class="hbt"><i style="height:${(n / max) * 100}%"></i></span><span class="hbl">${lab}</span></button>`;
      })
      .join("")}</div>`;
  }
  const list = [...byDay.entries()]
    .map(([k, l]) => {
      const d = new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
      return `<section class="hday">${hist.p === "d" ? "" : `<h3 class="hdh">${dlab(d)}<small>${l.length}話</small></h3>`}<div class="hlist">${histRows(l)}</div></section>`;
    })
    .join("");
  const empty = `<p class="empty">${hist.p === "d" && hist.off === 0 ? "今日見た話はまだありません。" : "この期間に見た話はありません。"}<br><small>話にチェックを付けると、ここに記録されます（まとめてチェックした話は除く）</small></p>`;
  return `<div class="hist">
    <div class="hseg3 s4" role="tablist" aria-label="期間">${seg}</div>
    <div class="hnav"><button type="button" data-hnav="-1" aria-label="前へ">‹</button><b>${histTitle(rg)}</b><button type="button" data-hnav="1" aria-label="次へ" ${hist.off >= 0 ? "disabled" : ""}>›</button></div>
    <div class="hsum"><div><b>${inR.length}</b><span>話</span></div><div><b>${nWorks}</b><span>作品</span></div></div>
    ${bars}
    ${inR.length ? list : empty}
  </div>`;
}
const HIST_ACTIONS = [
  [
    "[data-hp]",
    el => {
      if (hist.p === el.dataset.hp && hist.off === 0) return;
      hist.p = el.dataset.hp;
      hist.off = 0;
      saveHist();
      go();
    },
  ],
  [
    "[data-hnav]",
    el => {
      hist.off = Math.min(0, hist.off + +el.dataset.hnav);
      render();
    },
  ],
  /* 集計の月の棒を押したら、その月へ */
  [
    "[data-hmon]",
    el => {
      const now = new Date(),
        y = now.getFullYear() + hist.off;
      hist.p = "m";
      hist.off = (y - now.getFullYear()) * 12 + (+el.dataset.hmon - now.getMonth());
      saveHist();
      go();
    },
  ],
  /* 棒を押したら、その日の一覧へ */
  [
    "[data-hday]",
    el => {
      const k = el.dataset.hday;
      const d = new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
      hist.p = "d";
      hist.off = Math.round((d - dayStart(new Date())) / 86400e3);
      saveHist();
      go();
    },
  ],
];
