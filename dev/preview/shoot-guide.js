/* 見本ページ（style-guide.html）を、スマホ幅の明るい表示・暗い表示で撮る。
   使い方：node dev/preview/shoot-guide.js 出力先のフォルダ */
const { chromium } = require("playwright");
const path = require("path");
const { start } = require("./serve.js");
const OUT = path.resolve(process.argv[2] || "shots");
(async () => {
  const srv = await start(8160);
  const b = await chromium.launch();
  for (const theme of ["light", "dark"]) {
    const p = await b.newPage({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2, colorScheme: theme });
    await p.goto("http://localhost:8160/dev/preview/style-guide.html");
    await p.evaluate(t => document.documentElement.setAttribute("data-theme", t), theme);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(OUT, `style-guide-${theme}.png`), fullPage: true });
    await p.close();
  }
  await b.close();
  srv.close();
  console.log("ok");
})();
