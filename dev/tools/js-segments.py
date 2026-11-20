"""JSファイルを「一番外側の宣言ごと」（直前の説明コメントも含める）の区切りに分ける。
使い方：python3 dev/tools/js-segments.py file.js  → 区切りの一覧（開始行・終了行・名前）"""
import re, sys

START = re.compile(r"^(?:async\s+)?(?:function\s+([\w$]+)|(?:const|let|var)\s+([\w$]+)|([\w$.]+)\s*(?:=|\())")

def segments(lines):
    segs, cur, pend, in_c = [], None, [], False
    for i, l in enumerate(lines):
        if in_c:
            pend.append(i)
            if "*/" in l: in_c = False
            continue
        if l.startswith("/*") and cur is not None and not l.rstrip().endswith("*/"):
            pend.append(i); in_c = True; continue
        if l.startswith("/*") or (l.strip() == "" and pend):
            pend.append(i); continue
        m = START.match(l) if l[:1].strip() else None
        if m:
            name = m.group(1) or m.group(2) or m.group(3)
            s = pend[0] if pend else i
            if cur: cur["end"] = s - 1
            cur = {"name": name, "start": s, "end": len(lines) - 1}
            segs.append(cur); pend = []
        else:
            pend = []
    return segs

if __name__ == "__main__":
    lines = open(sys.argv[1]).read().split("\n")
    for s in segments(lines):
        print(s["start"] + 1, s["end"] + 1, s["name"])
