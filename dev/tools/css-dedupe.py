"""見た目のファイルの中で、まったく同じ指定（セレクタも中身も同じ）が2回以上あるとき、後ろの1つだけ残す。
同じ @media の中どうしだけを比べる。中身が空の指定・空の @media も消す。
使い方：python3 dev/tools/css-dedupe.py app.css"""
import re, sys

def blocks(css):
    """一番外側を [('rule', 前の文字, セレクタ, 中身) / ('at', 前の文字, 見出し, 中の文字)] に分ける"""
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0: out.append(("tail", css[i:])); break
        head = css[i:j]
        depth, k = 1, j + 1
        while depth:
            if css.startswith("/*", k): k = css.index("*/", k) + 2; continue
            if css[k] == "{": depth += 1
            elif css[k] == "}": depth -= 1
            k += 1
        body = css[j + 1:k - 1]
        # head の中のコメントは前の文字として残す
        m = re.match(r"^((?:\s|/\*.*?\*/)*)(.*)$", head, re.S)
        pre, sel = m.group(1), m.group(2)
        out.append(("at" if sel.strip().startswith("@") else "rule", pre, sel, body))
        i = k
    return out

def dedupe(css, stats):
    bl = blocks(css)
    seen = {}
    for idx, b in enumerate(bl):
        if b[0] == "rule":
            key = (re.sub(r"\s+", " ", b[2].strip()), re.sub(r"\s+", " ", b[3].strip()))
            seen.setdefault(key, []).append(idx)
    drop = set()
    for key, l in seen.items():
        if len(l) > 1: drop.update(l[:-1]); stats["dup"] += len(l) - 1
    out = ""
    for idx, b in enumerate(bl):
        if b[0] == "tail": out += b[1]; continue
        if b[0] == "rule":
            if idx in drop or not b[3].strip():
                if not b[3].strip(): stats["empty"] += 1
                out += b[1] if "/*" in b[1] else ""
                continue
            out += b[1] + b[2] + "{" + b[3] + "}"
        else:
            inner = dedupe(b[3], stats) if "{" in b[3] else b[3]
            if not re.sub(r"/\*.*?\*/", "", inner, flags=re.S).strip() and b[2].strip().startswith("@media"):
                stats["empty"] += 1; out += b[1] if "/*" in b[1] else ""; continue
            out += b[1] + b[2] + "{" + inner + "}"
    return out

if __name__ == "__main__":
    f = sys.argv[1]
    s = open(f).read()
    st = {"dup": 0, "empty": 0}
    new = dedupe(s, st)
    open(f, "w").write(new)
    print(f"同じ指定 {st['dup']}か所・空の指定 {st['empty']}か所を消しました（{len(s)} → {len(new)} 文字）")
