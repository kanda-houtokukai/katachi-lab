// service worker の事前キャッシュの一覧と版番号を作る。ファイルを足したり変えたりしたら必ず実行する。
// node tools/build-precache.mjs   （tests/unit/precache.test.mjs が一覧と版番号の古さを検出する）
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIRS = ['app', 'data', 'vendor', 'icons'];
const TOP = ['index.html', 'manifest.webmanifest'];

export function listFiles() {
  const out = [...TOP];
  const walk = d => { for (const n of readdirSync(join(ROOT, d)).sort()) { const p = join(d, n); if (n.startsWith('.')) continue; if (statSync(join(ROOT, p)).isDirectory()) walk(p); else out.push(p.split('\\').join('/')); } };
  DIRS.forEach(walk);
  return out;
}
export function versionOf(files) {
  const h = createHash('sha256');
  for (const f of files) { h.update(f); h.update(readFileSync(join(ROOT, f))); }
  return h.digest('hex').slice(0, 12);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const files = listFiles(), version = versionOf(files);
  writeFileSync(join(ROOT, 'precache.json'), JSON.stringify({ version, files: ['./', ...files] }, null, 1) + '\n');
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8').replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
  writeFileSync(join(ROOT, 'sw.js'), sw);
  console.log('precache', files.length, 'files, version', version);
}
