/* ===================== 確認用：おかね手帳の架空のサンプルデータ =====================
   金額・お店・口座はすべて架空。今日＝2026年11月20日（給料日25日なので、いまの月度は10/25〜11/24）。
   家計簿＝data/users/preview（m-年-月 の明細・分類ルール・マスタ）、支払い＝accounts / months / config */
(() => {
  /* ---- 家計簿：明細 ---- */
  const rows = [
    ["2026-11-20", 820, "食費", "電子マネー", "スーパー"],
    ["2026-11-19", 1280, "外食", "クレカ", "ラーメン"],
    ["2026-11-18", 3480, "日用品", "クレカ", "ドラッグストア"],
    ["2026-11-17", 520, "交通費", "電子マネー", "電車"],
    ["2026-11-15", 4200, "娯楽", "クレカ", "映画"],
    ["2026-11-14", 2600, "食費", "現金", "八百屋"],
    ["2026-11-12", 990, "サブスク", "クレカ", "動画配信"],
    ["2026-11-10", 6800, "光熱費", "クレカ", "電気代"],
    ["2026-11-08", 3300, "通信費", "クレカ", "スマホ"],
    ["2026-11-05", 1650, "外食", "電子マネー", "カフェ"],
    ["2026-11-03", 5400, "美容/衣服", "クレカ", "美容院"],
    ["2026-11-01", 1980, "医療費", "現金", "病院"],
    ["2026-10-30", 2400, "食費", "電子マネー", "スーパー"],
    ["2026-10-27", 760, "交通費", "電子マネー", "バス"],
    ["2026-10-20", 3100, "食費", "クレカ", "スーパー"],
    ["2026-10-12", 4500, "外食", "クレカ", "焼き肉"],
    ["2026-09-28", 2900, "食費", "電子マネー", "スーパー"],
  ];
  const kb = {};
  rows.forEach(([date, amount, category, method, memo], k) => {
    const m = "m-" + date.slice(0, 7);
    const id = "s" + k;
    ((kb[m] = kb[m] || { items: {} }).items[id] = { id, date, amount, category, method, memo });
  });
  kb.rules = { rules: [] };

  /* ---- 支払い：口座と、今月・来月の支払 ---- */
  const accounts = {
    a1: { name: "みどりカード", category: "card", balance: 182000, rate: 15, repayType: "level", payment: 10000, payDay: 27, method: "口座引落", limit: 300000, memo: "", active: true, order: 0 },
    a2: { name: "そらローン", category: "loan", balance: 420000, rate: 17.8, repayType: "level", payment: 15000, payDay: 5, method: "振込", limit: 500000, memo: "", active: true, order: 1 },
    a3: { name: "家族からの借入", category: "personal", balance: 50000, rate: 0, repayType: "none", payDay: 25, method: "振込", memo: "", active: true, order: 2 },
  };
  const pay = (id, a, date, amount, status, principal, interest) => ({
    id, name: accounts[a].name, accountId: a, category: accounts[a].category, kind: "normal", amount, principal, interest, other: 0,
    balanceBefore: accounts[a].balance, date, bm: date.slice(0, 7), method: accounts[a].method, status, memo: "", applied: status === "paid", source: "plan",
  });
  const months = {
    "2026-11": { items: [pay("p1", "a2", "2026-11-05", 15000, "paid", 8800, 6200), pay("p2", "a1", "2026-11-27", 10000, "planned", 7700, 2300)] },
    "2026-12": { items: [pay("p3", "a2", "2026-12-05", 15000, "planned", 8900, 6100), pay("p4", "a1", "2026-12-27", 10000, "planned", 7800, 2200)] },
  };
  const config = { master: { methods: ["口座引落", "振込", "カード"], income: 240000, payday: 25 } };

  window.PREVIEW_DATA = { "data/users/preview": kb, accounts, months, config };
})();
