/* ===================== 引っ越し：claude.ai版から書き出し → iPhone単独版（Firebase）で取り込み =====================
  設定パネルのいちばん下（#okMove）に出す
    claude.ai版 …「引っ越し用に書き出す」（全データをコピー。使えればファイルにも保存）
    単独版     …「データを取り込む」「ログアウト」 */
(() => {
  const esc = U.esc;
  /* コレクションを1回だけ読む */
  const once = (db, path) =>
    new Promise((res, rej) => {
      let off = null,
        done = false;
      off = db.collection(path).onSnapshot(s => {
        if (done) return;
        done = true;
        const o = {};
        s.docs.forEach(d => (o[d.id] = d.data()));
        res(o);
        setTimeout(() => {
          try {
            off && off();
          } catch (e) {}
        }, 0);
      }, rej);
    });
  const count = d => [Object.keys(d.kb || {}).filter(k => k.startsWith("m-")).length, Object.keys(d.accounts || {}).length, Object.keys(d.months || {}).length];
  const what = d => {
    const [a, b, c] = count(d);
    return `家計簿${a}か月分・口座${b}件・支払${c}か月分`;
  };
  function copyText(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {}
    ta.remove();
    return ok;
  }
  let cache = null; // 書き出す中身（コピーは押した直後にしかできないので、先に読んでおく）
  async function readAll(s) {
    const [accounts, months, config, kb] = await Promise.all([
      once(s.db, "accounts"),
      once(s.db, "months"),
      once(s.db, "config"),
      s.uid ? once(s.db, "data/users/" + s.uid) : {},
    ]);
    const data = { accounts, months, config, kb };
    return { text: JSON.stringify({ app: "okane", v: 1, at: Date.now(), data }), data };
  }
  async function moveOut(s) {
    if (!cache) {
      U.toast("データを準備中です。数秒してからもう一度押してください", { ms: 4000 });
      cache = readAll(s);
      return;
    }
    let got;
    try {
      got = await Promise.race([cache, new Promise((_, r) => setTimeout(r, 50))]);
    } catch (e) {
      U.toast("データを準備中です。数秒してからもう一度押してください", { ms: 4000 });
      return;
    }
    let copied = copyText(got.text);
    if (!copied) {
      try {
        await navigator.clipboard.writeText(got.text);
        copied = true;
      } catch (e) {}
    }
    let saved = false;
    try {
      const dl = window.claude?.use ? await claude.use("downloads") : null;
      if (dl) {
        await dl.save({ filename: "okane-hikkoshi.json", data: got.text });
        saved = true;
      }
    } catch (e) {}
    cache = readAll(s); // 次に押したときは最新の内容で
    if (copied || saved)
      U.toast(`${what(got.data)}を${[copied ? "コピー" : "", saved ? "ファイルに保存" : ""].filter(Boolean).join("・")}しました`, { ms: 6000 });
    else U.toast("書き出せませんでした。もう一度押してみてください", { ms: 6000 });
  }
  const nestedArr = (v, inArr) =>
    Array.isArray(v)
      ? inArr || v.some(x => nestedArr(x, true))
      : !!v && typeof v === "object" && Object.values(v).some(x => nestedArr(x, false));
  async function run(s, text, say) {
    let j = null;
    try {
      j = JSON.parse(text);
    } catch (e) {}
    if (!j || j.app !== "okane" || !j.data || typeof j.data !== "object") {
      say("データを読み取れませんでした。書き出したものをそのまま貼り付けてください（途中で切れていないか確かめてください）。", true);
      return false;
    }
    const jobs = [],
      skip = [];
    const dest = { accounts: "accounts", months: "months", config: "config", kb: "data/users/" + s.uid };
    Object.entries(dest).forEach(([k, base]) =>
      Object.entries(j.data[k] || {}).forEach(([id, d]) => {
        if (!id || id.includes("/") || !d || typeof d !== "object" || Array.isArray(d) || nestedArr(d, false)) skip.push(`${k}/${id}`);
        else jobs.push([`${base}/${id}`, d]);
      }),
    );
    let n = 0;
    try {
      for (let i = 0; i < jobs.length; i += 100) {
        say(`取り込み中… ${n} / ${jobs.length}件（このまま待ってください）`);
        await s.db.setMany(jobs.slice(i, i + 100));
        n = Math.min(jobs.length, i + 100);
      }
    } catch (e) {
      say(`途中で止まりました（${n} / ${jobs.length}件まで完了）。電波のよい場所でもう一度「取り込む」を押してください。${e?.message || ""}`, true);
      return false;
    }
    say(`取り込みが終わりました：${what(j.data)}${skip.length ? `（取り込めなかったもの ${skip.length}件：${skip.slice(0, 5).join("、")}）` : ""}`);
    return true;
  }
  function moveIn(s) {
    document.getElementById("moveBox")?.remove();
    const host = document.createElement("div");
    host.id = "moveBox";
    host.className = "u-login";
    host.innerHTML = `<form><h3>データを取り込む</h3>
      <p>claude.ai版の「引っ越し用に書き出す」でコピーしたデータを下に貼り付けるか、保存したファイルを選んで「取り込む」を押してください。同じ月・同じ口座は書き出したときの内容で上書きされます。</p>
      <textarea placeholder="ここを長押しして「ペースト」" style="width:100%;height:90px;font:inherit;font-size:12px;padding:8px;border:1px solid var(--u-line);border-radius:var(--u-r);background:var(--u-bg);color:var(--u-ink);box-sizing:border-box"></textarea>
      <input type="file" accept=".json,application/json,text/plain" style="font-size:13px">
      <p data-msg role="status" style="min-height:1.5em"></p>
      <button type="submit">取り込む</button>
      <button type="button" data-x style="background:none;border:1px solid var(--u-line);color:var(--u-ink)">閉じる</button></form>`;
    document.body.appendChild(host);
    const ta = host.querySelector("textarea"),
      fi = host.querySelector("input"),
      msg = host.querySelector("[data-msg]"),
      go = host.querySelector("[type=submit]");
    const say = (t, bad) => {
      msg.textContent = t;
      msg.className = bad ? "u-login-err" : "";
    };
    host.querySelector("[data-x]").onclick = () => host.remove();
    host.querySelector("form").onsubmit = async ev => {
      ev.preventDefault();
      go.disabled = true;
      let text = ta.value.trim();
      try {
        if (fi.files[0]) text = (await fi.files[0].text()).trim();
      } catch (e) {}
      if (!text) say("データを貼り付けるか、ファイルを選んでください。", true);
      else if (await run(s, text, say)) ta.value = "";
      go.disabled = false;
    };
  }
  U.store().then(s => {
    const box = document.getElementById("okMove");
    if (!box || !s.db) return;
    if (s.kind === "fb") {
      box.innerHTML = `<div class="dcard"><b>データ</b><div class="mu">claude.ai版で書き出したデータを、このアプリに取り込めます。</div>
        <div class="row mt8"><button type="button" class="pri" data-movein>データを取り込む</button><button type="button" data-logout>ログアウト</button></div></div>`;
      box.querySelector("[data-movein]").onclick = () => moveIn(s);
      box.querySelector("[data-logout]").onclick = () => s.logout();
    } else if (s.kind === "db") {
      box.innerHTML = `<div class="dcard"><b>引っ越し</b><div class="mu">iPhone単独版への引っ越し用に、いまのデータをまるごと書き出します（このアプリのデータは変わりません）。</div>
        <div class="row mt8"><button type="button" class="pri" data-moveout>引っ越し用に書き出す</button></div></div>`;
      box.querySelector("[data-moveout]").onclick = () => moveOut(s);
      cache = readAll(s);
    }
  });
})();
