/* ===================== 各話リストの貼り付け：読み取りだけ（画面には触らない） =====================
   しょぼいカレンダーからコピーした文字を読む。読める形は2つ：
   ・サブタイトルの一覧：「#1 サブタイトル」（1話1行。#の後ろに空白やタブがあってもよい）
   ・放送時間の表：チャンネル｜開始日時（2017-10-06(金) 23:00）｜分｜回数（#1）｜サブタイトル…（次の行にフラグ・更新日）
   同じ話が何度も出てくるとき（局ごとの放送・再放送）は、サブタイトルは最初に読めたもの、放送日は一番早い日にする。
   放送日は表に書いてある日付のまま（25:20 のような深夜の時刻も前の日の日付。アプリの持ち方と同じ） */

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
/* 回数のマス（「#1」「＃12」） */
const SY_EP = /^[#＃]\s*([0-9０-９]+(?:\.[0-9]+)?)$/;
/* サブタイトルの一覧の行（「#1 サブタイトル」「#1<TAB>サブタイトル」） */
const SY_LINE = /^\s*[#＃]\s*([0-9０-９]+(?:\.[0-9]+)?)(?:[\s:：.．]+(.*))?$/;
/* 開始日時のマス（「2017-10-06(金) 23:00」） */
const SY_DATE = /(\d{4})-(\d{2})-(\d{2})\s*[(（][^)）]*[)）]/;
/* 読み取った各話：[{n: 話数, sub: サブタイトル, date: "2017-10-06"（放送時間の表のときだけ）}]（話数の順） */
function parseSubtitles(text) {
  const map = new Map();
  const put = (n, sub, date) => {
    if (!Number.isFinite(n)) return;
    const e = map.get(n) || { n, sub: "" };
    if (!e.sub && sub) e.sub = sub;
    if (date && (!e.date || date < e.date)) e.date = date;
    map.set(n, e);
  };
  String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .forEach(line => {
      const cells = line.split("\t").map(c => c.replace(/\s+/g, " ").trim());
      /* 放送時間の表の行：開始日時のマスと回数のマスがある。サブタイトルは回数の次のマス */
      const di = cells.findIndex(c => SY_DATE.test(c)),
        ni = cells.findIndex(c => SY_EP.test(c));
      if (di >= 0 && ni >= 0) {
        const d = cells[di].match(SY_DATE);
        return put(+zen(cells[ni].match(SY_EP)[1]), cells[ni + 1] || "", `${d[1]}-${d[2]}-${d[3]}`);
      }
      /* サブタイトルの一覧の行 */
      const m = SY_LINE.exec(line);
      if (m) put(+zen(m[1]), (m[2] || "").split("\t")[0].replace(/\s+/g, " ").trim(), "");
    });
  return [...map.values()].sort((a, b) => a.n - b.n);
}
