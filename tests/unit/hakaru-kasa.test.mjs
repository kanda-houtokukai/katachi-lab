// H4：かさ・おもさ（K1・K2・O3）と U3。注ぎ方と 1kg の組の数（凍結値・数え直し・単元のずかん）、はかりの目もり（3種）、水の多角形、問題の生成
import test from 'node:test';
import assert from 'node:assert/strict';
import { readJSON, rng } from './helpers.mjs';
import { SHAPES, area, waterPoly, tiltFor, lipOf, gravity, clipHalf, levelOf, masuAll, masuTargets } from '../../app/parts/_water.js';
import { CAPS, CAP_LIST, ticks, degOf, readParts, springStep, needleTarget, STOP, KG_ITEMS, kgCombos, comboId, comboOf } from '../../app/parts/_omosa.js';
import { buildMasu, masuItems } from '../../tools/hakaru-kasa.mjs';
import { buildKg, kgItems } from '../../tools/hakaru-omosa.mjs';
import { genMore, genCount, genCupSize, genReadV, readChoicesV, genUnit, unitOf, genCompare, genCalc, UNIT_ITEMS } from '../../app/parts/_kasa-gen.js';
import { genReadG, genChooseCap, genUnitG, genConvert, THINK } from '../../app/parts/_omosa-gen.js';
import { genMatch, genConvertU, TABLE, FIND } from '../../app/parts/_tani-gen.js';
import { dlText } from '../../app/parts/_water.js';

const bench = readJSON('data/benchmarks.json').items, B = Object.fromEntries(bench.map(b => [b.id, b]));
const one = (ch, label) => { assert.equal(ch.filter(c => c.ok).length, 1, '正解が1つ ' + label); assert.equal(new Set(ch.map(c => c.html)).size, ch.length, '重なりなし ' + label); assert.ok(ch.length >= 2, '2択以上 ' + label); };

test('K2 注ぎ方：凍結値（data/hakaru/masu.json）と一致・数え直しても一致・単元のずかんと一致', () => {
  const fz = readJSON('data/hakaru/masu.json');
  assert.deepEqual(buildMasu(), fz);
  // 数え直し：1L1dL〜2L9dL を、1Lます x かい・1dLます y かい（x×10＋y）で つくる 組を すべて
  const re = [];
  for (let L = 1; L <= 2; L++) for (let d = 1; d <= 9; d++) { const T = L * 10 + d; for (let x = 0; x <= 2; x++) for (let y = 0; y <= 29; y++) if (x * 10 + y === T) re.push(`${T}:${x}:${y}`); }
  assert.equal(re.length, fz.total); assert.equal(fz.total, 45); assert.equal(fz.targets, 18);
  assert.deepEqual([...re].sort(), [...fz.ways].sort());
  const k2 = readJSON('app/units/k2.json'), z = k2.zukan.find(x => x.id === 'k2-masu');
  assert.deepEqual(z.items.map(i => i.id), fz.ways);
  assert.deepEqual(z.items, masuItems());
  for (const it of z.items) { const [T, x, y] = it.id.split(':').map(Number); assert.equal(x * 10 + y, T); assert.equal(it.val, dlText(T)); }
});

test('O3 1kg を つくろう：凍結値（data/hakaru/kg.json）と一致・数え直しても一致・単元のずかんと一致・重さは基準物から', () => {
  const fz = readJSON('data/hakaru/kg.json');
  assert.deepEqual(buildKg(bench), fz);
  assert.ok(KG_ITEMS.length <= 10, '10しゅ いない'); assert.ok(!KG_ITEMS.includes('randoseru'), 'ランドセルは使わない');
  for (const it of fz.items) assert.equal(it.g, B[it.id].mass_g, it.id + ' の重さは benchmarks.json');
  // 数え直し：3^n とおりを すべて しらべる（同じ物は 2こまで）
  const n = fz.items.length; let cnt = 0; const ids = [];
  for (let k = 0; k < 3 ** n; k++) { let s = 0, t = k; const o = {}; for (let i = 0; i < n; i++) { const c = t % 3; t = Math.floor(t / 3); s += c * fz.items[i].g; if (c) o[fz.items[i].id] = c; } if (s === 1000) { cnt++; ids.push(comboId(o)); } }
  assert.equal(cnt, fz.total); assert.equal(fz.total, 34);
  assert.deepEqual(ids.sort(), [...fz.combos].sort());
  for (const id of fz.combos) { const o = comboOf(id); assert.equal(Object.entries(o).reduce((s, [k, c]) => s + c * B[k].mass_g, 0), 1000, id); assert.ok(Object.values(o).every(c => c >= 1 && c <= 2)); }
  const o3 = readJSON('app/units/o3.json');
  assert.deepEqual(o3.zukan.find(z => z.id === 'o3-kg').items, kgItems(bench));
  assert.deepEqual(o3.zukan.find(z => z.id === 'o3-kg').items.map(i => i.id), fz.combos);
});

test('はかりの目もり（3種）：1kg＝5g・2kg＝10g・4kg＝20g、ひとまわりで秤量、数字の位置', () => {
  assert.deepEqual(CAP_LIST.map(c => CAPS[c].minor), [5, 10, 20]);
  for (const c of CAP_LIST) {
    const t = ticks(c);
    assert.equal(t.length, 200, c + ' の目もりは 200');
    t.forEach((x, i) => { assert.equal(x.v, i * CAPS[c].minor); assert.ok(Math.abs(x.deg - i * 1.8) < 1e-9, '1目もり 1.8°'); });
    assert.equal(t.filter(x => x.kind === 'major').length, c / CAPS[c].label);
    assert.equal(t[0].label, '0');
  }
  assert.equal(degOf(100, 1000), 36); assert.equal(degOf(500, 2000), 90); assert.equal(degOf(1000, 4000), 90); assert.equal(degOf(2000, 2000), 360);
  assert.equal(ticks(2000).find(x => x.v === 1000).label, '1kg'); assert.equal(ticks(2000).find(x => x.v === 1200).label, '200'); assert.equal(ticks(4000).find(x => x.v === 2500).label, '500');
  assert.deepEqual(readParts(365, 1000), { base: 300, n: 13, minor: 5 });
  assert.deepEqual(readParts(1270, 2000), { base: 1200, n: 7, minor: 10 });
  // 針のばね：経過時間で進め、止まる。振り切れても止め金（STOP）を こえない
  const st = { a: 0, v: 0 }; for (let k = 0; k < 300; k++) springStep(st, degOf(365, 1000), 1 / 60);
  assert.ok(Math.abs(st.a - degOf(365, 1000)) < 0.3 && Math.abs(st.v) < 0.8, '5秒で止まる');
  const st2 = { a: 0, v: 0 }; let mx = 0; for (let k = 0; k < 300; k++) { springStep(st2, needleTarget(1500, 1000), 1 / 60); mx = Math.max(mx, st2.a); }
  assert.ok(mx <= STOP, '止め金で とまる'); assert.ok(st2.a > 355, '振り切れ');
  // フレームの細かさに よらない
  const a = { a: 0, v: 0 }, b = { a: 0, v: 0 }; for (let k = 0; k < 60; k++) springStep(a, 100, 1 / 60); for (let k = 0; k < 30; k++) springStep(b, 100, 1 / 30);
  assert.ok(Math.abs(a.a - b.a) < 1, 'フレームの数に依存しない');
});

test('水の多角形：面積が水の量と一致（傾き 0〜120°、誤差 1%以内）・注ぐ角度で水面が口の角にとどく', () => {
  const vessels = [SHAPES.rect(10, 10), SHAPES.rect(5, 18), SHAPES.rect(12, 7.5), SHAPES.taper(7, 9, 0.78), SHAPES.taper(28, 26, 0.78), SHAPES.bowl(16, 7.5), SHAPES.bottle(6.5, 20, 0.4), SHAPES.bottle(10.5, 30, 0.32), SHAPES.kettle(20, 15)];
  let worst = 0;
  for (const P of vessels) {
    const A = area(P);
    for (let rot = 0; rot <= 120; rot += 5) for (const sg of [1, -1]) for (let f = 0.05; f < 1; f += 0.05) {
      const W = waterPoly(P, f, sg * rot); const e = Math.abs(area(W) / A - f) / f; worst = Math.max(worst, e);
      assert.ok(e <= 0.01, `誤差 ${e} rot ${rot} f ${f}`);
    }
    // 水面は いつも 重力に 垂直（多角形の 切り口の 点が 同じ 高さ）
    const W = waterPoly(P, 0.5, 30), g = gravity(30), ds = W.map(p => p[0] * g[0] + p[1] * g[1]), top = Math.min(...ds);
    assert.ok(ds.filter(d => Math.abs(d - top) < 1e-6).length >= 2, '水面が水平');
    // 注ぐ角度：口の角を通る水面で 切ると、水の量に なる
    for (const f of [0.3, 0.6, 0.9]) for (const sg of [1, -1]) {
      const th = tiltFor(P, f, sg), lip = lipOf(P, sg), gg = gravity(sg * th), s = lip[0] * gg[0] + lip[1] * gg[1];
      assert.ok(Math.abs(area(clipHalf(P, gg, s)) / A - f) < 0.01, `注ぐ角度 f ${f}`);
      assert.ok(th > 0 && th < 150);
    }
    // 水が ふえると 水面が 上がる
    let prev = -1; for (let f = 0.1; f < 1; f += 0.1) { const l = levelOf(P, f); assert.ok(l > prev); prev = l; }
  }
  assert.ok(worst < 0.01);
});

test('かさの問題（K1・K2）：正解が1つ・誤答に V1〜V5 の型が入る', () => {
  const r = rng(5), seen = new Set();
  for (const lv of ['easy', 'normal', 'challenge']) for (let i = 0; i < 40; i++) {
    const m = genMore(lv, i % 5, r); one(m.choices, 'more');
    assert.ok(m.tall <= 450 && m.wide <= 700);
    if (i % 5 === 1) assert.ok(m.tall < m.wide, 'i=1 は 高い ほうが すくない');
    m.choices.filter(c => !c.ok).forEach(c => seen.add(c.mistake));
    const cs = genCupSize(lv, i % 5, r); one(cs.choices, 'cupsize'); cs.choices.filter(c => !c.ok).forEach(c => seen.add(c.mistake));
    assert.equal(cs.a, cs.nS * 100); assert.equal(cs.b, cs.nB * 200);
    const cn = genCount(lv, r); one(cn.choices, 'count'); assert.ok(cn.choices.some(c => c.ok && +c.html === cn.n));
    const v = genReadV(lv, r), rc = readChoicesV(v, r); one(rc, 'read'); assert.equal(rc.find(c => c.ok).html, dlText(v)); rc.filter(c => !c.ok).forEach(c => seen.add(c.mistake));
    const cp = genCompare(lv, i, r); one(cp.choices, 'compare'); cp.choices.filter(c => !c.ok).forEach(c => seen.add(c.mistake));
    const right = cp.choices.find(c => c.ok).key; assert.equal(right, cp.a.ml > cp.b.ml ? 'a' : cp.a.ml < cp.b.ml ? 'b' : 'eq');
    const cc = genCalc(lv, r); one(cc.choices, 'calc'); assert.equal(cc.r, cc.op === '+' ? cc.a + cc.b : cc.a - cc.b); assert.equal(cc.choices.find(c => c.ok).html, dlText(cc.r)); cc.choices.filter(c => !c.ok).forEach(c => seen.add(c.mistake));
    if (lv === 'normal') assert.ok(cc.a % 10 + cc.b >= 10, 'ふつうは くり上がる');
    if (lv === 'challenge') assert.ok(cc.op === '-' && cc.a % 10 < cc.b, 'チャレンジは くり下がる');
  }
  for (const id of UNIT_ITEMS) { const g = genUnit(B[id].vol_ml, r); one(g.choices, 'unit ' + id); g.choices.filter(c => !c.ok).forEach(c => seen.add(c.mistake)); assert.equal(g.choices.find(c => c.ok).html, `${unitOf(B[id].vol_ml).n}${unitOf(B[id].vol_ml).u}`); }
  for (const ty of ['V1', 'V2', 'V3', 'V4', 'V5']) assert.ok(seen.has(ty), ty);
  // 7時55分のように「数字だけで比べると まちがえる組」：600mL と 1L
  assert.equal(unitOf(8000).u, 'L'); assert.equal(unitOf(200).u, 'dL');
});

test('重さ・単位の問題（O3・U3）：正解が1つ・誤答に W1〜W5 の型が入る', () => {
  const r = rng(9), seen = new Set();
  for (const lv of ['easy', 'normal', 'challenge']) for (let i = 0; i < 40; i++) {
    const g = genReadG(lv, r); one(g.choices, 'read'); assert.ok(g.m > 0 && g.m < g.cap); assert.equal(g.m % CAPS[g.cap].minor, 0, '目もりの上');
    if (lv === 'normal') assert.notEqual(g.m % 50, 0); if (lv === 'challenge') assert.ok([2000, 4000].includes(g.cap));
    g.choices.filter(c => !c.ok).forEach(c => seen.add(c.mistake));
    const cv = genConvert(lv, i, r); one(cv.choices, 'convert ' + cv.q); cv.choices.filter(c => !c.ok).forEach(c => seen.add(c.mistake));
    const mt = genMatch(lv, i, r); one(mt.choices, 'match ' + mt.q); mt.choices.filter(c => !c.ok).forEach(c => seen.add(c.mistake));
    const cu = genConvertU(lv, i, r); one(cu.choices, 'convertU ' + cu.q);
  }
  for (const g of [250, 1200, 1500, 3000]) { const c = genChooseCap(g); one(c.choices, 'cap'); assert.equal(c.choices.find(x => x.ok).cap, CAP_LIST.find(x => x >= g)); c.choices.filter(x => !x.ok).forEach(x => seen.add(x.mistake)); }
  for (const id of ['apple', 'bicycle', 'keicar', 'egg']) { const u = genUnitG(B[id].mass_g, r); one(u.choices, 'unitG'); u.choices.filter(c => !c.ok).forEach(c => seen.add(c.mistake)); }
  for (const t of THINK) { assert.equal(t.ch.filter(c => c[1]).length, 1); t.ch.forEach(c => c[2] && seen.add(c[2])); }
  for (const ty of ['W1', 'W2', 'W3', 'W4', 'W5']) assert.ok(seen.has(ty), ty);
  // 単位の表：長さ・かさ・重さの3行で、1000ばいの列に k、1000ぶんの1の列に m
  for (const row of TABLE.rows) { assert.ok(row.cells[0].startsWith('k')); assert.ok(row.cells[6].startsWith('m')); }
  assert.deepEqual(TABLE.intro, ['kL', 'mg']);
});

test('K1・K2・O3・U3 のずかん：基準物の値から計算したものと一致', () => {
  const k1 = readJSON('app/units/k1.json'), z1 = k1.zukan[0];
  assert.equal(z1.items.length, 12);
  for (const it of z1.items) { const [c, k] = it.id.split(':'), cup = B[k === 's' ? 'cup-s' : 'cup'].vol_ml, n = Math.floor(B[c].vol_ml / cup); assert.match(it.val, new RegExp('^' + n + '[はぱば]い' + (B[c].vol_ml % cup ? 'と すこし' : '') + '$')); }
  const k2 = readJSON('app/units/k2.json'), z2 = k2.zukan.find(z => z.id === 'k2-kasa');
  for (const it of z2.items) assert.ok(B[it.id] && B[it.id].vol_ml > 0, it.id);
  const o3 = readJSON('app/units/o3.json'), z3 = o3.zukan.find(z => z.id === 'o3-mass');
  for (const it of z3.items) assert.ok(B[it.id].mass_g > 0 && B[it.id].massRef !== false, it.id);
  const u3 = readJSON('app/units/u3.json'), z4 = u3.zukan[0];
  assert.deepEqual(z4.items.map(i => i.id).sort(), ['mm', 'cm', 'm', 'km', 'mL', 'dL', 'L', 'kL', 'mg', 'g', 'kg', 't'].sort());
  for (const f of FIND) assert.ok(f.f(B[f.id]).endsWith(f.u), f.u);
  assert.equal(masuTargets().length, 18); assert.equal(masuAll().length, 45);
  void kgCombos;
});
