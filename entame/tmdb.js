/* ===================== TMDB から作品の情報を取る（画面には触らない） =====================
   TMDB（https://www.themoviedb.org）：ドラマ・映画などアニメ以外の作品用。APIキー（無料）が必要で、設定の「TMDB APIキー」に入れる（master.tmdbKey）。
   取れるもの：タイトル・開始日／終了日・放送局・縦画像・公式サイト・Netflixで配信しているか。放送時間・NetflixのURLは取れない。
   画面（al-ui.js）で AniList と同じように扱えるよう、結果は AniList と同じ形（title.native・startDate など）にそろえて返す。
   作品の番号は「tv:123」「movie:123」の文字（テレビと映画で番号が別のため） */
(() => {
  const API = "https://api.themoviedb.org/3";
  const IMG = "https://image.tmdb.org/t/p/";
  const key = () => String((typeof master === "object" && master && master.tmdbKey) || "").trim();

  async function get(path, params = {}) {
    const k = key();
    if (!k) throw Object.assign(new Error("TMDBのAPIキーが未設定です"), { noKey: true });
    const q = new URLSearchParams({ language: "ja-JP", ...params });
    /* v3のAPIキー（32文字）はURLに、読み取りトークン（長い文字）はヘッダーに付ける */
    const tok = k.length > 40;
    if (!tok) q.set("api_key", k);
    const r = await fetch(`${API}${path}?${q}`, { headers: tok ? { Authorization: `Bearer ${k}`, Accept: "application/json" } : { Accept: "application/json" } });
    const j = await r.json().catch(() => null);
    if (r.status === 401) throw Object.assign(new Error("TMDBのAPIキーが正しくありません"), { noKey: true });
    if (!r.ok || !j) throw new Error((j && j.status_message) || `TMDB ${r.status}`);
    return j;
  }

  const ymd = s => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
    return m ? { year: +m[1], month: +m[2], day: +m[3] } : {};
  };
  const STATUS = { Ended: "FINISHED", Canceled: "FINISHED", Released: "FINISHED", "Returning Series": "RELEASING", "In Production": "NOT_YET_RELEASED", Planned: "NOT_YET_RELEASED", "Post Production": "NOT_YET_RELEASED", Rumored: "NOT_YET_RELEASED" };

  /* TMDB の1件 → AniList と同じ形 */
  function shape(x, type) {
    const tv = type === "tv";
    const name = (tv ? x.name : x.title) || "",
      orig = (tv ? x.original_name : x.original_title) || "";
    const date = tv ? x.first_air_date : x.release_date;
    const s = ymd(date);
    return {
      id: `${type}:${x.id}`,
      src: "tm",
      type,
      title: { native: name || orig, romaji: orig && orig !== name ? orig : "" },
      synonyms: orig && orig !== name ? [orig] : [],
      format: tv ? "TV" : "MOVIE",
      status: STATUS[x.status] || (date && new Date(date) > new Date() ? "NOT_YET_RELEASED" : ""),
      episodes: x.number_of_episodes || null,
      seasonYear: s.year || null,
      season: null,
      startDate: s,
      endDate: tv ? ymd(x.last_air_date) : s,
      coverImage: { medium: x.poster_path ? `${IMG}w185${x.poster_path}` : "", large: x.poster_path ? `${IMG}w500${x.poster_path}` : "" },
      country: (x.origin_country || [])[0] || x.original_language || "",
    };
  }

  /* タイトルで探す（ドラマと映画をまとめて）。日本の作品を先に */
  async function search(q) {
    const j = await get("/search/multi", { query: q, include_adult: "false" });
    const l = (j.results || []).filter(x => x.media_type === "tv" || x.media_type === "movie").map(x => shape(x, x.media_type));
    const jp = m => (m.country === "JP" || m.country === "ja" ? 0 : 1);
    return l.sort((a, b) => jp(a) - jp(b)).slice(0, 12);
  }

  /* 1作品のくわしい情報：放送局・公式サイト・配信サイト（日本） */
  async function detail(id) {
    const [type, n] = String(id).split(":");
    const x = await get(`/${type}/${n}`, { append_to_response: type === "movie" ? "watch/providers,release_dates" : "watch/providers" });
    const m = shape(x, type);
    /* 映画の公開日は日本の劇場公開日があればそちら */
    if (type === "movie") {
      const jp = (x.release_dates?.results || []).find(r => r.iso_3166_1 === "JP");
      const th = jp && (jp.release_dates.find(d => d.type === 3) || jp.release_dates[0]);
      if (th && th.release_date) m.startDate = m.endDate = ymd(th.release_date);
    }
    const pv = x["watch/providers"]?.results?.JP || {};
    m.providers = [...new Set([...(pv.flatrate || []), ...(pv.free || []), ...(pv.ads || [])].map(p => p.provider_name))];
    m.networks = (x.networks || []).map(w => w.name);
    m.homepage = x.homepage || "";
    return m;
  }

  async function image(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`画像 ${r.status}`);
    return r.blob();
  }

  globalThis.TM = { search, detail, image, hasKey: () => !!key() };
})();
