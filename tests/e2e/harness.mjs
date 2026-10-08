// E2E の土台：静的サーバ＋端末の Chrome。ボタンを実際に押し、押す前後で状態が変わったかを数える。
// 「押しても何も起きないボタン」を見つけるため、見えたボタンを全部記録し、押して状態が変わったものと突き合わせる。
import { mkdirSync } from 'node:fs';
import { startServer } from '../../tools/serve.mjs';
import { launchChrome } from '../../tools/pw.mjs';

export const VIEWPORTS = { ipad: { width: 1180, height: 820 }, phone: { width: 390, height: 844 } };
const OUT = new URL('../../test-results/', import.meta.url);
mkdirSync(OUT, { recursive: true });

export async function startAll() {
  const srv = await startServer(0);
  const browser = await launchChrome();
  return { srv, browser, base: `http://127.0.0.1:${srv.port}/`, async close() { await browser.close(); await srv.close(); } };
}

const SIG = () => {
  const K = window.__katachi, app = document.getElementById('app');
  const hash = str => { let x = 0; for (let i = 0; i < str.length; i++) x = (Math.imul(x, 31) + str.charCodeAt(i)) | 0; return x; };
  const dom = [...app.querySelectorAll('.top,.dock,.hud,.counter,.sheet,#home')].map(e => e.hidden + ':' + hash(e.outerHTML)).join('|');
  const S = K.S;
  let h = 0, n = 0;
  S.stage.traverse(o => { n++; h += o.position.x * 3.1 + o.position.y * 7.7 + o.position.z * 1.3 + (o.visible ? 1 : 0) + o.scale.x * 0.37 + o.quaternion.x * 2.9 + (o.matrixAutoUpdate ? 0 : o.matrix.elements[13] * 5.3 + o.matrix.elements[12] * 1.7); if (o.material && o.material.color) h += o.material.color.r * 0.11 + (o.material.emissive ? o.material.emissive.r * 0.13 : 0); if (o.geometry) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); h += o.geometry.boundingSphere.radius * 0.19; } });
  const cam = [S.goal.theta, S.goal.phi, S.goal.radius, S.goal.target.x, S.goal.target.z].map(v => v.toFixed(2)).join(',');
  const R = K.R, data = R.data.logs.length + ':' + JSON.stringify(R.data.zukan) + ':' + JSON.stringify(R.settings) + ':' + R.profiles.length + R.activeId + ':' + JSON.stringify(R.data.mission);
  return dom + '#' + n + ':' + h.toFixed(3) + '#' + cam + '#' + data + '#' + (document.getElementById('printArea').innerHTML.length) + '#' + (K.speech.forced || 0) + '#' + (window.__printed || 0);
};
const LIST = () => {
  const vis = el => { if (el.disabled) return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; let e = el; while (e) { if (e.hidden) return false; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; e = e.parentElement; } return true; };
  // 見分け方：id か data-* があればそれだけで（数字の表示が変わっても同じボタン）。一覧の番号の類は種類で1つ。
  // 棚（#panel）の中のボタンは、どの単元・タブ・活動のものかを頭につける（同じ名前でも別の部品のボタン）
  const bid = window.__bid = window.__bid || (b => {
    const GEN = ['data-no', 'data-pid', 'data-ch']; const at = [...b.attributes].filter(a => a.name.startsWith('data-') || a.name === 'id' || a.name === 'for');
    const d = at.map(a => (GEN.includes(a.name) ? a.name : a.name + '=' + a.value)).join('&');
    const A = window.__katachi && window.__katachi.A, inPanel = b.closest('#panel');
    const pre = inPanel && A && A.unit ? `${A.unit.id}:${A.mode}:${A.act[A.unit.id + ':' + A.mode] || 0}:` : '';
    return pre + (d ? d + '|' : '|' + b.textContent.trim().replace(/\s+/g, ' ').slice(0, 30));
  });
  // 前面のシートが開いていれば、その中だけを見る
  const sheets = [...document.querySelectorAll('.sheet')].filter(s => !s.hidden);
  const scope = sheets.length ? sheets[sheets.length - 1] : document.getElementById('app');
  return [...scope.querySelectorAll('button, label.btn')].filter(vis).map(b => ({ id: bid(b), t: b.textContent.trim().replace(/\s+/g, ' ') }));
};

export async function openPage(env, vp, { query = '', speed = 0.25, name = 'page' } = {}) {
  const context = await env.browser.newContext({ viewport: VIEWPORTS[vp] || vp, deviceScaleFactor: 1, hasTouch: false, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 4).join(' | ')));
  page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
  await page.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
  await page.goto(`${env.base}?nosw&speed=${speed}${query ? '&' + query : ''}`);
  await page.waitForFunction(() => window.__katachi && window.__katachi.A);
  const seen = new Set(), clicked = new Map();
  const h = {
    page, context, errors, seen, clicked, vp,
    async sig() { return page.evaluate(SIG); },
    async look() { for (const b of await page.evaluate(LIST)) seen.add(b.id); },
    async idle(ms = 8000) { await page.waitForFunction(() => window.__katachi.S.idle, null, { timeout: ms }).catch(() => {}); },
    async until(fn, arg, ms = 15000) {
      try { return await page.waitForFunction(fn, arg, { timeout: ms }); }
      catch (e) { await h.shot('timeout').catch(() => {}); const st = await page.evaluate(() => { try { const t = window.__katachi.test(); return t && t.state ? t.state() : null; } catch (e) { return String(e); } }).catch(() => null); throw new Error(`待ちきれない: ${fn.toString().slice(0, 120)}\n状態: ${JSON.stringify(st)}\nエラー: ${errors.join(' / ')}`); }
    },
    // ボタンを押す。id は LIST が返す識別子の一部（部分一致）か、関数で選ぶ
    async click(match, { expectChange = true, wait = 250 } = {}) {
      await h.look();
      const list = await page.evaluate(LIST);
      const hit = list.find(x => (typeof match === 'string' ? (match.startsWith('text:') ? x.t.includes(match.slice(5)) : x.id.includes(match)) : match(x.id, x.t)));
      if (!hit) throw new Error(`ボタンが見つからない: ${match}\n見えているボタン:\n${list.map(x => x.id + ' ' + x.t).join('\n')}`);
      const id = hit.id, nth = list.filter(x => x.id === id).indexOf(hit);
      const box = await page.evaluate(([id, nth]) => {
        const sheets = [...document.querySelectorAll('.sheet')].filter(s => !s.hidden);
        const scope = sheets.length ? sheets[sheets.length - 1] : document.getElementById('app');
        const bid = window.__bid;
        const el = [...scope.querySelectorAll('button, label.btn')].filter(b => bid(b) === id)[nth];
        el.scrollIntoView({ block: 'nearest' });
        // シートが下からせり上がる途中は位置が動くので、止まるまで待つ
        return new Promise(res => { let last = null, n = 0; const tick = () => { const r = el.getBoundingClientRect(), k = r.left.toFixed(1) + ',' + r.top.toFixed(1); if (k === last || ++n > 30) res({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); else { last = k; setTimeout(tick, 50); } }; tick(); });
      }, [id, nth]);
      const before = await h.sig();
      await page.mouse.click(box.x, box.y);
      let changed = false;
      for (let t = 0; t < 30 && !changed; t++) { await page.waitForTimeout(wait / 3 + 30); changed = (await h.sig()) !== before; }
      clicked.set(id, (clicked.get(id) || false) || changed);
      if (process.env.E2E_LOG) console.log('click', id, changed);
      if (expectChange && !changed) { await h.shot('dead'); throw new Error(`押しても何も起きない: ${id}`); }
      await h.look();
      return changed;
    },
    async clickNth(prefix, n, opts) { let k = -1; return h.click(id => id.replace(/^[a-z0-9]+:[a-z]+:\d+:/, '').startsWith(prefix) && ++k === n, opts); },
    async visible(match) { const list = await page.evaluate(LIST); return list.some(x => x.id.includes(match)); },
    // 3D の上を実際にタップする（位置はテスト用ののぞき口から求める）
    async tapAt(fnSrc, ...args) {
      const p = await page.evaluate(([src, args]) => { const f = new Function('K', 'T', ...args.map((a, i) => 'a' + i), 'return (' + src + ')'); return f(window.__katachi, window.__katachi.test(), ...args); }, [fnSrc, args]);
      if (!p || !isFinite(p.x)) throw new Error('タップ位置が求められない: ' + fnSrc);
      await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(60);
      return p;
    },
    async test(src, ...args) { return page.evaluate(([src, args]) => { const f = new Function('K', 'T', ...args.map((a, i) => 'a' + i), 'return (' + src + ')'); return f(window.__katachi, window.__katachi.test(), ...args); }, [src, args]); },
    async shot(name) { await page.screenshot({ path: new URL(`${name}-${vp}.png`, OUT).pathname }); },
    // 画面が収まっているか：横にはみ出さない・棚が画面の半分を超えない・枠どりが上の帯と棚のあいだ
    async fit(label) {
      await h.idle();
      const r = await page.evaluate(() => {
        const K = window.__katachi, f = K.fitCheck(), dock = document.getElementById('dock').getBoundingClientRect(), top = document.getElementById('topBar').getBoundingClientRect();
        return { f, sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, dockTop: dock.top, dockH: dock.height, topBottom: top.bottom, topRight: top.right };
      });
      const probs = [];
      if (r.sw > r.iw + 1) probs.push(`横にはみ出し ${r.sw}>${r.iw}`);
      if (r.dockH > r.ih * 0.6) probs.push(`棚が高すぎる ${r.dockH}/${r.ih}`);
      if (r.topRight > r.iw + 1) probs.push('上の帯がはみ出し');
      if (r.f) {
        const m = 6;
        if (r.f.minX < -m || r.f.maxX > r.iw + m) probs.push(`3Dが横にはみ出し ${r.f.minX.toFixed(0)}..${r.f.maxX.toFixed(0)}`);
        if (r.f.minY < r.topBottom - 40 || r.f.maxY > r.dockTop + m) probs.push(`3Dが上下にはみ出し ${r.f.minY.toFixed(0)}..${r.f.maxY.toFixed(0)} (帯 ${r.topBottom.toFixed(0)} 棚 ${r.dockTop.toFixed(0)})`);
      }
      return { label, ok: probs.length === 0, probs, r };
    },
    report() { const dead = [...clicked].filter(([, c]) => !c).map(([id]) => id); const never = [...seen].filter(id => !clicked.has(id)); return { seen: seen.size, clicked: clicked.size, changed: [...clicked.values()].filter(Boolean).length, dead, never }; },
  };
  return h;
}
