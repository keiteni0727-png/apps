/* スマホのスワイプ（エンタメ管理・おかね手帳で共通）
   ・メニュー：開いているときは指に合わせて左へ引いて閉じる。左端から（またはページ送りの先頭で）右へ引くと開く
   ・ページ送り（任意）：画面を指にぴったり付けて横に動かし、離すと端まで流して隣の画面を反対側から入れる
   uSwipe({ sb, scrim, setDrawer(on), edge, blocked(), pager: { el, block, can(dir), go(dir) } }) */
(function () {
  window.uSwipe = function (o) {
    const mq = matchMedia("(max-width:899px)");
    const q = s => document.querySelector(s);
    const isOpen = () => document.body.classList.contains("drawer");
    const W = () => (q(o.sb) && q(o.sb).getBoundingClientRect().width) || 280;
    let g = null;

    /* メニューを指の位置に置く（x：0＝全開、-W＝閉） */
    function drag(x) {
      const s = q(o.sb),
        c = q(o.scrim),
        w = W();
      x = Math.max(-w, Math.min(0, x));
      s.style.transition = c.style.transition = "none";
      s.style.visibility = "visible";
      s.style.transform = `translateX(${x}px)`;
      c.style.opacity = String(1 + x / w);
    }
    /* 指を離したら、開く／閉じるの位置まで動かして、手で付けた位置を外す */
    function settle(open) {
      const s = q(o.sb),
        c = q(o.scrim);
      o.setDrawer(open);
      requestAnimationFrame(() => {
        s.style.transition = c.style.transition = "";
        s.style.transform = s.style.visibility = c.style.opacity = "";
      });
    }
    /* 画面を指にぴったり付けて動かす（薄くしない）。ms を渡すとその時間で滑らかに動かす */
    function page(x, ms) {
      const m = q(o.pager.el);
      if (!m) return;
      m.style.transition = ms ? `transform ${ms}ms cubic-bezier(.25,.9,.3,1)` : "none";
      m.style.transform = x ? `translate3d(${x}px,0,0)` : "translate3d(0,0,0)";
      m.style.willChange = "transform";
    }
    function pageClear() {
      const m = q(o.pager.el);
      if (m) m.style.transition = m.style.transform = m.style.willChange = "";
    }
    /* 離したら：今の画面をそのまま端まで流し、次の画面を反対側から続けて入れる */
    function flip(dir, from) {
      const w = innerWidth;
      const out = Math.max(90, Math.round(170 * (1 - Math.min(1, Math.abs(from || 0) / w))));
      page(dir > 0 ? -w : w, out);
      setTimeout(() => {
        o.pager.go(dir);
        page(dir > 0 ? w * 0.6 : -w * 0.6, 0);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            page(0, 260);
            setTimeout(pageClear, 280);
          }),
        );
      }, out);
    }

    document.addEventListener(
      "touchstart",
      e => {
        g = null;
        if (!mq.matches || e.touches.length !== 1) return;
        const t = e.touches[0],
          el = e.target;
        let mode = null;
        if (isOpen()) mode = "close";
        else if (o.blocked && o.blocked()) return;
        else if (t.clientX < (o.edge || 24)) mode = "open";
        else if (o.pager && !(el.closest && el.closest(o.pager.block))) mode = "page";
        if (mode) g = { mode, x: t.clientX, y: t.clientY, at: Date.now(), lock: false, dx: 0 };
      },
      { passive: true },
    );
    document.addEventListener(
      "touchmove",
      e => {
        if (!g) return;
        const t = e.touches[0],
          dx = t.clientX - g.x,
          dy = t.clientY - g.y;
        if (!g.lock) {
          if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            g.lock = true;
            g.x = t.clientX - Math.sign(dx) * 2; // 動き出しで跳ねないように
            if (g.mode === "page" && dx > 0 && !o.pager.can(-1)) g.mode = "open";
          } else if (Math.abs(dy) > 10) return (g = null);
          else return;
        }
        g.dx = t.clientX - g.x;
        if (g.mode === "close") drag(Math.min(0, g.dx));
        else if (g.mode === "open") drag(-W() + Math.max(0, g.dx));
        else page(o.pager.can(g.dx < 0 ? 1 : -1) ? g.dx : g.dx * 0.15, 0);
      },
      { passive: true },
    );
    function end(cancel) {
      if (!g) return;
      const { mode, dx, lock } = g,
        fast = Math.abs(dx) > 35 && Date.now() - g.at < 280,
        w = W();
      g = null;
      if (!lock) return;
      if (mode === "close") settle(cancel ? true : !(dx < -w * 0.3 || (fast && dx < 0)));
      else if (mode === "open") settle(cancel ? false : dx > w * 0.3 || (fast && dx > 0));
      else {
        const dir = dx < 0 ? 1 : -1;
        if (!cancel && (Math.abs(dx) > innerWidth * 0.25 || fast) && o.pager.can(dir)) flip(dir, dx);
        else {
          page(0, 220);
          setTimeout(pageClear, 240);
        }
      }
    }
    document.addEventListener("touchend", () => end(false), { passive: true });
    document.addEventListener("touchcancel", () => end(true), { passive: true });
  };
})();
