"""JSファイルの行の範囲を、別のファイルへそのまま移す（中身は書きかえない）。
使い方：python3 dev/tools/js-split.py 元のファイル 開始行 終了行 新しいファイル "新しいファイルの先頭の説明"
・移した行は元のファイルから消える。行の並びはそのまま
・新しいファイルが先頭の説明だけになる行の範囲（説明のコメント付きの区切り）を渡すこと（js-segments.py で確かめる）"""
import sys

src, a, b, dst, head = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5]
lines = open(src).read().split("\n")
part = lines[a - 1:b]
rest = lines[:a - 1] + lines[b:]
open(dst, "w").write(f"/* ===================== {head} ===================== */\n" + "\n".join(part).rstrip("\n") + "\n")
open(src, "w").write("\n".join(rest).rstrip("\n") + "\n")
print(f"{src} の {a}〜{b}行（{len(part)}行）を {dst} へ")
