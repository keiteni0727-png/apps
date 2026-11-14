/* ===================== 視聴記録：話にチェックを付けた日時（wt）から、今日・週・月に見た話を出す =====================
   「放送済みを全部 ✓」でまとめて付けた話は日時を持たないので出ない。チェックを外すと日時も消える */
const hist = Object.assign({ p: "d", off: 0 }, ls.get("adb.v3.hist") || {}, { off: 0 });
if (!["d", "w", "m"].includes(hist.p)) hist.p = "d";
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
function renderHist() {
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
  const seg = [
    ["d", "今日"],
    ["w", "週"],
    ["m", "月"],
  ]
    .map(([v, l]) => `<button type="button" role="tab" data-hp="${v}" aria-selected="${hist.p === v}">${l}</button>`)
    .join("");
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
    <div class="hseg3" role="tablist" aria-label="期間">${seg}</div>
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
