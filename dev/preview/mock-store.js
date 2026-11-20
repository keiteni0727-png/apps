/* ===================== 確認用：保存先のかわり（メモリの中だけ） =====================
   ログインもFirebaseも使わずに、アプリをサンプルデータで動かすためのもの。本番のデータには一切つながらない。
   u-core.js の直後に読み込み、U.store を差しかえる。中身は window.PREVIEW_DATA（{titles, progress, master, yt}）。
   書きこみはメモリの中だけで、ページを開き直すと元に戻る。 */
(() => {
  const D = window.PREVIEW_DATA || {};
  const cols = {};
  ["titles", "progress", "master", "yt"].forEach(k => (cols[k] = new Map(Object.entries(D[k] || {}))));
  const subs = {};
  const clone = v => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const split = path => {
    const i = path.indexOf("/");
    return [path.slice(0, i), path.slice(i + 1)];
  };
  const snapDoc = (id, v) => ({ id, exists: v !== undefined, data: () => clone(v) });
  const fire = name => {
    const m = cols[name] || (cols[name] = new Map());
    const docs = [...m.entries()].map(([id, v]) => snapDoc(id, v));
    (subs[name] || []).forEach(cb =>
      setTimeout(() => cb({ docs, size: docs.length, empty: !docs.length, forEach: f => docs.forEach(f), fromCache: false }), 0),
    );
  };
  const write = (path, fn) => {
    const [c, id] = split(path);
    const m = cols[c] || (cols[c] = new Map());
    const nv = fn(m.get(id));
    if (nv === undefined) m.delete(id);
    else m.set(id, nv);
    fire(c);
    return Promise.resolve();
  };
  const doc = path => ({
    id: split(path)[1],
    get: async () => {
      const [c, id] = split(path);
      return snapDoc(id, clone((cols[c] || new Map()).get(id)));
    },
    set: (data, opt) => write(path, old => (opt && opt.merge ? { ...(old || {}), ...clone(data) } : clone(data))),
    /* 本物（u-core.js）と同じ：{items:{id:中身}} のような中身のある入れ物は、中の項目ごとに書きかえる */
    update: data =>
      write(path, old => {
        const n = { ...(old || {}) };
        Object.entries(clone(data)).forEach(([k, v]) => {
          if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length) n[k] = { ...(n[k] && typeof n[k] === "object" ? n[k] : {}), ...v };
          else n[k] = v;
        });
        return n;
      }),
    delete: () => write(path, () => undefined),
    onSnapshot: cb => {
      const [c, id] = split(path);
      setTimeout(() => cb(snapDoc(id, clone((cols[c] || new Map()).get(id)))), 0);
      return () => {};
    },
  });
  const db = {
    doc,
    setMany: list => {
      list.forEach(([p, d]) => write(p, () => clone(d)));
      return Promise.resolve();
    },
    collection: name => ({
      doc: id => doc(`${name}/${id}`),
      onSnapshot: cb => {
        (subs[name] || (subs[name] = [])).push(cb);
        fire(name);
        return () => {};
      },
    }),
  };
  const conn = Promise.resolve({ kind: "preview", db, uid: "preview", logout: async () => location.reload() });
  U.store = () => conn;
})();
