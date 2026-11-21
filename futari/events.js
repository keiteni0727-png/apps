"use strict";
/* ウリログ：ボタン・入力・送信のイベント
   ファイルの分け方：core.js（共通の道具・状態）→ 各機能 → events.js（ボタン）→ boot.js（Firebase につないで起動）
   どのファイルの関数・変数も、ほかのファイルからそのまま使える（ふつうの <script> で順に読み込む） */
/* =============== ボタンが押されたとき =============== */
let pendingDel = null, pendingDate = null, pendingQuiz = null, pendingAnniv = null, pendingTk = null;
document.addEventListener("click", async ev => {
  const el = ev.target.closest("[data-a]"); if (!el) return;
  const a = el.dataset.a, id = el.dataset.id;
  if (a === "ovclose") { if (ev.target === el) { closeSheet(); setTimeout(otsuCheck, 300); } return; }
  if (a === "vote" || a === "open") ev.stopPropagation();
  switch (a) {
    case "close": closeSheet(); setTimeout(otsuCheck, 300); break;
    case "reload": location.reload(); break;
    case "mode": S.authMode = el.dataset.v; S.openPw = true; renderLogin(); break;
    case "resend": LOGIN.sent = false; renderLogin(); break;
    case "google": {
      try { await UAuth.google(auth, AU); } catch (e) { toast(authMsg(e)); }
      break;
    }
    case "forgot": {
      const email = document.querySelector("#authf [name=email]").value.trim();
      if (!email) { document.getElementById("aerr").textContent = "上にメールアドレスを入れてから押してね"; break; }
      try { await sendPasswordResetEmail(auth, email); document.getElementById("aerr").textContent = ""; toast("パスワードを作るメールを送りました"); document.getElementById("aerr").insertAdjacentHTML("afterend", `<p class="muted" style="font-size:12px">${esc(email)} にメールを送りました。メールのリンクから新しいパスワードを決めたら、ここに戻って、そのパスワードでログインしてね。届かないときは迷惑メールも見てね。</p>`); }
      catch (e) { document.getElementById("aerr").textContent = authMsg(e); }
      break;
    }
    case "logout": stopSubs(); closeSheet(); await signOut(auth); break;
    case "createRoom": createRoom(); break;
    case "join": joinRoom(); break;
    case "joinCancel": S.skipInvite = S.invite?.roomId; S.invite = null; route(); break;
    case "recheck": { el.disabled = true; const inv = await findInvite(); if (inv && inv.roomId) renderJoin(inv); else { el.disabled = false; toast("まだ招待は届いていないみたい"); } break; }
    case "tab": {
      let v = el.dataset.v; if (v === "od") v = S.odLast || "cal";
      if (OD_TABS.includes(v)) S.odLast = v;
      if (v === "memo" && S.tab !== "memo") S.notesPrev = notesSeenAt();
      S.tab = v; S.noteEdit = null; render(); window.scrollTo(0, 0); break;
    }
    case "wardrobeHave": S.wTab = "have"; openWardrobe(); break;
    case "roomOpen": S.wTab = "room"; openWardrobe(); break;
    case "albumOpen": openSheet(`<h3>📖 成長アルバム<button class="x" data-a="close">×</button></h3>${albumHtml()}`); break;
    case "letterHub": openSheet(`<h3>💌 おてがみ<button class="x" data-a="close">×</button></h3>${letterCardHtml()}`); break;
    case "who": S.who = el.dataset.v; render(); break;
    case "goWho": S.who = el.dataset.v; S.tab = "list"; render(); window.scrollTo(0, 0); break;
    case "noteEdit": S.noteEdit = id; refreshNotes(id); break;
    case "noteCancel": S.noteEdit = null; refreshNotes(id); break;
    case "noteDel": if (!await askConfirm("ひとことを消しますか？", "書いたひとことを消します。元に戻せません。")) break; try { await saveNote(id, ""); toast("消しました"); } catch (e) { toast("消せませんでした（" + (e.code || e.message) + "）"); } break;
    case "annivs": openAnnivs(); break;
    case "qaEdit": S.qaEdit = true; render(); document.querySelector(".qaform textarea")?.focus(); break;
    case "qaCancel": S.qaEdit = false; render(); break;
    case "qaHist": openQaHist(); break;
    case "uriTap": uriTap(); break;
    case "uriFeed": uriFeed(el); break;
    case "uriInfo": openUriInfo(); break;
    case "uriName": openUriName(); break;
    case "wardrobe": openWardrobe(); break;
    case "wTab": openWardrobe(el.dataset.v); break;
    case "wSlot": S.wSlot = el.dataset.v; openWardrobe(); break;
    case "uriBuy": uriBuy(id); break;
    case "rmSlot": S.rSlot = el.dataset.v; openRoomShop(); break;
    case "rmBuy": roomBuy(id); break;
    case "rmPlace": roomPlace(id); break;
    case "omikuji": openOmikuji(); break;
    case "uriWear": uriWear(id); break;
    case "letterNew": openLetterNew(); break;
    case "letterGet": letterDeliver(true); break;
    case "letterRead": letterRead(id); break;
    case "letterDone": closeSheet(); setTimeout(() => letterDeliver(), 400); break;
    case "letters": openLetters(); break;
    case "lTab": openLetters(el.dataset.v); break;
    case "letterDel": if (!await askConfirm("おてがみを消しますか？", "送ったおてがみを消します。まだ届いていなければ、相手には届かなくなります。")) break; try { await deleteDoc(doc(db, "rooms", S.roomId, "letters", id)); toast("消しました"); } catch (e) { toast("消せませんでした（" + (e.code || e.message) + "）"); } break;
    case "gameOpen": openGame(); break;
    case "otsuOpen": openOtsu(); break;
    case "toysOpen": openToys(); break;
    case "toyBuy": toyBuy(id); break;
    case "toyPlay": toyPlay(id); break;
    case "bubPop": bubPop(el); break;
    case "jumpOpen": openJump(); break;
    case "jumpStart": jumpStart(); break;
    case "jumpClose": jumpClose(); break;
    case "otsuDest": (S.otsuSel ||= { d: null, tip: 0 }).d = el.dataset.v; openOtsu(); break;
    case "otsuTip": (S.otsuSel ||= { d: null, tip: 0 }).tip = +el.dataset.v; openOtsu(); break;
    case "otsuGo": el.disabled = true; otsuGo(); break;
    case "otsuDone": closeSheet(); render(); setTimeout(otsuCheck, 400); break;
    case "cardsOpen": openCards(); break;
    case "cardView": openCards(el.dataset.v); break;
    case "snackOpen": openSnack(); break;
    case "snackBuy": snackBuy(id); break;
    case "gachaOpen": openGacha(); break;
    case "gTier": if (!gBusy) { S.gTier = +el.dataset.v; openGacha(); } break;
    case "gachaSpin": gachaSpin(); break;
    case "gameStart": gameStart(); break;
    case "gameClose": gameClose(); break;
    case "planDel": { const d = S.dates.find(x => x.id === id); const it = d && (d.plan || [])[+el.dataset.v]; if (!it || !await askConfirm("この予定を消しますか？", `「${esc(((it.tm ? it.tm + " " : "") + (it.tx || "")).trim())}」をしおりから消します。`)) break; saveShiori(id, { plan: (d.plan || []).filter((_, i) => i !== +el.dataset.v) }); break; }
    case "itemToggle": { const d = S.dates.find(x => x.id === id); if (d) saveShiori(id, { items: (d.items || []).map((x, i) => i === +el.dataset.v ? { ...x, done: !x.done } : x) }); break; }
    case "itemDel": { const d = S.dates.find(x => x.id === id); const it = d && (d.items || [])[+el.dataset.v]; if (!it || !await askConfirm("持ち物を消しますか？", `「${esc(it.tx || "")}」をしおりから消します。`)) break; saveShiori(id, { items: (d.items || []).filter((_, i) => i !== +el.dataset.v) }); break; }
    case "tickets": openTickets(el.dataset.v); break;
    case "tkTab": openTickets(el.dataset.v); break;
    case "tkNew": openTicketNew(); break;
    case "tkUse": pendingTk = id; confirmSheet("このチケットを使う？", "使うと、" + esc(pName()) + "のホームにお知らせが出ます。", "使う！", "tkUseOk", false); break;
    case "tkUseOk":
      try { await updateDoc(doc(db, "rooms", S.roomId, "tickets", pendingTk), { status: "used", usedAt: Date.now() }); toast("チケットを使いました🎟"); openTickets("got"); }
      catch (e) { toast("うまくいきませんでした（" + (e.code || e.message) + "）"); }
      break;
    case "tkDone":
      try { await updateDoc(doc(db, "rooms", S.roomId, "tickets", id), { status: "done", doneAt: Date.now() }); toast("かなえました♡"); }
      catch (e) { toast("うまくいきませんでした（" + (e.code || e.message) + "）"); }
      break;
    case "tkDel": pendingTk = id; confirmSheet("チケットを取り消す？", "まだ使われていないチケットを取り消します。", "取り消す", "tkDelOk"); break;
    case "tkDelOk":
      try { await deleteDoc(doc(db, "rooms", S.roomId, "tickets", pendingTk)); toast("取り消しました"); openTickets("gave"); }
      catch (e) { toast("うまくいきませんでした（" + (e.code || e.message) + "）"); }
      break;
    case "annivAdd": openAnnivEdit(null); break;
    case "annivEdit": openAnnivEdit(id); break;
    case "annivDel": pendingAnniv = id; confirmSheet("記念日を消しますか？", "ふたりの画面から消えます。", "消す", "annivDelOk"); break;
    case "annivDelOk":
      try { const arr = annivs().filter(x => x.id !== pendingAnniv); await updateDoc(doc(db, "rooms", S.roomId), { annivs: arr }); S.room.annivs = arr; toast("消しました"); openAnnivs(); }
      catch (e) { toast("消せませんでした（" + (e.code || e.message) + "）"); }
      break;
    case "cat": S.cat = el.dataset.v; render(); break;
    case "kind": S.kind = el.dataset.v; S.cat = "all"; render(); break;
    case "add": openEdit(); break;
    case "open": openDetail(id); break;
    case "edit": openEdit(id); break;
    case "vote": {
      const p = S.places.find(x => x.id === id); if (!p) break;
      const cur = (p.votes || {})[me()];
      el.classList?.add("on"); heartPop(el);
      // 前の仕組みの「true」は1回ぶんとして数える
      try { await updateDoc(doc(db, "rooms", S.roomId, "places", id), { ["votes." + me()]: cur === true ? 2 : increment(1) }); }
      catch (e) { toast("保存できませんでした（" + (e.code || e.message) + "）"); }
      if (document.querySelector(".detail")) openDetail(id);
      break;
    }
    case "voteReset": {
      if (!await askConfirm("♡をリセットしますか？", "わたしが押した♡の数が0に戻ります。", "リセットする")) break;
      try { await updateDoc(doc(db, "rooms", S.roomId, "places", id), { ["votes." + me()]: deleteField() }); toast("♡をリセットしました"); }
      catch (e) { toast("保存できませんでした（" + (e.code || e.message) + "）"); }
      if (document.querySelector(".detail")) openDetail(id);
      break;
    }
    case "visit": case "visitEdit": openVisit(id); break;
    case "unvisit": {
      const p = S.places.find(x => x.id === id);
      if (!await askConfirm("「まだ行ってない」に戻しますか？", `「${esc(p?.title || "")}」の行った日${p?.visitNote ? "と思い出メモ" : ""}が消えます。`, "戻す")) break;
      try { await updateDoc(doc(db, "rooms", S.roomId, "places", id), { visited: false, visitedAt: deleteField(), visitNote: deleteField(), updatedAt: serverTimestamp() }); closeSheet(); toast("「行きたい」に戻しました"); }
      catch (e) { toast("保存できませんでした（" + (e.code || e.message) + "）"); }
      break;
    }
    case "del": {
      const p = S.places.find(x => x.id === id); if (!p) break;
      pendingDel = id;
      confirmSheet("削除しますか？", `「${esc(p.title)}」を削除します。ふたりのリストから消えて、元に戻せません。`, "削除する", "delOk");
      break;
    }
    case "delOk":
      try { deleteDoc(doc(db, "rooms", S.roomId, "photos", pendingDel)).catch(() => {}); await deleteDoc(doc(db, "rooms", S.roomId, "places", pendingDel)); closeSheet(); toast("削除しました"); }
      catch (e) { toast("削除できませんでした（" + (e.code || e.message) + "）"); }
      break;
    case "settings": openSettings(); break;
    case "invite": openInvite(); break;
    case "share":
      try { await navigator.share({ title: "ウリログ", text: inviteText(S.room.partnerEmail) }); } catch {}
      break;
    case "copy":
      try { await navigator.clipboard.writeText(inviteText(S.room.partnerEmail)); toast("コピーしました"); }
      catch { toast("コピーできませんでした。長押ししてコピーしてね"); }
      break;
    case "uninvite":
      if (!await askConfirm("招待を取り消しますか？", "登録したメールアドレスを消します。まだ入っていなければ、そのアドレスでは入れなくなります。", "取り消す")) break;
      try { await setPartnerEmail(""); toast("招待を取り消しました"); setTimeout(openInvite, 250); }
      catch (e) { toast("取り消せませんでした（" + (e.code || e.message) + "）"); }
      break;
    case "rename": openRename(); break;
    case "setpw": openSetPw(); break;
    case "since": openSince(); break;
    case "sinceClear":
      if (!await askConfirm("付き合った日を消しますか？", "記念日のカウントが表示されなくなります。")) break;
      try { await updateDoc(doc(db, "rooms", S.roomId), { since: deleteField() }); closeSheet(); toast("消しました"); }
      catch (e) { toast("消せませんでした（" + (e.code || e.message) + "）"); }
      break;
    case "dateAdd": openDateEdit(null, { placeId: el.dataset.pid || "", date: S.tab === "cal" && S.calSel >= today() ? S.calSel : "" }); break;
    case "dateOpen": openDateEdit(id); break;
    case "dateDel": {
      const d = S.dates.find(x => x.id === id); if (!d) break;
      pendingDate = id;
      confirmSheet("予定を消しますか？", `${esc(fmtShort(d.date))}「${esc(dateTitle(d))}」の予定を消します。`, "消す", "dateDelOk");
      break;
    }
    case "dateDelOk":
      try { await deleteDoc(doc(db, "rooms", S.roomId, "dates", pendingDate)); closeSheet(); toast("消しました"); }
      catch (e) { toast("消せませんでした（" + (e.code || e.message) + "）"); }
      break;
    case "calday": {
      const v = el.dataset.v; S.calSel = v;
      if (+v.slice(5, 7) !== S.calM) { S.calY = +v.slice(0, 4); S.calM = +v.slice(5, 7); }
      document.getElementById("view").innerHTML = viewCal(); break;
    }
    case "calmove": {
      const dt = new Date(Date.UTC(S.calY, S.calM - 1 + Number(el.dataset.v), 1));
      S.calY = dt.getUTCFullYear(); S.calM = dt.getUTCMonth() + 1;
      document.getElementById("view").innerHTML = viewCal(); break;
    }
    case "caltoday": S.calY = null; S.calSel = today(); document.getElementById("view").innerHTML = viewCal(); break;
    case "quiz": openQuiz(); break;
    case "qz": openQz(); break;
    case "qzHub": openQz({ v: "hub" }); break;
    case "uqPick": uqPick(+el.dataset.v); break;
    case "sqEdit": sqEditStart(); break;
    case "sqDel": S.qz2.list.splice(+el.dataset.v, 1); renderQz(); break;
    case "sqA": S.qz2.list[+el.dataset.i].a = +el.dataset.k; renderQz(); break;
    case "sqTpl": { const [t, o] = SQ_TPL[+el.dataset.v]; S.qz2.list.push({ t, o: [...o, "", "", "", ""].slice(0, 4), a: 0 }); renderQz(); break; }
    case "sqBlank": S.qz2.list.push({ t: "", o: ["", "", "", ""], a: 0 }); renderQz(); break;
    case "sqSave": sqSave(); break;
    case "sqPlay": { const pu = partnerUid(); if (pu && sqDoc(pu)) openQz({ v: "play", owner: pu, i: 0, p: [] }); break; }
    case "sqPick": sqPick(+el.dataset.v); break;
    case "sqRes": openQz({ v: "res", owner: el.dataset.v }); break;
    case "qset": { const sid = el.dataset.v; if (qDone(sid, me())) { S.qv = { v: "res", set: sid }; renderQuiz(); } else startQuiz(sid); break; }
    case "qstart": startQuiz(el.dataset.v); break;
    case "qpick": quizPick(Number(el.dataset.v), el); break;
    case "qback": quizBack(); break;
    case "qlist": S.qv = { v: "list" }; renderQuiz(); break;
    case "qreset": pendingQuiz = el.dataset.v; confirmSheet("ふたりともやり直す？", "このテストのふたりの答えを消して、最初からやり直します。", "やり直す", "qresetOk"); break;
    case "qresetOk":
      try { await deleteDoc(doc(db, "rooms", S.roomId, "quiz", pendingQuiz)); closeSheet(); openQuiz(); }
      catch (e) { toast("うまくいきませんでした（" + (e.code || e.message) + "）"); }
      break;
    case "fxclose": document.getElementById("fx").innerHTML = ""; break;
    case "fxopen": document.getElementById("fx").innerHTML = ""; S.tab = "list"; S.who = "both"; render(); openDetail(id); break;
    case "zoom": { const z = document.createElement("div"); z.className = "zoom"; z.innerHTML = `<img src="${el.src}" alt="">`; z.onclick = () => z.remove(); document.body.appendChild(z); break; }
    case "leave":
      confirmSheet("ルームから抜けますか？", isPaired() ? "抜けると、ふたりのリストが見られなくなります。もう一度入るには、恋人にもう一度メールアドレスを登録してもらう必要があります。" : "抜けると、このルームのリストは見られなくなります。", "抜ける", "leaveOk");
      break;
    case "leaveOk":
      try {
        const rid = S.roomId; stopSubs();
        await leaveRoomDoc(rid);
        await setDoc(doc(db, "users", me()), { roomId: deleteField() }, { merge: true });
        S.profile.roomId = null; S.room = null; S.roomId = null; closeSheet(); toast("ルームから抜けました"); route();
      } catch (e) { toast("抜けられませんでした（" + (e.code || e.message) + "）"); if (S.profile.roomId) openRoom(S.profile.roomId); }
      break;
  }
});
/* じぶんクイズの入力（打つたびに画面を作り直さない） */
document.addEventListener("input", ev => {
  const t = ev.target, k = t?.dataset?.sq; if (!k || !S.qz2?.list) return;
  const q = S.qz2.list[+t.dataset.i]; if (!q) return;
  if (k === "t") q.t = t.value; else q.o[+t.dataset.k] = t.value;
});
document.addEventListener("submit", async ev => {
  const qf = ev.target.closest(".qaform");
  if (qf) {
    ev.preventDefault(); const b = qf.querySelector("button:not([type=button])"); b.disabled = true;
    try { await saveQa(qf.t.value); } catch (e) { toast(e.code === "permission-denied" ? "答えられませんでした。Firebaseのルール更新が必要です" : "答えられませんでした（" + (e.code || e.message) + "）"); b.disabled = false; }
    return;
  }
  const sf = ev.target.closest(".sform");
  if (sf) {
    ev.preventDefault(); const d = S.dates.find(x => x.id === sf.dataset.id); if (!d) return;
    const tx = String(sf.tx.value || "").trim(); if (!tx) return;
    if (sf.dataset.k === "plan") await saveShiori(d.id, { plan: [...(d.plan || []), { tm: String(sf.tm.value || ""), tx: tx.slice(0, 60) }] });
    else await saveShiori(d.id, { items: [...(d.items || []), { tx: tx.slice(0, 40), done: false }] });
    document.querySelector(`#shiori .sform[data-k="${sf.dataset.k}"] input[name=tx]`)?.focus();
    return;
  }
  const f = ev.target.closest(".nform"); if (!f) return;
  ev.preventDefault();
  const b = f.querySelector("button:not([type=button])"); b.disabled = true;
  try { await saveNote(f.dataset.id, f.t.value); toast("保存しました"); }
  catch (e) { toast("保存できませんでした（" + (e.code || e.message) + "）"); b.disabled = false; }
});
document.addEventListener("change", ev => {
  if (ev.target.matches("select[data-a=sort]")) { S.sort = ev.target.value; render(); }
});

