/* 確認用：いまの画面にある「押せる部品」（ボタン・プルダウン・タブ）の見た目の種類を集めて、1つずつ画像にする。
   高さ・角の丸み・文字の大きさ・枠線・背景色が同じものは1つにまとめる。
   使い方：node dev/preview/catalog.js 出力先のフォルダ  → 部品ごとの画像と index.json */
const { chromium } = require("playwright");
const fs = require("fs");
const { start } = require("./serve.js");
const OUT = process.argv[2] || "catalog";
const click = sel => async p => {
  await p.locator(sel).locator("visible=true").first().click({ timeout: 8000 });
  await p.waitForTimeout(400);
};
const openA1 = click('#main [data-id="a1"]');
const SCENES = [
  ["w"],
  ["a"],
  ["yt"],
  ["sr"],
  ["mu"],
  ["o"],
  ["a", click("[data-fsheet]")],
  ["a", click('[data-fpop="sort"]')],
  ["a", openA1],
  ["a", async p => (await openA1(p), await click('[data-dtab="ep"]')(p))],
  ["a", async p => (await openA1(p), await click('[data-dtab="ep"]')(p), await click("#epEditBtn")(p))],
  ["yt", click('#main [data-yt="y1"]')],
  ["a", click("#hAdd")],
  ["yt", click("#hAdd")],
  ["a", async p => (await openA1(p), await click("#editItem")(p))],
  ["a", click("[data-gear]")],
];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await start(8150);
  const b = await chromium.launch();
  const seen = new Map();
  let k = 0;
  for (const [mode, act] of SCENES) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: "Asia/Tokyo" });
    const p = await ctx.newPage();
    await p.clock.install({ time: new Date("2026-11-20T12:00:00+09:00") });
    await p.addInitScript(m => localStorage.setItem("adb.v3.ui", JSON.stringify({ mode: m })), mode);
    await p.goto("http://localhost:8150/entame/");
    await p.waitForTimeout(1200);
    if (act) await act(p);
    for (const el of await p.$$("button, select, [role=tab], .fdd")) {
      const info = await el.evaluate(e => {
        const r = e.getBoundingClientRect(),
          s = getComputedStyle(e);
        if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || s.visibility === "hidden") return null;
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (!top || !(e === top || e.contains(top))) return null;
        return { h: Math.round(r.height), rad: s.borderTopLeftRadius, fs: s.fontSize, bw: s.borderTopWidth + " " + s.borderTopStyle, bg: s.backgroundColor, cls: String(e.className).split(" ")[0] || e.tagName.toLowerCase(), txt: (e.innerText || "").trim().slice(0, 14) };
      });
      if (!info) continue;
      const sig = [info.h, info.rad, info.fs, info.bw, info.bg].join("|");
      if (seen.has(sig)) continue;
      const f = `${OUT}/${String(k++).padStart(3, "0")}.png`;
      try {
        await el.screenshot({ path: f });
        seen.set(sig, { ...info, f });
      } catch (e) {}
    }
    await ctx.close();
  }
  fs.writeFileSync(OUT + "/index.json", JSON.stringify([...seen.values()], null, 1));
  console.log("見た目の種類:", seen.size);
  await b.close();
  srv.close();
})();
