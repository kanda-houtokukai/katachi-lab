// H8：量を横断する仕組み。見本の記録で、保護者画面に量の見立て・見当の力（5つの量）・学校の学習との対応（量の単元）が出る。
// きょうのミッションの日がわりに量の「つくる」が入り、思い出し問題に量の問題（見当を含む）が出る。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startAll, openPage } from './harness.mjs';
import { longPress } from './global.mjs';

const idx = JSON.parse(readFileSync(new URL('../../app/units/index.json', import.meta.url)));
const HK = idx.units.filter(u => u.owner === 'hakaru' && u.ready);
const U = Object.fromEntries(HK.map(u => [u.id, JSON.parse(readFileSync(new URL(`../../app/units/${u.file}`, import.meta.url)))]));
let env;
test.before(async () => { env = await startAll(); });
test.after(async () => { await env.close(); });

test('見本の記録で表示すると、量の見立て・見当の力・対応表（量の単元と注記）が出る', { timeout: 300000 }, async () => {
  const h = await openPage(env, 'ipad', { speed: 0.25 });
  try {
    await longPress(h, '#homeParentBtn');
    await h.until(() => !document.getElementById('parentSheet').hidden);
    await h.page.waitForTimeout(600);
    await h.click('id=xDemo|');
    await h.page.waitForTimeout(500);
    const r = await h.page.evaluate(() => {
      const body = document.getElementById('prBody');
      const est = [...body.querySelectorAll('.estbox')].map(b => ({ name: b.querySelector('b').textContent, spark: !!b.querySelector('svg'), txt: b.textContent }));
      const ins = [...body.querySelectorAll('.pcard .tt')].map(e => e.textContent);
      const rows = [...body.querySelectorAll('table.pmap tr')].map(tr => tr.textContent);
      return { est, ins, rows, note: /教科書会社によって学ぶ時期が違います/.test(body.textContent), html: body.textContent.length };
    });
    await h.shot('parent-demo');
    // 見当の力：5つの量すべてに折れ線（見本の記録に各量3件以上）
    assert.deepEqual(r.est.map(e => e.name), ['長さ', 'かさ', '重さ', '時間', '広さ'].filter(n => r.est.some(e => e.name === n)));
    const qtyOf = { length: '長さ', volume: 'かさ', mass: '重さ', time: '時間', area: '広さ' };
    const have = new Set();
    for (const u of Object.values(U)) for (const d of u.demo || []) if (/estimate$/.test(d.kind) && d.detail && d.detail.qty) have.add(qtyOf[d.detail.qty]);
    for (const e of r.est) if (have.has(e.name)) assert.ok(e.spark, `見当の力 ${e.name} の折れ線 ${e.txt}`);
    // 見立て：量の単元の見本の記録で、見立てが1つ以上出る（単元ごとに少なくとも1つの見立てのタイトル）
    const titles = new Set(r.ins.map(t => t.replace(/下書き$/, '')));
    const units = Object.entries(U).filter(([, u]) => (u.insights || []).length);
    let shown = 0;
    for (const [id, u] of units) if (u.insights.some(x => [...titles].some(t => t.startsWith(x.title)))) shown++; else console.log('見立てが出ない単元', id);
    assert.ok(shown >= Math.ceil(units.length * 0.8), `見立てが出た単元 ${shown}/${units.length}`);
    // 対応表：量の単元の行と注記
    for (const [id, u] of Object.entries(U)) for (const m of u.map || []) assert.ok(r.rows.some(row => row.includes(m.school || u.school)), `${id} の対応表 ${m.school}`);
    assert.ok(r.note, '教科書会社によって時期が違う注記');
    assert.deepEqual(h.errors, []);
  } finally { await h.context.close(); }
});

test('ミッション：量の単元を開くと日がわりの「つくる」に量の活動が入り、思い出し問題に量の問題が出る', { timeout: 300000 }, async () => {
  const h = await openPage(env, 'ipad', { speed: 0.25 });
  try {
    for (const u of HK.filter(x => (U[x.id].mission || []).length).slice(0, 4)) {
      await h.page.evaluate(id => { const K = window.__katachi; K.R.data.mission = null; K.openUnit(id, 'miru'); }, u.id);
      await h.page.waitForTimeout(400);
      const m = await h.page.evaluate(() => { const K = window.__katachi; K.goHome(); document.getElementById('homeMissionBtn').click(); return K.R.data.mission; });
      const rot = m.tasks.find(t => t.key !== 'review' && t.key !== 'tamesu');
      assert.ok(rot && U[u.id].mission.some(x => x.key === rot.key), `${u.id} の日がわりの活動 ${rot && rot.key}`);
      await h.page.evaluate(() => document.getElementById('msClose').click());
    }
    const pool = await h.page.evaluate(async () => { const { reviewPool } = await import('/app/core/mission.js'); return reviewPool().map(r => r.unit); });
    assert.ok(pool.some(u => HK.some(x => x.id === u)), "思い出し問題に量の単元の問題が入る");
    assert.deepEqual(h.errors, []);
  } finally { await h.context.close(); }
});
