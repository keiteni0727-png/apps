/* 確認用：AniList・AnimeThemes の本物の返事を記録する（GitHub Actions で動かす。Claude の作業場所からは直接つながらないため）。
   entame/anilist.js をそのまま使い、送った中身 → 返ってきた中身 を al-fixtures.json に保存する。
   プレビュー（serve.js）はこの記録を使って、同じ問い合わせに同じ返事を返す */
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "al-fixtures.json");
const rec = { responses: {}, images: {}, meta: { at: new Date().toISOString() } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const realFetch = globalThis.fetch;
let last = 0;
globalThis.fetch = async (url, opt = {}) => {
  const key = `${url}\n${opt.body || ""}`;
  const isAL = String(url).includes("anilist.co");
  for (let k = 0; k < 5; k++) {
    if (isAL) {
      const wait = last + 2200 - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
    }
    const r = await realFetch(url, opt);
    if (r.status === 429) {
      const s = +(r.headers.get("retry-after") || 30);
      console.log("429, wait", s);
      await sleep(s * 1000 + 500);
      continue;
    }
    const text = await r.text();
    rec.responses[key] = { status: r.status, body: text };
    return new Response(text, { status: r.status, headers: { "content-type": "application/json" } });
  }
  throw new Error("rate limited");
};
eval(fs.readFileSync(path.join(__dirname, "../../entame/anilist.js"), "utf8"));
const AL = globalThis.AL;

const QUERIES = (process.env.AL_QUERIES || "").split("|").filter(Boolean);
const REL_OK = ["PREQUEL", "PARENT", "SIDE_STORY", "SPIN_OFF", "ALTERNATIVE", "SEQUEL"];
async function img(url) {
  if (!url || rec.images[url]) return;
  try {
    const r = await realFetch(url);
    if (!r.ok) return;
    const b = Buffer.from(await r.arrayBuffer());
    rec.images[url] = { type: r.headers.get("content-type") || "image/jpeg", b64: b.toString("base64") };
  } catch (e) {}
}
(async () => {
  const save = () => fs.writeFileSync(OUT, JSON.stringify(rec));
  for (const q of QUERIES) {
    try {
      const l = await AL.search(q);
      console.log(q, "→", l.slice(0, 3).map(m => m.title.native).join(" / "));
      for (const m of l.slice(0, 4)) await img(m.coverImage.medium);
      const top = l[0];
      if (top) {
        const d = await AL.detail(top.id);
        await img(d.coverImage.large);
        try {
          await AL.themes(top.id);
        } catch (e) {
          console.log("themes NG", e.message);
        }
      }
    } catch (e) {
      console.log("NG", q, e.message);
    }
    save();
  }
  const up = await AL.upcoming();
  console.log("upcoming", up.length);
  const seq = up.filter(m => (m.relations?.edges || []).some(e => e.node.type === "ANIME" && REL_OK.includes(e.relationType)));
  console.log("with relations", seq.length);
  for (const m of seq) await img(m.coverImage.medium);
  for (const m of seq.slice(0, 25)) {
    try {
      const d = await AL.detail(m.id);
      await img(d.coverImage.large);
      await AL.themes(m.id).catch(() => {});
    } catch (e) {
      console.log("NG detail", m.id, e.message);
    }
  }
  save();
  console.log("done", Object.keys(rec.responses).length, "responses", Object.keys(rec.images).length, "images");
})();
