// 仮のアイコン（単純な箱の図形）を Canvas で描いて PNG にする。node tools/make-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchChrome } from './pw.mjs';

const OUT = new URL('../icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const browser = await launchChrome();
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
for (const [name, size, pad] of [['icon-192.png', 192, 0.16], ['icon-512.png', 512, 0.16], ['icon-maskable-512.png', 512, 0.26], ['apple-touch-icon.png', 180, 0.14]]) {
  const data = await page.evaluate(([size, pad]) => {
    const c = document.getElementById('c'); c.width = c.height = size;
    const g = c.getContext('2d'), s = size;
    g.fillStyle = '#2f6b57'; g.fillRect(0, 0, s, s);
    // 箱（立方体の見取図）
    const m = s * pad, w = s - m * 2, cx = s / 2;
    const top = [[cx, m + w * 0.06], [m + w * 0.94, m + w * 0.3], [cx, m + w * 0.54], [m + w * 0.06, m + w * 0.3]];
    const left = [[m + w * 0.06, m + w * 0.3], [cx, m + w * 0.54], [cx, m + w * 0.96], [m + w * 0.06, m + w * 0.72]];
    const right = [[cx, m + w * 0.54], [m + w * 0.94, m + w * 0.3], [m + w * 0.94, m + w * 0.72], [cx, m + w * 0.96]];
    const poly = (pts, fill) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = fill; g.fill(); g.lineJoin = 'round'; g.lineWidth = s * 0.022; g.strokeStyle = '#1f2b27'; g.stroke(); };
    poly(top, '#f2b833'); poly(left, '#e5654b'); poly(right, '#4f9bd9');
    return c.toDataURL('image/png').split(',')[1];
  }, [size, pad]);
  writeFileSync(new URL(name, OUT), Buffer.from(data, 'base64'));
  console.log(name);
}
await browser.close();
