// kurabe（ひろさ・H1）：2まいの かたちを 指で うごかし、まわして 重ねて くらべる。
// すっぽり入ると、はみ出した方が光る。はみ出し方が両方にある形は「かさねても わからない」→ マスで かぞえる。見本 v1 の 60-area を移したもの。
import { el, C, txt, clear, clamp, tween, wait, E, dragOn, pathOf, tapOf } from './_flat.js';
import { stageBox, wide, fillGrid, drawBoard, shapeG, place, countCells, glowCells, absOf } from './_masume.js';
import { rect as R, bbox, overlap } from './_hirosa-gen.js';
import { S, alive, newToken, killTweens } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';

const PAIRS = {
  inside: { label: 'すっぽり', a: R(2, 3), b: R(3, 4) },
  turn: { label: 'まわして', a: R(4, 2), b: R(3, 4) },
  both: { label: 'はみだす', a: R(7, 1), b: R(3, 3) },
};
const rotCW = cells => { const { h } = bbox(cells); return cells.map(([x, y]) => [h - 1 - y, x]); };

export function mount(ctx) {
  const { panel, sfx, ICON } = ctx;
  const F = ctx.openFlat();
  let G = null, pairKey = 'inside', shapes = [], sel = 0, busy = false, evals = 0, fits = 0, turned = 0;
  const home = [];
  const cancel = () => { newToken(); killTweens(); busy = false; };
  function setPair(k) {
    pairKey = k; const P = PAIRS[k];
    shapes = [
      { id: 'a', name: 'あか', color: C('face-1'), cells: P.a.map(p => p.slice()), gx: 0, gy: 0 },
      { id: 'b', name: 'あお', color: C('face-4'), cells: P.b.map(p => p.slice()), gx: 0, gy: 0 },
    ];
    sel = 0; layout(true);
  }
  // 盤を敷いて、2まいを並べる（横長は左右・縦長は上下）
  function layout(reset) {
    F.clearLayers();
    const box = stageBox(F, { bottom: 10 }), w = wide(F) || box.w > box.h * 1.25;
    const c = Math.floor(Math.min(box.w / (w ? 13 : 8), box.h / (w ? 6 : 9), 54));
    G = fillGrid(box, c);
    drawBoard(F.layer('board'), G);
    if (reset || !home.length) {
      const [a, b] = shapes, ba = bbox(a.cells), bb = bbox(b.cells);
      if (G.cols >= ba.w + bb.w + 3) { const sx = Math.max(0, Math.floor((G.cols - ba.w - bb.w - 2) / 2)); a.gx = sx; b.gx = sx + ba.w + 2; a.gy = Math.max(0, Math.floor((G.rows - ba.h) / 2)); b.gy = Math.max(0, Math.floor((G.rows - bb.h) / 2)); }
      else { const sy = Math.max(0, Math.floor((G.rows - ba.h - bb.h - 1) / 2)); a.gy = sy; b.gy = Math.min(G.rows - bb.h, sy + ba.h + 1); a.gx = Math.max(0, Math.floor((G.cols - ba.w) / 2)); b.gx = Math.max(0, Math.floor((G.cols - bb.w) / 2)); }
      home.length = 0; shapes.forEach(s => home.push({ gx: s.gx, gy: s.gy, cells: s.cells.map(p => p.slice()) }));
    }
    shapes.forEach(clampIn);
    draw();
  }
  const clampIn = s => { const b = bbox(s.cells); s.gx = clamp(s.gx, 0, Math.max(0, G.cols - b.w)); s.gy = clamp(s.gy, 0, Math.max(0, G.rows - b.h)); };
  function draw() {
    const L = F.layer('shapes'); clear(L);
    const order = sel === 0 ? [1, 0] : [0, 1];
    for (const i of order) {
      const s = shapes[i];
      s.g = shapeG(L, s.cells, G.c, { color: s.color, op: 0.62, sw: i === sel ? 4.5 : 3 });
      s.g.setAttribute('class', 'grab');
      place(s.g, G.X(s.gx) + (s.dx || 0), G.Y(s.gy) + (s.dy || 0));
    }
    F.layer('fx');
  }
  const fx = () => F.layer('fx');
  const absS = s => absOf(s.cells, s.gx, s.gy);
  const hitShape = p => { for (const i of (sel === 0 ? [0, 1] : [1, 0])) { const s = shapes[i]; const x = Math.floor((p.x - G.X(s.gx)) / G.c), y = Math.floor((p.y - G.Y(s.gy)) / G.c); if (s.cells.some(q => q[0] === x && q[1] === y)) return i; } return null; };
  let drag = null;
  dragOn(F.svg, F, {
    hit: p => { if (busy || !G) return null; const i = hitShape(p); return i == null ? null : { i }; },
    start: (p, h) => { ctx.hideHud(); clear(fx()); drag = { i: h.i, p0: p, moved: false }; if (sel !== h.i) { sel = h.i; draw(); } },
    move: p => { if (!drag) return; const s = shapes[drag.i]; s.dx = p.x - drag.p0.x; s.dy = p.y - drag.p0.y; if (Math.hypot(s.dx, s.dy) > 6) drag.moved = true; place(s.g, G.X(s.gx) + s.dx, G.Y(s.gy) + s.dy); },
    end: () => {
      if (!drag) return; const s = shapes[drag.i], moved = drag.moved; drag = null;
      if (!moved) { s.dx = s.dy = 0; draw(); sfx.tap(); ctx.caption(`<b>${s.name}</b>を えらんだよ。「まわす」で まわせる`, 0, `${s.name}を選んだよ。「まわす」で回せる`); return; }
      s.gx += Math.round((s.dx || 0) / G.c); s.gy += Math.round((s.dy || 0) / G.c); s.dx = s.dy = 0; clampIn(s); sfx.pop(); draw(); judge();
    },
  });
  // 重ねた結果を言う
  function judge() {
    const [a, b] = shapes, A = absS(a), B = absS(b), o = overlap(A, B);
    clear(fx());
    if (!o.over) { ctx.caption('もう すこし。ずらして かさねて みよう', 0, 'もう少し。ずらして重ねてみよう'); return; }
    evals++;
    const sb = new Set(B.map(p => p.join(','))), sa = new Set(A.map(p => p.join(',')));
    const outA = A.filter(p => !sb.has(p.join(','))), outB = B.filter(p => !sa.has(p.join(',')));
    let res;
    if (o.aIn && o.bIn) { res = 'same'; ctx.caption('ぴったり かさなった。<b>おなじ ひろさ</b>', 0, 'ぴったり重なった。同じ広さ'); sfx.good(); }
    else if (o.aIn) { res = 'b'; fits++; glowCells(fx(), outB, G, b.color); ctx.caption('<b>あか</b>が すっぽり はいった。はみだした <em>あお</em>の ほうが ひろい', 0, '赤がすっぽり入った。はみ出した青のほうが広い'); sfx.good(); }
    else if (o.bIn) { res = 'a'; fits++; glowCells(fx(), outA, G, a.color); ctx.caption('<em>あお</em>が すっぽり はいった。はみだした <b>あか</b>の ほうが ひろい', 0, '青がすっぽり入った。はみ出した赤のほうが広い'); sfx.good(); }
    else {
      res = 'both'; glowCells(fx(), outA, G, a.color, { times: 2 }); glowCells(fx(), outB, G, b.color, { times: 2 });
      ctx.caption(pairKey === 'turn' ? 'はみだした。<b>まわして</b> かさねて みよう' : 'どちらも はみだす。かさねても わからない…<b>マスで かぞえよう</b>', 0, pairKey === 'turn' ? 'はみ出した。回して重ねてみよう' : 'どちらもはみ出す。重ねても分からない。マスで数えよう');
    }
    ctx.log('overlay', { detail: { pair: pairKey, res } });
  }
  async function turn() {
    if (busy) return;
    const s = shapes[sel], b = bbox(s.cells), tag = S.token; busy = true; ctx.hideHud(); clear(fx()); sfx.tap();
    const cx = b.w * G.c / 2, cy = b.h * G.c / 2, g = s.g, X = G.X(s.gx), Y = G.Y(s.gy);
    await tween(0.5, e => place(g, X, Y, ` rotate(${90 * e} ${cx} ${cy})`), E.io);
    if (!alive(tag)) return;
    s.cells = rotCW(s.cells); s.gx += Math.round((b.w - b.h) / 2); s.gy += Math.round((b.h - b.w) / 2); clampIn(s);
    turned++; busy = false; draw(); sfx.pop();
    ctx.log('turn', { detail: { pair: pairKey, shape: s.id } });
    const o = overlap(absS(shapes[0]), absS(shapes[1])); if (o.over) judge(); else ctx.caption(`<b>${s.name}</b>を まわした`, 0, `${s.name}を回した`);
  }
  async function moveTo(s, gx, gy, sec = 0.6) {
    const a = { x: s.gx, y: s.gy }, tag = S.token, g = s.g, GG = G;
    await tween(sec, e => place(g, GG.X(a.x + (gx - a.x) * e), GG.Y(a.y + (gy - a.y) * e)), E.io);
    if (!alive(tag)) return false; s.gx = gx; s.gy = gy; draw(); return true;
  }
  async function count() {
    if (busy) return; busy = true; const tag = S.token; ctx.hideHud(); clear(fx()); sfx.tap();
    // 重なっていたら はなしてから数える
    const o = overlap(absS(shapes[0]), absS(shapes[1]));
    if (o.over) for (let i = 0; i < 2; i++) { const s = shapes[i], h = home[i]; s.cells = h.cells.map(p => p.slice()); draw(); if (!(await moveTo(s, h.gx, h.gy, 0.45))) return; }
    ctx.caption('おなじ おおきさの <b>マス</b>で かぞえよう', 0, '同じ大きさのマスで数えよう');
    const na = await countCells(fx(), absS(shapes[0]), G, shapes[0].color, { sfx }); if (!alive(tag)) return;
    if (!(await wait(0.25))) return;
    const nb = await countCells(fx(), absS(shapes[1]), G, shapes[1].color, { sfx }); if (!alive(tag)) return;
    busy = false;
    ctx.caption(`<b>あか ${na}マス</b>、<em>あお ${nb}マス</em>。` + (na === nb ? 'おなじ ひろさ' : na > nb ? '<b>あか</b>の ほうが ひろい' : '<em>あお</em>の ほうが ひろい'), 0, `赤${na}マス、青${nb}マス。` + (na === nb ? '同じ広さ' : na > nb ? '赤のほうが広い' : '青のほうが広い'));
    ctx.log('tilecount', { detail: { pair: pairKey, a: na, b: nb } });
  }
  function reset() { busy = false; clear(fx()); setPair(pairKey); ctx.caption('ゆびで うごかして かさねて みよう', 0, '指で動かして重ねてみよう'); }

  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="かたち">${Object.entries(PAIRS).map(([k, p]) => `<button type="button" data-pair="${k}" aria-pressed="${k === pairKey}">${p.label}</button>`).join('')}</div></div>
    <div class="row"><button class="btn sub small" type="button" data-k="turn">${ctx.ICONS_UI.turn} まわす</button><button class="btn sub small" type="button" data-k="count">マスを かぞえる</button><button class="btn sub small" type="button" data-k="reset">${ctx.ICONS_UI.undo} もとに もどす</button></div>`;
  $$p(panel, '[data-pair]').forEach(b => on(b, 'click', () => {
    if (b.dataset.pair === pairKey) { sfx.tap(); ctx.toast('', `いまは「${PAIRS[pairKey].label}」だよ`, 1.6); return; }
    sfx.tap(); cancel(); $$p(panel, '[data-pair]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); pairKey = b.dataset.pair; reset();
  }));
  on($p(panel, '[data-k="turn"]'), 'click', turn);
  on($p(panel, '[data-k="count"]'), 'click', count);
  on($p(panel, '[data-k="reset"]'), 'click', () => { sfx.tap(); cancel(); reset(); });
  F.onResize(() => { busy = false; layout(true); });
  setPair('inside');
  ctx.caption('ひろいのは どっち？ ゆびで うごかして かさねて みよう', 0, '広いのはどっち？指で動かして重ねてみよう');

  return {
    dispose() {},
    test: {
      state: () => ({ pair: pairKey, evals, fits, turned, busy }),
      auto() {
        if (busy) return { wait: 300 };
        if (fits >= 1 || (pairKey === 'both' && evals >= 1)) return { done: true };
        const [a, b] = shapes;
        if (pairKey === 'turn' && bbox(a.cells).w > bbox(b.cells).w) { if (sel !== 0) return tapOf(F, G.X(a.gx) + G.c / 2, G.Y(a.gy) + G.c / 2); return { click: 'data-k=turn|' }; }
        const x0 = G.X(a.gx) + G.c / 2, y0 = G.Y(a.gy) + G.c / 2, x1 = x0 + (b.gx - a.gx) * G.c, y1 = y0 + (b.gy - a.gy) * G.c;
        return pathOf(F, [[x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2 - 20], [x1, y1]]);
      },
    },
  };
}
