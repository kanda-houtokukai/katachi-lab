// H1：量の統合の骨格（見当の記録・読みの道具・実寸合わせ・基準物・入口・量の単元データの下限）
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readJSON } from './helpers.mjs';
import { evaluate, estSeries } from '../../app/core/rules.js';
import * as Y from '../../app/core/yomi.js';
import { pxPerMmFrom, mmToPx, pxToMm, deviceKey, CSS_PX_PER_MM } from '../../app/core/calibrate.js';

test('見当の記録：estErr は相対誤差の平均（％）と件数を返し、gte／lte と件数で判定する', () => {
  const L = [
    { kind: 'n2.estimate', detail: { guess: 10, actual: 20, unit: 'cm', qty: 'length' } },   // 50%
    { kind: 'n2.estimate', detail: { guess: 30, actual: 20, unit: 'cm', qty: 'length' } },   // 50%
    { kind: 'n2.estimate', detail: { guess: 22, actual: 20, unit: 'cm', qty: 'length' } },   // 10%
    { kind: 'k2.estimate', detail: { guess: 2, actual: 1, unit: 'L', qty: 'volume' } },      // 100%
    { kind: 'n2.read', detail: {} },
  ];
  const r = evaluate({ type: 'estErr', where: { kind: 'n2.estimate' } }, L);
  assert.deepEqual(r, { ok: true, vars: { n: 3, err: 37 } });
  assert.equal(evaluate({ type: 'estErr', where: { kind: 'n2.estimate' }, gte: 40 }, L).ok, false);
  assert.equal(evaluate({ type: 'estErr', where: { kind: 'n2.estimate' }, lte: 40 }, L).ok, true);
  assert.equal(evaluate({ type: 'estErr', where: { kind: 'k2.estimate' } }, L).ok, false, '3件未満は判定しない');
  assert.equal(evaluate({ type: 'estErr', where: { kind: 'k2.estimate' }, minN: 1, gte: 90 }, L).ok, true);
  const s = estSeries(L.map((l, i) => Object.assign({ t: i }, l)));
  assert.deepEqual(s.length.map(x => x.err), [50, 50, 10]);
  assert.deepEqual(s.volume.map(x => x.err), [100]);
  assert.deepEqual(s.mass, []);
});

test('読みの道具：分の「ふん／ぷん」・杯・本・時刻（全720）・時間・単位の読み上げ', () => {
  const pun = [1, 3, 4, 6, 8, 10, 11, 13, 14, 16, 18, 20, 21, 30, 40, 50, 51, 56, 58];
  const fun = [2, 5, 7, 9, 12, 15, 17, 19, 22, 25, 27, 29, 35, 45, 55, 57, 59];
  for (const m of pun) assert.equal(Y.fun(m), 'ぷん', m + '分');
  for (const m of fun) assert.equal(Y.fun(m), 'ふん', m + '分');
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(Y.hai), ['ぱい', 'はい', 'ばい', 'はい', 'はい', 'ぱい', 'はい', 'ぱい', 'はい', 'ぱい']);
  assert.deepEqual([1, 2, 3, 6, 8, 10].map(Y.hon), ['ぽん', 'ほん', 'ぼん', 'ぽん', 'ぽん', 'ぽん']);
  assert.equal(Y.count(3, 'hai'), '3ばい');
  // 全時刻：画面の文と読み上げの文が同じ時刻を表す
  for (let t = 0; t < 720; t++) {
    const h = Math.floor(t / 60) || 12, m = t % 60;
    const kid = Y.kidTime(t), sp = Y.spTime(t);
    if (m === 0) { assert.equal(kid, `${h}じ`); assert.equal(sp, `${h}時`); }
    else if (m === 30) { assert.equal(kid, `${h}じはん`); assert.equal(sp, `${h}時半`); }
    else { assert.equal(kid, `${h}じ ${m}${Y.fun(m)}`); assert.equal(sp, `${h}時${m}分`); }
  }
  assert.equal(Y.kidTime(7 * 60 + 55), '7じ 55ふん'); assert.equal(Y.spTime(7 * 60 + 55), '7時55分');
  assert.equal(Y.kidTime(12 * 60 + 4), '12じ 4ぷん'); assert.equal(Y.kidTime(30, { half: false }), '12じ 30ぷん');
  assert.equal(Y.ampm(7 * 60), 'ごぜん'); assert.equal(Y.ampm(19 * 60), 'ごご'); assert.equal(Y.ampm(12 * 60), 'ごご');
  assert.equal(Y.kidDur(80), '1じかん 20ぷん'); assert.equal(Y.spDur(80), '1時間20分'); assert.equal(Y.kidDur(60), '1じかん'); assert.equal(Y.kidDur(5), '5ふん');
  assert.equal(Y.kidSec(90), '1ぷん 30びょう'); assert.equal(Y.spSec(90), '1分30秒'); assert.equal(Y.kidSec(45), '45びょう');
  assert.equal(Y.unitSpeech('1dL と 3mL'), '1デシリットル と 3ミリリットル');
  assert.equal(Y.unitSpeech('2kg 300g'), '2キログラム 300グラム');
  assert.equal(Y.unitSpeech('12cm²'), '12平方センチメートル');
  assert.equal(Y.unitSpeech('1km 30m'), '1キロメートル 30メートル');
  assert.equal(Y.unitSpeech('1L 5dL'), '1リットル 5デシリットル');
  assert.equal(Y.unitSpeech('60°'), '60度');
  assert.equal(Y.unitSpeech('cm と mm'), 'cm と mm', '数のつかない記号はそのまま');
  assert.equal(Y.unitName('mm'), 'ミリメートル');
  assert.equal(Y.fmtLen(1200), '1m 20cm'); assert.equal(Y.fmtLen(35), '3cm 5mm'); assert.equal(Y.fmtLen(1030000), '1km 30m');
  assert.equal(Y.fmtVol(1500), '1L 5dL'); assert.equal(Y.fmtVol(600), '6dL'); assert.equal(Y.fmtVol(250), '250mL');
  assert.equal(Y.fmtMass(2300), '2kg 300g'); assert.equal(Y.fmtMass(1e6), '1t');
});

test('実寸合わせの計算：1円玉の円の直径（px）から 1mm あたりの px、mm⇄px', () => {
  const ppm = pxPerMmFrom(104, 20);                 // iPad で 1円玉（20mm）が 104px で合った
  assert.equal(ppm, 5.2);
  assert.equal(mmToPx(100, ppm), 520);
  assert.equal(pxToMm(520, ppm), 100);
  assert.ok(Math.abs(CSS_PX_PER_MM - 3.7795) < 1e-3);
  assert.equal(deviceKey({ screen: { width: 1180, height: 820 }, devicePixelRatio: 2 }), '820x1180@2.00');
  assert.equal(deviceKey({ screen: { width: 820, height: 1180 }, devicePixelRatio: 2 }), '820x1180@2.00', '向きを変えても同じ端末');
  assert.notEqual(deviceKey({ screen: { width: 820, height: 1180 }, devicePixelRatio: 2.5 }), '820x1180@2.00', 'ブラウザの拡大で変わる');
});

test('基準物（data/benchmarks.json）：30件以上・全件に src と verified・量のどれかを持つ・硬貨は造幣局の値', () => {
  const B = readJSON('data/benchmarks.json').items;
  assert.ok(B.length >= 30, '件数 ' + B.length);
  const ids = new Set();
  for (const b of B) {
    assert.ok(b.id && !ids.has(b.id), '重なりのない id ' + b.id); ids.add(b.id);
    assert.equal(typeof b.name, 'string');
    assert.equal(typeof b.verified, 'boolean', b.id + ' verified');
    assert.equal(typeof b.approx, 'boolean', b.id + ' approx');
    assert.ok(typeof b.src === 'string' && b.src.length > 3, b.id + ' src');
    assert.ok(['len_mm', 'vol_ml', 'mass_g', 'area_cm2'].some(k => typeof b[k] === 'number' && b[k] > 0), b.id + ' 量');
  }
  // 設計書 §1-2 の物をすべて入れる
  for (const id of ['coin1', 'hagaki', 'notebook', 'pencil', 'eraser', 'ruler30', 'ruler1m', 'desk', 'door', 'milk1L', 'milk200', 'pet500', 'pet2L', 'cup', 'bucket', 'water1L', 'apple', 'egg', 'textbook', 'randoseru', 'bicycle', 'keicar', 'pool', 'classroom', 'schoolyard', 'road1km']) assert.ok(ids.has(id), '設計書の基準物 ' + id);
  const by = Object.fromEntries(B.map(b => [b.id, b]));
  assert.deepEqual([by.coin1.len_mm, by.coin1.mass_g, by.coin10.len_mm, by.coin10.mass_g, by.coin100.len_mm, by.coin100.mass_g, by.coin500.len_mm, by.coin500.mass_g], [20, 1, 23.5, 4.5, 22.6, 4.8, 26.5, 7.1]);
  for (const c of ['coin1', 'coin10', 'coin100', 'coin500']) { assert.equal(by[c].verified, true); assert.match(by[c].src, /^https:\/\/www\.mint\.go\.jp\//); }
  assert.equal(by.card.len_mm, 85.6);
  assert.equal(by.randoseru.massRef, false, 'ランドセルは重さの基準に使わない');
});

const idx = readJSON('app/units/index.json'), areas = readJSON('app/units/areas.json').areas;
test('入口（areas.json）と地図（index.json）：入口は6つ、全単元の areas は存在する入口だけ、owner は katachi／hakaru', () => {
  assert.deepEqual(areas.map(a => a.id), ['katachi', 'nagasa', 'kasa', 'omosa', 'jikan', 'hirosa']);
  const ids = new Set(areas.map(a => a.id));
  for (const a of areas) { assert.ok(a.name && a.icon && a.color, a.id); }
  assert.equal(idx.units.length, 26, '図形7＋量19');
  for (const u of idx.units) {
    assert.ok(Array.isArray(u.areas) && u.areas.length >= 1, u.id);
    for (const a of u.areas) assert.ok(ids.has(a), `${u.id} の入口 ${a}`);
    assert.ok(['katachi', 'hakaru'].includes(u.owner), u.id);
    for (const r of u.requires) assert.ok(idx.units.some(x => x.id === r), `${u.id} の前提 ${r}`);
  }
  const by = Object.fromEntries(idx.units.map(u => [u.id, u]));
  for (const id of ['r1', 'r2', 'r4', 'r5a', 'rj']) assert.deepEqual(by[id].areas, ['katachi']);
  for (const id of ['r5b', 'r6']) assert.deepEqual(by[id].areas, ['katachi', 'kasa']);
  assert.deepEqual(by.u3.areas, ['nagasa', 'kasa', 'omosa']);
  assert.deepEqual(by.a4.areas, ['katachi']); assert.equal(by.a4.owner, 'hakaru');
  // どの入口にも単元が1つ以上ある
  for (const a of areas) assert.ok(idx.units.some(u => u.areas.includes(a.id)), a.id);
});

// 量の単元データの下限（run-02 §3-4）。つまずきの型は設計書 §3 の型（insights[].type）をすべて持つ
const TYPES = {
  n1: ['L2', 'L3', 'thick'], k1: ['V1', 'V2'], h1: ['A1', 'A3'], t1: ['T1', 'T2', 'T3', 'pun'],
  n2: ['L1', 'L4'], n2m: ['L5', 'choose'], k2: ['V3', 'V4', 'V5'], t2: ['T4', 'T5', 'T6'],
  n3: ['L5', 'L6', 'L7', 'route'], o3: ['W1', 'W2', 'W3', 'W4', 'W5'], t3: ['T5', 'T7', 'T8'], u3: ['W5'],
};
test('量の単元データの下限：本編はみる1・さわる2・ためす2・つくる1・ずかん1・思い出し10・見立て全型・ほめどころ2・対応表、ちょっと先はみる1・さわる1・ためす1・思い出し6・見立て2', () => {
  const hk = idx.units.filter(u => u.owner === 'hakaru' && u.ready);
  for (const u of hk) {
    assert.ok(existsSync(new URL(`../../app/units/${u.file}`, import.meta.url)), u.id);
    const j = readJSON('app/units/' + u.file), t = j.tabs, n = k => (t[k] || []).length;
    const ins = (j.insights || []).map(x => x.type);
    if (u.band === 'main') {
      assert.ok(n('miru') >= 1 && n('sawaru') >= 2 && n('tamesu') >= 2 && n('tsukuru') >= 1, `${u.id} の活動の数`);
      assert.ok((j.zukan || []).length >= 1, `${u.id} のずかん`);
      assert.ok((j.review || []).length >= 10, `${u.id} の思い出し問題 ${(j.review || []).length}`);
      for (const ty of TYPES[u.id]) assert.ok(ins.includes(ty), `${u.id} の見立て ${ty}`);
      assert.ok((j.praises || []).length >= 2, `${u.id} のほめどころ`);
      assert.ok((j.map || []).length >= 1 && j.school, `${u.id} の対応表`);
    } else {
      assert.ok(n('miru') >= 1 && n('sawaru') >= 1 && n('tamesu') >= 1, `${u.id} の活動の数`);
      assert.ok((j.review || []).length >= 6, `${u.id} の思い出し問題`);
      assert.ok((j.insights || []).length >= 2, `${u.id} の見立て`);
    }
    // 「ためす」は3段の難しさ・1回5問以上（部品の既定は5問。n を書くなら5以上）
    for (const a of t.tamesu || []) if (a.opts && a.opts.n != null) assert.ok(a.opts.n >= 5, `${u.id} ${a.label} の問題数`);
    for (const x of j.insights || []) assert.equal(x.reviewed, false, '見立ての文面は下書き');
    for (const r of j.review || []) assert.equal(r.reviewed, false, '思い出し問題は下書き');
    assert.ok((j.demo || []).length >= 3, `${u.id} の見本の記録`);
  }
});
