// N2：R4「直方体と立方体」の全ボタン（汎用の巡回）と、iPad横・スマホ縦の収まり
import test from 'node:test';
import assert from 'node:assert/strict';
import { startAll, openPage } from './harness.mjs';
import { crawlUnit } from './crawl.mjs';

let env;
test.before(async () => { env = await startAll(); });
test.after(async () => { await env.close(); });

test('R4 の全ボタンを押すと、すべて状態が変わる（iPad横）', { timeout: 900000 }, async () => {
  const h = await openPage(env, 'ipad', { speed: 0.25 });
  try {
    await crawlUnit(h, 'r4');
    const rep = h.report();
    const mine = { ...rep, never: rep.never.filter(id => !id.startsWith('data-unit=') && !id.startsWith('data-area=') && id !== 'id=areaBack|' && !/^id=(home|homeMission|homeParent|mission|parent|sound)Btn/.test(id)) };
    console.log('R4 ボタン', JSON.stringify({ seen: rep.seen, clicked: rep.clicked, changed: rep.changed, dead: rep.dead, never: mine.never }));
    assert.deepEqual(rep.dead, []);
    assert.deepEqual(mine.never, []);
    assert.deepEqual(h.errors, []);
  } finally { await h.shot('r4-last'); await h.context.close(); }
});

for (const vp of ['ipad', 'phone']) {
  test(`R4 の各タブが画面に収まる（${vp}）`, { timeout: 300000 }, async () => {
    const h = await openPage(env, vp, { speed: 0.2, query: 'unit=r4' });
    try {
      const out = [];
      const tabs = await h.page.evaluate(() => Object.fromEntries(Object.entries(window.__katachi.A.byId.get('r4').tabs).map(([k, v]) => [k, v.length])));
      for (const [m, n] of Object.entries(tabs)) for (let a = 0; a < n; a++) {
        await h.page.evaluate(([m, a]) => window.__katachi.setMode(m, { act: a }), [m, a]);
        await h.page.waitForTimeout(2500);
        out.push(await h.fit(`${m}-${a}`)); await h.shot(`r4-${m}-${a}`);
      }
      assert.deepEqual(out.filter(o => !o.ok).map(b => `${b.label}: ${b.probs.join(' / ')}`), []);
      assert.deepEqual(h.errors, []);
    } finally { await h.context.close(); }
  });
}
