// H9：量の単元を足す方法の確認。試しの量の単元 JSON（既存の量の部品の組み合わせだけ）と index.json の1行で、
// 部品を新設せずに入口に出て、全ボタンが動く。確かめたら消す（ファイルは元に戻す）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync } from 'node:fs';
import { startAll, openPage } from './harness.mjs';
import { crawlUnit } from './crawl.mjs';

const U = new URL('../../app/units/', import.meta.url), P = new URL('../../app/parts/', import.meta.url);
let env;
test.before(async () => { env = await startAll(); });
test.after(async () => { await env.close(); });

test('試しの量の単元を JSON 1つと index.json の1行で足すと、部品の新設なしに入口に出て、全ボタンが動く', { timeout: 900000 }, async () => {
  const idxPath = new URL('index.json', U), idxOrig = readFileSync(idxPath, 'utf8'), partsBefore = readdirSync(P).sort();
  const trial = {
    note: '試しの量の単元（H9 の確認用。確かめたら消す）。既存の量の部品の組み合わせだけで作る。',
    school: '試しの量の単元',
    tabs: {
      miru: [{ part: 'tokei', label: 'みる', opts: { mode: 'miru', script: 't1' } }],
      sawaru: [{ part: 'tokei', label: 'はりを まわす', opts: { mode: 'hand' } }],
      tamesu: [{ part: 'tokei-quiz', label: 'あわせる', opts: { type: 'set' } }, { part: 'mitoshi', label: 'みとおし', opts: { items: [{ q: 'なんびょう？', qty: 'time', unit: 'びょう', range: [3, 8], max: 10, step: 1, major: 5, minor: 1 }] } }],
      tsukuru: [{ part: 'byou', label: '10びょう あて', opts: { mode: 'guess', target: 10 } }],
    },
    zukan: [{ id: 'hx-guess', kind: 'log', label: 'きろく', title: 'きろく', fmt: '{1}→{2}' }],
    review: [], insights: [], praises: [], map: [], labels: {},
  };
  try {
    writeFileSync(new URL('hx.json', U), JSON.stringify(trial, null, 1));
    const idx = JSON.parse(idxOrig);
    idx.units.push({ id: 'hx', grade: 2, band: 'main', file: 'hx.json', ready: true, title: 'ためしの たんげん', plain: '試しの量の単元', requires: [], areas: ['jikan'], owner: 'hakaru' });
    writeFileSync(idxPath, JSON.stringify(idx, null, 1));
    const h = await openPage(env, 'ipad', { speed: 0.25 });
    try {
      await h.page.waitForSelector('[data-area="jikan"]');
      await crawlUnit(h, 'hx');
      const rep = h.report(), never = rep.never.filter(id => id.startsWith('hx:'));
      console.log('試しの量の単元', JSON.stringify({ clicked: rep.clicked, changed: rep.changed, dead: rep.dead, never }));
      assert.deepEqual(rep.dead, []); assert.deepEqual(never, []); assert.deepEqual(h.errors, []);
    } finally { await h.context.close(); }
    assert.deepEqual(readdirSync(P).sort(), partsBefore, '部品（app/parts）を新しく作らずに済んだ');
  } finally {
    writeFileSync(idxPath, idxOrig);
    if (existsSync(new URL('hx.json', U))) unlinkSync(new URL('hx.json', U));
  }
  assert.equal(readFileSync(idxPath, 'utf8'), idxOrig, '地図の定義は元に戻した');
  assert.ok(!existsSync(new URL('hx.json', U)), '試しの単元は消した');
});
