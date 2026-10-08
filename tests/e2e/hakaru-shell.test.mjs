// H1：入口の地図（入口 6つ → 単元）と 2D の舞台。入口から全単元に届く・2D の舞台が上の帯と下の棚のあいだに収まる。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startAll, openPage } from './harness.mjs';

const idx = JSON.parse(readFileSync(new URL('../../app/units/index.json', import.meta.url)));
const areas = JSON.parse(readFileSync(new URL('../../app/units/areas.json', import.meta.url))).areas;
let env;
test.before(async () => { env = await startAll(); });
test.after(async () => { await env.close(); });

test('入口6つから全単元（26）に届く。入口から戻れる。じゅんび中の単元は案内が出る', { timeout: 300000 }, async () => {
  const h = await openPage(env, 'ipad', { speed: 0.25 });
  try {
    const doors = await h.page.evaluate(() => [...document.querySelectorAll('#map [data-area]')].map(b => b.dataset.area));
    assert.deepEqual(doors, areas.map(a => a.id));
    const reached = new Set();
    for (const a of areas) {
      await h.click(`data-area=${a.id}|`);
      const us = await h.page.evaluate(() => [...document.querySelectorAll('#map [data-unit]')].map(b => b.dataset.unit));
      assert.deepEqual(new Set(us), new Set(idx.units.filter(u => u.areas.includes(a.id)).map(u => u.id)), a.id + ' の単元');
      us.forEach(u => reached.add(u));
      await h.shot('area-' + a.id);
      await h.click('id=areaBack|');
    }
    assert.equal(reached.size, idx.units.length, '全単元に届く');
    // 単元を開いて地図に戻ると、その単元の入口が開いている
    await h.click('data-area=katachi|'); await h.click('data-unit=r2|'); await h.page.waitForTimeout(800);
    await h.click('id=homeBtn|');
    assert.equal(await h.page.evaluate(() => window.__katachi.A.area), 'katachi');
    assert.ok(await h.page.locator('[data-unit="r2"]').isVisible());
    assert.deepEqual(h.errors, []);
  } finally { await h.context.close(); }
});

for (const vp of ['ipad', 'phone']) {
  test(`2D の舞台が上の帯と下の棚のあいだに収まり、閉じると 3D に戻る（${vp}）`, { timeout: 120000 }, async () => {
    const h = await openPage(env, vp, { speed: 0.25, query: 'unit=r2' });
    try {
      await h.page.waitForTimeout(1200);
      const r = await h.page.evaluate(async () => {
        const { openFlat, flatFit, closeFlat } = await import('/app/stage/flat.js');
        const F = openFlat();
        const g = F.layer('probe'), NS = 'http://www.w3.org/2000/svg', rc = document.createElementNS(NS, 'rect');
        rc.setAttribute('x', 16); rc.setAttribute('y', F.top); rc.setAttribute('width', F.W - 32); rc.setAttribute('height', F.bottom - F.top); g.appendChild(rc);
        const fit = flatFit(), dock = document.getElementById('dock').getBoundingClientRect(), top = document.getElementById('topBar').getBoundingClientRect();
        const matHidden = !window.__katachi.S.matMesh.visible;
        closeFlat();
        return { fit, dockTop: dock.top, topBottom: top.bottom, matHidden, after: { hidden: document.getElementById('flat').hasAttribute('hidden'), mat: window.__katachi.S.matMesh.visible } };
      });
      assert.ok(r.fit && r.fit.flat, '2D の舞台の外接矩形');
      assert.ok(Math.abs(r.fit.minY - r.topBottom) <= 1, `上の帯の下から ${r.fit.minY} / ${r.topBottom}`);
      assert.ok(Math.abs(r.fit.maxY - r.dockTop) <= 1.5, `下の棚の上まで ${r.fit.maxY} / ${r.dockTop}`);
      assert.ok(r.matHidden, '開いている間は 3D のマットを隠す');
      assert.deepEqual(r.after, { hidden: true, mat: true });
      assert.deepEqual(h.errors, []);
    } finally { await h.context.close(); }
  });
}
