// N7：オフライン。一度開いたあと（service worker が全ファイルを事前キャッシュ）、ネットを切って再読み込みしても動く。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startAll, openPage } from './harness.mjs';

let env;
test.before(async () => { env = await startAll(); });
test.after(async () => { await env.close(); });

test('一度開いたあと、ネットを切って再読み込みしても、地図・単元・3D・展開図カタログが動く', { timeout: 300000 }, async () => {
  const pc = JSON.parse(readFileSync(new URL('../../precache.json', import.meta.url)));
  const h = await openPage(env, 'ipad', { sw: true, speed: 0.25 });
  try {
    // service worker が有効になり、事前キャッシュがそろうまで待つ
    const probe = () => h.page.evaluate(async () => { if (!navigator.serviceWorker.controller) return null; const ks = await caches.keys(); const k = ks.find(x => x.startsWith('katachi-') && x !== 'katachi-fonts'); return k ? { key: k, n: (await (await caches.open(k)).keys()).length } : null; });
    let cached = null;
    for (let t = 0; t < 120 && !(cached && cached.n >= pc.files.length); t++) { await h.page.waitForTimeout(500); cached = await probe(); }
    assert.equal(cached.key, 'katachi-' + pc.version, 'キャッシュの版');
    assert.equal(cached.n, pc.files.length, '事前キャッシュの件数');
    await h.context.setOffline(true);
    h.errors.length = 0;
    await h.page.reload();
    await h.page.waitForFunction(() => window.__katachi && window.__katachi.A && window.__katachi.A.byId.size > 0, null, { timeout: 30000 });
    const ready = await h.page.evaluate(() => [...window.__katachi.A.byId.keys()]);
    assert.ok(ready.length >= 7, '単元がすべて読める');
    // 単元を開き、カタログ（data/nets）を使う画面も動く
    for (const [u, m, a] of [['r2', 'miru', 0], ['r4', 'sawaru', 0], ['r5a', 'tsukuru', 0], ['rj', 'sawaru', 0], ['r1', 'tamesu', 0]]) {
      await h.page.evaluate(([u, m, a]) => window.__katachi.openUnit(u, m, { act: a }), [u, m, a]);
      await h.page.waitForTimeout(2500);
      const st = await h.page.evaluate(() => ({ ok: window.__katachi.S.ok, n: window.__katachi.S.stage.children.length, mode: window.__katachi.A.mode }));
      assert.ok(st.ok && st.n > 0, `${u} ${m} の 3D`);
      await h.shot(`offline-${u}`);
    }
    // 量の単元（2D の舞台・基準物・ずかん）もネットなしで動く
    const hk = JSON.parse(readFileSync(new URL('../../app/units/index.json', import.meta.url))).units.filter(u => u.owner === 'hakaru' && u.ready).map(u => u.id);
    for (const u of hk) {
      await h.page.evaluate(u => window.__katachi.openUnit(u, 'sawaru', { act: 0 }), u);
      await h.page.waitForTimeout(1500);
      const st = await h.page.evaluate(() => ({ flat: document.getElementById('flat').childElementCount, mode: window.__katachi.A.mode }));
      assert.ok(st.flat > 0, `${u} の 2D の舞台`);
      await h.page.evaluate(() => window.__katachi.setMode('zukan'));
      await h.page.waitForTimeout(500);
      assert.ok(await h.page.evaluate(() => !document.getElementById('zukanSheet').hidden && document.getElementById('zBody').textContent.length > 0), `${u} のずかん`);
      await h.page.evaluate(() => document.getElementById('zClose').click());
    }
    const bn = await h.page.evaluate(async () => (await (await fetch('data/benchmarks.json')).json()).items.length);
    assert.ok(bn >= 30, '基準物がネットなしで読める');
    // 字体（Google Fonts）は外から読むので、オフラインでは読めない（端末の丸ゴシックに落ちる）。それ以外のエラーがないこと
    const errs = h.errors.filter(e => !/fonts\.(googleapis|gstatic)\.com|ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e));
    assert.deepEqual(errs, []);
  } finally { await h.context.close(); }
});
