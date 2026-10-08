// N7：単元を足す方法の確認。試しの単元 JSON（部品の組み合わせだけ）を app/units/ に置き、地図の定義に1行足すと、
// 部品を新しく作らずに地図に出て、全ボタンが動く。確かめたら消す（ファイルは元に戻す）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync } from 'node:fs';
import { startAll, openPage } from './harness.mjs';
import { crawlUnit } from './crawl.mjs';

const U = new URL('../../app/units/', import.meta.url), P = new URL('../../app/parts/', import.meta.url);
let env;
test.before(async () => { env = await startAll(); });
test.after(async () => { await env.close(); });

test('試しの単元を JSON 1つと地図の1行で足すと、部品の新設なしに地図に出て、全ボタンが動く', { timeout: 900000 }, async () => {
  const idxPath = new URL('index.json', U), idxOrig = readFileSync(idxPath, 'utf8'), partsBefore = readdirSync(P).sort();
  const trial = {
    note: '試しの単元（N7 の確認用。確かめたら消す）。既存の部品の組み合わせだけで作る。',
    school: '試しの単元',
    tabs: {
      miru: [{ part: 'miru-solids', label: 'きりひらく', opts: { mode: 'cut', solids: [{ solid: 'tri-prism', label: 'さんかくちゅう' }] } }],
      sawaru: [{ part: 'fold-explore', label: 'さわる', opts: { solids: [{ key: 'tri-prism', label: 'さんかくちゅう', src: 'catalog', solid: 'tri-prism' }], tools: ['count', 'next'] } }],
      tamesu: [{ part: 'count-quiz', label: 'かず', opts: { solids: [{ gen: { prism: 3 } }, { gen: { prism: 4 } }], levels: { easy: [[0, 'face']], normal: [[0, 'vertex'], [1, 'edge']], challenge: [[1, 'vertex']] } } }],
      tsukuru: [{ part: 'net-build-cards', label: 'てんかいず', opts: { solids: [{ key: 'tri-prism', label: 'さんかくちゅう', solid: 'tri-prism' }] } }],
    },
    zukan: [{ id: 'tri-prism', kind: 'catalog', solid: 'tri-prism', total: 9, label: 'さんかくちゅう', title: 'さんかくちゅう', go: { mode: 'tsukuru', act: 0 }, play: { mode: 'sawaru', act: 0 } }],
    review: [], insights: [], praises: [], map: [], labels: {},
  };
  try {
    writeFileSync(new URL('rx.json', U), JSON.stringify(trial, null, 1));
    const idx = JSON.parse(idxOrig);
    idx.units.push({ id: 'rx', grade: 5, band: 'ahead', file: 'rx.json', ready: true, title: 'ためしの たんげん', plain: '試しの単元', requires: [] });
    writeFileSync(idxPath, JSON.stringify(idx, null, 1));
    const h = await openPage(env, 'ipad', { speed: 0.25 });
    try {
      await h.page.waitForSelector('[data-unit="rx"]');
      await crawlUnit(h, 'rx');
      const rep = h.report(), never = rep.never.filter(id => id.startsWith('rx:'));
      console.log('試しの単元', JSON.stringify({ clicked: rep.clicked, changed: rep.changed, dead: rep.dead, never }));
      assert.deepEqual(rep.dead, []); assert.deepEqual(never, []); assert.deepEqual(h.errors, []);
    } finally { await h.context.close(); }
    assert.deepEqual(readdirSync(P).sort(), partsBefore, '部品（app/parts）を新しく作らずに済んだ');
  } finally {
    writeFileSync(idxPath, idxOrig);
    if (existsSync(new URL('rx.json', U))) unlinkSync(new URL('rx.json', U));
  }
  assert.equal(readFileSync(idxPath, 'utf8'), idxOrig, '地図の定義は元に戻した');
  assert.ok(!existsSync(new URL('rx.json', U)), '試しの単元は消した');
});
