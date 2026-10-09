// H6・H7 ちょっと先（A4 角の大きさ・E5 円周と円周率・S5 単位量あたりの大きさと速さ・EJ おうぎ形）：
// 分度器の目もりの位置・円周÷直径・速さの換算・おうぎ形の弧と面積の比例・問題の生成・図鑑の凍結値（data/hakaru/ahead.json）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readJSON, rng } from './helpers.mjs';
import * as G from '../../app/parts/_ahead-gen.js';
import { compute, ZUKAN } from '../../tools/hakaru-ahead.mjs';
import { evaluate, labelOf } from '../../app/core/rules.js';

const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

test('分度器：目もりの位置（内側は 0の線から反時計回り、外側は反対の端から）と、0の線をどちらの辺に合わせても角が読める', () => {
  // 0の線が右向き（rot=0）・半径100：内側の 0 は右端、90 は真上、180 は左端。外側の 0 は左端、180 は右端
  const p = (v, w) => G.tickPos(0, 0, 100, 0, v, w).map(x => Math.round(x * 1000) / 1000 + 0);
  assert.deepEqual(p(0, 'inner'), [100, 0]); assert.deepEqual(p(90, 'inner'), [0, -100]); assert.deepEqual(p(180, 'inner'), [-100, 0]);
  assert.deepEqual(p(0, 'outer'), [-100, 0]); assert.deepEqual(p(180, 'outer'), [100, 0]); assert.deepEqual(p(30, 'outer'), p(150, 'inner'));
  // 同じ向きの 内側＋外側 は いつも 180
  for (let phi = 0; phi <= 180; phi++) assert.equal(G.innerAt(phi) + G.outerAt(phi), 180);
  // 回した分度器（rot=40）：内側の v の目もりは 40+v の向き
  for (const v of [0, 25, 90, 180]) assert.ok(near(G.tickDir(40, v, 'inner'), G.norm360(40 + v)));
  // どの角も、0の線を下の辺（内側）・上の辺（外側）のどちらに合わせても θ が読める
  const r = rng(5);
  for (let th = 1; th < 180; th++) {
    const a0 = Math.floor(r() * 360);
    const [inner, outer] = G.alignRots(a0, th);
    assert.deepEqual([G.readAt(inner.rot, a0, th).which, G.readAt(inner.rot, a0, th).v], ['inner', th], `内側 ${th}°`);
    assert.deepEqual([G.readAt(outer.rot, a0, th).which, G.readAt(outer.rot, a0, th).v], ['outer', th], `外側 ${th}°`);
    assert.equal(G.readAt(G.norm360(a0 + 180), a0, th), null, '反対向きでは読めない');
  }
});

test('三角定規の角の組み合わせ：15・75・105・120・135・150・180 の7つ（凍結値・A4 の図鑑と一致）', () => {
  const list = G.rulerAngles();
  assert.deepEqual(list.map(x => x.deg), [15, 75, 105, 120, 135, 150, 180]);
  for (const x of list) for (const h of x.how) assert.equal(G.rulerResult(h.a, h.b, h.op), x.deg);
  assert.deepEqual(list.find(x => x.deg === 15).how.map(h => `${h.a}-${h.b}`), ['30-45', '60-45']);
});

test('円周と円周率：内側の正六角形は直径の3倍・外側の正方形は4倍・角を増やすと 3.14 に近づく。転がして測った円周÷直径は 3.14 前後', () => {
  for (const d of [1, 2, 7.5, 20]) { assert.ok(near(G.polyIn(6, d), 3 * d, 1e-9)); assert.ok(near(G.polyOut(4, d), 4 * d, 1e-9)); assert.ok(G.polyIn(6, d) < G.trueCirc(d) && G.trueCirc(d) < G.polyOut(4, d)); }
  let prev = 0; for (const n of [6, 12, 24, 48, 96]) { const k = G.polyIn(n, 1); assert.ok(k > prev && k < Math.PI); prev = k; }
  assert.equal(G.r2(G.polyIn(96, 1)), 3.14);
  assert.equal(G.circumference(10), 31.4); assert.equal(G.circumference(25), 78.5);
  for (const c of G.circles(() => ({ len_mm: 20 }))) { assert.ok(Math.abs(c.ratio - 3.14) <= 0.011, `${c.name} ${c.ratio}`); assert.equal(c.c, G.r1(c.d * Math.PI)); }
});

test('速さの換算：時速・分速・秒速の行き来（×60・÷60・1000）がもとに戻る。走る物の値', () => {
  assert.equal(G.convSpeed(18, 'kmh', 'mpm'), 300); assert.equal(G.convSpeed(5, 'mps', 'mpm'), 300); assert.equal(G.convSpeed(300, 'mpm', 'kmh'), 18);
  assert.equal(G.convSpeed(72, 'kmh', 'mps'), 20); assert.ok(near(G.convSpeed(20, 'mps', 'kmh'), 72));
  const r = rng(9), U = ['kmh', 'mpm', 'mps'];
  for (let k = 0; k < 200; k++) { const v = Math.round(r() * 1000) / 10 + 0.1, a = U[k % 3], b = U[(k + 1) % 3]; assert.ok(near(G.convSpeed(G.convSpeed(v, a, b), b, a), v, 1e-9)); }
  const R = Object.fromEntries(G.racers().map(x => [x.id, x]));
  assert.deepEqual([R.jitensha.mpm, R.jitensha.mps, R.densha.mps, R.cheetah.mps, R.aruku.mpm], [300, 5, 20, 30, 80]);
  assert.equal(R.aruku.exact, false); assert.equal(R.jitensha.exact, true);
  assert.equal(G.perMat(9, 6), 1.5); assert.equal(G.perPerson(6, 9), 0.67);
  assert.equal(G.spdTxt(18, 'kmh'), '時速 18km'); assert.equal(G.spdSp(5, 'mps'), '秒速5メートル');
});

test('おうぎ形：弧の長さと面積は中心角に比例する（π の係数）。円錐の展開図の中心角＝360×底面の半径÷母線', () => {
  for (const r of [2, 3, 6, 10]) for (const a of [30, 45, 60, 90, 120, 180]) {
    assert.ok(near(G.arcLen(r, 2 * a), 2 * G.arcLen(r, a), 1e-9) && near(G.sectorArea(r, 2 * a), 2 * G.sectorArea(r, a), 1e-9), '2倍');
    assert.ok(near(G.arcLen(r, 360), 2 * Math.PI * r, 1e-9) && near(G.sectorArea(r, 360), Math.PI * r * r, 1e-9));
    const [n, d] = G.arcK(r, a); assert.ok(near(n / d * Math.PI, G.arcLen(r, a), 1e-9));
    const [n2, d2] = G.areaK(r, a); assert.ok(near(n2 / d2 * Math.PI, G.sectorArea(r, a), 1e-9));
    // 面積 ＝ 弧 × 半径 ÷ 2
    assert.ok(near(G.sectorArea(r, a), G.arcLen(r, a) * r / 2, 1e-9));
  }
  assert.equal(G.piTxt(G.arcK(6, 60)), '2π'); assert.equal(G.piTxt(G.areaK(6, 60)), '6π'); assert.equal(G.piTxt(G.arcK(4, 30)), '2/3π'); assert.equal(G.piTxt(G.arcK(3, 60)), 'π');
  const cs = G.cones(12);
  assert.equal(cs.length, 11); assert.deepEqual(cs.map(c => c.deg), [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]);
  for (const c of cs) assert.ok(near(G.arcLen(12, c.deg), 2 * Math.PI * c.rb, 1e-9), '弧の長さ＝底面の円周');
});

test('問題の生成：どの難しさでも正解はちょうど1つ・選択肢の重なりなし・誤答に つまずきの型が入る', () => {
  const r = rng(21), seen = {};
  const gens = { readQ: ['scale', 'tick'], cmpQ: ['side'], reflexQ: ['reflex'], rulerQ: ['ruler'], circleQ: ['radius', 'inverse', 'sense', 'half'], komiQ: ['total'], spdQ: ['total', 'slow'], convQ: ['conv', 'unit'], calcQ: ['inverse', 'conv'], sectorQ: ['ratio', 'radius', 'arcarea'] };
  for (const [f, want] of Object.entries(gens)) {
    seen[f] = new Set();
    for (const lv of ['easy', 'normal', 'challenge']) for (let i = 0; i < 60; i++) {
      const q = G[f](lv, i % 6, r);
      assert.equal(q.choices.filter(c => c.ok).length, 1, `${f} ${lv} ${i} 正解1つ ${JSON.stringify(q.choices)}`);
      assert.ok(q.choices.length >= 2, `${f} 選択肢の数`);
      assert.equal(new Set(q.choices.map(c => c.html)).size, q.choices.length, `${f} 重なり ${JSON.stringify(q.choices)}`);
      q.choices.filter(c => !c.ok).forEach(c => seen[f].add(c.mistake));
    }
    for (const m of want) assert.ok(seen[f].has(m), `${f} の誤答に ${m}`);
  }
  // 分度器の問題：答えと「180−θ」の取りちがい（scale）
  const q = G.readQ('normal', 1, rng(3)); assert.ok(q.choices.some(c => c.mistake === 'scale' && c.html === `${180 - q.th}°`));
  // 時速・分速・秒速：正解が換算と一致
  for (let i = 0; i < 30; i++) { const c = G.convQ(['easy', 'normal', 'challenge'][i % 3], i, rng(i + 1)); assert.equal(c.right, { kmh: c.r.kmh, mpm: c.r.mpm, mps: c.r.mps }[c.to]); assert.ok(near(G.convSpeed(c.v, c.from, c.to), c.right, 0.06)); }
  // おうぎ形：やさしい・ふつうの係数は整数（π の前の数）
  for (let i = 0; i < 60; i++) { const s = G.sectorQ('normal', i, rng(i + 7)); assert.equal(G.arcK(s.r, s.a)[1], 1); assert.equal(G.areaK(s.r, s.a)[1], 1); }
});

test('図鑑の凍結値（data/hakaru/ahead.json）：数え直すと一致し、単元の図鑑（a4・e5・s5・ej）と一致する', () => {
  const frozen = readJSON('data/hakaru/ahead.json'), now = compute();
  for (const k of ['angles', 'circles', 'racers', 'cones']) assert.deepEqual(now[k], frozen[k], k);
  assert.deepEqual([frozen.angles.length, frozen.circles.length, frozen.racers.length, frozen.cones.length], [7, 8, 8, 11]);
  for (const [file, zs] of Object.entries(ZUKAN)) {
    const j = readJSON('app/units/' + file);
    for (const [id, fn] of Object.entries(zs)) { const z = j.zukan.find(x => x.id === id); assert.ok(z, `${file} ${id}`); assert.deepEqual(z.items, fn(frozen), `${file} の ${id}`); }
  }
  // 1えんだまの直径は基準物から
  const coin = readJSON('data/benchmarks.json').items.find(b => b.id === 'coin1');
  assert.equal(frozen.circles.find(c => c.id === 'coin').d, coin.len_mm / 10);
});

test('ちょっと先 4単元のデータ：見立ての型・学校の対応・ためすに 3段の難しさ（部品の既定 5問以上）・つまずきの型が問題の mistake と対応', () => {
  const TYPES = { a4: ['side', 'scale', 'reflex', 'est'], e5: ['radius', 'inverse', 'sense'], s5: ['total', 'inverse', 'conv'], ej: ['ratio', 'radius', 'arcarea'] };
  const idx = readJSON('app/units/index.json');
  for (const [id, types] of Object.entries(TYPES)) {
    const u = idx.units.find(x => x.id === id); assert.equal(u.band, 'ahead'); if (!u.ready) continue;   // 段ごとに地図で開く（開いた単元だけ確かめる）
    const j = readJSON('app/units/' + u.file);
    assert.deepEqual(j.insights.map(x => x.type), types, id);
    assert.ok(j.school && j.map.length >= 3, id + ' 対応表');
    assert.ok(j.review.length >= 6 && j.demo.length >= 3 && j.praises.length >= 2, id);
    assert.ok(j.tabs.miru.length >= 1 && j.tabs.sawaru.length >= 1 && j.tabs.tamesu.length >= 1 && j.tabs.tsukuru.length >= 1, id);
    // 見本の記録で、見立て2つ以上・対応表の「できた」か「とちゅう」・ほめどころが出る（保護者画面が埋まる）
    const L = j.demo.map(d => ({ kind: d.kind.includes('.') ? d.kind : id + '.' + d.kind, correct: d.correct ?? null, hints: d.hints ?? null, level: d.level ?? null, detail: d.detail || {} }));
    assert.ok(j.insights.filter(x => evaluate(x.test, L).ok).length >= 2, id + ' 見本の記録で見立てが出る');
    assert.ok(j.map.every(m => evaluate(m.done, L).ok || evaluate(m.mid, L).ok), id + ' 見本の記録で対応表が埋まる');
    assert.ok(j.praises.some(x => evaluate(x.test, L).ok), id + ' ほめどころ');
    // 記録の種類ごとに保護者向けの文がある
    for (const l of L) assert.notEqual(labelOf(l, j.labels), l.kind, id + ' の文 ' + l.kind);
  }
});
