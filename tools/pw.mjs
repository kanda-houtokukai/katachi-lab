// Playwright の読み込み。npm install はこの端末の設定で止めているため、
// 1) KATACHI_PW（playwright パッケージの場所） 2) このリポジトリの node_modules 3) ~/dev/yugure-no-sato の node_modules の順に探す。
// ブラウザは端末の Chrome（channel:'chrome'）を使う。
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const CANDIDATES = [process.env.KATACHI_PW, join(ROOT, 'node_modules/playwright'), join(homedir(), 'dev/yugure-no-sato/node_modules/playwright')].filter(Boolean);
export function loadPlaywright() {
  for (const c of CANDIDATES) if (existsSync(c)) return require(c);
  throw new Error('playwright が見つかりません。KATACHI_PW に playwright パッケージの場所を入れてください');
}
export async function launchChrome(opts = {}) {
  const pw = loadPlaywright();
  return pw.chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'], ...opts });
}
