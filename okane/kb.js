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
const AN = ["graph", "balance", "ai"]; // 分析にまとめた画面

/* ---------- 決まった数字 ---------- */
const RETRY_MS = 8000; // 送信に失敗したら、この時間のあとに再試行
const TOMB_LIMIT = 40; // 月の文書の削除の印がこれを超えたら、丸ごと書き直す
const TOAST_MS = 2500, // 通知を出しておく時間
  TOAST_UNDO_MS = 8000; // 「元に戻す」つきの通知を出しておく時間
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
  tab: "list", // list / graph / ai / rules（スマホの設定画面）
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
  pending: [], // 追加前の確認に並んでいる明細
};
/* グラフ画面 */
const graph = { by: "category", per: "3", sel: "", m: "" }; // 集計の単位・期間・絞り込んだ項目・選んだ月/日
/* 設定 */
const setting = {
  tab: "rules", // rules / master / data
  kind: "cats", // マスタの種類 cats / mets
  merge: null, // マスタの統合の確認 {kind, old, nn}
  preview: null, // 既存データへの適用の対象一覧 {rid, rows, off}
  editRule: null, // 編集中のルールのID
};
let aiAbort = null; // AI分析を中止するための AbortController

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
let readErr = false; // 明細の読み込みでエラーが出た
let col = null, // data/users/<id> のコレクション
  live = false; // 最初の読み込みが終わった
let shown = {}, // shown[月] = {明細ID: 内容}：クラウドにある（または送信済みの）内容
  fmt2 = {}, // その月の文書が新形式か
  tomb = {}, // その月の文書にある削除の印の数
  rShown = null, // クラウドにあるルール・マスタ（比べて、違うときだけ送る）
  mShown = null;
const pend = {}, // 文書ごとの送信中の数
  chains = {}, // 文書ごとの送信の順番待ち
  failed = new Set(); // 送信に失敗した文書
let retryT = null;
const busyKey = k => (pend[k] || 0) > 0 || failed.has(k);
function saveKnown() {
  lsSet(KNOWN, Object.keys(shown));
}
function setSync(t) {
  const e = $("sync");
  if (e) e.textContent = "同期: " + t;
}
function paintSync() {
  if (!col) return;
  const n = Object.values(pend).reduce((s, v) => s + v, 0);
  setSync(n ? "保存中…" : failed.size ? "送信に失敗。自動で再試行します" : "同期済み（リアルタイム）");
  FIN.pay.paintSave && FIN.pay.paintSave();
}
const syncState = () =>
  !col ? "ok" : failed.size || readErr ? "err" : Object.values(pend).some(v => v > 0) ? "busy" : "ok";
function write(key, fn) {
  pend[key] = (pend[key] || 0) + 1;
  paintSync();
  chains[key] = (chains[key] || Promise.resolve())
    .then(fn)
    .then(
      () => {
        failed.delete(key);
      },
      () => {
        failed.add(key);
        clearTimeout(retryT);
        retryT = setTimeout(retry, RETRY_MS);
      },
    )
    .finally(() => {
      pend[key]--;
      paintSync();
      if (!busyKey(key) && key.startsWith("m-")) refetch(key);
    });
  return chains[key];
}
async function refetch(key) {
  // 送信中に届いた他端末の変更を取りこぼさないよう、送信後に読み直す
  try {
    const d = await col.doc(key).get();
    if (busyKey(key)) return;
    applyMonth(key.slice(2), d.exists ? d.data() : null, true);
  } catch (e) {}
}
function retry() {
  [...failed].forEach(k => {
    failed.delete(k);
    if (k === "rules") rShown = null;
    else if (k === "master") mShown = null;
    else {
      delete shown[k.slice(2)];
      fmt2[k.slice(2)] = false;
    }
  });
  queuePush();
}
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
    write(key, () => col.doc(key).delete());
    return;
  }
  shown[m] = cur;
  if (!prev || !fmt2[m] || (tomb[m] || 0) > TOMB_LIMIT) {
    // 文書がない・旧形式・削除の印が多い → 丸ごと書き直す
    fmt2[m] = true;
    tomb[m] = 0;
    const all = Object.fromEntries(Object.entries(cur).map(([id, j]) => [id, JSON.parse(j)]));
    write(key, () => col.doc(key).set({ v: 2, items: all }));
  } else write(key, () => col.doc(key).update({ items: diff }));
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
    write("rules", () => col.doc("rules").set({ rules: d }));
  }
  const mjs = cj(MASTER);
  if (mjs !== mShown) {
    mShown = mjs;
    const d = JSON.parse(mjs);
    write("master", () => col.doc("master").set({ master: d }));
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
    setSync("接続中…");
    col.onSnapshot(onRemote, e => {
      readErr = true;
      setSync("読み込みエラー（" + ((e && e.code) || "error") + "）。開き直してください");
      FIN.pay.paintSave && FIN.pay.paintSave();
    });
  } catch (e) {
    setSync("利用できません（この端末のみ保存）");
  }
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
    if (busyKey("m-" + m)) return; // 送信中・送信失敗の月は自分の内容を優先（送信後に読み直す）
    if (applyMonth(m, remote[m] || null, false)) changed = true;
  });
  if (rr && !busyKey("rules")) {
    rShown = cj(rr);
    const nr = rr.map(normRule).filter(Boolean);
    if (cj(nr) !== cj(rules)) {
      rules = nr;
      changed = true;
    }
  }
  if (mr && !busyKey("master")) {
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
  paintSync();
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

/* ---------- メモ候補・AI分析 ---------- */
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
function aiData(n) {
  let ms = [];
  for (let k = n - 1; k >= 0; k--) ms.push(shiftM(view.month, -k));
  const has = new Set(items.map(i => FIN.periodOf(i.date)));
  while (ms.length && !has.has(ms[0])) ms.shift();
  if (!ms.length) return null;
  const set = new Set(ms),
    P = items.filter(i => set.has(FIN.periodOf(i.date))),
    cur = thisPeriod(),
    nm = ms.length;
  const months = ms.map(m => {
    const a = P.filter(i => inPeriod(i.date, m)),
      bc = {},
      bm = {};
    a.forEach(i => {
      bc[i.category] = (bc[i.category] || 0) + i.amount;
      bm[i.method] = (bm[i.method] || 0) + i.amount;
    });
    const [ps, pe] = FIN.periodRange(m);
    const o = {
      month: FIN.periodLabel(m),
      range: `${ps}〜${pe}`,
      total: sumOf(a),
      count: a.length,
      byCategory: bc,
      byMethod: bm,
    };
    if (m === cur) o.note = `月度の途中（${FIN.dayIndex(today(), m) + 1}/${FIN.periodDays(m)}日時点）`;
    return o;
  });
  const cats = {};
  P.forEach(i => {
    const c = cats[i.category] || (cats[i.category] = { category: i.category, total: 0, count: 0, under1000yen: 0 });
    c.total += i.amount;
    c.count++;
    if (i.amount < 1000) c.under1000yen++;
  });
  const memo = {};
  P.forEach(i => {
    const k = (i.memo || "(メモなし)") + "|" + i.category;
    const o = memo[k] || (memo[k] = { memo: i.memo || "(メモなし)", category: i.category, count: 0, total: 0 });
    o.count++;
    o.total += i.amount;
  });
  const wd = {};
  P.forEach(i => {
    const w = "日月火水木金土"[dow(i.date)];
    wd[w] = (wd[w] || 0) + i.amount;
  });
  return {
    period: `${FIN.periodLabel(ms[0])}〜${FIN.periodLabel(ms[nm - 1])}（${nm}か月度）`,
    monthCount: nm,
    months,
    categories: Object.values(cats)
      .map(c => ({ ...c, monthlyAvg: Math.round(c.total / nm) }))
      .sort((a, b) => b.total - a.total),
    topShops: Object.values(memo)
      .sort((a, b) => b.total - a.total)
      .slice(0, 40),
    byWeekday: wd,
    rules: rules.filter(r => r.kind === "split").map(r => `${r.from}が${r.amt}円以上なら${r.amt}円を${r.to}に自動分割`),
  };
}
/* AIに渡す指示。spend＝明細（生活費）の集計、debt＝支払い（返済）の集計。どちらかが無くてもよい */
function aiPrompt(spend, debt, goal) {
  return `あなたは日本の家計と債務整理に詳しいファイナンシャルプランナーです。以下は日本在住の一人の利用者のデータ（円）です。
spending は家計簿に記録した日々の支出（生活費）の月度ごとの集計、debt はクレジットカード・消費者金融などの返済の状況です。
月度は給料日から次の給料日の前日までの期間です。debt.this_period.left_after_payments は「手取り − 今月度の支払予定 − 今月度の現金の支出」です。
このデータだけを根拠に、生活費で無理なく減らせる余地と、完済を早める打ち手を、具体的な金額つきでまとめてください。

方針:
- 日本語。本人に話しかける、落ち着いた前向きな口調。責めない、説教しない。ただし数字は正直に。
- 数字はデータから計算できるものだけを使う。推測した数字には「約」「目安」と付ける。
- 生活費の削減額は「月度あたりの現実的な見込み額」（円の整数）。生活の質を大きく下げる案や、全額ゼロにする案は避ける。根拠（月度平均・回数・店名など）を短く示す。
- 返済の打ち手は効果の大きい順に。生活費で浮いた分をどの口座に回すと良いかも示す。手取りと今月度の残りのお金から無理のない額にする。
- 利息が返済の大半を占める口座や、返済額が利息以下で残高が減らない口座があれば必ず触れる。
- 途中の月度（noteがある月度）は、月度全体の金額として扱わない。
- 法律・投資の助言や、新しい借入・おまとめローンの勧誘はしない。
${goal ? `- 本人の目標・関心: 「${goal}」。これに沿って優先順位をつける。\n` : ""}
出力はJSONのみ（データが無い側の項目は空の配列にする）:
{"headline":"一文の結論（40字以内）","summary":"全体の状況と見通し（3〜4文）","savings":[{"title":"見出し","category":"関係する分類名","monthly_saving":3000,"confidence":"高|中|低","why":"根拠（データの数字を含める）","actions":["行動案1","行動案2"]}],"debt_actions":[{"title":"打ち手（20字以内）","detail":"やり方と理由（1〜2文）","effect":"効果の目安（例: 完済が約8ヶ月早く／利息 約6万円減）"}],"outlook":[{"when":"いつ（例: 2027年10月）","text":"その時点で起きること（1文）"}],"trends":[{"title":"支出の傾向の見出し","detail":"説明"}],"watch":["気をつける点（1文）"],"cheer":"最後のひとこと（1文）"}
savingsは削減額の大きい順に3〜6件、debt_actionsは3〜4件、outlookは時系列で3〜5件、trendsは2〜4件、watchは1〜3件。

データ:
${JSON.stringify({ spending: spend, debt })}`;
}
/* 分析した時のデータと今のデータが違うかを見分ける印（日付や、月度の途中の日数だけの違いは無視する） */
function aiKey(spend, debt) {
  const sp = spend && { ...spend, months: spend.months.map(m => ({ ...m, note: undefined })) };
  const dk = debt && FIN.pay.aiHash ? FIN.pay.aiHash(debt) : "";
  const t = JSON.stringify(sp) + "|" + dk;
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return String(h);
}
/* いま分析に使うデータ（返済中の口座が無ければ debt は null） */
function aiInput() {
  const n = Number($("aiper").value) || 6;
  const spend = aiData(n);
  const d = FIN.pay.aiData && FIN.pay.ready && FIN.pay.ready() ? FIN.pay.aiData() : null;
  const debt = d && d.accounts && d.accounts.length ? d : null;
  return { spend, debt };
}
/* ===================== 描画 ===================== */
/* ---------- 画面の切り替え ---------- */
function setTab(t) {
  if (t === "an") t = AN.includes(lsRaw(KAN)) ? lsRaw(KAN) : "graph"; // 分析は前回の画面を開く
  if (t === "rules" && isWide()) {
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
  FIN.pay.show && FIN.pay.show(t === "home" || t === "balance" ? t : "none");
}
/* 下のメニュー・左メニュー・分析の切り替えで、いまの画面に印をつける（分析の3画面では「分析」にも） */
function markTabs(t) {
  markCurrent(".tabbar [data-tab], .sb [data-tab], .anseg [data-tab]", "tab", t);
  /* スマホの上の帯：今いる画面のアイコン（左メニューと同じもの） */
  const key = t === "rules" ? "gear" : AN.includes(t) ? "an" : t;
  const ic = document.querySelector(`.sb .mic.${key}`);
  const hc = $("hcur");
  if (hc && ic) hc.innerHTML = ic.innerHTML;
  document
    .querySelectorAll('[data-tab="an"]')
    .forEach(b => (AN.includes(t) ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
}
/* PC：左メニューの折りたたみ */
function setSidebar(c) {
  document.body.classList.toggle("sbc", c);
  const b = $("sbtog");
  b.textContent = c ? "»" : "«";
  b.setAttribute("aria-label", c ? "メニューを開く" : "メニューを折りたたむ");
}
function gearPressed(v) {
  $("gear").setAttribute("aria-pressed", v);
  $("sbgear").setAttribute("aria-pressed", v);
}
function openRules() {
  closePanels();
  $("rulepanel").hidden = false;
  $("rbk").hidden = false;
  gearPressed("true");
  renderRules();
  renderSettings();
}
function closePanels() {
  $("rulepanel").hidden = true;
  $("bulk").hidden = true;
  $("rbk").hidden = true;
  setting.preview = null;
  gearPressed(String(view.tab === "rules" && !isWide()));
}

/* ---------- 全体・メッセージ ---------- */
/* fromAll：FIN.renderAll から呼ばれたとき（支払いの画面はそちらで描く） */
function render(fromAll) {
  $("month").innerHTML = periodChoices()
    .map(m => `<option value="${m}"${m === view.month ? " selected" : ""}>${FIN.periodLabel(m)}</option>`)
    .join("");
  $("mcur").disabled = view.month === thisPeriod();
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
  renderReview();
  if (!fromAll && (view.tab === "home" || view.tab === "balance") && FIN.pay.render) FIN.pay.render(); // 現金の支出が変わる
}
/* 月度の選択肢：明細・支払いのある月度から、いまの12か月度先まで（新しい順に最大120） */
function periodChoices() {
  const cur = thisPeriod();
  const all = [
    view.month,
    cur,
    ...items.map(i => FIN.periodOf(i.date)),
    ...(FIN.pay.months ? FIN.pay.months() : []),
  ].sort();
  const hi = [shiftM(cur, 12), view.month].sort().pop();
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
  U.toast(t, { undo: undo ? undoLast : null, ms: undo ? TOAST_UNDO_MS : TOAST_MS });
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
  $("summary").innerHTML =
    `<div class="sumtop"><div><div class="eyebrow">${FIN.periodLabel(view.month)}の支出<span class="rng">${md(ps)}〜${md(pe)}</span></div><div class="total">${yen(sum)}</div></div>${delta}</div>` +
    (sum
      ? `<div class="stack" role="img" aria-label="分類の内訳">${top.map(([c, v]) => `<span title="${esc(c)} ${yen(v)}（${Math.round((v / sum) * 100)}%）" style="flex:${v};background:${bcol(c)}"></span>`).join("")}</div>
    <div class="legend">${top.map(([c, v]) => `<span><i style="background:${bcol(c)}"></i>${emo(c)} ${esc(c)} <b class="num">${Math.round((v / sum) * 100)}%</b></span>`).join("")}</div>`
      : `<div class="mu mt10">この月度の明細はまだありません。「＋ 手入力」から追加してください。</div>`) +
    `<div class="kpis"><div><span>件数</span><b>${mi.length}件</b></div><div><span>1日平均</span><b>${yen(Math.round(sum / days))}</b></div><div><span>前月</span><b>${yen(psum)}</b></div></div>` +
    (meths.length
      ? `<div class="meths">${meths.map(([k, v]) => `<span class="chip out" style="${hs(k)}">${emo(k)} ${esc(k)} <b class="num">${yen(v)}</b></span>`).join("")}</div>`
      : "");
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
  $("fc").innerHTML = iconOpts(CATS, ledger.filter.c, "すべての分類");
  $("fm").innerHTML = iconOpts(METHODS, ledger.filter.m, "すべての支払い方法");
  $("fsum").innerHTML =
    ledger.filter.q || ledger.filter.c || ledger.filter.m
      ? `<div class="row sp mt6"><span>絞り込み: ${fl.length}件 / 合計 <b class="num">${yen(sumOf(fl))}</b></span><button class="ghost" id="fclear">解除</button></div>`
      : "";
  ledger.shown = fl;
  let html = "",
    last = "";
  fl.forEach(i => {
    if (i.date !== last) {
      last = i.date;
      const w = dow(i.date);
      html += `<div data-day="${i.date}" class="day ${["sun", "", "", "", "", "", "sat"][w]}"><span>${i.date.slice(5).replace("-", "/")} <small>（${"日月火水木金土"[w]}）</small></span><span>${yen(sumOf(fl.filter(x => x.date === i.date)))}</span></div>`;
    }
    html +=
      i.id === ledger.editId
        ? editForm(i)
        : `<div class="it${ledger.sel.has(i.id) ? " on" : ""}" data-edit="${i.id}"><input type="checkbox" class="ck" data-ck="${i.id}" aria-label="選択"${ledger.sel.has(i.id) ? " checked" : ""}>${ico(i.category)}<div class="itm"><div class="memo">${esc(i.memo || i.category)}</div><div class="tag">${chip(i.category)}${mchip(i.method)}</div></div><span class="amt">${yen(i.amount)}</span></div>`;
  });
  $("list").innerHTML = html || '<div class="mu empty">明細なし</div>';
}
function editForm(i) {
  return `<div class="rv" data-e="${i.id}">
  <input type="date" data-ef="date" value="${esc(ledger.draft.date)}" aria-label="日付">
  <input type="number" data-ef="amount" value="${ledger.draft.amount}" inputmode="numeric" aria-label="金額">
  <select data-ef="category" aria-label="分類">${opts(CATS, ledger.draft.category)}</select>
  <select data-ef="method" aria-label="支払い方法">${opts(METHODS, ledger.draft.method)}</select>
  ${memoChips(ledger.draft.category, ledger.draft.memo)}<input class="full" type="text" data-ef="memo" list="memos" value="${esc(ledger.draft.memo)}" placeholder="メモ（上の候補から選ぶか入力）">
  <div class="row sp full"><button class="ghost" data-del="${i.id}">削除</button><div class="row"><button class="ghost" data-ecancel="1">キャンセル</button><button class="pri" data-esave="1">保存</button></div></div></div>`;
}
function renderReview() {
  if (!ledger.pending.length) {
    $("review").innerHTML = "";
    return;
  }
  $("review").innerHTML =
    `<div class="row sp mt12"><b>内容を確認（${ledger.pending.length}件）</b><button class="ghost" id="clr">破棄</button></div>` +
    ledger.pending
      .map((p, k) => {
        const dup = items.some(i => i.date === p.date && i.amount === p.amount && (i.memo || "") === (p.memo || ""));
        return `<div class="rv${dup ? " dup" : ""}" data-k="${k}">
  <input type="date" data-f="date" value="${esc(p.date)}" aria-label="日付">
  <input type="number" data-f="amount" value="${p.amount}" inputmode="numeric" aria-label="金額">
  <select data-f="category" aria-label="分類">${opts(CATS, p.category)}</select>
  <select data-f="method" aria-label="支払い方法">${opts(METHODS, p.method)}</select>
  ${memoChips(p.category, p.memo)}<input class="full" type="text" data-f="memo" list="memos" value="${esc(p.memo)}" placeholder="メモ（上の候補から選ぶか入力）">
  <div class="row sp full"><span class="warn">${dup ? "同じ日付・金額の記録があります" : ""}</span><button class="ghost" data-rm="${k}">この行を外す</button></div></div>`;
      })
      .join("") +
    `<button class="pri wide" id="ok">${ledger.pending.length}件を追加</button>`;
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

/* ---------- AI分析 ---------- */
function renderAI() {
  const r = FIN.ai,
    out = $("aiout");
  const d = r && (r.data || r.result); // result は支払管理だったころの形
  if (!d) {
    out.innerHTML =
      '<div class="ail mt12"><div><b>まだ分析していません</b>期間を選んで「分析する」を押すと、1分ほどで結果が出ます。結果はアカウントに保存され、ほかの端末でもすぐ表示されます。</div></div>';
    $("aimeta").textContent = "";
    return;
  }
  const { spend, debt } = aiInput();
  const stale = r.hash && r.hash !== aiKey(spend, debt);
  const list = a => (Array.isArray(a) ? a : []).filter(x => x && (x.title || typeof x === "string"));
  const sv = list(d.savings),
    acts = list(d.debt_actions || d.actions),
    tl = (Array.isArray(d.outlook) ? d.outlook : []).filter(x => x && x.when),
    tot = sv.reduce((s, x) => s + Math.max(0, Math.round(Number(x.monthly_saving) || 0)), 0);
  $("aimeta").innerHTML =
    esc(
      new Date(r.at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    ) +
    " に分析" +
    (stale ? '<span class="aistale">・データが変わっています</span>' : "");
  const L = a =>
    list(a)
      .map(x =>
        typeof x === "string" ? `<div>${esc(x)}</div>` : `<div><b>${esc(x.title)}</b>${esc(x.detail || "")}</div>`,
      )
      .join("");
  const hero =
    `<div class="aihero"><div class="k">${esc(r.period || "")} の分析${r.goal ? ` ・ 目標「${esc(r.goal)}」` : ""}</div>` +
    (sv.length ? `<div class="v">月 ${yen(tot)} <span class="unit">ほど削減の余地</span></div>` : "") +
    `<p><b>${esc(d.headline || "")}</b></p>${d.summary ? `<p class="mt6">${esc(d.summary)}</p>` : ""}</div>`;
  const saving = sv.length
    ? `<div class="aih">生活費で減らせそうな項目</div><div class="svgrid">${sv
        .map(x => {
          const c = String(x.category || "");
          return `<div class="sv">${ico(CATS.includes(c) || METHODS.includes(c) ? c : "その他")}<div class="cell"><div class="t"><b>${esc(x.title)}</b><span class="save">月 −${yen(Math.max(0, Math.round(Number(x.monthly_saving) || 0)))}</span></div><div class="row meta">${c ? chip(c) : ""}${x.confidence ? `<span class="conf">確度 ${esc(x.confidence)}</span>` : ""}</div><p>${esc(x.why || "")}</p>${Array.isArray(x.actions) && x.actions.length ? `<ul>${x.actions.map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}</div></div>`;
        })
        .join("")}</div>`
    : "";
  const debtActs = acts.length
    ? `<div class="aih">完済を早める打ち手</div><div class="svgrid">${acts
        .map(
          (x, k) =>
            `<div class="sv"><span class="ai-n">${k + 1}</span><div class="cell"><div class="t"><b>${esc(x.title)}</b></div><p>${esc(x.detail || "")}</p>${x.effect ? `<span class="ai-eff">${esc(x.effect)}</span>` : ""}</div></div>`,
        )
        .join("")}</div>`
    : "";
  const outlook = tl.length
    ? `<div class="aih">このままいくと</div><ol class="ai-tl">${tl.map(x => `<li><b>${esc(x.when)}</b><span>${esc(x.text || "")}</span></li>`).join("")}</ol>`
    : "";
  out.innerHTML =
    hero +
    saving +
    debtActs +
    outlook +
    (L(d.trends) ? `<div class="aih">支出の傾向</div><div class="ail">${L(d.trends)}</div>` : "") +
    (L(d.watch) ? `<div class="aih">気をつけたいこと</div><div class="ail">${L(d.watch)}</div>` : "") +
    (d.cheer ? `<p class="ai-cheer">${esc(d.cheer)}</p>` : "") +
    `<div class="mu mt14">AIによる提案です。金額は記録された明細と返済条件からの見込みで、実際の効果を保証するものではありません。実際の請求額はカード会社の明細で確かめてください。</div>`;
}

/* ---------- 設定：項目の切り替え・マスタ ---------- */
function renderSettings() {
  markCurrent("[data-stab]", "stab", setting.tab);
  $("st-rules").hidden = setting.tab !== "rules";
  $("st-master").hidden = setting.tab !== "master";
  $("st-pay").hidden = setting.tab !== "pay";
  if (setting.tab === "master") renderMaster();
  if (setting.tab === "pay" && FIN.pay.renderSettings) FIN.pay.renderSettings();
}
/* 設定のその項目を開いているか（支払いの設定を描き直すかどうか） */
const settingsOpen = tab => setting.tab === tab && (!$("rulepanel").hidden || view.tab === "rules");
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
  markCurrent("[data-mk]", "mk", setting.kind);
  const L = MASTER[setting.kind];
  $("maddn").placeholder = setting.kind === "cats" ? "新しい分類の名前" : "新しい支払い方法の名前";
  $("mlist").innerHTML = L.map((x, i) => {
    const u = mUse(setting.kind, x.n),
      used = u.c + u.r > 0;
    return `<div class="mrow${used ? " used" : ""}"><input type="text" class="me" data-me="${i}" value="${esc(x.e)}" maxlength="4" style="${hs(x.n)}" aria-label="${esc(x.n)}のアイコン"><input type="text" class="mn" data-mn="${i}" value="${esc(x.n)}" aria-label="名前"><div class="mv"><button data-mup="${i}" aria-label="上へ"${i ? "" : " disabled"}>↑</button><button data-mdn="${i}" aria-label="下へ"${i < L.length - 1 ? "" : " disabled"}>↓</button></div><button class="ghost mdel" data-mdel="${i}"${used ? ` title="使用中のため削除できません" aria-disabled="true"` : ""}>削除</button><div class="info"><span class="cnt">明細 ${u.c}件${u.r ? ` ・ ルール ${u.r}件` : ""}</span></div></div>`;
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
function renderRules() {
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
    <div class="acts"><button data-rprev="${r.id}">既存データに適用…</button><button class="ghost" data-redit="${r.id}">編集</button><button class="ghost" data-rdel="${r.id}">削除</button></div>
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

/* ---------- スクショから追加・手入力 ---------- */
async function shrink(f) {
  try {
    const bmp = await createImageBitmap(f);
    const s = Math.min(1, 1400 / bmp.width);
    const W = Math.round(bmp.width * s),
      H = Math.round(bmp.height * s),
      SL = 2000,
      out = [];
    for (let y = 0; y < H; y += SL - 100) {
      const h = Math.min(SL, H - y);
      const c = document.createElement("canvas");
      c.width = W;
      c.height = h;
      c.getContext("2d").drawImage(bmp, 0, y / s, bmp.width, h / s, 0, 0, W, h);
      out.push(await new Promise(r => c.toBlob(b => r(b), "image/jpeg", 0.88)));
      if (y + h >= H) break;
    }
    return out.slice(0, 4);
  } catch (e) {
    return [f];
  }
}
async function analyze(files) {
  const sample = await (window.claude ? claude.use("sample") : Promise.resolve(null)).catch(() => null);
  if (!sample) {
    setMsg("この環境ではスクショ読み取りを利用できません。手入力をお使いください。", 1);
    return;
  }
  const lim = await sample.limits().catch(() => null);
  if (!lim || !lim.images) {
    setMsg("画像の読み取りが許可されていません。", 1);
    return;
  }
  const max = lim.images.maxCount || lim.images.max || 8;
  const list = [...files].slice(0, max);
  setMsg("読み取り中…（" + list.length + "枚）");
  $("shot").disabled = true;
  try {
    const prompt = `添付画像は家計の支出に関するスクリーンショット（カード明細、決済アプリの履歴、レシート、ネットバンキング等）です。支出を1件ずつ抜き出してください。
今日の日付は${today()}です。年が書かれていない日付は直近の過去の日付として補ってください。
分類は次から1つ選ぶ: ${MASTER.cats.map(x => x.n).join("、")}
支出方法は次から1つ選ぶ: ${MASTER.mets.map(x => x.n).join("、")}
返金・入金・チャージ・残高表示は除外。同じ取引が複数画像に重複していたら1件にまとめる。
金額は円の整数。メモには店名・サービス名を短く入れる。
JSON配列のみで返答: [{"date":"YYYY-MM-DD","amount":1234,"category":"${MASTER.cats[0] ? MASTER.cats[0].n : ""}","method":"${MASTER.mets[0] ? MASTER.mets[0].n : ""}","memo":"店名"}]`;
    let all = [],
      fails = [],
      raw = [];
    for (let n = 0; n < list.length; n++) {
      setMsg("読み取り中… " + (n + 1) + "/" + list.length);
      try {
        const blobs = await shrink(list[n]);
        const r = await sample.json(prompt, { images: blobs, modelTier: "default", cache: false });
        const L = Array.isArray(r)
          ? r
          : r && typeof r === "object"
            ? Object.values(r).find(Array.isArray) || (r.amount != null ? [r] : [])
            : [];
        raw.push(JSON.stringify(r).slice(0, 200));
        all = all.concat(L);
      } catch (e) {
        fails.push((e && e.code) || "error");
        if (e && (e.code === "not_granted" || e.code === "rate_limited")) break;
      }
    }
    const arr = all
      .map(r => ({
        date: /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : today(),
        amount: Math.round(Number(String(r.amount).replace(/[^\d.-]/g, "")) || 0),
        category: CATS.includes(r.category) ? r.category : orFirst(CATS, "日用品"),
        method: METHODS.includes(r.method) ? r.method : orFirst(METHODS, "現金"),
        memo: String(r.memo || "").slice(0, 60),
      }))
      .filter(r => r.amount > 0);
    const fm = fails.length ? "（" + fails.length + "枚失敗: " + [...new Set(fails)].join(",") + "）" : "";
    if (!arr.length) {
      setMsg(
        (fails.length ? "読み取りに失敗しました" : "支出が見つかりませんでした") +
          fm +
          (!fails.length && raw.length ? " 応答: " + raw[0] : ""),
        1,
      );
    } else {
      ledger.pending = ledger.pending.concat(arr);
      setMsg(arr.length + "件を読み取りました。" + fm + "内容を確認して追加してください。", fails.length ? 1 : 0);
    }
  } catch (e) {
    setMsg("読み取りに失敗しました（" + ((e && e.code) || "error") + "）", 1);
  } finally {
    $("shot").disabled = false;
    renderReview();
  }
}
/* 手入力の初期値：マスタの先頭の分類・支払い方法 */
function blank() {
  return { date: today(), amount: 0, category: CATS[0], method: METHODS[0], memo: "" };
}
/* 名前がマスタにあればそれを、なければマスタの先頭を使う */
const orFirst = (list, name) => (list.includes(name) ? name : list[0]);
function addPending() {
  const good = ledger.pending.filter(p => p.amount > 0 && p.date);
  const nw = runRules(good.map(p => ({ ...p, id: uid() })));
  items = items.concat(nw.out);
  save();
  if (good[0])
    view.month = FIN.periodOf(
      good
        .map(p => p.date)
        .sort()
        .pop(),
    );
  ledger.pending = [];
  setMsg(good.length + "件を追加しました" + (nw.changed ? "（ルールで" + nw.changed + "件を変更）" : "") + "。");
  render();
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
  $("fq").value = "";
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
  setting.tab = "rules";
  if (isWide()) openRules();
  else setTab("rules");
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
  ledger.pending.forEach(p => {
    if (p[f] === old) p[f] = nn;
  });
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
function mMove(i, d) {
  const L = MASTER[setting.kind],
    j = i + d;
  if (j < 0 || j >= L.length) return;
  [L[i], L[j]] = [L[j], L[i]];
  applyMaster();
  saveMaster();
  render();
  const b = document.querySelector(`[data-m${d < 0 ? "up" : "dn"}="${j}"]`);
  if (b && !b.disabled) b.focus();
}
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

/* ---------- AI分析 ---------- */
async function runAI() {
  const goal = $("aigoal").value.trim().slice(0, 200),
    { spend, debt } = aiInput(),
    out = $("aiout");
  if (!spend && !debt) {
    out.innerHTML =
      '<div class="err mt12">分析できるデータがありません。先に明細か返済中の口座を登録してください。</div>';
    return;
  }
  const sample = await (window.claude ? claude.use("sample") : Promise.resolve(null)).catch(() => null);
  if (!sample) {
    out.innerHTML =
      '<div class="err mt12">この環境ではAI分析を利用できません。Claudeのアプリ内でこのページを開いてください。</div>';
    return;
  }
  aiAbort = new AbortController();
  const t0 = Date.now();
  $("airun").disabled = true;
  out.innerHTML = `<div class="aiwait"><i></i><span id="aisec">分析中…</span><button class="ghost" id="aistop">中止</button></div>`;
  const tick = setInterval(() => {
    const e = $("aisec");
    if (e) e.textContent = "分析中… " + Math.round((Date.now() - t0) / 1000) + "秒（1分ほどかかります）";
  }, 1000);
  try {
    const res = await sample.json(aiPrompt(spend, debt, goal), {
      modelTier: "complex",
      cache: false,
      signal: aiAbort.signal,
    });
    if (!res || typeof res !== "object" || Array.isArray(res)) throw { code: "invalid_json" };
    const period = spend ? spend.period : FIN.periodLabel(view.month);
    const o = { at: new Date().toISOString(), period, goal, hash: aiKey(spend, debt), data: res };
    if (FIN.pay.saveAI) FIN.pay.saveAI(o);
    else FIN.ai = o;
    renderAI();
  } catch (e) {
    const c = e && e.code;
    const m =
      c === "cancelled"
        ? "分析を中止しました。"
        : c === "not_granted" || c === "sampling_disabled" || c === "not_declared" || c === "capability_disabled"
          ? "Claudeの利用が許可されなかったため、分析できませんでした。"
          : c === "rate_limited"
            ? "短時間に使いすぎたため、少し時間をおいてからもう一度押してください。"
            : c === "invalid_json" || c === "empty_completion"
              ? "結果をうまく読み取れませんでした。もう一度「分析する」を押してください。"
              : "分析に失敗しました（" + (c || "error") + "）。もう一度お試しください。";
    renderAI();
    out.insertAdjacentHTML("afterbegin", `<div class="${c === "cancelled" ? "mu" : "err"} mt12">${m}</div>`);
  } finally {
    clearInterval(tick);
    $("airun").disabled = false;
    aiAbort = null;
  }
}

/* ===================== イベント ===================== */
/* ---------- クリック：画面ごとの処理に振り分ける。各処理は、受け持ったら true を返す ---------- */
/* ---------- スマホ：☰メニューの開閉と右下の＋ ---------- */
function setDrawer(on) {
  document.body.classList.toggle("drawer", on);
  const b = document.querySelector(".hmenu");
  if (b) b.setAttribute("aria-expanded", on);
}
document.addEventListener("click", e => {
  const dr = e.target.closest("[data-drawer]");
  if (dr) {
    setDrawer(dr.dataset.drawer === "open");
    return;
  }
  if (document.body.classList.contains("drawer") && e.target.closest(".sb [data-tab], .sb #sbgear")) setDrawer(false);
});
/* スワイプ：メニューが開いていれば、どこで左にスワイプしても閉じる。画面の左端から右へスワイプすると開く（それ以外の横スワイプでは何もしない） */
(() => {
  let s0 = null;
  document.addEventListener("touchstart", e => {
    if (e.touches.length !== 1 || !matchMedia("(max-width:899px)").matches) return (s0 = null);
    const t = e.touches[0];
    s0 = { x: t.clientX, y: t.clientY, at: Date.now() };
  }, { passive: true });
  document.addEventListener("touchend", e => {
    if (!s0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s0.x, dy = t.clientY - s0.y, x = s0.x, quick = Date.now() - s0.at < 700;
    s0 = null;
    if (!quick || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) return;
    const open = document.body.classList.contains("drawer");
    if (open && dx < 0) setDrawer(false);
    else if (!open && dx > 0 && x < 28) setDrawer(true);
  }, { passive: true });
  matchMedia("(max-width:899px)").addEventListener("change", () => setDrawer(false));
})();
document.addEventListener("click", e => {
  if (e.target.closest(".pay, #st-pay")) return; // 支払いの部品は pay.js が受け持つ
  if (clickListCheck(e)) return;
  const t = e.target.closest("button,[data-edit],[data-day],[data-memo],[data-gm],[data-g],.pvr") || e.target;
  const d = t.dataset || {};
  [clickHeader, clickAdd, clickLedger, clickSelection, clickGraph, clickAI, clickRules, clickMaster].some(
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
  if (d.tab) {
    setTab(d.tab);
    window.scrollTo(0, 0);
  } else if (t.id === "mprev" || t.id === "mnext") {
    view.month = shiftM(view.month, t.id === "mprev" ? -1 : 1);
    render();
  } else if (t.id === "mcur") {
    view.month = thisPeriod();
    render();
  } else if (t.id === "sbtog") {
    const c = !document.body.classList.contains("sbc");
    setSidebar(c);
    lsSet(KSBC, c ? "1" : "", true);
  } else if (t.id === "gear" || t.id === "sbgear") {
    if (!isWide() && view.tab === "rules") setTab(view.prevTab);
    else setTab("rules");
    window.scrollTo(0, 0);
  } else if (t.id === "rclose" && view.tab === "rules" && !isWide()) {
    setTab(view.prevTab);
    window.scrollTo(0, 0);
  } else if (t.id === "rclose" || t.id === "rbk" || t.id === "bclose") {
    closePanels();
  } else if (t.id === "syncnow") {
    if (live) retry();
    else setSync("接続中です…");
  } else return false;
  return true;
}
/* 明細：スクショ・手入力の追加と、追加前の確認 */
function clickAdd(t, d) {
  if (t.id === "shot") {
    $("file").click();
  } else if (t.id === "manual") {
    ledger.pending.push(blank());
    renderReview();
    setMsg("");
  } else if (d.rm) {
    ledger.pending.splice(+d.rm, 1);
    renderReview();
  } else if (t.id === "clr") {
    ledger.pending = [];
    setMsg("");
    renderReview();
  } else if (t.id === "ok") {
    addPending();
  } else return false;
  return true;
}
/* 明細：絞り込みの解除・その場の編集・削除・メモ候補 */
function clickLedger(t, d) {
  if (t.id === "fclear") {
    ledger.filter = { q: "", c: "", m: "" };
    $("fq").value = "";
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
    if (row && row.dataset.e && ledger.draft) {
      ledger.draft.memo = d.memo;
      render();
    } else if (row && row.dataset.k !== undefined && ledger.pending[+row.dataset.k]) {
      ledger.pending[+row.dataset.k].memo = d.memo;
      renderReview();
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
function clickAI(t) {
  if (t.id === "airun") {
    runAI();
  } else if (t.id === "aistop") {
    if (aiAbort) aiAbort.abort();
  } else return false;
  return true;
}
/* 設定：項目の切り替えと分類ルール */
function clickRules(t, d) {
  if (d.stab) {
    setting.tab = d.stab;
    setting.merge = null;
    renderSettings();
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
  } else if (d.mup !== undefined) {
    mMove(+d.mup, -1);
  } else if (d.mdn !== undefined) {
    mMove(+d.mdn, 1);
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
    view.month = v;
    render();
  } else if (t.id === "file") {
    const fs = [...t.files];
    t.value = "";
    if (fs.length) analyze(fs);
  } else if (t.id === "fc") {
    ledger.filter.c = v;
    render();
  } else if (t.id === "fm") {
    ledger.filter.m = v;
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
  } else if (d.f) {
    /* 追加前の確認の行 */
    const row = t.closest(".rv");
    if (row) ledger.pending[+row.dataset.k][d.f] = val(d.f);
  } else if (d.ef && ledger.draft) {
    /* 明細の編集フォーム */
    ledger.draft[d.ef] = val(d.ef);
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
  } else if (d.ef) {
    const b = document.querySelector("[data-esave]");
    if (b) {
      e.preventDefault();
      b.click();
    }
  }
});

window.addEventListener("online", () => {
  if (live) retry();
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
  renderAI,
  syncState,
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
  view.tab = t === "cats" ? "graph" : ["list", "graph", "home", "balance", "ai"].includes(t) ? t : "list"; // cats は以前の画面名
}
setSidebar(lsRaw(KSBC) === "1");
setTab(view.tab);
load();
items.forEach(learn);
render();
if (restored) setMsg("バックアップから" + restored + "件を復元しました。");
renderAI();
initSync();
