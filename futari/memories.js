"use strict";
/* ウリログ：ふたりのひとこと（おもいで）
   ファイルの分け方：core.js（共通の道具・状態）→ 各機能 → events.js（ボタン）→ boot.js（Firebase につないで起動）
   どのファイルの関数・変数も、ほかのファイルからそのまま使える（ふつうの <script> で順に読み込む） */
/* =============== ふたりのひとこと（おもいで） =============== */
const notesKey = () => "uri_notes_seen_" + S.roomId;
function notesSeenAt(){
  try { const v = localStorage.getItem(notesKey()); if (v == null) { localStorage.setItem(notesKey(), String(Date.now())); return Date.now(); } return Number(v) || 0; } catch { return Date.now(); }
}
function markNotesSeen(){ try { localStorage.setItem(notesKey(), String(Date.now())); } catch {} }
function notesNew(){
  const pu = partnerUid(); if (!pu || !S.roomId) return [];
  const seen = notesSeenAt();
  return S.places.filter(p => p.visited && (p.notes?.[pu]?.at || 0) > seen);
}
/* ひとことを書いた順（わたし → 恋人） */
function noteList(p){
  return [me(), partnerUid()].filter(u => u && p.notes?.[u]?.t).map(u => [u, p.notes[u]]);
}
function avHtml(uid){
  const n = String(nameOf(uid) || "?");
  return `<span class="av ${uid === me() ? "" : "p"}">${esc([...n][0] || "?")}</span>`;
}
function fmtAt(at){
  if (!at) return "";
  const d = new Date(at);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function notesBlock(p){
  const pu = partnerUid(), mine = p.notes?.[me()];
  const row = (u, n, isMe) => {
    if (isMe && S.noteEdit === p.id) return `<div class="note">${avHtml(u)}<form class="nb nform" data-id="${p.id}"><b>${esc(nameOf(u))}</b>
      <textarea class="in" name="t" maxlength="300" placeholder="例：また行きたい！ごはんがおいしかった">${esc(n?.t || "")}</textarea>
      <div class="row">${n?.t ? `<button type="button" class="btn danger sm" data-a="noteDel" data-id="${p.id}">消す</button>` : ""}<button type="button" class="btn ghost sm" data-a="noteCancel" data-id="${p.id}">やめる</button><button class="btn sm">保存</button></div></form></div>`;
    return `<div class="note">${avHtml(u)}<div class="nb"><b>${esc(nameOf(u))}</b>${n?.at ? `<small>${esc(fmtAt(n.at))}</small>` : ""}
      ${n?.t ? `<p>${esc(n.t)}</p>` : `<p class="none">${isMe ? "まだ書いていません" : "まだ書いていないみたい"}</p>`}</div>
      ${isMe ? `<button class="ned" data-a="noteEdit" data-id="${p.id}">${n?.t ? "編集" : "書く"}</button>` : ""}</div>`;
  };
  return `<div class="notes" id="notes-${p.id}"><div class="ttl2">💬 ふたりのひとこと</div>${row(me(), mine, true)}${pu ? row(pu, p.notes?.[pu], false) : ""}</div>`;
}
function refreshNotes(id){
  const p = S.places.find(x => x.id === id), el = document.getElementById("notes-" + id);
  if (p && el) el.outerHTML = notesBlock(p);
  if (S.noteEdit === id) { const ta = document.querySelector(`#notes-${id} textarea`); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } }
}
async function saveNote(id, text){
  const p = S.places.find(x => x.id === id); if (!p) return;
  const t = String(text || "").trim().slice(0, 300);
  const val = t ? { t, at: Date.now() } : null;
  await updateDoc(doc(db, "rooms", S.roomId, "places", id), { ["notes." + me()]: val || deleteField() });
  p.notes = { ...(p.notes || {}) }; if (val) p.notes[me()] = val; else delete p.notes[me()];
  S.noteEdit = null; refreshNotes(id);
}

/* うり坊のイラスト（stage 0〜9、mood: happy / normal / hungry / sad / sleep / eat）
   成長するほど体が大きく横に広がり、しましまが薄れて毛色が濃くなる（本物のイノシシと同じ） */
const UPARTS = [
  // c:毛色 d:足の色 hr:頭[rx,ry] hy:頭の中心 br:体[rx,ry] L:足の長さ e:目の大きさ sn:鼻[rx,ry] so:鼻の位置 ear:耳 sp:しましまの濃さ
  { c:"#e2b68c", d:"#c09068", hr:[33,30], hy:62, br:[22,15], L:5,  e:6.4, sn:[10,7],  so:13, ear:.62, sp:1 },
  { c:"#d9ab80", d:"#b8875f", hr:[32,29], hy:59, br:[26,18], L:8,  e:6,   sn:[11,7.5],so:13, ear:.7,  sp:1 },
  { c:"#d1a176", d:"#ae7e57", hr:[31,28], hy:56, br:[30,21], L:10, e:5.6, sn:[12,8],  so:14, ear:.78, sp:.95 },
  { c:"#c99a72", d:"#a77650", hr:[30,27], hy:53, br:[34,24], L:12, e:5.2, sn:[13,9],  so:15, ear:.86, sp:.85 },
  { c:"#bb8b62", d:"#946644", hr:[29,26], hy:50, br:[38,26], L:13, e:4.8, sn:[14,9.5],so:16, ear:.92, sp:.65 },
  // ここから下（5〜9）は進化ごとに見た目が大きく変わる段階。lt:おなかの色 tk:キバの大きさ
  { c:"#946446", d:"#6a452e", hr:[27,24], hy:46, br:[44,28], L:16, e:4.2, sn:[15,10], so:17, ear:1,   sp:0, lt:"#d9b994", tk:.8 },
  { c:"#6b4733", d:"#4a3022", hr:[27,24], hy:44, br:[48,31], L:17, e:4,   sn:[16,11], so:18, ear:1.05,sp:0, lt:"#b99577", tk:1.35 },
  { c:"#6d7448", d:"#4b5132", hr:[28,25], hy:44, br:[49,31], L:17, e:4.2, sn:[16,11], so:18, ear:1.05,sp:0, lt:"#b9c48f", tk:1.15 },
  { c:"#f5f2fa", d:"#d8cfe6", hr:[28,25], hy:44, br:[47,30], L:16, e:4.4, sn:[15,10.5],so:18,ear:1.05,sp:0, lt:"#ffffff", tk:.9 },
  { c:"#f0bd55", d:"#c48d2c", hr:[28,25], hy:44, br:[48,31], L:17, e:4.4, sn:[16,11], so:18, ear:1.05,sp:0, lt:"#fff1c4", tk:1.3 }
];
/* 2代目（赤ちゃんから育てなおし・8段階）：小物は使わず、体つき・毛・耳・しっぽ・色だけで成長を見せる。ずっと丸くて小さいまま
   sc:しましまの色（配列なら1本ずつ色を変える） */
const UPARTS2 = [
  { c:"#f0d2b0", d:"#d2ae8a", hr:[35,32], hy:66, br:[22,15], L:1,  e:7,   sn:[9,6.2],   so:12, ear:.45, sp:.7 },
  { c:"#e2b68c", d:"#c09068", hr:[33,30], hy:61, br:[23,15], L:6,  e:6.6, sn:[10,7],    so:13, ear:.62, sp:1 },
  { c:"#cf9a6c", d:"#a9764c", hr:[32.5,29.5], hy:58, br:[28,18], L:10, e:6.4, sn:[11,7.5], so:13, ear:.72, sp:1.25 },
  { c:"#c68d62", d:"#9f6c46", hr:[32,29], hy:57, br:[29,19], L:10, e:6.3, sn:[11,7.5],  so:13, ear:1.15, sp:1.2 },
  { c:"#d9b08c", d:"#b38a68", hr:[32,29], hy:57, br:[30,20], L:10, e:6.3, sn:[11,7.5],  so:13, ear:1,   sp:1, lt:"#fff6ea" },
  { c:"#e9cfb4", d:"#c9ab8f", hr:[32,29], hy:57, br:[30,21], L:10, e:6.3, sn:[11,7.5],  so:13, ear:1,   sp:1, lt:"#ffffff" },
  { c:"#f6c3cf", d:"#dc9fae", hr:[32,29], hy:57, br:[30,21], L:10, e:6.5, sn:[11,7.5],  so:13, ear:1,   sp:1.3, lt:"#ffffff" },
  { c:"#f5d38c", d:"#d6ac5e", hr:[32,29], hy:56, br:[31,21], L:11, e:6.5, sn:[11,7.5],  so:13, ear:1.05, sp:1.4, lt:"#fffaf0", sc:["#f9b6c7", "#fde68a", "#a9ddc5", "#bfe1f6", "#d7c8f5"] }
];
/* 色を明るく（f>0）・暗く（f<0）する。立体の陰影づけに使う */
function uShade(hex, f){
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)));
  return "#" + c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");
}
/* ぷっくり立体に見せるフィルター（左上から光、右下に影、ツヤ）。小物・きせかえに使う */
const uPuffy = id => `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
  <feGaussianBlur in="SourceAlpha" stdDeviation="1.3" result="b"/>
  <feDiffuseLighting in="b" surfaceScale="2.6" diffuseConstant="1.15" result="d"><feDistantLight azimuth="225" elevation="52"/></feDiffuseLighting>
  <feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1=".55" k2=".5" result="m"/>
  <feSpecularLighting in="b" surfaceScale="2.6" specularConstant=".7" specularExponent="28" lighting-color="#fff" result="s"><feDistantLight azimuth="225" elevation="48"/></feSpecularLighting>
  <feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>
  <feComposite in="m" in2="s2" operator="arithmetic" k2="1" k3=".5" result="o"/>
  <feComposite in="o" in2="SourceAlpha" operator="in"/></filter>`;
/* gen：1＝1代目 / 2＝2代目（省略したら今育てている子） */
function uriSvg(stage, mood, wear, gen){
  gen = gen || uriGen();
  const UP = gen === 2 ? UPARTS2 : UPARTS, st = Math.max(0, Math.min(UP.length - 1, stage | 0)), P = UP[st];
  const K = "u" + (uriSvg.n = (uriSvg.n || 0) + 1); // 1枚ごとに別のID（同じ画面に何体いても混ざらない）
  const [hx, hy0] = [60, P.hy], [hrx, hry] = P.hr, [brx, bry] = P.br;
  const hy = hy0, ground = 112, by = ground - P.L + 3 - bry;
  const snout = "#f5b5ae", ink = "#4a3540", light = P.lt || "#f7e6cf";
  const top = hy - hry, sy = hy + P.so, ey = hy - 1, ex = Math.round(hrx * .42);
  // 目
  let eyes;
  const w = P.e * 1.15;
  const nEye = x => `<ellipse cx="${x}" cy="${ey}" rx="${P.e*.85}" ry="${P.e}" fill="url(#${K}e)"/><ellipse cx="${x}" cy="${ey + P.e*.55}" rx="${P.e*.5}" ry="${P.e*.28}" fill="#c9a8d8" opacity=".55"/><circle cx="${x + P.e*.3}" cy="${ey - P.e*.38}" r="${P.e*.4}" fill="#fff"/><circle cx="${x - P.e*.32}" cy="${ey + P.e*.2}" r="${P.e*.16}" fill="#fff" opacity=".9"/>`;
  if (mood === "dizzy") eyes = [hx - ex, hx + ex].map(x => `<path d="M${x} ${ey}m-${w} 0a${w} ${w} 0 1 1 ${w*2} 0a${w*.7} ${w*.7} 0 1 1 -${w*1.4} 0a${w*.35} ${w*.35} 0 1 1 ${w*.7} 0" stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`).join("");
  else if (mood === "surprise") eyes = [hx - ex, hx + ex].map(x => `<circle cx="${x}" cy="${ey}" r="${P.e*1.25}" fill="#fff" stroke="${ink}" stroke-width="2"/><circle cx="${x}" cy="${ey}" r="${P.e*.55}" fill="${ink}"/>`).join("");
  else if (mood === "wink") eyes = `<path d="M${hx-ex-w} ${ey+1}q${w} ${-w*1.2} ${w*2} 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>` + nEye(hx + ex);
  else if (mood === "happy" || mood === "eat" || mood === "shy") eyes = `<path d="M${hx-ex-w} ${ey+1}q${w} ${-w*1.2} ${w*2} 0M${hx+ex-w} ${ey+1}q${w} ${-w*1.2} ${w*2} 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  else if (mood === "sleep") eyes = `<path d="M${hx-ex-w} ${ey}q${w} ${w*.9} ${w*2} 0M${hx+ex-w} ${ey}q${w} ${w*.9} ${w*2} 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  else {
    const r = P.e, big = st <= 2 || gen === 2;
    eyes = [hx - ex, hx + ex].map(x => nEye(x) + (big ? `<circle cx="${x + r*.05}" cy="${ey - r*.62}" r="${r*.13}" fill="#fff" opacity=".8"/>` : "")).join("");
  }
  let brows = mood === "sad" ? `<path d="M${hx-ex-8} ${ey-10}l9 3M${hx+ex+8} ${ey-10}l-9 3" stroke="#7a5a48" stroke-width="2.4" stroke-linecap="round"/>` : "";
  const tear = mood === "sad" ? `<path d="M${hx-ex-3} ${ey+6}q-2 5 0 7q3 0 2-4z" fill="#9fd3ee"/>` : "";
  const sweat = mood === "hungry" ? `<path d="M${hx+hrx-4} ${ey-14}q4 6 0 9q-4-3 0-9z" fill="#9fd3ee"/>` : "";
  const my = sy + P.sn[1] + 4;
  const paci = gen !== 2 && st === 0 && mood !== "eat" && mood !== "sad";
  const chO = mood === "shy" ? .95 : .55, chR = mood === "shy" ? 8 : 6.5, chC = mood === "shy" ? "#f08a9a" : "#f4a3b8";
  const mouth = mood === "surprise" ? `<ellipse cx="${hx}" cy="${my + 1}" rx="3.6" ry="4.4" fill="#8a4c4c"/>`
    : mood === "dizzy" ? `<path d="M${hx-7} ${my}q1.75-3 3.5 0t3.5 0t3.5 0t3.5 0" stroke="#8a4c4c" stroke-width="2" fill="none" stroke-linecap="round"/>`
    : mood === "wink" ? `<path d="M${hx-6} ${my-1}q6 5 12 0" stroke="#8a4c4c" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M${hx-2.2} ${my+1.2}q2.2 4.5 4.4 0z" fill="#f08a9a"/>`
    : paci ? `<g transform="translate(${hx} ${my + 1})"><rect x="-8" y="-3.5" width="16" height="7" rx="3.5" fill="#bfe5d4"/><circle r="3" fill="#8fd1b3"/><circle cy="6" r="3.2" fill="none" stroke="#8fd1b3" stroke-width="2"/></g>`
    : mood === "eat" ? `<ellipse class="chew" cx="${hx}" cy="${my}" rx="5" ry="3.2" fill="#8a4c4c" style="transform-origin:${hx}px ${my}px"/>`
    : mood === "sad" || mood === "hungry" ? `<path d="M${hx-5} ${my+1}q5-3 10 0" stroke="#8a4c4c" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
    : mood === "sleep" ? "" : `<path d="M${hx-6} ${my-1}q6 5 12 0" stroke="#8a4c4c" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  const zzz = mood === "sleep" ? `<text x="${hx+hrx-2}" y="${top+6}" font-size="13" font-weight="700" fill="#9580d0">z</text><text x="${hx+hrx+7}" y="${top-4}" font-size="10" font-weight="700" fill="#b8a6e6">z</text>` : "";
  // 耳
  const ear = (x, flip) => `<g transform="translate(${x} ${top + hry*.32}) scale(${flip ? -P.ear : P.ear} ${P.ear})"><path d="M-12 6q-6-22 8-26q10 6 14 24z" fill="url(#${K}r)"/><path d="M-8 3q-3-14 5-17q6 4 8 15z" fill="url(#${K}i)"/></g>`;
  // しましま（頭・体）
  const sp = P.sp > .05 ? `
    <g clip-path="url(#${K}hc)" fill="${light}" opacity="${P.sp * .6}" filter="url(#${K}f2)">
      <path d="M${hx-3} ${top-2}h6v${hry*.55}q-3 4-6 0z"/>
      <path d="M${hx-hrx*.55} ${top+4}q5-3 7-1q-5 12-3 ${hry*.7}q-5 2-7-2q-1-12 3-${hry*.7-6}z"/>
      <path d="M${hx+hrx*.55} ${top+4}q-5-3-7-1q5 12 3 ${hry*.7}q5 2 7-2q1-12-3-${hry*.7-6}z"/>
    </g>
    <g clip-path="url(#${K}bc)" fill="${light}" opacity="${P.sp * .6}" filter="url(#${K}f2)">
      ${[-.72, -.32, .32, .72].map(k => `<path d="M${hx + brx*k - 2.5} ${by - bry}q${-k*6} ${bry} 0 ${bry*2}h5q${-k*6} ${-bry} 0 ${-bry*2}z"/>`).join("")}
    </g>` : "";
  // 成長ごとの小物
  let back = "", acc = "", neck = "", headTop = "", deco = "";
  const tuft = `<path d="M${hx-1} ${top+2}q-4-8 2-10q-3 5 3 8q0-6 5-6q-4 4-2 8z" fill="${P.d}"/>`;
  const tk = P.tk || 0;
  const tusks = tk ? `<path d="M${hx-P.sn[0]+3} ${sy+P.sn[1]-2}q${-9*tk} 0 ${-9*tk} ${-13*tk}q${4*tk} ${8*tk} ${11*tk} ${8*tk}z" fill="#fffaf0" stroke="#d9c9ae" stroke-width="1"/><path d="M${hx+P.sn[0]-3} ${sy+P.sn[1]-2}q${9*tk} 0 ${9*tk} ${-13*tk}q${-4*tk} ${8*tk} ${-11*tk} ${8*tk}z" fill="#fffaf0" stroke="#d9c9ae" stroke-width="1"/>` : "";
  const sparkle = (x, y, r, c) => `<path d="M${x} ${y-r}l${r*.28} ${r*.72}l${r*.72} ${r*.28}l${-r*.72} ${r*.28}l${-r*.28} ${r*.72}l${-r*.28} ${-r*.72}l${-r*.72} ${-r*.28}l${r*.72} ${-r*.28}z" fill="${c}"/>`;
  const scarf = (c1, c2, tail) => `<path d="M${hx-hrx*.8} ${hy+hry*.72}q${hrx*.8} ${12} ${hrx*1.6} 0l-3 8q-${hrx*.75} 10-${hrx*1.5} 0z" fill="${c1}"/>${tail ? `<path d="M${hx+hrx*.45} ${hy+hry*.9}q10 4 18 16l-7 2q-6-8-14-12z" fill="${c2}"/>` : `<path d="M${hx-4} ${hy+hry+6}l4 10l4-10z" fill="${c2}"/>`}`;
  if (st === 0) {
    headTop = `<path d="M${hx-hrx-3} ${hy-2}Q${hx-hrx} ${top-12} ${hx} ${top-10}Q${hx+hrx} ${top-12} ${hx+hrx+3} ${hy-2}Q${hx} ${top+6} ${hx-hrx-3} ${hy-2}z" fill="#fbd3df"/>
      ${Array.from({ length: 9 }, (_, i) => { const t = i / 8, x = hx - hrx - 3 + t * (hrx * 2 + 6), y = hy - 2 - Math.sin(t * Math.PI) * (hry - 4) * .55; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="#fff"/>`; }).join("")}
      <path d="M${hx-hrx-2} ${hy}q-2 12 4 18M${hx+hrx+2} ${hy}q2 12-4 18" stroke="#f4a3b8" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <circle cx="${hx}" cy="${top-9}" r="4" fill="#f4a3b8"/>`;
    deco = sparkle(16, 40, 5, "#fde68a") + sparkle(104, 70, 4, "#fbcfe8");
  }
  if (st === 1) {
    headTop = tuft;
    neck = `<path d="M${hx-16} ${hy+hry-4}q16 6 32 0q2 16-16 20q-18-4-16-20z" fill="#fff3b0"/><path d="M${hx} ${hy+hry+10}c-2-3-6-1-4 2l4 4l4-4c2-3-2-5-4-2z" fill="#f4a3b8"/>`;
  }
  if (st === 2) headTop = `<path d="M${hx} ${top+2}q0-8 0-12" stroke="#6fbb9c" stroke-width="2.4" stroke-linecap="round"/><path d="M${hx} ${top-8}q-9-6-12 2q8 4 12-2z" fill="#8fd1b3"/><path d="M${hx} ${top-10}q8-8 12 0q-7 5-12 0z" fill="#a9ddc5"/>`;
  if (st === 3) neck = scarf("#f4a3b8", "#e2809c") + `<circle cx="${hx-12}" cy="${hy+hry+3}" r="1.5" fill="#fff"/><circle cx="${hx+10}" cy="${hy+hry+4}" r="1.5" fill="#fff"/>`;
  if (st === 4) {
    neck = scarf("#8fd1b3", "#6fbb9c", true);
    acc = `<g transform="translate(${hx+hrx*.5} ${top+9}) rotate(-25)"><rect x="-9" y="-3.5" width="18" height="7" rx="3.5" fill="#fff4e4" stroke="#e8c9a0" stroke-width="1"/><rect x="-3" y="-3.5" width="6" height="7" fill="#f6d7ad"/></g>`;
    deco = sparkle(100, 30, 5, "#fde68a");
  }
  // 背中のたてがみ（体のふちに沿ったトゲ。頭のうしろに隠れる部分は見えない）
  const ridge = (col, n = 9, len = 7) => Array.from({ length: n }, (_, i) => {
    const t = Math.PI * (.1 + .8 * i / (n - 1)), nx = Math.cos(t), ny = -Math.sin(t), x = hx + nx * brx, y = by + ny * bry, tx = -ny, ty = nx;
    return `<path d="M${(x - tx * 4).toFixed(1)} ${(y - ty * 4).toFixed(1)}L${(x + nx * len).toFixed(1)} ${(y + ny * len).toFixed(1)}L${(x + tx * 4).toFixed(1)} ${(y + ty * 4).toFixed(1)}z" fill="${col}"/>`;
  }).join("");
  const maneC = (col, k = 1) => `<path transform="translate(${hx} ${top + 5}) scale(${k}) translate(${-hx} ${-(top + 5)})" d="M${hx-14} ${top+5}l3-9l4 6l3-9l4 7l3-9l3 8l4-7l3 9l3-6l2 9q-17-5-32 0z" fill="${col}"/>`;
  const leaf = (x, y, r, c, rot) => `<path transform="translate(${x} ${y}) rotate(${rot})" d="M0 0q${-r*.7} ${-r*.6} 0 ${-r*1.6}q${r*.7} ${r} 0 ${r*1.6}z" fill="${c}"/>`;
  const cape = (c1, c2) => `<path d="M${hx-20} ${hy+hry-8}Q${hx-brx-14} ${by+6} ${hx-brx-6} ${ground-5}Q${hx} ${ground+2} ${hx+brx+6} ${ground-5}Q${hx+brx+14} ${by+6} ${hx+20} ${hy+hry-8}z" fill="${c1}"/><path d="M${hx-brx-6} ${ground-5}Q${hx} ${ground+2} ${hx+brx+6} ${ground-5}" stroke="${c2}" stroke-width="3.5" fill="none"/>`;
  if (st === 5) { // わかウリ：しましまが消えて、たてがみとキバが生える
    back = ridge("#5a3a26", 9, 6);
    headTop = maneC("#5a3a26");
    neck = scarf("#7cc4a4", "#5aa886", true);
  }
  if (st === 6) { // つよウリ：大きなキバ・ふさふさのたてがみ・赤いマント
    back = cape("#d9534f", "#b33d3a") + ridge("#3d2618", 11, 10);
    headTop = maneC("#3d2618", 1.3);
    neck = `<circle cx="${hx}" cy="${hy+hry+3}" r="5" fill="#f2c94c" stroke="#c9992c" stroke-width="1.2"/><circle cx="${hx}" cy="${hy+hry+3}" r="2" fill="#d9534f"/>`;
    brows = brows || (mood === "sleep" ? "" : `<path d="M${hx-ex-7} ${ey-9}l8 2.5M${hx+ex+7} ${ey-9}l-8 2.5" stroke="#3d2618" stroke-width="2.6" stroke-linecap="round"/>`);
  }
  if (st === 7) { // もりのぬし：苔色の毛・葉っぱのたてがみ・枝のツノ・背中にキノコ
    back = ridge("#5f8f4e", 11, 9) + [[-.62, "#e86a5c"], [.66, "#f0a04b"]].map(([k, c]) => { const x = hx + brx * k, y = by - bry * .78; return `<rect x="${x-1.6}" y="${y-8}" width="3.2" height="8" rx="1.5" fill="#fff4e0"/><path d="M${x-6.5} ${y-7}q6.5-9 13 0z" fill="${c}"/><circle cx="${x-2}" cy="${y-10}" r="1.1" fill="#fff"/><circle cx="${x+2.4}" cy="${y-9}" r="1" fill="#fff"/>`; }).join("");
    headTop = [-1, 1].map(d => { const x0 = hx + d * hrx * .42; return `<path d="M${x0} ${top+5}q${d*2} -10 ${d*9} -17M${x0+d*3.5} ${top-3}l${d*-6} -9M${x0+d*7} ${top-8}l${d*8} -4" stroke="#7a5a3c" stroke-width="3" fill="none" stroke-linecap="round"/>${leaf(x0+d*9, top-12, 5, "#8fd1b3", d*30)}${leaf(x0-d*2.5, top-12, 4.5, "#6fbb9c", -d*25)}${leaf(x0+d*15, top-12, 4, "#a9ddc5", d*70)}`; }).join("")
      + [-16, -8, 0, 8, 16].map((dx, i) => leaf(hx + dx, top + 7, 6, i % 2 ? "#6fbb9c" : "#8fd1b3", dx * 2.2)).join("")
      + `<g transform="translate(${hx+8} ${top+2})">${[0,72,144,216,288].map(a => `<ellipse rx="2.6" ry="4" cy="-3.6" fill="#fbd3df" transform="rotate(${a})"/>`).join("")}<circle r="2.2" fill="#fde68a"/></g>`;
    neck = `<path d="M${hx-hrx*.75} ${hy+hry-2}q${hrx*.75} 10 ${hrx*1.5} 0" stroke="#6fbb9c" stroke-width="2.6" fill="none"/>${[-.5, 0, .5].map(k => leaf(hx + hrx * k, hy + hry + 4 - Math.abs(k) * 3, 4.5, "#8fd1b3", 180 + k * 40)).join("")}`;
    deco = [[14, 34], [104, 40], [10, 78], [110, 84], [24, 18]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${4 - i % 2}" fill="#e9f7a8" opacity=".55"/><circle cx="${x}" cy="${y}" r="1.6" fill="#f6ffd0"/>`).join("");
  }
  if (st === 8) { // そらのウリ：まっしろな毛・大きな羽・天使の輪・雲の上
    back = [-1, 1].map(d => `<g transform="translate(${hx + d * (brx - 15)} ${by - bry * .2}) scale(${d * .9} .95)" fill="#f1ecfa" stroke="#c9bce4" stroke-width="1.3" stroke-linejoin="round">
      <path d="M-4 4Q-2-30 14-46Q20-40 18-32Q26-34 24-24Q30-24 26-14Q30-10 22-4Q14 6-4 8z"/>
      <path d="M2 0Q6-22 15-34M4 2Q12-12 21-17" fill="none"/></g>`).join("");
    headTop = `<path d="M${hx-6} ${top+3}q-3-9 3-11q-2 5 4 7q1-7 6-6q-4 4-2 9z" fill="#d9ccf0"/>`;
    acc = `<ellipse cx="${hx}" cy="${top-9}" rx="${hrx*.6}" ry="4.4" fill="none" stroke="#f2c94c" stroke-width="3.2"/><ellipse cx="${hx}" cy="${top-9.6}" rx="${hrx*.6}" ry="4" fill="none" stroke="#fff6c8" stroke-width="1.2"/>`;
    neck = `<path d="M${hx} ${hy+hry-1}l-9 9h18z" fill="#bfe1f6"/><circle cx="${hx}" cy="${hy+hry+6}" r="2.6" fill="#fff"/>`;
    deco = `<g fill="#fff" stroke="#cfc3e6" stroke-width="1.4">${[[30, 108, 11], [46, 111, 10], [76, 111, 10], [91, 108, 11], [60, 106, 12]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>`
      + sparkle(12, 36, 5, "#bfe1f6") + sparkle(108, 26, 6, "#c7b8ef") + sparkle(16, 82, 3.5, "#fde68a");
  }
  if (st === 9) { // でんせつのウリ：金色の毛・光のオーラ・王冠・王さまのマント
    deco = `<g class="urays">${Array.from({ length: 12 }, (_, i) => `<path d="M60 60L${(60 + Math.cos(i * Math.PI / 6 - .1) * 90).toFixed(1)} ${(60 + Math.sin(i * Math.PI / 6 - .1) * 90).toFixed(1)}L${(60 + Math.cos(i * Math.PI / 6 + .1) * 90).toFixed(1)} ${(60 + Math.sin(i * Math.PI / 6 + .1) * 90).toFixed(1)}z" fill="${i % 2 ? "#fde68a" : "#fbcfe8"}" opacity=".55"/>`).join("")}</g>`
      + sparkle(12, 28, 7, "#f2c94c") + sparkle(108, 22, 6, "#f9b6c7") + sparkle(10, 92, 4.5, "#c7b8ef") + sparkle(110, 90, 5, "#f2c94c");
    back = cape("#8a5fc8", "#fff") + `<path d="M${hx-brx-6} ${ground-5}Q${hx} ${ground+2} ${hx+brx+6} ${ground-5}" stroke="#4a3540" stroke-width="1.6" stroke-dasharray="1 7" fill="none"/>` + ridge("#f6d98a", 11, 8);
    headTop = [["#f4a3b8", -16], ["#fde68a", -8], ["#a9ddc5", 0], ["#bfe1f6", 8], ["#c7b8ef", 16]].map(([c, dx]) => `<path d="M${hx+dx-4} ${top+8}l4-12l4 12z" fill="${c}"/>`).join("")
      + `<path d="M${hx-15} ${top+3}l-2-17l8 8l9-13l9 13l8-8l-2 17z" fill="#f2c94c" stroke="#c9992c" stroke-width="1.2"/><rect x="${hx-15}" y="${top-1}" width="30" height="4" fill="#e3ad32"/><circle cx="${hx}" cy="${top-3}" r="3" fill="#e2809c"/><circle cx="${hx-9}" cy="${top}" r="2" fill="#8fd1b3"/><circle cx="${hx+9}" cy="${top}" r="2" fill="#bfe1f6"/>`;
    neck = `<path d="M${hx-8} ${hy+hry-4}l8 10l8-10" stroke="#d9534f" stroke-width="3" fill="none"/><circle cx="${hx}" cy="${hy+hry+8}" r="6" fill="#f2c94c" stroke="#c9992c" stroke-width="1.2"/>${sparkle(hx, hy + hry + 8, 4.5, "#fff")}`;
  }
  let furK = "", furB = "", furC = "", furH = ""; // 毛（立体フィルターをかけず体になじませる）
  if (gen === 2) { // 2代目：小物なし。体つき・毛・耳・しっぽ・色で成長
    back = acc = neck = headTop = deco = ""; if (mood !== "sad") brows = "";
    const lt2 = P.lt || light, blur = `filter="url(#${K}f)"`;
    const tuft2 = (k, c = P.d) => `<path transform="translate(${hx} ${top+3}) scale(${k}) translate(${-hx} ${-(top+3)})" d="M${hx-1} ${top+3}q-4-8 2-10q-3 5 3 8q0-6 5-6q-4 4-2 8z" fill="${c}"/>`;
    const tail = (k, heart) => `<g transform="translate(${hx+brx-3} ${by-bry*.2}) scale(${k})"><path d="M0 0q9-2 9-9q0-5-5-4q-4 1-1 5" stroke="${P.d}" stroke-width="3" fill="none" stroke-linecap="round"/>${heart ? `<path d="M3.4 -8.4c-1.6-2.4-5-1-3.6 1.6l3.6 3.4l3.6-3.4c1.4-2.6-2-4-3.6-1.6z" fill="#f08a9a"/>` : ""}</g>`;
    const earTuft = c => [-1, 1].map(d => `<path d="M${hx + d*hrx*.62 - d*1} ${top - 9*P.ear + 2}l${d*1} -9l${d*3} 7z" fill="${c}"/>`).join("");
    const cheekF = (k, c) => [-1, 1].map(d => [[0, -2, 5], [d * 1.6, 5, 5], [d * -.5, 11, 4.4]].map(([dx, dy, r]) => `<circle cx="${hx + d * (hrx - 3) + dx * k}" cy="${hy + 3 + dy * k}" r="${r * k}" fill="${c}"/>`).join("")).join("");
    const ruff = (c, r0 = 4.6) => Array.from({ length: 16 }, (_, i) => { const t = i / 16 * Math.PI * 2; return `<circle cx="${(hx + Math.cos(t) * (hrx + 1)).toFixed(1)}" cy="${(hy + Math.sin(t) * (hry + 1)).toFixed(1)}" r="${r0}" fill="${c}"/>`; }).join("");
    const chest = (k, c) => `<g opacity=".88" ${blur}><ellipse cx="${hx}" cy="${by + bry*.35}" rx="${brx*.5*k}" ry="${bry*.75*k}" fill="${c}"/></g>`;
    const fluff = (c, n = 14) => Array.from({ length: n }, (_, i) => { const t = -Math.PI * (1.05 + .9 * i / (n - 1)), x = hx + Math.cos(t) * (brx + 1), y = by + Math.sin(t) * (bry + 1); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.6" fill="${c}"/>`; }).join("");
    const wings = c => [-1, 1].map(d => `<g transform="translate(${hx + d * (brx - 6)} ${by - bry * .4}) scale(${d * .55} .55)" fill="${c}" stroke="#e3c98a" stroke-width="1.6" stroke-linejoin="round"><path d="M-4 4Q-2-30 14-46Q20-40 18-32Q26-34 24-24Q30-24 26-14Q30-10 22-4Q14 6-4 8z"/></g>`).join("");
    const starEye = (x, r) => `<circle cx="${x}" cy="${ey}" r="${r*.62}" fill="#7a5a8c" opacity=".5"/>${sparkle(x, ey + r*.1, r*.62, "#fff")}<circle cx="${x + r*.34}" cy="${ey - r*.42}" r="${r*.3}" fill="#fff"/>`;
    const normalEyes = !["happy", "eat", "shy", "sleep", "wink", "dizzy", "surprise"].includes(mood);
    const stars = () => { if (normalEyes) eyes += [hx - ex, hx + ex].map(x => starEye(x, P.e)).join(""); };
    // 虹色のしましま（頭と体）
    const rainbow = cs => ({
      h: `<g clip-path="url(#${K}hc)" opacity=".75">${[-.55, -.18, .18, .55].map((k, i) => `<path d="M${hx + hrx*k - 2.6} ${top-2}q${-k*5} ${hry*.5} 0 ${hry*.75}h5.2q${-k*5} ${-hry*.25} 0 ${-hry*.75}z" fill="${cs[i]}"/>`).join("")}</g>`,
      b: `<g opacity=".7">${[-.72, -.36, 0, .36, .72].map((k, i) => `<path d="M${hx + brx*k - 2.6} ${by - bry}q${-k*6} ${bry} 0 ${bry*2}h5.2q${-k*6} ${-bry} 0 ${-bry*2}z" fill="${cs[i]}"/>`).join("")}</g>` });
    if (st === 0) { headTop = tuft2(.5); deco = sparkle(16, 46, 4, "#fde68a") + sparkle(104, 74, 3.4, "#fbcfe8"); }
    if (st === 1) { headTop = tuft2(.9); back = tail(.75); }
    if (st === 2) { headTop = tuft2(1.25); back = tail(1); }
    if (st === 3) { headTop = tuft2(1.35) + earTuft(P.d); back = tail(1.05); furB = cheekF(.8, uShade(P.c, -.2)); }
    if (st === 4) { headTop = tuft2(1.4) + earTuft(P.d); back = tail(1.1); furB = cheekF(1, uShade(P.c, -.12)); furC = chest(1.15, lt2); }
    if (st === 5) { headTop = tuft2(1.5, "#fff8ee") + earTuft("#fff8ee"); furK = fluff("#e9d2b8"); back = tail(1.15); furB = ruff("#efd9bf", 5.4); furC = chest(1.2, lt2); }
    if (st === 6) { headTop = tuft2(1.5, "#fff") + earTuft("#fff"); furK = fluff("#f4c0cd"); back = tail(1.2, true); furB = ruff("#f8cdd8", 5.6); furC = chest(1.2, lt2); stars();
      deco = sparkle(14, 36, 4.5, "#fbcfe8") + sparkle(106, 30, 4, "#c7b8ef") + sparkle(108, 84, 3, "#fde68a"); }
    if (st === 7) { const rb = rainbow(P.sc); headTop = tuft2(1.6, "#fff6d8") + earTuft("#fff6d8"); furK = fluff("#f3d38e", 16); back = wings("#ffffff") + tail(1.25, true); furB = ruff("#f9dc9a", 5.8); furC = rb.b + chest(.8, lt2); furH = rb.h; stars();
      deco = `<circle cx="60" cy="66" r="54" fill="#fff4c4" opacity=".6" ${blur}/>` + sparkle(12, 30, 6, "#f2c94c") + sparkle(108, 24, 5, "#f9b6c7") + sparkle(12, 90, 4, "#c7b8ef") + sparkle(108, 88, 4.5, "#f2c94c"); }
  }
  const WR = wear || {};
  if (WR.head && gen === 2) headTop = "";
  else if (WR.head) { headTop = st === 5 ? maneC("#5a3a26") : st === 6 ? maneC("#3d2618", 1.3) : ""; if (st === 4 || st === 8) acc = ""; }
  if (WR.neck) neck = "";
  if (WR.back) back = "";
  const wz = uriWearSvg(WR, { hx, hy, hrx, hry, top, ey, ex, e: P.e, by, brx, bry, sy, sn: P.sn });
  const legX = [hx - brx * .55, hx + brx * .55], legW = 8 + st * .9;
  const C = P.c, D = P.d, pf = `filter="url(#${K}p)"`, soft = `filter="url(#${K}f)"`;
  const W2 = g => g ? `<g ${pf}>${g}</g>` : "";
  return `<svg viewBox="0 0 120 120" class="urisvg" aria-hidden="true">
    <defs>
      <clipPath id="${K}hc"><ellipse cx="${hx}" cy="${hy}" rx="${hrx}" ry="${hry}"/></clipPath><clipPath id="${K}bc"><ellipse cx="${hx}" cy="${by}" rx="${brx}" ry="${bry}"/></clipPath>
      <radialGradient id="${K}h" cx=".36" cy=".28" r=".8"><stop offset="0" stop-color="${uShade(C, .5)}"/><stop offset=".45" stop-color="${uShade(C, .08)}"/><stop offset=".85" stop-color="${uShade(C, -.18)}"/><stop offset="1" stop-color="${uShade(C, -.3)}"/></radialGradient>
      <radialGradient id="${K}b" cx=".38" cy=".22" r=".9"><stop offset="0" stop-color="${uShade(C, .42)}"/><stop offset=".5" stop-color="${C}"/><stop offset=".88" stop-color="${uShade(C, -.24)}"/><stop offset="1" stop-color="${uShade(C, -.34)}"/></radialGradient>
      <linearGradient id="${K}r" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${uShade(C, .3)}"/><stop offset="1" stop-color="${uShade(C, -.25)}"/></linearGradient>
      <linearGradient id="${K}i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbd0cb"/><stop offset="1" stop-color="#e3958f"/></linearGradient>
      <linearGradient id="${K}l" x1="0" x2="1"><stop offset="0" stop-color="${uShade(D, -.12)}"/><stop offset=".32" stop-color="${uShade(D, .28)}"/><stop offset="1" stop-color="${uShade(D, -.32)}"/></linearGradient>
      <radialGradient id="${K}s" cx=".4" cy=".3" r=".85"><stop offset="0" stop-color="#ffe0db"/><stop offset=".55" stop-color="${snout}"/><stop offset="1" stop-color="#e2918b"/></radialGradient>
      <radialGradient id="${K}n" cx=".5" cy=".7" r=".7"><stop offset="0" stop-color="#9c4e4a"/><stop offset="1" stop-color="#c97a73"/></radialGradient>
      <radialGradient id="${K}e" cx=".45" cy=".7" r=".75"><stop offset="0" stop-color="#6e5068"/><stop offset=".6" stop-color="#3a2833"/><stop offset="1" stop-color="#22161d"/></radialGradient>
      <radialGradient id="${K}g"><stop offset="0" stop-color="rgba(120,80,110,.38)"/><stop offset=".6" stop-color="rgba(120,80,110,.16)"/><stop offset="1" stop-color="rgba(120,80,110,0)"/></radialGradient>
      <filter id="${K}f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter><filter id="${K}f2" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".55"/></filter>
      ${uPuffy(K + "p")}
    </defs>
    <ellipse cx="60" cy="${ground}" rx="${Math.max(28, brx * 1.05)}" ry="7" fill="url(#${K}g)"/>
    ${deco}${furK}${W2(back)}${W2(wz.back)}
    ${legX.map(x => `<rect x="${x - legW/2}" y="${ground - P.L - 6}" width="${legW}" height="${P.L + 6}" rx="${legW/2}" fill="url(#${K}l)"/><rect x="${x - legW/2}" y="${ground - 4.5}" width="${legW}" height="4.5" rx="2.2" fill="${uShade(D, -.45)}" opacity=".8"/>`).join("")}
    <ellipse cx="${hx}" cy="${by}" rx="${brx}" ry="${bry}" fill="url(#${K}b)"/>
    <g clip-path="url(#${K}bc)">${furC}
      <ellipse cx="${hx}" cy="${by + bry*.42}" rx="${brx*.55}" ry="${bry*.5}" fill="${light}" opacity=".5" ${soft}/>
      <ellipse cx="${hx - brx*.5}" cy="${by - bry*.5}" rx="${brx*.24}" ry="${bry*.16}" fill="#fff" opacity=".35" ${soft}/>
      <ellipse cx="${hx}" cy="${hy + hry - 1}" rx="${hrx*.95}" ry="${hry*.32}" fill="#3a2230" opacity=".28" ${soft}/>
    </g>
    ${furB}${ear(hx - hrx * .62, false)}${ear(hx + hrx * .62, true)}
    <ellipse cx="${hx}" cy="${hy}" rx="${hrx}" ry="${hry}" fill="url(#${K}h)"/>
    ${sp}${furH}
    <g clip-path="url(#${K}hc)"><ellipse cx="${hx - hrx*.36}" cy="${top + hry*.36}" rx="${hrx*.34}" ry="${hry*.2}" fill="#fff" opacity=".42" ${soft}/><ellipse cx="${hx + hrx*.15}" cy="${hy + hry*1.02}" rx="${hrx*.9}" ry="${hry*.22}" fill="#3a2230" opacity=".14" ${soft}/></g>
    ${W2(neck)}${W2(headTop)}${W2(acc)}
    <ellipse cx="${hx-hrx*.68}" cy="${sy-1}" rx="${chR}" ry="${chR*.65}" fill="${chC}" opacity="${chO}" ${soft}/><ellipse cx="${hx+hrx*.68}" cy="${sy-1}" rx="${chR}" ry="${chR*.65}" fill="${chC}" opacity="${chO}" ${soft}/>
    ${brows}${eyes}${tear}${sweat}${W2(wz.face)}
    <ellipse cx="${hx + .8}" cy="${sy + 1.4}" rx="${P.sn[0]}" ry="${P.sn[1]}" fill="#6b3a3a" opacity=".16" ${soft}/>
    <ellipse cx="${hx}" cy="${sy}" rx="${P.sn[0]}" ry="${P.sn[1]}" fill="url(#${K}s)"/><ellipse cx="${hx - P.sn[0]*.36}" cy="${sy}" rx="${P.sn[0]*.18}" ry="${P.sn[1]*.42}" fill="url(#${K}n)"/><ellipse cx="${hx + P.sn[0]*.36}" cy="${sy}" rx="${P.sn[0]*.18}" ry="${P.sn[1]*.42}" fill="url(#${K}n)"/>
    <ellipse cx="${hx - P.sn[0]*.4}" cy="${sy - P.sn[1]*.55}" rx="${P.sn[0]*.32}" ry="${P.sn[1]*.2}" fill="#fff" opacity=".6"/>
    ${W2(tusks)}${mouth}${W2(wz.front)}${W2(wz.side)}${zzz}
  </svg>`;
}

