/* 確認用：よく使う操作をサンプルデータで順に試し、エラーが出ないか・保存されるかを見る（本番のデータには触れない）。
   使い方：node dev/preview/smoke.js */
const { chromium } = require("playwright");
const { start } = require("./serve.js");
const PORT = 8170;
(async () => {
  const srv = await start(PORT);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, timezoneId: "Asia/Tokyo" });
  await p.clock.install({ time: new Date("2026-11-20T12:00:00+09:00") });
  const errors = [];
  p.on("pageerror", e => errors.push(e.message));
  p.on("dialog", d => d.accept());
  await p.addInitScript(() => localStorage.setItem("adb.v3.ui", JSON.stringify({ mode: "a" })));
  await p.goto(`http://localhost:${PORT}/entame/`);
  await p.waitForSelector('#main [data-id="a1"]');
  const step = async (name, fn) => {
    try {
      await fn();
      await p.waitForTimeout(250);
      console.log("ok  ", name);
    } catch (e) {
      errors.push(`${name}: ${e.message.split("\n")[0]}`);
      console.log("fail", name);
    }
  };
  const c = sel => p.locator(sel).locator("visible=true").first().click({ timeout: 5000 });
  const watched = () => p.evaluate(() => Object.keys((prog.a1 || {}).w || {}).length);

  await step("詳細を開く", () => c('#main [data-id="a1"]'));
  await step("話数タブ", () => c('[data-dtab="ep"]'));
  const w0 = await watched();
  await step("7話にチェック", () => c('[data-ep="6"]'));
  await step("チェックが保存された", async () => {
    if ((await watched()) !== w0 + 1) throw new Error(`見た話の数が ${w0} → ${await watched()}`);
  });
  await step("サブタイトルの小画面で入力して保存", async () => {
    await p.fill("#spopIn", "消えた絵筆");
    await c("[data-spopok]");
    const sub = await p.evaluate(() => (prog.a1.eps[6] || {}).s);
    if (sub !== "消えた絵筆") throw new Error("7話のサブタイトル：" + sub);
  });
  await step("チェックを外す", () => c('[data-ep="6"]'));
  await step("1話だけ編集を開いて保存", async () => {
    await c('[data-epone="0"]');
    await c("#e1Save");
  });
  await step("話数の編集を開く", () => c("#epEditBtn"));
  await step("1話追加", () => c("#erAdd"));
  await step("貼り付けを開いて読み取り", async () => {
    await c("#spOpen");
    await p.fill("#spText", "#1\tはじまりの絵の具\n#2\t青い屋根の店\n#3\t小さな依頼人\n#4\t雨の日の約束");
    await c("#spRead");
  });
  await step("話数に反映", () => c("#spApply"));
  await step("話数の編集を保存", async () => {
    const save = p.locator("button", { hasText: "話数を保存" }).locator("visible=true").first();
    await save.click({ timeout: 5000 });
  });
  await step("サブタイトルが保存された", async () => {
    const sub = await p.evaluate(() => (prog.a1.eps.find(e => epNum(e.n) === 4) || {}).s);
    if (sub !== "雨の日の約束") throw new Error("4話のサブタイトル：" + sub);
  });
  await step("編（〇〇編）を登録する画面", async () => {
    await c("#epMenuBtn");
    await p.locator("button", { hasText: "編（〇〇編）を登録" }).first().click({ timeout: 5000 });
  });
  await step("詳細を閉じて次の作品", async () => {
    await p.keyboard.press("Escape");
    await c('#main [data-id="a2"]');
    await c('[data-dnav="1"]');
  });
  await step("作品の編集を開いて保存", async () => {
    await c("#editItem");
    await p.locator("button", { hasText: "保存する" }).locator("visible=true").first().click({ timeout: 5000 });
  });
  await b.close();
  srv.close();
  if (errors.length) {
    console.log("\n問題:\n" + errors.join("\n"));
    process.exitCode = 1;
  } else console.log("\nすべて問題なし");
})();
