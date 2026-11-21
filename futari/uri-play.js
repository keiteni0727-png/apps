"use strict";
/* ウリログ：うりぼーとあそぶ（おもちゃ）・ミニゲーム「うりぼージャンプ」
   ファイルの分け方：core.js（共通の道具・状態）→ 各機能 → events.js（ボタン）→ boot.js（Firebase につないで起動）
   どのファイルの関数・変数も、ほかのファイルからそのまま使える（ふつうの <script> で順に読み込む） */

/* =============== おもちゃ（どんぐりで買う・1日目のあそびでせいちょう+4） =============== */
const TOY_XP = 4;
const TOYS = [
  { id:"ball",    n:"ボール",         e:"🎾", p:20, say:["とってきたぷぎ！もういっかい！", "なげてなげて〜！"] },
  { id:"jarashi", n:"ねこじゃらし",   e:"🌾", p:25, say:["つかまえた…と思ったのに〜", "ふりふりにがまんできないぷぎ"] },
  { id:"bubble",  n:"シャボンだま",   e:"🫧", p:30, say:["ぱちん！ぱちん！たのしい〜", "きらきらでとってもきれい"] },
  { id:"tsumiki", n:"つみき",         e:"🧱", p:35, say:["あ〜！くずれちゃった…", "こんどはもっとたかくつむぞ！"] },
  { id:"yoyo",    n:"ヨーヨー",       e:"🪀", p:45, say:["しゅるしゅる〜できた！", "わざ、みてた？"] },
  { id:"plush",   n:"うりぼーのぬいぐるみ", e:"🧸", p:60, say:["ぼくのおともだち、ぎゅー！", "ぬいぐるみといっしょにおひるね…"] }
];
const toyOf = id => TOYS.find(x => x.id === id);
const toyOwned = id => !!S.pet?.toys?.[id];
const playedToday = uid => S.pet?.play?.[uid]?.last === today();
function toyTileSub(){
  const n = TOYS.filter(t => toyOwned(t.id)).length;
  if (!n) return "おもちゃをかってあそぼう";
  return playedToday(me()) ? `${n}こ持ってる ・ きょうもあそんだよ` : `${n}こ持ってる ・ きょうはまだ`;
}
function openToys(){
  const bal = S.pet?.acorns || 0, done = playedToday(me());
  const have = TOYS.filter(t => toyOwned(t.id)), shop = TOYS.filter(t => !toyOwned(t.id));
  openSheetK("toys", `<h3>🧸 うりぼーとあそぶ<button class="x" data-a="close">×</button></h3>
    <p class="muted otp">${done ? "きょうはもうあそんだよ。何回でもあそべるけど、せいちょうは1日1回" : `1日1回目のあそびで、せいちょう +${TOY_XP}`} ・ ${AC} ${bal}こ</p>
    ${have.length ? `<div class="lbl2">もってるおもちゃ（タップであそぶ）</div><div class="tygrid">${have.map(t => `<button class="tyitem" data-a="toyPlay" data-id="${t.id}"><span>${t.e}</span><b>${esc(t.n)}</b></button>`).join("")}</div>` : ""}
    ${shop.length ? `<div class="lbl2">おもちゃやさん</div><div class="snlist">${shop.map(t => `<button class="snrow ${bal < t.p ? "poor" : ""}" data-a="toyBuy" data-id="${t.id}"><span class="sne">${t.e}</span><div class="t"><b>${esc(t.n)}</b><small>かうとすぐあそべるよ</small></div><em>${AC}${t.p}</em></button>`).join("")}</div>` : `<p class="muted otp">おもちゃ、ぜんぶそろったよ！🎉</p>`}`);
}
async function toyBuy(id){
  const t = toyOf(id), bal = S.pet?.acorns || 0; if (!t || toyOwned(id)) return;
  if (bal < t.p) { toast(`どんぐりがあと${t.p - bal}こ足りないよ`); return; }
  try {
    await setDoc(petRef(), { acorns: increment(-t.p), toys: { [id]: true } }, { merge: true });
    S.pet = { ...(S.pet || {}), acorns: bal - t.p, toys: { ...(S.pet?.toys || {}), [id]: true } };
    toast(`${t.e} ${t.n}をかったよ！`);
    toyPlay(id);
  } catch (e) { toast("かえませんでした（" + (e.code || e.message) + "）"); }
}
/* うりぼーのステージでおもちゃのアニメーション */
function toyPlay(id){
  const t = toyOf(id); if (!t || uriBusy) return;
  closeSheet(); S.tab = "uri"; render(); window.scrollTo(0, 0);
  const stg = document.getElementById("ustage"), el = document.getElementById("uri"); if (!stg || !el) return;
  uriBusy = true;
  const st = uriState().st, T = [], at = (ms, f) => T.push(setTimeout(f, ms));
  const act = (c, m) => { el.innerHTML = uriSvg(st, m || "happy", uw()); el.className = `uri s${st}`; el.offsetWidth; el.className = `uri s${st} ${c}`; };
  const prop = (cls, txt, css) => { const s = document.createElement("span"); s.className = "toy " + cls; s.textContent = txt; if (css) s.style.cssText = css; stg.appendChild(s); return s; };
  let end = 2600;
  uriSay(`${t.e} ${t.n}であそぶぷぎ！`);
  if (id === "ball") {
    const b = prop("tball", t.e);
    at(500, () => act("a-dash")); at(1500, () => act("a-dash")); at(2300, () => { b.remove(); act("a-jump"); uriFx(["🎾", "💕"], 4); });
  } else if (id === "jarashi") {
    prop("tjara", t.e);
    [300, 1000, 1700].forEach(ms => at(ms, () => act("a-jump")));
    end = 2500;
  } else if (id === "bubble") {
    for (let i = 0; i < 9; i++) at(i * 160, () => { const s = prop("tbub", t.e, `left:${15 + Math.random() * 70}%;animation-duration:${2.2 + Math.random()}s`); s.dataset.a = "bubPop"; setTimeout(() => s.remove(), 3400); });
    at(400, () => act("a-hop")); at(1700, () => act("a-jump"));
    end = 3000;
  } else if (id === "tsumiki") {
    const cols = ["#f4a3b8", "#fde68a", "#a9ddc5", "#9fd3ee"], bl = [];
    cols.forEach((c, i) => at(300 + i * 380, () => bl.push(prop("tblk", "", `background:${c};bottom:${18 + i * 22}px`))));
    at(400, () => act("a-wiggle"));
    at(2100, () => { bl.forEach((b, i) => { b.style.setProperty("--dx", `${(i - 1.5) * 28}px`); b.classList.add("fall"); }); act("a-surprise", "surprise"); });
    at(3000, () => bl.forEach(b => b.remove()));
    end = 3100;
  } else if (id === "yoyo") {
    prop("tyoyo", t.e);
    at(200, () => act("a-wiggle")); at(1100, () => act("a-spin")); at(2000, () => act("a-wiggle"));
    end = 2800;
  } else if (id === "plush") {
    prop("tplush", t.e);
    at(300, () => { act("a-shy", "shy"); uriFx(["💖", "💕", "💗"], 6); }); at(1600, () => act("a-squish"));
  }
  at(end, () => {
    stg.querySelectorAll(".toy").forEach(s => s.remove());
    uriBusy = false; uriSay(pick(t.say));
    const first = !playedToday(me());
    const cur = S.pet?.play?.[me()] || {}, now = Date.now();
    if (first) {
      const val = { last: today(), at: now, n: (cur.n || 0) + 1 };
      S.pet = { ...(S.pet || {}), play: { ...(S.pet?.play || {}), [me()]: val } };
      setDoc(petRef(), { play: { [me()]: { last: today(), at: now, n: increment(1) } } }, { merge: true }).catch(() => {});
      uriFx(["✨", `+${TOY_XP}`], 4);
    }
    const e2 = document.getElementById("uri"); if (e2) { const u2 = uriState(); e2.className = `uri s${u2.st} idle`; e2.innerHTML = uriSvg(u2.st, "happy", uw()); }
    if (first) setTimeout(() => { if (!uriBusy) render(); }, 1200);
  });
}
function bubPop(el){ el.classList.add("pop"); el.textContent = "✨"; el.removeAttribute("data-a"); setTimeout(() => el.remove(), 300); }

/* =============== ミニゲーム「うりぼージャンプ」（1日1回・とったどんぐりがおさいふに） =============== */
const JUMP_SEC = 40, JUMP_MAX = 80, JUMP_HP = 3;
function jumpInfo(uid){ const g = S.pet?.jump?.[uid] || {}, td = g.day === today(); return { best: g.best || 0, plays: td ? (g.plays || 0) : 0, last: td ? (g.last ?? null) : null }; }
let J = null;
function stumpSvg(){ return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 44"><rect x="4" y="8" width="32" height="36" rx="4" fill="#a5703f"/><rect x="4" y="8" width="10" height="36" fill="#8b5a32" opacity=".5"/><ellipse cx="20" cy="9" rx="16" ry="6" fill="#e0b184"/><ellipse cx="20" cy="9" rx="10" ry="3.6" fill="none" stroke="#c9905a" stroke-width="1.4"/><ellipse cx="20" cy="9" rx="4.4" ry="1.6" fill="none" stroke="#c9905a" stroke-width="1.2"/><path d="M30 20q6-2 8 3" stroke="#6fbb9c" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`; }
function rockSvg(){ return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 32"><path d="M3 30q-2-14 9-22q8-7 18-4q11 4 13 16q1 8-2 10z" fill="#a8a2ad"/><path d="M8 18q5-9 14-10" stroke="#cfc9d4" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M28 28q8-2 11-9" stroke="#8d8692" stroke-width="2" fill="none"/></svg>`; }
function openJump(){
  const u = uriState(), mi = jumpInfo(me());
  if (mi.plays >= 1) { toast("うりぼージャンプは1日1回だよ。またあした！"); return; }
  $layer.innerHTML = `<div class="ugame jgame" id="ugame">
    <div class="ugtop"><button class="ugx" data-a="jumpClose" aria-label="とじる">×</button><span class="ugpill" id="jT">⏱ ${JUMP_SEC}</span><span class="ugpill" id="jH">${"❤️".repeat(JUMP_HP)}</span><span class="ugpill" id="jS">${AC} 0</span></div>
    <canvas id="ugc"></canvas>
    <div class="ugmsg" id="ugM"><div class="ugbox">
      <div class="uri s${u.st}" style="margin:0 auto">${uriSvg(u.st, "happy", uw())}</div>
      <h3>うりぼージャンプ</h3>
      <div class="ughelp">
        <div><span class="ic">👆</span>タップでジャンプ</div>
        <div><span class="ic">✌️</span>空中でもう1回</div>
        <div><span class="ic">${AC}</span>どんぐり +1</div>
        <div><span class="ic">${acornSvg(true)}</span>金のどんぐり +5</div>
        <div><span class="ic">🪵</span>きりかぶ・いし ❤️−1</div>
        <div><span class="ic">🐝</span>ハチ ❤️−1</div>
      </div>
      <p class="muted">1日1回のチャレンジ！❤️がなくなるか${JUMP_SEC}びょうでおわり<br>とった数がふたりのおさいふに入るよ（さいだい${JUMP_MAX}こ）</p>
      <button class="btn block" data-a="jumpStart">スタート</button>
    </div></div>
  </div>`;
  const c = document.getElementById("ugc"), wrap = document.getElementById("ugame");
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = wrap.clientWidth, H = wrap.clientHeight;
  c.width = W * dpr; c.height = H * dpr; c.style.width = W + "px"; c.style.height = H + "px";
  const ctx = c.getContext("2d"); ctx.scale(dpr, dpr);
  J = { ctx, W, H, gy: H - 150, run: false, img: svgImg(uriSvg(u.st, "happy", uw())), imgSad: svgImg(uriSvg(u.st, "sad", uw())),
    imNut: svgImg(acornSvg()), imGold: svgImg(acornSvg(true)), imStump: svgImg(stumpSvg()), imRock: svgImg(rockSvg()),
    y: 0, vy: 0, jumps: 0, obs: [], nuts: [], pops: [], score: 0, hp: JUMP_HP, inv: 0, scroll: 0 };
  c.addEventListener("pointerdown", e => { e.preventDefault(); jumpTap(); });
  wrap.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
  jumpDraw(0);
}
function jumpStart(){
  if (!J || J.run || J.done) return;
  const mi = jumpInfo(me());
  if (mi.plays >= 1) { toast("うりぼージャンプは1日1回だよ。またあした！"); return; }
  J.mi = mi;
  const sv = { best: mi.best, day: today(), plays: mi.plays + 1, last: 0 };
  S.pet = { ...(S.pet || {}), jump: { ...(S.pet?.jump || {}), [me()]: sv } };
  setDoc(petRef(), { jump: { [me()]: sv } }, { merge: true }).catch(() => {});
  document.getElementById("ugM").classList.add("hide");
  const n = performance.now();
  Object.assign(J, { run: true, t0: n, last: n, nextObs: 1.2, nextNut: .5, golds: 0, maxAir: 0 });
  requestAnimationFrame(jumpLoop);
}
function jumpTap(){
  if (!J || !J.run) return;
  if (J.jumps >= 2) return;
  J.vy = J.jumps ? -620 : -720; J.jumps++;
}
function jumpLoop(now){
  if (!J || !J.run) return;
  const dt = Math.min(.05, (now - J.last) / 1000); J.last = now;
  const el = (now - J.t0) / 1000, left = Math.max(0, JUMP_SEC - el), speed = 230 + Math.min(el, 40) * 6;
  J.scroll += speed * dt;
  // うりぼー（地面からの高さ y）
  J.vy += 2000 * dt; J.y -= J.vy * dt;
  if (J.y <= 0) { J.y = 0; J.vy = 0; J.jumps = 0; }
  if (J.inv > 0) J.inv -= dt;
  // じゃまもの
  J.nextObs -= dt;
  if (J.nextObs <= 0) {
    const r = Math.random(), k = el > 8 && r < .22 ? "bee" : r < .6 ? "stump" : "rock";
    J.obs.push({ k, x: J.W + 40, h: k === "bee" ? 70 + Math.random() * 60 : 0, w: k === "stump" ? 40 : k === "rock" ? 44 : 34, ht: k === "stump" ? 44 : k === "rock" ? 32 : 30 });
    J.nextObs = Math.max(.75, 1.7 - el * .025) * (.75 + Math.random() * .6);
  }
  // どんぐり（1こ〜ならび）
  J.nextNut -= dt;
  if (J.nextNut <= 0) {
    const n = 1 + Math.floor(Math.random() * 4), h = [20, 90, 160][Math.floor(Math.random() * 3)], gold = Math.random() < .08;
    for (let i = 0; i < (gold ? 1 : n); i++) J.nuts.push({ x: J.W + 30 + i * 34, h: h + (n > 2 ? Math.sin(i / (n - 1) * Math.PI) * 30 : 0), gold });
    J.nextNut = .7 + Math.random() * .8;
  }
  const px = 90, pyb = J.gy - J.y; // うりぼーの足もと
  J.obs.forEach(o => {
    o.x -= speed * dt * (o.k === "bee" ? 1.25 : 1);
    if (o.k === "bee") o.h += Math.sin(now / 200 + o.x / 40) * 40 * dt;
    const oy = J.gy - o.h; // 下端
    if (!o.hit && J.inv <= 0 && Math.abs(o.x - px) < (o.w / 2 + 22) && pyb > oy - o.ht + 8 && pyb - 60 < oy) {
      o.hit = true; J.hp--; J.inv = 1.1; jumpPop(px, pyb - 80, "いたっ！", "#d46a7e");
    }
  });
  J.nuts.forEach(t => {
    t.x -= speed * dt;
    const ty = J.gy - t.h;
    if (!t.got && Math.abs(t.x - px) < 32 && Math.abs(ty - (pyb - 34)) < 44) {
      t.got = true; const pt = t.gold ? 5 : 1; J.score += pt; if (t.gold) J.golds++;
      jumpPop(t.x, ty - 20, `+${pt}`, t.gold ? "#d9a520" : "#e2809c");
    }
  });
  J.obs = J.obs.filter(o => o.x > -60); J.nuts = J.nuts.filter(t => !t.got && t.x > -40);
  J.pops.forEach(p => { p.y -= 50 * dt; p.a -= dt * 1.3; }); J.pops = J.pops.filter(p => p.a > 0);
  const tEl = document.getElementById("jT"), hEl = document.getElementById("jH"), sEl = document.getElementById("jS");
  if (tEl) { tEl.textContent = `⏱ ${Math.ceil(left)}`; tEl.classList.toggle("rush", left <= 10); }
  if (hEl) hEl.textContent = "❤️".repeat(Math.max(0, J.hp)) + "🤍".repeat(JUMP_HP - Math.max(0, J.hp));
  if (sEl) sEl.innerHTML = `${AC} ${J.score}`;
  jumpDraw(now);
  if (left <= 0 || J.hp <= 0) { J.run = false; jumpEnd(J.hp <= 0); return; }
  requestAnimationFrame(jumpLoop);
}
function jumpPop(x, y, t, col){ J.pops.push({ x, y, t, col, a: 1 }); }
function jumpDraw(now){
  const { ctx, W, H, gy } = J; ctx.clearRect(0, 0, W, H);
  const img = (im, x, y, w, h, fb) => { if (im && im.complete && im.naturalWidth) ctx.drawImage(im, x - w / 2, y - h, w, h); else { ctx.font = "28px sans-serif"; ctx.fillText(fb, x, y - h / 2); } };
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  // とおくの山・木（ゆっくり流れる）
  ctx.fillStyle = "rgba(169,221,197,.45)";
  for (let i = -1; i < W / 160 + 2; i++) { const x = i * 160 - (J.scroll * .25) % 160; ctx.beginPath(); ctx.arc(x, gy + 10, 90, Math.PI, 0); ctx.fill(); }
  ctx.fillStyle = "rgba(111,187,156,.35)";
  for (let i = -1; i < W / 110 + 2; i++) { const x = i * 110 + 40 - (J.scroll * .5) % 110; ctx.beginPath(); ctx.arc(x, gy - 30, 22, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 3, gy - 30, 6, 30); }
  // じめん
  ctx.fillStyle = "#cfe9d9"; ctx.fillRect(0, gy, W, H - gy);
  ctx.fillStyle = "#b5dcc5"; for (let i = -1; i < W / 40 + 2; i++) { const x = i * 40 - J.scroll % 40; ctx.fillRect(x, gy + 12, 18, 4); }
  ctx.fillStyle = "#a9ddc5"; ctx.fillRect(0, gy - 3, W, 6);
  J.nuts.forEach(t => { const y = gy - t.h; if (t.gold) { ctx.save(); ctx.globalAlpha = .45; ctx.fillStyle = "#ffe68a"; ctx.beginPath(); ctx.arc(t.x, y - 18, 20, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } img(t.gold ? J.imGold : J.imNut, t.x, y, t.gold ? 32 : 26, t.gold ? 38 : 31, "●"); });
  J.obs.forEach(o => {
    const y = gy - o.h;
    if (o.k === "stump") img(J.imStump, o.x, y + 2, 40, 44, "🪵");
    else if (o.k === "rock") img(J.imRock, o.x, y + 2, 44, 32, "🪨");
    else { ctx.font = "30px sans-serif"; ctx.fillText("🐝", o.x, y - 15); }
  });
  const s = 92, py = gy - J.y, im = J.inv > 0 ? J.imgSad : J.img;
  ctx.save(); ctx.fillStyle = "rgba(58,34,48,.12)"; ctx.beginPath(); ctx.ellipse(90, gy + 2, 30 - Math.min(20, J.y / 8), 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  if (!(J.inv > 0 && Math.floor(now / 90) % 2)) {
    ctx.save(); ctx.translate(90, py); ctx.rotate(J.y > 0 ? Math.max(-.25, Math.min(.25, J.vy / 3000)) : 0);
    if (im.complete && im.naturalWidth) ctx.drawImage(im, -s / 2, -s + 4, s, s); else { ctx.font = "50px sans-serif"; ctx.fillText("🐗", 0, -s / 2); }
    ctx.restore();
  }
  J.pops.forEach(p => { ctx.globalAlpha = Math.max(0, p.a); ctx.fillStyle = p.col; ctx.font = "bold 17px 'Zen Maru Gothic', sans-serif"; ctx.fillText(p.t, p.x, p.y); });
  ctx.globalAlpha = 1;
}
async function jumpEnd(ko){
  const score = J.score, mi = J.mi || jumpInfo(me()), reward = Math.min(score, JUMP_MAX);
  const isBest = score > mi.best, pu = partnerUid(), pb = pu ? jumpInfo(pu).best : 0, rk = score >= 60 ? "S" : score >= 40 ? "A" : score >= 20 ? "B" : "C";
  const val = { best: Math.max(mi.best, score), day: today(), plays: mi.plays + 1, last: score };
  J.done = true;
  const m = document.getElementById("ugM"); if (!m) return;
  const st = uriState().st;
  m.classList.remove("hide");
  m.innerHTML = `<div class="ugbox">
    <div class="ugrank r${rk}">${rk}</div>
    <div class="uri s${st}" style="margin:0 auto">${uriSvg(st, score >= 20 ? "happy" : "normal", uw())}</div>
    <h3>${AC} ${score}こ！</h3>
    <p class="ugstat">${ko ? "❤️がなくなっちゃった" : "さいごまではしりきった！"}${J.golds ? ` ・ 金のどんぐり ${J.golds}こ` : ""}</p>
    ${isBest ? `<p class="ugbest">じこベスト更新！🎉</p>` : `<p class="muted">ベスト ${mi.best}こ</p>`}
    ${pu ? `<p class="muted">${esc(nameOf(pu))}のベスト ${pb}こ${score > pb && pb > 0 ? " → 勝った！" : ""}</p>` : ""}
    <p>${reward ? `ふたりのおさいふに ${AC}+${reward}` : "こんどはもっととろう！"}</p>
    <button class="btn block" data-a="jumpClose">とじる</button>
  </div>`;
  try {
    await setDoc(petRef(), { jump: { [me()]: val }, ...(reward ? { acorns: increment(reward) } : {}) }, { merge: true });
    S.pet = { ...(S.pet || {}), jump: { ...(S.pet?.jump || {}), [me()]: val }, acorns: (S.pet?.acorns || 0) + reward };
  } catch (e) { toast("記録を保存できませんでした（" + (e.code || e.message) + "）"); }
}
function jumpClose(){ if (J) J.run = false; J = null; closeSheet(); render(); }
