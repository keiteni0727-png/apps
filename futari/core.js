"use strict";
/* ウリログ：共通の道具（設定・アイコン・カテゴリ・小さな関数）と状態
   ファイルの分け方：core.js（共通の道具・状態）→ 各機能 → events.js（ボタン）→ boot.js（Firebase につないで起動）
   どのファイルの関数・変数も、ほかのファイルからそのまま使える（ふつうの <script> で順に読み込む） */

/* =============== Firebaseの設定（Firebaseの画面からコピーしたものを入れる） =============== */
const firebaseConfig = {
  apiKey: "AIzaSyDZLO469EfTGmtO1_J6-K3hE1zK13WmElg",
  authDomain: "futari-biyori-edaa5.firebaseapp.com",
  projectId: "futari-biyori-edaa5",
  storageBucket: "futari-biyori-edaa5.firebasestorage.app",
  messagingSenderId: "1023567033337",
  appId: "1:1023567033337:web:c17437a09a1719d6360328"
};

const V = "12.15.0";
const $app = document.getElementById("app"), $nav = document.getElementById("nav"), $layer = document.getElementById("layer");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[c]);

/* ---------- アイコン ---------- */
const IC = {
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.3 4.5 6.8 4.5c2.1 0 3.6 1.2 5.2 3.1 1.6-1.9 3.1-3.1 5.2-3.1 3.5 0 5.4 3.5 4.1 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" stroke-linejoin="round"/></svg>',
  logo: '<svg viewBox="0 0 24 24"><path d="M9 18.5s-6-3.7-7.4-7.3C.6 8.6 2.1 5.8 4.9 5.8c1.7 0 2.9 1 4.1 2.5 1.3-1.5 2.5-2.5 4.1-2.5 2.8 0 4.3 2.8 3.3 5.4C15 14.8 9 18.5 9 18.5z" fill="#f4a3b8"/><path d="M16.5 20.5s-4.5-2.8-5.6-5.5c-.8-2 .4-4.1 2.5-4.1 1.3 0 2.2.7 3.1 1.9 1-1.2 1.9-1.9 3.1-1.9 2.1 0 3.3 2.1 2.5 4.1-1.1 2.7-5.6 5.5-5.6 5.5z" fill="#b8a6e6" stroke="#fff" stroke-width="1.2"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  list: '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>',
  home: '<svg viewBox="0 0 24 24" stroke-linejoin="round" stroke-linecap="round"><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5h-6v5.5H5.5A1.5 1.5 0 0 1 4 19z"/></svg>',
  memo: '<svg viewBox="0 0 24 24" stroke-linejoin="round" stroke-linecap="round"><rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M4 15.5l4.5-4 3.5 3 2.5-2 5.5 4.5"/><circle cx="15" cy="8" r="1.6"/></svg>',
  uri: '<svg viewBox="0 0 24 24" stroke-linejoin="round" stroke-linecap="round"><path d="M6.6 8.6 5.2 4.6l4.1 2.1M17.4 8.6l1.4-4-4.1 2.1"/><ellipse cx="12" cy="13.2" rx="7.6" ry="7"/><ellipse cx="12" cy="15.6" rx="3.3" ry="2.4"/><path d="M8.9 11.6h.01M15.1 11.6h.01M11 15.6h.01M13 15.6h.01" stroke-width="2.4"/></svg>',
  cal: '<svg viewBox="0 0 24 24" stroke-linejoin="round" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="4"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M12 17.6s-2.6-1.6-3.2-3.1c-.4-1.1.3-2.1 1.3-2.1.8 0 1.3.5 1.9 1.2.6-.7 1.1-1.2 1.9-1.2 1 0 1.7 1 1.3 2.1-.6 1.5-3.2 3.1-3.2 3.1z" fill="currentColor" stroke="none"/></svg>'
};

/* ---------- カテゴリ ---------- */
const CATS = [
  { id:"cafe",   e:"☕", n:"カフェ",     c:"var(--peach-l)" },
  { id:"food",   e:"🍝", n:"ごはん",     c:"var(--butter-l)" },
  { id:"play",   e:"🎡", n:"あそび",     c:"var(--lav-l)" },
  { id:"nature", e:"🌿", n:"しぜん",     c:"var(--mint-l)" },
  { id:"shop",   e:"🛍️", n:"おかいもの", c:"var(--pink-l)" },
  { id:"trip",   e:"🧳", n:"りょこう",   c:"#e8f1fb" },
  { id:"event",  e:"🎪", n:"イベント",   c:"#fbeef6" },
  { id:"other",  e:"✨", n:"その他",     c:"#f5f0f3" }
];
const catOf = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];
/* やりたいことリストの種類（kind がない候補は「行きたい」） */
const KINDS = [
  { id:"go",  n:"行きたい", e:"📍", c:"var(--pink-l)",   done:"行った", not:"行ってない", th:"場所の名前",         ph:"例：海の見えるカフェ" },
  { id:"do",  n:"やりたい", e:"✨", c:"var(--lav-l)",    done:"やった", not:"やってない", th:"やりたいこと",       ph:"例：おそろいのマグを買う" },
  { id:"eat", n:"食べたい", e:"🍽", c:"var(--butter-l)", done:"食べた", not:"食べてない", th:"食べたいもの・お店", ph:"例：ふわふわパンケーキ" },
  { id:"see", n:"見たい",   e:"🎬", c:"#e8f1fb",         done:"見た",   not:"見てない",   th:"見たいもの",         ph:"例：話題の映画" }
];
const kindOf = p => KINDS.find(k => k.id === (p?.kind || "go")) || KINDS[0];
/* 一覧などに出すアイコン：行きたいはカテゴリ、それ以外は種類 */
const iconOf = p => kindOf(p).id === "go" ? catOf(p.cat) : kindOf(p);

/* ---------- ちょっとした道具 ---------- */
/* ---------- どんぐりアイコン（🌰は栗なので自前で描く） ---------- */
function acornSvg(gold){
  const c = gold ? ["#f6c945", "#d9a520", "#fff3c4", "#b8862a", "#94691c", "#d8ad55"] : ["#c98448", "#a5622f", "#fff", "#8b6239", "#6e4b2b", "#a57b4f"];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48"><path d="M8 19 C8 33 14 44 20 46 C26 44 32 33 32 19 Z" fill="${c[0]}"/><path d="M24 19 C26 30 24 40 20 46 C26 44 32 33 32 19 Z" fill="${c[1]}" opacity=".6"/><ellipse cx="14.5" cy="27" rx="2.6" ry="6" fill="${c[2]}" opacity=".45"/><path d="M5 19.5 C5 11 12 7 20 7 C28 7 35 11 35 19.5 C35 22 31 23.5 20 23.5 C9 23.5 5 22 5 19.5 Z" fill="${c[3]}"/><path d="M5.3 20 C6 22.2 10 23.5 20 23.5 C30 23.5 34 22.2 34.7 20 C33 21 28 21.5 20 21.5 C12 21.5 7 21 5.3 20 Z" fill="${c[4]}"/><g fill="${c[5]}"><circle cx="11" cy="15" r="1.3"/><circle cx="16" cy="12" r="1.3"/><circle cx="21" cy="11" r="1.3"/><circle cx="26" cy="12.5" r="1.3"/><circle cx="30" cy="16" r="1.3"/><circle cx="14" cy="18" r="1.3"/><circle cx="19.5" cy="16" r="1.3"/><circle cx="25" cy="17.5" r="1.3"/></g><path d="M20 7.5 C20 4.5 21 2.5 24 1.5" stroke="${c[4]}" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>`;
}
const AC = `<span class="acn">${acornSvg()}</span>`;

function toast(msg){ const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2300); }
function openSheet(html){ $layer.innerHTML = `<div class="ov" data-a="ovclose"><div class="sheet" role="dialog"><div class="grab"></div>${html}</div></div>`; }
function closeSheet(){ $layer.innerHTML = ""; }
/* 同じシートを開いたまま中身だけ入れかえる（高さ固定・スクロール位置そのまま。おみせ・おへやの切りかえ用） */
function openSheetK(key, html){
  const cur = $layer.querySelector(`.sheet[data-k="${key}"]`);
  if (!cur) { $layer.innerHTML = `<div class="ov" data-a="ovclose"><div class="sheet tall" data-k="${key}" role="dialog"><div class="grab"></div>${html}</div></div>`; return; }
  const top = cur.scrollTop, cx = [...cur.querySelectorAll(".chips,.seg")].map(c => c.scrollLeft);
  cur.innerHTML = `<div class="grab"></div>${html}`;
  cur.scrollTop = top; cur.querySelectorAll(".chips,.seg").forEach((c, i) => { c.scrollLeft = cx[i] || 0; });
}
/* 消す前の確認（開いている画面の上に重ねて出す）。「やめる」が上、「消す」が下 */
function askConfirm(title, text, okLabel = "消す"){
  return new Promise(res => {
    const o = document.createElement("div"); o.className = "cfm";
    o.innerHTML = `<div class="box" role="alertdialog"><h4>${title}</h4>${text ? `<p>${text}</p>` : ""}<button class="btn ghost block" data-c="0">やめる</button><button class="btn danger fill block" data-c="1">${okLabel}</button></div>`;
    o.addEventListener("click", e => {
      e.stopPropagation();
      const b = e.target.closest("[data-c]");
      if (!b && e.target !== o) return;
      o.remove(); res(b?.dataset.c === "1");
    });
    document.body.appendChild(o);
  });
}
function today(){ const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
/* 写真を小さくしてJPEGの文字データにする（Firestoreに直接入れるため） */
function loadImg(file){
  return new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error("画像を読みこめませんでした")); }; im.src = u; });
}
function shrink(im, maxSide, maxBytes){
  let side = maxSide, q = 0.8, out = "";
  for (let i = 0; i < 8; i++) {
    const r = Math.min(1, side / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.round(im.naturalWidth * r); c.height = Math.round(im.naturalHeight * r);
    c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
    out = c.toDataURL("image/jpeg", q);
    if (out.length <= maxBytes) return out;
    if (q > 0.55) q -= 0.1; else side = Math.round(side * 0.8);
  }
  return out;
}
/* 日付の計算（記念日） */
const ymd = s => { const [y, m, d] = String(s).split("-").map(Number); return Date.UTC(y, m - 1, d); };
const dayDiff = (a, b) => Math.round((ymd(b) - ymd(a)) / 86400000);
const addDays = (s, n) => { const t = new Date(ymd(s) + n * 86400000); return `${t.getUTCFullYear()}-${String(t.getUTCMonth()+1).padStart(2,"0")}-${String(t.getUTCDate()).padStart(2,"0")}`; };
function fmtDate(s){ if(!s) return ""; const [y,m,d] = String(s).split("-"); return `${y}年${+m}月${+d}日`; }
function ms(t){ return t && t.toMillis ? t.toMillis() : (typeof t === "number" ? t : Date.now()); }
/* ログインのエラー文・端末の判定・メールアドレスの整え方は共通の shared/u-auth.js */
const authMsg = e => UAuth.msg(e);

const { appUrl, STANDALONE, IN_LINE, normEmail, emailOk } = UAuth;


/* ---------- Firebase の関数（boot.js でつないだときに入る） ---------- */
let initializeApp, getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, isSignInWithEmailLink;
let FS, getFirestore, doc, collection, getDoc, getDocs, serverTimestamp, arrayUnion, deleteField, increment;
let onSnapshot, setDoc, updateDoc, addDoc, deleteDoc, writeBatch;
let AU, fbApp, auth, db; // AU＝firebase-auth の関数一式

/* メールのリンクから開かれたとき：リンクを覚えておき、送ったアドレスが分かればそのままログイン（boot.js で確認） */
const LOGIN = { link: null, sent: false };
async function finishEmailLink(email, link){
  await UAuth.finishLink(auth, AU, email, link, "futari_email");
  LOGIN.link = null; LOGIN.sent = false;
}

/* ---------- 状態 ---------- */
const S = {
  user:null, profile:null, room:null, roomId:null, places:[], dates:[], quiz:{}, qa:{}, tickets:[], letters:[], pet:null, needRules:false, tkTab:"got", extraErr:null, subs:[], noteEdit:null,
  calY:null, calM:null, calSel:null, qv:null,
  tab:"home", kind:"all", cat:"all", who:"all", sort:"new", q:"",
  authMode:"login", busy:false
};
const me = () => S.user?.uid;
const partnerUid = () => (S.room?.members || []).find(u => u !== me());
const nameOf = uid => (S.room?.names || {})[uid] || (uid === me() ? (S.profile?.name || "わたし") : "あいて");
const isPaired = () => (S.room?.members || []).length >= 2;
const votesOf = p => Object.keys(p.votes || {}).filter(u => p.votes[u] && (S.room?.members || []).includes(u));
const loveOf = (p, u) => { const x = (p.votes || {})[u]; return x === true ? 1 : (+x || 0); };
const loveSum = p => votesOf(p).reduce((n, u) => n + loveOf(p, u), 0);
const isBoth = p => isPaired() && votesOf(p).length >= 2;
const myEmail = () => normEmail(S.user?.email);
const inviteText = email => `ウリログを使おう♡\nこのURLをひらいて、${email} でログインしてね。\n${appUrl()}?openExternalBrowser=1`;

function stopSubs(){ S.subs.forEach(f => { try { f(); } catch {} }); S.subs = []; }

