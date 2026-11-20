"""catalog.js で集めた部品の画像を、1枚の一覧にする（高さの順に並べ、下に「高さ・角丸・文字の大きさ」を書く）。
使い方：python3 dev/tools/catalog-sheet.py 集めたフォルダ 出力する画像 [見出し]"""
import sys, json, glob
from PIL import Image, ImageDraw, ImageFont

src, out = sys.argv[1], sys.argv[2]
title = sys.argv[3] if len(sys.argv) > 3 else ""
items = sorted(json.load(open(f"{src}/index.json")), key=lambda x: (x["h"], float(x["fs"][:-2])))
JP = (glob.glob("/usr/share/fonts/**/wqy-zenhei.ttc", recursive=True) + glob.glob("/usr/share/fonts/**/*CJK*", recursive=True))[0]
font = ImageFont.truetype(JP, 20)
big = ImageFont.truetype(JP, 34)
W, PAD, CELL_W = 1600, 24, 250
cols = (W - PAD) // (CELL_W + PAD)
cells = []
for it in items:
    im = Image.open(it["f"]).convert("RGB")
    if im.width > CELL_W:
        im = im.resize((CELL_W, int(im.height * CELL_W / im.width)))
    rad = it["rad"].replace("px", "")
    cells.append((im, f'高さ{it["h"]} 角{rad} 字{it["fs"].replace("px","")}'))
rows = [cells[i:i + cols] for i in range(0, len(cells), cols)]
H = (70 if title else 0) + sum(max(c[0].height for c in r) + 50 for r in rows) + PAD
S = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(S)
y = PAD
if title:
    d.text((PAD, y), title, fill="black", font=big)
    y += 60
for r in rows:
    rh = max(c[0].height for c in r)
    for k, (im, lab) in enumerate(r):
        x = PAD + k * (CELL_W + PAD)
        S.paste(im, (x, y))
        d.text((x, y + rh + 6), lab, fill="#555", font=font)
    y += rh + 50
S.save(out, quality=88)
print(out, S.size, len(items))
