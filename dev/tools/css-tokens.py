"""見た目のファイルの文字の大きさ・角の丸みを、見た目の決まり（shared/u-base.css の --fs-* / --r-*）に置き換える。
使い方：python3 dev/tools/css-tokens.py entame/app.css
・文字：9〜11→xs / 11.5〜12→s / 12.5〜13→m / 13.5〜14.5→base / 15〜17→l / 18〜22→xl / 23〜32→2xl / 33以上→3xl
  （0・inherit・em・%・calc はそのまま）
・角丸：1〜7→s / 8〜11→m / 12〜20→l（0・999px・50%・var(...) はそのまま。「18px 18px 0 0」のような書き方も1つずつ置き換える）"""
import re, sys

def fs_token(px):
    if px < 9: return None
    for lim, t in [(11, "xs"), (12, "s"), (13, "m"), (14.5, "base"), (17, "l"), (22, "xl"), (32, "2xl")]:
        if px <= lim: return f"var(--fs-{t})"
    return "var(--fs-3xl)"

def r_token(px):
    if px <= 0 or px >= 100: return None
    if px <= 7: return "var(--r-s)"
    if px <= 11: return "var(--r-m)"
    if px <= 20: return "var(--r-l)"
    return None

def run(css):
    n = {"fs": 0, "r": 0}
    def fs(m):
        v = float(m.group(2))
        t = fs_token(v)
        if not t: return m.group(0)
        n["fs"] += 1
        return m.group(1) + t + m.group(3)
    css = re.sub(r"(font-size:\s*)(\d+(?:\.\d+)?)px(\s*(?:!important)?\s*[;}])", fs, css)
    def rad(m):
        parts = m.group(2).split()
        out = []
        for p in parts:
            mm = re.fullmatch(r"(\d+(?:\.\d+)?)px", p)
            t = r_token(float(mm.group(1))) if mm else None
            if t: n["r"] += 1
            out.append(t or p)
        return m.group(1) + " ".join(out) + m.group(3)
    css = re.sub(r"(border-radius:\s*)([^;}!]+?)(\s*(?:!important)?\s*[;}])", rad, css)
    return css, n

if __name__ == "__main__":
    f = sys.argv[1]
    s = open(f).read()
    new, n = run(s)
    open(f, "w").write(new)
    print(f"{f}: 文字 {n['fs']}か所・角丸 {n['r']}か所を置き換え")
