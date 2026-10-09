// H3：ながさ（N1・N2・N2m・N3）。道と組の数（凍結値・数え直し・単元のずかん）、ものさしの目もりの実寸、からだものさし、問題の選択肢
import test from 'node:test';
import assert from 'node:assert/strict';
import { readJSON, rng } from './helpers.mjs';
import * as G from '../../app/parts/_nagasa-gen.js';
import { mmToPx, pxToMm, pxPerMmFrom, CSS_PX_PER_MM } from '../../app/core/calibrate.js';
import { buildRoutes, buildOnem, buildIkutsu, buildMono, buildLong, routeItem, onemItem } from '../../tools/hakaru-nagasa.mjs';

const B = readJSON('data/benchmarks.json').items, by = Object.fromEntries(B.map(b => [b.id, b]));
const lenOf = id => by[id].len_mm;
const routes = readJSON('data/hakaru/routes.json'), onem = readJSON('data/hakaru/onem.json');

test('N3 の地図：8地点以上・つながっている・区間の長さは まっすぐの長さ（きょり）以上', () => {
  assert.ok(G.NODES.length >= 8, '地点 ' + G.NODES.length);
  for (const name of ['いえ', 'がっこう', 'こうえん', 'えき', 'としょかん']) assert.ok(G.NODES.some(n => n.name === name), name);
  for (const e of G.EDGES) {
    const a = G.nodeOf(e.a), b = G.nodeOf(e.b);
    assert.ok(a && b, `${e.a}-${e.b}`);
    assert.ok(e.len >= Math.hypot(a.x - b.x, a.y - b.y), `${e.a}-${e.b} の道のり ${e.len} ≥ きょり`);
    assert.ok(e.len > 0 && e.len % 50 === 0, '50m 単位');
  }
  const seen = new Set([G.START]), q = [G.START];
  while (q.length) { const n = q.shift(); for (const m of G.neighbors(n)) if (!seen.has(m)) { seen.add(m); q.push(m); } }
  assert.equal(seen.size, G.NODES.length, 'すべての地点に行ける');
});

// 数え直し：_nagasa-gen.js の walks とは別に、向きつきの辺で深さ優先にすべての道を作り、見分けを付け直して数える
function recountWalks(total = 1000) {
  const adj = {}; G.EDGES.forEach(e => { (adj[e.a] = adj[e.a] || []).push([e.b, e.i, e.len]); (adj[e.b] = adj[e.b] || []).push([e.a, e.i, e.len]); });
  const out = new Set();
  const stack = [[G.START, [], 0]];
  while (stack.length) {
    const [n, es, s] = stack.pop();
    if (s === total) { const fwd = es.join('-'), end = n; out.add(end === G.START ? [fwd, es.slice().reverse().join('-')].sort()[0] : fwd); continue; }
    for (const [m, i, l] of adj[n] || []) if (!es.includes(i) && s + l <= total) stack.push([m, [...es, i], s + l]);
  }
  return out;
}
test('N3「1km さんぽ」：同じ区間を2回 通らずに ちょうど 1000m の道。凍結値（routes.json）＝計算＝数え直し＝単元のずかん', () => {
  const keys = G.walks(1000);
  assert.equal(routes.count, routes.routes.length);
  assert.equal(keys.length, routes.count, '凍結値と計算');
  assert.deepEqual(keys, routes.routes.map(r => r.key));
  assert.deepEqual([...recountWalks()].sort(), keys.slice().sort(), '数え直し');
  for (const r of routes.routes) {
    const es = r.key.split('-').map(Number);
    assert.ok(G.noRepeat(es), '同じ区間を2回 通らない ' + r.key);
    assert.equal(es.reduce((s, i) => s + G.EDGES[i].len, 0), 1000, r.key);
    assert.equal(G.pathLen(r.nodes), 1000);
    assert.equal(r.nodes[0], G.START);
  }
  assert.deepEqual(buildRoutes().map(r => r.key), keys);
  const z = readJSON('app/units/n3.json').zukan.find(x => x.id === 'walk');
  assert.deepEqual(z.items.map(i => i.id), keys, '単元のずかん');
  assert.deepEqual(z.items, buildRoutes().map(routeItem), 'ずかんの文と図も計算から');
  // ひとまわり（いえに もどる道）は 向きが逆でも同じ
  const loop = keys.find(k => G.keyNodes(k).slice(-1)[0] === G.START);
  if (loop) assert.equal(G.routeKey(loop.split('-').map(Number).reverse()), loop);
});

test('N2m「1m を つくる」：基準物 8種・同じ物は3つまで・ちょうど 100cm。凍結値（onem.json）＝計算＝数え直し＝単元のずかん', () => {
  assert.ok(G.ONEM_IDS.length <= 8 && G.ONEM_MAX <= 3);
  for (const id of G.ONEM_IDS) assert.ok(by[id] && by[id].len_mm > 0, '基準物の長さ ' + id);
  const keys = G.onemCombos(lenOf);
  assert.equal(onem.count, onem.combos.length);
  assert.equal(keys.length, onem.count, '凍結値と計算');
  assert.deepEqual(keys, onem.combos.map(c => c.key));
  // 数え直し：8種それぞれ 0〜3 の 4^8 とおりを すべて
  let n = 0; const ids = G.ONEM_IDS, found = [];
  for (let m = 0; m < 4 ** ids.length; m++) {
    let s = 0, x = m; const cnt = {};
    for (const id of ids) { const c = x % 4; x = Math.floor(x / 4); if (c) cnt[id] = c; s += c * lenOf(id); }
    if (s === 1000) { n++; found.push(G.onemKey(cnt)); }
  }
  assert.equal(n, keys.length, '数え直し');
  assert.deepEqual(found.sort(), keys.slice().sort());
  for (const c of onem.combos) { assert.equal(c.sum, 1000); assert.ok(Object.values(c.cnt).every(v => v >= 1 && v <= 3)); assert.ok(Object.keys(c.cnt).length <= 8); }
  const z = readJSON('app/units/n2m.json').zukan.find(x => x.id === 'onem');
  assert.deepEqual(z.items.map(i => i.id), keys, '単元のずかん');
  assert.deepEqual(z.items, buildOnem().map(onemItem));
});

test('N1・N2・N2m の ずかん：物×たんい（いくつぶん）・はかった物・長い物が 基準物から作られている', () => {
  const n1 = readJSON('app/units/n1.json').zukan.find(z => z.id === 'ikutsu');
  assert.equal(n1.items.length, G.UNIT_OBJS.length * G.MY_UNITS.length);
  assert.deepEqual(n1.items, buildIkutsu());
  // ノートは ブロック（40mm）6こと すこし
  assert.equal(G.countText(lenOf('notebook'), G.unitLen('block', lenOf)), '6こと すこし');
  assert.equal(G.countText(120, 40), '3こ');
  const n2 = readJSON('app/units/n2.json').zukan.find(z => z.id === 'mono');
  assert.deepEqual(n2.items.map(i => i.id), G.MONO_IDS); assert.deepEqual(n2.items, buildMono());
  const n2m = readJSON('app/units/n2m.json').zukan.find(z => z.id === 'nagai');
  assert.deepEqual(n2m.items.map(i => i.id), G.LONG_IDS); assert.deepEqual(n2m.items, buildLong());
});

test('ものさしの目もり：i mm の目もりは 0 から i×ppm px（1mm 単位で実寸の計算と一致）。画面の幅に入る', () => {
  for (const ppm of [CSS_PX_PER_MM, pxPerMmFrom(104, 20), 6.3, 2.9]) {
    const x0 = 37.5, cm = 25, ticks = G.rulerTicks(x0, ppm, cm), zero = G.tickX(x0, ppm, 0);
    assert.equal(ticks.length, cm * 10 + 1);
    assert.ok(Math.abs(zero - (x0 + G.RULER_PAD * ppm)) < 1e-9, '0 の目もり');
    for (const t of ticks) {
      assert.ok(Math.abs((t.x - zero) - mmToPx(t.i, ppm)) < 1e-9, `${ppm} の ${t.i}mm`);
      assert.equal(Math.round(pxToMm(t.x - zero, ppm)), t.i);
      assert.equal(G.mmAt(t.x, zero, ppm), t.i, 'さわった位置 → mm');
      assert.equal(t.kind, t.i % 10 === 0 ? 'cm' : t.i % 5 === 0 ? 'half' : 'mm');
    }
    assert.ok(Math.abs(ticks[100].x - ticks[0].x - 10 * 10 * ppm) < 1e-9, '10cm');
    for (const W of [390, 820, 1180]) { const c = G.rulerFit(W, ppm); assert.ok(G.rulerW(c, ppm) <= W - 32 || c === 3, `${W}px に ${c}cm`); }
  }
  // 1円玉が 104px で合った iPad（5.2px/mm）なら 30cm は 1560px＋余白。1180px の画面には 21cm まで
  assert.equal(G.rulerFit(1180, 5.2), 21);
});

test('からだものさし：2本の指の位置（px）から長さ（mm）。ななめでも まっすぐの長さ', () => {
  assert.equal(G.bodyMM({ x: 0, y: 0 }, { x: 150 * 5.2, y: 0 }, 5.2), 150, 'ひとあた 15cm');
  assert.equal(G.bodyMM({ x: 10, y: 10 }, { x: 10 + 30 * 5.2 * 0.6, y: 10 + 30 * 5.2 * 0.8 }, 5.2), 30, 'ななめ 3cm');
  assert.equal(G.bodyMM({ x: 0, y: 0 }, { x: 16 * CSS_PX_PER_MM, y: 0 }, CSS_PX_PER_MM), 16);
  assert.equal(G.bodyMM({ x: 5, y: 5 }, { x: 5, y: 5 }, 4), 0);
});

test('問題の選択肢：正解は ちょうど1つ、3択、重なりなし。誤答に つまずきの型（L1・L4・L5・choose・L6・L7）が入る', () => {
  const r = rng(21), seen = {};
  const add = (k, ch) => { assert.equal(ch.filter(c => c.ok).length, 1, k + JSON.stringify(ch)); assert.equal(new Set(ch.map(c => c.html)).size, ch.length, k); ch.filter(c => !c.ok).forEach(c => { (seen[k] = seen[k] || new Set()).add(c.mistake); }); };
  for (let i = 0; i < 400; i++) for (const lv of ['easy', 'normal', 'challenge']) {
    const q1 = G.readQ(lv, 12, r); add('read', q1.choices); assert.equal(q1.choices.length, 3); assert.ok(q1.L + q1.off <= 110);
    const q2 = G.calcQ(lv, r); add('calc', q2.choices); assert.equal(q2.ans, q2.op === '+' ? q2.a + q2.b : q2.a - q2.b); assert.ok(q2.ans > 0);
    add('mconv', G.mconvQ(lv, r).choices); add('mcalc', G.mcalcQ(lv, r).choices); add('kconv', G.kconvQ(lv, r).choices);
    const c = G.cmpQ(lv, r); assert.notEqual(c.a, c.b); assert.ok((c.a > c.b) !== (parseInt(c.aTxt, 10) > parseInt(c.bTxt, 10)) || lv === 'challenge' || c.aTxt.includes('cm'), 'L4 の わな：数の大きいほうが短い');
  }
  assert.ok(seen.read.has('L1'), 'read L1'); assert.ok(seen.calc.has('L4'), 'calc L4');
  for (const k of ['mconv', 'mcalc', 'kconv']) assert.ok(seen[k].has('L5'), k + ' L5');
  // 2cm と 9mm：数字だけで比べると 9 のほうが大きい
  assert.deepEqual(G.cmpQ('easy', () => 0).aTxt, '2cm');
  for (let i = 0; i < G.CHOOSE.length; i++) { const q = G.chooseQ(i, lenOf, r); assert.equal(q.choices.filter(c => c.ok).length, 1); assert.ok(q.choices.some(c => c.mistake === 'choose')); assert.ok(q.v >= 1); }
  assert.ok(G.TOOLS.some(t => Object.values(t.w).includes('L6')), '曲がった物 L6');
  assert.ok(G.ZERO_Q.some(z => z.mistake === 'L7') && G.ZERO_Q.filter(z => z.ok).length === 1, 'まきじゃくの0 L7');
  // 表し方
  assert.equal(G.cmmm(35), '3cm 5mm'); assert.equal(G.mcm(1200), '1m 20cm'); assert.equal(G.kmm(1030), '1km 30m'); assert.equal(G.kmm(980), '980m');
});
