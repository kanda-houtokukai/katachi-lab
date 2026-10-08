// 単元ごとの E2E：棚の全ボタンを巡回して押す（すべて状態が変わる・押しもれ0・エラー0）＋ iPad横・スマホ縦で全活動が収まる。
// 対象は E2E_UNITS（例：r5a,r5b）。なければ地図で「ひらく」になっている単元のうち R2・R4 以外（R2・R4 は専用のテスト）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startAll, openPage } from './harness.mjs';
import { crawlUnit } from './crawl.mjs';

const idx = JSON.parse(readFileSync(new URL('../../app/units/index.json', import.meta.url)));
const UNITS = process.env.E2E_UNITS ? process.env.E2E_UNITS.split(',') : idx.units.filter(u => u.ready && !['r2', 'r4'].includes(u.id)).map(u => u.id);

let env;
test.before(async () => { env = await startAll(); });
test.after(async () => { await env.close(); });

for (const unit of UNITS) {
  test(`${unit} の棚のボタンを全部押すと、すべて状態が変わる（iPad横）`, { timeout: 1200000 }, async () => {
    const h = await openPage(env, 'ipad', { speed: 0.25 });
    try {
      await crawlUnit(h, unit);
      const rep = h.report(), never = rep.never.filter(id => id.startsWith(unit + ':'));
      console.log(unit, 'ボタン', JSON.stringify({ clicked: rep.clicked, changed: rep.changed, dead: rep.dead, never }));
      assert.deepEqual(rep.dead, []); assert.deepEqual(never, []); assert.deepEqual(h.errors, []);
    } finally { await h.shot(`${unit}-last`); await h.context.close(); }
  });
  for (const vp of ['ipad', 'phone']) {
    test(`${unit} の全活動が画面に収まる（${vp}）`, { timeout: 400000 }, async () => {
      const h = await openPage(env, vp, { speed: 0.2, query: 'unit=' + unit });
      try {
        const out = [];
        const tabs = await h.page.evaluate(u => Object.fromEntries(Object.entries(window.__katachi.A.byId.get(u).tabs).map(([k, v]) => [k, v.length])), unit);
        for (const [m, n] of Object.entries(tabs)) for (let a = 0; a < n; a++) {
          await h.page.evaluate(([m, a]) => window.__katachi.setMode(m, { act: a }), [m, a]);
          await h.page.waitForTimeout(2500);
          out.push(await h.fit(`${m}-${a}`)); await h.shot(`${unit}-${m}-${a}`);
        }
        assert.deepEqual(out.filter(o => !o.ok).map(b => `${b.label}: ${b.probs.join(' / ')}`), []);
        assert.deepEqual(h.errors, []);
      } finally { await h.context.close(); }
    });
  }
}
