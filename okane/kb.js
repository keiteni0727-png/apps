/* ===================== 定数 ===================== */
/* ---------- 分類・支払い方法の初期値（マスタが無いときに使う）と色・アイコン ---------- */
const CATS = ["食費", "外食", "日用品", "交通費", "光熱費", "通信費", "サブスク", "娯楽", "美容/衣服", "医療費"];
const METHODS = ["クレカ", "電子マネー", "現金"];
const CH = { 食費: 130, 外食: 8, 日用品: 205, 交通費: 190, 光熱費: 50, 通信費: 262, サブスク: 245, 娯楽: 280, "美容/衣服": 350, 医療費: 100, クレカ: 225, 電子マネー: 355, 現金: 140, 不明: -1, その他: -1 };
const EMO = { 食費: "🛒", 外食: "🍜", 日用品: "🧴", 交通費: "🚃", 光熱費: "💡", 通信費: "📱", サブスク: "📺", 娯楽: "🎮", "美容/衣服": "👕", 医療費: "💊", クレカ: "💳", 電子マネー: "📲", 現金: "💴", 不明: "❔", その他: "…" };
const CHS = {};

/* ---------- 端末内の保存キー（localStorage） ---------- */
const KEY = "kakeibo.v1", // 明細
  KEY_BAK = KEY + ".bak"; // 明細の予備（明細が空になったときに使う）
const KR = "kakeibo.rules.v1"; // 分類ルール
const KMS = "kakeibo.master.v1"; // マスタ
const KB = "kakeibo.backup.v1"; // 取り消し用の直前の状態
const KNOWN = "kakeibo.known.v2"; // クラウドにあると分かっている月（他の端末で消された月を見分ける）
const KTAB = "kakeibo.tab"; // 最後に開いた画面（文字列のまま保存）
const KAN = "okane.an"; // 分析の中で最後に開いた画面
const KSBC = "okane.sbc"; // PC の左メニューを折りたたんでいるか
const KANF = "okane.anfold"; // 左メニューの「分析」の項目をたたんでいるか
const AN = ["graph", "balance"]; // 分析にまとめた画面

/* ---------- 決まった数字 ---------- */
const TOMB_LIMIT = 40; // 月の文書の削除の印がこれを超えたら、丸ごと書き直す
const MEMO_CHIPS = 8, // 入力欄の上に並べる直近のメモの数
  MEMO_LIST = 60; // 入力候補（datalist）に入れるメモの数

/* ===================== 小さな関数 ===================== */
const $ = id => document.getElementById(id);
const yen = n => "¥" + Number(n || 0).toLocaleString("ja-JP");
const today = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};
const thisPeriod = () => FIN.currentPeriod(); // いまの月度
const inPeriod = (d, p) => FIN.inPeriod(d, p);
const md = d => `${+d.slice(5, 7)}/${+d.slice(8)}`;
const esc = U.esc;
const opts = (arr, v) => arr.map(x => `<option${x === v ? " selected" : ""}>${esc(x)}</option>`).join("");
/* アイコンつきの選択肢。first は先頭の空の選択肢（「すべての分類」など） */
function iconOpts(list, selected, first) {
  const head = first != null ? `<option value="">${first}</option>` : "";
  return (
    head +
    list.map(x => `<option value="${esc(x)}"${x === selected ? " selected" : ""}>${emo(x)} ${esc(x)}</option>`).join("")
  );
}
/* 切り替えボタンのうち、data-<key> が value のものだけを「選択中」にする */
function markCurrent(selector, key, value) {
  document
    .querySelectorAll(selector)
    .forEach(b =>
      b.dataset[key] === value ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"),
    );
}
const uid = () => Math.random().toString(36).slice(2, 10);
const sumOf = a => a.reduce((s, i) => s + i.amount, 0);
function shiftM(m, n) {
  const [y, mm] = m.split("-").map(Number);
  const d = new Date(y, mm - 1 + n, 1);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function dcls(d) {
  return d > 0 ? "up" : d < 0 ? "dn" : "eq";
}
function dstr(d, b) {
  return (
    (d > 0 ? "▲" : d < 0 ? "▼" : "±") +
    yen(Math.abs(d)) +
    (d && b ? "（" + (d > 0 ? "+" : "-") + Math.round((Math.abs(d) / b) * 100) + "%）" : "")
  );
}
const dow = d => new Date(d + "T00:00:00").getDay();
const short = v => (v >= 10000 ? (v / 10000).toFixed(v >= 100000 ? 0 : 1) + "万" : yen(v));
const isWide = () => window.matchMedia("(min-width:900px)").matches;
const norm = s =>
  String(s || "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLowerCase();
const nn = v => (v === "" || v == null || isNaN(Number(v)) ? null : Math.round(Number(v)));
const cj = v =>
  JSON.stringify(v, (k, x) =>
    x && typeof x === "object" && !Array.isArray(x)
      ? Object.keys(x)
          .sort()
          .reduce((o, y) => ((o[y] = x[y]), o), {})
      : x,
  );
const inM = m => items.filter(i => i.date.startsWith(m));
const mapOf = arr => Object.fromEntries(arr.map(i => [i.id, cj(i)]));

/* ---------- 端末内の保存の読み書き（使えない環境でも止まらないように） ---------- */
function lsRaw(k) {
  try {
    return localStorage.getItem(k);
  } catch (e) {
    return null;
  }
}
function lsGet(k, fallback) {
  try {
    const s = localStorage.getItem(k);
    return s === null ? fallback : JSON.parse(s);
  } catch (e) {
    return fallback;
  }
}
function lsSet(k, v, raw) {
  try {
    localStorage.setItem(k, raw ? v : JSON.stringify(v));
    return true;
  } catch (e) {
    return false;
  }
}
function lsDel(k) {
  try {
    localStorage.removeItem(k);
  } catch (e) {}
}

/* ---------- 色・アイコン・ラベル ---------- */
function hashHue(n) {
  let h = 0;
  for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
function mFind(n) {
  if (!MASTER) return null;
  return MASTER.cats.find(x => x.n === n) || MASTER.mets.find(x => x.n === n) || null;
}
function hue(n) {
  const m = mFind(n);
  if (m && typeof m.h === "number") return m.h;
  if (n in CH) return CH[n];
  return hashHue(n);
}
function satOf(n) {
  const m = mFind(n);
  if (m && typeof m.s === "number") return m.s;
  return n in CHS ? CHS[n] : null;
}
function hs(n) {
  const h = hue(n),
    st = satOf(n);
  return `--h:${h < 0 ? 0 : h};${h < 0 ? "--s:8%;" : st != null ? `--s:${st}%;` : ""}`;
}
const emo = n => {
  const m = mFind(n);
  return (m && m.e) || EMO[n] || "🏷️";
};
function chip(n, e) {
  return `<span class="chip${e ? " out" : ""}" style="${hs(n)}">${e ? emo(n) + " " : ""}${esc(n)}</span>`;
}
const mchip = n => chip(n, 1);
function ico(n, sm) {
  return `<span class="ico${sm ? " sm" : ""}" style="${hs(n)}" aria-hidden="true">${emo(n)}</span>`;
}
function bcol(n) {
  const h = hue(n),
    st = satOf(n);
  return h < 0 ? "hsl(220 8% 58%)" : st != null ? `hsl(${h} ${st + 10}% 40%)` : `hsl(${h} 65% 52%)`;
}

/* ===================== 状態 ===================== */
/* データ（クラウドと端末に保存するもの） */
let items = []; // 明細 {id, date, amount, category, method, memo, ruled?}
let rules = []; // 分類ルール
let MASTER = null; // 分類・支払い方法のマスタ {cats:[{n,e,h,s?}], mets:[...]}
let restored = 0; // 起動時に予備から復元した件数

/* 画面全体 */
const view = {
  tab: "list", // list / graph / rules（スマホの設定画面）
  prevTab: "list", // 設定を閉じたときに戻る画面
  armed: null, // 「2回押す」削除で、1回押されて待っているもの
};
/* 表示中の月度 "YYYY-MM"（支払いの画面と共通。保存は暦の月ごとのまま） */
Object.defineProperty(view, "month", { get: () => FIN.period, set: v => (FIN.period = v) });
/* 明細画面 */
const ledger = {
  filter: { q: "", c: "", m: "" }, // 検索・分類・支払い方法の絞り込み
  shown: [], // 絞り込み後に一覧に出ている明細
  sel: new Set(), // チェックした明細のID
  editId: null, // その場で編集中の明細のID
  draft: null, // 編集中の内容
  dayAdd: null, // 日付の行の＋で開いた入力欄 {date, draft}
};
/* 日ごとの折りたたみ（この端末に覚える）。たたんでいる日付の一覧 */
const KDF = "okane.dayfold";
const dayFold = new Set(lsGet(KDF, []) || []);
function saveDayFold() {
  lsSet(KDF, [...dayFold].sort().slice(-400));
}
/* グラフ画面 */
const graph = { by: "category", per: "3", sel: "", m: "" }; // 集計の単位・期間・絞り込んだ項目・選んだ月/日
/* 設定 */
const setting = {
  tab: "home", // 設定の画面 home（一覧）/ rules / cats / mets / inc / paym / gen
  kind: "cats", // マスタの種類 cats / mets
  merge: null, // マスタの統合の確認 {kind, old, nn}
  preview: null, // 既存データへの適用の対象一覧 {rid, rows, off}
  editRule: null, // 編集中のルールのID
  edit: { rules: false, master: false, paym: false }, // 右上の「編集」を押しているか（行ごとの変更・削除を出す）
};

/* ===================== 保存と同期 ===================== */
/* ---------- 端末内の控え ---------- */
function load() {
  items = lsGet(KEY, []);
  if (!Array.isArray(items)) items = [];
  if (!items.length) {
    const b = lsGet(KEY_BAK, []);
    if (Array.isArray(b) && b.length) {
      items = b;
      lsSet(KEY, b);
      restored = b.length;
    }
  }
}
function saveLocal() {
  const ok = lsSet(KEY, items) && (!items.length || lsSet(KEY_BAK, items));
  if (!ok) setMsg("この端末への保存に失敗しました。", 1);
}
function save() {
  saveLocal();
  queuePush();
}
function saveMasterLocal() {
  lsSet(KMS, MASTER);
}
function saveMaster() {
  saveMasterLocal();
  queuePush();
}
function saveRulesLocal() {
  lsSet(KR, rules);
}
function saveRules() {
  saveRulesLocal();
  queuePush();
}
/* 取り消し用に、変更前の明細を控える */
function snap() {
  lsSet(KB, items);
}

/* ---------- マスタ・ルールの形をそろえる ---------- */
const mkE = n => {
  const o = { n, e: EMO[n] || "🏷️", h: n in CH ? CH[n] : hashHue(n) };
  if (n in CHS) o.s = CHS[n];
  return o;
};
function normMaster(m) {
  const f = a =>
    (Array.isArray(a) ? a : [])
      .filter(x => x && typeof x.n === "string" && x.n.trim())
      .map(x => {
        const o = {
          n: x.n,
          e: String(x.e || "🏷️"),
          h: typeof x.h === "number" ? x.h : x.n in CH ? CH[x.n] : hashHue(x.n),
        };
        const st = typeof x.s === "number" ? x.s : x.n in CHS ? CHS[x.n] : null;
        if (st != null) o.s = st;
        return o;
      });
  const o = { cats: f(m && m.cats), mets: f(m && m.mets) };
  if (!o.cats.length) o.cats = CATS.map(mkE);
  if (!o.mets.length) o.mets = METHODS.map(mkE);
  return o;
}
function applyMaster() {
  CATS.splice(0, CATS.length, ...MASTER.cats.map(x => x.n));
  METHODS.splice(0, METHODS.length, ...MASTER.mets.map(x => x.n));
}
function learn(i) {
  let ch = false;
  if (i.category && !CATS.includes(i.category)) {
    MASTER.cats.push(mkE(i.category));
    ch = true;
  }
  if (i.method && !METHODS.includes(i.method)) {
    MASTER.mets.push(mkE(i.method));
    ch = true;
  }
  if (ch) {
    applyMaster();
    saveMasterLocal();
  }
}
function normRule(r) {
  if (!r || typeof r !== "object") return null;
  const auto = r.auto !== false;
  if (r.kind === "memo")
    return {
      id: r.id,
      kind: "set",
      kw: r.kw || "",
      mode: "contains",
      cat: "",
      met: "",
      min: null,
      max: null,
      set: { memo: "", category: r.to || "", method: "" },
      auto,
    };
  if (r.kind === "set")
    return {
      id: r.id,
      kind: "set",
      kw: r.kw || "",
      mode: r.mode || "contains",
      cat: r.cat || "",
      met: r.met || "",
      min: nn(r.min),
      max: nn(r.max),
      set: {
        memo: (r.set && r.set.memo) || "",
        category: (r.set && r.set.category) || "",
        method: (r.set && r.set.method) || "",
      },
      auto,
    };
  return { id: r.id, kind: "split", from: r.from, amt: Number(r.amt) || 0, to: r.to, max: Number(r.max) || 1, auto };
}

/* ---------- クラウドとの同期（リアルタイム）
  ・クラウドのデータを正とし、変更はすぐ保存。他の端末には onSnapshot でその場で届く
  ・保存先 data/users/<id>/ の文書: m-YYYY-MM（その月の明細）, rules（分類ルール）, master（分類・支払い方法のマスタ）
  ・月の文書は {v:2, items:{明細ID: 明細 | null}}。明細ごとに update で書くので、
    2台で同じ月の別の明細を同時に編集しても消し合わない（null は削除の印）。旧形式 {items:[...]} も読める
  ・端末内の保存（localStorage）は、開いた直後と接続できないときの表示用の控え */
/* 保存中・未保存・自動での保存し直し・読み込みのつなぎ直しは、共通の U.sync（u-core.js）が行う。
   クラウドから届く内容には、自分がまだ送信中の変更も入っている（Firebase がそうしてくれる）ので、そのまま反映してよい */
let col = null, // data/users/<id> のコレクション
  live = false; // 最初の読み込みが終わった
let shown = {}, // shown[月] = {明細ID: 内容}：クラウドにある（または送信済みの）内容
  fmt2 = {}, // その月の文書が新形式か
  tomb = {}, // その月の文書にある削除の印の数
  rShown = null, // クラウドにあるルール・マスタ（比べて、違うときだけ送る）
  mShown = null;
function saveKnown() {
  lsSet(KNOWN, Object.keys(shown));
}
const write = fn =>
  fn().catch(e => {
    if (!["unavailable", "deadline-exceeded", "aborted", "internal", "unknown", "cancelled"].includes(e?.code))
      toast(`保存できませんでした（${e?.code || "error"}）。開き直してからもう一度お試しください`);
  });
function pushMonth(m) {
  const cur = mapOf(inM(m)),
    prev = shown[m],
    key = "m-" + m;
  const ids = new Set([...Object.keys(cur), ...Object.keys(prev || {})]);
  const diff = {};
  ids.forEach(id => {
    if (cur[id] !== (prev || {})[id]) diff[id] = cur[id] ? JSON.parse(cur[id]) : null;
  });
  if (prev && !Object.keys(diff).length) return;
  if (!Object.keys(cur).length) {
    if (!prev) return;
    delete shown[m];
    write(() => col.doc(key).delete());
    return;
  }
  shown[m] = cur;
  if (!prev || !fmt2[m] || (tomb[m] || 0) > TOMB_LIMIT) {
    // 文書がない・旧形式・削除の印が多い → 丸ごと書き直す
    fmt2[m] = true;
    tomb[m] = 0;
    const all = Object.fromEntries(Object.entries(cur).map(([id, j]) => [id, JSON.parse(j)]));
    write(() => col.doc(key).set({ v: 2, items: all }));
  } else write(() => col.doc(key).update({ items: diff }));
}
function queuePush() {
  // 変更のたびに呼ぶ。クラウドと違うところだけ送る
  if (!live) return;
  new Set([...items.map(i => i.date.slice(0, 7)), ...Object.keys(shown)]).forEach(pushMonth);
  saveKnown();
  const rj = cj(rules);
  if (rj !== rShown) {
    rShown = rj;
    const d = JSON.parse(rj);
    write(() => col.doc("rules").set({ rules: d }));
  }
  const mjs = cj(MASTER);
  if (mjs !== mShown) {
    mShown = mjs;
    const d = JSON.parse(mjs);
    write(() => col.doc("master").set({ master: d }));
  }
}
function applyMonth(m, x, doRender) {
  // クラウドの月の内容を画面に反映
  let arr = [];
  fmt2[m] = false;
  tomb[m] = 0;
  if (x && Array.isArray(x.items)) arr = x.items;
  else if (x && x.items && typeof x.items === "object") {
    fmt2[m] = true;
    const v = Object.values(x.items);
    arr = v.filter(Boolean);
    tomb[m] = v.length - arr.length;
  }
  if (arr.length) shown[m] = mapOf(arr);
  else delete shown[m];
  if (cj(mapOf(arr)) === cj(mapOf(inM(m)))) return false;
  items = items.filter(i => !i.date.startsWith(m)).concat(arr);
  if (doRender) {
    saveLocal();
    items.forEach(learn);
    render();
  }
  return true;
}
async function initSync() {
  try {
    const { db: d, uid: id } = await U.store();
    if (!d || !id) throw 0;
    col = d.collection("data/users/" + id);
    col.onSnapshot(onRemote);
  } catch (e) {}
}
function onRemote(snap) {
  let changed = false,
    rr = null,
    mr = null;
  const remote = {};
  snap.docs.forEach(d => {
    const x = d.data() || {};
    if (d.id === "rules") {
      if (Array.isArray(x.rules)) rr = x.rules;
    } else if (d.id === "master") {
      if (x.master && Array.isArray(x.master.cats)) mr = x.master;
    } else if (d.id.startsWith("m-")) remote[d.id.slice(2)] = x;
  });
  const known = live ? [] : lsGet(KNOWN, []); // 前回までにクラウドにあった月
  new Set([...Object.keys(remote), ...Object.keys(shown), ...(live ? [] : known)]).forEach(m => {
    if (applyMonth(m, remote[m] || null, false)) changed = true;
  });
  if (rr) {
    rShown = cj(rr);
    const nr = rr.map(normRule).filter(Boolean);
    if (cj(nr) !== cj(rules)) {
      rules = nr;
      changed = true;
    }
  }
  if (mr) {
    mShown = cj(mr);
    if (cj(mr) !== cj(MASTER)) {
      MASTER = normMaster(mr);
      applyMaster();
      changed = true;
    }
  }
  if (changed) {
    saveLocal();
    saveRulesLocal();
    saveMasterLocal();
    items.forEach(learn);
    render();
  }
  saveKnown();
  if (!live) {
    // 最初の読み込みが終わったら、端末にしかない月・ルール・マスタを送る
    live = true;
    queuePush();
  }
}

/* ===================== ルールと集計（計算だけ。画面は変えない） ===================== */
/* ---------- 分類ルール ---------- */
function kwHit(it, r) {
  const kws = String(r.kw || "")
    .split(/[,、，]/)
    .map(norm)
    .filter(Boolean);
  if (!kws.length) return true;
  const m = norm(it.memo);
  return kws.some(k => (r.mode === "exact" ? m === k : r.mode === "prefix" ? m.startsWith(k) : m.includes(k)));
}
function applyRule(it, r) {
  if (r.kind === "set") {
    if (!kwHit(it, r)) return null;
    if (r.cat && it.category !== r.cat) return null;
    if (r.met && it.method !== r.met) return null;
    if (r.min != null && it.amount < r.min) return null;
    if (r.max != null && it.amount > r.max) return null;
    const x = { ...it };
    if (r.set.memo) x.memo = r.set.memo;
    if (r.set.category) x.category = r.set.category;
    if (r.set.method) x.method = r.set.method;
    return x.memo === it.memo && x.category === it.category && x.method === it.method ? null : [x];
  }
  if (it.category !== r.from || (it.ruled || []).includes(r.id) || it.amount < r.amt || !(r.amt > 0)) return null;
  const n = Math.min(Math.floor(it.amount / r.amt), r.max || 1),
    mv = n * r.amt,
    rem = it.amount - mv,
    ru = [...(it.ruled || []), r.id];
  if (rem <= 0) return [{ ...it, category: r.to, ruled: ru }];
  return [
    { ...it, amount: rem, ruled: ru },
    { ...it, id: it.id + "-" + r.id, amount: mv, category: r.to, memo: r.to, ruled: ru },
  ];
}
function runRules(list) {
  let out = list,
    changed = 0;
  const act = rules.filter(r => r.auto !== false);
  [...act.filter(r => r.kind === "set"), ...act.filter(r => r.kind === "split")].forEach(r => {
    out = out.flatMap(it => {
      const x = applyRule(it, r);
      if (x) {
        changed++;
        return x;
      }
      return [it];
    });
  });
  return { out, changed };
}
function kindOf(r) {
  if (r.kind === "split") return ["split", "分割"];
  if (r.set.memo) return ["name", "名称統合"];
  return ["", "分類・支払い変更"];
}
function descRule(r) {
  if (r.kind === "split")
    return `<q>${esc(r.from)}</q>の明細が${yen(r.amt)}以上なら、${yen(r.amt)}を<q>${esc(r.to)}</q>に分ける（最大${r.max}個、残りは元の分類）`;
  const c = [];
  if (r.kw)
    c.push(
      `メモが<q>${esc(r.kw)}</q>${r.mode === "exact" ? "と完全に一致" : r.mode === "prefix" ? "で始まる" : "を含む"}`,
    );
  if (r.cat) c.push(`分類が<q>${esc(r.cat)}</q>`);
  if (r.met) c.push(`支払い方法が<q>${esc(r.met)}</q>`);
  if (r.min != null) c.push(`${yen(r.min)}以上`);
  if (r.max != null) c.push(`${yen(r.max)}以下`);
  const a = [];
  if (r.set.memo) a.push(`メモを<q>${esc(r.set.memo)}</q>`);
  if (r.set.category) a.push(`分類を<q>${esc(r.set.category)}</q>`);
  if (r.set.method) a.push(`支払い方法を<q>${esc(r.set.method)}</q>`);
  return c.join("、") + " → " + a.join("、") + "に変更";
}

/* ---------- グラフの集計 ---------- */
function periodMonths() {
  if (graph.per === "cur") return [view.month];
  const ym = items.map(i => FIN.periodOf(i.date)).sort(),
    firstM = ym[0] || view.month,
    end = view.month;
  let start = graph.per === "all" ? firstM : shiftM(end, -(Number(graph.per) - 1));
  if (start < firstM) start = firstM;
  if (start > end) start = end;
  const out = [];
  for (let m = start; m <= end; m = shiftM(m, 1)) out.push(m);
  return out;
}
/* 月度の1日目からの累計 */
function cumDays(arr, p) {
  const dim = FIN.periodDays(p),
    d = new Array(dim).fill(0);
  arr.forEach(i => {
    const k = FIN.dayIndex(i.date, p);
    if (k >= 0 && k < dim) d[k] += i.amount;
  });
  let c = 0;
  return d.map(v => (c += v));
}
/* グラフ画面で使う数字をまとめて計算する（絞り込みが期間外になったら外す） */
function graphData() {
  const cur = graph.per === "cur",
    ms = periodMonths(),
    set = new Set(ms),
    n = ms.length,
    key = i => (graph.by === "method" ? i.method : i.category);
  const inP = items.filter(i => set.has(FIN.periodOf(i.date))),
    sum = {};
  inP.forEach(i => {
    const k = key(i);
    sum[k] = (sum[k] || 0) + i.amount;
  });
  const rows = Object.entries(sum).sort((a, b) => b[1] - a[1]),
    names = rows.map(r => r[0]);
  if (graph.sel && !names.includes(graph.sel)) graph.sel = "";
  if (graph.m && !(graph.m.length === 7 ? set.has(graph.m) : set.has(FIN.periodOf(graph.m)))) graph.m = "";
  const sel = graph.sel,
    pm = shiftM(view.month, -1),
    match = i => !sel || key(i) === sel;
  const base = inP.filter(match),
    tot = sumOf(base);
  const curI = items.filter(i => inPeriod(i.date, view.month) && match(i)),
    prevI = items.filter(i => inPeriod(i.date, pm) && match(i));
  const ck = {}, // 当月・前月の項目ごとの合計
    pk = {};
  items.forEach(i => {
    const m = FIN.periodOf(i.date),
      k = key(i);
    if (m === view.month) ck[k] = (ck[k] || 0) + i.amount;
    else if (m === pm) pk[k] = (pk[k] || 0) + i.amount;
  });
  return {
    cur, // 期間が「当月」
    ms, // 期間の月
    n,
    key,
    rows, // [項目, 期間の合計]（多い順）
    names,
    sel,
    base, // 期間内で、絞り込んだ項目の明細
    tot,
    avg: tot / n,
    curI,
    prevI,
    cv: sumOf(curI),
    pv: sumOf(prevI),
    ck,
    pk,
    pm,
    cm: +view.month.slice(5),
    pmn: +pm.slice(5),
    color: sel ? bcol(sel) : "var(--u-accent)", // 線・棒の色
  };
}

/* ---------- メモ候補 ---------- */
function recentMemos(cat, n) {
  const seen = new Set(),
    out = [],
    arr = items.filter(i => i.memo && !/\(自動分割\)/.test(i.memo)).sort((a, b) => b.date.localeCompare(a.date));
  const pass = f => {
    for (const i of arr) {
      if (out.length >= n) break;
      if (seen.has(i.memo) || !f(i)) continue;
      seen.add(i.memo);
      out.push(i.memo);
    }
  };
  if (cat) pass(i => i.category === cat);
  pass(() => true);
  return out;
}
/* ===================== 描画 ===================== */
/* ---------- 画面の切り替え ---------- */
let prevPay = false;
function setTab(t) {
  if (t === "an") t = AN.includes(lsRaw(KAN)) ? lsRaw(KAN) : "graph"; // 分析は前回の画面を開く
  if (t === "rules") {
    openRules();
    return;
  }
  closePanels();
  if (t === "rules" && view.tab !== "rules") view.prevTab = view.tab;
  view.tab = t;
  document.body.dataset.tab = t;
  markTabs(t);
  gearPressed(String(t === "rules"));
  if (t === "rules") renderRules();
  else lsSet(KTAB, t, true);
  if (AN.includes(t)) lsSet(KAN, t, true);
  const wasPay = prevPay;
  prevPay = t === "home" || t === "balance";
  if (prevPay && !wasPay && FIN.pay.enter) FIN.pay.enter();
  FIN.pay.show && FIN.pay.show(t === "home" || t === "balance" ? t : "none");
  if ($("month")) renderMonthBar();
}
/* 下のメニュー・左メニュー・分析の切り替えで、いまの画面に印をつける（分析の3画面では「分析」にも） */
function markTabs(t) {
  markCurrent(".tabbar [data-tab], .sb [data-tab], .anseg [data-tab]", "tab", t);
  /* スマホの上の帯：今いる画面のアイコン（左メニューと同じもの） */
  const key = t === "rules" ? "gear" : AN.includes(t) ? "an" : t;
  const ic = document.querySelector(`.sb .mic.${key}`);
  const hc = $("hcur");
  if (hc && ic) hc.innerHTML = `<span class="mic ${key}" aria-hidden="true">${ic.innerHTML}</span><span class="hname">${TAB_NAME[t] || ""}</span>`;
  document
    .querySelectorAll('[data-tab="an"]')
    .forEach(b => (AN.includes(t) ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
}
/* 上の帯：今いる画面の名前（エンタメ管理と同じく、アイコンと名前を出す） */
const TAB_NAME = { list: "家計簿", home: "支払い", graph: "グラフ", balance: "残高と計画", rules: "設定" };
/* 家計簿の一番上の支出カード：総額の行だけ出して、内訳・件数などはたたむ（最初はたたむ。この端末に保存） */
const KSUMF = "okane.sumfold";
const sumFolded = () => lsRaw(KSUMF) !== "0";
/* 左メニューの「分析」の項目（グラフ・残高と計画）をたたむ／開く。印はエンタメ管理と同じ「›」 */
function setAnFold(f) {
  $("sbpan").classList.toggle("folded", f);
  const b = $("anfold");
  b.setAttribute("aria-expanded", String(!f));
  b.setAttribute("aria-label", f ? "分析の項目を開く" : "分析の項目をたたむ");
}
/* PC：左メニューの折りたたみ */
function setSidebar(c) {
  document.body.classList.toggle("sbc", c);
  const b = $("sbtog");
  b.setAttribute("aria-label", c ? "メニューを開く" : "メニューを折りたたむ");
  b.setAttribute("aria-expanded", String(!c));
}
function gearPressed(v) {
  $("gear").setAttribute("aria-pressed", v);
  $("sbgear").setAttribute("aria-pressed", v);
}
/* 設定：スマホ・PCとも真ん中に出すパネル。page を渡すとその画面から開く（エンタメ管理と同じ形） */
function openRules(page) {
  closePanels();
  setting.tab = page || "home";
  setting.edit = { rules: false, master: false, paym: false };
  $("rulepanel").hidden = false;
  $("rbk").hidden = false;
  document.documentElement.classList.add("setopen");
  gearPressed("true");
  renderRules();
  renderSettings();
}
function closePanels() {
  $("rulepanel").hidden = true;
  $("bulk").hidden = true;
  $("rbk").hidden = true;
  document.documentElement.classList.remove("setopen");
  setting.preview = null;
  gearPressed("false");
}

/* ---------- 全体・メッセージ ---------- */
/* fromAll：FIN.renderAll から呼ばれたとき（支払いの画面はそちらで描く） */
/* 上の月度の切り替え：支払い・残高と計画の画面は支払いの月度、ほかは家計簿の月度（別々に動かす） */
const payTab = () => view.tab === "home" || view.tab === "balance";
const barMonth = () => (payTab() && FIN.pay.period ? FIN.pay.period() : view.month);
function setBarMonth(m) {
  if (payTab() && FIN.pay.setPeriod) {
    FIN.pay.setPeriod(m);
    renderMonthBar();
  } else {
    view.month = m;
    render();
  }
}
function renderMonthBar() {
  const cur = barMonth();
  $("month").innerHTML = periodChoices(cur)
    .map(m => `<option value="${m}"${m === cur ? " selected" : ""}>${FIN.periodLabel(m)}</option>`)
    .join("");
  $("mcur").disabled = cur === thisPeriod();
}
function render(fromAll) {
  renderMonthBar();
  const mi = items.filter(i => inPeriod(i.date, view.month)).sort((a, b) => b.date.localeCompare(a.date));
  const pm = shiftM(view.month, -1),
    pi = items.filter(i => inPeriod(i.date, pm));
  renderSummary(mi, pi);
  renderList(mi);
  renderRules();
  renderSettings();
  renderGraph();
  updateSel();
  fillMemos();
  if (!fromAll && (view.tab === "home" || view.tab === "balance") && FIN.pay.render) FIN.pay.render(); // 現金の支出が変わる
}
/* 月度の選択肢：明細・支払いのある月度から、いまの12か月度先まで（新しい順に最大120） */
function periodChoices(shown) {
  const cur = thisPeriod();
  const all = [
    shown || view.month,
    cur,
    ...items.map(i => FIN.periodOf(i.date)),
    ...(FIN.pay.months ? FIN.pay.months() : []),
  ].sort();
  const hi = [shiftM(cur, 12), shown || view.month].sort().pop();
  const out = [];
  for (let m = hi; m >= all[0] && out.length < 120; m = shiftM(m, -1)) out.push(m);
  return out;
}
function setMsg(t, err) {
  const m = $("msg");
  m.textContent = t || "";
  m.className = err ? "err" : "mu";
}
function setM(t, err) {
  const d = $("mmsg");
  d.textContent = t || "";
  d.className = err ? "err" : "mu";
}
function setR(t, err) {
  $("rmsg").textContent = t;
  $("rmsg").className = err ? "err" : "mu";
}
/* 通知は共通部品（U.toast）。undo が true なら「元に戻す」で直前の状態に戻す */
function toast(t, undo) {
  U.toast(t, { undo: undo ? undoLast : null });
}

/* ---------- 当月サマリ ---------- */
function renderSummary(mi, pi) {
  const sum = sumOf(mi),
    psum = sumOf(pi),
    d = sum - psum;
  const [ps, pe] = FIN.periodRange(view.month);
  const dim = FIN.periodDays(view.month),
    isCur = view.month === thisPeriod();
  const days = isCur ? FIN.dayIndex(today(), view.month) + 1 : dim;
  const by = {};
  mi.forEach(i => (by[i.category] = (by[i.category] || 0) + i.amount));
  const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const top = rows.slice(0, 5),
    rest = rows.slice(5).reduce((s, r) => s + r[1], 0);
  if (rest > 0) top.push(["その他", rest]);
  const bm = {};
  mi.forEach(i => (bm[i.method] = (bm[i.method] || 0) + i.amount));
  const meths = Object.entries(bm).sort((a, b) => b[1] - a[1]);
  const delta = psum ? `<span class="delta ${dcls(d)}">前月比 ${dstr(d, psum)}</span>` : "";
  const sf = sumFolded();
  $("summary").classList.toggle("folded", sf);
  $("summary").innerHTML =
    `<div class="sumtop"><div><div class="eyebrow">${FIN.periodLabel(view.month)}の支出<span class="rng">${md(ps)}〜${md(pe)}</span></div><div class="totrow"><span class="total">${yen(sum)}</span>${delta}</div></div><button type="button" class="u-btn icon sm soft sumtog" id="sumtog" aria-expanded="${!sf}" aria-label="${sf ? "支出の内訳を開く" : "支出の内訳をたたむ"}">${FOLD_IC}</button></div><div class="sumbody">` +
    (sum
      ? `<div class="stack" role="img" aria-label="分類の内訳">${top.map(([c, v]) => `<span title="${esc(c)} ${yen(v)}（${Math.round((v / sum) * 100)}%）" style="flex:${v};background:${bcol(c)}"></span>`).join("")}</div>
    <div class="legend">${top.map(([c, v]) => `<span><i style="background:${bcol(c)}"></i>${emo(c)} ${esc(c)} <b class="num">${Math.round((v / sum) * 100)}%</b></span>`).join("")}</div>`
      : `<div class="mu mt10">この月度の明細はまだありません。${isWide() ? "左上の「＋ 追加」" : "右上の＋"}から追加してください。</div>`) +
    `<div class="kpis"><div><span>件数</span><b>${mi.length}件</b></div><div><span>1日平均</span><b>${yen(Math.round(sum / days))}</b></div><div><span>前月</span><b>${yen(psum)}</b></div></div>` +
    (meths.length
      ? `<div class="meths">${meths.map(([k, v]) => `<span class="chip out" style="${hs(k)}">${emo(k)} ${esc(k)} <b class="num">${yen(v)}</b></span>`).join("")}</div>`
      : "") +
    `</div>`;
}

/* ---------- 明細一覧・編集フォーム・追加前の確認 ---------- */
function renderList(mi) {
  const q = ledger.filter.q.trim().toLowerCase();
  const fl = mi.filter(
    i =>
      (!ledger.filter.c || i.category === ledger.filter.c) &&
      (!ledger.filter.m || i.method === ledger.filter.m) &&
      (!q || ((i.memo || "") + i.category + i.method + i.amount).toLowerCase().includes(q)),
  );
  ledger.mi = mi;
  const conds = [ledger.filter.c, ledger.filter.m].filter(Boolean).map(v => `${emo(v)} ${v}`);
  $("fbarK").innerHTML = `<div class="fline">${UI.filter.btn("kb", conds.length)}<span class="fcnt">${fl.length}件<b class="num">${yen(sumOf(fl))}</b></span></div>`;
  $("fsum").innerHTML = UI.filter.sum("kb", conds);
  ledger.shown = fl;
  if (UI.filter.isOpen("kb")) UI.filter.refresh();
  /* 並べる日付：絞り込みなし＝月度の初日から今日まで（過去の月度は最後の日まで）全部。絞り込み中は明細のある日だけ */
  const fon = !!(ledger.filter.c || ledger.filter.m || q);
  const days = new Set(fl.map(i => i.date));
  if (!fon) {
    const [ps, pe] = FIN.periodRange(view.month);
    const last = [pe, today()].sort()[0];
    for (let d = ps; d <= last; d = FIN.ds(new Date(FIN.pd(d).getTime() + 864e5))) days.add(d);
  }
  if (ledger.dayAdd && inPeriod(ledger.dayAdd.date, view.month)) days.add(ledger.dayAdd.date);
  const by = {};
  fl.forEach(i => (by[i.date] = by[i.date] || []).push(i));
  const td = today();
  let html = "";
  [...days].sort().reverse().forEach(d => {
    const l = by[d] || [],
      w = dow(d),
      adding = ledger.dayAdd && ledger.dayAdd.date === d,
      fold = l.length && dayFold.has(d) && !adding;
    html += `<div data-day="${d}" class="day ${["sun", "", "", "", "", "", "sat"][w]}${l.length ? "" : " empty"}${d === td ? " today" : ""}"><button type="button" class="dtog" data-dfold="${d}"${l.length ? ` aria-expanded="${!fold}"` : ""}>${l.length ? FOLD_IC : '<i class="fic-sp"></i>'}<span class="dd">${d.slice(5).replace("-", "/")} <small>（${"日月火水木金土"[w]}）</small>${d === td ? '<em class="tdy">今日</em>' : ""}</span>${l.length ? `<span class="dn">${l.length}件</span>` : ""}</button><span class="dsum">${l.length ? yen(sumOf(l)) : "—"}</span><button type="button" class="dadd" data-dadd="${d}" aria-label="${+d.slice(5, 7)}月${+d.slice(8)}日に追加">＋</button></div>`;
    if (adding) html += addForm(d);
    if (fold) return;
    l.forEach(i => {
      html +=
        i.id === ledger.editId
          ? editForm(i)
          : `<div class="it${ledger.sel.has(i.id) ? " on" : ""}" data-edit="${i.id}"><input type="checkbox" class="ck" data-ck="${i.id}" aria-label="選択"${ledger.sel.has(i.id) ? " checked" : ""}>${ico(i.category)}<div class="itm itm2"><div class="l1">${chip(i.category)}${i.memo && i.memo !== i.category ? `<span class="memo sm">${esc(i.memo)}</span>` : ""}</div><div class="l2">${mchip(i.method)}</div></div><span class="amt">${yen(i.amount)}</span></div>`;
    });
  });
  $("list").innerHTML = html || `<div class="mu empty">${fon ? "条件に合う明細はありません" : "この月度はまだ始まっていません"}</div>`;
}
/* 日付の行の＋で開く入力欄（日付はその日） */
function addForm(d) {
  const x = ledger.dayAdd.draft;
  return `<div class="rv addf" data-a="${d}">
  <label class="fl">日付<input type="date" data-af="date" value="${esc(x.date)}"></label>
  <label class="fl">金額<span class="yen"><input type="number" data-af="amount" value="${x.amount || ""}" placeholder="0" inputmode="numeric"></span></label>
  <label class="fl">分類<select data-af="category">${opts(CATS, x.category)}</select></label>
  <label class="fl">支払い方法<select data-af="method">${opts(METHODS, x.method)}</select></label>
  ${memoChips(x.category, x.memo)}<label class="fl full">メモ<input type="text" data-af="memo" list="memos" value="${esc(x.memo)}" placeholder="上の候補から選ぶか入力"></label>
  <div class="row sp full"><span></span><div class="row"><button class="ghost" data-acancel="1">キャンセル</button><button class="pri" data-asave="1">追加</button></div></div></div>`;
}
function editForm(i) {
  return `<div class="rv" data-e="${i.id}">
  <label class="fl">日付<input type="date" data-ef="date" value="${esc(ledger.draft.date)}"></label>
  <label class="fl">金額<span class="yen"><input type="number" data-ef="amount" value="${ledger.draft.amount || ""}" placeholder="0" inputmode="numeric"></span></label>
  <label class="fl">分類<select data-ef="category">${opts(CATS, ledger.draft.category)}</select></label>
  <label class="fl">支払い方法<select data-ef="method">${opts(METHODS, ledger.draft.method)}</select></label>
  ${memoChips(ledger.draft.category, ledger.draft.memo)}<label class="fl full">メモ<input type="text" data-ef="memo" list="memos" value="${esc(ledger.draft.memo)}" placeholder="上の候補から選ぶか入力"></label>
  <div class="row sp full"><button class="ghost" data-del="${i.id}">削除</button><div class="row"><button class="ghost" data-ecancel="1">キャンセル</button><button class="pri" data-esave="1">保存</button></div></div></div>`;
}
function fillMemos() {
  $("memos").innerHTML = recentMemos("", MEMO_LIST)
    .map(m => `<option value="${esc(m)}">`)
    .join("");
}
function memoChips(cat, cur) {
  const a = recentMemos(cat, MEMO_CHIPS);
  return a.length
    ? `<div class="mcs" role="group" aria-label="直近のメモ"><span class="lb">直近</span>${a.map(m => `<button type="button" class="mc${m === cur ? " on" : ""}" data-memo="${esc(m)}">${esc(m)}</button>`).join("")}</div>`
    : "";
}
function selItems() {
  return items.filter(i => ledger.sel.has(i.id));
}
function updateSel() {
  [...ledger.sel].forEach(id => {
    if (!items.some(i => i.id === id)) ledger.sel.delete(id);
  });
  const a = selItems(),
    on = a.length > 0;
  $("selbar").hidden = !on;
  document.body.classList.toggle("sel", on);
  if (on) {
    $("selcnt").textContent = a.length + "件選択";
    $("selsum").textContent = yen(sumOf(a));
    $("qc").innerHTML = iconOpts(CATS, undefined, "分類を変更…");
    $("qm").innerHTML = iconOpts(METHODS, undefined, "支払い方法を変更…");
    $("qmerge").disabled = a.length < 2;
    $("qdel").textContent = "削除";
    $("qdel").classList.remove("armed");
    if (view.armed === "qdel") view.armed = null;
  }
}

/* ---------- グラフ ---------- */
function renderGraph() {
  const g = graphData();
  $("gsel").innerHTML = iconOpts(g.names, g.sel, "すべての項目");
  $("gavg").innerHTML = graphSummaryHTML(g);
  $("gtrend").innerHTML = g.cur ? dailyHTML(g) : monthlyHTML(g);
  $("gdet").innerHTML = graphDetailHTML(g);
  $("gpace").innerHTML = paceHTML(g);
  $("gwd").innerHTML = weekdayHTML(g);
}
function donutSVG(parts, total) {
  const R = 52,
    C = 2 * Math.PI * R;
  let off = 0;
  const segs = parts
    .map(([k, v]) => {
      const len = (v / total) * C,
        gap = parts.length > 1 ? Math.min(2, len * 0.4) : 0;
      const el = `<circle r="${R}" cx="66" cy="66" fill="none" stroke="${bcol(k)}" stroke-width="20" stroke-dasharray="${Math.max(0.01, len - gap).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 66 66)"><title>${esc(k)} ${yen(v)}（${Math.round((v / total) * 100)}%）</title></circle>`;
      off += len;
      return el;
    })
    .join("");
  return `<svg class="donut" viewBox="0 0 132 132" role="img" aria-label="構成比"><circle r="${R}" cx="66" cy="66" fill="none" stroke="var(--u-bg)" stroke-width="20"/>${segs}<text x="66" y="61" text-anchor="middle" class="dk">合計</text><text x="66" y="80" text-anchor="middle" class="dv">${short(total)}</text></svg>`;
}
/* 左：期間・合計の枠、構成比ドーナツ、項目ごとの前月比 */
function graphSummaryHTML(g) {
  const { cur, ms, n, sel, rows, tot, cv, pv, cm, pmn } = g;
  const tile = (a, b, c) => `<div><span>${a}</span><b>${b}</b>${c || ""}</div>`;
  const dl = (d, b) => `<small class="dl ${dcls(d)}">${b ? dstr(d, b) : "前月データなし"}</small>`;
  const period = cur
    ? FIN.periodLabel(view.month) + `（${md(FIN.periodRange(view.month)[0])}〜${md(FIN.periodRange(view.month)[1])}）`
    : `${FIN.periodLabel(ms[0])}〜${+ms[n - 1].slice(5)}月度（${n}か月度）`;
  let h =
    `<div class="row sp"><span class="mu">${period}</span>${sel ? `<button class="ghost" data-g="">← すべての項目</button>` : ""}</div>` +
    (sel
      ? `<div class="row sp gselh"><span class="row">${ico(sel, 1)}<b>${esc(sel)}</b></span><button class="btn-s" data-gview="${esc(sel)}">この項目の明細を見る</button></div>`
      : "") +
    `<div class="tiles">` +
    (cur
      ? tile(cm + "月度の合計", yen(cv), dl(cv - pv, pv)) +
        tile(pmn + "月度", yen(pv)) +
        tile("件数", g.curI.length + "件")
      : tile("月度の平均", yen(Math.round(g.avg))) +
        tile("期間合計", yen(tot)) +
        tile(cm + "月度", yen(cv), dl(cv - pv, pv))) +
    `</div>`;
  if (!sel && tot) {
    const top = rows.slice(0, 7),
      rest = rows.slice(7).reduce((s, r) => s + r[1], 0);
    if (rest > 0) top.push(["その他", rest]);
    const mx = Math.max(1, ...rows.map(r => r[1]));
    h +=
      `<div class="gh">構成比と${cur ? "前月比" : "月平均"}<small>タップでその項目だけ表示</small></div><div class="donutwrap">${donutSVG(top, tot)}<div class="lg2 col">${top.map(([k, v]) => `<span><i style="background:${bcol(k)}"></i>${esc(k)} <b class="num">${Math.round((v / tot) * 100)}%</b></span>`).join("")}</div></div>` +
      `<div class="mt8">${rows.map(([k, v]) => itemRowHTML(g, k, v, mx)).join("")}</div>`;
  }
  if (!tot) h += '<div class="mu mt12">この期間の明細はありません。</div>';
  return h;
}
/* 項目ごとの行：割合の棒、金額（期間なら月平均）、当月の前月比 */
function itemRowHTML(g, k, v, mx) {
  const { cur, n, tot, ck, pk, cm } = g;
  const d = (ck[k] || 0) - (pk[k] || 0),
    p = pk[k] || 0,
    shownV = cur ? v : Math.round(v / n);
  const pct = p && d ? " " + (d > 0 ? "+" : "-") + Math.round((Math.abs(d) / p) * 100) + "%" : !p && d ? " 新規" : "";
  return `<div class="irow" data-g="${esc(k)}">${ico(k, 1)}<div class="cell"><div class="nm"><span>${esc(k)}</span><small>${Math.round((v / tot) * 100)}%</small></div><div class="track"><span style="width:${Math.max(2, (v / mx) * 100)}%;background:${bcol(k)}"></span></div></div><div class="rt">${yen(shownV)}${cur ? "" : `<small class="permo">/月度</small>`}<span class="dl ${dcls(d)}">${cm}月度 ${d === 0 ? "±0" : (d > 0 ? "▲" : "▼") + yen(Math.abs(d))}${pct}</span></div></div>`;
}
/* 右：当月を選んだときは日別の棒 */
function dailyHTML(g) {
  const dim = FIN.periodDays(view.month),
    dv = new Array(dim).fill(0);
  g.curI.forEach(i => {
    const k = FIN.dayIndex(i.date, view.month);
    if (k >= 0 && k < dim) dv[k] += i.amount;
  });
  const vm = Math.max(1, ...dv);
  const bars = dv
    .map((v, k) => {
      const dd = FIN.dateAt(view.month, k);
      return `<div class="col" data-gm="${dd}" title="${md(dd)} ${yen(v)}"><span style="background:${g.color};height:${(v / vm) * 100}%;opacity:${!graph.m || graph.m === dd ? 1 : 0.35}"></span></div>`;
    })
    .join("");
  /* 目盛りは月度の最初・5日おき・最後（日付で出す） */
  const labels = dv
    .map((v, k) => `<div>${[0, 5, 10, 15, 20, 25, dim - 1].includes(k) ? md(FIN.dateAt(view.month, k)) : ""}</div>`)
    .join("");
  return `<div class="gh">日別の支出<small>棒をタップでその日の明細</small></div><div class="chart daily">${bars}</div><div class="xlab">${labels}</div>`;
}
/* 右：期間を選んだときは月別推移（項目で積み上げ） */
function monthlyHTML(g) {
  const { ms, base, avg, sel, rows, key } = g;
  const vals = ms.map(m => sumOf(base.filter(i => inPeriod(i.date, m)))),
    vm = Math.max(1, ...vals, avg);
  const stackKeys = sel ? [] : rows.slice(0, 6).map(r => r[0]);
  const bars = ms
    .map((m, k) => {
      const op = !graph.m || graph.m === m ? 1 : 0.35,
        ttl = `${FIN.periodLabel(m)} ${yen(vals[k])}`;
      if (sel)
        return `<div class="col" data-gm="${m}" title="${ttl}"><span style="background:${bcol(sel)};height:${(vals[k] / vm) * 100}%;opacity:${op}"></span></div>`;
      const by = {};
      base
        .filter(i => inPeriod(i.date, m))
        .forEach(i => {
          const kk = stackKeys.includes(key(i)) ? key(i) : "その他";
          by[kk] = (by[kk] || 0) + i.amount;
        });
      const segs = [...stackKeys, "その他"]
        .filter(kk => by[kk])
        .map(
          kk =>
            `<i style="height:${(by[kk] / vals[k]) * 100}%;background:${bcol(kk)}" title="${+m.slice(5)}月度 ${esc(kk)} ${yen(by[kk])}"></i>`,
        )
        .join("");
      return `<div class="col" data-gm="${m}" title="${ttl}"><span class="stk" style="height:${(vals[k] / vm) * 100}%;opacity:${op}">${segs}</span></div>`;
    })
    .join("");
  const labels = ms
    .map(
      (m, k) => `<div data-gm="${m}" class="${graph.m === m ? "on" : ""}">${+m.slice(5)}月<br>${short(vals[k])}</div>`,
    )
    .join("");
  const legend = sel
    ? ""
    : `<div class="lg2">${[...stackKeys, "その他"]
        .filter(kk => kk !== "その他" || rows.length > 6)
        .map(kk => `<span><i style="background:${bcol(kk)}"></i>${esc(kk)}</span>`)
        .join("")}</div>`;
  return (
    `<div class="gh">月別推移${sel ? "" : "（項目ごとの積み上げ）"}<small>点線は平均 ${yen(Math.round(avg))}</small></div><div class="chart"><div class="avg" style="bottom:${(avg / vm) * 100}%"></div>${bars}</div>` +
    `<div class="xlab">${labels}</div>` +
    legend
  );
}
/* 棒を選んだときの、その月・日の明細 */
function graphDetailHTML(g) {
  const { base, sel, cur } = g;
  if (!graph.m) return `<div class="mu mt8">棒をタップすると、その${cur ? "日" : "月度"}の明細を表示します</div>`;
  const det = base
    .filter(i => (graph.m.length === 10 ? i.date === graph.m : inPeriod(i.date, graph.m)))
    .sort((a, b) => b.date.localeCompare(a.date));
  const lbl = graph.m.length === 10 ? md(graph.m) : FIN.periodLabel(graph.m);
  return (
    `<div class="row sp mt14"><b>${lbl}の明細${sel ? "（" + esc(sel) + "）" : ""}</b><span class="amt">${yen(sumOf(det))}</span></div>` +
    (det.length
      ? det
          .map(
            i =>
              `<div class="it ro">${ico(i.category, 1)}<div class="itm"><div class="memo">${esc(i.memo || i.category)}</div><div class="tag"><span class="mu">${i.date.slice(5).replace("-", "/")}</span>${chip(i.category)}${mchip(i.method)}</div></div><span class="amt">${yen(i.amount)}</span></div>`,
          )
          .join("")
      : '<div class="mu">明細なし</div>')
  );
}
/* 当月のペース：前月との累計比較と月末見込み */
function paceHTML(g) {
  const { curI, prevI, pm, pv, cm, pmn, color } = g;
  const cA = cumDays(curI, view.month),
    pA = cumDays(prevI, pm),
    isNow = view.month === thisPeriod(),
    upto = isNow ? FIN.dayIndex(today(), view.month) + 1 : cA.length;
  const cS = cA.slice(0, upto),
    ym = Math.max(1, ...cS, ...pA),
    span = Math.max(cA.length, pA.length) - 1, // 横軸は長い方の月度に合わせる
    X = d => ((d / span) * 300).toFixed(1),
    Y = v => (130 - (v / ym) * 124).toFixed(1);
  const pts = a => a.map((v, k) => `${X(k)},${Y(v)}`).join(" ");
  const same = pA[Math.min(upto, pA.length) - 1] || 0,
    now = cS[cS.length - 1] || 0,
    diff = now - same;
  const grid = [0.25, 0.5, 0.75]
    .map(
      f =>
        `<line x1="0" x2="300" y1="${(130 - f * 124).toFixed(1)}" y2="${(130 - f * 124).toFixed(1)}" stroke="var(--u-line)" stroke-width="1" vector-effect="non-scaling-stroke"/>`,
    )
    .join("");
  return (
    `<div class="gh">${cm}月度のペース（前の月度との累計比較）</div><div class="pace"><span class="yl">${short(ym)}</span><svg viewBox="0 0 300 130" preserveAspectRatio="none" role="img" aria-label="累計支出の比較">` +
    grid +
    `<line x1="0" x2="300" y1="130" y2="130" stroke="var(--u-strong)" stroke-width="1" vector-effect="non-scaling-stroke"/>` +
    (pv
      ? `<polyline points="${pts(pA)}" fill="none" stroke="var(--u-sub)" stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"><title>${pmn}月の累計</title></polyline>`
      : "") +
    `<polyline points="${pts(cS)}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"><title>${cm}月の累計</title></polyline></svg></div>` +
    `<div class="xlab"><div class="l">${md(FIN.periodRange(view.month)[0])}</div><div>10日目</div><div>20日目</div><div class="r">${md(FIN.periodRange(view.month)[1])}</div></div>` +
    `<div class="lg2"><span><i class="ln" style="background:${color}"></i>${cm}月度</span>${pv ? `<span><i class="dash"></i>${pmn}月度</span>` : ""}</div>` +
    (pv
      ? `<div class="pnote">${upto}日目時点で前の月度の同じ日より <b class="dl ${dcls(diff)}">${diff >= 0 ? "＋" : "−"}${yen(Math.abs(diff))}</b>${isNow ? `。このままだと月度末は約 <b>${yen(Math.round((now / upto) * cA.length))}</b>` : ""}</div>`
      : "")
  );
}
/* 曜日別の支出（月曜はじまり） */
function weekdayHTML(g) {
  const { base, tot, cur, color } = g;
  if (!tot) return "";
  const wd = [0, 0, 0, 0, 0, 0, 0];
  base.forEach(i => (wd[dow(i.date)] += i.amount));
  const wm = Math.max(1, ...wd);
  return (
    `<div class="gh">曜日別の支出<small>${cur ? "当月" : "期間"}の合計</small></div>` +
    [1, 2, 3, 4, 5, 6, 0]
      .map(
        w =>
          `<div class="wdr"><span class="wd${w === 0 ? " sun" : w === 6 ? " sat" : ""}">${"日月火水木金土"[w]}</span><div class="track"><span style="width:${Math.max(wd[w] ? 2 : 0, (wd[w] / wm) * 100)}%;background:${color}"></span></div><span>${yen(wd[w])}</span></div>`,
      )
      .join("")
  );
}

/* ---------- 設定：項目の切り替え・マスタ ---------- */
const SET_IC = {
  theme: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  rules: '<path d="M4 6h16M4 12h10M4 18h6"/><path d="m15 16 2 2 4-4"/>',
  cats: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  mets: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
  inc: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
  paym: '<path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  gen: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v4M10 15h4"/>',
  save: '<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z"/><path d="m9.5 13.5 2 2 3.5-4"/>',
  out: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
};
const setIc = k => `<svg class="seti" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SET_IC[k]}</svg>`;
const SET_CV = `<svg class="setcv" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`;
const SET_PG = { home: "設定", rules: "分類ルール", cats: "分類", mets: "支払い方法", inc: "収入と給料日", paym: "引落口座", gen: "支払予定の作成" };
const SET_EDIT = { rules: "rules", cats: "master", mets: "master", paym: "paym" };
const PAY_PG = ["inc", "paym", "gen"];
/* 設定の一覧（表示・家計簿・支払い・データ・アカウント） */
function renderSetHome() {
  const th = U.theme();
  const cfg = (FIN.pay.cfg && FIN.pay.cfg()) || {};
  const row = (k, lab, val) => `<button type="button" class="setrow" data-stab="${k}">${setIc(k)}<span class="setl">${lab}</span><span class="setv">${val}</span>${SET_CV}</button>`;
  const sv = $("saveSt");
  $("st-home").innerHTML = `<div class="setsec">表示</div>
    <div class="setgrp"><div class="setrow static">${setIc("theme")}<span class="setl">テーマ</span><div class="seg thseg" role="group" aria-label="テーマ">${[["auto", "自動"], ["light", "ライト"], ["dark", "ダーク"]].map(([v, l]) => `<button type="button" data-theme="${v}"${th === v ? ' aria-current="page"' : ""}>${l}</button>`).join("")}</div></div></div>
    <div class="setsec">家計簿</div>
    <div class="setgrp">${row("rules", "分類ルール", `${rules.length}件`)}${row("cats", "分類", CATS.length)}${row("mets", "支払い方法", METHODS.length)}</div>
    <div class="setsec">支払い</div>
    <div class="setgrp">${row("inc", "収入と給料日", `${cfg.income ? yen(cfg.income) + "・" : ""}${FIN.paydayNum()}日`)}${row("paym", "引落口座", (cfg.methods || []).length)}${row("gen", "支払予定の作成", "作り直す・作成")}</div>
    <div class="setsec">アカウント</div>
    <div class="setgrp"><div class="setrow static">${setIc("save")}<span class="setl">保存</span><span class="setv"><span class="${sv ? sv.className : "savest"}">${sv ? esc(sv.textContent) : ""}</span></span></div><button type="button" class="setrow danger" data-logout="1">${setIc("out")}<span class="setl">ログアウト</span></button></div>`;
}
function renderSettings() {
  const pg = SET_PG[setting.tab] ? setting.tab : "home";
  $("stTitle").textContent = SET_PG[pg];
  document.querySelector("#rulepanel .setback").hidden = pg === "home";
  const ek = SET_EDIT[pg] || "";
  const eb = $("stEdit");
  eb.hidden = !ek;
  eb.dataset.setedit = ek;
  if (ek) paintSetEdit(ek, setting.edit[ek]);
  $("st-home").hidden = pg !== "home";
  $("st-rules").hidden = pg !== "rules";
  $("st-master").hidden = pg !== "cats" && pg !== "mets";
  $("st-pay").hidden = !PAY_PG.includes(pg);
  document.querySelectorAll("#st-pay [data-pg]").forEach(e => (e.hidden = e.dataset.pg !== pg));
  $("mMethods").classList.toggle("editing", setting.edit.paym);
  if (pg === "home") renderSetHome();
  if (pg === "cats" || pg === "mets") {
    setting.kind = pg;
    renderMaster();
  }
  if (PAY_PG.includes(pg) && FIN.pay.renderSettings) FIN.pay.renderSettings();
}
/* 設定のその項目を開いているか（支払いの設定を描き直すかどうか） */
const settingsOpen = tab => !$("rulepanel").hidden && (tab === "pay" ? PAY_PG.includes(setting.tab) : setting.tab === tab);
function mUse(kind, n) {
  const f = kind === "cats" ? "category" : "method";
  const c = items.filter(i => i[f] === n).length;
  const r = rules.filter(x =>
    kind === "cats"
      ? x.cat === n || x.from === n || x.to === n || (x.set && x.set.category === n)
      : x.met === n || (x.set && x.set.method === n),
  ).length;
  return { c, r };
}
function renderMaster() {
  const L = MASTER[setting.kind];
  $("maddn").placeholder = setting.kind === "cats" ? "新しい分類の名前" : "新しい支払い方法の名前";
  const ed = setting.edit.master;
  paintSetEdit("master", ed);
  $("mlist").classList.toggle("editing", ed);
  $("mlist").innerHTML = L.map((x, i) => {
    const u = mUse(setting.kind, x.n),
      used = u.c + u.r > 0;
    if (!ed)
      return `<div class="mrow view" data-sortrow data-mi="${i}">${GRIP("kbm")}<span class="me" style="${hs(x.n)}" aria-hidden="true">${esc(x.e)}</span><span class="mn">${esc(x.n)}</span><span class="cnt">明細 ${u.c}件${u.r ? ` ・ ルール ${u.r}件` : ""}</span></div>`;
    return `<div class="mrow${used ? " used" : ""}" data-sortrow data-mi="${i}">${GRIP("kbm")}<input type="text" class="me" data-me="${i}" value="${esc(x.e)}" maxlength="4" style="${hs(x.n)}" aria-label="${esc(x.n)}のアイコン"><input type="text" class="mn" data-mn="${i}" value="${esc(x.n)}" aria-label="名前"><button class="ghost mdel" data-mdel="${i}"${used ? ` title="使用中のため削除できません" aria-disabled="true"` : ""}>削除</button><div class="info"><span class="cnt">明細 ${u.c}件${u.r ? ` ・ ルール ${u.r}件` : ""}</span></div></div>`;
  }).join("");
  $("mconf").innerHTML = setting.merge
    ? `<div class="mcf">「${esc(setting.merge.old)}」を「${esc(setting.merge.nn)}」に統合します。明細 ${mUse(setting.merge.kind, setting.merge.old).c}件の${setting.merge.kind === "cats" ? "分類" : "支払い方法"}が「${esc(setting.merge.nn)}」に変わり、「${esc(setting.merge.old)}」はマスタから消えます。<div class="row"><button class="pri" data-mcok="1">統合する</button><button class="ghost" data-mcno="1">やめる</button></div></div>`
    : "";
}

/* ---------- 設定：分類ルール ---------- */
function selOpts(el, arr, first) {
  const v = el.value;
  el.innerHTML = iconOpts(arr, undefined, first);
  if ([...el.options].some(o => o.value === v)) el.value = v;
}
/* 右上の「編集」ボタン（押すと「完了」） */
function paintSetEdit(k, on) {
  document.querySelectorAll(`[data-setedit="${k}"]`).forEach(b => {
    b.textContent = on ? "完了" : "編集";
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
  });
}
function renderRules() {
  paintSetEdit("rules", setting.edit.rules);
  selOpts($("rcat"), CATS, "指定しない");
  selOpts($("rmet"), METHODS, "指定しない");
  selOpts($("scat"), CATS, "変更しない");
  selOpts($("smet"), METHODS, "変更しない");
  selOpts($("rf"), CATS);
  selOpts($("rt"), CATS);
  if (!$("rf").dataset.init) {
    $("rf").value = CATS[0];
    $("rt").value = CATS[1];
    $("rf").dataset.init = "1";
  }
  $("rules").innerHTML = rules.length
    ? rules
        .map(r => {
          const [kc, kl] = kindOf(r);
          return `<div class="rule"><div class="top"><span class="kind ${kc}">${kl}</span><label class="ckl"><input type="checkbox" class="ck" data-rauto="${r.id}"${r.auto !== false ? " checked" : ""}> 新規に自動適用</label></div>
    <div class="rdesc">${descRule(r)}</div>
    <div class="acts">${setting.edit.rules ? `<button class="u-btn sm editbtn" data-redit="${r.id}" aria-label="ルールを変更">変更</button><button class="ghost delbtn" data-rdel="${r.id}">削除</button>` : `<button data-rprev="${r.id}">既存データに適用…</button>`}</div>
    ${setting.preview && setting.preview.rid === r.id ? previewHTML() : ""}</div>`;
        })
        .join("")
    : '<div class="mu">ルールはまだありません。下のフォームから追加できます。</div>';
}
function chgHTML(it, x) {
  if (x.length === 2) return `${chip(x[1].category)} に<em>${yen(x[1].amount)}</em>を分割、残り${yen(x[0].amount)}`;
  const o = x[0],
    p = [];
  if (o.memo !== it.memo) p.push(`メモ → <em>${esc(o.memo)}</em>`);
  if (o.category !== it.category) p.push(`${chip(it.category)} → ${chip(o.category)}`);
  if (o.method !== it.method) p.push(`${mchip(it.method)} → ${mchip(o.method)}`);
  if (x.length === 1 && o.category !== it.category && o.amount === it.amount && !p.length)
    p.push(`→ ${chip(o.category)}`);
  return p.join(" ・ ");
}
function previewHTML() {
  const n = setting.preview.rows.length - setting.preview.off.size;
  if (!setting.preview.rows.length)
    return `<div class="pv"><div class="mu">今あるデータに対象の明細はありません。</div><div class="row mt8"><button class="ghost" data-rcancel="1">閉じる</button></div></div>`;
  return `<div class="pv"><div class="row sp mb6"><b>対象 ${setting.preview.rows.length}件</b><button class="ghost" data-pvall="1">${setting.preview.off.size ? "すべて選ぶ" : "すべて外す"}</button></div>
  <div class="pvl">${setting.preview.rows.map(({ it, x }) => `<div class="pvr" data-pv="${esc(it.id)}"><input type="checkbox" class="ck" tabindex="-1"${setting.preview.off.has(it.id) ? "" : " checked"} aria-label="適用する"><div class="cell"><div class="nm">${esc(it.memo || it.category)}</div><div class="chg">${it.date.slice(2).replace(/-/g, "/")} ・ ${chgHTML(it, x)}</div></div><span class="amt">${yen(it.amount)}</span></div>`).join("")}</div>
  <div class="row mt8"><button class="pri grow" data-rgo="1"${n ? "" : " disabled"}>選んだ${n}件に適用</button><button class="ghost" data-rcancel="1">やめる</button></div></div>`;
}
function rkUpdate() {
  const k = $("rk").value;
  document.querySelectorAll("#rform [data-k]").forEach(e => (e.hidden = e.dataset.k !== k));
}

/* ===================== 操作 ===================== */
/* ---------- 「2回押す」方式（confirm() が使えないため。1回目は文字を変えて待ち、true を返す） ---------- */
function arm(key, btn, label) {
  if (view.armed === key) {
    view.armed = null;
    return false;
  }
  view.armed = key;
  btn.textContent = label;
  btn.classList.add("armed");
  return true;
}

/* 手入力の初期値：マスタの先頭の分類・支払い方法 */
function blank() {
  return { date: today(), amount: 0, category: CATS[0], method: METHODS[0], memo: "" };
}
/* ---------- 明細の編集・削除 ---------- */
function saveEdit() {
  if (!ledger.draft || !(ledger.draft.amount > 0) || !ledger.draft.date) {
    setMsg("金額と日付を確認してください", 1);
    return;
  }
  const k = items.findIndex(i => i.id === ledger.editId);
  if (k >= 0) {
    items[k] = { ...ledger.draft, id: ledger.editId };
    learn(items[k]);
    view.month = FIN.periodOf(ledger.draft.date);
    save();
  }
  ledger.editId = null;
  ledger.draft = null;
  render();
}
function deleteItem(id) {
  snap();
  items = items.filter(i => i.id !== id);
  ledger.editId = null;
  ledger.draft = null;
  save();
  toast("削除しました", true);
  render();
}
function undoLast() {
  const b = lsGet(KB, null);
  if (!b) return;
  items = b;
  lsDel(KB);
  save();
  render();
  toast("元に戻しました");
}

/* ---------- 選んだ明細の一括変更・合算・削除 ---------- */
function quickSet(f, v) {
  if (!v || !ledger.sel.size) return;
  snap();
  let k = 0;
  items = items.map(i => (ledger.sel.has(i.id) ? (k++, { ...i, [f]: v }) : i));
  save();
  ledger.sel.clear();
  toast(k + "件の" + (f === "category" ? "分類" : "支払い方法") + "を「" + v + "」に変更しました", true);
  render();
}
function openBulk() {
  const a = selItems();
  if (!a.length) return;
  $("bd").value = "";
  $("bn").value = "";
  $("bmsg").textContent = "";
  view.armed = null;
  $("bsum").textContent = a.length + "件・合計 " + yen(sumOf(a));
  $("rulepanel").hidden = true;
  $("bulk").hidden = false;
  $("rbk").hidden = false;
}
function applyBulk() {
  const d = $("bd").value,
    n = $("bn").value.trim();
  if (!d && !n) {
    $("bmsg").textContent = "変更する項目を選んでください";
    return;
  }
  snap();
  let k = 0;
  items = items.map(i => {
    if (!ledger.sel.has(i.id)) return i;
    k++;
    const x = { ...i };
    if (d) x.date = d;
    if (n) x.memo = n;
    return x;
  });
  save();
  closePanels();
  ledger.sel.clear();
  toast(k + "件を更新しました", true);
  render();
}
function mergeSel() {
  const a = selItems().sort((x, y) => y.date.localeCompare(x.date));
  if (a.length < 2) {
    toast("2件以上を選んでください");
    return;
  }
  const memos = [...new Set(a.map(i => i.memo).filter(Boolean))];
  const out = { ...a[0], amount: sumOf(a), memo: memos.join("、") };
  delete out.ruled;
  snap();
  items = items.filter(i => !ledger.sel.has(i.id) || i.id === out.id).map(i => (i.id === out.id ? out : i));
  save();
  closePanels();
  ledger.sel.clear();
  toast(a.length + "件を合算しました（" + yen(out.amount) + "）", true);
  render();
}
function deleteSel() {
  snap();
  const n = ledger.sel.size;
  items = items.filter(i => !ledger.sel.has(i.id));
  ledger.sel.clear();
  save();
  toast(n + "件を削除しました", true);
  render();
}
function showInList(k) {
  ledger.filter = { q: "", c: graph.by === "category" ? k : "", m: graph.by === "method" ? k : "" };
  ledger.filter.q = "";
  ledger.sel.clear();
  setTab("list");
  render();
  window.scrollTo(0, $("lhead").getBoundingClientRect().top + window.scrollY - 60);
}

/* ---------- 分類ルール ---------- */
function openPreview(rid) {
  const r = rules.find(x => x.id === rid);
  if (!r) return;
  const rows = items
    .map(it => {
      const x = applyRule(it, r);
      return x ? { it, x } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.it.date.localeCompare(a.it.date));
  setting.preview = { rid, rows, off: new Set() };
  renderRules();
  const el = document.querySelector(`[data-rprev="${rid}"]`);
  if (el) el.closest(".rule").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function applyPreview() {
  if (!setting.preview) return;
  const r = rules.find(x => x.id === setting.preview.rid);
  if (!r) return;
  const ids = new Set(setting.preview.rows.map(x => x.it.id).filter(id => !setting.preview.off.has(id)));
  if (!ids.size) return;
  snap();
  let k = 0;
  items = items.flatMap(it => {
    if (!ids.has(it.id)) return [it];
    const x = applyRule(it, r);
    if (x) {
      k++;
      return x;
    }
    return [it];
  });
  items.forEach(learn);
  save();
  setting.preview = null;
  setR(k + "件に適用しました");
  toast(k + "件にルールを適用しました", true);
  render();
}
function resetForm() {
  setting.editRule = null;
  ["rw", "rmin", "rmax", "snm", "ra"].forEach(id => ($(id).value = ""));
  ["rcat", "rmet", "scat", "smet"].forEach(id => ($(id).value = ""));
  $("rmode").value = "contains";
  $("rm").value = "1";
  $("rftitle").textContent = "ルールを追加";
  $("radd").textContent = "ルールを追加";
  $("rfcancel").hidden = true;
}
function startEdit(id) {
  const r = rules.find(x => x.id === id);
  if (!r) return;
  renderRules();
  setting.editRule = id;
  $("rk").value = r.kind;
  rkUpdate();
  if (r.kind === "set") {
    $("rw").value = r.kw;
    $("rmode").value = r.mode;
    $("rcat").value = r.cat;
    $("rmet").value = r.met;
    $("rmin").value = r.min ?? "";
    $("rmax").value = r.max ?? "";
    $("snm").value = r.set.memo;
    $("scat").value = r.set.category;
    $("smet").value = r.set.method;
  } else {
    $("rf").value = r.from;
    $("rt").value = r.to;
    $("ra").value = r.amt;
    $("rm").value = r.max;
  }
  $("rftitle").textContent = "ルールを編集";
  $("radd").textContent = "変更を保存";
  $("rfcancel").hidden = false;
  $("rform").scrollIntoView({ behavior: "smooth", block: "start" });
}
function saveRuleForm() {
  let r;
  const old = setting.editRule && rules.find(x => x.id === setting.editRule);
  if ($("rk").value === "set") {
    r = {
      id: setting.editRule || "r" + uid(),
      kind: "set",
      kw: $("rw").value.trim(),
      mode: $("rmode").value,
      cat: $("rcat").value,
      met: $("rmet").value,
      min: nn($("rmin").value),
      max: nn($("rmax").value),
      set: { memo: $("snm").value.trim(), category: $("scat").value, method: $("smet").value },
      auto: old ? old.auto !== false : true,
    };
    if (!r.kw && !r.cat && !r.met && r.min == null && r.max == null) {
      setR("条件を1つ以上入力してください", 1);
      return;
    }
    if (!r.set.memo && !r.set.category && !r.set.method) {
      setR("変更内容を1つ以上入力してください", 1);
      return;
    }
  } else {
    const amt = Math.round(Number($("ra").value) || 0),
      mx = Math.max(1, Math.round(Number($("rm").value) || 1));
    if (amt <= 0 || $("rf").value === $("rt").value) {
      setR("金額と分類を確認してください", 1);
      return;
    }
    r = {
      id: setting.editRule || "r" + uid(),
      kind: "split",
      from: $("rf").value,
      amt,
      to: $("rt").value,
      max: mx,
      auto: old ? old.auto !== false : true,
    };
  }
  const was = !!setting.editRule;
  if (was) rules = rules.map(x => (x.id === setting.editRule ? r : x));
  else rules.push(r);
  saveRules();
  resetForm();
  setting.preview = null;
  setR(was ? "ルールを更新しました" : "ルールを追加しました");
  renderRules();
  openPreview(r.id);
}
function undoForRules() {
  const b = lsGet(KB, null);
  if (!b) {
    setR("取り消せる変更がありません", 1);
    return;
  }
  items = b;
  lsDel(KB);
  save();
  setR("直前の変更を取り消しました");
  render();
}
function ruleFromSel() {
  const a = selItems();
  if (!a.length) return;
  const memos = [...new Set(a.map(i => i.memo).filter(Boolean))];
  openRules("rules");
  resetForm();
  $("rk").value = "set";
  rkUpdate();
  $("rw").value = memos.join(",");
  $("rmode").value = "exact";
  $("snm").value = memos[0] || "";
  setR("選んだ明細のメモをキーワードに入れました。統一後の名称や分類を決めて追加してください。");
  $("rform").scrollIntoView({ block: "start" });
  $("snm").focus();
}

/* ---------- マスタ ---------- */
function mRenameApply(kind, old, nn) {
  const f = kind === "cats" ? "category" : "method",
    L = MASTER[kind],
    idx = L.findIndex(x => x.n === old),
    ex = L.findIndex(x => x.n === nn);
  if (idx < 0) return;
  const k = items.filter(i => i[f] === old).length;
  items = items.map(i => (i[f] === old ? { ...i, [f]: nn } : i));
  rules = rules.map(r => {
    const x = JSON.parse(JSON.stringify(r));
    if (kind === "cats") {
      if (x.cat === old) x.cat = nn;
      if (x.from === old) x.from = nn;
      if (x.to === old) x.to = nn;
      if (x.set && x.set.category === old) x.set.category = nn;
    } else {
      if (x.met === old) x.met = nn;
      if (x.set && x.set.method === old) x.set.method = nn;
    }
    return x;
  });
  if (ex >= 0) L.splice(idx, 1);
  else L[idx].n = nn;
  if (kind === "cats" && ledger.filter.c === old) ledger.filter.c = nn;
  if (kind === "mets" && ledger.filter.m === old) ledger.filter.m = nn;
  if (graph.sel === old) graph.sel = nn;
  if (ledger.draft && ledger.draft[f] === old) ledger.draft[f] = nn;
  applyMaster();
  saveMasterLocal();
  saveRulesLocal();
  save();
  setM(
    ex >= 0
      ? `「${old}」を「${nn}」に統合しました（明細 ${k}件）`
      : `「${old}」を「${nn}」に変更しました（明細 ${k}件）`,
  );
  render();
}
function mRename(i, nn) {
  const L = MASTER[setting.kind],
    old = L[i] && L[i].n;
  nn = String(nn || "").trim();
  if (!old) return;
  if (!nn) {
    setM("名前を空にはできません", 1);
    renderMaster();
    return;
  }
  if (nn === old) return;
  if (L.some(x => x.n === nn)) {
    setting.merge = { kind: setting.kind, old, nn };
    renderMaster();
    return;
  }
  mRenameApply(setting.kind, old, nn);
}
/* 分類・支払い方法の並び替え：⠿を押さえたまま上下に動かす（しくみは共通の u-core.js、エンタメ管理と同じ動き） */
SORT_DONE.kbm = (box, rows) => {
  const L = MASTER[setting.kind];
  const nl = rows.map(x => L[+x.dataset.mi]).filter(Boolean);
  if (nl.length === L.length && nl.some((x, k) => x !== L[k])) {
    L.splice(0, L.length, ...nl);
    applyMaster();
    saveMaster();
  }
  render();
};
function mDelete(i, btn) {
  const L = MASTER[setting.kind],
    x = L[i];
  if (!x) return;
  const u = mUse(setting.kind, x.n);
  if (u.c + u.r) {
    setM(
      `「${x.n}」は明細${u.c}件${u.r ? `・ルール${u.r}件` : ""}で使われているため削除できません。名前を別の項目と同じにすると統合できます。`,
      1,
    );
    return;
  }
  if (L.length <= 1) {
    setM("最後の1件は削除できません", 1);
    return;
  }
  if (arm("m" + setting.kind + i, btn, "もう一度押すと削除")) return;
  L.splice(i, 1);
  applyMaster();
  saveMaster();
  setM(`「${x.n}」を削除しました`);
  render();
}
function mAdd() {
  const n = $("maddn").value.trim(),
    e = $("madde").value.trim();
  if (!n) {
    setM("名前を入力してください", 1);
    return;
  }
  if (CATS.includes(n) || METHODS.includes(n)) {
    setM(`「${n}」は既にあります`, 1);
    return;
  }
  MASTER[setting.kind].push({ n, e: e || "🏷️", h: n in CH ? CH[n] : hashHue(n) });
  applyMaster();
  saveMaster();
  $("maddn").value = "";
  $("madde").value = "";
  setM(`「${n}」を追加しました`);
  render();
}

/* ===================== イベント ===================== */
/* ---------- クリック：画面ごとの処理に振り分ける。各処理は、受け持ったら true を返す ---------- */
/* ---------- 追加（右上の＋・左メニューの＋）：今の画面に合わせて、明細・支払・口座を追加 ---------- */
function doAdd() {
  if (view.tab === "home" || view.tab === "balance") {
    if (FIN.pay.add) FIN.pay.add(view.tab === "home" ? "pay" : "acc");
    return;
  }
  if (view.tab !== "list") setTab("list");
  /* 今日の行に入力欄を開く（金額欄にすぐ入力できる。スマホは電卓が出る） */
  if (!inPeriod(today(), view.month)) view.month = thisPeriod();
  openDayAdd(today());
}
function paintTheme() {
  markCurrent("[data-theme]", "theme", U.theme());
}
document.addEventListener("u-theme", paintTheme);
document.addEventListener("click", e => {
  if (e.target.closest(".pay, #st-pay")) return; // 支払いの部品は pay.js が受け持つ
  if (clickListCheck(e)) return;
  const t = e.target.closest("button,[data-edit],[data-day],[data-memo],[data-gm],[data-g],.pvr") || e.target;
  /* 画面全体（body）へのクリックは無視する（body の data-tab を画面の切り替えと取り違えないように） */
  if (t === document.body || t === document.documentElement) return;
  const d = t.dataset || {};
  [clickHeader, clickLedger, clickSelection, clickGraph, clickRules, clickMaster].some(
    f => f(t, d),
  );
});
/* 明細一覧：丸いチェック・選択中に行をタップしたときは、選択だけ切り替える */
function clickListCheck(e) {
  if (!e.target.closest("#list")) return false;
  const ck = e.target.closest("[data-ck]");
  if (ck) {
    const id = ck.dataset.ck;
    ck.checked ? ledger.sel.add(id) : ledger.sel.delete(id);
    ledger.editId = null;
    ledger.draft = null;
    render();
    return true;
  }
  const row = e.target.closest("[data-edit]");
  if (row && ledger.sel.size) {
    const id = row.dataset.edit;
    ledger.sel.has(id) ? ledger.sel.delete(id) : ledger.sel.add(id);
    render();
    return true;
  }
  return false;
}
/* ヘッダー・下部メニュー・設定の開閉・通知 */
function clickHeader(t, d) {
  if (t.id === "hAdd" || t.id === "sbAdd") {
    doAdd();
  } else if (d.theme) {
    U.setTheme(d.theme);
  } else if (d.setedit === "rules" || d.setedit === "master" || d.setedit === "paym") {
    setting.edit[d.setedit] = !setting.edit[d.setedit];
    setting.merge = null;
    view.armed = null;
    if (d.setedit === "rules") renderRules();
    else if (d.setedit === "master") renderMaster();
    else {
      $("mMethods").classList.toggle("editing", setting.edit.paym);
      paintSetEdit("paym", setting.edit.paym);
    }
  } else if (d.logout) {
    U.store().then(s => (s.logout ? s.logout() : toast("この環境ではログアウトできません")));
  } else if (d.tab) {
    setTab(d.tab);
    window.scrollTo(0, 0);
  } else if (t.id === "mprev" || t.id === "mnext") {
    setBarMonth(shiftM(barMonth(), t.id === "mprev" ? -1 : 1));
  } else if (t.id === "mcur") {
    setBarMonth(thisPeriod());
  } else if (t.id === "hTheme") {
    /* 表示の切り替えは共通部品（u-ui.js）が行う */
  } else if (t.id === "sumtog" || (t.closest && t.closest("#summary .sumtop") && !t.closest("a,input,select"))) {
    t = $("sumtog");
    const f = !sumFolded();
    lsSet(KSUMF, f ? "1" : "0", true);
    $("summary").classList.toggle("folded", f);
    t.setAttribute("aria-expanded", String(!f));
    t.setAttribute("aria-label", f ? "支出の内訳を開く" : "支出の内訳をたたむ");
  } else if (t.id === "anfold") {
    const f = !$("sbpan").classList.contains("folded");
    setAnFold(f);
    lsSet(KANF, f ? "1" : "", true);
  } else if (t.id === "sbtog") {
    const c = !document.body.classList.contains("sbc");
    setSidebar(c);
    lsSet(KSBC, c ? "1" : "", true);
  } else if (t.id === "gear" || t.id === "sbgear") {
    if ($("rulepanel").hidden) openRules();
    else closePanels();
  } else if (t.id === "rclose" || t.id === "rbk" || t.id === "bclose") {
    closePanels();
  } else if (t.id === "syncnow") {
    U.sync.retry();
  } else return false;
  return true;
}
/* 明細：絞り込みの解除・その場の編集・削除・メモ候補 */
function openDayAdd(date) {
  const last = items.length ? [...items].sort((a, b) => (a.date < b.date ? 1 : -1))[0] : null;
  ledger.dayAdd = { date, draft: { ...blank(), date, method: last && METHODS.includes(last.method) ? last.method : METHODS[0] } };
  ledger.editId = null;
  ledger.draft = null;
  dayFold.delete(date);
  saveDayFold();
  render();
  const f = document.querySelector(`.addf[data-a="${date}"]`);
  if (f) {
    const hd = (document.querySelector(".appbar")?.offsetHeight || 56) + ($("lhead")?.offsetHeight || 0) + 8;
    const day = f.previousElementSibling || f;
    scrollBy(0, day.getBoundingClientRect().top - hd);
    f.querySelector('[data-af="amount"]')?.focus({ preventScroll: true });
  }
}
function saveDayAdd() {
  const x = ledger.dayAdd && ledger.dayAdd.draft;
  if (!x || !(x.amount > 0) || !x.date) {
    toast("金額と日付を入れてください");
    return;
  }
  const nw = runRules([{ ...x, id: uid() }]);
  items = items.concat(nw.out);
  nw.out.forEach(learn);
  save();
  if (!inPeriod(x.date, view.month)) view.month = FIN.periodOf(x.date);
  ledger.dayAdd = null;
  toast(`${md(x.date)} に ${yen(x.amount)} を追加しました${nw.changed ? "（ルールで変更）" : ""}`);
  render();
}
function clickLedger(t, d) {
  if (d.dadd) {
    UI.calcClose();
    openDayAdd(d.dadd);
  } else if (d.dfold) {
    if (ledger.sel.size) {
      const ids = ledger.shown.filter(i => i.date === d.dfold),
        all = ids.every(i => ledger.sel.has(i.id));
      ids.forEach(i => (all ? ledger.sel.delete(i.id) : ledger.sel.add(i.id)));
    } else if (t.hasAttribute("aria-expanded")) {
      dayFold.has(d.dfold) ? dayFold.delete(d.dfold) : dayFold.add(d.dfold);
      saveDayFold();
    } else return true;
    render();
  } else if (d.asave) {
    saveDayAdd();
  } else if (d.acancel) {
    ledger.dayAdd = null;
    render();
  } else if (d.del) {
    if (!arm(d.del, t, "もう一度押すと削除")) deleteItem(d.del);
  } else if (ledger.sel.size && d.day) {
    const ids = ledger.shown.filter(i => i.date === d.day),
      all = ids.every(i => ledger.sel.has(i.id));
    ids.forEach(i => (all ? ledger.sel.delete(i.id) : ledger.sel.add(i.id)));
    render();
  } else if (d.memo !== undefined) {
    const row = t.closest(".rv");
    if (row && row.dataset.a && ledger.dayAdd) {
      ledger.dayAdd.draft.memo = d.memo;
      render();
    } else if (row && row.dataset.e && ledger.draft) {
      ledger.draft.memo = d.memo;
      render();
    }
  } else if (d.esave) {
    saveEdit();
  } else if (d.ecancel) {
    ledger.editId = null;
    ledger.draft = null;
    view.armed = null;
    render();
  } else if (d.edit) {
    const src = items.find(i => i.id === d.edit);
    if (src) {
      ledger.editId = d.edit;
      ledger.dayAdd = null;
      view.armed = null;
      ledger.draft = { ...src };
      render();
    }
  } else return false;
  return true;
}
/* 選んだ明細の操作（下部バー・詳細編集） */
function clickSelection(t) {
  if (t.id === "selend") {
    ledger.sel.clear();
    render();
  } else if (t.id === "qmerge") {
    mergeSel();
  } else if (t.id === "qrule") {
    ruleFromSel();
  } else if (t.id === "qdel") {
    if (!arm("qdel", t, "もう一度押すと" + ledger.sel.size + "件を削除")) deleteSel();
  } else if (t.id === "selpost") {
    openBulk();
  } else if (t.id === "bapply") {
    applyBulk();
  } else return false;
  return true;
}
/* グラフ：棒・項目を選ぶ、明細画面で見る */
function clickGraph(t, d) {
  if (d.gm) {
    graph.m = graph.m === d.gm ? "" : d.gm;
    renderGraph();
  } else if (d.gview !== undefined) {
    showInList(d.gview);
  } else if (d.g !== undefined) {
    graph.sel = d.g;
    graph.m = "";
    renderGraph();
  } else return false;
  return true;
}
/* 設定：項目の切り替えと分類ルール */
function clickRules(t, d) {
  if (d.stab) {
    setting.tab = d.stab;
    setting.merge = null;
    setting.preview = null;
    setting.edit = { rules: false, master: false, paym: false };
    renderRules();
    renderSettings();
    $("stBody").scrollTop = 0;
  } else if (d.rdel) {
    if (arm(d.rdel, t, "もう一度押すと削除")) return true;
    rules = rules.filter(r => r.id !== d.rdel);
    if (setting.preview && setting.preview.rid === d.rdel) setting.preview = null;
    if (setting.editRule === d.rdel) resetForm();
    saveRules();
    renderRules();
  } else if (d.rprev) {
    openPreview(d.rprev);
  } else if (d.rcancel) {
    setting.preview = null;
    renderRules();
  } else if (d.rgo) {
    applyPreview();
  } else if (d.pvall) {
    const pv = setting.preview;
    if (!pv) return true;
    const allOn = pv.off.size === 0;
    pv.rows.forEach(r => (allOn ? pv.off.add(r.it.id) : pv.off.delete(r.it.id)));
    renderRules();
  } else if (t.classList && t.classList.contains("pvr")) {
    const pv = setting.preview;
    if (pv) {
      pv.off.has(d.pv) ? pv.off.delete(d.pv) : pv.off.add(d.pv);
      renderRules();
    }
  } else if (d.redit) {
    startEdit(d.redit);
  } else if (t.id === "rfcancel") {
    resetForm();
    renderRules();
  } else if (t.id === "radd") {
    saveRuleForm();
  } else if (t.id === "rundo") {
    undoForRules();
  } else return false;
  return true;
}
/* 設定：マスタ */
function clickMaster(t, d) {
  if (d.mk) {
    setting.kind = d.mk;
    setting.merge = null;
    setM("");
    renderMaster();
  } else if (d.mdel !== undefined) {
    mDelete(+d.mdel, t);
  } else if (d.mcok) {
    const c = setting.merge;
    setting.merge = null;
    if (c) mRenameApply(c.kind, c.old, c.nn);
  } else if (d.mcno) {
    setting.merge = null;
    render();
  } else if (t.id === "maddb") {
    mAdd();
  } else return false;
  return true;
}

/* ---------- 選択・入力欄の変更 ---------- */
document.addEventListener("change", e => {
  if (e.target.closest(".pay, #st-pay")) return;
  const t = e.target,
    d = t.dataset || {},
    v = t.value;
  if (t.id === "month") {
    setBarMonth(v);
  } else if (d.af === "category" && ledger.dayAdd) {
    ledger.dayAdd.draft.category = v;
    render();
  } else if (t.id === "qc") {
    quickSet("category", v);
  } else if (t.id === "qm") {
    quickSet("method", v);
  } else if (t.id === "gby") {
    graph.by = v;
    graph.sel = "";
    renderGraph();
  } else if (t.id === "gper") {
    graph.per = v;
    renderGraph();
  } else if (t.id === "gsel") {
    graph.sel = v;
    renderGraph();
  } else if (d.rauto) {
    const r = rules.find(x => x.id === d.rauto);
    if (r) {
      r.auto = t.checked;
      saveRules();
    }
  } else if (t.id === "rk") {
    rkUpdate();
  } else if (d.mn !== undefined) {
    mRename(+d.mn, v);
  } else if (d.me !== undefined) {
    const x = MASTER[setting.kind][+d.me];
    if (x) {
      x.e = v.trim() || "🏷️";
      saveMaster();
      render();
    }
  }
});

/* ---------- 文字の入力 ---------- */
document.addEventListener("input", e => {
  if (e.target.closest(".pay, #st-pay")) return;
  const t = e.target,
    d = t.dataset || {};
  const val = f => (f === "amount" ? Math.round(Number(t.value) || 0) : t.value);
  if (t.id === "fq") {
    ledger.filter.q = t.value;
    render();
  } else if (d.ef && ledger.draft) {
    /* 明細の編集フォーム */
    ledger.draft[d.ef] = val(d.ef);
  } else if (d.af && ledger.dayAdd) {
    /* 日付の行の＋で開いた入力欄 */
    ledger.dayAdd.draft[d.af] = val(d.af);
  }
});

/* ---------- Enter：マスタの名前・アイコンは確定、追加欄は追加、明細の編集フォームは保存 ---------- */
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" || e.isComposing || e.keyCode === 229) return;
  if (e.target.closest && e.target.closest(".pay, #st-pay")) return;
  const t = e.target,
    d = t.dataset || {};
  if (d.mn !== undefined || d.me !== undefined) {
    e.preventDefault();
    t.blur();
  } else if (t.id === "maddn") {
    e.preventDefault();
    mAdd();
  } else if (d.af) {
    const b = document.querySelector("[data-asave]");
    if (b) {
      e.preventDefault();
      b.click();
    }
  } else if (d.ef) {
    const b = document.querySelector("[data-esave]");
    if (b) {
      e.preventDefault();
      b.click();
    }
  }
});

/* ---------- トップへ戻る：1画面ぶん下に進んだら出す ---------- */
(() => {
  const b = $("toTop");
  let raf = 0;
  const upd = () => {
    raf = 0;
    const show = scrollY > innerHeight * 0.9;
    b.classList.toggle("hide", !show);
    b.tabIndex = show ? 0 : -1;
    b.setAttribute("aria-hidden", String(!show));
  };
  addEventListener(
    "scroll",
    () => {
      if (!raf) raf = requestAnimationFrame(upd);
    },
    { passive: true },
  );
  b.addEventListener("click", () =>
    scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }),
  );
  upd();
})();

/* ===================== 支払いから呼ぶ関数 ===================== */
Object.assign(FIN.kb, {
  render,
  setTab,
  settingsOpen,
  /* その月度に現金で払った額（支払いの「残るお金」から引く） */
  cashIn: p => sumOf(items.filter(i => i.method === FIN.CASH && inPeriod(i.date, p))),
});

/* ===================== 起動 ===================== */
/* 端末内の控えから開く（クラウドに接続する前の表示に使う） */
{
  const m = lsGet(KMS, null);
  MASTER = m ? normMaster(m) : null;
}
if (!MASTER) MASTER = { cats: CATS.map(mkE), mets: METHODS.map(mkE) };
applyMaster();
rules =
  lsRaw(KR) === null
    ? [] // はじめて開いたとき
    : lsGet(KR, []);
if (!Array.isArray(rules)) rules = [];
rules = rules.map(normRule).filter(Boolean);
rkUpdate();
{
  const t = lsRaw(KTAB) || "list";
  view.tab = t === "cats" ? "graph" : ["list", "graph", "home", "balance"].includes(t) ? t : "list"; // cats は以前の画面名
}
setSidebar(lsRaw(KSBC) === "1");
setAnFold(lsRaw(KANF) === "1");
paintTheme();
setTab(view.tab);
load();
items.forEach(learn);
render();
if (restored) setMsg("バックアップから" + restored + "件を復元しました。");
initSync();
