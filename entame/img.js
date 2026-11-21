/* ===================== 作品の画像 =====================
   保存のしかた（一覧が重くならないように）：
   - 作品のデータ（titles）には「画像がある印」img＝版の番号 だけを入れる。画像そのものは入れない
   - 画像は貼るときに縮小して、別の場所に2つのサイズで保存する
       imgs/作品ID … 一覧用の小さい画像（長い辺 360px くらい・数十KB）
       imgl/作品ID … 詳細用の大きい画像（長い辺 1200px まで・1MB未満）
   - 画面に出たものだけ読みに行く（一覧はスクロールして見えた行だけ）。読んだ画像はこの端末のメモリに控える
   詳細での出し方は2通り（設定 → 表示 → 詳細の画像）：top＝上に横長で大きく／side＝ポスターと要点を横並び */
const K_DIMG = "adb.v3.dimg";
/* 画像のキー：作品はその作品ID、YouTube は「yt_ID」（imgs・imgl のドキュメント名にもなる） */
const YT_PRE = "yt_";
const imgObj = key => (key.startsWith(YT_PRE) ? ytOver[key.slice(YT_PRE.length)] : over[key]);
const imgSave = (key, img, msg) => (key.startsWith(YT_PRE) ? ytSave(key.slice(YT_PRE.length), { img }, msg) : saveTitle(key, { img }, msg));
/* YouTube の項目を、画像の部品が使える形（id＝キー）にする */
const ytImgIt = x => ({ ...x, id: YT_PRE + x.id });
const dimgMode = () => (ls.get(K_DIMG) === "side" ? "side" : "top");
const IMG_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/></svg>`;

/* 読んだ画像の控え：「s:作品ID:版」→ blob の URL（同じ画像は何度描き直しても読み直さない） */
const imgUrl = new Map();
const imgKey = (sz, id, v) => `${sz}:${id}:${v}`;
const imgLRU = [];
function imgRemember(k, url) {
  imgUrl.set(k, url);
  /* 大きい画像は直近の30枚だけ控える（メモリを使いすぎないように） */
  if (k[0] === "l") {
    imgLRU.push(k);
    if (imgLRU.length > 30) {
      const old = imgLRU.shift();
      URL.revokeObjectURL(imgUrl.get(old));
      imgUrl.delete(old);
    }
  }
}
const dataToBlobUrl = d => {
  const i = d.indexOf(","),
    h = d.slice(0, i),
    b = d.slice(i + 1);
  const type = (/data:([^;,]+)/.exec(h) || [])[1] || "image/jpeg";
  if (!/;base64/.test(h)) return URL.createObjectURL(new Blob([decodeURIComponent(b)], { type }));
  const bin = atob(b);
  const a = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) a[k] = bin.charCodeAt(k);
  return URL.createObjectURL(new Blob([a], { type }));
};

/* 画像のタグ。控えにあればすぐ表示、なければ空のまま置いて、画面に出たときに読む */
function imgTag(it, sz, cls) {
  const v = it.img;
  const url = imgUrl.get(imgKey(sz, it.id, v)) || (sz === "l" && imgUrl.get(imgKey("s", it.id, v))) || "";
  return `<img class="${cls}" alt="" decoding="async" data-img="${esc(it.id)}" data-iv="${esc(String(v))}" data-isz="${sz}"${url ? ` src="${url}"` : ""}${url && imgUrl.has(imgKey(sz, it.id, v)) ? ' data-ok="1"' : ""}>`;
}
/* 一覧の行のサムネ（画像のない作品は灰色の枠） */
const thumbHtml = it => `<span class="thb${it.img ? "" : " none"}" aria-hidden="true">${it.img ? imgTag(it, "s", "thbi") : ""}</span>`;

/* ---------- 読み込み：画面に出た画像だけ、同時に6枚まで ---------- */
const imgWait = new Map(); // 読み込み中：キー → Promise
const imgQueue = [];
let imgRunning = 0;
function imgFetch(sz, id, v) {
  const k = imgKey(sz, id, v);
  if (imgUrl.has(k)) return Promise.resolve(imgUrl.get(k));
  if (imgWait.has(k)) return imgWait.get(k);
  const p = new Promise(res => imgQueue.push({ sz, id, v, k, res }));
  imgWait.set(k, p);
  imgPump();
  return p;
}
function imgPump() {
  while (imgRunning < 6 && imgQueue.length && db) {
    const j = imgQueue.shift();
    imgRunning++;
    db.doc(`${j.sz === "l" ? "imgl" : "imgs"}/${j.id}`)
      .get()
      .then(s => {
        const d = s.exists && s.data();
        const url = d && d.d ? dataToBlobUrl(d.d) : "";
        if (url) imgRemember(j.k, url);
        j.res(url);
      })
      .catch(() => j.res(""))
      .finally(() => {
        imgWait.delete(j.k);
        imgRunning--;
        imgPump();
      });
  }
}
function imgShow(el) {
  const { img: id, iv: v, isz: sz } = el.dataset;
  imgFetch(sz, id, v).then(url => {
    if (!url || !el.isConnected) return;
    el.src = url;
    el.dataset.ok = "1";
  });
}
/* 画面に出たら（少し手前から）読む */
const imgIO =
  "IntersectionObserver" in window
    ? new IntersectionObserver(
        es =>
          es.forEach(e => {
            if (!e.isIntersecting) return;
            imgIO.unobserve(e.target);
            imgShow(e.target);
          }),
        { rootMargin: "400px 0px" },
      )
    : null;
/* 描き直しで増えた画像タグを見つけて、見張りに付ける */
let imgScanQ = false;
function imgScan() {
  imgScanQ = false;
  document.querySelectorAll("img[data-img]:not([data-ok]):not([data-iw])").forEach(el => {
    el.dataset.iw = "1";
    if (imgIO) imgIO.observe(el);
    else imgShow(el);
  });
}
new MutationObserver(() => {
  if (imgScanQ) return;
  imgScanQ = true;
  requestAnimationFrame(imgScan);
}).observe(document.documentElement, { childList: true, subtree: true });

/* ---------- 貼る：選んだ画像を縮小して保存 ---------- */
function loadImageFile(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => res({ im, url });
    im.onerror = () => (URL.revokeObjectURL(url), rej(new Error("画像を読み込めませんでした")));
    im.src = url;
  });
}
/* 長い辺を max px までに縮めて、なるべく小さい形式（WebP、使えなければJPEG）にする。limit を超えたら画質・大きさを下げてやり直す */
function shrink(im, max, q, limit) {
  const r = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
  const w = Math.max(1, Math.round(im.naturalWidth * r)),
    h = Math.max(1, Math.round(im.naturalHeight * r));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = "#fff"; // 透明な部分はJPEGで黒くならないよう白に
  g.fillRect(0, 0, w, h);
  g.drawImage(im, 0, 0, w, h);
  let d = c.toDataURL("image/webp", q);
  if (!d.startsWith("data:image/webp")) d = c.toDataURL("image/jpeg", q);
  if (d.length > limit && (q > 0.5 || max > 400)) return shrink(im, q > 0.5 ? max : Math.round(max * 0.8), q > 0.5 ? q - 0.1 : q, limit);
  return d;
}
let imgBusy = false;
/* 「画像を追加」「変更」：コピーしてある画像があれば、それをそのまま貼る。なければ写真から選ぶかを聞く */
async function pickImage(id) {
  if (imgBusy) return;
  const b = await clipImage();
  if (b) return setImage(id, b);
  askImageSource(id);
}
/* クリップボードの画像を取り出す（使えない端末・許可されなかったとき・画像がないときは null） */
async function clipImage() {
  try {
    if (!navigator.clipboard || !navigator.clipboard.read) return null;
    for (const it of await navigator.clipboard.read()) {
      const t = it.types.find(x => x.startsWith("image/"));
      if (t) return await it.getType(t);
    }
  } catch (e) {}
  return null;
}
/* コピーした画像がないとき：写真から選ぶ（押したその場でファイルを選ぶ画面を開く） */
function askImageSource(id) {
  closeImgView();
  const v = document.createElement("div");
  v.className = "imgview imgask";
  v.setAttribute("role", "dialog");
  v.setAttribute("aria-modal", "true");
  v.setAttribute("aria-label", "画像を追加");
  v.innerHTML = `<div class="iask"><b>コピーした画像がありません</b><p>画像を長押し（パソコンは右クリック）して「コピー」してから、もう一度押すと自動で貼り付けます。</p><div class="ivbar"><button type="button" class="u-btn" data-iv="close">やめる</button><button type="button" class="u-btn pri" data-iv="file">写真から選ぶ</button></div></div>`;
  v.addEventListener("click", e => {
    const b = e.target.closest("[data-iv]");
    if (!b && e.target.closest(".iask")) return;
    closeImgView();
    if (b && b.dataset.iv === "file") pickFile(id);
  });
  document.body.appendChild(v);
  v.querySelector("[data-iv=file]").focus({ preventScroll: true });
}
function pickFile(id) {
  if (imgBusy) return;
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "image/*";
  inp.onchange = () => inp.files[0] && setImage(id, inp.files[0]);
  inp.click();
}
async function setImage(id, file) {
  if (!db || !imgObj(id)) return;
  if (!/^image\//.test(file.type || "image/")) return toast("画像のファイルを選んでください");
  imgBusy = true;
  toast("画像を縮小して保存しています…");
  try {
    const { im, url } = await loadImageFile(file);
    const small = shrink(im, 360, 0.8, 60e3);
    const large = shrink(im, 1200, 0.82, 700e3);
    URL.revokeObjectURL(url);
    const v = Date.now();
    /* 先に控えへ入れて、保存の完了を待たずに表示する */
    imgRemember(imgKey("s", id, v), dataToBlobUrl(small));
    imgRemember(imgKey("l", id, v), dataToBlobUrl(large));
    await Promise.all([db.doc(`imgs/${id}`).set({ d: small, v }), db.doc(`imgl/${id}`).set({ d: large, v })]);
    await imgSave(id, v, "画像を保存しました");
  } catch (e) {
    fail(e);
  } finally {
    imgBusy = false;
  }
}
function removeImage(id) {
  const it = imgObj(id);
  if (!it || !it.img) return;
  imgSave(id, null, "画像を外しました");
  db.doc(`imgs/${id}`).delete().catch(fail);
  db.doc(`imgl/${id}`).delete().catch(fail);
}
/* ゴミ箱から完全に消すときに、画像も消す */
function removeImageDocs(id) {
  if (!db) return;
  db.doc(`imgs/${id}`).delete().catch(() => {});
  db.doc(`imgl/${id}`).delete().catch(() => {});
}

/* ---------- 詳細での出し方 ---------- */
/* 案A：タイトルの上に横長で大きく（番組情報タブだけ） */
function detailHeroHtml(it) {
  if (dimgMode() !== "top" || !it.img) return "";
  return `<button type="button" class="dhero" data-imgview="1" aria-label="画像を大きく表示">${imgTag(it, "l", "dheroi")}</button>`;
}
/* 案B：番組情報の一番上に、ポスター＋要点 */
function detailSideHtml(it) {
  if (dimgMode() !== "side") return "";
  const when = [it.dow >= 0 ? DOW[it.dow] + "曜 " : "", it.time || ""].join("").trim();
  const cour = coursOf(it).map(courLabel).join("・");
  const eps = episodes(it),
    wl = watchable(eps);
  const m = mediaOf(it);
  const vods = (m.media === "stream" ? m.plat : m.vods).map(vlab).join("");
  const per = periodOf(it);
  const poster = it.img
    ? `<button type="button" class="dpost" data-imgview="1" aria-label="画像を大きく表示">${imgTag(it, "l", "dposti")}</button>`
    : `<button type="button" class="dpost none" data-imgadd="1" aria-label="画像を追加">${IMG_ICON}<span>＋ 画像</span></button>`;
  return `<div class="dside">${poster}<div class="dsum">${when ? `<b class="dsw">${esc(when)}</b>` : ""}${cour || per ? `<span class="dss">${esc([cour, per].filter(Boolean).join(" ・ "))}</span>` : ""}${wl.length ? `<span class="dss">${wl.filter(e => e.w).length} / ${wl.length}話 視聴</span>` : ""}${vods ? `<span class="labs">${vods}</span>` : ""}</div></div>`;
}
/* 「＋ 画像を追加」（案A、または画像がまだない作品） */
const imgAddChip = it => (it.img || dimgMode() === "side" ? "" : `<button type="button" class="u-chip add" data-imgadd="1">＋ 画像を追加</button>`);

/* ---------- 大きく表示（変更・外すもここから） ---------- */
function openImgView(it) {
  closeImgView();
  const v = document.createElement("div");
  v.className = "imgview";
  v.setAttribute("role", "dialog");
  v.setAttribute("aria-modal", "true");
  v.setAttribute("aria-label", `${it.t} の画像`);
  v.innerHTML = `<div class="ivbox">${imgTag(it, "l", "ivimg")}</div><div class="ivbar"><button type="button" class="u-btn" data-iv="change">変更</button><button type="button" class="u-btn danger" data-iv="remove">外す</button><button type="button" class="u-btn pri" data-iv="close">閉じる</button></div>`;
  v.addEventListener("click", e => {
    const b = e.target.closest("[data-iv]");
    if (!b && e.target.closest(".ivimg")) return;
    const a = b ? b.dataset.iv : "close";
    closeImgView();
    if (a === "change") pickImage(it.id);
    if (a === "remove") removeImage(it.id);
  });
  document.body.appendChild(v);
  v.querySelector("[data-iv=close]").focus({ preventScroll: true });
}
function closeImgView() {
  document.querySelector(".imgview")?.remove();
}
/* Esc は画像の表示だけを閉じる（詳細は閉じない） */
document.addEventListener(
  "keydown",
  e => {
    if (e.key === "Escape" && document.querySelector(".imgview")) {
      e.preventDefault();
      e.stopImmediatePropagation();
      closeImgView();
    }
  },
  true,
);
/* パソコン：詳細を開いているときに Ctrl+V（⌘V）でも貼れる（入力欄の中は除く） */
document.addEventListener("paste", e => {
  const key = ytOpen && $("#layer .sheet:not(.form) #ytIn") ? YT_PRE + ytOpen : openId && over[openId] && $("#layer .sheet:not(.form) #sheetIn") ? openId : "";
  if (!key) return;
  if (e.target && e.target.closest && e.target.closest("input,textarea,[contenteditable]")) return;
  const f = [...((e.clipboardData && e.clipboardData.files) || [])].find(x => /^image\//.test(x.type));
  if (!f) return;
  e.preventDefault();
  closeImgView();
  setImage(key, f);
});
DETAIL_ACTIONS.push(["[data-imgadd]", (el, it) => pickImage(it.id)], ["[data-imgview]", (el, it) => openImgView(it)]);

/* ---------- リスト／グリッド（写真とタイトルだけ）の切り替え ---------- */
const VIEW_IC = {
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><rect x="3.5" y="4.5" width="3" height="3" rx=".6"/><rect x="3.5" y="10.5" width="3" height="3" rx=".6"/><rect x="3.5" y="16.5" width="3" height="3" rx=".6"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2"/></svg>',
};
const viewTog = (cur, attr) =>
  `<span class="vtog" role="group" aria-label="表示のしかた">${[["list", "リスト"], ["grid", "グリッド"]]
    .map(([v, l]) => `<button type="button" ${attr}="${v}" aria-pressed="${cur === v}" aria-label="${l}で表示" title="${l}">${VIEW_IC[v]}</button>`)
    .join("")}</span>`;
/* グリッドの1マス：縦長の画像（なければ灰色の枠）とタイトル */
const gridCell = (it, attr = "data-id", ik = it) =>
  `<button type="button" class="pcell${it.s === "視聴済み" ? " done" : ""}" ${attr}="${esc(it.id)}"><span class="pimg">${it.img ? imgTag(ik, "s", "pimgi") : `<span class="wc-noimg">${IMG_ICON}</span>`}</span><span class="pttl">${esc(it.t || "（タイトルなし）")}</span></button>`;
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-lview],[data-yview]");
  if (!b) return;
  if (b.dataset.lview) state.view = b.dataset.lview;
  else if (typeof ytSetView === "function") ytSetView(b.dataset.yview);
  render();
});

/* ---------- YouTube ---------- */
/* 一覧の行のサムネ（横長） */
const ytThumbHtml = x => thumbHtml(ytImgIt(x));
/* 詳細：上に横長で大きく（YouTube は横長の画像が多いので、設定に関係なくこの形） */
const ytHeroHtml = x => (x.img ? `<button type="button" class="dhero" data-imgview="1" aria-label="画像を大きく表示">${imgTag(ytImgIt(x), "l", "dheroi")}</button>` : "");
const ytImgAddChip = x => (x.img ? "" : `<button type="button" class="u-chip add" data-imgadd="1">＋ 画像を追加</button>`);
