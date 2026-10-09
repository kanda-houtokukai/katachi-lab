// chizu（N3）：地図の上の道のりと きょり。区間の長さ（m）を持つ道のグラフ（_nagasa-gen.js の NODES・EDGES）。
// 道は 区間の長さに合うように 曲げて描く（まっすぐの長さ＝きょり より長い）。
// opts.mode：miru（みる）｜route（さわる：道を えらんで 道のりを たす）｜km（さわる：1km は 100m の 10こぶん）
//            ｜quiz（ためす：道のりと きょり）｜walk（つくる：1km さんぽ）
// 記録：miru・map・km・route（＋route-done）・make。ずかん walk（1km の道。数は data/hakaru/routes.json に凍結）
import { el, C, txt, rect, line, circle, path, clear, clamp, lerp, tween, wait, E, dragOn, tapOf, hanamaru } from './_flat.js';
import { badge } from './_nagasa.js';
import { makeQuiz } from './_quiz2d.js';
import { NODES, EDGES, START, nodeOf, edgeOf, otherEnd, neighbors, straight, edgesOfPath, pathLen, routeKey, keyNodes, walks, kmm, choices, rnd, pickR, shuffleR } from './_nagasa-gen.js';
import { unitSpeech } from '../core/yomi.js';
import { bench } from '../core/bench.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';

const sp = s => unitSpeech(String(s).replace(/<[^>]+>/g, '')).replace(/ /g, '');
// 2次ベジェの長さ（m）
function qlen(a, c, b, n = 24) { let L = 0, px = a[0], py = a[1]; for (let i = 1; i <= n; i++) { const t = i / n, x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]; L += Math.hypot(x - px, y - py); px = x; py = y; } return L; }
// 区間ごとの曲げ（m）。道は まっすぐ（きょり）より長いことが分かるように、ゆるく曲げる。
// 曲げる向きは 地図の まんなかから 外へ（道が交わりにくい）。曲げの量は 二分探索で決める
const CEN = [NODES.reduce((s, n) => s + n.x, 0) / NODES.length, NODES.reduce((s, n) => s + n.y, 0) / NODES.length];
const BEND = EDGES.map(e => {
  const A = nodeOf(e.a), B = nodeOf(e.b), a = [A.x, A.y], b = [B.x, B.y], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
  const sg = (mx - CEN[0]) * nx + (my - CEN[1]) * ny >= 0 ? 1 : -1, want = d + (e.len - d) * 0.4;
  let lo = 0, hi = d;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (qlen(a, [mx + nx * m * sg, my + ny * m * sg], b) < want) lo = m; else hi = m; }
  return [mx + nx * lo * sg, my + ny * lo * sg];
});

function icon(g, kind, x, y, s) {
  const G = el('g', { transform: `translate(${x},${y}) scale(${s / 40})` }, g), I = C('ink');
  const body = {
    house: () => { path(G, 'M-16,0L0,-14L16,0Z', { fill: C('face-1'), stroke: I, 'stroke-width': 2 }); rect(G, -12, 0, 24, 14, { fill: C('house'), stroke: I, 'stroke-width': 2 }); rect(G, -4, 4, 8, 10, { fill: C('wood') }); },
    shop: () => { rect(G, -15, -6, 30, 20, { fill: C('paper'), stroke: I, 'stroke-width': 2 }); path(G, 'M-17,-6L-13,-14H13L17,-6Z', { fill: C('face-6'), stroke: I, 'stroke-width': 2 }); rect(G, -10, 0, 9, 14, { fill: C('glass'), stroke: I, 'stroke-width': 1 }); },
    park: () => { rect(G, -2, 0, 4, 14, { fill: C('wood-deep') }); circle(G, 0, -6, 12, { fill: C('leaf'), stroke: I, 'stroke-width': 2 }); },
    book: () => { rect(G, -16, -12, 32, 26, { fill: C('face-5'), stroke: I, 'stroke-width': 2 }); line(G, 0, -12, 0, 14, { stroke: I, 'stroke-width': 2 }); },
    school: () => { rect(G, -17, -8, 34, 22, { fill: C('house'), stroke: I, 'stroke-width': 2 }); rect(G, -5, -16, 10, 10, { fill: C('house'), stroke: I, 'stroke-width': 2 }); circle(G, 0, -11, 3, { fill: C('paper'), stroke: I }); for (let k = -12; k <= 8; k += 10) rect(G, k, -3, 6, 6, { fill: C('glass'), stroke: I, 'stroke-width': 1 }); },
    station: () => { rect(G, -17, -10, 34, 22, { fill: C('face-4'), stroke: I, 'stroke-width': 2 }); rect(G, -13, -6, 26, 8, { fill: C('glass') }); circle(G, -9, 12, 3, { fill: I }); circle(G, 9, 12, 3, { fill: I }); },
    shrine: () => { rect(G, -16, -12, 32, 5, { fill: C('ok'), stroke: I, 'stroke-width': 1.5 }); rect(G, -12, -5, 24, 3, { fill: C('ok') }); rect(G, -11, -7, 4, 21, { fill: C('ok') }); rect(G, 7, -7, 4, 21, { fill: C('ok') }); },
    post: () => { rect(G, -15, -10, 30, 22, { fill: C('paper'), stroke: I, 'stroke-width': 2 }); path(G, 'M-15,-10L0,2L15,-10', { fill: 'none', stroke: C('ok'), 'stroke-width': 2 }); },
    pool: () => { rect(G, -17, -10, 34, 22, { rx: 4, fill: C('water'), stroke: I, 'stroke-width': 2 }); path(G, 'M-12,0q3,-4 6,0t6,0t6,0t6,0', { fill: 'none', stroke: C('paper'), 'stroke-width': 2 }); },
  }[kind]; body && body();
  return G;
}

export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const mode = opts.mode || 'route';
  const F = ctx.openFlat();
  const api = { dispose() {}, test: {} };
  // 地図の場所（m → px）
  let M = {};
  function fit(box) {
    // 縦長の画面では 地図を 90°まわして 縦長に する
    const rot = box.h > box.w * 1.2, ys0 = NODES.map(n => n.y), yMax = Math.max(...ys0);
    const T = (x, y) => (rot ? [yMax - y, x] : [x, y]);
    const pts = NODES.map(n => T(n.x, n.y)), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), pad = 34;
    const x0 = Math.min(...xs) - 20, x1 = Math.max(...xs) + 20, y0 = Math.min(...ys) - 20, y1 = Math.max(...ys) + 26;
    const k = Math.min((box.w - pad * 2) / (x1 - x0), (box.h - pad * 2) / (y1 - y0));
    const ox = box.x + (box.w - (x1 - x0) * k) / 2 - x0 * k, oy = box.y + (box.h - (y1 - y0) * k) / 2 - y0 * k;
    M = { k, rot, P: n => { const [x, y] = T(n.x, n.y); return [ox + x * k, oy + y * k]; }, Q: ([x0b, y0b]) => { const [x, y] = T(x0b, y0b); return [ox + x * k, oy + y * k]; }, box };
  }
  const mapBox = () => { const top = F.top + F.cap + 6, bot = F.bottom - 12; return { x: 8, y: top, w: F.W - 16, h: bot - top }; };
  const st = { path: [START], hi: null, showDist: false, flashEdges: [] };
  function drawMap(g, o = {}) {
    rect(g, M.box.x, M.box.y, M.box.w, M.box.h, { rx: 16, fill: C('home-bg'), stroke: C('line'), 'stroke-width': 1.5 });
    const used = new Set(edgesOfPath(st.path) || []);
    EDGES.forEach((e, i) => {
      const [ax, ay] = M.P(nodeOf(e.a)), [bx, by] = M.P(nodeOf(e.b)), [cx, cy] = M.Q(BEND[i]);
      const d = `M${ax},${ay}Q${cx},${cy} ${bx},${by}`;
      path(g, d, { fill: 'none', stroke: C('paper'), 'stroke-width': 14, 'stroke-linecap': 'round' });
      path(g, d, { fill: 'none', stroke: used.has(i) ? C('ok') : (o.hiEdges || []).includes(i) ? C('sora') : C('line'), 'stroke-width': used.has(i) || (o.hiEdges || []).includes(i) ? 8 : 6, 'stroke-linecap': 'round', opacity: used.has(i) ? 0.85 : 1 });
      const mx = 0.25 * ax + 0.5 * cx + 0.25 * bx, my = 0.25 * ay + 0.5 * cy + 0.25 * by;
      if (o.labels !== false) { rect(g, mx - 22, my - 10, 44, 18, { rx: 9, fill: C('paper'), stroke: C('line'), 'stroke-width': 1 }); txt(g, mx, my + 4, `${e.len}m`, { 'font-size': 12, fill: C('ink-soft'), class: 'ui' }); }
    });
    NODES.forEach(n => {
      const [x, y] = M.P(n), on2 = st.path.includes(n.id), last = st.path[st.path.length - 1] === n.id;
      const can = o.tappable && neighbors(st.path[st.path.length - 1]).includes(n.id);
      circle(g, x, y, 22, { fill: last ? C('done-icon') : can ? C('pick-bg') : C('paper'), stroke: last ? C('ok') : can ? C('mat') : C('ink-soft'), 'stroke-width': last ? 3.5 : can ? 3 : 1.5, 'stroke-dasharray': can && !on2 ? '4 3' : null });
      icon(g, n.icon, x, y, 30);
      txt(g, x, y + 36, n.name, { 'font-size': 13, fill: C('ink'), class: 'ui' });
    });
  }
  function drawDist(g, a, b, k = 1) {
    const [ax, ay] = M.P(nodeOf(a)), [bx, by] = M.P(nodeOf(b));
    line(g, ax, ay, lerp(ax, bx, k), lerp(ay, by, k), { stroke: C('sora'), 'stroke-width': 4, 'stroke-dasharray': '8 6' });
    if (k >= 1) { const mx = (ax + bx) / 2, my = (ay + by) / 2; rect(g, mx - 56, my - 30, 112, 22, { rx: 11, fill: C('sora') }); txt(g, mx, my - 14, `きょり やく${straight(a, b)}m`, { 'font-size': 13, fill: C('paper'), class: 'ui' }); }
  }
  const nodeAt = p => NODES.find(n => { const [x, y] = M.P(n); return Math.hypot(p.x - x, p.y - y) < 28; });
  const cur = () => st.path[st.path.length - 1];
  const sumNow = () => pathLen(st.path) || 0;

  /* ---------------- みる ---------------- */
  if (mode === 'miru') {
    panel.innerHTML = `<div class="row"><button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again} もういちど みる</button></div>`;
    let phase = 'play', sceneFn = null;
    const draw = () => { F.clearLayers(); fit(mapBox()); sceneFn && sceneFn(); };
    on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); run(); });
    async function run() {
      const tag = S.token, ok = () => alive(tag), say = (h, s) => ctx.caption(h, 0, s || sp(h));
      phase = 'play'; st.path = [START];
      const goal = 'S', route = ['H', 'P', 'S'], es = edgesOfPath(route);
      let k = 0, dk = 0;
      sceneFn = () => {
        const g = F.layer('map'), fx = F.layer('fx'); drawMap(g);
        // 道のりを のばす：区間ごとに 赤い線が のびる
        es.forEach((ei, j) => { const t = clamp(k - j, 0, 1); if (t <= 0) return; const e = EDGES[ei], A = M.P(nodeOf(route[j])), B = M.P(nodeOf(route[j + 1])), Cc = M.Q(BEND[ei]); const pts = []; for (let s = 0; s <= 30 * t; s++) { const u = s / 30; pts.push([(1 - u) * (1 - u) * A[0] + 2 * (1 - u) * u * Cc[0] + u * u * B[0], (1 - u) * (1 - u) * A[1] + 2 * (1 - u) * u * Cc[1] + u * u * B[1]]); } el('polyline', { points: pts.map(p => p.join(',')).join(' '), fill: 'none', stroke: C('ok'), 'stroke-width': 8, 'stroke-linecap': 'round' }, fx); });
        if (dk > 0) drawDist(fx, 'H', goal, dk);
      };
      draw();
      say('いえから がっこうまで、どれくらい？', '家から学校まで、どれくらい？'); if (!(await wait(2)) || !ok()) return;
      say('みちに そって あるくと…', '道にそって歩くと');
      await tween(2.4, t => { k = t * 2; draw(); }); if (!ok()) return;
      const L = pathLen(route);
      say(`${EDGES[es[0]].len}m ＋ ${EDGES[es[1]].len}m ＝ <b>${L}m</b>。これが <b>みちのり</b>`, `${EDGES[es[0]].len}メートルたす${EDGES[es[1]].len}メートルで${L}メートル。これが道のり`); if (!(await wait(3)) || !ok()) return;
      say('まっすぐに はかると…', 'まっすぐにはかると');
      await tween(1.4, t => { dk = t; draw(); }); if (!ok()) return;
      say(`まっすぐの ながさは やく${straight('H', goal)}m。これが <b>きょり</b>`, `まっすぐの長さは約${straight('H', goal)}メートル。これが距離`); if (!(await wait(3)) || !ok()) return;
      say('みちのりは みちに そった ながさ、きょりは まっすぐの ながさ', '道のりは道にそった長さ、距離はまっすぐの長さ'); if (!(await wait(3)) || !ok()) return;
      // 1km は 100m の 10こ
      let n = 0; const pool = Math.round(((bench('pool') || {}).len_mm || 25000) / 1000);
      sceneFn = () => {
        const g = F.layer('km'), a = mapBox(), s = (a.w - 40) / 1000, x = a.x + 20, y = a.y + a.h * 0.55;
        rect(g, a.x, a.y, a.w, a.h, { rx: 16, fill: C('home-bg') });
        for (let i = 0; i < 10; i++) { rect(g, x + i * 100 * s, y - 26, 100 * s - 3, 26, { rx: 4, fill: C(i < n ? (i % 2 ? 'face-3' : 'leaf') : 'paper-2'), stroke: C('line') }); if (i < n) txt(g, x + i * 100 * s + 50 * s, y + 20, '100m', { 'font-size': 12, fill: C('ink-soft'), class: 'ui' }); }
        if (n >= 1) txt(g, x + 50 * s, y - 36, `プール ${Math.round(100 / pool)}つぶん`, { 'font-size': 13, fill: C('sora'), class: 'ui' });
        if (n >= 10) { line(g, x, y + 40, x + 1000 * s, y + 40, { stroke: C('ok'), 'stroke-width': 4 }); txt(g, x + 500 * s, y + 66, '1km＝1000m', { 'font-size': 24, fill: C('ok') }); }
      };
      say(`100mは ${pool}mの プール ${Math.round(100 / pool)}つぶん`, `100メートルは${pool}メートルのプール${Math.round(100 / pool)}つ分`);
      for (let i = 1; i <= 10; i++) { n = i; draw(); sfx.tick(i); if (!(await wait(i === 1 ? 1.6 : 0.4)) || !ok()) return; }
      say('100mが 10こで <b>1km</b>。<b>1km＝1000m</b>', '100メートルが10個で1キロメートル。1キロメートルは1000メートル'); if (!(await wait(3)) || !ok()) return;
      say('つぎは「さわる」で ちずの みちを えらぼう', '次は「さわる」で地図の道を選ぼう'); ctx.log('miru'); phase = 'done';
    }
    F.onResize(draw); run();
    api.test = { state: () => ({ phase }), auto: () => (phase === 'done' ? { done: true } : { wait: 400 }) };
    return api;
  }

  /* ---------------- さわる：1km は 100m の 10こ（ズーム） ---------------- */
  if (mode === 'km') {
    const LV = [{ u: 1, name: '1m', thing: 'りょうてを ひろげた くらい' }, { u: 10, name: '10m', thing: 'きょうしつの よこ くらい' }, { u: 100, name: '100m', thing: 'プール 4つぶん' }, { u: 1000, name: '1km', thing: 'あるいて 15ふん くらい' }];
    let lv = 0, z = 1, zooms = 0;
    const draw = () => {
      F.clearLayers(); const g = F.layer('km'), a = mapBox(), x = a.x + 30, y = a.y + a.h * 0.55, W = a.w - 60;
      rect(g, a.x, a.y, a.w, a.h, { rx: 16, fill: C('home-bg') });
      // いまの 1つぶん（z=1）→ 10こ（z=0.1）
      const seg = W / 10;
      for (let i = 0; i < 10; i++) { if (i > 0 && z > 0.999) break; const w = i ? seg : lerp(W, seg, 1 - z), xx = x + i * seg; rect(g, xx, y - 30, Math.max(1, w - 3), 30, { rx: 5, fill: C(i % 2 ? 'face-3' : 'leaf'), opacity: i === 0 ? 1 : 1 - z }); }
      txt(g, x + (z > 0.5 ? W / 2 : seg / 2), y + 24, LV[lv].name, { 'font-size': 16, fill: C('ink'), class: 'ui' });
      if (z < 0.5 && LV[lv + 1]) { line(g, x, y + 46, x + W, y + 46, { stroke: C('ok'), 'stroke-width': 4 }); txt(g, x + W / 2, y + 72, `${LV[lv].name} が 10こで ${LV[lv + 1].name}`, { 'font-size': 22, fill: C('ok') }); }
      txt(g, x + W / 2, a.y + 40, `${z > 0.5 ? LV[lv].name : LV[lv + 1] ? LV[lv + 1].name : ''}：${z > 0.5 ? LV[lv].thing : LV[lv + 1] ? LV[lv + 1].thing : ''}`, { 'font-size': 17, fill: C('ink-soft'), class: 'ui' });
    };
    let busy = false;
    async function zoom() {
      if (busy) { ctx.toast('', 'ちょっと まってね', 1.2); return; }
      if (lv >= 3) { sfx.off(); ctx.toast('', 'もう 1kmだよ。「もどす」で はじめから', 2); return; }
      busy = true; sfx.tap(); const tag = S.token;
      await tween(1.4, k => { z = 1 - E.io(k); draw(); }); busy = false; if (!alive(tag)) return;
      ctx.caption(`<b>${LV[lv].name}</b>が 10こで <b>${LV[lv + 1].name}</b>`, 0, sp(`${LV[lv].name}が10個で${LV[lv + 1].name}`));
      lv++; z = 1; zooms++; ctx.log('km', { detail: { to: LV[lv].name } }); if (lv === 3) ctx.toast(ICON.HANAMARU, '1km＝1000m', 2.4, '1キロメートルは1000メートル');
      setTimeout(() => { if (alive(tag)) draw(); }, 1200);
    }
    panel.innerHTML = `<div class="row"><button class="btn" type="button" data-k="zoom">10ばいに する</button><button class="btn sub small" type="button" data-k="back">もどす</button></div>`;
    on($p(panel, '[data-k="zoom"]'), 'click', zoom);
    on($p(panel, '[data-k="back"]'), 'click', () => { if (lv === 0) { sfx.off(); ctx.toast('', 'いまが いちばん ちいさい 1mだよ', 1.6); return; } if (busy) { ctx.toast('', 'ちょっと まってね', 1.2); return; } sfx.tap(); lv = 0; z = 1; draw(); ctx.caption('1mから はじめよう', 0, '1メートルから始めよう'); });
    F.onResize(draw); draw();
    ctx.caption('「10ばいに する」を おして、1mから 1kmまで いこう', 0, '10倍にするを押して、1メートルから1キロメートルまで行こう');
    api.test = { state: () => ({ lv, zooms }), auto: () => (zooms >= 3 ? { done: true } : busy ? { wait: 400 } : { click: 'data-k=zoom|' }) };
    return api;
  }

  /* ---------------- さわる：道を えらぶ ／ つくる：1km さんぽ ---------------- */
  if (mode === 'route' || mode === 'walk') {
    const walk = mode === 'walk', TARGET = 1000;
    let made = 0, steps = 0, all = null;
    const draw = () => {
      F.clearLayers(); const mb = mapBox(); if (walk) mb.h -= 40; fit(mb);
      const g = F.layer('map'), fx = F.layer('fx'); drawMap(g, { tappable: true });
      if (st.showDist && st.path.length > 1) drawDist(fx, START, cur());
      if (walk) { const s = sumNow(), w = F.W - 40, x = 20, y = mb.y + mb.h + 6; rect(fx, x, y, w, 14, { rx: 7, fill: C('paper-2'), stroke: C('line') }); rect(fx, x, y, Math.min(1, s / TARGET) * w, 14, { rx: 7, fill: s > TARGET ? C('ok-soft') : s === TARGET ? C('ok') : C('sora') }); txt(fx, x + w, y + 30, `${s}m ／ 1000m`, { 'font-size': 14, fill: C('ink'), class: 'ui', 'text-anchor': 'end' }); txt(fx, x, y + 30, s === 1000 ? 'ちょうど 1km！' : s > 1000 ? 'こえた！' : '', { 'font-size': 14, fill: C('ok'), class: 'ui', 'text-anchor': 'start' }); }
    };
    const say = () => {
      const s = sumNow(), n = nodeOf(cur());
      if (st.path.length === 1) { ctx.caption(walk ? 'いえから しゅっぱつ。ちょうど <b>1000m（1km）</b>に なる さんぽみちを つくろう' : 'いえから、となりの ばしょを タッチして みちを えらぼう', 0); return; }
      const parts = (edgesOfPath(st.path) || []).map(i => `${EDGES[i].len}`).join('＋');
      ctx.caption(`${n.name}まで：${parts} ＝ <b>${s}m</b>${walk ? `（あと ${Math.max(0, TARGET - s)}m）` : ''}`, 0, sp(`${n.sp}まで、${s}m`));
    };
    function tapNode(id) {
      const last = cur();
      if (id === last) { if (st.path.length === 1) { sfx.off(); ctx.toast('', 'となりの ばしょを タッチしてね', 1.6); return; } sfx.tap(); st.path.pop(); draw(); say(); return; }
      const e = edgeOf(last, id);
      if (!e) { sfx.off(); ctx.toast('', `${nodeOf(last).name}から まっすぐ いける ばしょを えらんでね`, 2); return; }
      const es = edgesOfPath(st.path) || [];
      if (es.includes(e.i)) { sfx.off(); ctx.toast('', 'おなじ みちは 2かい とおらないよ', 2); return; }
      if (walk && sumNow() >= TARGET) { sfx.off(); ctx.toast('', sumNow() === TARGET ? 'もう 1kmに なったよ。「はじめから」で ちがう みちを さがそう' : 'こえて いるよ。「もどる」で もどろう', 2.4); return; }
      sfx.pop(); st.path.push(id); steps++; draw(); say();
      ctx.log(walk ? 'walk-step' : 'map', { detail: { nodes: st.path.join(''), len: sumNow() } });
      if (walk) {
        const s = sumNow();
        if (s === TARGET) {
          const key = routeKey(edgesOfPath(st.path)); made++; sfx.good();
          const [x, y] = M.P(nodeOf(cur())); hanamaru(F.svg, x, y, 36);
          const isNew = !ctx.zukanList('walk').includes(key);
          ctx.toast(ICON.HANAMARU, `ちょうど <b>1km</b>！ ${isNew ? 'あたらしい みちを ずかんに のせたよ' : 'この みちは もう ずかんに あるよ'}`, 3, 'ちょうど1キロメートル');
          ctx.register('walk', key); ctx.log('make', { correct: true, detail: { key, nodes: st.path.join(''), isNew } }); ctx.done('walk');
        } else if (s > TARGET) { sfx.bad(); ctx.toast('', `${s - TARGET}m こえた。「もどる」で もどろう`, 2.4, `${s - TARGET}メートル超えた`); }
      }
    }
    dragOn(F.svg, F, { hit: p => nodeAt(p) || null, end: (p, n) => tapNode(n.id) });
    panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-k="undo">もどる</button><button class="btn sub small" type="button" data-k="dist" aria-pressed="false">きょりを みる</button><button class="btn sub small" type="button" data-k="reset">はじめから</button></div>`;
    on($p(panel, '[data-k="undo"]'), 'click', () => { if (st.path.length === 1) { sfx.off(); ctx.toast('', 'まだ いえだよ', 1.4); return; } sfx.tap(); st.path.pop(); draw(); say(); });
    on($p(panel, '[data-k="reset"]'), 'click', () => { if (st.path.length === 1) { sfx.off(); ctx.toast('', 'もう いえに いるよ', 1.4); return; } sfx.tap(); st.path = [START]; draw(); say(); });
    on($p(panel, '[data-k="dist"]'), 'click', e => {
      sfx.tap(); st.showDist = !st.showDist; e.currentTarget.setAttribute('aria-pressed', String(st.showDist)); draw();
      if (st.showDist && st.path.length > 1) ctx.caption(`いえから ${nodeOf(cur()).name}まで：みちのり <b>${sumNow()}m</b>、きょり <b>やく${straight(START, cur())}m</b>`, 0, sp(`家から${nodeOf(cur()).sp}まで、道のり${sumNow()}m、距離約${straight(START, cur())}m`));
      else if (st.showDist) ctx.caption('みちを えらぶと、まっすぐの <b>きょり</b>も みえるよ', 0); else say();
    });
    st.path = [START]; F.onResize(draw); draw(); say();
    api.test = {
      state: () => ({ path: st.path.join(''), sum: sumNow(), made, steps }),
      auto() {
        if (walk ? made >= 1 : steps >= 2) return { done: true };
        let target;
        if (walk) { all = all || walks(TARGET); const have = new Set(ctx.zukanList('walk')); const key = all.find(k => !have.has(k)) || all[0]; target = keyNodes(key); }
        else target = ['H', 'P', 'S'];
        const okPrefix = st.path.every((n, i) => target[i] === n);
        if (!okPrefix) return { click: 'data-k=reset|' };
        const nx = target[st.path.length]; if (!nx) return { done: true };
        const [x, y] = M.P(nodeOf(nx)); return tapOf(F, x, y);
      },
    };
    return api;
  }

  /* ---------------- ためす：みちのりと きょり ---------------- */
  if (mode === 'quiz') {
    const ROUTES = [['H', 'P', 'S'], ['H', 'M', 'L'], ['H', 'Y', 'J'], ['H', 'P', 'J', 'E'], ['H', 'M', 'L', 'S'], ['H', 'P', 'L'], ['H', 'Y', 'J', 'E'], ['H', 'P', 'S', 'Q']];
    let draw = () => {};
    function gen(level, i) {
      const R = pickR(ROUTES.filter(r => level === 'easy' ? r.length === 3 : true)), dest = R[R.length - 1], L = pathLen(R), D = straight(R[0], dest);
      const cmp = level !== 'easy' && i % 3 === 2;
      const st2 = { k: 0, dk: 0, show: cmp ? [] : R };
      draw = () => {
        F.clearLayers(); fit(mapBox()); st.path = [START]; const g = F.layer('map'), fx = F.layer('fx');
        drawMap(g, { hiEdges: edgesOfPath(st2.show) || [] });
        if (st2.dk > 0) drawDist(fx, R[0], dest, st2.dk);
        if (st2.k > 0) { const es = edgesOfPath(st2.R2 || R); es.forEach((ei, j) => { if (st2.k < j + 1) return; const [x, y] = M.Q(BEND[ei]); badge(fx, x, y, `${EDGES[ei].len}`, { r: 18 }); }); }
      };
      F.onResize(() => draw());
      if (cmp) {
        // みちのりが みじかいのは どっち？（同じ行き先の2つの道）
        const pairs = [[['H', 'P', 'S'], ['H', 'M', 'L', 'S']], [['H', 'P', 'L'], ['H', 'M', 'L']], [['H', 'Y', 'J', 'E'], ['H', 'P', 'J', 'E']], [['H', 'P', 'J'], ['H', 'Y', 'J']]];
        const [A, B] = shuffleR(pickR(pairs).slice()), la = pathLen(A), lb = pathLen(B), d2 = A[A.length - 1];
        st2.show = []; draw();
        const nm = r => r.map(n => nodeOf(n).name).join('→');
        return {
          say: `いえから ${nodeOf(d2).name}まで。みちのりが みじかいのは？`, sp: `家から${nodeOf(d2).sp}まで。道のりが短いのは？`,
          choices: [{ html: nm(A), ok: la <= lb, mistake: 'route' }, { html: nm(B), ok: lb <= la, mistake: 'route' }],
          detail: { type: 'cmp', la, lb }, answerText: la <= lb ? nm(A) : nm(B), at: { x: M.P(nodeOf(d2))[0], y: M.P(nodeOf(d2))[1], r: 44 },
          hint(k) { if (k === 1) ctx.caption('くかんの ながさを たして くらべよう', 0); if (k === 2) { st2.show = A; draw(); ctx.caption(`あおい みち：${(edgesOfPath(A) || []).map(i => EDGES[i].len).join('＋')}`, 0); } if (k === 3) { st2.show = B; draw(); ctx.caption(`あおい みち：${(edgesOfPath(B) || []).map(i => EDGES[i].len).join('＋')}`, 0); } },
          async verify() { const tag = S.token; st2.show = A; st2.R2 = A; draw(); for (let j = 1; j <= A.length - 1; j++) { st2.k = j; draw(); if (!(await wait(0.4)) || !alive(tag)) return; } ctx.caption(`${nm(A)}：<b>${la}m</b>`, 0); await wait(1); st2.show = B; st2.R2 = B; st2.k = 0; for (let j = 1; j <= B.length - 1; j++) { st2.k = j; draw(); if (!(await wait(0.4)) || !alive(tag)) return; } ctx.caption(`${nm(B)}：<b>${lb}m</b>`, 0); await wait(1); },
        };
      }
      const askRoute = i % 2 === 0;
      draw();
      const w = [{ html: `${askRoute ? `やく${D}m` : `${L}m`}`, mistake: 'route' }, { html: `${(edgesOfPath(R) || []).length ? EDGES[edgesOfPath(R)[0]].len : L - 50}m`, mistake: 'other' }, { html: `${L + 100}m`, mistake: 'other' }];
      const right = askRoute ? `${L}m` : `やく${D}m`;
      return {
        say: `いえから ${nodeOf(dest).name}までの <b>${askRoute ? 'みちのり' : 'きょり'}</b>は？`, sp: `家から${nodeOf(dest).sp}までの${askRoute ? '道のり' : '距離'}は？`,
        choices: choices(right, w), detail: { type: askRoute ? 'route' : 'dist', L, D, dest }, answerText: right, at: { x: M.P(nodeOf(dest))[0], y: M.P(nodeOf(dest))[1], r: 44 },
        hint(k) { if (k === 1) ctx.caption(askRoute ? '<b>みちのり</b>は みちに そった ながさ' : '<b>きょり</b>は まっすぐの ながさ', 0); if (k === 2) ctx.caption(askRoute ? 'くかんの ながさを たそう' : 'てんせんの ながさだよ', 0); if (k === 3) { if (askRoute) { st2.k = 9; draw(); } else { st2.dk = 1; draw(); } } },
        async verify() {
          const tag = S.token;
          if (askRoute) { for (let j = 1; j <= R.length - 1; j++) { st2.k = j; draw(); sfx.tick(j); if (!(await wait(0.5)) || !alive(tag)) return; } ctx.caption(`${(edgesOfPath(R) || []).map(i => EDGES[i].len).join('＋')} ＝ <b>${L}m</b>（みちのり）`, 0, sp(`${L}m、道のり`)); }
          else { await tween(1, k => { st2.dk = k; draw(); }); if (!alive(tag)) return; ctx.caption(`まっすぐ はかると <b>やく${D}m</b>（きょり）`, 0, sp(`まっすぐはかると約${D}m、距離`)); }
          await wait(1);
        },
      };
    }
    const quiz = makeQuiz(ctx, F, { kind: 'route', n: opts.n || 5, gen });
    quiz.start();
    return { dispose() {}, test: quiz.test };
  }
  return api;
}
