"""CSSから、指定したクラスを使う指定だけを取り除く（ほかの指定と並べて書いた所は、そのクラスの部分だけ外す）。
使い方：python3 dev/tools/css-prune.py app.css クラス名 クラス名 ...
コメントと @media などの入れ子はそのまま残し、中身が空になった @media は消す。"""
import re, sys

def tokens(css):
    # コメント・{・}・その他 に分ける
    out, i = [], 0
    while i < len(css):
        if css.startswith('/*', i):
            j = css.index('*/', i) + 2; out.append(('c', css[i:j])); i = j
        elif css[i] in '{}':
            out.append((css[i], css[i])); i += 1
        else:
            j = i
            while j < len(css) and css[j] not in '{}' and not css.startswith('/*', j): j += 1
            out.append(('t', css[i:j])); i = j
    return out

def prune(css, classes):
    pat = re.compile(r'\.(' + '|'.join(map(re.escape, classes)) + r')(?![\w-])')
    toks = tokens(css)
    # 木にする
    def parse(k):
        nodes = []
        pre = ''
        while k < len(toks):
            t, v = toks[k]
            if t == '}': return nodes, k + 1, pre
            if t == '{':
                head = pre; pre = ''
                if head.strip().startswith('@'):
                    kids, k, tail = parse(k + 1); nodes.append(('at', head, kids, tail))
                else:
                    depth, j, body = 1, k + 1, ''
                    while depth:
                        tt, vv = toks[j]
                        if tt == '{': depth += 1
                        if tt == '}': depth -= 1
                        if depth: body += vv
                        j += 1
                    nodes.append(('rule', head, body)); k = j
                continue
            if t == 'c': nodes.append(('raw', pre + v)); pre = ''
            else: pre += v
            k += 1
        return nodes, k, pre
    tree, _, tail = parse(0)
    removed = 0
    def emit(nodes):
        nonlocal removed
        out = ''
        for n in nodes:
            if n[0] == 'raw': out += n[1]
            elif n[0] == 'rule':
                head, body = n[1], n[2]
                lead = head[:len(head) - len(head.lstrip())]
                sels = [x for x in head.strip().split(',')]
                # 括弧の中のカンマ（:is(...) など）で切らないように組み直す
                merged, buf, d = [], '', 0
                for p in sels:
                    buf = buf + (',' if buf else '') + p if d else p
                    d = buf.count('(') - buf.count(')')
                    if d == 0: merged.append(buf); buf = ''
                keep = [x for x in merged if not pat.search(x)]
                if not keep: removed += 1; continue
                out += lead + ','.join(keep).strip() + '{' + body + '}'
            else:
                inner = emit(n[2])
                if inner.strip() == '' or re.fullmatch(r'\s*(/\*.*?\*/\s*)*', inner, re.S) and not inner.strip().startswith('/*'):
                    continue
                out += n[1] + '{' + inner + n[3] + '}'
        return out
    return emit(tree) + tail, removed

if __name__ == '__main__':
    f, cls = sys.argv[1], sys.argv[2:]
    css = open(f).read()
    new, n = prune(css, cls)
    open(f, 'w').write(new)
    print(f'{n} rules removed, {len(css)} -> {len(new)} bytes')
