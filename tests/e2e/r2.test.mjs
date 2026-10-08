// N1：R2「はこの形」の全ボタンを実際に押して、状態が変わることを確かめる（iPad横）。
// iPad横（1180×820）とスマホ縦（390×844）で、各タブの画面が収まることを確かめる。
import test from 'node:test';
import assert from 'node:assert/strict';
import { startAll, openPage } from './harness.mjs';
import { crawlUnit } from './crawl.mjs';

let env;
test.before(async () => { env = await startAll(); });
test.after(async () => { await env.close(); });

const longPress = async (h, sel) => {
  const b = await h.page.locator(sel).boundingBox();
  await h.page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await h.page.mouse.down(); await h.page.waitForTimeout(2200); await h.page.mouse.up();
  await h.page.waitForTimeout(200);
};

export async function r2Flow(h) {
  const { page } = h;
  await h.look();
  for (const u of ['r1', 'r4', 'r5a', 'r5b', 'r6', 'rj']) if (await page.locator(`[data-unit="${u}"].soon`).count()) await h.click(`data-unit=${u}|`);   // じゅんび中 → 「つぎに できるよ」
  await h.click('id=homeMissionBtn|'); await h.click('id=msClose|');
  // ミッションの「やる」から単元へ（日がわりの つくる・ためす）
  await h.click('id=homeMissionBtn|');
  const rot = (await page.evaluate(() => [...document.querySelectorAll('#msBody [data-go]')].map(b => b.dataset.go))).find(g => g !== 'review' && g !== 'tamesu');
  await h.click(`data-go=${rot}|`); await page.waitForTimeout(500); await h.click('id=homeBtn|');
  await h.click('id=homeMissionBtn|'); await h.click('data-go=tamesu|'); await page.waitForTimeout(500); await h.click('id=homeBtn|');
  await h.click('id=homeParentBtn|');
  await longPress(h, '#homeParentBtn'); h.clicked.set('id=homeParentBtn|', true);
  await h.until(() => !document.getElementById('parentSheet').hidden);
  await h.click('id=prClose|');
  await h.click('data-unit=r2|');

  // みる
  await h.until(() => /つぎは/.test(document.getElementById('caption').textContent), null, 30000);
  await h.click('data-k=again|');
  await page.waitForTimeout(500);
  // 音
  await h.click('id=soundBtn|'); await h.click('id=soundBtn|');
  // さわる
  await h.click('data-mode=sawaru|');
  await page.waitForTimeout(500);
  if (await page.locator('[data-k="say-caption"]').isVisible()) await h.click('data-k=say-caption|');
  await h.click('data-count=face|'); await h.until(() => /めんは/.test(document.getElementById('counter').textContent), null, 20000);
  await h.click('data-count=edge|'); await h.until(() => /へんは/.test(document.getElementById('counter').textContent), null, 20000);
  await h.click('data-count=vertex|'); await h.until(() => /ちょうてんは/.test(document.getElementById('counter').textContent), null, 20000);
  await h.click('data-k=next|'); await h.idle();
  await page.locator('#foldSlider').fill('100'); await h.idle();
  const before = await h.sig();
  await h.tapAt('T.facePoint(0)'); await page.waitForTimeout(400);
  assert.notEqual(await h.sig(), before, '面のタッチで向かい合う面が光る');
  await h.click('data-solid=r2-cuboid|'); await h.idle();
  await h.click('data-count=edge|'); await h.until(() => /4ほん/.test(document.getElementById('toast').textContent), null, 25000);
  await h.click('data-solid=cube|');
  await h.click('data-mode=miru|'); await page.waitForTimeout(300);
  // ためす（はこに なるかな）
  await h.click('data-mode=tamesu|');
  await h.until(() => window.__katachi.test() && window.__katachi.test().state());
  await h.click('data-level=easy|'); await h.click('data-level=challenge|');
  await page.waitForTimeout(300);
  if (await page.locator('[data-k="say-q"]').isVisible()) await h.click('data-k=say-q|');
  for (let guard = 0; guard < 12; guard++) {
    const st = await h.test('T.state()');
    if (!st) break;
    if (st.i === 0) { await h.click('data-k=hint|'); await h.click('data-k=hint|'); await h.idle(); await h.click('data-k=hint|'); await h.idle(); await h.click('data-k=hint|'); }
    if (st.type === 'opp') {
      await h.until(() => window.__katachi.test().state().phase === 'ask');
      const face = st.opposite[st.star];
      await h.tapAt('T.facePoint(a0)', face);
    } else await h.click(st.valid ? 'data-ans=1|' : 'data-ans=0|');
    await h.until(() => window.__katachi.test().state().phase === 'done', null, 20000);
    if (st.i === st.n - 1) { await h.click('data-k=next|'); break; }
    await h.click('data-k=next|');
  }
  await h.until(() => /せいかい/.test(document.querySelector('[data-k="score"]').textContent));
  await h.click('data-k=again|');
  // ためす（6まいで はこ？）
  await h.click('data-act=1|');
  await h.until(() => window.__katachi.test() && window.__katachi.test().state());
  await h.click('data-level=normal|'); await h.click('data-level=easy|');
  for (let guard = 0; guard < 8; guard++) {
    const st = await h.test('T.state()');
    if (st.i === 0) { await h.click('data-k=hint|'); await h.click('data-k=hint|'); await h.click('data-k=hint|'); await h.click('data-k=hint|'); }
    await h.click(st.valid ? 'data-ans=1|' : 'data-ans=0|');
    await h.until(() => window.__katachi.test().state().phase === 'done', null, 20000);
    if (st.i === st.n - 1) { await h.click('data-k=next|'); break; }
    await h.click('data-k=next|');
  }
  await h.click('data-k=again|');
  await h.click('data-act=0|'); await page.waitForTimeout(300);
  // つくる（うつしとる）
  await h.click('data-mode=tsukuru|');
  if ((await page.locator('[data-act="0"]').getAttribute('aria-pressed')) !== 'true') await h.click('data-act=0|');
  await h.until(() => window.__katachi.test() && window.__katachi.test().state && window.__katachi.test().state().phase === 'stamp');
  for (let guard = 0; guard < 20; guard++) {
    const st = await h.test('T.state()');
    if (st.phase !== 'stamp') break;
    const vis = await h.test('T.visibleSides()');
    if (!vis.length) { await h.click('data-k=roll|'); await h.until(() => !window.__katachi.test().state().busy); continue; }
    await h.tapAt('T.sidePoint(a0)', vis[0]);
    await h.until(() => !window.__katachi.test().state().busy, null, 15000);
  }
  if ((await h.test('T.state()')).phase === 'stamp') throw new Error('うつしとる が終わらない');
  const stamps = await h.test('T.stamps()');
  const key = s => s.dims.join('x');
  // まちがった組を1回、そのあと正しい組を3つ
  const wrongB = stamps.find(s => key(s) !== key(stamps[0]));
  await h.tapAt('T.stampPoint(a0)', 0); await h.tapAt('T.stampPoint(a0)', wrongB.i); await h.until(() => !window.__katachi.test().state().busy);
  const done = new Set();
  for (const s of stamps) {
    if (done.has(s.i)) continue;
    const t = stamps.find(x => x.i !== s.i && !done.has(x.i) && key(x) === key(s));
    await h.tapAt('T.stampPoint(a0)', s.i); await h.tapAt('T.stampPoint(a0)', t.i);
    await h.until(() => !window.__katachi.test().state().busy, null, 15000);
    done.add(s.i); done.add(t.i);
  }
  await h.until(() => !document.querySelector('[data-k="assemble"]').hidden, null, 15000);
  await h.click('data-k=assemble|');
  await h.until(() => window.__katachi.test().state().phase === 'done', null, 30000);
  await h.click('data-k=reset|');
  // ほねぐみ
  await h.click('data-act=1|');
  await h.until(() => window.__katachi.test() && window.__katachi.test().edges);
  await h.click('data-t=W|'); await h.click('data-t=H|'); await h.click('data-t=L|');
  const edges = await h.test('T.edges()');
  const wrong = edges.find(e => e.type !== 'L');
  let before2 = await h.sig(); await h.tapAt('T.edgePoint(a0)', wrong.i); await page.waitForTimeout(300); assert.notEqual(await h.sig(), before2);
  for (const t of ['L', 'W', 'H']) {
    const tb = await page.locator(`[data-t="${t}"]`); if (await tb.isEnabled() && (await tb.getAttribute('aria-pressed')) !== 'true') await tb.click();
    for (const e of edges.filter(x => x.type === t)) { await h.tapAt('T.edgePoint(a0)', e.i); await page.waitForTimeout(260); }
  }
  await h.until(() => window.__katachi.test().state().done, null, 15000);
  await h.click('data-k=reset|');
  await h.click('data-act=0|'); await h.click('data-act=2|');
  // はこを えらぶ
  await h.click('data-act=2|');
  await h.until(() => window.__katachi.test() && window.__katachi.test().cards);
  const cards = await h.test('T.cards()'), target = await h.test('T.target()');
  const need = [[target[0], target[1]], [target[0], target[1]], [target[0], target[2]], [target[0], target[2]], [target[1], target[2]], [target[1], target[2]]].map(([a, b]) => [Math.max(a, b), Math.min(a, b)].join('x'));
  const pick = [], pool = cards.map(c => ({ ...c, k: c.dims.join('x') }));
  for (const n of need) { const c = pool.find(x => x.k === n && !pick.includes(x.i)); pick.push(c.i); }
  const others = pool.filter(c => !pick.includes(c.i)).map(c => c.i);
  // まず まちがった6枚
  for (const i of [...pick.slice(0, 5), others[0]]) await h.tapAt('T.cardPoint(a0)', i);
  await h.click('data-k=build|');
  await h.until(() => window.__katachi.test().state().built && !document.querySelector('[data-k="again"]').hidden, null, 20000);
  await h.click('data-k=again|');
  await h.until(() => window.__katachi.test().state().picked === 0);
  const cards2 = await h.test('T.cards()'), target2 = await h.test('T.target()');
  const need2 = [[target2[0], target2[1]], [target2[0], target2[1]], [target2[0], target2[2]], [target2[0], target2[2]], [target2[1], target2[2]], [target2[1], target2[2]]].map(([a, b]) => [Math.max(a, b), Math.min(a, b)].join('x'));
  const pick2 = [];
  for (const n of need2) { const c = cards2.find(x => x.dims.join('x') === n && !pick2.includes(x.i)); pick2.push(c.i); }
  await h.tapAt('T.cardPoint(a0)', pick2[0]); await h.click('data-k=clear|');
  for (const i of pick2) await h.tapAt('T.cardPoint(a0)', i);
  await h.click('data-k=build|');
  await h.until(() => /できた/.test(document.getElementById('toast').textContent), null, 20000);
  if (await page.locator('[data-k="say-toast"]').isVisible()) await h.click('data-k=say-toast|');
  // てんかいず
  await h.click('data-act=3|');
  await h.until(() => window.__katachi.test() && window.__katachi.test().cellPoint);
  await h.click('data-k=hint|'); await h.click('data-k=hint|'); await h.click('data-k=hint|'); await h.click('data-k=hint|');
  for (const [x, z] of [[0, 0], [1, 0], [2, 0]]) await h.tapAt('T.cellPoint(a0, a1)', x, z);
  await h.click('data-k=clear2|');
  // 箱にならない形（2×3）
  for (const [x, z] of [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]) await h.tapAt('T.cellPoint(a0, a1)', x, z);
  await h.tapAt('T.cellPoint(a0, a1)', 4, 4); // 7まいめ → 「6まいまで」
  await h.click('data-k=build|');
  await h.until(() => window.__katachi.test().state().state === 'done', null, 20000);
  await h.click('data-k=redo|');
  await h.until(() => window.__katachi.test().state().state === 'edit', null, 20000);
  await h.click('data-k=build|');
  await h.until(() => window.__katachi.test().state().state === 'done', null, 20000);
  await h.click('data-k=new|');
  await h.until(() => window.__katachi.test().state().state === 'edit', null, 20000);
  // 箱になる形（No.2）
  for (const [x, z] of [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]]) await h.tapAt('T.cellPoint(a0, a1)', x, z);
  await h.click('data-k=build|');
  await h.until(() => window.__katachi.test().state().state === 'done', null, 20000);
  await h.click('data-k=paper|');
  await h.click('id=pPrint|');
  const dl = h.page.waitForEvent('download', { timeout: 15000 });
  await h.click('id=pSave|'); await dl;
  await h.click('id=pDone|');
  await h.click('data-k=paper|'); await h.click('id=pClose|');
  // ずかん
  await h.click('data-mode=zukan|');
  await h.click((id, t) => id.startsWith('data-no') && t.includes('No.2'));   // → さわる で再生
  await h.until(() => document.querySelector('[data-mode="sawaru"]').getAttribute('aria-selected') === 'true');
  await h.click('data-mode=zukan|');
  await h.click('id=zGo|');
  await h.click('data-mode=zukan|'); await h.click('id=zClose|');
  // ミッション（思い出し問題）
  await h.click('id=missionBtn|');
  await h.click('data-go=review|');
  if (await page.locator('#rSay').isVisible()) await h.click('id=rSay|');
  for (let i = 0; i < 3; i++) {
    const has = await page.locator('[data-ch="0"]').count(); if (!has) break;
    await h.click('data-ch|', { expectChange: true });
    await page.waitForTimeout(2000);
  }
  await h.look();
  const go = (await page.evaluate(() => [...document.querySelectorAll('#msBody [data-go]')].map(b => b.dataset.go)));
  if (go.includes('tamesu')) { await h.click('data-go=tamesu|'); await h.click('id=missionBtn|'); }
  const go2 = (await page.evaluate(() => [...document.querySelectorAll('#msBody [data-go]')].map(b => b.dataset.go))).filter(g => g !== 'review' && g !== 'tamesu');
  if (go2.length) { await h.click(`data-go=${go2[0]}|`); await h.click('id=missionBtn|'); }
  if (await page.locator('#msBody [data-go="review"]').count()) { await h.click('data-go=review|'); await h.click('id=msClose|'); } else await h.click('id=msClose|');
  // おうちのひとへ（短く押す → 案内、2秒長押し → 開く）
  await h.click('id=parentBtn|');
  await longPress(h, '#parentBtn'); h.clicked.set('id=parentBtn|', true);
  await h.until(() => !document.getElementById('parentSheet').hidden);
  await h.click('data-read=0|'); await h.click('data-read=1|');
  await h.click('data-motion=less|'); await h.click('data-motion=full|');
  await h.click('data-ahead=0|'); await h.click('data-ahead=1|');
  await page.selectOption('#sLimit', '15'); await page.selectOption('#sLevel', 'easy');
  await h.click('id=nAdd|');                    // 名前なし → 入力欄の案内
  await page.fill('#nName', 'たろう'); await h.click('id=nAdd|');
  const dl2 = h.page.waitForEvent('download', { timeout: 15000 });
  await h.click('id=xSave|'); await dl2;
  await h.click('id=xDemo|');
  await h.click((id, t) => id.startsWith('data-pid') && t.includes('たろう'));
  await h.click('id=xDel|'); await h.click('id=dNo|');
  await h.click('id=xDel|'); await h.click('id=dYes|');
  await h.page.setInputFiles('#xFile', { name: 'k.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'katachi-lab', v: 1, profiles: [{ id: 'pz', name: 'ぜっと', grade: 2, color: '#e5654b' }], data: {} })) });
  await h.until(() => document.getElementById('xYes'));
  await h.click('id=xNo|');
  await h.page.setInputFiles('#xFile', { name: 'k.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'katachi-lab', v: 1, profiles: [{ id: 'pz', name: 'ぜっと', grade: 2, color: '#e5654b' }], data: {} })) });
  await h.until(() => document.getElementById('xYes'));
  await h.click('id=xYes|');
  h.clicked.set('for=xFile|', true);   // ファイル選択の窓は setInputFiles で代わりに操作した
  await h.click('id=prClose|');
  await h.click('id=homeMissionBtn|', { expectChange: true }).catch(async () => { await h.click('id=homeBtn|'); });
}

test('R2 の全ボタンを押すと、すべて状態が変わる（iPad横 1180×820）', { timeout: 600000 }, async () => {
  const h = await openPage(env, 'ipad', { speed: 0.25 });
  try {
    await r2Flow(h);
    if (!(await h.page.locator('#home').isVisible())) { await h.page.locator('#msClose').isVisible() && await h.click('id=msClose|'); await h.click('id=homeBtn|'); }
    const rep = h.report();
    console.log('R2 ボタン', JSON.stringify(rep));
    assert.deepEqual(rep.dead, [], '押しても何も起きないボタン');
    // 棚の中のボタンの押しもれは、下の「巡回」のテストで確かめる。ここでは棚の外（地図・帯・シート）を見る
    assert.deepEqual(rep.never.filter(id => !/^r\d\w*:/.test(id) && !id.startsWith('data-unit=')), [], '見えたのに押していないボタン');
    assert.ok(rep.clicked >= 60, 'ボタンの数');
    assert.deepEqual(h.errors, [], 'コンソールのエラー');
  } finally { await h.shot('r2-last'); await h.context.close(); }
});

test('R2 の棚のボタンを汎用の巡回で全部押す（iPad横）', { timeout: 900000 }, async () => {
  const h = await openPage(env, 'ipad', { speed: 0.25 });
  try {
    await crawlUnit(h, 'r2');
    const rep = h.report();
    const never = rep.never.filter(id => id.startsWith('r2:'));
    console.log('R2 巡回', JSON.stringify({ clicked: rep.clicked, changed: rep.changed, dead: rep.dead, never }));
    assert.deepEqual(rep.dead, []); assert.deepEqual(never, []); assert.deepEqual(h.errors, []);
  } finally { await h.context.close(); }
});

for (const vp of ['ipad', 'phone']) {
  test(`R2 の各タブが画面に収まる（${vp}）`, { timeout: 240000 }, async () => {
    const h = await openPage(env, vp, { speed: 0.2, query: 'unit=r2' });
    try {
      const out = [];
      await h.until(() => /つぎは/.test(document.getElementById('caption').textContent), null, 30000);
      out.push(await h.fit('みる')); await h.shot('r2-miru');
      const acts = { sawaru: 1, tamesu: 2, tsukuru: 4 };
      for (const [m, n] of Object.entries(acts)) for (let a = 0; a < n; a++) {
        await h.page.evaluate(([m, a]) => window.__katachi.setMode(m, { act: a }), [m, a]);
        await h.page.waitForTimeout(900);
        out.push(await h.fit(`${m}-${a}`)); await h.shot(`r2-${m}-${a}`);
      }
      const bad = out.filter(o => !o.ok);
      assert.deepEqual(bad.map(b => `${b.label}: ${b.probs.join(' / ')}`), []);
      assert.deepEqual(h.errors, []);
    } finally { await h.context.close(); }
  });
}
