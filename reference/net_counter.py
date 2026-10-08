# 参照用：展開図の数を数えた検証済みプログラム（2026-10-08）
# 使い方: python3 net_counter.py 1   # 正四面体・立方体・直方体・正八面体
#         python3 net_counter.py 2   # 角柱・角錐
# 出力: (全域木の数, 重なる展開の数, 合同を除いた展開図の数)
# 凍結値は net-counts.json。アプリの Node 版（tools/build-catalog.mjs）はこの結果と一致させる。
# 多面体の展開図を、切り開き方（面の隣接グラフの全域木）の総当たりで数える
import itertools, math, sys, json
import numpy as np

def make_poly(V, F):
    V = [np.array(v, float) for v in V]
    c = np.mean(V, axis=0)
    F2 = []
    for f in F:
        n = np.cross(V[f[1]] - V[f[0]], V[f[2]] - V[f[0]])
        if np.dot(n, np.mean([V[i] for i in f], axis=0) - c) < 0: f = f[::-1]
        F2.append(list(f))
    return V, F2

def prism(n, side=1.0, h=1.6, base=None):
    if base is None:
        R = side / (2 * math.sin(math.pi / n))
        base = [(R * math.cos(2 * math.pi * k / n), R * math.sin(2 * math.pi * k / n)) for k in range(n)]
    n = len(base)
    V = [(x, y, 0) for x, y in base] + [(x, y, h) for x, y in base]
    F = [list(range(n)), list(range(n, 2 * n))] + [[k, (k + 1) % n, n + (k + 1) % n, n + k] for k in range(n)]
    return make_poly(V, F)

def pyramid(n, side=1.0, h=1.2, base=None):
    if base is None:
        R = side / (2 * math.sin(math.pi / n))
        base = [(R * math.cos(2 * math.pi * k / n), R * math.sin(2 * math.pi * k / n)) for k in range(n)]
    n = len(base)
    V = [(x, y, 0) for x, y in base] + [(0, 0, h)]
    F = [list(range(n))] + [[k, (k + 1) % n, n] for k in range(n)]
    return make_poly(V, F)

def box(a, b, c):
    return prism(4, base=[(0, 0), (a, 0), (a, b), (0, b)], h=c)

def tetra():
    V = [(1, 1, 1), (1, -1, -1), (-1, 1, -1), (-1, -1, 1)]
    return make_poly(V, [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]])

def octa():
    V = [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]
    F = [[a, b, c] for a in (0, 1) for b in (2, 3) for c in (4, 5)]
    return make_poly(V, F)

def face_edges(F):
    E = {}
    for fi, f in enumerate(F):
        for k in range(len(f)):
            e = tuple(sorted((f[k], f[(k + 1) % len(f)])))
            E.setdefault(e, []).append(fi)
    return {e: fs for e, fs in E.items() if len(fs) == 2}

def face2d(V, f):
    o = V[f[0]]; u = V[f[1]] - o; u /= np.linalg.norm(u)
    n = np.cross(V[f[1]] - o, V[f[2]] - o); n /= np.linalg.norm(n); w = np.cross(n, u)
    return {i: np.array([np.dot(V[i] - o, u), np.dot(V[i] - o, w)]) for i in f}

def unfold(V, F, tree):
    adj = {i: [] for i in range(len(F))}
    for (a, b), (fi, fj) in tree:
        adj[fi].append((fj, (a, b))); adj[fj].append((fi, (a, b)))
    loc = [face2d(V, f) for f in F]
    placed = {0: {i: loc[0][i] for i in F[0]}}
    stack = [0]
    while stack:
        u = stack.pop()
        for v, (a, b) in adj[u]:
            if v in placed: continue
            pa, pb = placed[u][a], placed[u][b]
            la, lb = loc[v][a], loc[v][b]
            ang = math.atan2(*(pb - pa)[::-1]) - math.atan2(*(lb - la)[::-1])
            R = np.array([[math.cos(ang), -math.sin(ang)], [math.sin(ang), math.cos(ang)]])
            placed[v] = {i: pa + R @ (loc[v][i] - la) for i in F[v]}
            stack.append(v)
    return [[placed[fi][i] for i in F[fi]] for fi in range(len(F))]

def sat_overlap(A, B):
    for P in (A, B):
        for k in range(len(P)):
            e = P[(k + 1) % len(P)] - P[k]; nrm = np.array([-e[1], e[0]])
            pa = [np.dot(p, nrm) for p in A]; pb = [np.dot(p, nrm) for p in B]
            if max(pa) <= min(pb) + 1e-7 or max(pb) <= min(pa) + 1e-7: return False
    return True

def canon(polys):
    best = None
    for P in polys:
        for k in range(len(P)):
          for a, b in ((P[k], P[(k + 1) % len(P)]), (P[(k + 1) % len(P)], P[k])):
            d = b - a; ang = -math.atan2(d[1], d[0])
            R = np.array([[math.cos(ang), -math.sin(ang)], [math.sin(ang), math.cos(ang)]])
            for flip in (1, -1):
                key = []
                for Q in polys:
                    pts = sorted((round(float(x), 3) + 0.0, round(float(y) * flip, 3) + 0.0) for x, y in ((R @ (q - a)) for q in Q))
                    key.append(tuple(pts))
                key = tuple(sorted(key))
                if best is None or key < best: best = key
    return best

def count_nets(V, F, limit=None):
    E = face_edges(F)
    edges = list(E.items())
    nF = len(F)
    seen = set(); trees = 0; overl = 0
    for sub in itertools.combinations(range(len(edges)), nF - 1):
        par = list(range(nF))
        def fd(x):
            while par[x] != x: par[x] = par[par[x]]; x = par[x]
            return x
        ok = True
        for k in sub:
            fi, fj = edges[k][1]; ri, rj = fd(fi), fd(fj)
            if ri == rj: ok = False; break
            par[ri] = rj
        if not ok: continue
        trees += 1
        polys = unfold(V, F, [edges[k] for k in sub])
        if any(sat_overlap(polys[i], polys[j]) for i in range(nF) for j in range(i + 1, nF)): overl += 1; continue
        seen.add(canon(polys))
    return trees, overl, len(seen)

SOLIDS = {
  'tetra(正四面体)': tetra(),
  'cube(立方体)': box(1, 1, 1),
  'box a≠b≠c(直方体)': box(1, 1.5, 2.2),
  'box a=b≠c(正方形の面が2つ)': box(1, 1, 1.7),
  'octa(正八面体)': octa(),
}
SOLIDS2 = {
  '正三角柱 h≠辺': prism(3, h=1.6),
  '正三角柱 h=辺': prism(3, h=1.0),
  '直角三角形の三角柱(3:4:5)': prism(3, base=[(0, 0), (1.2, 0), (0, 0.9)], h=1.6),
  '二等辺三角形の三角柱': prism(3, base=[(0, 0), (1.2, 0), (0.6, 1.3)], h=1.6),
  '正五角柱': prism(5, h=1.6),
  '正六角柱': prism(6, h=1.6),
  '正三角錐(底面正三角形・側面二等辺)': pyramid(3, h=1.3),
  '正四角錐': pyramid(4, h=1.2),
  '正五角錐': pyramid(5, h=1.2),
  '正六角錐': pyramid(6, h=1.2),
}
which = sys.argv[1] if len(sys.argv) > 1 else '1'
for name, (V, F) in (SOLIDS if which == '1' else SOLIDS2).items():
    print(name, 'faces', len(F), count_nets(V, F), flush=True)
