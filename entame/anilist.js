/* ===================== AniList・AnimeThemes から作品の情報を取る（画面には触らない） =====================
   ・AniList（https://anilist.co）：作品の検索・話数・各話の放送日時・縦画像・公式サイト・続編などのつながり・今季／来季の新作
   ・AnimeThemes（https://animethemes.moe）：OP・ED の曲名・アーティスト・使われた話
   どちらも無料・登録なしで使える（AniList は1分に30回くらいまで）。AniList にあるのはアニメだけ（ドラマは対象外）。放送局・サブタイトルは取れない */
(() => {
  const AL_URL = "https://graphql.anilist.co";
  const AT_URL = "https://api.animethemes.moe";

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

  const BASE = `id title{native romaji english} synonyms format status episodes duration season seasonYear
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

  /* OP・ED（AnimeThemes）。AniList の作品番号で探す。曲名・アーティストはローマ字や英語のことが多い */
  async function themes(alId) {
    const u = `${AT_URL}/anime?filter[has]=resources&filter[site]=AniList&filter[external_id]=${alId}&include=animethemes.animethemeentries,animethemes.song.artists`;
    const r = await fetch(u, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`AnimeThemes ${r.status}`);
    const j = await r.json();
    const a = (j.anime || [])[0];
    if (!a) return [];
    return (a.animethemes || [])
      .filter(t => t.type === "OP" || t.type === "ED")
      .map(t => ({
        type: t.type,
        seq: t.sequence || 1,
        st: (t.song && t.song.title) || "",
        ar: ((t.song && t.song.artists) || []).map(x => x.name).join(", "),
        eps: [...new Set((t.animethemeentries || []).map(e => e.episodes).filter(Boolean))].join(", "),
      }))
      .sort((p, q) => (p.type === q.type ? p.seq - q.seq : p.type === "OP" ? -1 : 1));
  }

  /* 画像を取り出す（貼り付けと同じ流れで縮小して保存するため） */
  async function image(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`画像 ${r.status}`);
    return r.blob();
  }

  globalThis.AL = { gql, search, detail, upcoming, themes, image, seasonsNow };
})();
