/* ===================== 支払い（支払管理だった部分） =====================
  家計簿の画面（kb.js）とは FIN（fin.js）を通してやりとりする。ここで決めた名前は外に出ない */
(() => {
  /* ===================== 定数 ===================== */
  /* 口座の区分。l＝正式名、s＝一覧の短い名前。COLS は「お金の流れ」に並べる区分（個人からの借入は「その他」に入れる） */
  const CAT = {
    card: { l: "クレジットカード", s: "カード" },
    loan: { l: "消費者金融", s: "消費者金融" },
    other: { l: "その他", s: "その他" },
    personal: { l: "個人からの借入", s: "個人" },
  };
  const COLS = ["card", "loan", "other"];
  const MGMT_START = "2026-10-01"; // この日以降の支払から管理
  const DEFAULT_PAYDAY = 25; // 給料日の既定値（設定で変えられる）
  const DEFAULT_ACC_DAY = 27; // 口座の支払日の既定値
  const REGEN_MONTHS = 36; // 支払予定を作り直す期間（月）
  const SCHEDULE_MAX = 600; // 返済予定表を計算する最大の回数
  const TOAST_MS = 5200, // 通知を出しておく時間
    TOAST_UNDO_MS = 8000; // 「元に戻す」つきの通知を出しておく時間
  const KFOLD = "shiharai.fold"; // 折りたたみの開閉（この端末だけに保存）
  const FOLD_DEF = { outlook: false, once: true, int: true, road: true, "g-personal": true, "g-other": true }; // true＝最初は閉じておく

  /* ===================== 状態 ===================== */
  const S = {
    accounts: {}, // 口座 {口座ID: 口座}（クラウドの accounts/）
    months: {}, // 支払 {"YYYY-MM": {items: [...]}}（クラウドの months/）
    cfg: { methods: ["口座引落", "振込", "カード"], income: 0, payday: DEFAULT_PAYDAY }, // 設定（config/master）
    ai: null, // AIの分析結果（config/ai）
    sched: {}, // 口座ごとの返済予定表（描画のたびに計算し直す）
    _base: null, // 「もしも」の比べる元（データが変わったら捨てる）
    view: "none", // home / balance（家計簿の画面を開いているときは none）
    filter: "all", // 一覧の絞り込み all / unpaid / late
    sim: { extra: 0, strat: "rate" }, // 「毎月あと少し返せたら」
    ad: null, // 開いている口座の画面 {id, tab, from, val, pp}
    fold: {}, // 折りたたみの開閉
    aiBusy: false,
    aiOff: false, // AIが使えない環境
    aiErr: null,
    db: null,
    dbFail: false,
    loaded: { a: false, m: false },
    pending: {}, // 月ごとの保存中の数（保存中の月は、届いたクラウドの内容で上書きしない）
    busy: 0, // 保存中の数
    svErr: false,
    svAt: null, // 最後に保存した時刻
  };
  /* 表示中の月度は家計簿と共通（FIN.period） */
  Object.defineProperty(S, "period", { get: () => FIN.period, set: v => (FIN.period = v) });
  FIN.paydayNum = () => S.cfg.payday || DEFAULT_PAYDAY;
  /* 画面の部品の状態 */
  const ui = {
    lockY: null, // シートを開く前のスクロール位置
    narrow: innerWidth < 640, // グラフをスマホ向けに描いているか
    awT: null, // 返済計画の入力を待つタイマー
  };

  /* ===================== 小さな関数 ===================== */
  const $ = id => document.getElementById(id);
  const yen = v =>
    v == null || v === "" || isNaN(v) ? "—" : (v < 0 ? "-¥" : "¥") + Math.abs(Math.round(v)).toLocaleString("ja-JP");
  const man = v => (v >= 10000 ? (Math.round(v / 1000) / 10).toLocaleString("ja-JP") + "万" : yen(v));
  const esc = U.esc;
  const { pad, ds, pd, today, addMonths } = FIN; // 日付の小さな関数は fin.js と共通
  const ymOf = s => s.slice(0, 7);
  const md = s => {
    const d = pd(s);
    return d.getMonth() + 1 + "/" + d.getDate();
  };
  const wd = s => "日月火水木金土"[pd(s).getDay()];
  const ymLabel = ym => {
    const [y, m] = ym.split("-");
    return y + "年" + Number(m) + "月";
  };
  const daysIn = (y, m) => new Date(y, m, 0).getDate(); // m: 1-12
  // 支払日が土日なら翌平日（請求の月は bm に持つ）
  const bizDay = s => {
    const d = pd(s);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return ds(d);
  };
  const bmOf = i => i.bm || ymOf(i.date);
  const uid = () => "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const numOrNull = v => (v === "" || v == null ? null : Number(v));
  const opt = (list, val) =>
    list
      .map(
        ([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val ?? "") ? "selected" : ""}>${esc(l)}</option>`,
      )
      .join("");
  const mopt = v =>
    opt(
      [...new Set([...S.cfg.methods, ...(v ? [v] : [])])].map(m => [m, m]),
      v,
    );
  /* 「2回押す」方式の削除（confirm() が使えないため）。1回目は文字を変えて false を返す */
  function armed(btn, label) {
    if (btn.dataset.sure) return true;
    btn.dataset.sure = 1;
    btn.textContent = label;
    return false;
  }

  /* ===================== 計算（画面は変えない） ===================== */
  /* ---------- 給料日サイクル（計算は fin.js。家計簿と共通） ---------- */
  const payday = FIN.paydayOf,
    periodOf = FIN.periodOf,
    periodRange = FIN.periodRange,
    periodLabel = FIN.periodLabel;

  /* ---------- データの取り出し ---------- */
  const accList = () =>
    Object.entries(S.accounts)
      .map(([id, a]) => ({ id, ...a }))
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const debtAccs = () => accList().filter(a => a.active !== false && a.repayType && a.repayType !== "none");
  function allItems() {
    const out = [];
    for (const [ym, doc] of Object.entries(S.months)) (doc.items || []).forEach(it => out.push({ ...it, _m: ym }));
    return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
  function itemsIn(s, e) {
    return allItems().filter(i => i.date >= s && i.date <= e);
  }
  function findItem(id) {
    for (const [ym, doc] of Object.entries(S.months)) {
      const i = (doc.items || []).findIndex(x => x.id === id);
      if (i >= 0) return { ym, i, it: doc.items[i] };
    }
    return null;
  }
  const catOf = it => it.category || S.accounts[it.accountId]?.category || "other";
  const colOf = it => {
    const c = catOf(it);
    return c === "personal" ? "other" : c;
  };
  const isDebt = a => !!(a && a.repayType && a.repayType !== "none");
  const amtOf = i => (i.status === "paid" ? (i.paidAmount ?? i.amount) : i.amount) || 0;
  const byDateAmt = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : amtOf(b) - amtOf(a));
  const incomeOf = p => S.cfg.incomeBy?.[p] ?? S.cfg.income ?? 0;
  function lateCount(aid) {
    const from = ds(new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate()));
    return allItems().filter(
      i =>
        i.accountId === aid &&
        i.date >= from &&
        i.date <= today() &&
        (i.status === "deferred" || (i.kind === "late" && !i.origin)),
    ).length;
  }
  const typeLabel = a =>
    a.repayType === "principal"
      ? `元金定額 ${yen(a.principalPay)}＋利息`
      : a.repayType === "level"
        ? `元利定額 ${yen(a.payment)}`
        : "定額・利息なし";

  /* ---------- 利息と返済予定表 ---------- */
  function interestFor(bal, rate, date) {
    const d = pd(date);
    const pm = new Date(d.getFullYear(), d.getMonth(), 0);
    return Math.floor((((bal * (rate || 0)) / 100) * pm.getDate()) / 365);
  }
  /* 延滞分の元の期日（延滞手数料＝遅延損害金は、この日から払う日までの日数で計算する） */
  function dueOf(it) {
    if (!it) return null;
    if (it.kind !== "late") return it.date;
    if (it.dueDate) return it.dueDate;
    const o = it.origin && findItem(it.origin);
    return o ? dueOf(o.it) : null;
  }
  const daysBetween = (a, b) => Math.max(0, Math.round((pd(b) - pd(a)) / 864e5));
  function lateFeeFor(base, rate, due, payDate) {
    if (!base || !rate || !due || !payDate) return 0;
    return Math.floor((((base * rate) / 100) * daysBetween(due, payDate)) / 365);
  }
  const lateOf = mv => ("lateFee" in mv ? { lateFee: mv.lateFee, lateFeeManual: mv.lateFeeManual } : {});
  function nextStart() {
    return payday(addMonths(periodOf(today()), 1));
  }
  function stepVal(a, ym) {
    let v = a.repayType === "principal" ? a.principalPay || 0 : a.payment || 0;
    (a.steps || [])
      .filter(x => x.from <= ym)
      .sort((x, y) => (x.from < y.from ? -1 : 1))
      .forEach(x => (v = x.value));
    return v;
  }
  function schedule(a, opt = {}) {
    if (!a || !a.balance || a.balance <= 0 || !a.repayType || a.repayType === "none")
      return { rows: [], stalled: false };
    // 今期までに登録済みの未払と延滞分を先に反映し、次の給料日以降は残高・年利・口座の設定の条件で計算する
    const from = nextStart();
    const ev = allItems().filter(
      i =>
        i.accountId === a.id &&
        i.status === "planned" &&
        i.id !== opt.skip &&
        i.kind !== "late" &&
        (i.date < from || i.manual),
    );
    const slot = ym => {
      const [y, m] = ym.split("-").map(Number);
      return bizDay(`${ym}-${pad(Math.min(a.payDay || DEFAULT_ACC_DAY, daysIn(y, m)))}`);
    };
    let ym = ymOf(from);
    if (slot(ym) < from) ym = addMonths(ym, 1);
    let bal = a.balance,
      rows = [],
      stalled = false,
      e = 0;
    const applyEv = i => {
      if (bal <= 0) return;
      const interest = i.interest ?? interestFor(bal, a.rate, i.date);
      let pr = i.principal;
      if (pr == null) {
        if (i.kind === "late") return;
        pr = (i.amount || 0) - (a.extra || 0) - interest;
      }
      pr = Math.max(0, Math.min(bal, pr));
      rows.push({
        date: i.date,
        before: bal,
        interest,
        principal: pr,
        payment: pr + interest,
        after: bal - pr,
        fixed: true,
        late: i.kind === "late",
      });
      bal -= pr;
    };
    for (let n = 0; n < SCHEDULE_MAX && bal > 0; n++) {
      const d = slot(ym);
      while (e < ev.length && ev[e].date <= d) applyEv(ev[e++]);
      if (bal <= 0) break;
      const interest = interestFor(bal, a.rate, d);
      const sv = stepVal(a, ym);
      let pr = a.repayType === "principal" ? sv : sv - interest;
      if (pr <= 0) {
        stalled = true;
        break;
      }
      pr = Math.min(pr, bal);
      rows.push({ date: d, bm: ym, before: bal, interest, principal: pr, payment: pr + interest, after: bal - pr });
      bal -= pr;
      ym = addMonths(ym, 1);
    }
    while (e < ev.length && bal > 0) applyEv(ev[e++]);
    return { rows, stalled };
  }
  function computeSched() {
    S.sched = {};
    debtAccs().forEach(a => (S.sched[a.id] = schedule(a)));
  }
  function payoffInfo(a) {
    const s = S.sched[a.id] || { rows: [] };
    const r = s.rows;
    if (!r.length) return null;
    const last = r[r.length - 1];
    return { months: r.length, end: last.date, interest: r.reduce((t, x) => t + x.interest, 0), stalled: s.stalled };
  }
  function monthsLeftAfter(a, principalPaid, skip) {
    const fake = { ...a, balance: Math.max(0, (a.balance || 0) - (principalPaid || 0)) };
    if (fake.balance <= 0) return { months: 0, end: null };
    const s = schedule(fake, { skip });
    const r = s.rows;
    return { months: r.length, end: r.length ? r[r.length - 1].date : null, stalled: s.stalled };
  }
  // 次の給料日以降の支払予定を、口座ごとの返済予定表から作り直す（延滞分・支払済・手入力の口座なしの支払はそのまま）
  function regenFuture(ids, months = REGEN_MONTHS) {
    const from = nextStart();
    const lim = addMonths(ymOf(from), months);
    const accs = debtAccs().filter(a => !ids || ids.includes(a.id));
    const set = new Set(accs.map(a => a.id));
    if (ids) ids.forEach(id => set.add(id));
    const touched = new Set();
    for (const [ym, doc] of Object.entries(S.months)) {
      if (ym < ymOf(from)) continue;
      const items = doc.items || [];
      const keep = items.filter(
        i => !(set.has(i.accountId) && i.kind !== "late" && i.status === "planned" && !i.manual && i.date >= from),
      );
      if (keep.length !== items.length) {
        S.months[ym] = { items: keep };
        touched.add(ym);
      }
    }
    for (const a of accs) {
      const rows = schedule(a).rows;
      const done = new Set();
      const keptBM = new Set(
        allItems()
          .filter(i => i.accountId === a.id && i.kind !== "late")
          .map(bmOf),
      ); // 支払済・翌月へずらした月は作らない
      rows
        .filter(r => !r.fixed && r.date >= from && r.bm < lim)
        .forEach(r => {
          done.add(r.bm);
          if (keptBM.has(r.bm)) return;
          touched.add(
            putItem({
              id: uid(),
              name: a.name,
              accountId: a.id,
              category: a.category,
              kind: "normal",
              amount: r.payment + (a.extra || 0),
              principal: r.principal,
              interest: r.interest,
              other: a.extra || 0,
              balanceBefore: r.before,
              date: r.date,
              bm: r.bm,
              method: a.method || "",
              status: "planned",
              memo: "",
              applied: false,
              source: "plan",
            }),
          );
        });
      // 家賃などの「それ以外の支払額」は、リボを完済したあとも毎月続ける
      if (a.extra > 0) {
        const day = a.payDay || DEFAULT_ACC_DAY;
        let ym = ymOf(from);
        for (; ym < lim; ym = addMonths(ym, 1)) {
          const [y, m] = ym.split("-").map(Number);
          const d = bizDay(`${ym}-${pad(Math.min(day, daysIn(y, m)))}`);
          if (d < from || done.has(ym) || keptBM.has(ym)) continue;
          touched.add(
            putItem({
              id: uid(),
              name: a.name,
              accountId: a.id,
              category: a.category,
              kind: "normal",
              amount: a.extra,
              principal: 0,
              interest: 0,
              other: a.extra,
              balanceBefore: 0,
              date: d,
              bm: ym,
              method: a.method || "",
              status: "planned",
              memo: "",
              applied: false,
              source: "plan",
            }),
          );
        }
      }
    }
    return [...touched].sort();
  }
  /* 家賃などの返済以外の請求は完済後も続くので含めない */
  function regPay(a) {
    const r = (S.sched[a.id]?.rows || []).find(x => !x.fixed);
    return r ? r.payment : a.repayType === "level" ? a.payment || 0 : a.principalPay || 0;
  }
  function prepayImpact(a, amt) {
    const base = payoffInfo(a);
    if (!base || !a.balance) return null;
    const x = Math.min(amt, a.balance);
    const after = { ...a, balance: a.balance - x };
    if (after.balance <= 0) return { a, x, months: base.months, interest: base.interest, done: true, base };
    const s = schedule(after);
    const r = s.rows;
    const int = r.reduce((t, y) => t + y.interest, 0);
    return {
      a,
      x,
      months: base.months - r.length,
      interest: base.interest - int,
      end: r.length ? r[r.length - 1].date : null,
      base,
    };
  }

  /* ---------- 集計 ---------- */
  function periodStats(p) {
    const [s, e] = periodRange(p);
    const its = itemsIn(s, e);
    let t = 0,
      paid = 0,
      late = 0,
      def = 0,
      np = 0,
      n = 0;
    its.forEach(i => {
      if (i.status === "deferred") {
        def += i.amount || 0;
        return;
      }
      n++;
      t += i.amount || 0;
      if (i.status === "paid") {
        paid += (i.paidAmount ?? i.amount) || 0;
        np++;
      }
      if (i.kind === "late") late += i.amount || 0;
    });
    return { p, s, e, its, t, paid, unpaid: t - paid, late, def, n, np };
  }
  function outlookData() {
    const acc = debtAccs().filter(a => a.balance > 0);
    const start = ymOf(nextStart());
    const rows = acc.map(a => {
      const r = S.sched[a.id]?.rows || [];
      const first = r.find(x => !x.fixed) || r[0];
      return {
        a,
        r,
        end: r.length && r[r.length - 1].after === 0 ? ymOf(r[r.length - 1].date) : null,
        months: r.length,
        pay: first ? first.payment : 0,
        int: first ? first.interest : 0,
        stalled: !!S.sched[a.id]?.stalled,
      };
    });
    const balAt = ym =>
      rows.reduce((t, x) => {
        let v = x.a.balance;
        for (const r of x.r) {
          if (ymOf(r.date) <= ym) v = r.after;
          else break;
        }
        return t + v;
      }, 0);
    const now = rows.reduce((t, x) => t + x.a.balance, 0);
    const last = rows.filter(x => x.end).sort((x, y) => (x.end < y.end ? 1 : -1))[0];
    const curPay = rows.reduce((t, x) => t + x.pay, 0),
      curInt = rows.reduce((t, x) => t + x.int, 0);
    const y1 = balAt(addMonths(start, 11));
    const marks = [];
    for (const k of [12, 24, 36, 60]) {
      const ym = addMonths(start, k - 1);
      if (!last || ym <= last.end) marks.push({ k, ym, bal: balAt(ym) });
    }
    const next = rows.filter(x => x.end).sort((x, y) => (x.end < y.end ? -1 : 1));
    return { rows, now, last, curPay, curInt, y1, marks, next, start };
  }
  function simulate(extra, strat) {
    const accs = debtAccs()
      .filter(a => a.balance > 0)
      .map(a => ({
        id: a.id,
        name: a.name,
        rate: a.rate || 0,
        type: a.repayType,
        pp: a.principalPay || 0,
        pay: a.payment || 0,
        bal: a.balance,
        pri: a.priority ?? 99,
        start: a.balance,
      }));
    const order = [...accs].sort(
      strat === "rate"
        ? (x, y) => y.rate - x.rate || x.bal - y.bal
        : strat === "small"
          ? (x, y) => x.bal - y.bal
          : (x, y) => x.pri - y.pri,
    );
    const minPay = (a, int) => (a.type === "principal" ? Math.min(a.pp, a.bal) + int : Math.min(a.pay, a.bal + int));
    // 予算 = 最初の月の最低返済合計 + 追加
    const t0 = today();
    let ym = addMonths(ymOf(t0), 1);
    const budget0 = accs.reduce((s, a) => s + minPay(a, Math.floor((((a.bal * a.rate) / 100) * 30) / 365)), 0) + extra;
    const series = [],
      done = {};
    let totalInt = 0;
    for (let k = 0; k < 480; k++) {
      const live = order.filter(a => a.bal > 0);
      if (!live.length) break;
      const [y, m] = ym.split("-").map(Number);
      const days = daysIn(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1);
      let budget = budget0;
      // 最低返済
      for (const a of live) {
        const int = Math.floor((((a.bal * a.rate) / 100) * days) / 365);
        totalInt += int;
        let p = Math.min(minPay(a, int), Math.max(0, budget));
        const pr = Math.max(0, Math.min(a.bal, p - int));
        a.bal -= pr;
        budget -= p;
      }
      // 余り（完済した口座の分＋追加返済）を優先口座へ
      for (const a of order) {
        if (budget <= 0) break;
        if (a.bal <= 0) continue;
        const pr = Math.min(a.bal, budget);
        a.bal -= pr;
        budget -= pr;
      }
      order.forEach(a => {
        if (a.bal <= 0 && !done[a.id]) done[a.id] = ym;
      });
      series.push({ ym, bal: order.reduce((s, a) => s + a.bal, 0) });
      ym = addMonths(ym, 1);
    }
    return { series, done, totalInt, end: series.length ? series[series.length - 1].ym : null, order, budget: budget0 };
  }
  function simulateBase() {
    // 口座ごとに今の条件のまま（計画は使わない、繰上げなし）
    const accs = debtAccs().filter(a => a.balance > 0);
    let totalInt = 0,
      end = null;
    const done = {};
    const sch = accs.map(a => {
      const s = schedule(a);
      s.rows.forEach(r => (totalInt += r.interest));
      if (s.rows.length) {
        done[a.id] = ymOf(s.rows[s.rows.length - 1].date);
        if (!end || done[a.id] > end) end = done[a.id];
      } else if (s.stalled) end = "2066-12";
      return { a, rows: s.rows };
    });
    // 残高系列（月ごとの合計）
    const start = addMonths(ymOf(today()), 1);
    const series = [];
    if (end) {
      let ym = start;
      let guard = 0;
      while (ym <= end && guard++ < 480) {
        let t = 0;
        sch.forEach(({ a, rows }) => {
          let row = null;
          for (const r of rows) {
            if (ymOf(r.date) <= ym) row = r;
            else break;
          }
          t += row ? row.after : rows.length ? a.balance : a.balance;
        });
        series.push({ ym, bal: t });
        ym = addMonths(ym, 1);
      }
    }
    return { series, done, totalInt, end };
  }

  /* ---------- 金額の内訳（リボ支払額／それ以外） ---------- */
  function splitOf(it, a) {
    // 支払額（支払済なら実際に払った額）を リボ支払額＝元金＋利息 と それ以外 に分ける。合計は必ず支払額に一致させる
    // 延滞手数料は元金にも利息にも入れない（支払額から先に除いて分ける）
    const amt = Math.max(0, ((it.status === "paid" ? (it.paidAmount ?? it.amount) : it.amount) || 0) - (it.lateFee || 0));
    let p = it.principal,
      i = it.interest,
      o = it.other;
    if (p != null && i != null) {
      if (o == null) o = Math.max(0, amt - p - i);
      let d = amt - (p + i + o);
      if (d > 0) o += d;
      else if (d < 0) {
        const cut = Math.min(o, -d);
        o -= cut;
        d += cut;
        if (d < 0) {
          const ci = Math.min(i, -d);
          i -= ci;
          d += ci;
        }
        if (d < 0) p = Math.max(0, p + d);
      }
    } else {
      // 内訳が入っていない支払（Notionから取り込んだ延滞分など）：口座の毎月のリボ支払額までをリボ、残りをそれ以外として扱う
      const bal = it.balanceBefore ?? a.balance ?? 0;
      const ym = bmOf(it);
      i = interestFor(bal, a.rate, it.date);
      const reg = a.repayType === "principal" ? stepVal(a, ym) + i : stepVal(a, ym);
      if (o == null) o = Math.max(0, amt - reg);
      const revo = Math.max(0, amt - o);
      i = Math.min(i, revo);
      p = revo - i;
    }
    return { amount: amt, principal: p, interest: i, other: o };
  }

  /* ---------- 支払の追加・削除（S.months の中だけ。保存は別） ---------- */
  function putItem(it) {
    const ym = ymOf(it.date);
    if (!S.months[ym]) S.months[ym] = { items: [] };
    const arr = [...(S.months[ym].items || [])];
    const i = arr.findIndex(x => x.id === it.id);
    if (i >= 0) arr[i] = it;
    else arr.push(it);
    arr.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    S.months[ym] = { items: arr };
    return ym;
  }
  function dropItem(id) {
    const f = findItem(id);
    if (!f) return null;
    S.months[f.ym] = { items: S.months[f.ym].items.filter(x => x.id !== id) };
    return f.ym;
  }
  // 「元に戻す」用に、変更前の月と口座を控える
  function snapOf(yms, ids) {
    const m = {},
      a = {};
    [...new Set(yms || [])]
      .filter(Boolean)
      .forEach(ym => (m[ym] = S.months[ym] ? { items: [...(S.months[ym].items || [])] } : null));
    [...new Set(ids || [])].filter(Boolean).forEach(id => (a[id] = S.accounts[id] ? { ...S.accounts[id] } : null));
    return { m, a };
  }

  /* ---------- AIに渡すデータ ---------- */
  function aiPayload() {
    const d = outlookData();
    const st = periodStats(periodOf(today()));
    const inc = incomeOf(st.p);
    const fixed = accList()
      .filter(a => a.active !== false && a.category !== "personal" && !isDebt(a) && (a.payment || a.extra))
      .map(a => ({ name: a.name, monthly: a.payment || a.extra }));
    return {
      today: today(),
      income_monthly_takehome: inc,
      this_period: {
        range: `${st.s}〜${st.e}`,
        total_due: st.t,
        paid: st.paid,
        unpaid: st.unpaid,
        late_items_amount: st.late,
        moved_to_next_month: st.def,
        cash_spending: cashOf(st.p),
        left_after_payments: inc - st.t - cashOf(st.p),
      },
      total_balance: d.now,
      monthly_repayment_total: d.curPay,
      monthly_interest_total: d.curInt,
      balance_in_12_months: d.y1,
      balance_marks: d.marks.map(m => ({ months_from_now: m.k, month: m.ym, balance: m.bal })),
      all_paid_off: d.last ? d.last.end : null,
      accounts: d.rows.map(x => ({
        name: x.a.name,
        type: CAT[x.a.category]?.l,
        balance: x.a.balance,
        annual_rate_pct: x.a.rate,
        repay: x.a.repayType === "principal" ? `元金定額${x.a.principalPay}円＋利息` : `元利定額${x.a.payment}円`,
        extra_charges_monthly: x.a.extra || 0,
        next_payment: x.pay,
        next_interest: x.int,
        payoff: x.end,
        months_left: x.months,
        interest_not_covered: x.stalled && !x.end,
        late_count_past_year: lateCount(x.a.id),
        limit: x.a.limit || null,
      })),
      other_fixed_payments: fixed,
    };
  }
  const aiHash = o => {
    const t = JSON.stringify({
      ...o,
      today: undefined,
      this_period: { ...o.this_period, paid: undefined, unpaid: undefined },
    });
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
    return String(h);
  };
  /* ===================== 保存 ===================== */
  const chains = {};
  /* 同じ文書への書き込みは順番に行う */
  function queue(path, fn) {
    chains[path] = (chains[path] || Promise.resolve()).then(fn, fn);
    return chains[path];
  }
  function paintSave() {
    const el = $("saveSt");
    if (!el) return;
    let c, t;
    if (!S.db) {
      c = S.dbFail ? "err" : "wait";
      t = S.dbFail ? "保存できません" : "接続中…";
    } else if (S.busy > 0) {
      c = "busy";
      t = "保存中…";
    } else if (S.svErr) {
      c = "err";
      t = "未保存あり";
    } else if (!S.loaded.m) {
      c = "wait";
      t = "読み込み中…";
    } else {
      c = "ok";
      t = "保存済み";
    }
    const k = FIN.kb.syncState ? FIN.kb.syncState() : "ok"; // 家計簿の明細の同期
    if (k === "err" && c !== "err") [c, t] = ["err", "未保存あり"];
    else if (k === "busy" && c === "ok") [c, t] = ["busy", "保存中…"];
    el.className = "savest " + c;
    el.textContent = t;
    el.title = S.svAt && c === "ok" ? `最後の保存 ${pad(S.svAt.getHours())}:${pad(S.svAt.getMinutes())}` : "";
    const sb = $("sbSave");
    if (sb) {
      sb.className = el.className;
      sb.textContent = t;
      sb.title = el.title;
    }
  }
  async function guard(fn) {
    if (!S.db) {
      status("保存先に接続できていないため、変更は保存されません。", true);
      paintSave();
      return false;
    }
    S.busy = (S.busy || 0) + 1;
    paintSave();
    try {
      await fn();
      status("");
      S.svErr = false;
      S.svAt = new Date();
      return true;
    } catch (e) {
      S.svErr = true;
      status(
        e?.code === "invalid_argument"
          ? "このページでは編集できません（閲覧のみ）。"
          : e?.code === "quota_exceeded"
            ? "保存容量の上限に達しました。古いデータを削除してください。"
            : "保存できませんでした。少し待ってからもう一度お試しください。",
        true,
      );
      return false;
    } finally {
      S.busy--;
      paintSave();
    }
  }
  /* 月の文書を書く（支払がなくなった月は文書ごと消す） */
  function writeMonth(ym, items) {
    return guard(() =>
      queue("months/" + ym, () =>
        items.length ? S.db.doc("months/" + ym).set({ items }) : S.db.doc("months/" + ym).delete(),
      ),
    );
  }
  function saveMonth(ym) {
    S._base = null;
    const items = S.months[ym]?.items || [];
    S.pending[ym] = (S.pending[ym] || 0) + 1;
    return writeMonth(ym, items).finally(() => {
      S.pending[ym]--;
    });
  }
  /* 複数の月を順に保存する（多いときは進み具合を出す） */
  async function saveMonths(list) {
    S._base = null;
    const payloads = list.map(ym => [ym, [...(S.months[ym]?.items || [])]]);
    payloads.forEach(([ym]) => (S.pending[ym] = (S.pending[ym] || 0) + 1));
    let ok = true,
      k = 0;
    for (const [ym, items] of payloads) {
      if (payloads.length > 3) status(`支払予定を保存しています… ${++k}/${payloads.length}`);
      ok = (await writeMonth(ym, items)) && ok;
      S.pending[ym]--;
    }
    if (ok) status("");
    return ok;
  }
  function saveAcc(id) {
    S._base = null;
    const d = { ...S.accounts[id] };
    return guard(() => queue("accounts/" + id, () => S.db.collection("accounts").doc(id).set(d)));
  }
  function deleteAcc(id) {
    return guard(() => queue("accounts/" + id, () => S.db.collection("accounts").doc(id).delete()));
  }
  function saveCfg() {
    return guard(() => queue("config/master", () => S.db.doc("config/master").set({ ...S.cfg })));
  }
  function saveAI(o) {
    S.ai = FIN.ai = o;
    if (S.view === "balance") renderAILink();
    return S.db ? guard(() => queue("config/ai", () => S.db.doc("config/ai").set(o))) : Promise.resolve(false);
  }
  function saveFold() {
    try {
      localStorage.setItem(KFOLD, JSON.stringify(S.fold));
    } catch (e) {}
  }
  function loadFold() {
    try {
      return { ...FOLD_DEF, ...JSON.parse(localStorage.getItem(KFOLD) || "{}") };
    } catch (e) {
      return { ...FOLD_DEF };
    }
  }

  /* ===================== 描画 ===================== */
  /* ---------- 全体・ヘッダー・画面の切り替え ---------- */
  function render() {
    computeSched();
    const view = {
      home: renderHome,
      balance: () => {
        renderBalance();
        renderOutlook();
        renderPlan();
      },
    }[S.view];
    if (view) view();
    if (FIN.kb.settingsOpen && FIN.kb.settingsOpen("pay")) renderMaster();
  }
  /* 家計簿のタブから呼ぶ：支払い（home）・残高と計画（balance）、それ以外は none */
  function show(v) {
    S.view = v;
    render();
  }
  function status(msg, err) {
    const el = $("status");
    el.hidden = !msg;
    el.textContent = msg || "";
    el.className = "status" + (err ? " err" : "");
    const pm = $("pmsg"); // 設定の「支払い」にも出す
    if (pm) {
      pm.textContent = msg || "";
      pm.className = "mu" + (err ? " err" : "");
    }
  }
  // undo: 変更前の状態（snapOf）を渡すと「元に戻す」ボタンを出す
  /* 通知は共通部品（U.toast）。undo に snapOf の結果を渡すと「元に戻す」で戻せる */
  function toast(html, undo) {
    U.toast(html, { html: true, undo: undo ? () => restoreSnap(undo) : null, ms: undo ? TOAST_UNDO_MS : TOAST_MS });
  }

  /* ---------- 支払い：アラート・次の引き落とし・集計 ---------- */
  function renderHome() {
    $("cNote").textContent =
      `集計期間は給料日（毎月${S.cfg.payday || DEFAULT_PAYDAY}日、土日の場合は直前の平日）から次の給料日の前日までです。家計簿の明細のうち支払い方法が「${FIN.CASH}」のものは、残るお金から引いています。`;
    $("hNext").innerHTML = nextHTML();
    $("hStats").innerHTML = statsHTML(periodStats(S.period));
    renderCycle();
  }
  function alertHTML() {
    const t = today();
    const all = allItems().filter(i => i.status === "planned" && i.date >= MGMT_START);
    const [, pe] = periodRange(periodOf(t));
    const over = all.filter(i => i.date < t),
      late = all.filter(i => i.kind === "late" && i.date >= t && i.date <= pe);
    if (!over.length && !late.length)
      return `<div class="okline">✓ 今月（${md(periodRange(periodOf(t))[0])}〜${md(periodRange(periodOf(t))[1])}）の延滞・期日超過はありません</div>`;
    const sum = a => a.reduce((s, i) => s + (i.amount || 0), 0);
    const row = (i, tag, cls) =>
      `<div class="arow"><span class="atag ${cls}">${tag}</span><span class="ad num">${md(i.date)}</span><button class="linkbtn an" data-edit="${i.id}">${esc(i.name)}</button><span class="aa num">${yen(i.amount)}</span><button class="primary sm" data-pay="${i.id}">支払う</button></div>`;
    return `<div class="alert" role="alert">
    <div class="alert-h"><span class="ico" aria-hidden="true">!</span><div><b>今月対応が必要な支払が ${over.length + late.length}件 あります</b><div class="note">${over.length ? `期日超過 ${yen(sum(over))}` : ""}${over.length && late.length ? " ・ " : ""}${late.length ? `延滞分の返済予定 ${yen(sum(late))}` : ""}</div></div></div>
    <div class="alert-list">${over.map(i => row(i, i.kind === "late" ? "延滞分・期日超過" : "期日超過", "over")).join("")}${late.map(i => row(i, "延滞分", "late")).join("")}</div>
  </div>`;
  }
  function nextHTML() {
    const t = today();
    const up = allItems()
      .filter(i => i.status === "planned" && i.date >= t && i.date >= MGMT_START)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (!up.length) return "";
    const d = up[0].date,
      same = up.filter(i => i.date === d),
      days = Math.round((pd(d) - pd(t)) / 864e5);
    if (days > 7) return "";
    const sum = a => a.reduce((s, i) => s + (i.amount || 0), 0);
    const byM = {};
    same.forEach(i => {
      if (i.method) byM[i.method] = (byM[i.method] || 0) + (i.amount || 0);
    });
    const wk = ds(new Date(pd(t).getTime() + 7 * 864e5)),
      later = up.filter(i => i.date > d && i.date <= wk);
    const foot = [
      same.length > 1 && Object.keys(byM).length
        ? `用意する額 ${Object.entries(byM)
            .map(([m, v]) => `${esc(m)} <b>${yen(v)}</b>`)
            .join("・")}`
        : "",
      later.length ? `この先7日 ほか${later.length}件 <b>${yen(sum(later))}</b>` : "",
    ].filter(Boolean);
    return `<div class="nextpay${days <= 2 ? " soon" : ""}">
    <div class="np-h"><span class="np-lbl">NEXT</span><b class="num">${md(d)}（${wd(d)}）</b><span class="np-when">${days === 0 ? "今日" : days === 1 ? "明日" : `あと${days}日`}</span><span class="np-sum">${yen(sum(same))}</span></div>
    <div class="np-list">${same.map(i => `<button type="button" class="np-it" data-pay="${i.id}"><span class="np-n">${esc(i.name)}</span><span class="np-m">${esc(i.method || "")}</span><span class="np-a">${yen(i.amount)}</span></button>`).join("")}</div>
    ${foot.length ? `<div class="np-foot">${foot.map(f => `<span>${f}</span>`).join("")}</div>` : ""}
  </div>`;
  }
  /* 家計簿の明細のうち、その月度に現金で払った額 */
  const cashOf = p => (FIN.kb.cashIn ? FIN.kb.cashIn(p) : 0);
  function statsHTML(st) {
    return `<div class="stat"><span class="label">支払予定</span><span class="v">${yen(st.t)}</span><span class="s">${st.n}件${st.def ? ` ・延滞へ ${yen(st.def)}` : ""}</span></div>`;
  }

  /* ---------- 支払い：一覧とお金の流れ ---------- */
  function renderCycle() {
    $("cAlert").innerHTML = alertHTML();
    const st = periodStats(S.period);
    $("cPeriod").textContent = periodLabel(S.period) + (S.period === periodOf(today()) ? "（いまの期間）" : "");
    $("cRange").textContent = `${md(st.s)}(${wd(st.s)})〜${md(st.e)}(${wd(st.e)})`;
    document.querySelectorAll("#cFilter button").forEach(b => b.setAttribute("aria-pressed", b.dataset.f === S.filter));
    let its = [...st.its].sort(byDateAmt);
    if (S.filter === "unpaid") its = its.filter(i => i.status === "planned");
    if (S.filter === "late") its = its.filter(i => i.kind === "late" || i.status === "deferred");
    if (!its.length)
      $("cList").innerHTML =
        `<div class="empty">この期間の支払はまだありません<button data-add="1" class="primary">支払を追加</button></div>`;
    else {
      let h = "",
        cur = null;
      its.forEach(i => {
        if (i.date !== cur) {
          cur = i.date;
          h += dayHeadHTML(its, cur);
        }
        h += rowHTML(i);
      });
      $("cList").innerHTML = h;
    }
    $("cFlow").innerHTML = flowHTML(st);
  }
  /* 日付の見出し：その日の合計と、まだ払っていない分の支払方法ごとの額 */
  function dayHeadHTML(its, cur) {
    const day = its.filter(x => x.date === cur && x.status !== "deferred");
    const sum = day.reduce((s, x) => s + amtOf(x), 0);
    const un = day.filter(x => x.status === "planned");
    const byM = {};
    un.forEach(x => {
      const m = x.method || "未設定";
      byM[m] = (byM[m] || 0) + (x.amount || 0);
    });
    const need = Object.entries(byM).sort((a, b) => b[1] - a[1]);
    return `<div class="dayhead"><span class="dh-d">${md(cur)}（${wd(cur)}）</span><span class="dh-m">${need.length ? need.map(([m, v]) => `<span class="mtag">${esc(m)} <b>${yen(v)}</b></span>`).join("") : day.length ? `<span class="dh-done">✓ 支払済</span>` : ""}</span><span class="dh-t num">${yen(sum)}</span></div>`;
  }
  /* 支払の行：状態（支払済・延滞→翌月・延滞分・未払）で色と印を変える */
  function rowHTML(i) {
    const c = catOf(i);
    const late = i.kind === "late";
    const over = i.status === "planned" && i.date < today();
    const st = i.status === "paid" ? "paid" : i.status === "deferred" ? "deferred" : late ? "late" : "planned";
    const ico = { paid: "✓", deferred: "→", late: "!", planned: "" }[st];
    let lbl;
    if (i.status === "paid") lbl = `支払済 ${i.paidDate ? md(i.paidDate) : ""}`;
    else if (i.status === "deferred") {
      const l = i.deferredTo && findItem(i.deferredTo);
      lbl = `延滞 → ${l ? md(l.it.date) + "に支払" : "翌月へ"}`;
    } else if (late) lbl = over ? "延滞中・期日超過" : "延滞分・要支払";
    else lbl = over ? "期日超過" : "未払";
    return `<div class="row st-${st}${over ? " over" : ""}" data-edit="${i.id}" role="button" tabindex="0">
      <span class="sico" aria-hidden="true">${ico}</span>
      <div class="rmain"><div class="nm">${esc(i.name)}${i.method ? `<span class="mtag">${esc(i.method)}</span>` : ""}${i.manual && i.status === "planned" ? '<span class="edited" title="金額を変更済み">✎</span>' : ""}</div>
      <div class="sub"><span class="chip ${c}">${CAT[c]?.s || ""}</span><span class="slbl">${lbl}</span>${i.memo ? `<span class="smemo">${esc(i.memo.split(" / ")[0])}</span>` : ""}</div></div>
      <div class="rright"><div class="amt">${yen(amtOf(i))}</div>${i.status === "planned" ? `<button class="primary sm paybtn" data-pay="${i.id}">支払う</button>` : ""}</div>
    </div>`;
  }
  /* この期間のお金の流れ：手取り − 区分ごとの支払 = 残るお金 */
  function flowHTML(st) {
    const by = c =>
      st.its.filter(i => i.status !== "deferred" && colOf(i) === c).reduce((s, i) => s + (i.amount || 0), 0);
    const inc = incomeOf(st.p);
    const cash = cashOf(st.p);
    const rest = inc - st.t - cash;
    const real = S.cfg.incomeBy?.[st.p] != null;
    return `<button class="kv kvbtn" data-inc="${st.p}"><span>手取り（${md(st.s)}）${real ? '<span class="pill done">実績</span>' : '<span class="note">標準</span>'}</span><span class="num">${yen(inc)} <span class="edit">✎</span></span></button>
  ${COLS.map(c => `<div class="kv"><span>− ${CAT[c].l}</span><span class="num">${yen(by(c))}</span></div>`).join("")}
  <div class="kv total"><span>残るお金</span><span class="num ${rest + cash < 0 ? "t-danger" : "t-ok"}">${yen(rest + cash)}</span></div>
  <div class="kv"><span>− 現金の支出（明細）</span><span class="num">${yen(cash)}</span></div>
  <div class="kv total"><span>手元に残るお金</span><span class="num ${rest < 0 ? "t-danger" : "t-ok"}">${yen(rest)}</span></div>
  ${st.unpaid ? `<div class="kv"><span>まだ払っていない額</span><span class="num t-danger">${yen(st.unpaid)}</span></div>` : ""}`;
  }

  /* ---------- 残高と計画：集計・口座 ---------- */
  function renderBalance() {
    const acc = accList();
    const debt = acc.filter(a => a.balance && a.active !== false);
    const sum = c =>
      debt.filter(a => (c ? a.category === c : a.category !== "personal")).reduce((s, a) => s + (a.balance || 0), 0);
    $("bStats").innerHTML =
      `<div class="stat bs-total"><span class="label">総残高</span><span class="v danger">${yen(sum())}</span><span class="s">${debt.filter(a => a.category !== "personal").length}口座・個人借入は除く</span></div>
  <div class="stat"><span class="label">クレジットカード</span><span class="v">${yen(sum("card"))}</span></div>
  <div class="stat"><span class="label">消費者金融</span><span class="v">${yen(sum("loan"))}</span></div>`;
    $("bGroups").innerHTML = ["card", "loan", "personal", "other"]
      .map(c => {
        const g = acc
          .filter(a => a.category === c && (a.balance != null || c !== "other"))
          .sort((x, y) => (y.active !== false) - (x.active !== false) || (y.balance || 0) - (x.balance || 0));
        if (!g.length) return "";
        return `<div class="grp" data-foldbox="g-${c}"><div class="grp-h fold-h" data-fold="g-${c}" role="button" tabindex="0"><h2>${CAT[c].l}${c === "personal" ? '<span class="memo-tag">備忘録・総残高外</span>' : ""}</h2><span class="num note">${yen(g.reduce((s, a) => s + (a.balance || 0), 0))}</span></div>
    <div class="acc-grid">${g
      .map(a => {
        const info = payoffInfo(a);
        const lc = lateCount(a.id);
        const rep = allItems()
          .filter(i => i.accountId === a.id && i.status === "paid" && i.date >= MGMT_START)
          .reduce((s, i) => s + (i.principal || 0), 0);
        const pd = a.payDay ? (a.payDay >= 31 ? "末日" : a.payDay + "日") : null;
        const meta = [
          pd || a.method ? `<span>${pd || "—"}${a.method ? `（${esc(a.method)}）` : ""}</span>` : "",
          info
            ? `<span title="あと${info.months}ヶ月">完済 <b>${ymLabel(ymOf(info.end))}</b></span>`
            : S.sched[a.id]?.stalled
              ? `<span class="t-danger">返済額が利息以下</span>`
              : "",
          a.limit ? `<span>極度額 ${man(a.limit)}</span>` : "",
        ]
          .filter(Boolean)
          .join('<i aria-hidden="true">・</i>');
        return `<button class="acc ac2 ${a.balance === 0 ? "donecard" : ""}" data-acc="${a.id}">
        <div class="ac-n"><b>${esc(a.name)}</b>${a.active === false ? '<span class="pill def">停止中</span>' : a.balance === 0 ? '<span class="pill done">完済</span>' : ""}</div>
        <div class="ac-b num">${yen(a.balance)}</div>
        <div class="ac-m">${meta}</div></button>`;
      })
      .join("")}</div></div>`;
      })
      .join("");
    applyFold();
  }
  function applyFold() {
    document.querySelectorAll("[data-foldbox]").forEach(b => {
      const k = b.dataset.foldbox;
      b.classList.toggle("folded", !!S.fold[k]);
      const h = b.querySelector(".fold-h");
      h && h.setAttribute("aria-expanded", String(!S.fold[k]));
    });
  }

  /* ---------- 残高と計画：完済の見通し・AI ---------- */
  function renderOutlook() {
    const d = outlookData();
    if (!d.rows.length) {
      $("olTop").innerHTML = `<div class="empty">返済中の口座はありません</div>`;
      $("aiBox").innerHTML = "";
      return;
    }
    const stall = d.rows.filter(x => x.stalled && !x.end);
    $("olTop").innerHTML = `<div class="ol-head">
      <div class="ol-final"><span class="label">すべて完済</span><b class="num">${d.last ? ymLabel(d.last.end) : "見込みなし"}</b><span class="note">${d.last ? `あと${d.last.months}ヶ月・最後は ${esc(d.last.a.name)}` : ""}</span></div>
      <div class="ol-kpi"><div><span class="label">毎月の返済</span><b class="num">${yen(d.curPay)}</b></div><div><span class="label">1年後の残高</span><b class="num">${man(d.y1)}</b><small class="ok">−${man(d.now - d.y1)}</small></div></div>
    </div>
    ${stall.length ? `<div class="warnbox ol-warn">${stall.map(x => esc(x.a.name)).join("・")} は返済額が利息以下のため、残高が減りません。</div>` : ""}
    <div class="ol-next"><span class="label">次に完済する口座</span>${d.next
      .slice(0, 3)
      .map(
        x =>
          `<div class="ms"><span>${esc(x.a.name)}<span class="note">　残り ${man(x.a.balance)}</span></span><span class="when">${ymLabel(x.end)}・あと${x.months}ヶ月</span></div>`,
      )
      .join("")}</div>`;
    renderAILink();
  }
  /* AI分析への案内（結果は「AI分析」の画面に出す） */
  function renderAILink() {
    const r = FIN.ai && (FIN.ai.data || FIN.ai.result);
    $("aiBox").innerHTML =
      `<div class="ai-link"><p>${r && r.headline ? esc(r.headline) : "生活費と返済をまとめて、AIが減らせそうな支出と完済を早める打ち手を提案します。"}</p><button class="sm primary" data-goto="ai">AI分析を見る</button></div>`;
  }
  /* ---------- 残高と計画：返済の計画 ---------- */
  function renderPlan() {
    const amt = Math.max(0, Number($("pAmt").value) || 0);
    document
      .querySelectorAll("#pQuick button")
      .forEach(b => b.setAttribute("aria-pressed", Number(b.dataset.qa) === amt));
    renderRank(amt);
    renderInterest();
    renderRoad();
    renderWhatIf();
  }
  /* 1回だけ繰上げするなら：効果の大きい口座の順 */
  function renderRank(amt) {
    const imp = debtAccs()
      .filter(a => a.balance > 0)
      .map(a => prepayImpact(a, amt))
      .filter(Boolean)
      .sort((x, y) => y.interest - x.interest || y.months - x.months);
    $("pRank").innerHTML =
      amt <= 0
        ? `<div class="empty">繰上げに回す額を入れてください</div>`
        : imp
            .slice(0, 3)
            .map(
              (m, k) => `<div class="rank ${k === 0 ? "top" : ""}">
    <div class="rk">${k === 0 ? "おすすめ" : k + 1}</div>
    <div class="rb"><b>${esc(m.a.name)}</b><span class="note">残り ${man(m.a.balance)}・年利${m.a.rate}%</span>
      <div class="eff">${m.done ? `<span class="e1">🎉 これで完済</span>` : `<span class="e1">完済が <b>${m.months}ヶ月</b> 早く</span>`}<span class="e2">利息 <b>${yen(m.interest)}</b> 減</span></div>
    </div>
    <button class="${k === 0 ? "primary" : ""} sm" data-prepay="${m.a.id}" data-amt="${m.x}">${yen(m.x)}を予定に追加</button>
  </div>`,
            )
            .join("") +
          (imp.length > 3
            ? `<div class="note rank-more">他の口座：${imp
                .slice(3, 6)
                .map(m => `${esc(m.a.name)} 利息${man(m.interest)}減`)
                .join("、")}…</div>`
            : "");
  }
  /* 利息に消えているお金：次の支払のうち利息の割合 */
  function renderInterest() {
    const rows = debtAccs()
      .filter(a => a.balance > 0)
      .map(a => {
        const r = (S.sched[a.id]?.rows || []).find(x => !x.fixed) || S.sched[a.id]?.rows?.[0];
        return r ? { a, int: r.interest, pay: r.payment } : null;
      })
      .filter(Boolean)
      .sort((x, y) => y.int / y.pay - x.int / x.pay);
    const ti = rows.reduce((t, x) => t + x.int, 0),
      tp = rows.reduce((t, x) => t + x.pay, 0);
    $("pIntSum").textContent = `毎月 約${yen(ti)}（返済の${tp ? Math.round((ti / tp) * 100) : 0}%）`;
    $("pInt").innerHTML =
      rows
        .map(x => {
          const r = x.int / x.pay;
          return `<div class="ib ${r >= 0.6 ? "hi" : ""}"><span class="in">${esc(x.a.name)}</span><span class="ibar"><i class="pi" style="width:${(1 - r) * 100}%"></i><i class="ii" style="width:${r * 100}%"></i></span><span class="iv num">${Math.round(r * 100)}%<small>利息${yen(x.int)}</small></span></div>`;
        })
        .join("") +
      `<div class="legend int-legend"><span><i class="dot dot-ok"></i>元金が減る分</span><span><i class="dot dot-danger"></i>利息</span></div>`;
  }
  /* 毎月の返済が軽くなっていく日：口座を完済するたびに毎月の返済額が下がるグラフと一覧 */
  function renderRoad() {
    const accs = debtAccs().filter(a => a.balance > 0);
    const start = ymOf(nextStart());
    const fin = accs
      .map(a => {
        const r = S.sched[a.id]?.rows || [];
        return r.length ? { a, end: ymOf(r[r.length - 1].date), pay: regPay(a) } : null;
      })
      .filter(Boolean)
      .sort((x, y) => (x.end < y.end ? -1 : 1));
    let cur = fin.reduce((t, x) => t + x.pay, 0);
    const road = [];
    fin.forEach(x => {
      const before = cur;
      cur -= x.pay;
      road.push({ ...x, before, after: cur });
    });
    const months = [];
    if (fin.length) {
      let ym = start;
      const last = fin[fin.length - 1].end;
      let c = fin.reduce((t, x) => t + x.pay, 0),
        k = 0;
      while (ym <= addMonths(last, 1) && months.length < 240) {
        while (k < fin.length && fin[k].end < ym) {
          c -= fin[k].pay;
          k++;
        }
        months.push({ ym, v: c });
        ym = addMonths(ym, 1);
      }
    }
    $("pChart").innerHTML = months.length ? roadChartSVG(months) : "";
    $("pRoad").innerHTML =
      road
        .map(
          r =>
            `<div class="tl"><span class="when">${ymLabel(r.end)}</span><span class="rd"><b>${esc(r.a.name)} 完済</b><span class="note">返済 毎月 ${yen(r.before)} → <b class="num">${yen(r.after)}</b></span></span><span class="diff">−${yen(r.pay)}</span></div>`,
        )
        .join("") || `<div class="empty">返済中の口座はありません</div>`;
  }
  /* 毎月の返済額の階段グラフ（スマホは小さく描く） */
  function roadChartSVG(months) {
    const mob = innerWidth < 640,
      W = mob ? 360 : 760,
      H = mob ? 170 : 190,
      L = mob ? 40 : 56,
      Rr = 10,
      T = 12,
      B = 26;
    const n = Math.max(2, months.length);
    const max = Math.max(1, ...months.map(m => m.v));
    const x = i => L + ((W - L - Rr) * i) / (n - 1),
      y = v => T + (H - T - B) * (1 - v / max);
    const path = months
      .map((m, i) => (i ? `H${x(i).toFixed(1)}V${y(m.v).toFixed(1)}` : `M${x(0)} ${y(m.v).toFixed(1)}`))
      .join("");
    let xt = "";
    months.forEach((m, i) => {
      if (m.ym.endsWith("-01") && Number(m.ym.slice(0, 4)) % (mob && n > 60 ? 2 : 1) === 0)
        xt += `<line x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${H - B}" stroke="var(--u-soft)"/><text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--u-sub)">${m.ym.slice(0, 4)}</text>`;
    });
    const yt = [0, 0.5, 1].map(f => max * f);
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="毎月の返済額の推移">
    ${yt.map(v => `<line x1="${L}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--u-soft)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--u-sub)">${Math.round(v / 10000)}万</text>`).join("")}${xt}
    <path d="${path}V${y(0)}H${x(0)}Z" fill="var(--u-accent2)"/><path d="${path}" fill="none" stroke="var(--u-accent)" stroke-width="2"/>
  </svg>`;
  }
  /* 毎月あと少し返せたら：金利の高い口座から返した場合と、いまのままを比べる */
  function renderWhatIf() {
    $("sExtra").value = S.sim.extra;
    $("sExtraV").textContent = S.sim.extra ? `+${yen(S.sim.extra)}／月` : "いまのまま";
    if (!(S.sim.extra > 0)) {
      $("sResult").textContent = "スライダーを動かすと、毎月の返済を増やした場合に完済がどれだけ早まるか表示します。";
      return;
    }
    const base = S._base || (S._base = simulateBase());
    const plan = simulate(S.sim.extra, "rate");
    const ml = e => {
      if (!e) return 0;
      const [a1, b1] = ymOf(today()).split("-").map(Number),
        [c1, d1] = e.split("-").map(Number);
      return (c1 - a1) * 12 + (d1 - b1);
    };
    $("sResult").innerHTML =
      `金利の高い口座から返し、完済した口座の分も次に回すと：すべての完済 <b class="num">${plan.end ? ymLabel(plan.end) : "—"}</b>（${Math.max(0, ml(base.end) - ml(plan.end))}ヶ月早く）、利息 <b class="num t-ok">${yen(Math.max(0, base.totalInt - plan.totalInt))}</b> 減`;
  }

  /* ---------- 口座の画面：履歴・今後の予定・返済計画 ---------- */
  function openSchedule(id) {
    const a = S.accounts[id];
    if (!a) return;
    if (!S.ad || S.ad.id !== id) S.ad = { id, tab: "future", from: ymOf(nextStart()), val: null, pp: 10000 };
    openSheet(
      `<div class="ad-top"><h3>${esc(a.name)}</h3><div class="ad-btns"><button class="sm" data-editacc="${id}">口座を編集</button><button class="sm ghost" data-close="1">閉じる</button></div></div><div id="adBody"></div>`,
      () => renderAcc(),
      true,
    );
  }
  function renderAcc() {
    const box = $("adBody");
    if (!box || !S.ad) return;
    const id = S.ad.id;
    const a = { id, ...S.accounts[id] };
    const debt = isDebt(a) && a.balance > 0;
    const s = debt ? schedule(a) : { rows: [] };
    const r = s.rows;
    const end = r.length && r[r.length - 1].after === 0 ? r[r.length - 1].date : null;
    const paid = allItems()
      .filter(i => i.accountId === id && i.date >= MGMT_START && i.status === "paid")
      .sort((x, y) => ((y.paidDate || y.date) < (x.paidDate || x.date) ? -1 : 1));
    const tabs = [
      ["hist", `履歴 ${paid.length ? `<span class="cnt2">${paid.length}</span>` : ""}`],
      ["future", "今後の予定"],
      ...(debt ? [["plan", "返済計画"]] : []),
    ];
    if (!tabs.find(t => t[0] === S.ad.tab)) S.ad.tab = "future";
    const body =
      S.ad.tab === "hist"
        ? accHistHTML(paid)
        : S.ad.tab === "future"
          ? debt
            ? accScheduleHTML(a, s, end)
            : accFutureHTML(a)
          : acctPlanHTML(a);
    box.innerHTML = `<div class="ad-sum">
      <div><span class="label">いまの残高</span><b class="num">${yen(a.balance)}</b></div>
      <div><span class="label">完済予定</span><b class="num ok">${end ? ymLabel(ymOf(end)) : debt ? "見込みなし" : "—"}</b><small>${end ? `あと${r.length}回` : ""}</small></div>
    </div>
    ${isDebt(a) ? `<div class="note ad-cond">年利${a.rate}%・${typeLabel(a)}</div>` : ""}
    <div class="seg adtabs">${tabs.map(([k, l]) => `<button data-adtab="${k}" aria-pressed="${S.ad.tab === k}">${l}</button>`).join("")}</div>
    <div class="ad-body">${body}</div>`;
  }
  /* 履歴：支払った合計と、1件ずつ */
  function accHistHTML(paid) {
    if (!paid.length) return `<div class="empty">10月以降の支払履歴はまだありません</div>`;
    const sum = k => paid.reduce((t, i) => t + ((k === "amount" ? (i.paidAmount ?? i.amount) : i[k]) || 0), 0);
    const rowOf = i => {
      const sub = [
        i.method,
        i.principal != null && i.status === "paid" ? "元金 " + yen(i.principal) : null,
        i.interest != null && i.status === "paid" ? "利息 " + yen(i.interest) : null,
      ]
        .filter(Boolean)
        .map(esc)
        .join(" · ");
      const day = (i.paidDate || i.date)
        .slice(0, 10)
        .replace(/^\d{4}-/, "")
        .replace("-", "/");
      return `<button class="hrow ${i.status}" data-edit="${i.id}"><span class="hd num">${day}</span><span class="hn">${esc(i.name)}${i.kind === "late" ? ' <span class="chip late">延滞分</span>' : ""}${i.status === "deferred" ? ' <span class="pill def">翌月へ</span>' : ""}<small>${sub}</small></span><b class="num">${yen(i.status === "paid" ? (i.paidAmount ?? i.amount) : i.amount)}</b></button>`;
    };
    return `<div class="hsum"><div><span class="label">支払った合計</span><b class="num">${yen(sum("amount"))}</b></div><div><span class="label">うち元金</span><b class="num ok">${yen(sum("principal"))}</b></div><div><span class="label">うち利息</span><b class="num">${yen(sum("interest"))}</b></div></div>
    <div class="hlist">${paid.map(rowOf).join("")}</div>`;
  }
  /* 今後の予定（返済中でない口座）：登録済みの支払を12件まで */
  function accFutureHTML(a) {
    const fut = allItems()
      .filter(i => i.accountId === a.id && i.status === "planned" && i.date >= today())
      .slice(0, 12);
    return fut.length
      ? `<div class="hlist">${fut.map(i => `<button class="hrow" data-edit="${i.id}"><span class="hd num">${md(i.date)}</span><span class="hn">${esc(i.name)}<small>${esc(i.method || "")}</small></span><b class="num">${yen(i.amount)}</b></button>`).join("")}</div>`
      : `<div class="empty">${a.repayType === "none" ? "この口座は定額の支払として扱っています。" : "残高がないため予定はありません。"}</div>`;
  }
  /* 今後の予定（返済中の口座）：返済予定表。13回目以降はまとめて、最後の回だけ出す */
  function accScheduleHTML(a, s, end) {
    const r = s.rows;
    const first = r.slice(0, 12),
      rest = r.slice(12, -1),
      last = r.length > 12 ? r[r.length - 1] : null;
    const row = (x, cls = "") =>
      `<tr class="${x.fixed ? "fromplan" : ""} ${cls}"><td class="n">${x.date.slice(0, 7).replace("-", "/")}</td><td class="n">${yen(x.payment + (a.extra || 0))}</td><td class="n">${yen(x.principal)}</td><td class="n">${yen(x.interest)}</td><td class="n">${x.after === 0 ? "🎉 完済" : yen(x.after)}</td></tr>`;
    return `${s.stalled && !end ? `<div class="warnbox">毎月の返済額が利息を下回るため、残高が減りません。「返済計画」で返済額を増やしてください。</div>` : ""}
      <div class="tablewrap"><table class="sch"><thead><tr><th>月</th><th>支払額</th><th>元金</th><th>利息</th><th>残高</th></tr></thead><tbody>
      ${first.map(x => row(x, x.after === 0 ? "final" : "")).join("")}
      ${rest.length ? `<tr class="gap"><td colspan="5">… ${rest.length}回（${ymLabel(ymOf(rest[0].date))}〜${ymLabel(ymOf(rest[rest.length - 1].date))}）・元金 ${yen(rest.reduce((t, x) => t + x.principal, 0))}・利息 ${yen(rest.reduce((t, x) => t + x.interest, 0))}</td></tr>` : ""}
      ${last ? row(last, "final") : ""}</tbody></table></div>
      <div class="note">${a.extra ? `支払額には「それ以外の支払額」${yen(a.extra)}を含みます。` : ""}利息は 残高 × 年利${a.rate}% × 前月の日数 ÷ 365 で計算しています。</div>`;
  }
  function acctPlanHTML(a) {
    const w = S.ad;
    const start = ymOf(nextStart());
    const fm = [];
    for (let k = 0; k < 24; k++) fm.push(addMonths(start, k));
    if (!fm.includes(w.from)) w.from = start;
    const cur = stepVal(a, w.from);
    if (w.val == null) w.val = cur + 10000;
    const val = Math.max(0, Number(w.val) || 0);
    const isP = a.repayType === "principal";
    const before = schedule(a),
      after = schedule({
        ...a,
        steps: [...(a.steps || []).filter(x => x.from < w.from), { from: w.from, value: val }],
      });
    const info = r => ({
      n: r.rows.length,
      end: r.rows.length && r.rows[r.rows.length - 1].after === 0 ? ymOf(r.rows[r.rows.length - 1].date) : null,
      int: r.rows.reduce((t, x) => t + x.interest, 0),
    });
    const B = info(before),
      A = info(after);
    const pay = r => {
      const x = r.rows.find(y => ymOf(y.date) >= w.from && !y.fixed);
      return x ? x.payment : null;
    };
    const st = (a.steps || []).slice().sort((x, y) => (x.from < y.from ? -1 : 1));
    const pp = Math.max(0, Number(w.pp) || 0);
    const im = pp ? prepayImpact(a, pp) : null;
    return `<div class="pl-sec"><h4>毎月の返済を増やす</h4>
    <div class="form"><div class="field"><label for="aw-from">いつから</label><select id="aw-from">${opt(
      fm.map(m => [m, ymLabel(m)]),
      w.from,
    )}</select></div>
      <div class="field"><label for="aw-val">${isP ? "毎月の元金" : "毎月のリボ支払額"}（いま ${yen(cur)}）</label><div class="amtbox"><span>¥</span><input type="number" id="aw-val" inputmode="numeric" step="1000" value="${val}"></div></div></div>
    <div class="quick">${[5000, 10000, 20000, 30000].map(q => `<button data-awq="${q}" aria-pressed="${cur + q === val}">+${q >= 10000 ? q / 10000 + "万" : q / 1000 + "千"}</button>`).join("")}</div>
    <div class="cmp cmp-plan">
      <div class="cmp-h"><span></span><span>いまのまま</span><span>変更後</span></div>
      <div class="cmp-r"><span>${ymLabel(w.from)}の支払</span><b class="num">${yen(pay(before))}</b><b class="num">${yen(pay(after))}</b></div>
      <div class="cmp-r"><span>完済</span><b class="num">${B.end ? ymLabel(B.end) : "見込みなし"}</b><b class="num ok">${A.end ? ymLabel(A.end) : "見込みなし"}</b></div>
      <div class="cmp-r"><span>残りの利息</span><b class="num">${yen(B.int)}</b><b class="num ok">${yen(A.int)}</b></div>
    </div>
    ${val === cur ? `<div class="note center">いまの設定と同じ額です</div>` : val < cur ? `<div class="warnbox">いまより少ない額です。完済は遅くなります。</div>` : !A.end ? `<div class="warnbox">この額では利息を払いきれず、残高が減りません。</div>` : `<div class="win flat"><span>完済が <b>${B.end ? B.n - A.n : "—"}ヶ月</b> 早く</span><span>利息 <b>${yen(B.int - A.int)}</b> 減</span></div>`}
    <div class="endbar"><button class="primary" id="aw-apply" ${val === cur ? "disabled" : ""}>今後の予定に反映</button></div>
    ${st.length ? `<div class="steps steps-plan"><span class="label">設定済みの変更</span>${st.map(x => `<div class="step"><span>${ymLabel(x.from)}から ${yen(x.value)}／月</span><button class="sm ghost" data-awdel="${x.from}">取消</button></div>`).join("")}</div>` : ""}
  </div>
  <div class="pl-sec"><h4>1回だけ繰上げする</h4>
    <div class="amtbox"><span>¥</span><input type="number" id="aw-pp" inputmode="numeric" step="1000" value="${pp || ""}"></div>
    <div class="quick">${[5000, 10000, 30000, 50000].map(q => `<button data-awp="${q}" aria-pressed="${q === pp}">${q >= 10000 ? q / 10000 + "万" : q / 1000 + "千"}</button>`).join("")}</div>
    ${
      im
        ? `<div class="win win-pp">${im.done ? `<span>🎉 これで完済</span>` : `<span>完済が <b>${im.months}ヶ月</b> 早く</span><span>利息 <b>${yen(im.interest)}</b> 減</span>`}</div>
    <div class="endbar"><button class="primary" data-prepay="${a.id}" data-amt="${im.x}">${yen(im.x)}を今期の支払に追加</button></div>`
        : ""
    }
  </div>`;
  }

  /* ---------- 設定 ---------- */
  function renderMaster() {
    const ms = S.cfg.methods;
    $("mMethods").innerHTML = ms
      .map(
        (m, i) =>
          `<div class="pmr"><span class="mi">${i + 1}</span><span class="mn">${esc(m)}</span><button class="mv" data-mvm="${i}" data-dir="-1" aria-label="${esc(m)}を上へ" ${i === 0 ? "disabled" : ""}>↑</button><button class="mv" data-mvm="${i}" data-dir="1" aria-label="${esc(m)}を下へ" ${i === ms.length - 1 ? "disabled" : ""}>↓</button><button class="ghost" data-rmm="${i}" aria-label="${esc(m)}を削除">削除</button></div>`,
      )
      .join("");
    if (document.activeElement?.id !== "mIncome") $("mIncome").value = S.cfg.income ?? "";
    if (document.activeElement?.id !== "mPayday") $("mPayday").value = S.cfg.payday ?? DEFAULT_PAYDAY;
    if (!$("mGenMonth").value) {
      const last = Object.keys(S.months).sort().pop();
      $("mGenMonth").value = last ? addMonths(last, 1) : addMonths(ymOf(today()), 1);
    }
  }
  /* ---------- シート（下から出るポップアップ） ---------- */
  /* シートを開いている間は後ろの画面を動かさない */
  function lockScroll() {
    if (ui.lockY != null) return;
    ui.lockY = window.scrollY;
    const b = document.body.style;
    b.position = "fixed";
    b.top = -ui.lockY + "px";
    b.left = "0";
    b.right = "0";
    b.width = "100%";
  }
  function unlockScroll() {
    if (ui.lockY == null) return;
    const b = document.body.style;
    b.position = b.top = b.left = b.right = b.width = "";
    window.scrollTo(0, ui.lockY);
    ui.lockY = null;
  }
  function openSheet(html, onMount, wide) {
    lockScroll();
    const host = $("sheetHost");
    host.innerHTML = `<div class="scrim" id="scrim"><div class="sheet ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}</div></div>`;
    onMount && onMount();
    const sh = host.querySelector(".sheet");
    sh.setAttribute("tabindex", "-1");
    sh.focus({ preventScroll: true });
  }
  function closeSheet() {
    $("sheetHost").innerHTML = "";
    unlockScroll();
  }

  /* ===================== 操作 ===================== */
  async function restoreSnap(sn) {
    closeSheet();
    for (const [ym, v] of Object.entries(sn.m)) {
      if (v) S.months[ym] = { items: [...v.items] };
      else delete S.months[ym];
    }
    for (const [id, v] of Object.entries(sn.a)) {
      if (v) S.accounts[id] = { ...v };
      else delete S.accounts[id];
    }
    const ids = Object.keys(sn.a).filter(id => isDebt(S.accounts[id]));
    const rg = ids.length ? regenFuture(ids) : [];
    S._base = null;
    render();
    toast("元に戻しました");
    await Promise.all([
      saveMonths([...new Set([...Object.keys(sn.m), ...rg])]),
      ...Object.entries(sn.a).map(([id, v]) => (v ? saveAcc(id) : deleteAcc(id))),
    ]);
  }

  /* ---------- 金額の入力欄（返済中の口座は、リボ支払額・それ以外・利息・元金に分ける） ---------- */
  function moneyInit(it, a) {
    const late = it.kind === "late" ? { late: true, lateFee: it.lateFee ?? null } : {};
    if (!isDebt(a)) {
      const amt = it.status === "paid" ? (it.paidAmount ?? it.amount) : it.amount;
      return { debt: false, amount: late.late && amt != null ? amt - (it.lateFee || 0) : amt, ...late };
    }
    const x = splitOf(it, a);
    const total = it.status === "paid" ? (it.paidAmount ?? it.amount) : it.amount;
    return { debt: true, total, other: x.other, interest: x.interest, principal: x.principal, ...late };
  }
  /* 延滞分だけ、延滞手数料の欄と根拠の一行を出す */
  function feeHTML(P, m) {
    if (!m.late) return "";
    return `<div class="field"><label for="${P}-fee">延滞手数料（自動計算）</label><input type="number" id="${P}-fee" inputmode="numeric" value="${m.lateFee ?? ""}"></div>
  <div class="feenote" id="${P}-feenote"></div>`;
  }
  function moneyHTML(P, m, amtLabel) {
    if (!m.debt)
      return `<div class="field"><label for="${P}-amt">${m.late ? "延滞している額" : amtLabel || "支払額"}</label><input type="number" id="${P}-amt" inputmode="numeric" value="${m.amount ?? ""}"></div>${
        m.late ? `${feeHTML(P, m)}<div class="sumline full"><span>支払額 合計</span><b class="num" id="${P}-sum"></b></div>` : ""
      }`;
    // 支払総額（カード会社の確定額）を先に入れ、内訳（元金・利息・それ以外・延滞手数料）を合わせていく
    return `<div class="field full"><label for="${P}-tot">支払総額${m.late ? "（延滞手数料こみ）" : ""}</label><input type="number" id="${P}-tot" inputmode="numeric" value="${m.total ?? ""}"></div>
  <div class="field"><label for="${P}-pr">うち元金</label><input type="number" id="${P}-pr" inputmode="numeric" value="${m.principal ?? ""}"></div>
  <div class="field"><label for="${P}-in">うち利息（自動計算）</label><input type="number" id="${P}-in" inputmode="numeric" value="${m.interest ?? ""}"></div>
  <div class="field"><label for="${P}-oth">うちそれ以外</label><input type="number" id="${P}-oth" inputmode="numeric" value="${m.other || ""}" placeholder="0"></div>
  ${feeHTML(P, m)}
  <div class="sumline full"><span>リボ支払額（元金＋利息）</span><b class="num" id="${P}-revo"></b></div>
  <div class="diffbox full" id="${P}-diff" hidden></div>`;
  }
  /* ctx: acc / date（利息の基準日）/ bal / onChange / dateEl、延滞分は due（元の期日）/ payDate / payDateEl / feeManual */
  function moneyWire(P, ctx) {
    const debt = !!$(P + "-tot"),
      feeEl = $(P + "-fee");
    if (!debt && !feeEl) return;
    let feeManual = !!(ctx.feeManual && feeEl && feeEl.value !== "");
    const num = k => Number($(P + k)?.value) || 0;
    // 延滞手数料の基準になる額（延滞手数料を除いた分）
    const base = () => (debt ? num("-pr") + num("-in") + num("-oth") : num("-amt"));
    const fee = () => {
      if (!feeEl) return;
      const a = ctx.acc(),
        rate = a?.lateRate,
        due = ctx.due ? ctx.due() : null,
        pdt = (ctx.payDate ? ctx.payDate() : ctx.date()) || today();
      if (!feeManual && rate && due) feeEl.value = lateFeeFor(base(), rate, due, pdt);
      feeEl.dataset.manual = feeManual ? "1" : "";
      $(P + "-feenote").innerHTML = !due
        ? "元の期日がわからないため、カード会社の請求額を入れてください"
        : !rate
          ? `口座の設定で「遅延損害金（年率）」を入れると自動計算します`
          : `${md(due)}の期日から <b>${daysBetween(due, pdt)}日</b> × ${yen(base())} × 年${rate}%${feeManual ? "（手入力中・空にすると自動）" : ""}`;
    };
    /* 内訳の合計と支払総額の差を出し、ボタン1回で合わせられるようにする */
    const ps = () => {
      if (debt) {
        $(P + "-revo").textContent = yen(num("-pr") + num("-in"));
        const box = $(P + "-diff"),
          tot = $(P + "-tot").value === "" ? null : num("-tot"),
          d = tot == null ? 0 : tot - (base() + (feeEl ? num("-fee") : 0));
        box.hidden = !d;
        if (d) {
          const btn = (k, l) => `<button type="button" data-fix="${k}">${l}に入れる</button>`;
          box.innerHTML = `<div class="dmsg">内訳が支払総額より <b class="num">${yen(Math.abs(d))}</b> ${d > 0 ? "足りません" : "多いです"}</div>
            <div class="dbtns">${btn("-in", "利息")}${btn("-pr", "元金")}${btn("-oth", "それ以外")}</div>`;
          box.querySelectorAll("[data-fix]").forEach(
            b =>
              (b.onclick = () => {
                const k = b.dataset.fix,
                  v = num(k) + d;
                if (v < 0) return toast("その欄だけでは合わせられません（マイナスになります）");
                $(P + k).value = v;
                if (k === "-in") $(P + "-in").dataset.manual = "1";
                ps();
              }),
          );
        }
      } else
        $(P + "-sum").innerHTML = yen(base() + (feeEl ? num("-fee") : 0));
      ctx.onChange && ctx.onChange();
    };
    const feePs = () => {
      fee();
      ps();
    };
    /* 日付が変わったとき：利息を手で直していなければ計算しなおす */
    const calc = () => {
      const a = ctx.acc();
      if (debt && a && !$(P + "-in").dataset.manual)
        $(P + "-in").value = interestFor(ctx.bal() || 0, a.rate, ctx.date() || today());
      feePs();
    };
    if (debt) {
      ["-tot", "-pr", "-oth"].forEach(k => $(P + k).addEventListener("input", feePs));
      $(P + "-in").addEventListener("input", () => {
        $(P + "-in").dataset.manual = "1";
        feePs();
      });
    } else $(P + "-amt").addEventListener("input", feePs);
    if (feeEl)
      feeEl.addEventListener("input", () => {
        feeManual = feeEl.value !== "";
        ps();
      });
    ctx.dateEl && ctx.dateEl.addEventListener("change", calc);
    ctx.payDateEl && ctx.payDateEl.addEventListener("change", feePs);
    if (debt && $(P + "-in").value === "") calc();
    else feePs();
  }
  /* 保存前の確認：内訳が支払総額と合わなければ、1回目はボタンの文字を変えて止める */
  function moneyOk(P, btn) {
    const box = $(P + "-diff");
    if (!box || box.hidden) return true;
    if (armed(btn, "差分があります。このまま保存")) return true;
    box.scrollIntoView({ block: "center", behavior: "smooth" });
    return false;
  }
  function moneyRead(P) {
    const feeEl = $(P + "-fee"),
      fee = feeEl ? Number(feeEl.value) || 0 : 0,
      fx = feeEl ? { lateFee: fee, lateFeeManual: !!feeEl.dataset.manual } : {};
    if ($(P + "-tot")) {
      const other = Number($(P + "-oth").value) || 0,
        interest = Number($(P + "-in").value) || 0,
        principal = Number($(P + "-pr").value) || 0,
        tot = numOrNull($(P + "-tot").value);
      return { amount: tot ?? principal + interest + other + fee, other, interest, principal, ...fx };
    }
    return { amount: (numOrNull($(P + "-amt").value) || 0) + fee, ...fx };
  }

  /* ---------- 支払う ---------- */
  function openPay(id) {
    const f = findItem(id);
    if (!f) return;
    const it = f.it;
    const a = it.accountId && S.accounts[it.accountId];
    const debt = a && a.repayType && a.repayType !== "none";
    const ctx = { id, f, it, a, debt };
    openSheet(payHTML(ctx), () => {
      moneyWire("p", {
        acc: () => a,
        date: () => it.date,
        bal: () => it.balanceBefore ?? a.balance,
        due: () => dueOf(it),
        payDate: () => $("p-date").value,
        payDateEl: $("p-date"),
        feeManual: !!it.lateFeeManual,
        onChange: () => payAfter(ctx),
      });
      document.querySelectorAll("[data-copy]").forEach(
        b =>
          (b.onclick = () => {
            const v = b.dataset.copy;
            const done = () => {
              b.textContent = "✓";
              setTimeout(() => (b.textContent = "コピー"), 1200);
            };
            try {
              navigator.clipboard.writeText(v).then(done, () => toast(esc(v)));
            } catch (e) {
              toast(esc(v));
            }
          }),
      );
      if (debt) payAfter(ctx);
      $("p-save").onclick = e => moneyOk("p", e.currentTarget) && paySave(ctx);
      $("p-ok").onclick = e => moneyOk("p", e.currentTarget) && payDone(ctx);
      $("p-defer").onclick = () => openDefer(id);
      $("p-del").onclick = e => armed(e.target, "もう一度押すと削除") && deleteItem(id);
    });
  }
  function payHTML({ it, a, debt }) {
    return `<div class="ad-top"><div><h3>${esc(it.name)}${it.kind === "late" ? ' <span class="chip late">⚠ 延滞分</span>' : ""}</h3><div class="note">予定 ${md(it.date)}（${wd(it.date)}）・${yen(it.amount)}</div></div><button class="xbtn" data-close="1" aria-label="閉じる">×</button></div>
  <div class="form">
    <div class="field"><label for="p-date">支払日</label><input type="date" id="p-date" value="${it.date > today() ? it.date : today()}"></div>
    <div class="field"><label for="p-me">支払方法</label><select id="p-me">${mopt(it.method)}</select></div>
    ${moneyHTML("p", moneyInit(it, a), "支払額")}
    <div class="field full"><label for="p-memo">メモ</label><input id="p-memo" value="${esc(it.memo)}"></div>
  </div>
  ${bankHTML(it, a)}
  ${debt ? `<div class="after" id="p-after"></div>` : ""}
  <div class="actions act-pay"><button class="warn" id="p-defer">払えない → 延滞</button><button id="p-save">変更を保存</button><button class="primary" id="p-ok">支払済にする</button></div>
  <div class="subacts"><button class="ghost sm" data-edetail="${it.id}">名前・口座を変更</button><button class="ghost sm dangertxt" id="p-del">この支払を削除</button></div>`;
  }
  /* 延滞分の振込先（口座の設定で登録）。項目ごとにコピーできる */
  function bankHTML(it, a) {
    if (it.kind !== "late" || !a) return "";
    const rows = [
      ["金融機関", a.bankName],
      ["支店", a.bankBranch],
      ["口座番号", a.bankNo, a.bankType],
      ["名義", a.bankHolder],
    ].filter(r => r[1]);
    if (!rows.length)
      return `<div class="bank empty"><span>振込先が未登録です</span><button class="sm" data-editacc="${esc(it.accountId)}">振込先を登録</button></div>`;
    return `<div class="bank"><div class="bank-h"><b>振込先</b><button class="ghost sm" data-editacc="${esc(it.accountId)}">編集</button></div>${rows
      .map(
        ([l, v, pre]) =>
          `<div class="bank-r"><span class="bl">${l}</span><span class="bv">${pre ? `<small>${esc(pre)}</small> ` : ""}<b>${esc(v)}</b></span><button class="ghost sm" data-copy="${esc(v)}">コピー</button></div>`,
      )
      .join("")}${a.bankMemo ? `<div class="note">${esc(a.bankMemo)}</div>` : ""}</div>`;
  }
  /* 支払前・支払後の残高と、完済までの回数の見込み */
  function payAfter({ it, a, debt }) {
    if (!debt) return;
    if (it.noBal) {
      $("p-after").innerHTML = `<span>この支払は残高に反映しません（管理を始める前の分）</span>`;
      return;
    }
    const pr = Number($("p-pr").value) || 0;
    const before = a.balance || 0;
    const after = Math.max(0, before - pr);
    const left = monthsLeftAfter({ id: it.accountId, ...a }, pr, it.id);
    const bal = `<div class="balrow"><span><small>支払前の残高</small><b>${yen(before)}</b></span><span class="arr" aria-hidden="true">→</span><span><small>支払後の残高</small><b>${yen(after)}</b></span></div><span class="note">元金 ${yen(pr)} 減</span>`;
    $("p-after").innerHTML =
      after <= 0
        ? `${bal}<span class="big2">🎉 この支払で完済です！</span>`
        : `${bal}<span>完済まで <b class="ok">あと${left.months}ヶ月</b>${left.end ? `（${ymLabel(ymOf(left.end))}）` : ""}</span>`;
  }
  /* 「変更を保存」：未払のまま、日付・金額・支払方法・メモを変える */
  async function paySave({ f, it, debt }) {
    const mv = moneyRead("p");
    const date = $("p-date").value || it.date;
    const sn = snapOf([f.ym, ymOf(date)]);
    const n = {
      ...it,
      date,
      amount: mv.amount,
      ...(debt ? { principal: mv.principal, interest: mv.interest, other: mv.other } : {}),
      ...lateOf(mv),
      method: $("p-me").value,
      memo: $("p-memo").value,
      manual: true,
    };
    delete n._m;
    if (ymOf(date) !== ymOf(it.date)) {
      delete n.bm;
      dropItem(it.id);
    }
    const ym = putItem(n);
    closeSheet();
    render();
    toast(`${esc(it.name)} を ${yen(mv.amount)}${date !== it.date ? `・${md(date)}` : ""} に変更しました`, sn);
    await Promise.all([saveMonth(ym), ym !== f.ym ? saveMonth(f.ym) : null]);
  }
  /* 「支払済にする」：返済中の口座なら元金の分だけ残高を減らし、今後の予定を作り直す */
  async function payDone({ f, it, a, debt }) {
    const mv = moneyRead("p");
    const pr = debt ? mv.principal : it.principal;
    const sn = snapOf([f.ym], [it.accountId]);
    const pdIn = $("p-date").value || today();
    const nit = {
      ...it,
      status: "paid",
      paidDate: pdIn > today() ? today() : pdIn,
      paidAmount: mv.amount,
      balanceBefore: it.balanceBefore ?? (debt ? a.balance : null),
      principal: pr,
      interest: debt ? mv.interest : it.interest,
      other: debt ? mv.other : it.other,
      ...lateOf(mv),
      method: $("p-me").value,
      memo: $("p-memo").value,
    };
    delete nit._m;
    let accChanged = false;
    if (debt && pr && !it.applied && !it.noBal && a.balance != null) {
      S.accounts[it.accountId] = { ...a, balance: Math.max(0, a.balance - pr) };
      nit.applied = true;
      accChanged = true;
    }
    const ym = putItem(nit);
    const rg = accChanged ? regenFuture([it.accountId]) : [];
    closeSheet();
    render();
    const na = S.accounts[it.accountId];
    if (debt && na) {
      const inf = na.balance > 0 ? payoffInfo({ id: it.accountId, ...na }) : null;
      toast(
        na.balance <= 0
          ? `🎉 <b>${esc(na.name)}</b> 完済おめでとうございます！`
          : `✓ ${esc(na.name)} 支払済。残り <b>${yen(na.balance)}</b>、完済まであと <b>${inf?.months ?? "—"}ヶ月</b>`,
        sn,
      );
    } else toast(`✓ ${esc(it.name)} を支払済にしました`, sn);
    await Promise.all([
      saveMonth(ym),
      accChanged ? saveAcc(it.accountId) : null,
      rg.length ? saveMonths(rg.filter(x => x !== ym)) : null,
    ]);
  }
  async function unpay(id) {
    const f = findItem(id);
    if (!f) return;
    const it = f.it;
    const sn = snapOf([f.ym], [it.accountId]);
    const nit = { ...it, status: "planned" };
    delete nit.paidDate;
    delete nit.paidAmount;
    delete nit._m;
    let acc = false;
    const a = it.accountId && S.accounts[it.accountId];
    if (it.applied && a && it.principal) {
      S.accounts[it.accountId] = { ...a, balance: (a.balance || 0) + it.principal };
      nit.applied = false;
      acc = true;
    }
    const ym = putItem(nit);
    const rg = acc ? regenFuture([it.accountId]) : [];
    render();
    toast(`${esc(it.name)} を未払に戻しました`, sn);
    await Promise.all([
      saveMonth(ym),
      acc ? saveAcc(it.accountId) : null,
      rg.length ? saveMonths(rg.filter(x => x !== ym)) : null,
    ]);
  }

  /* ---------- 延滞にして翌月へ ---------- */
  function openDefer(id) {
    const f = findItem(id);
    if (!f) return;
    const it = f.it;
    const nextP = addMonths(periodOf(it.date), 1);
    const def = payday(nextP);
    const base = (it.accountId && S.accounts[it.accountId]?.name) || it.name.replace(/[（(][^）)]*[）)]\s*$/, "");
    // 何月分かは給料日サイクル（○月度）で決める。10日払いのカードも25日前後のカードと同じ月にそろう
    const label = `${base}（${Number(periodOf(it.date).slice(5))}月分）`;
    openSheet(
      `<h3>延滞にして翌月に返済する</h3>
  <div class="note">「${esc(it.name)}」を今回は払わず、翌月の支払に「延滞分」として追加します。</div>
  <div class="form">
    <div class="field"><label for="d-date">翌月の返済日</label><input type="date" id="d-date" value="${def}"></div>
    <div class="field"><label for="d-amt">延滞する金額</label><input type="number" id="d-amt" inputmode="numeric" value="${it.amount != null ? it.amount - (it.lateFee || 0) : ""}"></div>
    <div class="feenote full" id="d-fee"></div>
    <div class="field full"><label for="d-name">表示名</label><input id="d-name" value="${esc(label)}"></div>
    <div class="field full"><label for="d-memo">メモ（カード会社との約束など）</label><input id="d-memo" placeholder="例：10/6電話 10/26支払で約束"></div>
  </div>
  <div class="warnbox">延滞は信用情報に記録されることがあります。払えないとわかった時点でカード会社に連絡し、支払日を約束しておくと安心です。</div>
  <div class="actions"><div></div><div><button class="ghost" data-close="1">キャンセル</button><button class="primary" id="d-ok">延滞にして翌月へ</button></div></div>`,
      () => {
        const acc = it.accountId && S.accounts[it.accountId];
        const due = dueOf(it) || it.date;
        const feeAt = () => lateFeeFor(numOrNull($("d-amt").value) || 0, acc?.lateRate, due, $("d-date").value);
        const showFee = () =>
          ($("d-fee").innerHTML = acc?.lateRate
            ? `延滞手数料の見込み <b>${yen(feeAt())}</b>（${md(due)}の期日から${daysBetween(due, $("d-date").value || due)}日・年${acc.lateRate}%）。翌月の支払額に足しておきます`
            : "口座の設定で「遅延損害金（年率）」を入れると、延滞手数料を自動で足します");
        $("d-amt").addEventListener("input", showFee);
        $("d-date").addEventListener("change", showFee);
        showFee();
        $("d-ok").onclick = async () => {
          const date = $("d-date").value;
          if (!date) {
            $("d-date").focus();
            return;
          }
          const sn = snapOf([f.ym, ymOf(date)]);
          const lateId = uid();
          const late = {
            id: lateId,
            name: $("d-name").value.trim() || label,
            accountId: it.accountId,
            category: it.category,
            kind: "late",
            ...(() => {
              const amt = numOrNull($("d-amt").value) || 0,
                same = amt === (it.amount || 0) - (it.lateFee || 0),
                fee = feeAt(),
                a = S.accounts[it.accountId];
              const x = isDebt(a)
                ? splitOf(
                    {
                      ...it,
                      status: "planned",
                      amount: amt,
                      lateFee: null,
                      principal: same ? it.principal : null,
                      interest: same ? it.interest : null,
                      other: same ? it.other : null,
                    },
                    a,
                  )
                : { principal: null, interest: null, other: null };
              return {
                amount: amt + fee,
                lateFee: fee || null,
                lateFeeManual: false,
                dueDate: due,
                principal: x.principal,
                interest: x.interest,
                other: x.other,
              };
            })(),
            balanceBefore: null,
            date,
            method: "振込",
            status: "planned",
            memo: $("d-memo").value,
            applied: false,
            origin: it.id,
            source: "app",
          };
          const o = { ...it, status: "deferred", deferredTo: lateId };
          delete o._m;
          const y1 = putItem(o),
            y2 = putItem(late);
          closeSheet();
          render();
          toast(`${esc(it.name)} を延滞にして、${md(date)} の支払に追加しました`, sn);
          await Promise.all([saveMonth(y1), y2 !== y1 ? saveMonth(y2) : null]);
        };
      },
    );
  }
  async function undefer(id) {
    const f = findItem(id);
    if (!f) return;
    const it = f.it;
    const sn = snapOf([f.ym, it.deferredTo && findItem(it.deferredTo)?.ym]);
    const o = { ...it, status: "planned" };
    delete o.deferredTo;
    delete o._m;
    let y2 = null;
    if (it.deferredTo) y2 = dropItem(it.deferredTo);
    const y1 = putItem(o);
    render();
    toast(`${esc(it.name)} の延滞を取り消しました`, sn);
    await Promise.all([saveMonth(y1), y2 && y2 !== y1 ? saveMonth(y2) : null]);
  }

  /* ---------- 削除 ---------- */
  async function deleteItem(id) {
    const f = findItem(id);
    if (!f) return;
    const it = f.it;
    const sn = snapOf([f.ym, it.deferredTo && findItem(it.deferredTo)?.ym], [it.accountId]);
    const ym = dropItem(it.id);
    let acc = false;
    if (it.status === "paid" && it.applied && it.principal) {
      const oa = S.accounts[it.accountId];
      if (oa) {
        S.accounts[it.accountId] = { ...oa, balance: (oa.balance || 0) + it.principal };
        acc = true;
      }
    }
    let ly = null;
    if (it.deferredTo) ly = dropItem(it.deferredTo);
    const rg = acc ? regenFuture([it.accountId]) : [];
    closeSheet();
    render();
    toast(`${esc(it.name)} を削除しました`, sn);
    await Promise.all([
      saveMonth(ym),
      ly && ly !== ym ? saveMonth(ly) : null,
      acc ? saveAcc(it.accountId) : null,
      rg.length ? saveMonths(rg.filter(x => x !== ym && x !== ly)) : null,
    ]);
  }

  /* ---------- 支払の追加・編集 ---------- */
  function editItem(id) {
    const f = id ? findItem(id) : null;
    const [ps] = periodRange(S.period);
    const it = f
      ? f.it
      : {
          id: uid(),
          name: "",
          accountId: null,
          kind: "normal",
          amount: null,
          principal: null,
          interest: null,
          date: ps,
          method: S.cfg.methods[0],
          status: "planned",
          memo: "",
          applied: false,
          source: "app",
        };
    const ctx = { f, it, accChangedTo: null, moneyDirty: false };
    openSheet(editItemHTML(ctx), () => {
      const mountMoney = m => {
        $("e-money").innerHTML = moneyHTML("e", m);
        moneyWire("e", {
          acc: () => S.accounts[$("e-acc").value],
          date: () => $("e-date").value,
          bal: () =>
            ctx.accChangedTo
              ? S.accounts[$("e-acc").value]?.balance
              : (it.balanceBefore ??
                (S.accounts[$("e-acc").value]?.balance || 0) + (it.applied ? it.principal || 0 : 0)),
          dateEl: $("e-date"),
          due: () => dueOf(it),
          feeManual: !!it.lateFeeManual,
        });
      };
      mountMoney(moneyInit(it, S.accounts[it.accountId]));
      $("e-money").addEventListener("input", () => (ctx.moneyDirty = true));
      $("e-date").addEventListener("change", () => (ctx.moneyDirty = true));
      /* 「延滞分」を切り替えたら、延滞手数料の欄を出し入れする */
      $("e-late").addEventListener("change", e => {
        const cur = moneyRead("e");
        ctx.moneyDirty = true;
        mountMoney(
          moneyInit(
            {
              ...it,
              status: "planned",
              kind: e.target.checked ? "late" : "normal",
              amount: cur.amount - (cur.lateFee || 0),
              principal: cur.principal ?? null,
              interest: cur.interest ?? null,
              other: cur.other ?? null,
              lateFee: null,
              lateFeeManual: false,
            },
            S.accounts[$("e-acc").value],
          ),
        );
      });
      /* 口座を変えたら、その口座の名前・支払方法・金額の入れ方に切り替える */
      $("e-acc").addEventListener("change", e => {
        const a = S.accounts[e.target.value];
        ctx.accChangedTo = e.target.value;
        $("e-catf").hidden = !!a;
        if (a) {
          if (!$("e-name").value) $("e-name").value = a.name;
          if (a.method) $("e-me").value = a.method;
        }
        const cur = moneyRead("e");
        const lt = $("e-late").checked ? { late: true, lateFee: null } : {};
        cur.amount -= cur.lateFee || 0;
        let m;
        if (isDebt(a)) {
          const int = interestFor(a.balance || 0, a.rate, $("e-date").value || today());
          const pr = Math.max(0, a.repayType === "principal" ? a.principalPay || 0 : (a.payment || 0) - int);
          m = {
            debt: true,
            total: cur.amount && !$("e-tot") ? cur.amount : pr + int + (a.extra || 0),
            other: a.extra || 0,
            interest: int,
            principal: pr,
            ...lt,
          };
        } else m = { debt: false, amount: cur.amount || a?.payment || null, ...lt };
        mountMoney(m);
      });
      if (f) $("e-del").onclick = e => armed(e.target, "もう一度押すと削除") && deleteItem(it.id);
      $("e-save").onclick = e => moneyOk("e", e.currentTarget) && saveItem(ctx);
    });
  }
  function editItemHTML({ f, it }) {
    const accs = [["", "（口座なし）"], ...accList().map(a => [a.id, a.name])];
    const stBar =
      f && it.status === "paid"
        ? `<div class="stbar paid"><span>✓ 支払済 ${it.paidDate ? md(it.paidDate) : ""}・${yen(it.paidAmount ?? it.amount)}</span><button class="sm" data-unpay="${it.id}">未払に戻す</button></div>`
        : f && it.status === "deferred"
          ? `<div class="stbar deferred"><span>→ 延滞にして翌月へ回しました</span><button class="sm" data-undefer="${it.id}">延滞を取り消す</button></div>`
          : "";
    return `<div class="ad-top"><h3>${f ? "支払を編集" : "支払を追加"}</h3><button class="xbtn" data-close="1" aria-label="閉じる">×</button></div>${stBar}
  <div class="form">
    <div class="field"><label for="e-acc">口座</label><select id="e-acc">${opt(accs, it.accountId || "")}</select></div>
    <div class="field"><label for="e-name">表示名</label><input id="e-name" value="${esc(it.name)}"></div>
    <div class="field"><label for="e-date">支払日</label><input type="date" id="e-date" value="${esc(it.date)}"></div>
    <div class="field"><label for="e-me">支払方法</label><select id="e-me">${mopt(it.method)}</select></div>
    <div class="form full" id="e-money"></div>
    <div class="field" id="e-catf" ${it.accountId ? "hidden" : ""}><label for="e-cat">区分</label><select id="e-cat">${opt(
      ["card", "loan", "other"].map(c => [c, CAT[c].l]),
      it.category || "other",
    )}</select></div>
    <div class="full memo-row"><div class="field"><label for="e-memo">メモ</label><input id="e-memo" value="${esc(it.memo)}"></div><label class="cb"><input type="checkbox" id="e-late" ${it.kind === "late" ? "checked" : ""}>延滞分</label></div>
    <label class="cb full nobal"><input type="checkbox" id="e-nobal" ${it.noBal ? "checked" : ""}>残高に反映しない<span class="note">（管理を始める前の延滞分など）</span></label>
  </div>
  <div class="actions"><div>${f ? '<button class="danger" id="e-del">削除</button>' : ""}</div><div><button class="ghost" data-close="1">キャンセル</button><button class="primary" id="e-save">保存</button></div></div>`;
  }
  /* 保存：支払済の元金が変わったら、残高に反映済みの分を戻してから引き直す */
  async function saveItem(ctx) {
    const { f, it } = ctx;
    const date = $("e-date").value;
    if (!date) {
      $("e-date").focus();
      return;
    }
    const accountId = $("e-acc").value || null;
    const a = accountId && S.accounts[accountId];
    if (ctx.accChangedTo) ctx.moneyDirty = true;
    const money = () => {
      if (f && !ctx.moneyDirty) return {};
      const mv = moneyRead("e");
      return isDebt(a)
        ? { amount: mv.amount, principal: mv.principal, interest: mv.interest, other: mv.other, ...lateOf(mv) }
        : { amount: mv.amount, principal: null, interest: null, other: null, ...lateOf(mv) };
    };
    const n = {
      ...it,
      name: $("e-name").value.trim() || (a ? a.name : "支払"),
      accountId,
      category: a ? a.category : $("e-cat").value,
      date,
      ...money(),
      method: $("e-me").value,
      memo: $("e-memo").value,
      kind: $("e-late").checked ? "late" : "normal",
      noBal: !!$("e-nobal")?.checked,
      manual: it.status === "planned" ? true : it.manual,
    };
    delete n._m;
    if (n.kind !== "late") {
      delete n.lateFee;
      delete n.lateFeeManual;
    }
    if (f && ymOf(date) !== ymOf(it.date)) delete n.bm;
    if (n.status === "paid" && ctx.moneyDirty) n.paidAmount = n.amount;
    const old = f?.ym;
    const sn = snapOf([old, ymOf(date)], [it.accountId, accountId]);
    if (old && old !== ymOf(date)) dropItem(it.id);
    const accCh = new Set();
    if (it.status === "paid" && it.applied) {
      const oa = S.accounts[it.accountId];
      if (oa && oa.balance != null) {
        S.accounts[it.accountId] = { ...oa, balance: oa.balance + (it.principal || 0) };
        accCh.add(it.accountId);
      }
      n.applied = false;
    }
    if (n.status === "paid" && (it.applied || !f) && !n.noBal && isDebt(a) && n.principal) {
      const na = S.accounts[accountId];
      S.accounts[accountId] = { ...na, balance: Math.max(0, (na.balance || 0) - n.principal) };
      n.applied = true;
      accCh.add(accountId);
    }
    const ym = putItem(n);
    const rg = accCh.size ? regenFuture([...accCh]) : [];
    S.period = periodOf(date);
    closeSheet();
    FIN.renderAll();
    toast(`${esc(n.name)} を${f ? "保存" : "追加"}しました`, sn);
    await Promise.all([
      saveMonth(ym),
      old && old !== ym ? saveMonth(old) : null,
      ...[...accCh].map(saveAcc),
      rg.length ? saveMonths(rg.filter(x => x !== ym && x !== old)) : null,
    ]);
  }

  /* ---------- 口座の追加・編集 ---------- */
  function editAccount(id) {
    const a = id
      ? S.accounts[id]
      : {
          name: "",
          category: "card",
          limit: null,
          balance: null,
          extra: null,
          rate: 18,
          repayType: "principal",
          principalPay: null,
          payment: null,
          payDay: DEFAULT_ACC_DAY,
          method: S.cfg.methods[0],
          priority: null,
          memo: "",
          active: true,
        };
    openSheet(editAccountHTML(id, a), () => {
      if (id)
        $("a-del").onclick = async e => {
          if (!armed(e.target, "もう一度押すと削除（支払履歴は残ります）")) return;
          const sn = snapOf([], [id]);
          delete S.accounts[id];
          closeSheet();
          render();
          toast(`${esc(a.name)} を削除しました`, sn);
          await guard(() => S.db.collection("accounts").doc(id).delete());
        };
      $("a-save").onclick = () => saveAccount(id, a);
    });
  }
  function editAccountHTML(id, a) {
    return `<h3>${id ? esc(a.name) + " の設定" : "口座を追加"}</h3>
  <div class="form">
    <div class="field"><label for="a-name">口座名</label><input id="a-name" value="${esc(a.name)}"></div>
    <div class="field"><label for="a-cat">区分</label><select id="a-cat">${opt(
      Object.keys(CAT).map(c => [c, CAT[c].l]),
      a.category,
    )}</select></div>
    <div class="field"><label for="a-bal">いまの残高</label><input type="number" id="a-bal" inputmode="numeric" value="${a.balance ?? ""}"></div>
    <div class="field"><label for="a-extra">それ以外の支払額／月</label><input type="number" id="a-extra" inputmode="numeric" value="${a.extra ?? ""}"></div>
    <div class="field"><label for="a-rate">年利（%）</label><input type="number" id="a-rate" step="0.1" value="${a.rate ?? ""}"></div>
    <div class="field"><label for="a-type">返済方式</label><select id="a-type">${opt(
      [
        ["principal", "元金定額"],
        ["level", "元利定額"],
        ["none", "定額・利息なし"],
      ],
      a.repayType,
    )}</select></div>
    <div class="field"><label for="a-pp">毎月の元金</label><input type="number" id="a-pp" inputmode="numeric" value="${a.principalPay ?? ""}"></div>
    <div class="field"><label for="a-pay">毎月の支払額</label><input type="number" id="a-pay" inputmode="numeric" value="${a.payment ?? ""}"></div>
    <div class="field"><label for="a-day">支払日（31=末日）</label><input type="number" id="a-day" min="1" max="31" value="${a.payDay ?? ""}"></div>
    <div class="field"><label for="a-me">支払方法</label><select id="a-me">${mopt(a.method)}</select></div>
    <div class="field"><label for="a-lim">極度額</label><input type="number" id="a-lim" inputmode="numeric" value="${a.limit ?? ""}"></div>
    <div class="field"><label for="a-lrate">遅延損害金（年率%）</label><input type="number" id="a-lrate" step="0.1" inputmode="decimal" placeholder="例 14.6" value="${a.lateRate ?? ""}"></div>
    <div class="field full"><label for="a-memo">メモ</label><textarea id="a-memo" rows="2">${esc(a.memo)}</textarea></div>
    <div class="sec full">延滞したときの振込先</div>
    <div class="field"><label for="a-bk">金融機関</label><input id="a-bk" placeholder="例 楽天銀行" value="${esc(a.bankName || "")}"></div>
    <div class="field"><label for="a-br">支店</label><input id="a-br" placeholder="例 第一営業支店" value="${esc(a.bankBranch || "")}"></div>
    <div class="field"><label for="a-bt">種別</label><select id="a-bt">${opt(
      [
        ["普通", "普通"],
        ["当座", "当座"],
      ],
      a.bankType || "普通",
    )}</select></div>
    <div class="field"><label for="a-bn">口座番号</label><input id="a-bn" inputmode="numeric" value="${esc(a.bankNo || "")}"></div>
    <div class="field full"><label for="a-bh">名義（カナ）</label><input id="a-bh" value="${esc(a.bankHolder || "")}"></div>
    <div class="field full"><label for="a-bm">振込のメモ</label><input id="a-bm" placeholder="例 振込名義の前に会員番号を入れる" value="${esc(a.bankMemo || "")}"></div>
    <label class="cb full"><input type="checkbox" id="a-act" ${a.active !== false ? "checked" : ""}>有効（集計と支払予定の対象）</label>
    <div class="note full">元金定額：毎月の元金＋利息を払う ／ 元利定額：毎月同じ額を払う（その中から利息を引いた分が元金）。「それ以外の支払額」は家賃や一括払いなど、リボ以外に毎月一緒に引き落とされる額です。</div>
  </div>
  <div class="actions"><div>${id ? '<button class="danger" id="a-del">削除</button>' : ""}</div><div><button class="ghost" data-close="1">キャンセル</button><button class="primary" id="a-save">保存</button></div></div>`;
  }
  /* 保存すると、その口座の今後の支払予定を作り直す */
  async function saveAccount(id, a) {
    const name = $("a-name").value.trim();
    if (!name) {
      $("a-name").focus();
      return;
    }
    const d = {
      ...a,
      name,
      category: $("a-cat").value,
      balance: numOrNull($("a-bal").value),
      extra: numOrNull($("a-extra").value),
      rate: numOrNull($("a-rate").value),
      repayType: $("a-type").value,
      principalPay: numOrNull($("a-pp").value),
      payment: numOrNull($("a-pay").value),
      payDay: numOrNull($("a-day").value),
      method: $("a-me").value,
      limit: numOrNull($("a-lim").value),
      memo: $("a-memo").value,
      lateRate: numOrNull($("a-lrate").value),
      bankName: $("a-bk").value.trim(),
      bankBranch: $("a-br").value.trim(),
      bankType: $("a-bt").value,
      bankNo: $("a-bn").value.trim(),
      bankHolder: $("a-bh").value.trim(),
      bankMemo: $("a-bm").value.trim(),
      active: $("a-act").checked,
    };
    delete d.startBalance;
    const aid = id || "a" + Date.now().toString(36);
    if (!id) d.order = accList().length;
    S.accounts[aid] = d;
    const ch = regenFuture([aid]);
    closeSheet();
    render();
    await Promise.all([saveAcc(aid), saveMonths(ch)]);
    if (ch.length) toast(`${esc(name)}の今後の支払予定を作り直しました`);
  }

  /* ---------- 返済計画：毎月の返済を増やす・1回だけ繰上げ ---------- */
  async function applyStep() {
    const w = S.ad;
    const id = w.id;
    const a = S.accounts[id];
    const val = Math.max(0, Number(w.val) || 0);
    const steps = [...(a.steps || []).filter(x => x.from < w.from), { from: w.from, value: val }];
    S.accounts[id] = { ...a, steps };
    const ch = regenFuture([id]);
    w.val = null;
    render();
    renderAcc();
    toast(`${esc(a.name)}：${ymLabel(w.from)}から ${yen(val)} にして、今後の支払予定を作り直しました`);
    await Promise.all([saveAcc(id), saveMonths(ch)]);
  }
  async function delStep(from) {
    const id = S.ad.id;
    const a = S.accounts[id];
    S.accounts[id] = { ...a, steps: (a.steps || []).filter(x => x.from !== from) };
    const ch = regenFuture([id]);
    S.ad.val = null;
    render();
    renderAcc();
    await Promise.all([saveAcc(id), saveMonths(ch)]);
  }
  async function addPrepay(id, amt) {
    const a = S.accounts[id];
    if (!a || !amt) return;
    const [ps, pe] = periodRange(periodOf(today()));
    const t = today();
    const date = t > pe ? pe : t < ps ? ps : t;
    const it = {
      id: uid(),
      name: `${a.name} 繰上げ返済`,
      accountId: id,
      category: a.category,
      kind: "normal",
      amount: amt,
      principal: amt,
      interest: 0,
      balanceBefore: a.balance,
      date,
      method: a.method || "振込",
      status: "planned",
      memo: "繰上げ返済",
      applied: false,
      source: "app",
    };
    const ym = putItem(it);
    render();
    renderAcc();
    toast(`${esc(a.name)}に ${yen(amt)} の繰上げ返済を今期の支払に追加しました。払ったら「支払う」を押してください`);
    await saveMonth(ym);
  }

  /* ---------- 手取り・AI・折りたたみ ---------- */
  function openIncome(p) {
    const cur = S.cfg.incomeBy?.[p];
    openSheet(
      `<h3>${periodLabel(p)}の手取り</h3>
  <div class="note">給料日に実際に入った手取りを入れてください。空欄にすると標準の手取り（${yen(S.cfg.income)}）を使います。</div>
  <div class="form"><div class="field full"><label for="i-amt">手取り</label><input type="number" id="i-amt" inputmode="numeric" value="${cur ?? ""}" placeholder="${S.cfg.income}"></div></div>
  <div class="actions"><div></div><div><button class="ghost" data-close="1">キャンセル</button><button class="primary" id="i-ok">保存</button></div></div>`,
      () => {
        $("i-ok").onclick = () => {
          const v = numOrNull($("i-amt").value);
          const by = { ...(S.cfg.incomeBy || {}) };
          if (v == null) delete by[p];
          else by[p] = v;
          S.cfg = { ...S.cfg, incomeBy: by };
          closeSheet();
          render();
          saveCfg();
        };
      },
    );
  }
  function toggleFold(k) {
    S.fold[k] = !S.fold[k];
    saveFold();
    applyFold();
  }

  /* ---------- 設定：支払予定の作り直し・作成、収入と給料日、支払方法 ---------- */
  function regenAll() {
    const before = JSON.parse(JSON.stringify(S.months));
    const ch = regenFuture(null);
    const sn = { m: Object.fromEntries(ch.map(ym => [ym, before[ym] || null])), a: {} };
    render();
    saveMonths(ch).then(ok => ok && toast("今後の支払予定を作り直しました", sn));
  }
  async function genMonth(ym) {
    const have = new Set(
      allItems()
        .filter(i => i.kind !== "late" && bmOf(i) === ym)
        .map(i => i.accountId),
    );
    const [y, m] = ym.split("-").map(Number);
    const last = daysIn(y, m);
    const add = accList()
      .filter(
        a =>
          a.active !== false &&
          a.payDay &&
          !have.has(a.id) &&
          (a.payment || a.principalPay) &&
          (a.repayType === "none" || a.balance > 0 || a.extra > 0),
      )
      .map(a => {
        const date = bizDay(`${ym}-${pad(Math.min(a.payDay, last))}`);
        const debt = a.repayType && a.repayType !== "none" && a.balance > 0;
        if (isDebt(a) && !debt)
          return {
            id: uid(),
            name: a.name,
            accountId: a.id,
            category: a.category,
            kind: "normal",
            amount: a.extra,
            principal: 0,
            interest: 0,
            other: a.extra,
            balanceBefore: 0,
            date,
            method: a.method || "",
            status: "planned",
            memo: "",
            applied: false,
            source: "app",
          };
        const int = debt ? interestFor(a.balance, a.rate, date) : null;
        const pr =
          a.repayType === "principal"
            ? Math.min(a.principalPay, a.balance)
            : a.repayType === "level"
              ? Math.min(a.balance, (a.payment || 0) - int)
              : null;
        return {
          id: uid(),
          name: a.name,
          accountId: a.id,
          category: a.category,
          kind: "normal",
          amount: debt ? pr + int + (a.extra || 0) : a.payment,
          principal: pr,
          interest: int,
          other: debt ? a.extra || 0 : null,
          balanceBefore: debt ? a.balance : null,
          date,
          method: a.method || "",
          status: "planned",
          memo: "",
          applied: false,
          source: "app",
        };
      });
    if (!add.length) {
      status(`${ymLabel(ym)}に作成できる支払はありませんでした。`);
      return;
    }
    const ch = new Set();
    add.forEach(x => {
      x.bm = ym;
      ch.add(putItem(x));
    });
    render();
    await saveMonths([...ch]);
    status(`${ymLabel(ym)}の支払予定を${add.length}件作成しました。`);
    $("mGenMonth").value = addMonths(ym, 1);
  }
  function saveIncomeCfg() {
    S.cfg = {
      ...S.cfg,
      income: numOrNull($("mIncome").value) || 0,
      payday: Math.min(28, Math.max(1, numOrNull($("mPayday").value) || DEFAULT_PAYDAY)),
    };
    S.period = periodOf(today());
    FIN.renderAll();
    saveCfg().then(ok => ok && toast("保存しました"));
  }
  function moveMethod(i, dir) {
    const j = i + dir;
    const m = [...S.cfg.methods];
    if (j < 0 || j >= m.length) return;
    [m[i], m[j]] = [m[j], m[i]];
    S.cfg = { ...S.cfg, methods: m };
    renderMaster();
    saveCfg();
    const b = document.querySelector(`[data-mvm="${j}"][data-dir="${dir}"]`);
    (b && !b.disabled ? b : document.querySelector(`[data-mvm="${j}"]:not(:disabled)`))?.focus();
  }
  function removeMethod(i) {
    S.cfg.methods = S.cfg.methods.filter((_, k) => k !== i);
    render();
    renderMaster();
    saveCfg();
  }
  function addMethod() {
    const v = $("mMethodIn").value.trim();
    if (!v || S.cfg.methods.includes(v)) return;
    S.cfg.methods = [...S.cfg.methods, v];
    $("mMethodIn").value = "";
    render();
    saveCfg();
  }

  /* ===================== イベント ===================== */
  /* ---------- クリック ---------- */
  document.addEventListener("click", e => {
    if (!e.target.closest(".pay, #st-pay")) return; // 家計簿の部品は kb.js が受け持つ
    const h = e.target.closest(".fold-h");
    if (h && !e.target.closest("button,input,a")) toggleFold(h.dataset.fold);
    if (e.target.id === "scrim") closeSheet(); // シートの外側
    const t = e.target.closest("button,[data-editacc],[data-acc],.row[data-edit]");
    if (!t) return;
    const d = t.dataset;
    /* ヘッダー・通知・シート */
    if (d.close) closeSheet();
    else if (d.goto) {
      FIN.kb.setTab(d.goto);
      window.scrollTo(0, 0);
    } else if (d.inc) openIncome(d.inc);
    /* 支払い */
    else if (d.f) {
      S.filter = d.f;
      render();
    } else if (t.id === "cAdd" || d.add) editItem(null);
    else if (d.pay) openPay(d.pay);
    else if (d.unpay) {
      closeSheet();
      unpay(d.unpay);
    } else if (d.undefer) {
      closeSheet();
      undefer(d.undefer);
    } else if (d.edit) {
      const f = findItem(d.edit);
      if (f && f.it.status === "planned") openPay(d.edit);
      else editItem(d.edit);
    } else if (d.edetail) editItem(d.edetail);
    /* 残高と計画・口座の画面 */ else if (d.editacc) editAccount(d.editacc);
    else if (d.acc) openSchedule(d.acc);
    else if (t.id === "mAdd") editAccount(null);
    else if (d.adtab) {
      S.ad.tab = d.adtab;
      renderAcc();
    } else if (d.awq) {
      const a = { id: S.ad.id, ...S.accounts[S.ad.id] };
      S.ad.val = stepVal(a, S.ad.from) + Number(d.awq);
      renderAcc();
    } else if (d.awp) {
      S.ad.pp = Number(d.awp);
      renderAcc();
    } else if (t.id === "aw-apply") applyStep();
    else if (d.awdel) delStep(d.awdel);
    else if (d.qa) {
      $("pAmt").value = d.qa;
      $("pAmt").dataset.touched = 1;
      renderPlan();
    } else if (d.prepay) addPrepay(d.prepay, Number(d.amt));
    /* 設定 */ else if (t.id === "mRegen") regenAll();
    else if (t.id === "mGen") {
      const m = $("mGenMonth").value;
      if (m) genMonth(m);
    } else if (t.id === "mSaveCfg") saveIncomeCfg();
    else if (d.mvm != null) moveMethod(Number(d.mvm), Number(d.dir));
    else if (d.rmm != null) removeMethod(Number(d.rmm));
  });

  /* ---------- キー：折りたたみ・行は Enter / スペースで開く、Esc で閉じる ---------- */
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if ($("sheetHost").innerHTML) closeSheet();
      return;
    }
    if (!e.target.closest?.(".pay")) return;
    const h = e.target.closest?.(".fold-h");
    if (h && (e.key === "Enter" || e.key === " ") && e.target === h) {
      e.preventDefault();
      toggleFold(h.dataset.fold);
    }
    if (e.key === "Enter" && e.target.dataset?.editacc) editAccount(e.target.dataset.editacc);
    if ((e.key === "Enter" || e.key === " ") && e.target.classList?.contains("row") && e.target.dataset.edit) {
      e.preventDefault();
      e.target.click();
    }
  });

  /* ---------- 入力：返済計画の数字（口座の画面は入力が止まってから描き直す） ---------- */
  document.addEventListener("input", e => {
    const id = e.target.id;
    if (id === "sExtra") {
      S.sim.extra = Number(e.target.value);
      renderPlan();
    } else if (id === "pAmt") {
      e.target.dataset.touched = 1;
      renderPlan();
    } else if (id === "aw-val" || id === "aw-pp") {
      if (id === "aw-val") S.ad.val = Number(e.target.value) || 0;
      else S.ad.pp = Number(e.target.value) || 0;
      clearTimeout(ui.awT);
      ui.awT = setTimeout(() => {
        const pos = e.target.selectionStart;
        renderAcc();
        const el = $(id);
        if (el) {
          el.focus({ preventScroll: true });
          try {
            el.setSelectionRange(pos, pos);
          } catch (_) {}
        }
      }, 500);
    }
  });
  document.addEventListener("change", e => {
    if (e.target.id === "aw-from") {
      S.ad.from = e.target.value;
      S.ad.val = null;
      renderAcc();
    }
  });
  document.addEventListener("submit", e => {
    if (e.target.id === "mMethodForm") {
      e.preventDefault();
      addMethod();
    }
  });
  /* 幅がスマホとPCをまたいだら、グラフを描き直す */
  addEventListener("resize", () => {
    if (innerWidth < 640 !== ui.narrow) {
      ui.narrow = innerWidth < 640;
      if (S.view === "balance") renderPlan();
    }
  });

  /* ===================== 家計簿から呼ぶ関数 ===================== */
  Object.assign(FIN.pay, {
    render,
    show,
    renderSettings: renderMaster,
    aiData: aiPayload, // AI分析に渡す返済のデータ
    aiHash,
    saveAI,
    paintSave,
    months: () => Object.keys(S.months), // 月度の選択肢に入れる月
    ready: () => !!S.db && S.loaded.m,
  });

  /* ===================== 起動 ===================== */
  S.fold = loadFold();
  paintSave();
  /* クラウドに接続して、口座・支払・設定・AIの結果を読み込む（他の端末の変更もここで届く） */
  (async () => {
    const { db } = await U.store();
    if (!db) {
      S.dbFail = true;
      paintSave();
      status("データに接続できません。電波のよい場所で開き直してください。", true);
      return;
    }
    S.db = db;
    paintSave();
    db.collection("accounts").onSnapshot(
      s => {
        const o = {};
        s.docs.forEach(d => (o[d.id] = d.data()));
        S.accounts = o;
        S._base = null;
        render();
        FIN.kb.renderAI && FIN.kb.renderAI();
      },
      () => status("口座データを読み込めませんでした。", true),
    );
    db.collection("months").onSnapshot(
      s => {
        const o = {};
        s.docs.forEach(d => (o[d.id] = { items: [...(d.data().items || [])] }));
        for (const k in S.pending) if (S.pending[k] > 0 && S.months[k]) o[k] = S.months[k]; // 保存中の月は自分の内容を優先
        S.months = o;
        S._base = null;
        S.loaded.m = true;
        paintSave();
        FIN.renderAll(); // 月度の選択肢に支払いの月も入れる
      },
      () => status("支払データを読み込めませんでした。", true),
    );
    db.doc("config/ai").onSnapshot(s => {
      if (s.exists) {
        S.ai = FIN.ai = s.data();
        if (S.view === "balance") renderAILink();
        FIN.kb.renderAI && FIN.kb.renderAI();
      }
    });
    db.doc("config/master").onSnapshot(s => {
      if (s.exists) {
        const c = s.data();
        const before = FIN.currentPeriod();
        S.cfg = { ...S.cfg, ...c, methods: Array.isArray(c.methods) ? [...c.methods] : S.cfg.methods };
        FIN.paydayChanged(before);
        FIN.renderAll();
      }
    });
  })();
})();
