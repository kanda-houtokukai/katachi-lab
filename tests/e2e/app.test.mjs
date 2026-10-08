// N7：全単元・全タブ・全ボタンを押す。見えたボタンの総数と、押して状態が変わった数を数え、差が0であることを確かめる。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { startAll, openPage } from './harness.mjs';
import { crawlUnit } from './crawl.mjs';
import { missionFlow, parentFlow, longPress, doorsFlow } from './global.mjs';

const idx = JSON.parse(readFileSync(new URL('../../app/units/index.json', import.meta.url)));
const UNITS = idx.units.filter(u => u.ready).map(u => u.id);
let env;
test.before(async () => { env = await startAll(); });
test.after(async () => { await env.close(); });

test('全単元・全タブ・全ボタン：見えたボタン＝押したボタン＝状態が変わったボタン（iPad横）', { timeout: 5400000 }, async () => {
  const h = await openPage(env, 'ipad', { speed: 0.25 });
  try {
    await h.look();
    for (const u of UNITS) {
      await crawlUnit(h, u);
      // 単元の中の上の帯：音・ミッション・おうちのひと
      if (u === UNITS[0]) {
        await h.click('id=soundBtn|'); await h.click('id=soundBtn|');
        await h.click('id=missionBtn|'); await h.click('id=msClose|');
        await h.click('id=parentBtn|'); await longPress(h, '#parentBtn'); h.clicked.set('id=parentBtn|', true);
        await h.until(() => !document.getElementById('parentSheet').hidden); await h.click('id=prClose|');
      }
      await h.click('id=homeBtn|');
    }
    await doorsFlow(h);
    await missionFlow(h, 'homeMissionBtn');
    await parentFlow(h, 'homeParentBtn');
    await h.look();
    const rep = h.report();
    const summary = { seen: rep.seen, clicked: rep.clicked, changed: rep.changed, diff: rep.seen - rep.changed, dead: rep.dead, never: rep.never };
    console.log('全ボタン', JSON.stringify(summary));
    writeFileSync(new URL('../../test-results/all-buttons.json', import.meta.url), JSON.stringify(summary, null, 1));
    assert.deepEqual(rep.dead, [], '押しても何も起きないボタン');
    assert.deepEqual(rep.never, [], '見えたのに押していないボタン');
    assert.equal(rep.seen - rep.changed, 0, 'ボタンの総数と状態が変わった数の差');
    assert.deepEqual(h.errors, []);
  } finally { await h.shot('app-last'); await h.context.close(); }
});
