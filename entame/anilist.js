/* ===================== AniList から作品の情報を取る（画面には触らない） =====================
   AniList（https://anilist.co）：作品の検索・放送日時・縦画像・公式サイト・配信のリンク・続編などのつながり・今季／来季の新作。
   無料・登録なしで使える（1分に30回くらいまで）。あるのはアニメだけ（ドラマは対象外）。放送局・サブタイトルは取れない。
   主題歌は Jikan（https://jikan.moe ・MyAnimeList の情報）から */
(() => {
  const AL_URL = "https://graphql.anilist.co";

  async function gql(query, variables) {
    const r = await fetch(AL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || j.errors) throw new Error((j && j.errors && j.errors[0] && j.errors[0].message) || `AniList ${r.status}`);
    return j.data;
  }

  const BASE = `id idMal title{native romaji english} synonyms format status episodes duration season seasonYear
    startDate{year month day} endDate{year month day} coverImage{large medium} countryOfOrigin isAdult`;
  const REL = `relations{edges{relationType node{id type format title{native romaji english} synonyms}}}`;

  /* タイトルで探す（日本語・ローマ字どちらでも）。成人向けは出さない */
  async function search(q) {
    const d = await gql(
      `query($q:String){Page(perPage:12){media(search:$q,type:ANIME,isAdult:false,sort:SEARCH_MATCH){${BASE}}}}`,
      { q },
    );
    return d.Page.media;
  }

  /* 1作品のくわしい情報：各話の放送日時・公式サイト／配信サイトのリンク・つながり */
  async function detail(id) {
    const d = await gql(
      `query($id:Int){Media(id:$id){${BASE} ${REL}
        externalLinks{site url type language}
        airingSchedule(perPage:50){nodes{episode airingAt}}}}`,
      { id },
    );
    return d.Media;
  }

  /* 今のクールと次のクール（日本時間）。冬＝1〜3月、春＝4〜6月、夏＝7〜9月、秋＝10〜12月 */
  const SEASON_EN = ["WINTER", "SPRING", "SUMMER", "FALL"];
  function seasonsNow(now = Date.now()) {
    const d = new Date(now + 540 * 60000);
    const y = d.getUTCFullYear(),
      s = Math.floor(d.getUTCMonth() / 3);
    return [
      { season: SEASON_EN[s], year: y },
      s === 3 ? { season: SEASON_EN[0], year: y + 1 } : { season: SEASON_EN[s + 1], year: y },
    ];
  }

  /* 新作の一覧：今のクール・次のクール・それより先に決まっている作品（人気順）。日本の作品だけ */
  async function upcoming(now) {
    const q = `query($p:Int,$s:MediaSeason,$y:Int,$st:MediaStatus){Page(page:$p,perPage:50){pageInfo{hasNextPage}
      media(type:ANIME,isAdult:false,countryOfOrigin:"JP",season:$s,seasonYear:$y,status:$st,sort:POPULARITY_DESC){${BASE} ${REL}}}}`;
    const out = new Map();
    const run = async (vars, pages) => {
      for (let p = 1; p <= pages; p++) {
        const d = await gql(q, { ...vars, p });
        d.Page.media.forEach(m => out.set(m.id, m));
        if (!d.Page.pageInfo.hasNextPage) break;
      }
    };
    for (const s of seasonsNow(now)) await run({ s: s.season, y: s.year }, 4);
    await run({ st: "NOT_YET_RELEASED" }, 3);
    return [...out.values()];
  }

  /* OP・ED（Jikan＝MyAnimeList の情報）。MyAnimeList の作品番号（AniList の idMal）で引く。
     返ってくる形：「1: "Yuusha (勇者)" by YOASOBI (eps 1-12)」→ { type, st, ar, eps: "1-12" } */
  const JK_URL = "https://api.jikan.moe/v4";
  const jp = s => /[\u3040-\u30ff\u4e00-\u9fff]/.test(s);
  /* 「ローマ字 (日本語)」なら日本語の方を使う */
  const pickJa = s => {
    const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(s.trim());
    return m && jp(m[2]) && !jp(m[1]) ? m[2].trim() : s.trim();
  };
  function parseTheme(type, raw) {
    let s = String(raw || "").replace(/^\s*#?\d+\s*:\s*/, "");
    let eps = "";
    const e = /\((?:eps?|episodes?)\s*([^)]*)\)\s*$/i.exec(s);
    if (e) {
      eps = e[1].replace(/\s+/g, "");
      s = s.slice(0, e.index).trim();
    }
    const q = /^"(.*)"\s*(?:by\s+(.*))?$/.exec(s) || /^(.*?)\s+by\s+(.*)$/.exec(s);
    const st = q ? q[1] : s,
      ar = q && q[2] ? q[2] : "";
    return { type, st: pickJa(st), ar: pickJa(ar), eps };
  }
  async function themes(malId) {
    if (!malId) return [];
    const r = await fetch(`${JK_URL}/anime/${malId}/themes`, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`Jikan ${r.status}`);
    const d = (await r.json()).data || {};
    return [...(d.openings || []).map(x => parseTheme("OP", x)), ...(d.endings || []).map(x => parseTheme("ED", x))].filter(x => x.st);
  }

  /* 画像を取り出す（貼り付けと同じ流れで縮小して保存するため） */
  async function image(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`画像 ${r.status}`);
    return r.blob();
  }

  globalThis.AL = { gql, search, detail, upcoming, themes, image, seasonsNow };
})();
