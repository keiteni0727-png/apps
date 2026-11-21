/* ===================== 作品の画像 =====================
   保存のしかた（一覧が重くならないように）：
   - 作品のデータ（titles）には「画像がある印」img＝版の番号 だけを入れる。画像そのものは入れない
   - 画像は貼るときに縮小して、別の場所に2つのサイズで保存する
       imgs/作品ID … 一覧用の小さい画像（長い辺 360px くらい・数十KB）
       imgl/作品ID … 詳細用の大きい画像（長い辺 1200px まで・1MB未満）
   - 画面に出たものだけ読みに行く（一覧はスクロールして見えた行だけ）。読んだ画像はこの端末のメモリに控える
   - 作品は「縦（ポスター）」と「横（背景）」の2枚を持てる。縦＝img・ドキュメント名は作品ID／横＝imgw・ドキュメント名は「作品ID_w」
       縦を使う：一覧のサムネ・グリッド・詳細の横並び／横を使う：詳細の上に大きく・番組表のカード（横がなければ縦を切らずに出す）
   詳細ではタイトルの上に横長で大きく出す */
/* 画像のキー：作品はその作品ID、YouTube は「yt_ID」（imgs・imgl のドキュメント名にもなる） */
const YT_PRE = "yt_";
const imgObj = key => (key.startsWith(YT_PRE) ? ytOver[key.slice(YT_PRE.length)] : over[key]);
/* dim：元画像の寸法「幅x高さ」（外すときは null） */
const imgSave = (key, img, msg, k = "p", dim = null) =>
  key.startsWith(YT_PRE) ? ytSave(key.slice(YT_PRE.length), { img, imgd: dim }, msg) : saveTitle(key, k === "w" ? { imgw: img, imgwd: dim } : { img, imgd: dim }, msg);
/* 縦（p）・横（w）ごとの、保存場所の名前と版の番号 */
const imgDoc = (id, k) => (k === "w" ? id + "_w" : id);
const imgVer = (it, k) => (k === "w" ? it.imgw : it.img);
const IMG_KIND = { p: "縦（ポスター）", w: "横（背景）" };
/* 推奨の寸法：縦＝2:3・幅1000px以上／横＝16:9・幅1280px以上。外れていれば理由を返す */
const IMG_REC = { p: { r: 2 / 3, w: 1000, ratio: "2:3", ex: "1000×1500" }, w: { r: 16 / 9, w: 1280, ratio: "16:9", ex: "1280×720" } };
function imgIssue(k, w, h) {
  const c = IMG_REC[k];
  const out = [];
  if (Math.abs(w / h / c.r - 1) > 0.02) out.push(`縦横比が${c.ratio}ではありません`);
  if (w < c.w) out.push("推奨より小さい画像です");
  return out;
}
/* 画像を大きく表示した画面の、元の寸法とアラート */
function imgInfoHtml(it, k, yt) {
  const d = /^(\d+)x(\d+)$/.exec((k === "w" ? it.imgwd : it.imgd) || "");
  if (!d) return `<div class="ivinfo">元の寸法：記録なし（貼り直すと表示）</div>`;
  const w = +d[1],
    h = +d[2];
  const bad = yt ? [] : imgIssue(k, w, h);
  return `<div class="ivinfo${bad.length ? " warn" : ""}">${bad.length ? '<b aria-hidden="true">⚠</b>' : ""}元の寸法：${w}×${h}${bad.length ? `<small>${bad.join("・")}（推奨：${IMG_REC[k].ex}（${IMG_REC[k].ratio}）以上）</small>` : ""}</div>`;
}
/* YouTube の項目を、画像の部品が使える形（id＝キー）にする */
const ytImgIt = x => ({ ...x, id: YT_PRE + x.id });
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
function imgTag(it, sz, cls, k = "p") {
  const v = imgVer(it, k),
    id = imgDoc(it.id, k);
  const url = imgUrl.get(imgKey(sz, id, v)) || (sz === "l" && imgUrl.get(imgKey("s", id, v))) || "";
  return `<img class="${cls}" alt="" decoding="async" data-img="${esc(id)}" data-iv="${esc(String(v))}" data-isz="${sz}"${url ? ` src="${url}"` : ""}${url && imgUrl.has(imgKey(sz, id, v)) ? ' data-ok="1"' : ""}>`;
}
/* 縦長の枠に出す画像：縦がなければ横 */
const posterTag = (it, sz, cls) => (it.img ? imgTag(it, sz, cls) : it.imgw ? imgTag(it, sz, cls, "w") : "");
/* 横長の枠に出す画像：横がなければ縦を切らずに（fit） */
const wideTag = (it, sz, cls) => (it.imgw ? imgTag(it, sz, cls, "w") : it.img ? imgTag(it, sz, cls + " fit") : "");
/* 一覧の行のサムネ（画像のない作品は灰色の枠） */
const thumbHtml = it => (h => `<span class="thb${h ? "" : " none"}" aria-hidden="true">${h}</span>`)(posterTag(it, "s", "thbi"));

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
/* 「画像を追加」「変更」：k（縦 p／横 w）が決まっていなければ先に選ぶ。選んだらコピーしてある画像をそのまま貼る。なければ写真から選ぶかを聞く */
async function pickImage(id, k) {
  if (imgBusy) return;
  if (!k) {
    if (id.startsWith(YT_PRE)) k = "p";
    else return askImageKind(id);
  }
  const b = await clipImage();
  if (b) return setImage(id, b, k);
  askImageSource(id, k);
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
/* 小さい確認の枠（縦・横の選択／写真から選ぶ） */
function imgAsk(label, inner, onPick) {
  closeImgView();
  const v = document.createElement("div");
  v.className = "imgview imgask";
  v.setAttribute("role", "dialog");
  v.setAttribute("aria-modal", "true");
  v.setAttribute("aria-label", label);
  v.innerHTML = `<div class="iask">${inner}</div>`;
  v.addEventListener("click", e => {
    const b = e.target.closest("[data-iv]");
    if (!b && e.target.closest(".iask")) return;
    closeImgView();
    if (b && b.dataset.iv !== "close") onPick(b.dataset.iv);
  });
  document.body.appendChild(v);
  v.querySelector(".pri,[data-iv]").focus({ preventScroll: true });
}
/* 縦・横を選ぶ（押したらそのまま貼り付け） */
function askImageKind(id) {
  const it = imgObj(id) || {};
  const btn = k => `<button type="button" class="ikind ${k}" data-iv="${k}"><i aria-hidden="true"></i><span>${IMG_KIND[k]}</span>${imgVer(it, k) ? "<small>登録済み・差し替え</small>" : ""}</button>`;
  imgAsk("画像を追加", `<b>どちらに貼りますか？</b><div class="ikinds">${btn("p")}${btn("w")}</div><div class="ivbar"><button type="button" class="u-btn" data-iv="close">やめる</button></div>`, k => pickImage(id, k));
}
/* コピーした画像がないとき：写真から選ぶ（押したその場でファイルを選ぶ画面を開く） */
function askImageSource(id, k) {
  imgAsk(
    "画像を追加",
    `<b>コピーした画像がありません</b><p>画像を長押し（パソコンは右クリック）して「コピー」してから、もう一度押すと自動で貼り付けます。</p><div class="ivbar"><button type="button" class="u-btn" data-iv="close">やめる</button><button type="button" class="u-btn pri" data-iv="file">写真から選ぶ</button></div>`,
    () => pickFile(id, k),
  );
}
function pickFile(id, k) {
  if (imgBusy) return;
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "image/*";
  inp.onchange = () => inp.files[0] && setImage(id, inp.files[0], k);
  inp.click();
}
/* k が "auto" のときは画像の形で決める（横に長ければ横） */
async function setImage(id, file, k = "p") {
  if (!db || !imgObj(id)) return;
  if (!/^image\//.test(file.type || "image/")) return toast("画像のファイルを選んでください");
  imgBusy = true;
  toast("画像を縮小して保存しています…");
  try {
    const { im, url } = await loadImageFile(file);
    const small = shrink(im, 360, 0.8, 60e3);
    const large = shrink(im, 1200, 0.82, 700e3);
    URL.revokeObjectURL(url);
    if (id.startsWith(YT_PRE)) k = "p";
    else if (k === "auto") k = im.naturalWidth > im.naturalHeight * 1.15 ? "w" : "p";
    const doc = imgDoc(id, k);
    const v = Date.now();
    /* 先に控えへ入れて、保存の完了を待たずに表示する */
    imgRemember(imgKey("s", doc, v), dataToBlobUrl(small));
    imgRemember(imgKey("l", doc, v), dataToBlobUrl(large));
    await Promise.all([db.doc(`imgs/${doc}`).set({ d: small, v }), db.doc(`imgl/${doc}`).set({ d: large, v })]);
    await imgSave(id, v, id.startsWith(YT_PRE) ? "画像を保存しました" : `${IMG_KIND[k]}の画像を保存しました`, k, `${im.naturalWidth}x${im.naturalHeight}`);
  } catch (e) {
    fail(e);
  } finally {
    imgBusy = false;
  }
}
function removeImage(id, k = "p") {
  const it = imgObj(id);
  if (!it || !imgVer(it, k)) return;
  const doc = imgDoc(id, k);
  imgSave(id, null, "画像を外しました", k);
  db.doc(`imgs/${doc}`).delete().catch(fail);
  db.doc(`imgl/${doc}`).delete().catch(fail);
}
/* ゴミ箱から完全に消すときに、画像も消す */
function removeImageDocs(id) {
  if (!db) return;
  [id, imgDoc(id, "w")].forEach(d => {
    db.doc(`imgs/${d}`).delete().catch(() => {});
    db.doc(`imgl/${d}`).delete().catch(() => {});
  });
}

/* ---------- 詳細での出し方 ---------- */
/* タイトルの上に横の画像を大きく（番組情報タブだけ。縦の画像はここには出さない） */
function detailHeroHtml(it) {
  if (!it.imgw) return "";
  return `<button type="button" class="dhero" data-imgview="w" aria-label="画像を大きく表示">${imgTag(it, "l", "dheroi", "w")}</button>`;
}
/* 画像のボタン：どちらもない→「＋ 画像を追加」（縦・横を選ぶ）／ないほうは「＋ 縦・横の画像を追加」／
   縦は詳細の上に出ないので、あれば「縦の画像」（大きく表示・変更・外す） */
function imgAddChip(it) {
  if (!it.img && !it.imgw) return `<button type="button" class="u-chip add" data-imgadd="">＋ 画像を追加</button>`;
  const add = k => `<button type="button" class="u-chip add" data-imgadd="${k}">＋ ${k === "w" ? "横" : "縦"}の画像を追加</button>`;
  return (it.img ? `<button type="button" class="u-chip" data-imgview="p">縦の画像</button>` : add("p")) + (it.imgw ? "" : add("w"));
}

/* ---------- 大きく表示（変更・外すもここから） ---------- */
function openImgView(it, k = "p") {
  closeImgView();
  const v = document.createElement("div");
  v.className = "imgview";
  v.setAttribute("role", "dialog");
  v.setAttribute("aria-modal", "true");
  v.setAttribute("aria-label", `${it.t} の画像`);
  v.innerHTML = `<div class="ivbox">${imgTag(it, "l", "ivimg", k)}</div>${imgInfoHtml(it, k, it.id.startsWith(YT_PRE))}<div class="ivbar"><button type="button" class="u-btn" data-iv="change">変更</button><button type="button" class="u-btn danger" data-iv="remove">外す</button><button type="button" class="u-btn pri" data-iv="close">閉じる</button></div>`;
  v.addEventListener("click", e => {
    const b = e.target.closest("[data-iv]");
    if (!b && e.target.closest(".ivimg")) return;
    const a = b ? b.dataset.iv : "close";
    closeImgView();
    if (a === "change") pickImage(it.id, k);
    if (a === "remove") removeImage(it.id, k);
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
  setImage(key, f, "auto");
});
DETAIL_ACTIONS.push(["[data-imgadd]", (el, it) => pickImage(it.id, el.dataset.imgadd || "")], ["[data-imgview]", (el, it) => openImgView(it, el.dataset.imgview === "w" ? "w" : "p")]);

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
  `<button type="button" class="pcell${it.s === "視聴済み" ? " done" : ""}" ${attr}="${esc(it.id)}"><span class="pimg">${posterTag(ik, "s", "pimgi") || `<span class="wc-noimg">${IMG_ICON}</span>`}</span><span class="pttl">${esc(it.t || "（タイトルなし）")}</span></button>`;
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
const ytImgAddChip = x => (x.img ? "" : `<button type="button" class="u-chip add" data-imgadd="p">＋ 画像を追加</button>`);
