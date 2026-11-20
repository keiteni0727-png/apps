/* ===================== 各話リストの貼り付け：読み取りだけ（画面には触らない） =====================
   しょぼいカレンダーからコピーした文字を読む。読める形は2つ：
   ・サブタイトルの一覧：「#1 サブタイトル」（1話1行。#の後ろに空白やタブがあってもよい）
   ・放送時間の表：チャンネル｜開始日時（2017-10-06(金) 24:30）｜分｜回数（1）｜サブタイトル/コメント…（次の行にフラグ・更新日）
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
/* 回数のマス（「1」「#1」「＃12」。放送時間の表は数字だけのことが多い） */
const SY_EP = /^[#＃]?\s*([0-9０-９]+(?:\.[0-9]+)?)$/;
/* サブタイトルの一覧の行（「#1 サブタイトル」「#1<TAB>サブタイトル」） */
const SY_LINE = /^\s*[#＃]\s*([0-9０-９]+(?:\.[0-9]+)?)(?:[\s:：.．]+(.*))?$/;
/* 開始日時のマス（「2017-10-06(金) 24:30」） */
const SY_DATE = /(\d{4})-(\d{2})-(\d{2})\s*[(（][^)）]*[)）]\s*(\d{1,2}:\d{2})?/;
/* 読み取った各話：[{n: 話数, sub: サブタイトル, date: "2017-10-06"・time: "24:30"（放送時間の表のときだけ）}]（話数の順） */
function parseSubtitles(text) {
  const map = new Map();
  const put = (n, sub, date, time) => {
    if (!Number.isFinite(n)) return;
    const e = map.get(n) || { n, sub: "" };
    if (!e.sub && sub) e.sub = sub;
    if (date && (!e.date || date < e.date)) {
      e.date = date;
      if (time) e.time = time;
    }
    map.set(n, e);
  };
  /* 放送時間の表の列の位置：見出しの行（チャンネル｜開始日時｜分｜回数｜サブタイトル/コメント…）があればそこから。
     なければ 開始日時の2つ右が回数（間は「分」）、その右がサブタイトル */
  let col = null;
  String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .forEach(line => {
      const cells = line.split("\t").map(c => c.replace(/\s+/g, " ").trim());
      if (cells.includes("回数") && cells.includes("開始日時")) {
        col = { d: cells.indexOf("開始日時"), n: cells.indexOf("回数"), s: cells.findIndex(c => /^サブタイトル/.test(c)) };
        return;
      }
      /* 放送時間の表の行：開始日時のマスがある（次の行の「新！」「2017-09-15」などのフラグ・更新日は読まない） */
      const di = col && SY_DATE.test(cells[col.d] || "") ? col.d : cells.findIndex(c => SY_DATE.test(c));
      if (di >= 0) {
        const ni = col ? col.n : di + 2,
          si = col && col.s >= 0 ? col.s : ni + 1;
        const em = SY_EP.exec(cells[ni] || "");
        if (!em) return;
        const d = cells[di].match(SY_DATE);
        return put(+zen(em[1]), cells[si] || "", `${d[1]}-${d[2]}-${d[3]}`, d[4] || "");
      }
      /* サブタイトルの一覧の行 */
      const m = SY_LINE.exec(line);
      if (m) put(+zen(m[1]), (m[2] || "").split("\t")[0].replace(/\s+/g, " ").trim(), "");
    });
  return [...map.values()].sort((a, b) => a.n - b.n);
}
