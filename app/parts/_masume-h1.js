// masume の H1 の場面：みる（重ねる→マス→まわり）・まわりが ながくても・じんとり・おなじ ひろさの かたち。
import { el, C, txt, rect, line, path, circle, clear, clamp, tween, wait, E, tapOf, hanamaru } from './_flat.js';
import { stageBox, wide, fitGrid, drawBoard, shapeG, place, countCells, unroll, glowCells, absOf, cellAt, outlineD } from './_masume.js';
import { rect as R, bbox, overlap, perimeter, norm, keyOf, canon, isConnected, matchTransform, variant, jinMoves, jinPick, jinCount } from './_hirosa-gen.js';
import { S, alive, newToken, killTweens } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';

const red = () => C('face-1'), blue = () => C('face-4');

// 2つの形を盤に並べる（横に並ぶなら横、だめなら縦）
function arrange(G, A, B, top = 1) {
  const ba = bbox(A), bb = bbox(B);
  if (ba.w + bb.w + 1 <= G.cols - 1) { const sx = Math.max(0, Math.floor((G.cols - ba.w - bb.w - 2) / 2)); return [[sx, top + Math.max(0, Math.floor((bb.h - ba.h) / 2))], [sx + ba.w + 2, top]]; }
  return [[Math.max(0, Math.floor((G.cols - ba.w) / 2)), top], [Math.max(0, Math.floor((G.cols - bb.w) / 2)), top + ba.h + 1]];
}

/* ---------- みる（H1） ---------- */
export function miru(ctx) {
  const { panel, sfx } = ctx;
  const F = ctx.openFlat();
  let G = null, phase = 'play', sh = [];
  function board() {
    F.clearLayers();
    const box = stageBox(F), w = wide(F) || box.w > box.h * 1.3;
    G = fitGrid(box, w ? 14 : 8, w ? 8 : 11, 52);
    drawBoard(F.layer('board'), G);
    F.layer('shapes'); F.layer('fx');
  }
  function setShapes(A, B) {
    const pos = arrange(G, A, B);
    sh = [{ cells: A, gx: pos[0][0], gy: pos[0][1], col: red(), name: 'あか' }, { cells: B, gx: pos[1][0], gy: pos[1][1], col: blue(), name: 'あお' }];
    draw();
  }
  function draw() { const L = F.layer('shapes'); clear(L); for (const s of sh) { s.g = shapeG(L, s.cells, G.c, { color: s.col, op: 0.62 }); place(s.g, G.X(s.gx), G.Y(s.gy)); } }
  async function move(s, gx, gy, sec = 0.9) { const a = { x: s.gx, y: s.gy }, g = s.g; await tween(sec, e => place(g, G.X(a.x + (gx - a.x) * e), G.Y(a.y + (gy - a.y) * e)), E.io); s.gx = gx; s.gy = gy; }
  const say = (h, sp) => ctx.caption(h, 0, sp);
  async function run() {
    const tag = S.token, ok = () => alive(tag); phase = 'play';
    board(); setShapes(R(2, 2), R(3, 3));
    const fx = F.layer('fx');
    say('ひろいのは どっち？', '広いのはどっち？'); if (!(await wait(1.8)) || !ok()) return;
    say('かさねて みよう', '重ねてみよう'); await move(sh[0], sh[1].gx, sh[1].gy); if (!ok()) return; sfx.pop();
    const A = absOf(sh[0].cells, sh[0].gx, sh[0].gy), sa = new Set(A.map(p => p.join(',')));
    glowCells(fx, absOf(sh[1].cells, sh[1].gx, sh[1].gy).filter(p => !sa.has(p.join(','))), G, blue());
    say('<b>あか</b>が すっぽり はいった。はみだした <em>あお</em>の ほうが ひろい', '赤がすっぽり入った。はみ出した青のほうが広い'); if (!(await wait(3.2)) || !ok()) return;
    clear(fx); setShapes(R(7, 1), R(3, 3));
    say('こんどは どっち？', '今度はどっち？'); if (!(await wait(1.8)) || !ok()) return;
    const home = { x: sh[0].gx, y: sh[0].gy }, tx = clamp(sh[1].gx - 2, 0, G.cols - 7), ty = sh[1].gy + 1;
    await move(sh[0], tx, ty); if (!ok()) return; sfx.pop();
    { const a = absOf(sh[0].cells, tx, ty), b = absOf(sh[1].cells, sh[1].gx, sh[1].gy), sb = new Set(b.map(p => p.join(','))), sa2 = new Set(a.map(p => p.join(',')));
      glowCells(fx, a.filter(p => !sb.has(p.join(','))), G, red(), { times: 2 }); glowCells(fx, b.filter(p => !sa2.has(p.join(','))), G, blue(), { times: 2 }); }
    say('どちらも はみだす。<b>かさねても わからない</b>…', 'どちらもはみ出す。重ねても分からない'); if (!(await wait(2.6)) || !ok()) return;
    clear(fx); await move(sh[0], home.x, home.y, 0.6); if (!ok()) return;
    say('おなじ おおきさの <b>マス</b>で かぞえよう', '同じ大きさのマスで数えよう');
    const na = await countCells(fx, absOf(sh[0].cells, sh[0].gx, sh[0].gy), G, red(), { sfx }); if (!ok()) return;
    if (!(await wait(0.3)) || !ok()) return;
    const nb = await countCells(fx, absOf(sh[1].cells, sh[1].gx, sh[1].gy), G, blue(), { sfx }); if (!ok()) return;
    say(`<b>あか ${na}マス</b>、<em>あお ${nb}マス</em>。<em>あお</em>の ほうが ひろい`, `赤${na}マス、青${nb}マス。青のほうが広い`); if (!(await wait(3.2)) || !ok()) return;
    clear(fx); say('では、<b>まわりの ながさ</b>は？', 'では、まわりの長さは？');
    const bw = G.cols * G.c, maxL = Math.max(perimeter(sh[0].cells), perimeter(sh[1].cells)) * G.c, k = Math.min(1, (bw - 90) / maxL);
    const yA = G.Y(G.rows) - G.c * 1.7, yB = G.Y(G.rows) - G.c * 0.7;
    const pa = await unroll(fx, sh[0].cells, G, sh[0].gx, sh[0].gy, red(), { x0: G.ox + 12, y0: yA, k, label: `${perimeter(sh[0].cells)}` }); if (!ok()) return;
    const pb = await unroll(fx, sh[1].cells, G, sh[1].gx, sh[1].gy, blue(), { x0: G.ox + 12, y0: yB, k, label: `${perimeter(sh[1].cells)}` }); if (!ok()) return;
    say(`まわりは <b>あか ${pa}</b>、<em>あお ${pb}</em>。<b>あか</b>の ほうが ながい`, `まわりは赤${pa}、青${pb}。赤のほうが長い`); if (!(await wait(3)) || !ok()) return;
    say('まわりが ながくても、<b>ひろいとは かぎらない</b>', 'まわりが長くても、広いとは限らない'); if (!(await wait(3)) || !ok()) return;
    say('つぎは「さわる」で かさねて みよう', '次は「さわる」で重ねてみよう'); ctx.log('miru'); phase = 'done';
  }
  panel.innerHTML = `<div class="row"><button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again} もういちど みる</button></div>`;
  on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); newToken(); killTweens(); run(); });
  F.onResize(() => { newToken(); killTweens(); run(); });
  run();
  return { dispose() {}, test: { state: () => ({ phase }), auto: () => (phase === 'done' ? { done: true } : { wait: 500 }) } };
}

/* ---------- さわる：まわりが ながくても（A1） ---------- */
const HOOK7 = [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [0, 3], [0, 4]];
const PPAIRS = { thin: { label: 'ほそながい', a: R(8, 1), b: R(3, 3) }, hook: { label: 'かぎ', a: HOOK7, b: R(2, 4) }, same: { label: 'まわりが おなじ', a: R(5, 1), b: R(3, 3) } };
export function perim(ctx) {
  const { panel, sfx } = ctx;
  const F = ctx.openFlat();
  let G = null, key = 'thin', sh = [], busy = false, did = { p: 0, n: 0 }, res = {};
  const cancel = () => { newToken(); killTweens(); busy = false; };
  function layout() {
    F.clearLayers();
    const box = stageBox(F), w = wide(F) || box.w > box.h * 1.3;
    G = fitGrid(box, w ? 14 : 9, w ? 8 : 11, 50);
    drawBoard(F.layer('board'), G);
    const P = PPAIRS[key], pos = arrange(G, P.a, P.b);
    sh = [{ cells: P.a, gx: pos[0][0], gy: pos[0][1], col: red(), name: 'あか' }, { cells: P.b, gx: pos[1][0], gy: pos[1][1], col: blue(), name: 'あお' }];
    const L = F.layer('shapes'); for (const s of sh) { s.g = shapeG(L, s.cells, G.c, { color: s.col, op: 0.62 }); place(s.g, G.X(s.gx), G.Y(s.gy)); }
    F.layer('fx'); res = {};
  }
  async function measure() {
    if (busy) return; busy = true; const tag = S.token, fx = F.layer('fx'); ctx.hideHud(); clear(fx);
    ctx.caption('まわりに ひもを まいて、まっすぐ のばすよ', 0, 'まわりにひもを巻いて、まっすぐのばすよ');
    const maxL = Math.max(...sh.map(s => perimeter(s.cells))) * G.c, k = Math.min(1, (G.cols * G.c - 90) / maxL);
    const out = [];
    for (let i = 0; i < 2; i++) { const s = sh[i]; out.push(await unroll(fx, s.cells, G, s.gx, s.gy, s.col, { x0: G.ox + 12, y0: G.Y(G.rows) - G.c * (i ? 0.7 : 1.7), k, label: `まわり ${perimeter(s.cells)}` })); if (!alive(tag)) return; }
    res.p = out; did.p++; busy = false;
    ctx.caption(out[0] === out[1] ? `まわりは どちらも <b>${out[0]}</b>。おなじ ながさ` : `まわりは <b>あか ${out[0]}</b>、<em>あお ${out[1]}</em>。${out[0] > out[1] ? '<b>あか</b>' : '<em>あお</em>'}の ほうが ながい`, 0, out[0] === out[1] ? `まわりはどちらも${out[0]}。同じ長さ` : `まわりは赤${out[0]}、青${out[1]}`);
    conclude();
  }
  async function count() {
    if (busy) return; busy = true; const tag = S.token, fx = F.layer('fx'); ctx.hideHud();
    const n = [];
    for (const s of sh) { n.push(await countCells(fx, absOf(s.cells, s.gx, s.gy), G, s.col, { sfx })); if (!alive(tag)) return; }
    res.n = n; did.n++; busy = false;
    ctx.caption(`<b>あか ${n[0]}マス</b>、<em>あお ${n[1]}マス</em>`, 0, `赤${n[0]}マス、青${n[1]}マス`);
    conclude();
  }
  function conclude() {
    if (!res.p || !res.n) return;
    const [pa, pb] = res.p, [na, nb] = res.n, wide2 = na === nb ? -1 : na > nb ? 0 : 1, tag = S.token;
    setTimeout(() => {
      if (busy || !alive(tag)) return;
      const msg = pa === pb ? `まわりが おなじでも、ひろさは <b>${['あか', 'あお'][wide2]}</b>の ほうが ひろい` : `まわりは ${pa > pb ? 'あか' : 'あお'}が ながいのに、ひろいのは <b>${['あか', 'あお'][wide2]}</b>`;
      ctx.caption(msg, 0, msg.replace(/<[^>]+>/g, '').replace(/あか/g, '赤').replace(/あお/g, '青'));
      ctx.log('perim', { detail: { pair: key, pa, pb, na, nb } });
    }, 1200);
  }
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="かたち">${Object.entries(PPAIRS).map(([k, p]) => `<button type="button" data-pp="${k}" aria-pressed="${k === key}">${p.label}</button>`).join('')}</div></div>
    <div class="row"><button class="btn small" type="button" data-k="perim">まわりを はかる</button><button class="btn sub small" type="button" data-k="count">マスを かぞえる</button><button class="btn sub small" type="button" data-k="clear">${ctx.ICONS_UI.undo} けす</button></div>`;
  $$p(panel, '[data-pp]').forEach(b => on(b, 'click', () => {
    if (b.dataset.pp === key) { sfx.tap(); ctx.toast('', `いまは「${PPAIRS[key].label}」だよ`, 1.6); return; }
    sfx.tap(); cancel(); key = b.dataset.pp; $$p(panel, '[data-pp]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); layout();
    ctx.caption('まわりの ながさと ひろさを くらべよう', 0, 'まわりの長さと広さを比べよう');
  }));
  on($p(panel, '[data-k="perim"]'), 'click', () => { sfx.tap(); measure(); });
  on($p(panel, '[data-k="count"]'), 'click', () => { sfx.tap(); count(); });
  on($p(panel, '[data-k="clear"]'), 'click', () => { sfx.tap(); cancel(); clear(F.layer('fx')); res = {}; ctx.caption('けしたよ', 0, '消したよ'); });
  F.onResize(() => { cancel(); layout(); });
  layout();
  ctx.caption('まわりが ながい ほうが ひろい？ はかって みよう', 0, 'まわりが長いほうが広い？はかってみよう');
  return { dispose() {}, test: { state: () => ({ key, did, busy }), auto: () => (busy ? { wait: 300 } : !did.p ? { click: 'data-k=perim|' } : !did.n ? { click: 'data-k=count|' } : { done: true }) } };
}

/* ---------- つくる：じんとり ---------- */
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]] };
export function jintori(ctx) {
  const { panel, sfx, ICON } = ctx;
  const F = ctx.openFlat();
  let G = null, N = 6, B = [], turn = 1, left = 0, phase = 'roll', vs = 'cpu', games = 0, cells = new Map();
  const tag0 = () => S.token;
  const who = t => (t === 1 ? { name: 'あか', col: red(), sp: '赤' } : { name: 'あお', col: blue(), sp: '青' });
  const human = t => t === 1 || vs === 'home';
  function newGame() {
    newToken(); killTweens();
    const box = stageBox(F);
    N = Math.min(box.w, box.h) / 8 >= 42 ? 8 : 6;
    B = new Array(N * N).fill(0); B[0] = 1; B[N * N - 1] = 2;
    turn = 1; left = 0; phase = 'roll'; layout(); paintAll();
    ctx.caption('<b>あか</b>（きみ）から。「さいころ」を おしてね', 0, '赤、きみから。さいころを押してね');
    syncPanel();
  }
  function layout() {
    F.clearLayers();
    const box = stageBox(F), w = box.w > box.h * 1.25;
    const gb = w ? { x: box.x, y: box.y, w: box.w - 150, h: box.h } : { x: box.x, y: box.y, w: box.w, h: box.h - 70 };
    G = fitGrid(gb, N, N, 64);
    drawBoard(F.layer('board'), G, { lineCol: C('grid-line') });
    F.layer('cells'); F.layer('marks');
    const dl = F.layer('dice');
    G.die = w ? { x: G.ox + N * G.c + 70, y: G.oy + 70, s: 84 } : { x: F.W / 2, y: G.oy + N * G.c + 38, s: 56 };
    drawDie(dl, 0);
    F.layer('fx');
    paintAll();
  }
  function drawDie(g, k, col) {
    clear(g); const { x, y, s } = G.die;
    const d = el('g', { transform: `translate(${x},${y})` }, g);
    rect(d, -s / 2, -s / 2, s, s, { rx: s * 0.2, fill: C('paper'), stroke: col || C('line'), 'stroke-width': 3 });
    if (!k) { txt(d, 0, s * 0.14, '?', { 'font-size': s * 0.45, fill: C('ink-soft') }); return d; }
    for (const [px, py] of PIPS[k]) circle(d, px * s * 0.24, py * s * 0.24, s * 0.1, { fill: col || C('ink') });
    return d;
  }
  function paintAll() {
    if (!G) return; const g = F.layer('cells'); clear(g); cells = new Map();
    for (let i = 0; i < N * N; i++) if (B[i]) cells.set(i, rect(g, G.X(i % N) + 1, G.Y(Math.floor(i / N)) + 1, G.c - 2, G.c - 2, { rx: 4, fill: who(B[i]).col, opacity: 0.78 }));
    marks();
  }
  function marks() {
    const g = F.layer('marks'); clear(g);
    if (phase !== 'paint' || !human(turn)) return;
    for (const [x, y] of jinMoves(B, N, N, turn)) circle(g, G.X(x) + G.c / 2, G.Y(y) + G.c / 2, G.c * 0.12, { fill: who(turn).col, opacity: 0.5 });
  }
  async function paint(x, y) {
    const i = y * N + x; B[i] = turn; left--;
    const r = rect(F.layer('cells'), G.X(x) + 1, G.Y(y) + 1, G.c - 2, G.c - 2, { rx: 4, fill: who(turn).col, opacity: 0 }); cells.set(i, r);
    sfx.pop(); await tween(0.18, e => r.setAttribute('opacity', 0.78 * e));
  }
  async function roll() {
    if (phase !== 'roll') { sfx.off(); ctx.toast('', phase === 'paint' ? `あと ${left}マス ぬってね` : 'まってね', 1.6); return; }
    phase = 'rolling'; syncPanel(); const tag = S.token, g = F.layer('dice'), col = who(turn).col;
    sfx.roll(); let k = 1;
    for (let j = 0; j < 7; j++) { k = 1 + Math.floor(Math.random() * 3); drawDie(g, k, col); if (!(await wait(0.08)) || !alive(tag)) return; }
    left = k; ctx.log('jin-roll', { detail: { k, turn } });
    const mv = jinMoves(B, N, N, turn);
    if (!mv.length) { ctx.caption(`<b>${who(turn).name}</b>は ぬれる マスが ない。こうたい`, 0, `${who(turn).sp}は塗れるマスがない。交代`); if (!(await wait(1.2)) || !alive(tag)) return; return next(); }
    phase = 'paint'; syncPanel(); marks();
    if (human(turn)) ctx.caption(`<b>${k}マス</b> ぬれるよ。<b>${who(turn).name}</b>の となりの マスを タッチ`, 0, `${k}マス塗れるよ。${who(turn).sp}の隣のマスをタッチ`);
    else { ctx.caption(`<em>コンピュータ</em>は ${k}マス`, 0, `コンピュータは${k}マス`); cpu(); }
  }
  async function cpu() {
    const tag = S.token;
    while (left > 0) { if (!(await wait(0.4)) || !alive(tag)) return; const m = jinPick(B, N, N, turn); if (!m) break; await paint(m[0], m[1]); if (!alive(tag)) return; }
    next();
  }
  async function next() {
    left = 0; marks();
    const empty = B.filter(v => !v).length;
    if (!empty || (!jinMoves(B, N, N, 1).length && !jinMoves(B, N, N, 2).length)) return finish();
    turn = turn === 1 ? 2 : 1; phase = 'roll'; drawDie(F.layer('dice'), 0, who(turn).col); syncPanel();
    if (human(turn)) ctx.caption(`<b>${who(turn).name}</b>の ばん。「さいころ」を おしてね`, 0, `${who(turn).sp}の番。さいころを押してね`);
    else { if (!(await wait(0.5))) return; roll(); }
  }
  async function finish() {
    phase = 'count'; syncPanel(); const tag = S.token, fx = F.layer('fx'); clear(fx);
    ctx.caption('おしまい！ マスを かぞえて くらべよう', 0, 'おしまい！マスを数えて比べよう');
    if (!(await wait(0.8)) || !alive(tag)) return;
    const ofW = t => { const o = []; for (let i = 0; i < N * N; i++) if (B[i] === t) o.push([i % N, Math.floor(i / N)]); return o; };
    const a = await countCells(fx, ofW(1), G, red(), { sfx, per: 0.06 }); if (!alive(tag)) return;
    if (!(await wait(0.4)) || !alive(tag)) return;
    const b = await countCells(fx, ofW(2), G, blue(), { sfx, per: 0.06 }); if (!alive(tag)) return;
    phase = 'over'; games++; syncPanel();
    const msg = a === b ? `あか ${a}マス、あお ${b}マス。<b>ひきわけ</b>` : `あか ${a}マス、あお ${b}マス。<b>${a > b ? 'あか' : 'あお'}の かち！</b> ${Math.abs(a - b)}マス ひろい`;
    if (a >= b) { sfx.good(); hanamaru(F.svg, G.X(N / 2), G.Y(N / 2), G.c * N * 0.3); }
    ctx.toast(a >= b ? ICON.HANAMARU : '', msg, 4, `赤${a}マス、青${b}マス。` + (a === b ? '引き分け' : `${a > b ? '赤' : '青'}の勝ち`));
    ctx.log('jintori', { correct: true, detail: { a, b, n: N, vs } });
    ctx.register('h1-jintori', `${Date.now() % 1e8}:${a}:${b}:${N * N}`);
    ctx.done('jintori');
  }
  function syncPanel() {
    const rb = $p(panel, '[data-k="roll"]'); if (!rb) return;
    rb.disabled = !(((phase === 'roll' || phase === 'paint') && human(turn)) || phase === 'over');
    rb.innerHTML = phase === 'over' ? 'もう いちど' : `${turn === 2 && vs === 'home' ? 'あおの ' : ''}さいころ`;
  }
  F.svg.addEventListener('pointerdown', e => {
    if (!G) return; const c = cellAt(G, F.ptr(e)); if (!c) return;
    if (phase === 'roll' && human(turn)) { sfx.off(); ctx.toast('', 'さきに「さいころ」を おしてね', 1.6); return; }
    if (phase !== 'paint' || !human(turn) || left <= 0) return;
    const [x, y] = c, ok = jinMoves(B, N, N, turn).some(m => m[0] === x && m[1] === y);
    if (!ok) { sfx.off(); ctx.toast('', B[y * N + x] ? 'そこは もう ぬって あるよ' : `${who(turn).name}の となりの マスを えらんでね`, 1.6); return; }
    ctx.hideHud(); paint(x, y);
    if (left > 0 && jinMoves(B, N, N, turn).length) { marks(); ctx.caption(`あと <b>${left}マス</b>`, 0, `あと${left}マス`); }
    else { phase = 'wait'; marks(); syncPanel(); wait(0.35).then(ok => { if (ok) next(); }); }
  });
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="あいて"><button type="button" data-vs="cpu" aria-pressed="true">コンピュータと</button><button type="button" data-vs="home" aria-pressed="false">おうちの ひとと</button></div></div>
    <div class="row"><button class="btn big" type="button" data-k="roll">さいころ</button><button class="btn sub small" type="button" data-k="new">${ctx.ICONS_UI.again} あたらしく</button></div>`;
  $$p(panel, '[data-vs]').forEach(b => on(b, 'click', () => {
    if (b.dataset.vs === vs) { sfx.tap(); ctx.toast('', `いまは「${b.textContent}」だよ`, 1.6); return; }
    sfx.tap(); vs = b.dataset.vs; $$p(panel, '[data-vs]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); newGame();
    if (vs === 'home') ctx.caption('<b>あか</b>と <em>あお</em>で こうたいに さいころを ふろう', 0, '赤と青で交代にさいころをふろう');
  }));
  on($p(panel, '[data-k="roll"]'), 'click', () => { if (phase === 'over') { sfx.tap(); newGame(); return; } sfx.tap(); roll(); });
  on($p(panel, '[data-k="new"]'), 'click', () => { sfx.tap(); newGame(); });
  F.onResize(() => { if (G) { const keepN = N; layout(); N = keepN; } });
  newGame();
  return {
    dispose() {},
    test: {
      state: () => ({ phase, turn, left, games, red: jinCount(B, 1), blue: jinCount(B, 2) }),
      auto() {
        if (games >= 1) return { done: true };
        if (phase === 'roll' && human(turn)) return { click: 'data-k=roll|' };
        if (phase === 'paint' && human(turn) && left > 0) { const m = jinPick(B, N, N, turn, () => 0.5); if (m) return tapOf(F, G.X(m[0]) + G.c / 2, G.Y(m[1]) + G.c / 2); }
        return { wait: 300 };
      },
    },
  };
}

/* ---------- つくる：おなじ ひろさの かたち ---------- */
export function shapes(ctx) {
  const { panel, sfx, ICON } = ctx;
  const F = ctx.openFlat();
  let n = 4, G = null, built = new Set(), busy = false, made = 0, autoStep = 0, shelf = [];
  const coll = () => (ctx.unit.zukan || []).find(z => z.id === 'h1-shape' + n) || { items: [] };
  const itemCells = it => JSON.parse(it.fig.slice(6));
  const found = () => new Set(ctx.zukanList('h1-shape' + n));
  const cancel = () => { newToken(); killTweens(); busy = false; };
  function layout() {
    F.clearLayers();
    const box = stageBox(F), w = box.w > box.h * 1.2;
    const bb = w ? { x: box.x, y: box.y, w: box.w * 0.48, h: box.h } : { x: box.x, y: box.y, w: box.w, h: box.h * 0.62 };
    G = fitGrid(bb, 6, 6, 58);
    drawBoard(F.layer('board'), G);
    F.layer('built');
    // たな（見つけた形）
    const sb = w ? { x: box.x + box.w * 0.52, y: box.y + 8, w: box.w * 0.46, h: box.h - 16 } : { x: box.x, y: box.y + box.h * 0.65, w: box.w, h: box.h * 0.35 };
    const its = coll().items, cols = w ? (n === 4 ? 3 : 4) : (n === 4 ? 5 : 6), rows = Math.ceil(its.length / cols);
    const s = Math.min((sb.w - 8) / cols, (sb.h - 8) / rows, 110);
    shelf = its.map((it, i) => ({ it, x: sb.x + (sb.w - cols * s) / 2 + (i % cols) * s + s / 2, y: sb.y + (sb.h - rows * s) / 2 + Math.floor(i / cols) * s + s / 2, s }));
    drawShelf();
    drawBuilt();
    F.layer('fx');
  }
  function drawShelf() {
    const g = F.layer('shelf'), f = found(); clear(g);
    for (const sl of shelf) {
      const cg = el('g', { transform: `translate(${sl.x},${sl.y})` }, g); sl.g = cg;
      rect(cg, -sl.s / 2 + 4, -sl.s / 2 + 4, sl.s - 8, sl.s - 8, { rx: 10, fill: f.has(sl.it.id) ? C('paper') : C('paper-2'), stroke: C('line'), 'stroke-width': 1.5, 'stroke-dasharray': f.has(sl.it.id) ? null : '5 4' });
      if (f.has(sl.it.id)) { const cs = itemCells(sl.it), b = bbox(cs), u = (sl.s - 24) / Math.max(b.w, b.h, 3); const m = shapeG(cg, cs, u, { color: C('cell-a'), op: 0.8, sw: 2 }); place(m, -b.w * u / 2, -b.h * u / 2 - 6); txt(cg, 0, sl.s / 2 - 10, sl.it.label, { 'font-size': Math.max(10, Math.min(13, sl.s * 0.13)), fill: C('ink-soft') }); }
      else txt(cg, 0, 8, '？', { 'font-size': sl.s * 0.3, fill: C('ink-soft') });
    }
  }
  function drawBuilt() {
    const g = F.layer('built'); clear(g);
    for (const k of built) { const [x, y] = k.split(',').map(Number); rect(g, G.X(x) + 1, G.Y(y) + 1, G.c - 2, G.c - 2, { rx: 5, fill: C('cell-a'), opacity: 0.8 }); }
    const cs = [...built].map(k => k.split(',').map(Number)); if (cs.length) path(g, outlineD(cs, G.c), { transform: `translate(${G.ox},${G.oy})`, stroke: C('cell-a'), 'stroke-width': 3, fill: 'none' });
  }
  F.svg.addEventListener('pointerdown', e => {
    if (busy || !G) return; const c = cellAt(G, F.ptr(e)); if (!c) return; const k = c.join(',');
    if (built.has(k)) built.delete(k);
    else { if (built.size >= n) { sfx.off(); ctx.toast('', `マスは ${n}つ まで。けしてから ぬってね`, 1.8); return; } built.add(k); }
    sfx.tap(); ctx.hideHud(); drawBuilt();
    if (built.size === n) ctx.caption(`${n}つ ぬれた。「できた」を おしてね`, 0, `${n}つ塗れた。できたを押してね`);
  });
  async function check() {
    if (busy) return;
    if (built.size !== n) { sfx.off(); ctx.toast('', `マスを ${n}つ ぬってね（いま ${built.size}つ）`, 2); return; }
    const cs = [...built].map(k => k.split(',').map(Number));
    if (!isConnected(cs)) { sfx.off(); ctx.toast('', 'はなれて いる マスが あるよ。へんで くっつけてね', 2.2); return; }
    busy = true; const tag = S.token, ck = canon(cs).key, sl = shelf.find(s => s.it.key === ck); if (!sl) { busy = false; return; }
    const isNew = !found().has(sl.it.id), nc = norm(cs), b = bbox(cs), k = matchTransform(nc, itemCells(sl.it));
    // 作った形を、たなの向きに まわして・うらがえして 運ぶ
    const g0 = F.layer('built'); clear(g0);
    const fx = F.layer('fx'), cx = G.X(b.x0) + b.w * G.c / 2, cy = G.Y(b.y0) + b.h * G.c / 2;
    const mg = el('g', {}, fx), inner = shapeG(mg, nc, G.c, { color: C('cell-a'), op: 0.85, sw: 3 }); place(inner, -b.w * G.c / 2, -b.h * G.c / 2);
    let sx = 1, th = 0, X = cx, Y = cy, sc = 1;
    const T = () => mg.setAttribute('transform', `translate(${X},${Y}) scale(${sc}) rotate(${th}) scale(${sx},1)`); T();
    if (k >= 4) { ctx.caption('うらがえすと…', 0, '裏返すと'); await tween(0.5, e => { sx = 1 - 2 * e; T(); }, E.io); if (!alive(tag)) return; }
    if (k % 4) { ctx.caption('まわすと…', 0, '回すと'); await tween(0.45 * (k % 4), e => { th = 90 * (k % 4) * e; T(); }, E.io); if (!alive(tag)) return; }
    const u = (sl.s - 24) / Math.max(bbox(itemCells(sl.it)).w, bbox(itemCells(sl.it)).h, 3);
    const X0 = X, Y0 = Y; await tween(0.6, e => { X = X0 + (sl.x - X0) * e; Y = Y0 + (sl.y - 6 - Y0) * e; sc = 1 + (u / G.c - 1) * e; T(); }, E.io);
    if (!alive(tag)) return;
    clear(fx); built.clear(); drawBuilt();
    ctx.register('h1-shape' + n, sl.it.id);
    ctx.log('shape', { correct: true, detail: { n, id: sl.it.id, isNew, k } });
    drawShelf(); made++;
    const got = found().size, tot = shelf.length;
    if (isNew) { sfx.good(); hanamaru(F.svg, sl.x, sl.y, sl.s * 0.45); ctx.toast(ICON.HANAMARU, `あたらしい かたち「${sl.it.label}」！ ${got}/${tot}`, 3, `新しい形、${sl.it.label}！${tot}こ中${got}こ`); }
    else { sfx.pop(); glow(sl); ctx.caption(k === 0 ? `「${sl.it.label}」は もう みつけたよ` : `${k >= 4 ? 'うらがえしたり ' : ''}${k % 4 ? 'まわしたり ' : ''}すると「${sl.it.label}」と <b>おなじ かたち</b>`, 0, `${sl.it.label}と同じ形`); }
    if (got === tot && isNew) { ctx.done('shapes'); setTimeout(() => ctx.caption(`マス${n}つの かたちは <b>ぜんぶで ${tot}しゅるい</b>！`, 0, `マス${n}つの形は全部で${tot}種類！`), 2200); }
    busy = false;
  }
  function glow(sl) { const r = rect(F.layer('fx'), sl.x - sl.s / 2 + 2, sl.y - sl.s / 2 + 2, sl.s - 4, sl.s - 4, { rx: 12, fill: 'none', stroke: C('ok'), 'stroke-width': 4, opacity: 0 }); tween(1.4, e => r.setAttribute('opacity', Math.sin(e * Math.PI * 3) ** 2)); }
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="マスの かず"><button type="button" data-n="4" aria-pressed="true">マス 4つ</button><button type="button" data-n="5" aria-pressed="false">マス 5つ</button></div><button class="btn sub small" type="button" data-k="zukan">ずかん</button></div>
    <div class="row"><button class="btn big" type="button" data-k="check">できた</button><button class="btn sub small" type="button" data-k="clear">${ctx.ICONS_UI.undo} けす</button></div>`;
  $$p(panel, '[data-n]').forEach(b => on(b, 'click', () => {
    if (+b.dataset.n === n) { sfx.tap(); ctx.toast('', `いまは「マス ${n}つ」だよ`, 1.6); return; }
    sfx.tap(); cancel(); n = +b.dataset.n; autoStep = 0; built.clear(); $$p(panel, '[data-n]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); layout();
    ctx.caption(`マスを <b>${n}つ</b> ぬって かたちを つくろう。まわしたり うらがえしたり して かさなる かたちは おなじ`, 0, `マスを${n}つ塗って形をつくろう`);
  }));
  on($p(panel, '[data-k="check"]'), 'click', () => { sfx.tap(); check(); });
  on($p(panel, '[data-k="clear"]'), 'click', () => { sfx.tap(); cancel(); built.clear(); clear(F.layer('fx')); drawBuilt(); ctx.caption('けしたよ', 0, '消したよ'); });
  on($p(panel, '[data-k="zukan"]'), 'click', () => { ctx.openZukan('h1-shape' + n); });
  F.onResize(() => { cancel(); layout(); });
  layout();
  ctx.caption('マスを <b>4つ</b> ぬって かたちを つくろう。なんしゅるい できるかな', 0, 'マスを4つ塗って形をつくろう。何種類できるかな');
  return {
    dispose() {},
    test: {
      state: () => ({ n, built: built.size, made, busy }),
      auto() {
        if (busy) return { wait: 300 };
        if (autoStep >= 2) return { done: true };
        const f = found(), target0 = shelf.find(s => !f.has(s.it.id)) || shelf[0];
        // 1回め：まだの形、2回め：見つけた形を まわした形（おなじ かたち）
        const tc = autoStep === 0 ? itemCells(target0.it) : variant(itemCells(shelf.find(s => f.has(s.it.id)).it), 1);
        const want = new Set(tc.map(([x, y]) => `${x + 1},${y + 1}`));
        const wrong = [...built].find(k => !want.has(k)); if (wrong) { const [x, y] = wrong.split(','); return tapOf(F, G.X(+x) + G.c / 2, G.Y(+y) + G.c / 2); }
        const need = [...want].find(k => !built.has(k)); if (need) { const [x, y] = need.split(','); return tapOf(F, G.X(+x) + G.c / 2, G.Y(+y) + G.c / 2); }
        autoStep++; return { click: 'data-k=check|' };
      },
    },
  };
}
