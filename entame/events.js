/* ---------- events ---------- */
/* PC：左メニューの開閉と設定の歯車 */
function onShellClick(e) {
  if (e.target.closest("#gearBtn,[data-gear]")) {
    openSettings();
    return true;
  }
  if (e.target.closest("[data-sbtog]")) {
    sbCollapsed = !sbCollapsed;
    ls.set("adb.v3.sbc", sbCollapsed);
    document.body.classList.toggle("sbc", sbCollapsed);
    renderSidebar();
    return true;
  }
  return false;
}
/* 設定（マスタ）画面の中の操作 */
function onSettingsClick(e) {
  if ($("#setIn") && e.target.closest("#setIn") && !e.target.closest("[data-close]")) {
    const t = e.target;
    if (t.closest("[data-logout]")) {
      doLogout();
      return true;
    }
    const mk = t.closest("[data-mkey]");
    if (mk) {
      setKey = mk.dataset.mkey;
      setQ = "";
      setDel = null;
      setRen = null;
      refreshSettings(false);
      return true;
    }
    const sgb = t.closest("[data-serg]");
    if (sgb) {
      setSerG = sgb.dataset.serg;
      refreshSettings(false);
      return true;
    }
    const ssb = t.closest("[data-sersort]");
    if (ssb) {
      setSerSort = ssb.dataset.sersort;
      refreshSettings(false);
      return true;
    }
    const sob = t.closest("[data-seropen]");
    if (sob) {
      const n = sob.dataset.seropen;
      const g = seriesMainMap().map[n];
      close();
      if (state.mode === "w" || state.mode === "yt") setMode(g === "d" ? "d" : "a");
      Object.assign(state, { series: [n], xser: true, sf: [], era: [], cour: [], type: [], sort: "old", limit: 200, view: "list" });
      render();
      scrollTo(0, 0);
      return true;
    }
    const smb = t.closest("[data-sermain]");
    if (smb) {
      const n = smb.dataset.sermain;
      const cur = seriesMainMap().map[n] || "a";
      master = { ...master, seriesMain: { ...(master.seriesMain || {}), [n]: cur === "a" ? "d" : "a" } };
      saveMaster();
      refreshSettings();
      return true;
    }
    const rn = t.closest("[data-mrename]");
    if (rn) {
      setRen = rn.dataset.mrename;
      setDel = null;
      refreshSettings();
      const i = $(".mren");
      if (i) {
        i.focus();
        i.select();
      }
      return true;
    }
    const dl = t.closest("[data-mdel]");
    if (dl) {
      const n = dl.dataset.mdel;
      if (setDel !== n) {
        setDel = n;
        refreshSettings();
        return true;
      }
      setDel = null;
      const k = propagate(setKey, n, "");
      setMasterList(
        setKey,
        M(setKey).filter(x => x !== n),
      );
      toast(`「${n}」を削除しました${k ? `（${k}件から外しました）` : ""}`);
      return true;
    }
    if (t.closest("[data-madd]")) {
      const v = ($("#maddIn")?.value || "").trim();
      if (!v) {
        $("#maddIn")?.focus();
        return true;
      }
      const l = M(setKey);
      if (l.includes(v)) {
        toast(`「${v}」はすでにあります`);
        return true;
      }
      setMasterList(setKey, [...l, v]);
      toast(`「${v}」を追加しました`);
      setTimeout(() => $("#maddIn")?.focus(), 0);
      return true;
    }
    if (!t.closest(".mren") && setRen) {
      commitRename();
    }
    return true;
  }
  return false;
}
/* 画面の切り替え（番組表／ライブラリ・投稿者・アニメ／ドラマ／YouTube）と見出しの開閉 */
function setMode(m) {
  if (state.mode === m) return;
  state.mode = m;
  state.view = m === "w" ? "week" : "list";
  state.wday = "";
  state.xser = false;
  if (m === "w") {
    state.kind = "all";
  } else if (m === "m" || m === "s") {
    state.kind = m === "m" ? state.mk : "all";
    state.type = [];
    state.limit = 200;
    state.series = [];
  } else if (m !== "yt") {
    state.kind = m;
    state.limit = 200;
    state.series = [];
  }
}
function onNavClick(e) {
  const sf = e.target.closest("[data-sbfold]");
  if (sf) {
    const m = sf.dataset.sbfold;
    if (sbFold.has(m)) sbOnly(m);
    else {
      sbFold.add(m);
      ls.set("adb.v3.sbf", [...sbFold]);
    }
    renderSidebar();
    return true;
  }
  const tg = e.target.closest("[data-tygo]");
  if (tg) {
    setMode(tg.dataset.go);
    state.type = tg.dataset.tygo ? [tg.dataset.tygo] : [];
    state.limit = 200;
    render();
    scrollTo(0, 0);
    return true;
  }
  const skb = e.target.closest("[data-skgo]");
  if (skb) {
    setMode("s");
    state.kind = skb.dataset.skgo;
    state.limit = 200;
    render();
    scrollTo(0, 0);
    return true;
  }
  const mkb2 = e.target.closest("[data-mk]");
  if (mkb2) {
    if (mkb2.dataset.go) setMode(mkb2.dataset.go);
    state.mk = state.kind = mkb2.dataset.mk;
    state.limit = 200;
    render();
    return true;
  }
  const tb = e.target.closest("[data-tb]");
  if (tb) {
    const v = tb.dataset.tb;
    if (tb.dataset.go) setMode(tb.dataset.go);
    if (state.mode === "yt") {
      yst.author = v;
      saveYtUI();
    } else if (state.mode === "m") {
      state.mk = state.kind = v;
      state.limit = 200;
    } else if (state.mode === "w") {
      state.wday = v;
      state.unOnly = false;
    }
    render();
    scrollTo(0, 0);
    return true;
  }
  if (e.target.closest("[data-missw]")) {
    state.missOnly = !state.missOnly;
    state.missKey = "";
    saveUI();
    render();
    return true;
  }
  const mkb = e.target.closest("[data-mkey]");
  if (mkb) {
    const k = mkb.dataset.mkey;
    state.missKey = state.missKey === k ? "" : k;
    saveUI();
    render();
    return true;
  }
  if (e.target.closest("[data-unsw]")) {
    state.unOnly = !state.unOnly;
    saveUI();
    render();
    return true;
  }
  const vb = e.target.closest("[data-vod]");
  if (vb) {
    state.vod = vb.dataset.vod === "" ? "" : state.vod === vb.dataset.vod ? "" : vb.dataset.vod;
    state.limit = 200;
    state.fOpen = "";
    render();
    return true;
  }
  const md = e.target.closest("[data-mode]");
  if (md) {
    const m = md.dataset.mode;
    sbOnly(m);
    renderSidebar();
    if (state.mode !== m || state.type.length || (m === "s" && state.kind !== "all") || (m === "m" && state.kind !== "all")) {
      setMode(m);
      state.type = [];
      if (m === "s" || m === "m") state.mk = state.kind = "all";
      render();
      scrollTo(0, 0);
    }
    return true;
  }
  const gt = e.target.closest("[data-gtog]");
  if (gt) {
    const k = gt.dataset.gtog;
    collapsed.has(k) ? collapsed.delete(k) : collapsed.add(k);
    saveCol();
    render();
    return true;
  }
  const ga = e.target.closest("[data-gall]");
  if (ga) {
    const ks = JSON.parse(ga.dataset.keys || "[]");
    ks.forEach(k => (ga.dataset.gall === "close" ? collapsed.add(k) : collapsed.delete(k)));
    saveCol();
    render();
    return true;
  }
  return false;
}
/* フィルタ・ソートの折りたたみは、外を押したら閉じる */
function closeDropdownOnOutsideClick(e) {
  if (!e.target.closest(".fsdrop,.fsbar,.svbar,.frow,#layer,#subPop,.u-toast") && e.target.isConnected) {
    let shut = false;
    if (state.mode === "yt" && yst.fp) {
      yst.fp = "";
      saveYtUI();
      shut = true;
    } else if (state.mode !== "yt" && state.fOpen) {
      state.fOpen = "";
      state.svMode = "";
      state.svName = null;
      saveUI();
      shut = true;
    }
    if (shut) {
      render();
      if (!e.target.closest("header")) return true;
    }
  }
  return false;
}
/* サブタイトル入力の小さな画面 */
function onSubPopClick(e) {
  if (e.target.closest("#subPop")) {
    if (e.target.closest("[data-spopok]")) saveSub();
    else if (e.target.closest("[data-spopx]")) closeSub();
    return true;
  }
  return false;
}
/* 番組表・ライブラリの行：✓ボタンで次の話を視聴済にする、行を押すと詳細 */
function onRowClick(e) {
  const tk = e.target.closest("[data-tick]");
  if (tk) {
    const it = items.find(x => x.id === tk.dataset.tick);
    if (it) {
      const l = episodes(it);
      const i = l.findIndex(x => !x.w && aired(x));
      if (i >= 0) {
        l[i].w = true;
        saveEps(it, l, `${it.t.slice(0, 14)} ${l[i].n}を視聴済みにしました`);
        askSub(it, i);
      }
    }
    return true;
  }
  const s = e.target.closest("[data-id]");
  if (s) {
    openDetail(s.dataset.id);
    return true;
  }
  return false;
}
/* ライブラリのフィルタ・ソート */
function onFilterClick(e) {
  const fp = e.target.closest("[data-fpop]");
  if (fp) {
    const v = fp.dataset.fpop;
    state.fOpen = state.fOpen === v ? "" : v;
    state.svMode = "";
    state.svName = null;
    render();
    return true;
  }
  const cyb = e.target.closest("[data-couryear]");
  if (cyb) {
    const ks = SEASONS.map(se => cyb.dataset.couryear + se);
    const all = ks.every(k => state.cour.includes(k));
    state.cour = all ? state.cour.filter(c => !ks.includes(c)) : [...new Set([...state.cour, ...ks])];
    state.limit = 200;
    render();
    return true;
  }
  const er = e.target.closest("[data-era]");
  if (er) {
    state.era = er.dataset.era === "すべて" ? [] : toggle(state.era, er.dataset.era);
    state.limit = 200;
    render();
    return true;
  }
  const sa = e.target.closest("[data-seradd]");
  if (sa) {
    state.series = [...state.series, sa.dataset.seradd];
    if (state.sort === "new") state.sort = "old";
    state.limit = 200;
    render();
    const q = $("#seriesQ");
    if (q) q.focus();
    return true;
  }
  const sd = e.target.closest("[data-serdel]");
  if (sd) {
    state.series = state.series.filter(x => x !== sd.dataset.serdel);
    state.limit = 200;
    render();
    return true;
  }
  const co = e.target.closest("[data-cour]");
  if (co) {
    state.cour = co.dataset.cour === "すべて" ? [] : toggle(state.cour, co.dataset.cour);
    state.limit = 200;
    render();
    return true;
  }
  const se = e.target.closest("[data-series]");
  if (se) {
    state.series = [se.dataset.series];
    state.xser = true;
    if (state.mode === "w") {
      const it = items.find(x => x.id === openId);
      setMode(it && it.k === "d" ? "d" : "a");
    }
    state.view = "list";
    Object.assign(state, { sf: [], era: [], cour: [], type: [], sort: "old", limit: 200 });
    close();
    render();
    scrollTo(0, 0);
    return true;
  }
  const stb = e.target.closest("[data-stf]");
  if (stb) {
    const v = stb.dataset.stf;
    state.sf = !v || (state.sf.length === 1 && state.sf[0] === v) ? [] : [v];
    state.limit = 200;
    saveUI();
    render();
    return true;
  }
  if (e.target.closest("[data-xseroff]")) {
    state.xser = false;
    render();
    return true;
  }
  const gp = e.target.closest("[data-grp]");
  if (gp) {
    state.grp = gp.dataset.grp;
    state.limit = 200;
    state.fOpen = "";
    saveUI();
    render();
    return true;
  }
  const so = e.target.closest("[data-sort]");
  if (so) {
    state.sort = so.dataset.sort;
    state.fOpen = "";
    saveUI();
    render();
    return true;
  }
  const un = e.target.closest("[data-unset]");
  if (un) {
    const u = un.dataset.unset;
    const [g, v] = u.split(/:(.*)/s);
    if (u === "all" || u === "filters") {
      Object.assign(state, { sf: [], era: [], cour: [], series: [], type: [] });
      if (u === "all") state.vod = "";
    } else if (v !== undefined && Array.isArray(state[g])) state[g] = state[g].filter(x => x !== v);
    else if (g === "sort") state.sort = "new";
    else if (g === "type") state.type = [];
    else if (Array.isArray(state[g])) state[g] = [];
    state.limit = 200;
    render();
    return true;
  }
  return false;
}
/* 作品の追加・編集画面 */
function onTitleFormClick(e) {
  if (form && form.inline) {
    if (e.target.closest(".ined [data-back]")) {
      closeInlineForm();
      return true;
    }
    if (!e.target.closest(".ined")) {
      const jp = e.target.closest("#sheetIn [data-jump]");
      const tgt = jp && jp.dataset.jump;
      commitInlineForm();
      closeInlineForm();
      /* 別の項目を押したときは、そのままその項目を編集 */
      if (tgt && !e.target.closest("a,button:not([data-jump])")) {
        const it = items.find(x => x.id === openId);
        if (it) openForm(it, tgt, jp);
        return true;
      }
      return false; // ほかのボタン（閉じる・タブなど）はそのまま動かす
    }
  }
  if (form) {
    const fm = e.target.closest("[data-fm]");
    if (fm) {
      readForm();
      form.media = fm.dataset.fm;
      redrawForm();
      return true;
    }
    const fst = e.target.closest("[data-fst]");
    if (fst) {
      readForm();
      form.stations = toggle(form.stations, fst.dataset.fst);
      redrawForm();
      return true;
    }
    const fpl = e.target.closest("[data-fplat]");
    if (fpl) {
      readForm();
      form.plat = toggle(form.plat, fpl.dataset.fplat);
      redrawForm();
      return true;
    }
    const fv = e.target.closest("[data-fvod]");
    if (fv) {
      readForm();
      form.vods = toggle(form.vods, fv.dataset.fvod);
      redrawForm();
      return true;
    }
    if (e.target.closest("[data-fserall]")) {
      form.serAll = true;
      const b = $("#fSerSug");
      if (b) b.innerHTML = serSugForm($("#f-serq")?.value || "");
      return true;
    }
    const fse = e.target.closest("[data-fser]");
    if (fse) {
      readForm();
      form.series = fse.dataset.fser;
      redrawForm();
      return true;
    }
    if (e.target.closest("[data-fserdel]")) {
      readForm();
      form.series = "";
      redrawForm();
      $("#f-serq")?.focus();
      return true;
    }
    const fsn = e.target.closest("[data-fsernew]");
    if (fsn) {
      readForm();
      form.serNew = fsn.dataset.fsernew === "1";
      form.serNewName = $("#f-serq")?.value || "";
      redrawForm();
      const x = $("#f-sernew");
      if (x) x.focus();
      return true;
    }
    if (e.target.closest("[data-fsercreate]")) {
      readForm();
      const n = (form.serNewName || "").trim();
      if (!n) {
        toast("シリーズ名を入れてください");
        return true;
      }
      form.series = n;
      form.serNew = false;
      /* 新しく作ったシリーズのメインのジャンルは、作った作品のジャンルにする */
      if (!M("series").includes(n)) {
        master = { ...master, seriesMain: { ...(master.seriesMain || {}), [n]: serGroup(form.k) } };
        saveMaster();
      }
      redrawForm();
      toast(`シリーズ「${n}」を作りました`);
      return true;
    }
    const sa = e.target.closest("[data-sgadd]");
    if (sa) {
      readForm();
      const same = form.songs.filter(x => x.type === sa.dataset.sgadd);
      const last = same[same.length - 1];
      const sp = form.span || (+form.n ? [1, +form.n] : null);
      const a0 = last && last.b != null && sp && last.b < sp[1] ? last.b + 1 : sp ? sp[0] : null;
      form.songs.push({ type: sa.dataset.sgadd, s: "", st: "", ar: "", a: a0, b: sp ? sp[1] : null });
      redrawForm();
      document.querySelector(`.sg[data-sg="${form.songs.length - 1}"] .sg-st`)?.focus();
      return true;
    }
    const sdl = e.target.closest("[data-sgdel]");
    if (sdl) {
      readForm();
      form.songs.splice(+sdl.dataset.sgdel, 1);
      redrawForm();
      return true;
    }
    const fk = e.target.closest("[data-fk],[data-fs]");
    if (fk) {
      readForm();
      if (fk.dataset.fk) {
        form.k = fk.dataset.fk;
        if (form.k === "f") form.media = "movie";
        if (form.k === "r" && form.media !== "stream") form.media = "stream";
      }
      if (fk.dataset.fs) form.s = fk.dataset.fs;
      redrawForm();
      return true;
    }
    const ck = e.target.closest("[data-courkey]");
    if (ck) {
      readForm();
      if (!form.cours.includes(ck.dataset.courkey)) form.cours.push(ck.dataset.courkey);
      form.cours.sort();
      redrawForm();
      return true;
    }
    if (e.target.closest("[data-courall]")) {
      readForm();
      const on = form.cours.includes(ALLYEAR);
      form.cours = form.cours.filter(c => c !== ALLYEAR);
      if (!on) form.cours.unshift(ALLYEAR);
      redrawForm();
      return true;
    }
    if (e.target.closest("[data-courmore]")) {
      readForm();
      form.courOpen = !form.courOpen;
      redrawForm();
      return true;
    }
    const ca = e.target.closest("[data-couradd]");
    if (ca) {
      readForm();
      form.courOpen = true;
      const key = `${form.cy}${ca.dataset.couradd}`;
      if (!form.cours.includes(key)) form.cours.push(key);
      form.cours.sort();
      redrawForm();
      return true;
    }
    const cd = e.target.closest("[data-courdel]");
    if (cd) {
      readForm();
      form.cours = form.cours.filter(c => c !== cd.dataset.courdel);
      redrawForm();
      return true;
    }
  }
  return false;
}
/* 作品の詳細画面 */
function onDetailClick(e) {
  const it = openId && items.find(x => x.id === openId);
  if (it) {
    if (e.target.closest("#editItem")) {
      openForm(it);
      return true;
    }
    if (e.target.closest("#copyTitle")) {
      U.copy(it.t).then(ok => toast(ok ? "タイトルをコピーしました" : "コピーできませんでした"));
      return true;
    }
    const nfb = e.target.closest("[data-nof]");
    if (nfb) {
      const k = nfb.dataset.nof;
      dmissKeep = true;
      saveTitle(it.id, { noF: [...new Set([...(it.noF || []), k])] }, `${NOF_LAB[k]}を「なし」にしました`);
      return true;
    }
    const nsb = e.target.closest("[data-nosong]");
    if (nsb) {
      const k = nsb.dataset.nosong;
      const cur = it.noSongs || [];
      saveTitle(
        it.id,
        { noSongs: cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k] },
        `${k}を「なし」にしました`,
      );
      return true;
    }
    const sdb = e.target.closest("[data-sgdl]");
    if (sdb) {
      const k = +sdb.dataset.sgdl;
      const l = songsOf(it).map(x => ({ ...x }));
      if (l[k]) {
        l[k].dl = l[k].dl ? 0 : 1;
        saveTitle(it.id, { songs: l }, l[k].dl ? "ダウンロード済みにしました" : "未ダウンロードに戻しました");
      }
      return true;
    }
    {
      const inl = e.target.closest("[data-inl]");
      if (inl) {
        if (!e.target.closest("input")) startInline(inl);
        return true;
      }
      const jp = e.target.closest("[data-jump]");
      if (jp && !e.target.closest("a,button:not([data-jump])")) {
        openForm(it, jp.dataset.jump, jp);
        return true;
      }
    }
    const dt = e.target.closest("[data-dtab]");
    if (dt) {
      setDTab(dt.dataset.dtab);
      return true;
    }
    if (e.target.closest("#epMore")) {
      const m = $("#epMenu");
      if (m) {
        m.hidden = !m.hidden;
        $("#epMore").setAttribute("aria-expanded", String(!m.hidden));
      }
      return true;
    }
    if ($("#epMenu") && !$("#epMenu").hidden) $("#epMenu").hidden = true;
    const st = e.target.closest("[data-set]");
    if (st) {
      setStatus(it, st.dataset.set);
      return true;
    }
    const ep = e.target.closest("[data-ep]");
    if (ep) {
      const i = +ep.dataset.ep;
      const l = episodes(it);
      toggleEp(it, i, !l[i].w);
      return true;
    }
    if (e.target.closest("#allAired")) {
      const l = episodes(it);
      l.forEach(x => {
        if (aired(x)) x.w = true;
      });
      saveEps(it, l, "放送済みの話を全部チェックしました");
      return true;
    }
    if (e.target.closest("#clearAll")) {
      const l = episodes(it);
      l.forEach(x => (x.w = false));
      saveEps(it, l, "チェックを全部外しました");
      return true;
    }
    if (e.target.closest("#arcOpenEd")) {
      arcEdit = arcsOf(it).map(r => ({ ...r }));
      if (!arcEdit.length) arcEdit.push({ name: "", a: 1, b: null });
      refreshSheet();
      return true;
    }
    if (arcEdit) {
      if (e.target.closest("#arCancel")) {
        arcEdit = null;
        refreshSheet();
        return true;
      }
      if (e.target.closest("#arAdd")) {
        arcSync();
        const last = arcEdit[arcEdit.length - 1];
        arcEdit.push({ name: "", a: last ? (last.b != null ? last.b + 1 : null) : 1, b: null });
        refreshSheet();
        const ins = document.querySelectorAll(".ar-nm");
        ins[ins.length - 1]?.focus();
        return true;
      }
      const ad = e.target.closest("[data-ardel]");
      if (ad) {
        arcSync();
        arcEdit.splice(+ad.dataset.ardel, 1);
        refreshSheet();
        return true;
      }
      if (e.target.closest("#arSave")) {
        arcSync();
        const l = arcEdit.map(r => ({ name: (r.name || "").trim(), a: r.a, b: r.b })).filter(r => r.name || r.a != null || r.b != null);
        if (l.some(r => !r.name || r.a == null)) {
          toast("編の名前と最初の話を入れてください");
          return true;
        }
        if (l.some(r => r.b != null && r.b < r.a)) {
          toast("最後の話が最初の話より前になっている編があります");
          return true;
        }
        l.sort((x, y) => x.a - y.a);
        arcEdit = null;
        saveTitle(it.id, { arcs: l }, l.length ? "編を保存しました" : "編を消しました");
        return true;
      }
    }
    const ah = e.target.closest("[data-arc]");
    if (ah) {
      arcFold.set(ah.dataset.arc, ah.getAttribute("aria-expanded") !== "true");
      refreshSheet();
      return true;
    }
    if (e.target.closest("#spOpen")) {
      subPaste = { text: "" };
      refreshSheet();
      if (!TOUCH) $("#spText")?.focus({ preventScroll: true });
      return true;
    }
    if (subPaste) {
      if (e.target.closest("#spCancel")) {
        subPaste = null;
        refreshSheet();
        return true;
      }
      if (e.target.closest("#spBack")) {
        subPaste = { text: subPaste.text };
        refreshSheet();
        return true;
      }
      if (e.target.closest("#spRead")) {
        const text = $("#spText").value;
        const parsed = parseSubtitles(text);
        if (!parsed.length) {
          subPaste = { text };
          refreshSheet();
          toast("話数とサブタイトルを読み取れませんでした。「第1話」「1話」などで始まる行が必要です");
          return true;
        }
        const eps = episodes(it);
        const fy = yearOf(it) || new Date().getFullYear();
        subPaste = {
          text,
          addMissing: false,
          useDate: false,
          rows: parsed.map(r => {
            const idx = eps.findIndex(x => epNum(x.n) === r.n);
            const cur = idx >= 0 ? eps[idx] : null;
            let date = r.date;
            if (!date && r.md) {
              const y = cur && cur.t ? jst(cur.t).y : fy;
              date = `${y}-${String(r.md[0]).padStart(2, "0")}-${String(r.md[1]).padStart(2, "0")}`;
            }
            const oldDay = cur && cur.t ? jst(cur.t).day : "";
            return {
              ...r,
              date,
              idx,
              old: cur ? cur.sub || "" : "",
              oldDay,
              dateCh: !!(date && cur && date !== oldDay),
            };
          }),
        };
        refreshSheet();
        return true;
      }
      if (e.target.closest("#spApply")) {
        const l = episodes(it);
        let n = 0,
          dn = 0;
        const p = subPaste;
        const at = (day, old) => {
          const hm = old && old.t ? jst(old.t).hm : hasTime(it) ? it.time : "9:00";
          return dayTimeToT(day, hm);
        };
        p.rows.forEach(r => {
          if (r.idx < 0) return;
          const x = l[r.idx];
          if (x.sub !== r.sub) {
            x.sub = r.sub;
            n++;
          }
          if (p.useDate && r.dateCh) {
            x.t = at(r.date, x);
            if (!x.t || !hasTime(it)) x.nt = x.nt || !hasTime(it);
            dn++;
          }
        });
        if (p.addMissing) {
          p.rows
            .filter(r => r.idx < 0)
            .sort((a, b) => a.n - b.n)
            .forEach(r => {
              const x = nextEp(it, l);
              x.n = `${r.n}話`;
              x.sub = r.sub;
              if (r.date) {
                x.t = at(r.date, null);
                x.nt = !hasTime(it);
              }
              l.push(x);
              n++;
            });
          l.sort((a, b) => (epNum(a.n) ?? 0) - (epNum(b.n) ?? 0));
        }
        subPaste = null;
        saveEps(
          it,
          l,
          [n ? `サブタイトル${n}話` : "", dn ? `日付${dn}話` : ""].filter(Boolean).join("・") + "を更新しました",
        );
        refreshSheet();
        return true;
      }
    }
    if (e.target.closest("#epEditBtn")) {
      subPaste = null;
      epEdit = { list: episodes(it).map(x => ({ ...x })) };
      refreshSheet();
      return true;
    }
    if (epEdit) {
      if (e.target.closest("#erCancel")) {
        epEdit = null;
        refreshSheet();
        return true;
      }
      if (e.target.closest("#erSave")) {
        const l = epEdit.list.map(({ moved, ...x }) => x);
        epEdit = null;
        saveEps(it, l, "話数を保存しました");
        refreshSheet();
        return true;
      }
      if (e.target.closest("#erAdd")) {
        epEdit.list.push(nextEp(it, epEdit.list));
        refreshEditor();
        return true;
      }
      if (e.target.closest("#erBulkGo")) {
        const n = Math.min(200, +$("#erBulk").value || 0);
        for (let k = 0; k < n; k++) epEdit.list.push(nextEp(it, epEdit.list));
        refreshEditor();
        return true;
      }
      const d = e.target.closest("[data-erdel]");
      if (d) {
        epEdit.list.splice(+d.dataset.erdel, 1);
        refreshEditor();
        return true;
      }
    }
    if (e.target.closest("#delItem")) {
      const b = e.target.closest("#delItem");
      if (b.dataset.c) {
        const id = it.id,
          t0 = it.t,
          prev = { ...(over[id] || {}) };
        delete over[id];
        rebuild();
        close();
        render();
        removeDoc("titles", id).catch(fail);
        toastUndo(`「${t0.slice(0, 18)}」を削除しました`, () => {
          over[id] = prev;
          rebuild();
          render();
          saveDoc("titles", id, prev).catch(fail);
        });
      } else {
        b.dataset.c = "1";
        b.textContent = "もう一度押すと削除";
        b.classList.add("armed");
      }
      return true;
    }
  }
  return false;
}
/* もっと見る・戻る・閉じる・追加 */
function onCommonClick(e) {
  if (e.target.closest("#more")) {
    state.limit += 300;
    render();
    return true;
  }
  if (e.target.closest("[data-back]")) {
    const id = form && form.id,
      yid = yform && yform.id;
    close();
    if (id) openDetail(id);
    else if (yid) ytOpenDetail(yid);
    return true;
  }
  if (e.target.closest("[data-close]")) {
    close();
    return true;
  }
  if (e.target.closest("#addBtn,#sbAdd")) {
    if (state.mode === "yt") ytOpenForm(null);
    else openForm(null);
    return true;
  }
  return false;
}
/* クリックは上から順に試し、処理したところで止める */
/* スマホ：☰メニューの開閉。メニュー内で画面を選んだら閉じる */
function setDrawer(on) {
  document.body.classList.toggle("drawer", on);
  const b = document.querySelector(".hmenu");
  if (b) b.setAttribute("aria-expanded", on);
}
function onDrawerClick(e) {
  const d = e.target.closest("[data-drawer]");
  if (d) {
    if (d.dataset.drawer === "open") renderSidebar();
    setDrawer(d.dataset.drawer === "open");
    return true;
  }
  if (document.body.classList.contains("drawer") && e.target.closest("#sb [data-mode],#sb [data-go],#sb [data-tb],#sb [data-gear]"))
    setDrawer(false);
  return false;
}
/* スワイプ（共通部品 u-swipe.js）：メニューは指に合わせて開閉、画面は指に合わせて横に動かし、離すと番組表／ライブラリなど隣の画面へ */
const segBtns = () => [...document.querySelectorAll("#hseg [data-tb]")];
const segIdx = () => segBtns().findIndex(b => b.getAttribute("aria-selected") === "true");
uSwipe({
  sb: "#sb",
  scrim: ".dscrim",
  setDrawer,
  edge: 24,
  blocked: () => !!($("#layer").innerHTML || state.fOpen || yst.fp),
  pager: {
    el: "#main",
    block: "input,select,textarea,.fpop,.frow,.hseg,.vodbar,.svbar,.chips,#subPop,.u-toast",
    can: dir => {
      const i = segIdx();
      return i >= 0 && i + dir >= 0 && i + dir < segBtns().length;
    },
    go: dir => {
      const b = segBtns()[segIdx() + dir];
      if (b) b.click();
    },
  },
});
matchMedia("(max-width:899px)").addEventListener("change", () => {
  setDrawer(false);
  renderSidebar();
  /* 未入力の絞り込みはPCだけ・番組表はPCとスマホで形が違うので、幅が変わったら描き直す */
  if (state.missOnly || state.mode === "w") render();
});
const CLICK_HANDLERS = [
  onDrawerClick,
  onShellClick,
  onSettingsClick,
  onNavClick,
  closeDropdownOnOutsideClick,
  onSubPopClick,
  e => state.mode === "yt" && ytClick(e),
  onRowClick,
  onSavedFilterClick,
  onFilterClick,
  onTitleFormClick,
  onDetailClick,
  onCommonClick,
];
document.addEventListener("click", e => {
  for (const h of CLICK_HANDLERS) if (h(e)) return;
});
document.addEventListener("submit", e => {
  if (e.target.id === "svF") {
    e.preventDefault();
    svSubmit();
    return;
  }
  if (e.target.id === "ytF") {
    e.preventDefault();
    ytSubmit();
    return;
  }
  if (e.target.id === "titleF") {
    e.preventDefault();
    submitForm();
  }
});
document.addEventListener("change", e => {
  if (e.target.id === "arcJump") {
    const it = items.find(x => x.id === openId);
    const k = +e.target.value;
    const r = it && arcsOf(it)[k];
    if (!r) return;
    arcFold.set(arcKey(r), true);
    refreshSheet();
    const sh = $("#layer .sheet"),
      h = $("#arc-" + k);
    if (sh && h) {
      const hd = sh.querySelector(".dhead");
      sh.scrollTop += h.getBoundingClientRect().top - sh.getBoundingClientRect().top - (hd ? hd.offsetHeight : 0) - 8;
    }
    return;
  }
  if (e.target.dataset && e.target.dataset.svren) {
    const id = e.target.dataset.svren,
      name = e.target.value.trim();
    const f = svList().find(x => x.id === id);
    if (!f) return;
    if (!name || svList().some(x => x.id !== id && x.name === name)) {
      e.target.value = f.name;
      toast(name ? `「${name}」はすでにあります` : "名前を入れてください");
      return;
    }
    if (name !== f.name) {
      setSv(svList().map(x => (x.id === id ? { ...x, name } : x)));
      render();
      toast("名前を変更しました");
    }
    return;
  }
  if (e.target.classList.contains("inl") && e.target.type === "date") {
    commitInline(e.target);
    return;
  }
  if (e.target.id === "spDate" && subPaste) {
    subPaste.useDate = e.target.checked;
    refreshSheet();
    return;
  }
  if (e.target.id === "spAdd" && subPaste) {
    subPaste.addMissing = e.target.checked;
    refreshSheet();
    return;
  }
  if (e.target.id === "f-from" && form) {
    readForm();
    redrawForm();
    return;
  }
  if (e.target.classList.contains("nof") && form) {
    readForm();
    const h = $("#schedHint");
    if (h) h.innerHTML = schedText();
    return;
  }
  /* 曲の種類を変えたら、その種類の区切りへ移す */
  if (e.target.classList.contains("sg-t") && form) {
    readForm();
    redrawForm();
    return;
  }
  if (e.target.id === "f-cy" && form) {
    form.cy = +e.target.value;
    return;
  }
  if (e.target.id === "courY") {
    state.courY = +e.target.value;
    saveUI();
    render();
    return;
  }
  if (e.target.classList.contains("er-d") && epEdit) {
    const it = items.find(x => x.id === openId);
    const i = +e.target.closest("[data-er]").dataset.er;
    const l = epEdit.list;
    if (!e.target.value) {
      l[i].t = 0;
      refreshEditor();
      return;
    }
    const hm = l[i].t ? jst(l[i].t).hm : hasTime(it) ? it.time : "9:00";
    if (!l[i].t) l[i].nt = !hasTime(it);
    const t0 = dayTimeToT(e.target.value, hm);
    l.forEach(x => (x.moved = false));
    for (let k = i; k < l.length; k++) {
      const keep = l[k].t ? jst(l[k].t).hm : hm; // each episode keeps its own time of day
      l[k].t = t0 + WEEK * (k - i) - (mins(hm) - mins(keep));
      l[k].moved = k > i;
    }
    refreshEditor();
    return;
  }
});
document.addEventListener("input", e => {
  if (e.target.id === "svName") {
    state.svName = e.target.value;
    return;
  }
  if ((e.target.id === "f-time" || e.target.id === "f-from") && form) {
    form[e.target.id === "f-time" ? "time" : "from"] = e.target.value;
    const h = $("#schedHint");
    if (h) h.innerHTML = schedText();
    return;
  }
  if (e.target.id === "f-serq" && form) {
    const b = $("#fSerSug");
    if (b) b.innerHTML = serSugForm(e.target.value);
    return;
  }
  if (e.target.id === "spText" && subPaste) {
    subPaste.text = e.target.value;
    return;
  }
  if (e.target.id === "seriesQ") {
    const b = $("#serSug");
    if (b) b.innerHTML = seriesSugHtml(e.target.value);
    return;
  }
  if (e.target.id === "y-up") {
    const p = parseDay(e.target.value);
    const m = $("#yUpMsg");
    if (m) m.textContent = e.target.value.trim() && p === null ? "日付を読み取れません（例：2024/03/08）" : "";
    return;
  }
  if (e.target.id === "y-dur") {
    const m = $("#yDurMsg");
    if (m) {
      const v = parseDur(e.target.value);
      m.textContent = v && v !== e.target.value.trim() ? "→ " + v : "";
    }
    return;
  }
  if (e.target.id === "mq") {
    setQ = e.target.value;
    if (!e.isComposing) refreshSettings(false);
    return;
  }
  if (e.target.id === "ytq") {
    yst.q = e.target.value;
    if (!e.isComposing) searchSoon();
    return;
  }
  if (e.target.id === "q") {
    state.q = e.target.value;
    state.limit = 200;
    if (!e.isComposing) searchSoon();
    return;
  }
  if (epEdit && e.target.closest("[data-er]")) {
    const i = +e.target.closest("[data-er]").dataset.er;
    if (e.target.classList.contains("er-n")) epEdit.list[i].n = e.target.value;
    if (e.target.classList.contains("er-s")) epEdit.list[i].sub = e.target.value;
  }
});
let sTimer = 0;
function searchSoon() {
  clearTimeout(sTimer);
  sTimer = setTimeout(render, 120);
}
document.addEventListener("compositionend", e => {
  if (e.target.id === "q") {
    state.q = e.target.value;
    state.limit = 200;
    searchSoon();
  }
  if (e.target.id === "ytq") {
    yst.q = e.target.value;
    searchSoon();
  }
});
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.dataset && e.target.dataset.svren && !e.isComposing) {
    e.preventDefault();
    e.target.blur();
    return;
  }
  if (e.target.classList && e.target.classList.contains("mren")) {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      commitRename(true);
    }
    return;
  }
  if (e.target.id === "maddIn" && e.key === "Enter" && !e.isComposing) {
    e.preventDefault();
    document.querySelector("[data-madd]")?.click();
    return;
  }
  if (e.target.id === "spopIn") {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      saveSub();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeSub();
    }
    return;
  }
  if (e.key === "Escape" && subAsk) {
    closeSub();
    return;
  }
  if (e.target.classList && e.target.classList.contains("inl")) {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      commitInline(e.target);
    } else if (e.key === "Escape") {
      e.preventDefault();
      commitInline(e.target, true);
    }
    return;
  }
  if (e.key === "Escape" && form && form.inline) {
    closeInlineForm();
    return;
  }
  if (e.key === "Escape") close();
  if (e.key === "Enter" && e.target.id === "f-serq") {
    e.preventDefault();
    document.querySelector("#fSerSug [data-fser]")?.click();
    return;
  }
  if (e.key === "Enter" && e.target.id === "f-sernew") {
    e.preventDefault();
    document.querySelector("[data-fsercreate]")?.click();
    return;
  }
  if (e.key === "Enter" && e.target.id === "seriesQ") {
    e.preventDefault();
    const b = document.querySelector("#serSug [data-seradd]");
    if (b) b.click();
  }
});

document.addEventListener("focusout", e => {
  if (e.target.classList && e.target.classList.contains("inl")) commitInline(e.target);
});
/* 日付の入力：20180825・2018/8/25・2018.8.25・2018年8月25日・8/25（今年）を打ち込むと 2018-08-25 に直す。
   8けたの数字は打ち終わった時点で、それ以外は入力欄を離れたときに変換。正しくない日付は元に戻す */
function normDate(v) {
  v = zen(String(v || ""))
    .trim()
    .replace(/\s+/g, "");
  if (!v) return "";
  let y, m, d, x;
  if ((x = /^(\d{4})(\d{2})(\d{2})$/.exec(v))) [, y, m, d] = x;
  else if ((x = /^(\d{4})(\d)(\d)$/.exec(v))) [, y, m, d] = x; // 201845 → 2018/4/5
  else if ((x = /^(\d{4})(\d{3})$/.exec(v))) {
    /* 2018415 → 4/15、2018105 → 10/5（ありえる方。どちらもありえるときは月1けたを優先） */
    y = x[1];
    const a = [x[2][0], x[2].slice(1)],
      b = [x[2].slice(0, 2), x[2][2]];
    const ok = ([mm, dd]) => +mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31;
    [m, d] = ok(a) && !(a[1][0] === "0" && ok(b)) ? a : b; // 日が0始まり（2018105）なら10/5と読む
  }
  else if ((x = /^(\d{4})[\/.\-年](\d{1,2})[\/.\-月](\d{1,2})日?$/.exec(v))) [, y, m, d] = x;
  else if ((x = /^(\d{1,2})[\/.\-月](\d{1,2})日?$/.exec(v))) {
    y = new Date().getFullYear();
    [, m, d] = x;
  } else return null;
  const dt = new Date(+y, +m - 1, +d);
  if (dt.getFullYear() !== +y || dt.getMonth() !== +m - 1 || dt.getDate() !== +d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
document.addEventListener("focusin", e => {
  if (e.target.classList && e.target.classList.contains("dtx")) e.target.dataset.prev = e.target.value;
});
document.addEventListener(
  "input",
  e => {
    const el = e.target;
    if (!el.classList || !el.classList.contains("dtx")) return;
    if (/^[0-9０-９]{8}$/.test(el.value.trim())) {
      const n = normDate(el.value);
      if (n) {
        el.value = n;
        el.dataset.prev = n;
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  },
  true,
);
document.addEventListener(
  "change",
  e => {
    const el = e.target;
    if (!el.classList || !el.classList.contains("dtx")) return;
    const n = normDate(el.value);
    if (n === null) {
      e.stopImmediatePropagation();
      toast("日付は 20180825 のように入力してください");
      el.value = el.dataset.prev || "";
      return;
    }
    if (n !== el.value) el.value = n;
    if (n === el.dataset.prev && e.isTrusted === false) return;
    el.dataset.prev = n;
  },
  true,
);
/* カレンダーのボタン：隠した日付入力のカレンダーを開き、選んだ日を入力欄へ */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-dtcal]");
  if (!b) return;
  const id = b.dataset.dtcal;
  const t = document.getElementById(id);
  const pk = b.parentElement.querySelector(`[data-dtfor="${id}"]`);
  if (!t || !pk) return;
  pk.value = normDate(t.value) || "";
  try {
    pk.showPicker();
  } catch (_) {
    pk.focus();
    pk.click();
  }
});
document.addEventListener("change", e => {
  const pk = e.target.closest && e.target.closest("[data-dtfor]");
  if (!pk) return;
  const t = document.getElementById(pk.dataset.dtfor);
  if (!t || !pk.value) return;
  t.value = pk.value;
  t.dataset.prev = "";
  t.dispatchEvent(new Event("input", { bubbles: true }));
  t.dispatchEvent(new Event("change", { bubbles: true }));
});
/* 配信URL：NetflixのURLは作品ページ（/title/番号）の形に直す
   browse・検索・ジャンル画面の ?jbv=番号（PCで作品を開いたとき）・title/番号?…（共有リンク）を変換。watch/番号は1話分なのでそのまま */
function normVurl(u) {
  u = String(u || "").trim();
  const m = /^(?:https?:\/\/)?(?:www\.)?netflix\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:title\/(\d+)|[^?#]*\?(?:.*&)?jbv=(\d+))/i.exec(u);
  if (m) return `https://www.netflix.com/title/${m[1] || m[2]}`;
  /* U-NEXT：作品はSID番号。作品ページ（/title/SID…）・再生画面（/play/SID…/ED…）・後ろに ?… が付いた共有リンクを作品ページの形に */
  const un = /^(?:https?:\/\/)?video\.unext\.jp\/.*?\b(SID\d+)/i.exec(u);
  if (un) return `https://video.unext.jp/title/${un[1].toUpperCase()}`;
  return u;
}
document.addEventListener("input", e => {
  if (e.target.id !== "f-vurl") return;
  const v = normVurl(e.target.value);
  if (v !== e.target.value.trim()) {
    e.target.value = v;
    toast("配信URLを作品ページの形に直しました");
  }
});

/* ================= 起動 ================= */
/* トップへ戻る: 画面1枚分以上スクロールしたら右下に出す */
(() => {
  const btn = $("#toTop");
  let raf = 0;
  const upd = () => {
    raf = 0;
    const show = lockY === null && scrollY > innerHeight * 0.9;
    btn.hidden = false;
    btn.classList.toggle("hide", !show);
    btn.tabIndex = show ? 0 : -1;
    btn.setAttribute("aria-hidden", String(!show));
  };
  addEventListener(
    "scroll",
    () => {
      if (!raf) raf = requestAnimationFrame(upd);
    },
    { passive: true },
  );
  btn.addEventListener("click", () => {
    scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
  btn.hidden = false;
  btn.classList.add("hide");
  btn.tabIndex = -1;
})();
render();
initStore();
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
