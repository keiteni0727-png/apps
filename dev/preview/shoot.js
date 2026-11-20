/* 確認用：エンタメ管理の全画面をサンプルデータで撮る（スマホ幅・PC幅、明るい表示・暗い表示）。
   使い方：node dev/preview/shoot.js 出力先のフォルダ [名前に含む文字で絞り込み]
   今日＝2026年11月20日（金）12:00（日本時間）に固定して撮るので、何度撮っても同じ絵になる。 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { start } = require("./serve.js");

const OUT = path.resolve(process.argv[2] || "shots");
const ONLY = process.argv[3] || "";
const PORT = 8130;
const NOW = new Date("2026-11-20T12:00:00+09:00");

const DEVICES = [
  { key: "sp", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { key: "pc", viewport: { width: 1280, height: 860 } },
];
const MODES = ["w", "a", "d", "m", "s", "yt", "sr", "mu", "o"];

/* 画面ごとの手順。mode＝開くメニュー、act＝開いたあとにする操作、sheet＝重なって出る画面（全体が入るように縦に伸ばして撮る） */
const click = sel => async p => {
  await p.locator(sel).locator("visible=true").first().click({ timeout: 8000 });
  await p.waitForTimeout(500);
};
const openDetail = id => click(`#main [data-id="${id}"]`);
/* 各話リストの貼り付け：話数タブ →「話数を編集」→「各話リストを貼り付け」→ 架空の各話リストを入れる → steps の順に押す */
const PASTE_TEXT = ["話数\tサブタイトル\t放送日", "第1話\tはじまりの絵の具\t2026年10月2日", "第2話\t青い屋根の店\t10月9日", "第3話\t小さな依頼人\t10月16日", "第4話\t雨の日の約束\t10月23日", "第5話\t星を描く少女\t10月30日", "第6話\t秋祭りの夜\t11月6日", "第7話\t消えた絵筆\t11月13日"].join("\n");
const pasteTo = (...steps) => pasteWith(PASTE_TEXT, steps);
/* 話数が読めない行が途中にある表（自動で読めないので整形の表が開く） */
const PASTE_MESSY = ["話数\tサブタイトル\t放送日", "第1話\tはじまりの絵の具\t2026年10月2日", "総集編\tこれまでのアトリエ\t10月9日", "第2話\t青い屋根の店\t10月16日"].join("\n");
pasteTo.messy = (...steps) => pasteWith(PASTE_MESSY, steps);
const pasteWith = (text, steps) => async p => {
  await openDetail("a1")(p);
  await click('[data-dtab="ep"]')(p);
  await click("#epEditBtn")(p);
  await click("#spOpen")(p);
  await p.fill("#spText", text);
  for (const s of steps) await click(s)(p);
};
const SCENES = [
  ...MODES.map(m => ({ name: `list-${m}`, mode: m, full: true, only: m === "o" ? "sp" : "" })),
  { name: "filter-sheet", mode: "a", act: click("[data-fsheet]"), sheet: true },
  { name: "filter-sort", mode: "a", act: click('[data-fpop="sort"]') },
  { name: "filter-status", mode: "a", act: click('[data-fpop="sv"]') },
  { name: "search", mode: "a", act: click("[data-qtog]") },
  { name: "detail-anime", mode: "a", act: openDetail("a1"), sheet: true },
  { name: "detail-anime-done", mode: "a", act: openDetail("a7"), sheet: true },
  { name: "detail-drama", mode: "d", act: openDetail("d1"), sheet: true },
  { name: "detail-movie", mode: "m", act: openDetail("m1"), sheet: true },
  { name: "detail-variety", mode: "s", act: openDetail("s1"), sheet: true },
  { name: "detail-yt", mode: "yt", act: click('#main [data-yt="y1"]'), sheet: true },
  { name: "detail-eps", mode: "a", act: async p => (await openDetail("a1")(p), await click('[data-dtab="ep"]')(p)), sheet: true },
  { name: "detail-eps-menu", mode: "a", act: async p => (await openDetail("a1")(p), await click('[data-dtab="ep"]')(p), await click("#epMenuBtn")(p)) },
  { name: "eps-edit", mode: "a", act: async p => (await openDetail("a1")(p), await click('[data-dtab="ep"]')(p), await click("#epEditBtn")(p)), sheet: true },
  { name: "paste-input", mode: "a", act: pasteTo(), sheet: true },
  { name: "paste-result", mode: "a", act: pasteTo("#spRead"), sheet: true },
  { name: "paste-grid", mode: "a", act: pasteTo("#spRead", "#spFmt"), sheet: true },
  { name: "paste-grid-auto", mode: "a", act: pasteTo.messy("#spRead"), sheet: true },
  { name: "form-add", mode: "a", act: click("#hAdd, #sbAdd"), sheet: true },
  { name: "form-add-yt", mode: "yt", act: click("#hAdd, #sbAdd"), sheet: true },
  {
    name: "form-edit",
    mode: "a",
    act: async p => {
      await openDetail("a1")(p);
      await click("#editItem")(p);
    },
    sheet: true,
  },
  { name: "settings", mode: "a", act: click("[data-gear]"), sheet: true },
];

async function shotSheet(p, file) {
  /* 重なって出る画面：中身の高さまで画面を縦に伸ばして、全体を1枚に撮る */
  /* 重なった画面の中でスクロールする部分のうち、はみ出しがいちばん大きいものの分だけ伸ばす */
  const extra = await p.evaluate(() => {
    let m = 0;
    document.querySelectorAll("#layer *, .fsh *, body > div:not(.u-app) *").forEach(e => {
      const oy = getComputedStyle(e).overflowY;
      if ((oy === "auto" || oy === "scroll") && e.getClientRects().length) m = Math.max(m, e.scrollHeight - e.clientHeight);
    });
    return m;
  });
  const h = p.viewportSize().height + extra;
  const vp = p.viewportSize();
  if (h > vp.height) {
    await p.setViewportSize({ width: vp.width, height: Math.min(h, 6000) });
    await p.waitForTimeout(300);
  }
  await p.screenshot({ path: file });
  await p.setViewportSize(vp);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await start(PORT);
  const browser = await chromium.launch();
  const errors = [];
  for (const dev of DEVICES) {
    for (const theme of ["light", "dark"]) {
      for (const sc of SCENES) {
        if (sc.only && sc.only !== dev.key) continue;
        if (dev.key === "pc" && sc.mode === "o") continue;
        const name = `${dev.key}-${theme}-${sc.name}`;
        if (ONLY && !name.includes(ONLY)) continue;
        if (theme === "dark" && !/^(list-(w|a)|detail-anime|form-edit|settings|filter-sheet|eps-edit)$/.test(sc.name)) continue;
        const ctx = await browser.newContext({ ...dev, deviceScaleFactor: 2, timezoneId: "Asia/Tokyo", locale: "ja-JP", colorScheme: theme });
        const p = await ctx.newPage();
        await p.clock.install({ time: NOW });
        p.on("pageerror", e => errors.push(`${name}: ${e.message}`));
        await p.addInitScript(
          ([mode, theme]) => {
            localStorage.setItem("adb.v3.ui", JSON.stringify({ mode }));
            localStorage.setItem("u-theme:entame", theme);
          },
          [sc.mode, theme],
        );
        await p.goto(`http://localhost:${PORT}/entame/`);
        await p.waitForSelector("#main :not(.loading)", { timeout: 10000 });
        await p.evaluate(() => document.fonts.ready);
        await p.waitForTimeout(600);
        try {
          if (sc.act) await sc.act(p);
          const file = path.join(OUT, name + ".png");
          if (sc.sheet) await shotSheet(p, file);
          else await p.screenshot({ path: file, fullPage: !!sc.full });
          console.log("ok  ", name);
        } catch (e) {
          errors.push(`${name}: ${e.message.split("\n")[0]}`);
          console.log("fail", name);
        }
        await ctx.close();
      }
    }
  }
  await browser.close();
  srv.close();
  if (errors.length) {
    console.log("\n問題:\n" + errors.join("\n"));
    process.exitCode = 1;
  }
})();
