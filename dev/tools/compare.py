"""2つのフォルダのスクリーンショットを見比べて、違う画面だけ一覧にする。
使い方：python3 dev/tools/compare.py 前のフォルダ 後のフォルダ [違いの絵を置くフォルダ]"""
import sys, os, glob
from PIL import Image, ImageChops
a, b = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else None
if out: os.makedirs(out, exist_ok=True)
same = 0
for fa in sorted(glob.glob(f'{a}/*.png')):
    n = os.path.basename(fa); fb = f'{b}/{n}'
    if not os.path.exists(fb): print('なし ', n); continue
    ia, ib = Image.open(fa).convert('RGB'), Image.open(fb).convert('RGB')
    if ia.size != ib.size: print('大きさ', n, ia.size, '->', ib.size); continue
    d = ImageChops.difference(ia, ib); box = d.getbbox()
    if not box: same += 1; continue
    px = d.convert('L').point(lambda v: 255 if v > 24 else 0).histogram()[255]
    print(f'違い  {n}  {px}px  範囲{box}')
    if out:
        w = ia.width; c = Image.new('RGB', (w * 2 + 10, ia.height), 'red'); c.paste(ia, (0, 0)); c.paste(ib, (w + 10, 0)); c.save(f'{out}/{n}')
print(f'同じ {same}枚')
