/* ===================== 家計簿と支払いの橋渡し =====================
  ・月度（給料日から次の給料日の前日まで）の計算を、明細・グラフ・支払い・AI分析で共通に使う
    月度の名前は始まる月で表す（"2026-10" ＝ 2026年10月度 ＝ 10月の給料日から11月の給料日の前日まで）
  ・給料日は支払いの設定（config/master の payday）。土日なら直前の平日
  ・家計簿（kb.js）と支払い（pay.js）は、それぞれ FIN.kb / FIN.pay に呼び出せる関数を置く */
const FIN = {
  CASH: "現金", // 支払いの「残るお金」から引く、明細の支払い方法
  paydayNum: () => 25, // 給料日（支払いの設定が読めたら pay.js が差し替える）
  period: null, // 表示中の月度 "YYYY-MM"
  ai: null, // AI分析の結果（config/ai。端末間で同期）
  kb: {},
  pay: {},
};
(() => {
  const pad = n => String(n).padStart(2, "0");
  const ds = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const pd = s => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d || 1);
  };
  const addMonths = (ym, n) => {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1);
  };
  /* その月の給料日（土日なら直前の平日） */
  FIN.paydayOf = ym => {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(y, m - 1, Math.min(FIN.paydayNum(), new Date(y, m, 0).getDate()));
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    return ds(d);
  };
  /* 日付の月度。明細の件数ぶん呼ぶので、給料日ごとに覚えておく */
  const memo = new Map();
  FIN.periodOf = date => {
    const k = FIN.paydayNum() + "|" + date;
    let p = memo.get(k);
    if (p === undefined) {
      const ym = date.slice(0, 7);
      p = date >= FIN.paydayOf(ym) ? ym : addMonths(ym, -1);
      if (memo.size > 20000) memo.clear();
      memo.set(k, p);
    }
    return p;
  };
  FIN.inPeriod = (date, p) => FIN.periodOf(date) === p;
  /* 月度の最初の日と最後の日 [YYYY-MM-DD, YYYY-MM-DD] */
  FIN.periodRange = p => {
    const s = FIN.paydayOf(p);
    const e = pd(FIN.paydayOf(addMonths(p, 1)));
    e.setDate(e.getDate() - 1);
    return [s, ds(e)];
  };
  FIN.periodDays = p => {
    const [s, e] = FIN.periodRange(p);
    return Math.round((pd(e) - pd(s)) / 864e5) + 1;
  };
  /* 月度の何日目か（0から） */
  FIN.dayIndex = (date, p) => Math.round((pd(date) - pd(FIN.periodRange(p)[0])) / 864e5);
  FIN.dateAt = (p, k) => {
    const d = pd(FIN.periodRange(p)[0]);
    d.setDate(d.getDate() + k);
    return ds(d);
  };
  FIN.periodLabel = p => {
    const [y, m] = p.split("-");
    return y + "年" + Number(m) + "月度";
  };
  FIN.today = () => ds(new Date());
  FIN.currentPeriod = () => FIN.periodOf(FIN.today());
  FIN.addMonths = addMonths;
  FIN.pad = pad;
  FIN.ds = ds;
  FIN.pd = pd;
  FIN.period = FIN.currentPeriod();

  /* 給料日が変わったら、いまの月度を見ていた場合はいまの月度に合わせ直す */
  FIN.paydayChanged = before => {
    if (FIN.period === before) FIN.period = FIN.currentPeriod();
  };
  /* 両方の画面を描き直す */
  FIN.renderAll = () => {
    FIN.kb.render && FIN.kb.render(true);
    FIN.pay.render && FIN.pay.render();
  };
})();
