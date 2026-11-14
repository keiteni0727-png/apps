"""公開する直前に、版の番号を自動で付ける（GitHub Actions から呼ぶ）。
・各アプリの index.html などで読み込んでいる自分の .js / .css に「?v=版」を付ける（すでにある ?v= は書きかえる）
・sw.js の const CACHE = "アプリ名-…" の「…」を版にする（古い控えを消して、新しいファイルを取り直させる）
使い方：python3 stamp.py 版 [フォルダ]"""
import pathlib
import re
import sys

V = sys.argv[1]
root = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else ".")
skip = {".git", ".github", "node_modules"}
ASSET = re.compile(r'((?:src|href)=["\'])([^"\']+?\.(?:js|css))(\?[^"\']*)?(["\'])')


def stamp_ref(m):
    url = m.group(2)
    if re.match(r"([a-z]+:)?//|data:", url):
        return m.group(0)  # 外のサイト（フォントやFirebaseなど）はそのまま
    q = re.sub(r"(^|&)v=[^&]*", "", (m.group(3) or "").lstrip("?")).strip("&")
    q = f"{q}&v={V}" if q else f"v={V}"
    return f"{m.group(1)}{url}?{q}{m.group(4)}"


changed = 0
for p in root.rglob("*"):
    if not p.is_file() or skip & set(p.relative_to(root).parts):
        continue
    if p.suffix == ".html":
        s = p.read_text(encoding="utf-8")
        n = ASSET.sub(stamp_ref, s)
    elif p.name == "sw.js":
        s = p.read_text(encoding="utf-8")
        n = re.sub(r'(const CACHE = ["\'][A-Za-z0-9_]+-)[^"\']*(["\'])', rf"\g<1>{V}\g<2>", s)
    else:
        continue
    if n != s:
        p.write_text(n, encoding="utf-8")
        changed += 1
        print("版を付けました:", p.relative_to(root))
print(f"版 {V}：{changed} ファイル")
