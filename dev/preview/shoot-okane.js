/* 確認用：おかね手帳の全画面をサンプルデータ（sample-okane.js）で撮る（スマホ幅・PC幅、明るい表示・暗い表示）。
   使い方：node dev/preview/shoot-okane.js 出力先のフォルダ [名前に含む文字で絞り込み]
   今日＝2026年11月20日（金）12:00（日本時間）に固定 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { start } = require("./serve.js");

const OUT = path.resolve(process.argv[2] || "shots-okane");
const ONLY = process.argv[3] || "";
const PORT = 8190;
const NOW = new Date("2026-11-20T12:00:00+09:00");
const DEVICES = [
  { key: "sp", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { key: "pc", viewport: { width: 1280, height: 860 } },
];
const click = sel => async p => {
  await p.locator(sel).locator("visible=true").first().click({ timeout: 8000 });
  await p.waitForTimeout(500);
};
const SCENES = [
  { name: "kb-list", tab: "list", full: true },
  { name: "pay-home", tab: "home", full: true },
  { name: "an-graph", tab: "graph", full: true },
  { name: "an-balance", tab: "balance", full: true },
  { name: "kb-add", tab: "list", act: click("#hAdd, #sbAdd"), sheet: true },
  { name: "kb-edit", tab: "list", act: click("[data-edit]"), sheet: true },
  { name: "kb-filter", tab: "list", act: click("#fbarK button") },
  { name: "kb-month", tab: "list", act: click("#month") },
  { name: "pay-add", tab: "home", act: click("#hAdd, #sbAdd"), sheet: true },
  { name: "pay-pay", tab: "home", act: click("[data-pay]"), sheet: true },
  { name: "pay-item", tab: "home", act: click("[data-edit]"), sheet: true },
  { name: "acc-detail", tab: "balance", act: click("[data-acc]"), sheet: true },
  { name: "settings", tab: "list", act: click("#gear, #sbgear"), sheet: true },
];

async function shotSheet(p, file) {
  const extra = await p.evaluate(() => {
    let m = 0;
    document.querySelectorAll("body *").forEach(e => {
      const oy = getComputedStyle(e).overflowY;
      if ((oy === "auto" || oy === "scroll") && e.getClientRects().length && e !== document.body) m = Math.max(m, e.scrollHeight - e.clientHeight);
    });
    return m;
  });
  const vp = p.viewportSize();
  if (extra > 0) {
    await p.setViewportSize({ width: vp.width, height: Math.min(vp.height + extra, 6000) });
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
  for (const dev of DEVICES)
    for (const theme of ["light", "dark"])
      for (const sc of SCENES) {
        const name = `${dev.key}-${theme}-${sc.name}`;
        if (ONLY && !name.includes(ONLY)) continue;
        if (theme === "dark" && !/^(kb-list|pay-home|kb-add|settings)$/.test(sc.name)) continue;
        const ctx = await browser.newContext({ ...dev, deviceScaleFactor: 2, timezoneId: "Asia/Tokyo", locale: "ja-JP", colorScheme: theme });
        const p = await ctx.newPage();
        await p.clock.install({ time: NOW });
        p.on("pageerror", e => errors.push(`${name}: ${e.message}`));
        await p.addInitScript(
          ([tab, theme]) => {
            localStorage.setItem("kakeibo.tab", tab);
            localStorage.setItem("u-theme:okane", theme);
          },
          [sc.tab, theme],
        );
        await p.goto(`http://localhost:${PORT}/okane/`);
        await p.waitForTimeout(1500);
        await p.evaluate(() => document.fonts.ready);
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
  await browser.close();
  srv.close();
  if (errors.length) {
    console.log("\n問題:\n" + errors.join("\n"));
    process.exitCode = 1;
  }
})();
