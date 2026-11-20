"""同じセレクタの指定が同じ場所（一番外側どうし・同じ @media の中どうし）に2つ以上あり、
あとの指定が同じ項目を書きかえているとき、先の指定からその項目を消す（効いていない書き残しの掃除）。
!important は「先が !important であとがそうでない」ときは消さない。中身が空になった指定は消す。
使い方：python3 dev/tools/css-overridden.py app.css"""
import re, sys, importlib.util, os

spec = importlib.util.spec_from_file_location("dd", os.path.join(os.path.dirname(__file__), "css-dedupe.py"))
dd = importlib.util.module_from_spec(spec); spec.loader.exec_module(dd)

def decls(body):
    out, buf, d = [], "", 0
    for ch in body:
        if ch == "(": d += 1
        if ch == ")": d -= 1
        if ch == ";" and d == 0: out.append(buf); buf = ""
        else: buf += ch
    if buf.strip(): out.append(buf)
    return [x for x in out if x.strip()]

def prop(d):
    return d.split(":", 1)[0].strip().lower() if ":" in d else None

def clean(css, st):
    bl = dd.blocks(css)
    # セレクタごとに、あとから出てくる項目を集める
    later = {}
    info = []
    for idx, b in enumerate(bl):
        if b[0] != "rule": info.append(None); continue
        key = re.sub(r"\s+", " ", b[2].strip())
        ds = decls(b[3])
        info.append((key, ds))
    for idx in range(len(bl) - 1, -1, -1):
        if info[idx] is None: continue
        key, ds = info[idx]
        seen = later.setdefault(key, {})
        keep = []
        for d in ds:
            p = prop(d)
            imp = "!important" in d
            if p and p in seen and (not imp or seen[p]):
                st["n"] += 1
                continue
            keep.append(d)
        for d in keep:
            p = prop(d)
            if p: seen[p] = seen.get(p, False) or ("!important" in d)
        info[idx] = (key, keep)
    out = ""
    for idx, b in enumerate(bl):
        if b[0] == "tail": out += b[1]; continue
        if b[0] == "rule":
            key, ds = info[idx]
            if not ds:
                st["empty"] += 1
                out += b[1] if "/*" in b[1] else ""
                continue
            body = ";".join(d.strip() for d in ds)
            out += b[1] + b[2] + "{" + body + "}"
        else:
            inner = clean(b[3], st) if "{" in b[3] else b[3]
            out += b[1] + b[2] + "{" + inner + "}"
    return out

if __name__ == "__main__":
    f = sys.argv[1]
    s = open(f).read()
    st = {"n": 0, "empty": 0}
    new = clean(s, st)
    open(f, "w").write(new)
    print(f"効いていない項目 {st['n']}か所・空になった指定 {st['empty']}か所を消しました（{len(s)} → {len(new)} 文字）")
