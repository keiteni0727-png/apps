"""部品を見た目の決まり（.u-btn / .u-chip / .u-seg など）に置きかえたあと、古いクラスの「見た目」の指定だけを外す。
並べ方（flex・margin・位置など）は残す。
使い方：python3 dev/tools/css-strip.py app.css クラス名 クラス名 ...
・そのクラスが付いた部品そのものへの指定（セレクタの最後がそのクラス）から、枠・背景・色・文字・余白・高さ・角丸・影などを外す
・中身（.fb svg など）への指定はそのまま
・ほかの部品と並べて書いた指定は、そのクラスの分だけ別の指定に分ける
・中身が空になった指定は消す"""
import re, sys

LOOK = re.compile(r"^(border(-[a-z]+)*|background(-[a-z]+)*|color|font(-[a-z]+)*|padding(-[a-z]+)*|height|min-height|max-height|line-height|"
                  r"box-shadow|text-decoration|letter-spacing|cursor|outline(-[a-z]+)*|-webkit-tap-highlight-color|white-space|"
                  r"align-items|justify-content|gap|place-items|text-align|box-sizing|opacity|transition)$")

def strip_decls(body, keep_width):
    out = []
    for d in split_decls(body):
        if ":" not in d: continue
        k, v = d.split(":", 1)
        k = k.strip()
        if LOOK.match(k): continue
        if k == "display" and "none" not in v: continue
        if k in ("width", "min-width") and not keep_width and re.fullmatch(r"\s*\d+(\.\d+)?px\s*(!important)?\s*", v): continue
        out.append(d.strip())
    return ";".join(out)

def split_decls(body):
    parts, buf, depth = [], "", 0
    for ch in body:
        if ch == "(": depth += 1
        if ch == ")": depth -= 1
        if ch == ";" and depth == 0: parts.append(buf); buf = ""
        else: buf += ch
    if buf.strip(): parts.append(buf)
    return parts

def split_sel(head):
    out, buf, d = [], "", 0
    for ch in head:
        if ch == "(": d += 1
        if ch == ")": d -= 1
        if ch == "," and d == 0: out.append(buf); buf = ""
        else: buf += ch
    out.append(buf)
    return out

def run(css, classes, keep_width=False):
    pat = re.compile(r"\.(" + "|".join(map(re.escape, classes)) + r")(?![\w-])")
    n = 0
    def rule(m):
        nonlocal n
        head, body = m.group(1), m.group(2)
        if head.strip().startswith("@") or "{" in body: return m.group(0)
        lead = head[:len(head) - len(head.lstrip())]
        sels = split_sel(head.strip())
        def last(s):
            s = re.sub(r":[\w-]+(\([^)]*\))?", "", s.strip())  # :hover や :not(...) を外して見る
            return re.split(r"[\s>+~]+", s)[-1]
        hit = [s for s in sels if pat.search(last(s))]
        if not hit: return m.group(0)
        n += 1
        rest = [s for s in sels if s not in hit]
        nb = strip_decls(body, keep_width)
        out = ""
        if rest: out += lead + ",".join(x.strip() for x in rest) + "{" + body + "}"
        if nb: out += (lead if not rest else "\n") + ",".join(x.strip() for x in hit) + "{" + nb + "}"
        return out if out else ""
    new = re.sub(r"([^{}]+)\{([^{}]*)\}", rule, css)
    new = re.sub(r"\n\s*\n(?=\S)", "\n", new) if False else new
    return new, n

if __name__ == "__main__":
    args = sys.argv[1:]
    kw = "--keep-width" in args
    args = [a for a in args if a != "--keep-width"]
    f, cls = args[0], args[1:]
    s = open(f).read()
    new, n = run(s, cls, kw)
    # 空になった行を詰める
    new = "\n".join(l for l in new.split("\n") if l.strip() or True)
    open(f, "w").write(new)
    print(f"{n}か所の指定から見た目を外しました")
