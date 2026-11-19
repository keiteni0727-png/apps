/* ===================== 各話リストの貼り付け：読み取りだけ（画面には触らない） =====================
   Wikipediaの各話リストなどを貼り付けた文字から「話数・サブタイトル・放送日」を読み取る。
   parseSubtitles … 「読み取る」で使う（いろいろな書き方の行を読む）
   gridFrom / gridParse … 「整形」の表（1話＝1行。話数・サブタイトル・放送日・その他） */

/* 話数の数字（算用数字・漢数字）と、「第◯」の後ろの単位にしない言葉（第1期・第1部などの区切り） */
const EP_NUM = String.raw`[0-9０-９]+(?:\.[0-9]+)?|[〇零一二三四五六七八九十百千]+`;
const EP_NOT = "(?!期|部|章|季|シーズン|クール|シリーズ)";
const KN = { 〇: 0, 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
function kanjiNum(t) {
  if (/^\d+$/.test(t)) return +t;
  let total = 0,
    cur = 0;
  for (const c of t) {
    if (c in KN) cur = cur * 10 + KN[c];
    else if (c === "十") {
      total += (cur || 1) * 10;
      cur = 0;
    } else if (c === "百") {
      total += (cur || 1) * 100;
      cur = 0;
    } else if (c === "千") {
      total += (cur || 1) * 1000;
      cur = 0;
    } else return NaN;
  }
  return total + cur;
}
const zen = s => s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
/* 話数のすぐ後ろの記号（「第5話☆」の☆・★・※ など）は読み飛ばす */
const EP_MARK = String.raw`[^\p{L}\p{N}%％\s「『"(（:：.．]*`;
const EP_RE = new RegExp(
  String.raw`^\s*(?:第\s*([0-9０-９〇零一二三四五六七八九十百千]+)\s*${EP_NOT}\p{L}|#\s*([0-9０-９]+)|([0-9０-９]+)\s*[話回]|([0-9０-９]+)(?=${EP_MARK}\t))${EP_MARK}\s*[\t:：.．\s]*(.*)$`,
  "u",
);
/* 注釈（[注1 2]・[1]・[a] など）を消し、全体を囲むカッコだけ外す（途中の『』は残す） */
const FOOT_RE = /\[(?:各回補足|注釈?|注|脚注|補足)?\s*[0-9０-９a-zA-Z]+(?:\s+[0-9０-９a-zA-Z]+)?\]/g;
function cleanSub(s) {
  return s
    .replace(FOOT_RE, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^「(.*)」$|^『(.*)』$|^"(.*)"$/, (m, a, b, c) => a ?? b ?? c);
}

/* ---------- 日付 ---------- */
/* 文の中の日付を全部拾う。「3.1%」のような数字は日付にしない（区切りが「.」「-」のときは年があるものだけ） */
const DATE_RE = /(?:(\d{4})\s*[年\/\-.]\s*)?(\d{1,2})\s*(月|\/|-|\.)\s*(\d{1,2})(?!\d|\s*[%％])/g;
function findDates(t) {
  const out = [];
  const s = zen(String(t || ""));
  DATE_RE.lastIndex = 0;
  let m;
  while ((m = DATE_RE.exec(s))) {
    const y = m[1] ? +m[1] : 0,
      mo = +m[2],
      d = +m[4];
    if (!y && m[3] !== "月" && m[3] !== "/") continue;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
    out.push({ y, mo, d });
  }
  return out;
}
const isoDay = (y, mo, d) => `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
/* 日付の並びに年を付ける。年がない日付は直前の年（月が戻ったら翌年）。最初の年は y0。
   list の中身：{y,mo,d}（日付）／null（日付なし）。yh＝その行より前に出てきた「2008年」だけの行 */
function withYears(list, y0) {
  let y = y0 || 0,
    pm = 0;
  return list.map(x => {
    if (!x) return null;
    if (x.y) y = x.y;
    else if (x.yh && x.yh > y) (y = x.yh), (pm = 0);
    else if (y && x.mo < pm) y++;
    pm = x.mo;
    return y ? { date: isoDay(y, x.mo, x.d) } : { md: [x.mo, x.d] };
  });
}
/* 1つの話に日付が2つ以上あるとき（初放送日・再放送日など）、何番目を放送日にするか。
   見出しに「放送日・配信日・公開日・日付」（「再」が付かない）があればその番目、なければ開始日に一番近い番目 */
function dateSlot(rowsDs, heads, from) {
  const max = Math.max(0, ...rowsDs.map(l => l.length));
  const names = [...Array(max).keys()].map(k => (heads.length === max && heads[k]) || `${k + 1}つ目の日付`);
  let k = heads.length === max ? heads.findIndex(h => /(放送|配信|公開)日|日付/.test(h) && !/再/.test(h)) : -1;
  const fy = +String(from || "").slice(0, 4);
  if (k < 0 && max > 1 && fy) {
    const ft = Date.parse(from);
    /* ほとんどの行にない番目（たまたま日付が2つある行だけの番目）は候補にしない */
    const n = rowsDs.filter(l => l.length).length;
    let best = Infinity;
    for (let j = 0; j < max; j++) {
      if (rowsDs.filter(l => l[j]).length < n / 2) continue;
      const first = withYears(rowsDs.map(l => l[j] || null), fy).find(x => x && x.date);
      const dd = first ? Math.abs(Date.parse(first.date) - ft) : Infinity;
      if (dd < best) (best = dd), (k = j);
    }
  }
  return { k: k < 0 ? 0 : k, names, max };
}
/* 見出しの中の日付の列名（「曜日」は除く） */
const dateHeads = cells =>
  cells
    .map(c => c.replace(/\s+/g, ""))
    .filter(c => /日/.test(c) && !/曜/.test(c))
    .map(c => c.replace(/(.*日).*/, "$1"));
const HEAD_RE = /話数|サブタイトル|タイトル|放送日/;

/* ---------- 「読み取る」：いろいろな書き方の各話リスト ---------- */
/* 「カルテ1」「魔の1」「1Fr」「Episode 1」など、数字の前後に言葉が付いた行。
   誤読を防ぐため、同じ言葉が2行以上あるときだけ話数として扱う */
const GEN_RE = /^(\s*)([^\d０-９\t]{0,12}?)\s*([0-9０-９]+)([^\d０-９\s「:：.．]{0,6})\s*(?:(\t)|[:：.．]\s*|\s+(?=\S)|(?=「))(.*)$/;
const LEAD_RE = /^\s*(?:\d{4}\s*年\s*)?\d{1,2}\s*月\s*\d{1,2}\s*日\s*\t/;
function genSplit(line) {
  const ld = zen(line).match(LEAD_RE);
  const head = ld ? line.slice(0, ld[0].length) : "";
  const body = line.slice(head.length);
  if (EP_RE.test(body)) return null;
  const g = GEN_RE.exec(body);
  if (!g) return null;
  const pre = g[2].trim().toLowerCase(),
    suf = g[4].toLowerCase();
  if (!pre && !suf) return null;
  if (/^[第#＃]$/.test(pre) && !suf) return null;
  if (/[年月日]$/.test(pre) || /^[年月日時分秒話回]/.test(suf)) return null;
  return { key: pre + "|" + suf, head, n: g[3], tab: !!g[5], rest: g[6] };
}
function normGeneric(lines) {
  const cnt = {};
  const hits = lines.map(l => {
    const h = genSplit(l);
    if (h) cnt[h.key] = (cnt[h.key] || 0) + 1;
    return h;
  });
  return lines.map((l, i) => {
    const h = hits[i];
    if (!h || cnt[h.key] < 2) return l;
    return h.head + h.n + (h.tab ? "\t" : "話 ") + h.rest;
  });
}
/* opt.from＝作品の開始日（日付が2つ以上ある表で、どれが放送日かを決めるのに使う） */
function parseSubtitles(text, opt = {}) {
  const lines = normGeneric(
    String(text || "")
      .replace(/\r/g, "")
      .replace(FOOT_RE, "")
      .split("\n"),
  );
  const out = [];
  let open = null,
    last = null; // open: 直前の行がサブタイトルで終わっていて、次の行に続きがある可能性
  let yearHead = null, // 「2002年」だけの行（以降の放送日の年）
    leadMode = false, // 「放送日 → 話数 → サブタイトル」の順の表
    prevLead = null;
  const head = []; // 最初の話より前の見出しの行
  for (const raw of lines) {
    let line = gLink(raw.replace(/ /g, " "));
    const yh = zen(line).match(/^\s*(\d{4})\s*年\s*$/);
    if (yh) {
      yearHead = +yh[1];
      open = null;
      continue;
    }
    // 先頭が放送日の行（例: 10月3日<TAB>1<TAB>サブタイトル）は日付を外して話数の行として読む
    let lead = null;
    const ld = zen(line).match(/^\s*(?:(\d{4})\s*年\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*\t/);
    if (ld && EP_RE.test(line.slice(ld[0].length))) {
      if (ld[1]) yearHead = +ld[1];
      lead = `${yearHead ? yearHead + "年" : ""}${ld[2]}月${ld[3]}日`;
      line = line.slice(ld[0].length);
      leadMode = true;
    }
    const m = EP_RE.exec(line);
    if (m) {
      // 2話連続放送などで日付の列が空の行は、直前の放送日を引き継ぐ
      if (!lead && leadMode && prevLead) lead = prevLead;
      if (lead) prevLead = lead;
      const n = kanjiNum(zen(m[1] || m[2] || m[3] || m[4]));
      if (!Number.isFinite(n)) {
        open = null;
        continue;
      }
      const rest = m[5] || "";
      const parts = rest.split("\t");
      let sub = parts[0],
        blk = parts.slice(1).join("\t");
      if (!line.includes("\t") && /「.+」/.test(rest)) {
        const q = rest.match(/「(.+?)」/);
        sub = q[1];
        blk = rest.slice(q.index + q[0].length);
      } // 「第1話「タイトル」」形式
      const e = { n, sub: cleanSub(sub), blk, lead, yh: yearHead };
      out.push(e);
      last = e;
      open = parts.length === 1 && line.includes("\t") ? e : null;
      continue;
    }
    if (!out.length) {
      if (line.includes("\t") && HEAD_RE.test(line)) head.push(line);
      else if (head.length) head[head.length - 1] += " " + line; // 見出しのマスの中の改行
      continue;
    }
    let rest2 = line;
    if (open) {
      const ps = line.split("\t");
      const first = ps[0].trim();
      if (first && !/^(\d{4}年|\d{1,2}月\d{1,2}日|第\d+シーズン|第[一二三四五六七八九十]+期)/.test(first)) {
        open.sub = cleanSub(open.sub + " " + first);
        rest2 = ps.slice(1).join("\t");
      }
      open = null;
    }
    if (/^\s*第\s*[0-9０-９一二三四五六七八九十]+\s*(シーズン|期|部|章)/.test(line)) {
      last = null;
      continue;
    }
    if (last) last.blk += " " + rest2;
  }
  /* 放送日：その話の行と続きの行にある日付から選ぶ（日付が2つ以上なら dateSlot で何番目かを決める） */
  const ds = out.map(e => findDates(e.lead || e.blk || "").map(x => ({ ...x, yh: e.yh })));
  const { k } = dateSlot(ds, dateHeads(head.join("\t").split("\t")), opt.from);
  const dated = withYears(
    ds.map(l => l[k] || l[0] || null),
    0,
  );
  out.forEach((e, i) => {
    delete e.lead;
    delete e.blk;
    delete e.yh;
    const x = dated[i];
    if (x && x.date) e.date = x.date;
    else if (x) e.md = x.md;
  });
  // 同じ話数が複数あれば最初のもの（第2シーズンで番号が戻る場合は別の範囲として貼る）
  const seen = new Set();
  return out.filter(e => e.sub && !seen.has(e.n) && seen.add(e.n));
}

/* ---------- 「整形」の表：1話＝1行（話数・サブタイトル・放送日・その他） ----------
   Wikiの表をコピーすると、1つのマスの中の改行でも行が分かれる。話数で始まらない行は直前の話の続きとしてつなぐ
   （続きの行の最初のマス＝直前の行の最後のマスの続き、残りは次のマス）。
   同じ人のマスが横・縦につながっていて列の数が行ごとに違うので、列の位置ではなく、行ごとにマスの中身を見て振り分ける */
/* 話数のマス：「第1話」「第一幕」「第1夜」「#01」「1」「MISSION:1」「PHASE-01」「Episode 1」「第5話☆」「第24話（最終回）」など。
   「第1期」「Season 1」「Part 2」のような区切りは話数にしない */
const G_EP = new RegExp(
  String.raw`^\s*(?:第\s*(${EP_NUM})\s*(?:${EP_NOT}\p{L})?|(?:#|＃|(?!season|part|vol|chapter|disc|cour)[A-Za-z]{1,10}\s*[:.：\-－_]?)?\s*(${EP_NUM})\s*[話回幕夜]?)[^\p{L}\p{N}%％]*$`,
  "iu",
);
function gNum(v) {
  const m = G_EP.exec(zen(String(v || "")).replace(/[（(][^)）]*[)）]/g, ""));
  if (!m) return null;
  const t = m[1] || m[2];
  const k = /^[\d.]+$/.test(t) ? +t : kanjiNum(t);
  return Number.isFinite(k) ? k : null;
}
/* [名前](URL) のリンクは名前だけにする */
const gLink = c => c.replace(/\[([^\]]*)\]\((?:[^()\s]|\([^()\s]*\))*\)/g, "$1");
/* 日付だけのマス（「2007年 10月6日」「10月6日(土)」など） */
const isDateCell = c => !!findDates(c).length && zen(c).replace(DATE_RE, "").replace(/\d{4}\s*年/g, "").replace(/[\s()（）日月火水木金土曜]/g, "").length <= 1;
/* 数字・記号だけのマス（視聴率「3.1%」・「-」など） */
const SP_RE = /^(特別|総集|番外|未放送|SP|OVA|OAD|Extra)/i;
const isNumCell = c => /^[\d０-９.．,%％\s\-－―‐]*$/.test(c);
function gridFrom(text, from) {
  const raw = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .filter(l => l.trim())
    .map(l => l.split("\t").map(c => cleanSub(gLink(c.replace(/ /g, " ")))));
  /* 1話の始まりの行：話数のマスの位置（前から3つ目まで。前に放送日・シリーズ名などがある表もある）。
     「特別編」「総集編」など数字でない話も、ほかのマスがあれば1話の始まりにする（話数が読めない行として赤く出る） */
  const epAt0 = r => {
    for (let i = 0; i < Math.min(3, r.length); i++) {
      if (gNum(r[i]) != null) return i === 0 || r.slice(0, i).every(c => c.length <= 20) ? i : -1;
      if (!r[i]) return -1;
    }
    return r.length > 1 && SP_RE.test(r[0]) ? 0 : -1;
  };
  /* 話数の位置は表の中でだいたい同じ。サブタイトルが「100」のように数字だけの行でも、多くの行の話数の位置にある数字を話数にする */
  const cnt = {};
  raw.forEach(r => {
    const i = epAt0(r);
    if (i >= 0) cnt[i] = (cnt[i] || 0) + 1;
  });
  const main = +(Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] ?? 0);
  const epAt = r => {
    const i = epAt0(r);
    return i >= 0 && i < main && r[main] && gNum(r[main]) != null ? main : i;
  };
  const isHead = r => epAt(r) >= 0;
  const anyHead = raw.some(isHead);
  const recs = [];
  let head = null,
    cur = null;
  /* 放送日のマスで終わっている話の次に、日付でない1マスだけの行（「無限列車編」などの区切り）が来たら、つながず外す */
  const sect = (c, r) => r.length === 1 && isDateCell(c[c.length - 1]) && !findDates(r[0]).length && !/^\d{4}\s*年$/.test(zen(r[0]));
  raw.forEach(r => {
    if (!anyHead || isHead(r)) recs.push((cur = [...r]));
    else if (!cur) {
      if (!recs.length && !head && r.length > 1 && HEAD_RE.test(r.join(""))) head = cur = [...r];
    } else if (sect(cur, r)) cur = null;
    else {
      cur[cur.length - 1] = `${cur[cur.length - 1]} ${r[0]}`.trim();
      cur.push(...r.slice(1));
    }
  });
  /* 外した行（最初の話より前の見出しなど） */
  const dropped = anyHead ? raw.findIndex(isHead) : 0;
  const rows = recs.map(r => {
    const ni = Math.max(0, epAt(r));
    /* cells＝話数以外のマス（並び順のまま）。def＝最初にサブタイトルにするマス（話数より後ろで、日付・数字でない最初のマス） */
    const pre = r.slice(0, ni).filter(Boolean),
      after = r.slice(ni + 1).filter(Boolean);
    /* 話数を含むマス（「01.PHASE-01」のような別の番号の列）もサブタイトルにしない */
    const nt = String(r[ni] || "").trim();
    const di = after.findIndex(c => !isDateCell(c) && !isNumCell(c) && gNum(c) == null && !(nt.length > 1 && c.includes(nt)));
    return { n: r[ni], cells: [...pre, ...after], def: di >= 0 ? pre.length + di : -1, pick: null, d: null, sub: "", ds: [], other: "", raw: r, ni };
  });
  const g = { rows, dropped, from };
  gSetSub(g, null);
  return Object.assign(
    g,
    dateSlot(
      rows.map(r => r.ds.map(c => findDates(c)[0])),
      head ? dateHeads(head) : [],
      from,
    ),
  );
}
/* 行のサブタイトル・放送日の候補・その他を決める。pick＝その行だけ選んだマス、なければ表全体の番目（si）、それもなければ def */
function gApply(g, r) {
  const k = r.pick ?? (g.si == null ? r.def : g.si);
  r.k = k >= 0 && k < r.cells.length ? k : -1;
  r.sub = r.k >= 0 ? r.cells[r.k] : "";
  r.ds = r.cells.filter((c, i) => i !== r.k && isDateCell(c));
  r.other = r.cells.filter((c, i) => i !== r.k && !isDateCell(c)).join(" / ");
}
/* 全部の行で、サブタイトルにするマスを話数以外のマスの何番目か（null＝自動）にする。手で直したサブタイトル・行ごとの選択は戻す */
function gSetSub(g, si) {
  g.si = si;
  g.rows.forEach(r => {
    r.pick = null;
    gApply(g, r);
  });
}
/* 表の放送日のマスに出す文字（手で直したものを優先） */
const gDay = (g, r) => (r.d != null ? r.d : r.ds[g.k] || "");
/* ---------- 整形の表（Excelの形）：元のマスを列のまま並べ、列ごとに役割（話数・サブタイトル・放送日・使わない）を選ぶ ----------
   r.raw＝その話の元のマス（マスの中の改行はつないだあと）、r.off＝その行を右へずらしたマスの数（列＝元の位置＋off）。
   最初は話数のマスが同じ列にそろうようにずらし、役割は自動で読み取ったものを入れる。g.cols があれば gridParse はこの役割で読む */
const G_ROLE = { n: "話数", sub: "サブタイトル", date: "放送日", x: "使わない" };
const gLetter = j => (j >= 26 ? gLetter(Math.floor(j / 26) - 1) : "") + String.fromCharCode(65 + (j % 26));
const gCell = (r, j) => (j - r.off >= 0 && r.raw[j - r.off] != null ? r.raw[j - r.off] : "");
const gColN = g => Math.max(1, ...g.rows.map(r => r.off + r.raw.length));
function gColsInit(g) {
  if (g.cols) return gColsFit(g);
  const M = Math.max(0, ...g.rows.map(r => r.ni));
  g.rows.forEach(r => {
    r.raw = [...r.raw];
    r.off = M - r.ni;
  });
  const n = gColN(g);
  const cols = Array(n).fill("x");
  cols[M] = "n";
  /* サブタイトル：話数より後ろで、日付・数字でない最初のマスが一番多い列 */
  const sc = Array(n).fill(0);
  g.rows.forEach(r => {
    const nt = String(gCell(r, M)).trim();
    for (let j = M + 1; j < n; j++) {
      const c = gCell(r, j);
      if (c && !isDateCell(c) && !isNumCell(c) && gNum(c) == null && !(nt.length > 1 && c.includes(nt))) {
        sc[j]++;
        break;
      }
    }
  });
  const sj = sc.indexOf(Math.max(...sc));
  if (sc[sj] > 0) cols[sj] = "sub";
  /* 放送日：日付のマスが3割以上ある列。いくつかあれば、最初の日付が開始日に一番近い列（開始日がなければ左） */
  const fy = +String(g.from || "").slice(0, 4);
  const ft = Date.parse(g.from || "");
  let dj = -1,
    best = Infinity;
  for (let j = 0; j < n; j++) {
    if (cols[j] !== "x") continue;
    const ds = g.rows.map(r => (isDateCell(gCell(r, j)) ? findDates(gCell(r, j))[0] : null));
    if (ds.filter(Boolean).length < Math.max(1, g.rows.length * 0.3)) continue;
    const first = fy ? withYears(ds, fy).find(x => x && x.date) : null;
    const dd = first && ft ? Math.abs(Date.parse(first.date) - ft) : dj < 0 ? 1e15 : Infinity;
    if (dd < best) (best = dd), (dj = j);
  }
  if (dj >= 0) cols[dj] = "date";
  /* 縦につながったマス（脚本など）がない行は、サブタイトル・放送日が左にずれるので、空のマスを入れてそろえる */
  g.rows.forEach(r => {
    const at = (from, ok) => {
      for (let j = from; j < gColN({ rows: [r] }); j++) if (ok(gCell(r, j))) return j;
      return -1;
    };
    const nt = String(gCell(r, M)).trim();
    const isSub = c => c && !isDateCell(c) && !isNumCell(c) && gNum(c) == null && !(nt.length > 1 && c.includes(nt));
    if (sc[sj] > 0) {
      const j = at(M + 1, isSub);
      if (j >= 0 && j < sj) for (let k = j; k < sj; k++) gIns(r, j);
    }
    if (dj > M) {
      const j = at(Math.max(M, sc[sj] > 0 ? sj : M) + 1, isDateCell);
      if (j >= 0 && j < dj) for (let k = j; k < dj; k++) gIns(r, j);
    }
  });
  g.cols = cols;
  return gColsFit(g);
}
/* j列の位置に空のマスを入れる（j列から右が1つ右へ） */
function gIns(r, j) {
  const i = j - r.off;
  if (i <= 0) r.off++;
  else r.raw.splice(i, 0, "");
}
/* 行をずらして列が増えたら「使わない」の列を足す */
function gColsFit(g) {
  const n = gColN(g);
  while (g.cols.length < n) g.cols.push("x");
  return g;
}
/* 列の役割を決める。話数・サブタイトルは1列だけ（ほかの列は「使わない」に）、放送日は何列でも（左の列を優先） */
function gSetCol(g, j, role) {
  if (role === "n" || role === "sub") g.cols = g.cols.map(c => (c === role ? "x" : c));
  g.cols[j] = role;
}
/* その行の j列から右を1つずらす（Excelの「セルの挿入・削除」）。右＝j列に空のマスを入れる、
   左＝j列の左の空のマスを詰める（中身のあるマスは消さない。詰められないときは false） */
function gShift(g, r, d, j = 0) {
  if (d > 0) gIns(r, j);
  else {
    const i = j - r.off;
    if (i <= 0) {
      if (r.off > 0) r.off--;
      else if (r.raw[0] === "" && r.raw.length > 1) r.raw.shift();
      else return false;
    } else if (r.raw[i - 1] === "") r.raw.splice(i - 1, 1);
    else return false;
  }
  gColsFit(g);
  return true;
}
/* マスを直す（元のマスの外なら空のマスを足してから） */
function gSet(r, j, v) {
  let i = j - r.off;
  if (i < 0) {
    r.raw = [...Array(-i).fill(""), ...r.raw];
    r.off = j;
    i = 0;
  }
  while (r.raw.length <= i) r.raw.push("");
  r.raw[i] = v;
}
/* 行の話数・サブタイトル・放送日（放送日の列が複数なら、中身のある一番左） */
function gVals(g, r) {
  const v = { n: "", sub: "", day: "" };
  g.cols.forEach((c, j) => {
    const t = gCell(r, j);
    if (c === "n") v.n = t;
    else if (c === "sub") v.sub = t;
    else if (c === "date" && !v.day && t.trim()) v.day = t;
  });
  return v;
}
const gBad = (g, r) => gNum(gVals(g, r).n) == null;
/* 表から各話を読み取る（話数が読めない行は飛ばす・同じ話数は最初の行）。
   放送日がない行は上の行と同じ日（2話連続放送でマスが縦につながっているとき）。年がない日付は開始日の年から数える */
function gridParse(g, from) {
  const fy = +String(from || "").slice(0, 4) || new Date().getFullYear();
  const list = g.rows.map(r => {
    if (g.cols) {
      const v = gVals(g, r);
      return { r: v, x: v.day ? findDates(v.day)[0] || null : null, inherit: !v.day };
    }
    const t = gDay(g, r);
    return { r, x: t ? findDates(t)[0] || null : null, inherit: !t && r.d == null && !r.ds.length };
  });
  const dated = withYears(
    list.map(o => o.x),
    fy,
  );
  const seen = new Set(),
    out = [];
  let last = "";
  list.forEach((o, i) => {
    const num = gNum(o.r.n);
    const d = dated[i] && dated[i].date ? dated[i].date : o.inherit ? last : "";
    if (d) last = d;
    if (num == null || seen.has(num)) return;
    seen.add(num);
    out.push({ n: num, sub: cleanSub(o.r.sub || ""), ...(d ? { date: d } : {}) });
  });
  return out;
}
/* ---------- Wikipediaから各話リストを取る（ブラウザだけ。APIは無料・登録なし） ----------
   wpSearch … 作品名でページを探す（候補の一覧）
   wpTables … ページの各話リストの表を、表をコピーしたときと同じ文字（タブ区切り）にして返す
   wpBest   … 表が複数あるとき、作品の開始日に一番近い表 */
const WP_API = "https://ja.wikipedia.org/w/api.php";
async function wpGet(q) {
  const r = await fetch(`${WP_API}?${new URLSearchParams({ ...q, format: "json", formatversion: "2", origin: "*" })}`);
  if (!r.ok) throw new Error(`Wikipedia ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(j.error.info || "Wikipedia");
  return j;
}
/* 作品名から「（第2期）」「2期」「Season 2」などを外して探す */
const wpQuery = t =>
  String(t || "")
    .replace(/[（(][^)）]*[)）]/g, " ")
    .replace(/\s*(第[0-9０-９一二三四五六七八九十]+期|[0-9０-９]+期|season\s*\d+|第[0-9０-９一二三四五六七八九十]+シーズン)\s*$/i, "")
    .trim();
async function wpSearch(title, q) {
  const base = wpQuery(title);
  const j = await wpGet({ action: "query", list: "search", srsearch: q || `${base} アニメ`, srlimit: "8", srnamespace: "0" });
  const l = (j.query && j.query.search) || [];
  /* 各話リストはアニメ版のページ（「〇〇 (アニメ)」）や「〇〇の各話一覧」にあることが多いので、そちらを先に */
  const sc = t => (t.startsWith(base) ? 4 : 0) + (/[（(]アニメ[)）]|各話|エピソード/.test(t) ? 3 : 0) + (t === base ? 2 : 0) + (/アニメ/.test(t) ? 1 : 0);
  return q ? l.map(x => x.title) : l.map(x => x.title).sort((a, b) => sc(b) - sc(a));
}
/* 表の文字：マスはタブ、行は改行、マスの中の改行（<br>）は改行（ブラウザで表をコピーしたときと同じ） */
function wpTableText(t) {
  return [...t.rows]
    .map(tr =>
      [...tr.cells]
        .map(c => {
          const x = c.cloneNode(true);
          x.querySelectorAll("br").forEach(b => b.replaceWith("\n"));
          x.querySelectorAll("sup.reference, .mw-editsection, style, .sortkey, [style*='display:none']").forEach(e => e.remove());
          return x.textContent
            .replace(/[ \t ]+/g, " ")
            .split("\n")
            .map(v => v.trim())
            .filter(Boolean)
            .join("\n");
        })
        .join("\t"),
    )
    .join("\n");
}
const WP_SEC = /各話|話リスト|話一覧|エピソード|放送日程|放送リスト|サブタイトル/;
async function wpTables(page) {
  const sj = await wpGet({ action: "parse", page, prop: "sections", redirects: "1" });
  const title = sj.parse.title;
  const secs = sj.parse.sections || [];
  /* 各話リストの見出し（下の階層は親に含まれるので、親が当たったら子は取らない） */
  const hit = [];
  secs.forEach(s => {
    if (!/^\d+$/.test(String(s.index)) || !WP_SEC.test(s.line.replace(/<[^>]+>/g, ""))) return;
    if (hit.some(h => String(s.number).startsWith(h.number + "."))) return;
    hit.push(s);
  });
  const htmls = hit.length
    ? await Promise.all(hit.map(s => wpGet({ action: "parse", page: title, prop: "text", section: String(s.index) }).then(j => [s.line.replace(/<[^>]+>/g, ""), j.parse.text])))
    : [["", (await wpGet({ action: "parse", page: title, prop: "text" })).parse.text]];
  const tables = [];
  htmls.forEach(([sec, html]) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    let head = sec;
    doc.querySelectorAll("h2, h3, h4, h5, table").forEach(el => {
      if (el.tagName !== "TABLE") return void (head = el.textContent.replace(/\[編集\]/g, "").trim() || head);
      if (el.closest("table") !== el || el.rows.length < 3) return;
      const top = [...el.rows].slice(0, 3).map(r => r.textContent).join(" ");
      if (!/サブタイトル|タイトル/.test(top) || /^\s*表示/.test(el.textContent)) return;
      const cap = el.caption ? el.caption.textContent.trim() : "";
      const text = wpTableText(el);
      /* 表の名前：見出し（同じ見出しの表が並ぶこともあるので、話数の範囲も付ける） */
      const ns = gridParse(gridFrom(text), "").map(x => x.n);
      tables.push({ name: `${cap || head || `表${tables.length + 1}`}${ns.length ? `（${ns[0]}〜${ns[ns.length - 1]}話）` : ""}`, text });
    });
  });
  return { title, tables };
}
/* 作品名から各話リストのあるページを探す（候補を上から順に、表が見つかるまで3つまで）。page＝前に選んだページ */
async function wpFind(title, page) {
  if (page) return { ...(await wpTables(page)), cands: null };
  const cands = await wpSearch(title);
  /* 検索に出てこないこともあるので「〇〇 (アニメ)」のページも先に試す（ないページはとばす） */
  const tries = [...new Set([`${wpQuery(title)} (アニメ)`, ...cands.slice(0, 3)])];
  for (const c of tries) {
    const w = await wpTables(c).catch(() => null);
    if (w && w.tables.length) return { ...w, cands: cands.includes(w.title) ? cands : [w.title, ...cands] };
  }
  return { title: cands[0] || "", tables: [], cands };
}
/* 開始日に一番近い放送日がある表（サブタイトルを読めた表の中で） */
function wpBest(tables, from) {
  const ft = Date.parse(from || "");
  let best = 0,
    bv = Infinity;
  tables.forEach((t, i) => {
    const p = gridParse(gridFrom(t.text, from), from).filter(x => x.sub);
    if (!p.length) return;
    /* 表の中で開始日に一番近い放送日（第2期が同じ表に続いている場合もあるので、最初の話だけでなく全部の話で見る） */
    const ds = p.filter(x => x.date).map(x => Math.abs(Date.parse(x.date) - ft));
    const v = ds.length && ft ? Math.min(...ds) : 1e15 - p.length;
    if (v < bv) (bv = v), (best = i);
  });
  return best;
}
/* 第2期などが前の期と同じ表に続き番号で載っているとき（例：第2期の1話が表では25話）、
   作品の開始日に一番近い話（10日以内）から first 話として数え直す。数え直さないときは shift 0 */
function wpShift(parsed, first, from) {
  const ft = Date.parse(from || "");
  if (!ft) return { list: parsed, shift: 0 };
  let k = -1,
    bv = Infinity;
  parsed.forEach((x, i) => {
    const d = x.date ? Math.abs(Date.parse(x.date) - ft) : Infinity;
    if (d < bv) (bv = d), (k = i);
  });
  if (k < 0 || bv > 10 * 864e5 || parsed[k].n <= first) return { list: parsed, shift: 0 };
  const sh = parsed[k].n - first;
  return { list: parsed.slice(k).map(x => ({ ...x, n: x.n - sh })), shift: sh, from: parsed[k].n };
}
/* Node で読み込んだとき（読み取りの確認用） */
if (typeof module !== "undefined") module.exports = { wpShift, gSetSub, gColsInit, gSetCol, gShift, gSet, gVals, gCell, EP_NUM, EP_NOT, kanjiNum, zen, parseSubtitles, gridFrom, gridParse, gDay, gNum, findDates };
