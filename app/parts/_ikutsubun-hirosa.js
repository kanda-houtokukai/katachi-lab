// ikutsubun（ひろさ・H1）：おなじ おおきさの マスを しきつめて「いくつぶん」で くらべる。
// 大きさの違うマスで数えると、数の多い方が せまいことがある（A3）。大きいマス1こ＝小さいマス4こ を分けて見せる。
import { el, C, txt, rect, clear, tween, wait, E, tapOf, hanamaru } from './_flat.js';
import { stageBox, wide, fitGrid, place, shapeG, outlineD } from './_masume.js';
import { rect as R, bbox } from './_hirosa-gen.js';
import { S, alive, newToken, killTweens } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';

const HOOK = [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4]];
const PAIRS = [{ a: R(4, 3), b: R(4, 4) }, { a: HOOK, b: R(2, 4) }, { a: R(6, 2), b: R(4, 4) }];
const TILES = { same: 'おなじ マス', diff: 'ちがう マス' };

export function mount(ctx) {
  const { panel, sfx, ICON } = ctx;
  const F = ctx.openFlat();
  let G = null, pi = 0, mode = 'same', busy = false, compared = 0, fills = 0;
  const sh = [{ id: 'a', name: 'あか', col: () => C('face-1') }, { id: 'b', name: 'あお', col: () => C('face-4') }];
  const placed = [[], []];   // 置いたタイル（ローカルのマス [x,y,size]）
  const cancel = () => { newToken(); killTweens(); busy = false; };
  const sizeOf = k => (mode === 'diff' && k === 1 ? 2 : 1);
  // しきつめる順（左上から。大きいマスは 2×2 のかたまり）
  function slots(k) {
    const cells = PAIRS[pi][k === 0 ? 'a' : 'b'], s = sizeOf(k), set = new Set(cells.map(p => p.join(','))), out = [];
    if (s === 1) return cells.slice().sort((p, q) => p[1] - q[1] || p[0] - q[0]).map(([x, y]) => [x, y, 1]);
    const used = new Set();
    for (const [x, y] of cells.slice().sort((p, q) => p[1] - q[1] || p[0] - q[0])) {
      const blk = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
      if (blk.every(p => set.has(p.join(',')) && !used.has(p.join(',')))) { blk.forEach(p => used.add(p.join(','))); out.push([x, y, 2]); }
    }
    return out;
  }
  function layout() {
    F.clearLayers();
    const P = PAIRS[pi], ba = bbox(P.a), bb = bbox(P.b), box = stageBox(F, { bottom: 10 });
    const side = wide(F) || box.w / box.h > 1.2;
    const cols = side ? ba.w + bb.w + 3 : Math.max(ba.w, bb.w) + 2, rows = side ? Math.max(ba.h, bb.h) + 2 : ba.h + bb.h + 3;
    G = fitGrid(box, cols, rows, 58);
    sh[0].gx = 1; sh[0].gy = side ? 1 + Math.floor((rows - 2 - ba.h) / 2) : 1;
    sh[1].gx = side ? ba.w + 2 : 1 + Math.floor((cols - 2 - bb.w) / 2); sh[1].gy = side ? 1 + Math.floor((rows - 2 - bb.h) / 2) : ba.h + 2;
    if (!side) sh[0].gx = 1 + Math.floor((cols - 2 - ba.w) / 2);
    const L = F.layer('shapes');
    sh.forEach((s, k) => {
      const cells = P[k === 0 ? 'a' : 'b'];
      s.g = el('g', { class: 'grab' }, L); place(s.g, G.X(s.gx), G.Y(s.gy));
      for (const [x, y] of cells) rect(s.g, x * G.c, y * G.c, G.c, G.c, { fill: s.col(), opacity: 0.16 });
      el('path', { d: outlineD(cells, G.c), stroke: s.col(), 'stroke-width': 3.5, fill: 'none', 'stroke-linecap': 'square' }, s.g);
      s.tl = el('g', {}, s.g);
      for (let i = 0; i < placed[k].length; i++) drawTile(k, placed[k][i], i + 1, false);
    });
    F.layer('fx');
  }
  function drawTile(k, [x, y, s], n, anim = true) {
    const c = G.c, g = el('g', {}, sh[k].tl), col = s === 2 ? C('face-3') : C('cell-b');
    rect(g, x * c + 3, y * c + 3, s * c - 6, s * c - 6, { rx: 6, fill: col, stroke: C('ink'), 'stroke-width': 1.5, opacity: 0.92 });
    txt(g, (x + s / 2) * c, (y + s / 2) * c + c * 0.16, String(n), { 'font-size': Math.max(11, c * 0.42 * (s === 2 ? 1.5 : 1)), class: 'ui', 'font-weight': 700 });
    if (anim) { sfx.tick(n); return tween(0.16, e => g.setAttribute('transform', `translate(0,${(1 - e) * -c * 0.4})`), E.out); }
  }
  const full = k => placed[k].length >= slots(k).length;
  async function addTile(k) {
    if (full(k)) { sfx.off(); ctx.toast('', `${sh[k].name}は もう いっぱい。${placed[k].length}こ ぶん`, 1.8); return; }
    const sl = slots(k)[placed[k].length]; placed[k].push(sl);
    await drawTile(k, sl, placed[k].length);
    if (full(k)) { sfx.pop(); ctx.caption(`<b>${sh[k].name}</b>は ${sizeOf(k) === 2 ? 'おおきい ' : ''}マス <b>${placed[k].length}こ ぶん</b>`, 0, `${sh[k].name}は${sizeOf(k) === 2 ? '大きい' : ''}マス${placed[k].length}こぶん`); }
  }
  async function fillAll() {
    if (busy) return; busy = true; ctx.hideHud(); const tag = S.token;
    if (full(0) && full(1)) { busy = false; sfx.off(); ctx.toast('', 'もう ぜんぶ しきつめたよ。「くらべる」を おしてね', 2.2); return; }
    for (const k of [0, 1]) while (!full(k)) { await addTile(k); if (!alive(tag)) return; }
    fills++; busy = false;
    ctx.caption(`あか ${placed[0].length}こ、あお ${placed[1].length}こ。「くらべる」で たしかめよう`, 0, `赤${placed[0].length}こ、青${placed[1].length}こ`);
  }
  async function compare() {
    if (busy) return;
    if (!(full(0) && full(1))) { await fillAll(); if (!(full(0) && full(1))) return; }
    busy = true; const tag = S.token, na = placed[0].length, nb = placed[1].length, P = PAIRS[pi], ua = P.a.length, ub = P.b.length;
    ctx.log('tile', { detail: { same: mode === 'same', a: na, b: nb, pair: pi } });
    compared++;
    if (mode === 'same') {
      const win = ua === ub ? -1 : ua > ub ? 0 : 1;
      ctx.caption(win < 0 ? `どちらも <b>${na}こ ぶん</b>。おなじ ひろさ` : `<b>${sh[win].name}</b>の ほうが ${Math.abs(na - nb)}こ ぶん ひろい`, 0, win < 0 ? `どちらも${na}こぶん。同じ広さ` : `${sh[win].name}のほうが${Math.abs(na - nb)}こぶん広い`);
      if (win >= 0) { sfx.good(); const b = bbox(P[win ? 'b' : 'a']); hanamaru(F.svg, G.X(sh[win].gx) + b.w * G.c / 2, G.Y(sh[win].gy) + b.h * G.c / 2, Math.min(b.w, b.h) * G.c * 0.55 + 16); }
      busy = false; return;
    }
    // ちがう マス：数は あかが多いのに…
    ctx.caption(`あか ${na}こ、あお ${nb}こ。かずが おおい あかの ほうが ひろい…？`, 0, `赤${na}こ、青${nb}こ。数が多い赤のほうが広い？`);
    if (!(await wait(2.2))) return;
    ctx.caption('<b>マスの おおきさが ちがう</b>！ おおきい マスを わけて みよう', 0, 'マスの大きさが違う！大きいマスを分けてみよう');
    const fx = F.layer('fx'); clear(fx);
    // 大きいマスを 4つに わける（線が入る）
    const g = el('g', {}, sh[1].g), c = G.c;
    for (const [x, y] of placed[1]) {
      const l1 = el('line', { x1: (x + 1) * c, y1: y * c + 4, x2: (x + 1) * c, y2: y * c + 4, stroke: C('ink'), 'stroke-width': 2.5 }, g);
      const l2 = el('line', { x1: x * c + 4, y1: (y + 1) * c, x2: x * c + 4, y2: (y + 1) * c, stroke: C('ink'), 'stroke-width': 2.5 }, g);
      sfx.tap();
      await tween(0.3, e => { l1.setAttribute('y2', y * c + 4 + (2 * c - 8) * e); l2.setAttribute('x2', x * c + 4 + (2 * c - 8) * e); }, E.io);
      if (!alive(tag)) return;
    }
    if (!(await wait(0.4))) return;
    ctx.caption(`おおきい マス 1こ ＝ ちいさい マス <b>4こ</b>。あおは ちいさい マスで <b>${ub}こ</b>`, 0, `大きいマス1こは小さいマス4こ。青は小さいマスで${ub}こ`);
    if (!(await wait(2.6))) return;
    const win = ua === ub ? -1 : ua > ub ? 0 : 1;
    ctx.caption(`おなじ マスで くらべると あか ${ua}こ、あお ${ub}こ。` + (win < 0 ? 'おなじ ひろさ' : `<b>${sh[win].name}</b>の ほうが ひろい`), 0, `同じマスで比べると赤${ua}こ、青${ub}こ。` + (win < 0 ? '同じ広さ' : `${sh[win].name}のほうが広い`));
    busy = false;
  }
  function clearTiles() { cancel(); placed[0] = []; placed[1] = []; layout(); }

  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="マス">${Object.entries(TILES).map(([k, l]) => `<button type="button" data-tile="${k}" aria-pressed="${k === mode}">${l}</button>`).join('')}</div><button class="btn sub small" type="button" data-k="shape">かたちを かえる</button></div>
    <div class="row"><button class="btn small" type="button" data-k="fill">しきつめる</button><button class="btn sub small" type="button" data-k="cmp">くらべる</button><button class="btn sub small" type="button" data-k="clear">${ctx.ICONS_UI.undo} けす</button></div>`;
  $$p(panel, '[data-tile]').forEach(b => on(b, 'click', () => {
    if (b.dataset.tile === mode) { sfx.tap(); ctx.toast('', `いまは「${TILES[mode]}」だよ`, 1.6); return; }
    sfx.tap(); mode = b.dataset.tile; $$p(panel, '[data-tile]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); clearTiles();
    ctx.caption(mode === 'diff' ? '<b>あお</b>は おおきい マスで しきつめるよ' : 'どちらも おなじ おおきさの マスで しきつめるよ', 0, mode === 'diff' ? '青は大きいマスで敷き詰めるよ' : 'どちらも同じ大きさのマスで敷き詰めるよ');
  }));
  on($p(panel, '[data-k="shape"]'), 'click', () => { sfx.tap(); pi = (pi + 1) % PAIRS.length; clearTiles(); ctx.caption('かたちを かえたよ。マスを しきつめて くらべよう', 0, '形を変えたよ。マスを敷き詰めて比べよう'); });
  on($p(panel, '[data-k="fill"]'), 'click', () => { sfx.tap(); fillAll(); });
  on($p(panel, '[data-k="cmp"]'), 'click', () => { sfx.tap(); compare(); });
  on($p(panel, '[data-k="clear"]'), 'click', () => { sfx.tap(); clearTiles(); ctx.caption('マスを けしたよ', 0, 'マスを消したよ'); });
  // かたちを タッチすると 1こずつ しく
  F.svg.addEventListener('pointerdown', e => {
    if (busy || !G) return; const p = F.ptr(e);
    for (let k = 0; k < 2; k++) { const s = sh[k], cells = PAIRS[pi][k ? 'b' : 'a'], x = Math.floor((p.x - G.X(s.gx)) / G.c), y = Math.floor((p.y - G.Y(s.gy)) / G.c); if (cells.some(q => q[0] === x && q[1] === y)) { ctx.hideHud(); addTile(k); return; } }
  });
  F.onResize(layout);
  layout();
  ctx.caption('かたちを タッチして マスを しこう。どちらが ひろい？', 0, '形をタッチしてマスを敷こう。どちらが広い？');
  return {
    dispose() {},
    test: {
      state: () => ({ mode, a: placed[0].length, b: placed[1].length, compared, busy }),
      auto() {
        if (busy) return { wait: 300 };
        if (!placed[0].length) { const s = sh[0], c0 = PAIRS[pi].a[0]; return tapOf(F, G.X(s.gx + c0[0]) + G.c / 2, G.Y(s.gy + c0[1]) + G.c / 2); }
        if (!(full(0) && full(1))) return { click: 'data-k=fill|' };
        if (!compared) return { click: 'data-k=cmp|' };
        return { done: true };
      },
    },
  };
}
