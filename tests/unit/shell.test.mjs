// N0：検索除け・外部読み込み・事前キャッシュの一覧
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { listFiles, versionOf } from '../../tools/build-precache.mjs';

const root = new URL('../../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');

test('全ページに noindex,nofollow、robots.txt は Disallow: /', () => {
  const pages = readdirSync(root).filter(f => f.endsWith('.html'));
  assert.ok(pages.length >= 1);
  for (const p of pages) assert.match(read(p), /<meta name="robots" content="noindex,nofollow">/, p);
  assert.match(read('robots.txt'), /User-agent: \*\s*\nDisallow: \/\s*$/);
});

test('外部から読み込むのは字体（Google Fonts）だけ（D3）', () => {
  const html = read('index.html');
  const urls = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map(m => m[1]);
  for (const u of urls) assert.match(u, /^https:\/\/fonts\.(googleapis|gstatic)\.com(\/|$)/, u);
  // アプリの JS が外部の URL を読まない
  for (const f of listFiles().filter(f => f.startsWith('app/') && f.endsWith('.js'))) {
    const s = read(f);
    assert.doesNotMatch(s, /fetch\(\s*['"`]https?:/, f);
    assert.doesNotMatch(s, /src\s*=\s*['"`]https?:/, f);
    assert.doesNotMatch(s, /import\s*\(?\s*['"`]https?:/, f);
  }
});

test('service worker の事前キャッシュが最新（ファイルを変えたら tools/build-precache.mjs を実行する）', () => {
  const files = listFiles(), pc = JSON.parse(read('precache.json'));
  assert.deepEqual(pc.files, ['./', ...files]);
  assert.equal(pc.version, versionOf(files));
  assert.match(read('sw.js'), new RegExp(`const VERSION = '${pc.version}';`));
});
