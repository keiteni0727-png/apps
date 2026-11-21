/* ===================== 確認用：架空のサンプルデータ =====================
   作品名・曲名などはすべて架空。日付は「2026年11月20日（金）」を今日として作る（撮影の時計もこの日に合わせる）。
   ?backup=ファイル名 でバックアップのファイル（entame-backup-*.json）を読むと、そちらを使う（dev/preview/ の中に置く・コミットしない） */
(() => {
  const backup = new URLSearchParams(location.search).get("backup");
  if (backup) {
    const x = new XMLHttpRequest();
    x.open("GET", "../dev/preview/" + backup, false);
    x.send();
    window.PREVIEW_DATA = JSON.parse(x.responseText).data;
    return;
  }
  /* 日本時間の日付と時刻 → アプリの持ち方（1970年からの分・世界時） */
  const T = (day, hm = "09:00") => {
    const [y, m, d] = day.split("-").map(Number);
    const [h, mi] = hm.split(":").map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 60000) + h * 60 + mi - 540;
  };
  const addDays = (day, n) => {
    const d = new Date(day + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const AT = Date.UTC(2026, 10, 19, 12, 0);
  /* 毎週の話数：first＝1話の放送日、n＝話数、seen＝見た話の数 */
  const weekly = (first, hm, n, seen, extra = {}) => {
    const eps = [],
      w = {};
    for (let i = 1; i <= n; i++) {
      eps.push({ n: String(i), s: extra.subs ? extra.subs[i - 1] || "" : "", t: T(addDays(first, (i - 1) * 7), hm) });
      if (i <= seen) w[String(i)] = AT - (seen - i) * 864e5;
    }
    return { eps, w, _at: AT };
  };
  const titles = {},
    progress = {};
  let o = 0;
  const add = (id, t, p) => {
    titles[id] = { o: o++, _at: AT, ...t };
    if (p) progress[id] = p;
  };
  const song = (type, st, ar, a = null, b = null) => ({ type, st, ar, s: `${st} ${ar}`, a, b });

  /* ---- アニメ：今期（2026秋） ---- */
  add(
    "a1",
    { k: "a", t: "星降る街のアトリエ", s: "視聴中", dow: 4, time: "23:00", from: "2026-10-02", media: "tv", stations: ["TOKYO MX", "BS"], vods: ["Netflix", "dアニメストア"], cours: ["2026秋"], series: "アトリエ", url: "https://example.com/", songs: [song("OP", "ひかりのかけら", "架空バンド"), song("ED", "夜明けのしずく", "うたびと")] },
    weekly("2026-10-02", "23:00", 12, 6, { subs: ["はじまりの絵の具", "青い屋根の店", "小さな依頼人"] }),
  );
  add(
    "a2",
    { k: "a", t: "機甲少女レグルス", s: "視聴中", dow: 5, time: "25:30", from: "2026-10-03", media: "tv", stations: ["テレビ東京"], vods: ["ABEMA", "U-NEXT"], cours: ["2026秋"], songs: [song("OP", "STARDRIVE", "NOVA//LINE"), song("ED", "Re:boot", "月島ミナ"), song("挿入歌", "鉄の祈り", "NOVA//LINE", 7, 7)] },
    weekly("2026-10-04", "01:30", 12, 7),
  );
  add(
    "a3",
    { k: "a", t: "となりの席の魔法使い", s: "未視聴", dow: 0, time: "24:00", from: "2026-10-06", media: "tv", stations: ["日本テレビ"], vods: ["Disney＋"], cours: ["2026秋"], songs: [song("OP", "まほうのことば", "ここあ")] },
    weekly("2026-10-07", "00:00", 12, 0),
  );
  add(
    "a4",
    { k: "a", t: "辺境ギルドの受付係", s: "視聴中", dow: 6, time: "17:30", from: "2026-10-04", media: "tv", stations: ["TBS"], vods: ["Netflix", "Prime Video"], cours: ["2026秋", "2027冬"], series: "受付係", songs: [song("OP", "Welcome Home", "STELLAR")] },
    weekly("2026-10-04", "17:30", 24, 5),
  );
  add("a5", { k: "a", t: "深海図書館", s: "未視聴", dow: 2, time: "22:00", from: "2026-10-08", media: "stream", plat: ["Netflix"], cours: ["2026秋"] }, weekly("2026-10-08", "17:00", 10, 0));
  add("a6", { k: "a", t: "おしごと日和", s: "見ない", dow: 1, time: "21:54", from: "2026-10-07", media: "tv", stations: ["NHK"], cours: ["2026秋"] }, weekly("2026-10-07", "21:54", 13, 1));
  /* ---- アニメ：前のクール・過去 ---- */
  add(
    "a7",
    { k: "a", t: "星降る街のアトリエ 前日譚", s: "視聴済み", dow: 4, time: "23:00", from: "2025-04-03", media: "tv", stations: ["TOKYO MX"], vods: ["dアニメストア"], cours: ["2025春"], series: "アトリエ", songs: [song("OP", "はじまりの色", "架空バンド"), song("ED", "ひだまり", "うたびと")] },
    weekly("2025-04-03", "23:00", 12, 12),
  );
  add("a8", { k: "a", t: "辺境ギルドの受付係（第1期）", s: "視聴済み", dow: 6, time: "17:30", from: "2025-10-05", media: "tv", stations: ["TBS"], vods: ["Netflix"], cours: ["2025秋"], series: "受付係" }, weekly("2025-10-05", "17:30", 12, 12));
  add("a9", { k: "a", t: "夏空サイダー", s: "視聴済み", dow: 3, time: "24:30", from: "2026-07-02", media: "tv", stations: ["フジテレビ"], vods: ["TVer"], cours: ["2026夏"], songs: [song("主題歌", "サイダーブルー", "青葉ソラ")] }, weekly("2026-07-03", "00:30", 12, 12));
  add("a10", { k: "a", t: "雪国の郵便屋さん", s: "視聴中", dow: -1, from: "2026-01-08", media: "tv", stations: ["BS"], cours: ["2026冬"] }, weekly("2026-01-08", "22:30", 12, 9));
  add("a11", { k: "a", t: "未来ラジオ", s: "未視聴", from: "2024-10-01", media: "ova", cours: [] });
  add("a12", { k: "a", t: "名前のない作品（入力途中）", s: "", dow: -1, from: "", media: "tv" });
  /* とても長いシリーズ名（絞り込みのシリーズの札が折り返すかを見る） */
  add("a13", { k: "a", t: "長い名前のシリーズの作品", s: "視聴済み", from: "2023-04-06", media: "tv", stations: ["TOKYO MX"], cours: ["2023春"], series: "とても長い名前のシリーズ ～はじまりの星と終わりの海と、もうひとつの物語～" });
  /* ---- ドラマ ---- */
  add("d1", { k: "d", t: "月曜九時の約束", s: "視聴中", dow: 0, time: "21:00", from: "2026-10-12", media: "tv", stations: ["フジテレビ"], slot: "月9", vods: ["TVer"], cours: ["2026秋"], songs: [song("主題歌", "約束の場所", "Hana")] }, weekly("2026-10-12", "21:00", 10, 5));
  add("d2", { k: "d", t: "刑事・朝倉の推理", s: "未視聴", dow: 3, time: "22:00", from: "2026-10-15", media: "tv", stations: ["テレビ朝日"], vods: ["Prime Video"], cours: ["2026秋"] }, weekly("2026-10-15", "22:00", 9, 0));
  add("d3", { k: "d", t: "東京ルームシェア", s: "視聴済み", from: "2026-04-01", media: "stream", plat: ["Netflix"], cours: ["2026春"] }, weekly("2026-04-01", "17:00", 8, 8));
  /* シリーズに放送枠を入れてしまっている作品（設定 → シリーズ の「放送枠へ」を試す） */
  add("d4", { k: "d", t: "失われた夏の日記", s: "見ない", dow: 1, time: "22:00", from: "2026-07-07", media: "tv", stations: ["TBS"], cours: ["2026夏"], series: "火曜ドラマ" });
  /* ---- 映画 ---- */
  add("m1", { k: "a", t: "劇場版 星降る街のアトリエ", s: "未視聴", from: "2026-12-11", media: "movie", series: "アトリエ", songs: [song("主題歌", "星の降る夜に", "架空バンド")] });
  add("m2", { k: "f", t: "海辺のカフェで逢いましょう", s: "視聴済み", from: "2026-06-05", media: "movie" });
  add("m3", { k: "f", t: "ラストラン", s: "未視聴", from: "2026-09-18", media: "movie", rel: "stream", plat: ["Netflix"] });
  add("m4", { k: "a", t: "劇場版 機甲少女レグルス -序章-", s: "視聴済み", from: "2025-08-22", media: "movie" });
  /* ---- バラエティ ---- */
  add("s1", { k: "r", t: "週末ぶらり旅", s: "視聴中", dow: 5, time: "19:00", from: "2026-04-04", media: "tv", stations: ["テレビ東京"], vods: ["TVer"], cours: ["通年"] }, weekly("2026-10-03", "19:00", 8, 6));
  add("s2", { k: "r", t: "クイズ百人ノック", s: "未視聴", from: "2026-10-01", media: "stream", plat: ["ABEMA"], cours: ["2026秋"] });

  /* ---- YouTube 再生リスト ---- */
  const yt = {};
  let yo = 0;
  const y = (id, v) => (yt[id] = { o: yo++, _at: AT, ...v });
  y("y1", { t: "【実況】廃墟ホテルからの脱出", a: "ゆうなぎ", g: "一人実況", sg: "シリーズ", s: "視聴中", up: "2026-09-01", n: 12, dur: "4:32:10", pl: "https://example.com/" });
  y("y2", { t: "4人で無人島サバイバル", a: "TOP4", g: "TOP4", s: "視聴済み", up: "2026-08-15", n: 8, dur: "3:05:00" });
  y("y3", { t: "深夜の協力ホラー", a: "最俺", g: "最俺", s: "", up: "2026-10-20", n: 5, dur: "2:10:44" });
  y("y4", { t: "まったり農場づくり", a: "ゆうなぎ", g: "一人実況", sg: "単発", s: "見ない", up: "2026-05-02", n: 1, dur: "58:12" });
  y("y5", { t: "パズル100問チャレンジ", a: "P-P", g: "P-P", s: "", up: "2026-11-10", n: 3 });

  const master = { all: { series: ["アトリエ", "受付係", "火曜ドラマ"], seriesMain: { 火曜ドラマ: "d" }, slots: ["月9", "日曜劇場"], _at: AT } };
  /* ---- 作品の画像（架空のポスター。img.js と同じ持ち方：titles には版の番号だけ、画像は imgs・imgl に） ---- */
  const imgs = {},
    imgl = {};
  const poster = (id, bg, fg, w = 600, h = 900) => {
    const t = titles[id].t;
    const stars = Array.from({ length: 14 }, (_, k) => `<circle cx="${(k * 137) % w}" cy="${(k * 89) % (h * 0.55)}" r="${2 + (k % 3)}" fill="${fg}" opacity=".7"/>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${stars}<circle cx="${w * 0.5}" cy="${h * 0.42}" r="${Math.min(w, h) * 0.26}" fill="${fg}" opacity=".9"/><rect y="${h * 0.7}" width="${w}" height="${h * 0.3}" fill="#000" opacity=".28"/><text x="${w / 2}" y="${h * 0.86}" font-family="sans-serif" font-weight="700" font-size="${Math.round(w / 13)}" fill="#fff" text-anchor="middle">${t}</text></svg>`;
    const d = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    imgs[id] = { d, v: 1 };
    imgl[id] = { d, v: 1 };
    titles[id].img = 1;
  };
  poster("a1", "#3b5d93", "#f6d58b");
  poster("a2", "#2d3448", "#e05a47");
  poster("a3", "#6b4e8a", "#f2b8d8");
  poster("a4", "#8a5a3c", "#f3e2b8", 960, 540);
  poster("a5", "#1f4f66", "#7fd3e6");
  poster("a7", "#4a6f8a", "#f8e3a3");
  poster("m1", "#22305a", "#ffd36b");
  window.PREVIEW_DATA = { titles, progress, master, yt, imgs, imgl };
})();
