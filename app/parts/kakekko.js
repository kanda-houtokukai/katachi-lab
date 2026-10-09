// 単位量あたりの大きさ・速さ（S5）。2台を並べて走らせ、時間をそろえる／道のりをそろえる。時速・分速・秒速の行き来。
// こみぐあい（同じ広さのマットに人数）も このモードで作る（新しい部品を増やさないため）。
// opts.mode：miru・komi（こみぐあい）・race（かけっこ）・convert（じそく・ふんそく・びょうそく）・derby（つくる：おなじ はやさを つくろう）
import { el, C, txt, rect, line, circle, path, clear, clamp, lerp, tween, wait, E, hanamaru } from './_flat.js';
import { racers, perMat, spdKid, spdSp, spdTxt, num, r1, r2 } from './_ahead-gen.js';
import { racerIcon } from '../core/figs.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';

export const RU = { komi: 'こみぐあい', tan: '<ruby>単位量<rt>たんいりょう</rt></ruby>', haya: '<ruby>速<rt>はや</rt></ruby>さ', mi: '<ruby>道<rt>みち</rt></ruby>のり', ji: '<ruby>時間<rt>じかん</rt></ruby>', bs: '<ruby>秒速<rt>びょうそく</rt></ruby>', fs: '<ruby>分速<rt>ふんそく</rt></ruby>', js: '<ruby>時速<rt>じそく</rt></ruby>' };
export const RAC = () => racers();

// 人（顔のない簡単な形）
export function person(g, x, y, s, col) { const p = el('g', { transform: `translate(${x},${y})` }, g); circle(p, 0, -s * 0.55, s * 0.3, { fill: col }); path(p, `M${-s * 0.32},${s * 0.4}Q${-s * 0.32},${-s * 0.2} 0,${-s * 0.2}Q${s * 0.32},${-s * 0.2} ${s * 0.32},${s * 0.4}Z`, { fill: col }); return p; }
// マット（たて2〜3列）と人。leveled：1まいあたりの人数を数字で示す
export function drawMats(g, { x, y, w, h, mats, people, col, leveled = false, title = '', hi = false }) {
  const cols = mats <= 4 ? 2 : mats <= 9 ? 3 : 4, rows = Math.ceil(mats / cols), s = Math.min((w - 8) / cols, (h - 30) / rows, 100);
  const ox = x + (w - cols * s) / 2, oy = y + 26;
  if (hi) rect(g, ox - 8, oy - 8, cols * s + 16, rows * s + 16, { rx: 12, fill: 'none', stroke: C('ok'), 'stroke-width': 4 });
  txt(g, x + w / 2, y + 16, title, { 'font-size': 17, class: 'ui', fill: C('ink'), 'font-weight': 900 });
  const cells = [];
  for (let i = 0; i < mats; i++) { const cx = ox + (i % cols) * s, cy = oy + Math.floor(i / cols) * s; rect(g, cx + 2, cy + 2, s - 4, s - 4, { rx: 6, fill: C('wood-pale'), stroke: C('wood'), 'stroke-width': 2 }); cells.push([cx, cy]); }
  if (leveled) {
    const v = perMat(people, mats);
    cells.forEach(([cx, cy]) => { const bh = Math.max(0, (s - 12) * Math.min(1, v / 3)); rect(g, cx + s * 0.3, cy + s - 6 - bh, s * 0.4, bh, { rx: 4, fill: col, opacity: 0.75 }); txt(g, cx + s / 2, cy + s * 0.38, num(v), { 'font-size': Math.max(12, s * 0.24), class: 'ui', fill: C('ink'), 'font-weight': 900 }); });
  } else {
    // 人をマットに順に（となりのマットへ回しながら）置く
    for (let k = 0; k < people; k++) { const m = k % mats, n = Math.floor(k / mats), [cx, cy] = cells[m], ps = Math.min(s * 0.3, 22); const jx = [0.3, 0.7, 0.5, 0.25, 0.75][n % 5], jy = [0.42, 0.62, 0.82, 0.8, 0.45][n % 5]; person(g, cx + s * jx, cy + s * jy, ps, col); }
  }
  return { s, rows, cols };
}
// レーン（2本）。Dmax（m）を幅に。race(...) で走らせる
export function makeLanes(g, { x, y, w, h, names, ids, Dmax, marks = false }) {
  const lh = h / 2, sz0 = Math.min(lh - 14, 44), lx0 = x + 26 + sz0, lx1 = x + w - 30, X = m => lx0 + (lx1 - lx0) * clamp(m / Dmax, 0, 1.05);
  const lanes = [0, 1].map(i => {
    const yy = y + i * lh;
    rect(g, x, yy + 4, w, lh - 8, { rx: 10, fill: i ? C('paper-2') : C('paper'), stroke: C('line'), 'stroke-width': 1.5 });
    txt(g, x + 13, yy + lh / 2 + 7, i ? 'い' : 'あ', { 'font-size': 20, class: 'ui', fill: i ? C('face-4') : C('face-1'), 'font-weight': 900 });
    line(g, lx0, yy + 8, lx0, yy + lh - 8, { stroke: C('ink-soft'), 'stroke-width': 2 });
    const tk = el('g', {}, g), trail = rect(g, lx0, yy + lh - 16, 0, 6, { rx: 3, fill: i ? C('face-4') : C('face-1'), opacity: 0.6 });
    const ic = el('g', {}, g), sz = sz0;
    const inner = el('g', { transform: `scale(${sz / 40})` }, ic); inner.innerHTML = racerIcon(ids[i]).replace(/^<svg[^>]*>|<\/svg>$/g, '');
    const lab = txt(g, 0, yy + 18, '', { 'font-size': 14, class: 'ui', fill: C('ink'), 'font-weight': 900 });
    const nm = txt(g, x + w - 8, yy + lh - 10, names[i], { 'font-size': 12, class: 'ui', fill: C('ink-soft'), 'text-anchor': 'end' });
    return { yy, ic, sz, trail, lab, tk, set(m, text) { const px = X(m); ic.setAttribute('transform', `translate(${px - sz},${yy + (lh - sz) / 2 - 2})`); trail.setAttribute('width', Math.max(0, px - lx0)); if (text != null) { lab.textContent = text; lab.setAttribute('x', clamp(px - sz / 2, lx0 + 30, lx1 - 20)); } } };
  });
  return { lanes, X, lx0, lx1, lh, y, ticks(i, every, n, label) { const L = lanes[i], g2 = L.tk; clear(g2); for (let k = 1; k <= n; k++) { const px = X(every * k); if (px > lx1 + 4) break; line(g2, px, L.yy + lh - 22, px, L.yy + lh - 6, { stroke: C('ink'), 'stroke-width': 1.5 }); } if (label) txt(g2, lx0 + 4, L.yy + lh - 24, label, { 'font-size': 11, class: 'ui', fill: C('ink-soft'), 'text-anchor': 'start' }); } };
}
// 2台を走らせる。sameT：同じ時間 T（秒）、sameD：同じ道のり D（m）。v は秒速（m）
export async function runRace(ln, vs, { sameT = null, sameD = null, times = null, dur = 3 } = {}) {
  const tag = S.token;
  const tEnd = times || (sameT != null ? [sameT, sameT] : vs.map(v => sameD / v)), tmax = Math.max(...tEnd);
  await tween(dur, k => { const t = tmax * k; ln.lanes.forEach((L, i) => { const tt = Math.min(t, tEnd[i]); L.set(vs[i] * tt, `${num(r1(vs[i] * tt))}m・${num(r1(tt))}びょう`); }); }, E.lin);
  if (!alive(tag)) return null;
  ln.lanes.forEach((L, i) => L.set(vs[i] * tEnd[i], `${num(r1(vs[i] * tEnd[i]))}m を ${num(r1(tEnd[i]))}びょう`));
  return tEnd;
}
// 1びょうごとの しるし（つまりすぎたら 10びょう・60びょうごと）
export function secMarks(ln, vs, Dmax) {
  vs.forEach((v, i) => { const px = (ln.lx1 - ln.lx0) / Dmax; let every = 1; for (const e of [1, 10, 60]) { every = e; if (v * e * px >= 10) break; } ln.ticks(i, v * every, 400, `${every === 1 ? '1びょう' : every + 'びょう'}ごと ${num(r1(v * every))}m`); });
}

export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const mode = opts.mode || 'race';
  const F = ctx.openFlat();
  const api = { dispose() {}, test: {} };
  const area = () => { const y0 = F.top + F.cap, y1 = F.bottom - 10; return { x0: 14, x1: F.W - 14, y0, y1, w: F.W - 28, h: y1 - y0, land: F.W >= 640 }; };
  const say = (h, s) => ctx.caption(h, 0, s);
  const R = RAC(), by = id => R.find(r => r.id === id);
  // 2つのマットの置き場（横長は左右、縦長は上下）
  const matBoxes = A => A.land ? [{ x: A.x0 + A.w * 0.06, y: A.y0, w: A.w * 0.4, h: A.h }, { x: A.x0 + A.w * 0.54, y: A.y0, w: A.w * 0.4, h: A.h }] : [{ x: A.x0, y: A.y0, w: A.w, h: A.h / 2 - 4 }, { x: A.x0, y: A.y0 + A.h / 2 + 4, w: A.w, h: A.h / 2 - 4 }];

  /* ======================= みる ======================= */
  if (mode === 'miru') {
    panel.innerHTML = `<div class="row"><button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again} もういちど みる</button></div>`;
    let phase = 'play', draw = null;
    const build = () => { F.clearLayers(); draw && draw(area()); };
    F.onResize(build);
    on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); run(); });
    const mats = (a, b, lv = false, hi = -1) => { draw = A => { const g = F.layer('m'), bx = matBoxes(A); drawMats(g, Object.assign({}, bx[0], { mats: a[0], people: a[1], col: C('face-1'), leveled: lv, title: `あ：マット ${a[0]}まいに ${a[1]}にん`, hi: hi === 0 })); drawMats(g, Object.assign({}, bx[1], { mats: b[0], people: b[1], col: C('face-4'), leveled: lv, title: `い：マット ${b[0]}まいに ${b[1]}にん`, hi: hi === 1 })); }; build(); };
    async function run() {
      const tag = S.token, ok = () => alive(tag); phase = 'play';
      mats([6, 9], [6, 7]);
      say('どちらが こんで いる？ マットの かずが おなじなら、ひとが おおい ほう', 'どちらがこんでいる？マットの数が同じなら、人が多いほう'); if (!(await wait(3)) || !ok()) return;
      mats([6, 9], [6, 7], false, 0); if (!(await wait(1.2)) || !ok()) return;
      mats([6, 9], [8, 9]);
      say('ひとの かずが おなじなら、マットが すくない（せまい）ほうが こんで いる', '人の数が同じなら、マットが少ない、狭いほうがこんでいる'); if (!(await wait(3)) || !ok()) return;
      mats([6, 9], [8, 9], false, 0); if (!(await wait(1.2)) || !ok()) return;
      mats([6, 9], [8, 10]);
      say('どちらも ちがうと？ マット 1まい あたりの にんずうに <b>ならして</b> くらべる', 'どちらも違うと？マット1枚あたりの人数にならして比べる'); if (!(await wait(3)) || !ok()) return;
      mats([6, 9], [8, 10], true);
      say(`あ 1まい あたり ${num(perMat(9, 6))}にん、い ${num(perMat(10, 8))}にん。あの ほうが こんで いる`, `あ、1枚あたり${num(perMat(9, 6))}人。い、${num(perMat(10, 8))}人。あのほうがこんでいる`); if (!(await wait(3.2)) || !ok()) return;
      mats([6, 9], [8, 10], true, 0); if (!(await wait(1.2)) || !ok()) return;
      // はやさ
      let ln = null;
      const lanes = (ids, Dmax) => { draw = A => { const h = Math.min(A.h * 0.7, 210); ln = makeLanes(F.layer('l'), { x: A.x0, y: A.y0 + (A.h - h) / 2, w: A.w, h, names: ids.map(i => by(i).name), ids, Dmax }); ln.lanes.forEach(L => L.set(0, '')); }; build(); };
      lanes(['hashiru', 'jitensha'], 55);
      say(`${RU.haya}くらべ。<b>${RU.ji}を そろえて</b> 10びょう はしると…`, '速さ比べ。時間をそろえて10秒走ると'); if (!(await wait(1.6)) || !ok()) return;
      if (!(await runRace(ln, [4, 5], { sameT: 10 }))) return;
      say(`10びょうで あ 40m、い 50m。ながく すすんだ いが はやい`, '10秒で、あ40メートル、い50メートル。長く進んだいが速い'); if (!(await wait(3)) || !ok()) return;
      lanes(['hashiru', 'jitensha'], 105);
      say(`こんどは <b>${RU.mi}を そろえて</b> 100m`, '今度は道のりをそろえて100メートル'); if (!(await wait(1.4)) || !ok()) return;
      if (!(await runRace(ln, [4, 5], { sameD: 100 }))) return;
      say('100mを あ 25びょう、い 20びょう。みじかい じかんの いが はやい', '100メートルを、あ25秒、い20秒。短い時間のいが速い'); if (!(await wait(3)) || !ok()) return;
      lanes(['hashiru', 'jitensha'], 66);
      say('あ 60mを 12びょう、い 40mを 10びょう。どちらも ちがうと？', 'あ60メートルを12秒、い40メートルを10秒。どちらも違うと？'); if (!(await wait(2)) || !ok()) return;
      if (!(await runRace(ln, [5, 4], { times: [12, 10] }))) return;
      secMarks(ln, [5, 4], 66);
      say(`1びょう あたりに すすむ ${RU.mi}で くらべる。あ 5m、い 4m。これが ${RU.bs}`, '1秒あたりに進む道のりで比べる。あ5メートル、い4メートル。これが秒速'); if (!(await wait(3.4)) || !ok()) return;
      say(`${RU.haya} ＝ ${RU.mi} ÷ ${RU.ji}`, '速さは、道のりわる時間'); if (!(await wait(2.4)) || !ok()) return;
      // 時速・分速・秒速
      draw = A => { convRows(F.layer('c'), A, by('jitensha'), 3); }; build();
      say(`じてんしゃ ${RU.bs} 5m。1ぷん（60びょう）では ×60 で ${RU.fs} 300m`, '自転車、秒速5メートル。1分では60倍で分速300メートル'); if (!(await wait(3.2)) || !ok()) return;
      say(`1じかん（60ぷん）では ×60 で 18000m ＝ ${RU.js} 18km`, '1時間では60倍で18000メートル、時速18キロメートル'); if (!(await wait(3.2)) || !ok()) return;
      say('つぎは「さわる」で くらべて みよう', '次は「さわる」で比べてみよう'); ctx.log('miru'); phase = 'done';
    }
    run();
    api.test = { state: () => ({ phase }), auto: () => (phase === 'done' ? { done: true } : { wait: 400 }) };
    return api;
  }

  /* ======================= さわる：こみぐあい ======================= */
  if (mode === 'komi') {
    const st = { a: [6, 9], b: [8, 10], leveled: false };
    const build = () => {
      F.clearLayers(); const A = area(), bx = matBoxes(A), g = F.layer('m');
      const ka = perMat(st.a[1], st.a[0]), kb = perMat(st.b[1], st.b[0]);
      drawMats(g, Object.assign({}, bx[0], { mats: st.a[0], people: st.a[1], col: C('face-1'), leveled: st.leveled, title: `あ：${st.a[0]}まいに ${st.a[1]}にん`, hi: st.leveled && ka > kb }));
      drawMats(g, Object.assign({}, bx[1], { mats: st.b[0], people: st.b[1], col: C('face-4'), leveled: st.leveled, title: `い：${st.b[0]}まいに ${st.b[1]}にん`, hi: st.leveled && kb > ka }));
    };
    F.onResize(build); build();
    const row = (k, lab) => `<div class="row"><b>${lab}</b><button class="btn sub small" type="button" data-op="${k}p-">ひと −</button><button class="btn sub small" type="button" data-op="${k}p+">ひと ＋</button><button class="btn sub small" type="button" data-op="${k}m-">マット −</button><button class="btn sub small" type="button" data-op="${k}m+">マット ＋</button></div>`;
    panel.innerHTML = `${row('a', 'あ')}${row('b', 'い')}<div class="row"><button class="btn" type="button" data-k="level">ならして くらべる</button></div>`;
    let levels = 0;
    $$p(panel, '[data-op]').forEach(b => on(b, 'click', () => {
      sfx.tap(); const [g, w, d] = [b.dataset.op[0], b.dataset.op[1], b.dataset.op[2]], arr = st[g], i = w === 'p' ? 1 : 0, lim = w === 'p' ? [1, 24] : [1, 12];
      const v = arr[i] + (d === '+' ? 1 : -1);
      if (v < lim[0] || v > lim[1]) { ctx.toast('', `${w === 'p' ? 'ひと' : 'マット'}は ${lim[0]}から ${lim[1]}まで`, 1.8); return; }
      arr[i] = v; st.leveled = false; build();
      say(`${g === 'a' ? 'あ' : 'い'}：マット ${arr[0]}まいに ${arr[1]}にん`, `${g === 'a' ? 'あ' : 'い'}、マット${arr[0]}枚に${arr[1]}人`);
    }));
    on($p(panel, '[data-k="level"]'), 'click', () => {
      sfx.tap(); const ka = perMat(st.a[1], st.a[0]), kb = perMat(st.b[1], st.b[0]);
      if (st.leveled) { st.leveled = false; build(); say('もとに もどしたよ', '元に戻したよ'); return; }
      st.leveled = true; build(); levels++;
      const w = ka === kb ? 'おなじ こみぐあい' : `${ka > kb ? 'あ' : 'い'}の ほうが こんで いる`;
      say(`1まい あたり あ ${num(ka)}にん・い ${num(kb)}にん。${w}`, `1枚あたり、あ${num(ka)}人、い${num(kb)}人。${w}`);
      ctx.log('komi', { detail: { a: st.a.slice(), b: st.b.slice(), ka, kb } });
    });
    say('ひとや マットを ふやしたり へらしたり して、こみぐあいを くらべよう', '人やマットを増やしたり減らしたりして、こみぐあいを比べよう');
    api.test = { state: () => ({ levels, leveled: st.leveled }), auto: () => (levels >= 1 && st.leveled ? { done: true } : { click: 'data-k=level|' }) };
    return api;
  }

  /* ======================= さわる：かけっこ・つくる：おなじ はやさ ======================= */
  if (mode === 'race') {
    const st = { ids: ['hashiru', 'jitensha'], how: 'T', marks: false, done: false, races: 0 };
    let ln = null, busy = false;
    const Dmax = () => { const vs = st.ids.map(i => by(i).mps); return st.how === 'T' ? Math.max(...vs) * 10 * 1.08 : 105; };
    const build = () => {
      F.clearLayers(); const A = area(), h = Math.min(A.h * 0.8, 230);
      ln = makeLanes(F.layer('l'), { x: A.x0, y: A.y0 + (A.h - h) / 2, w: A.w, h, names: st.ids.map(i => by(i).name), ids: st.ids, Dmax: Dmax() });
      ln.lanes.forEach((L, i) => { const v = by(st.ids[i]).mps; if (!st.done) L.set(0, ''); else { const t = st.how === 'T' ? 10 : 100 / v; L.set(v * t, `${num(r1(v * t))}m を ${num(r1(t))}びょう`); } });
      if (st.marks && st.done) secMarks(ln, st.ids.map(i => by(i).mps), Dmax());
    };
    F.onResize(build); build();
    panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="くらべかた"><button type="button" data-how="T" aria-pressed="true">じかんを そろえる</button><button type="button" data-how="D" aria-pressed="false">みちのりを そろえる</button></div></div>
      <div class="row"><button class="btn sub small" type="button" data-sw="0">あを かえる</button><button class="btn sub small" type="button" data-sw="1">いを かえる</button><button class="btn" type="button" data-k="go">よーい どん</button><button class="btn sub small" type="button" data-k="marks" aria-pressed="false">1びょうごとの しるし</button></div>`;
    const reset = () => { st.done = false; build(); };
    $$p(panel, '[data-how]').forEach(b => on(b, 'click', () => {
      sfx.tap(); if (busy) return; if (st.how === b.dataset.how) { ctx.toast('', `いまは「${b.textContent}」だよ`, 1.6); return; }
      st.how = b.dataset.how; $$p(panel, '[data-how]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.how === st.how))); reset();
      say(st.how === 'T' ? 'おなじ 10びょうで どこまで いける？' : 'おなじ 100mを なんびょうで はしる？', st.how === 'T' ? '同じ10秒でどこまで行ける？' : '同じ100メートルを何秒で走る？');
    }));
    $$p(panel, '[data-sw]').forEach(b => on(b, 'click', () => {
      sfx.tap(); if (busy) return; const i = +b.dataset.sw, other = st.ids[1 - i];
      let k = R.findIndex(r => r.id === st.ids[i]); do { k = (k + 1) % R.length; } while (R[k].id === other);
      st.ids[i] = R[k].id; reset(); say(`${i ? 'い' : 'あ'}は ${R[k].name}`, `${i ? 'い' : 'あ'}は${R[k].name}`);
    }));
    on($p(panel, '[data-k="go"]'), 'click', async () => {
      if (busy) return; sfx.pop(); busy = true; const tag = S.token; st.done = false; build();
      const vs = st.ids.map(i => by(i).mps);
      const t = await runRace(ln, vs, st.how === 'T' ? { sameT: 10 } : { sameD: 100 }); if (!t || !alive(tag)) return;
      busy = false; st.done = true; st.races++; if (st.marks) secMarks(ln, vs, Dmax());
      st.ids.forEach(i => ctx.register('hayasa', i));
      const f = vs[0] === vs[1] ? -1 : vs[0] > vs[1] ? 0 : 1, nm = f < 0 ? 'おなじ' : by(st.ids[f]).name;
      if (st.how === 'T') say(`10びょうで あ ${num(r1(vs[0] * 10))}m・い ${num(r1(vs[1] * 10))}m。${f < 0 ? 'おなじ はやさ' : `ながく すすんだ ${nm}が はやい`}`, `10秒で、あ${num(r1(vs[0] * 10))}メートル、い${num(r1(vs[1] * 10))}メートル`);
      else say(`100mを あ ${num(r1(100 / vs[0]))}びょう・い ${num(r1(100 / vs[1]))}びょう。${f < 0 ? 'おなじ はやさ' : `みじかい じかんの ${nm}が はやい`}`, `100メートルを、あ${num(r1(100 / vs[0]))}秒、い${num(r1(100 / vs[1]))}秒`);
      ctx.log('race', { detail: { ids: st.ids.slice(), how: st.how } });
    });
    on($p(panel, '[data-k="marks"]'), 'click', () => {
      sfx.tap(); const b = $p(panel, '[data-k="marks"]'); st.marks = !st.marks; b.setAttribute('aria-pressed', String(st.marks));
      if (st.marks && !st.done) { ctx.toast('', 'はしった あとに しるしが でるよ。「よーい どん」を おしてね', 2.4); return; }
      build(); if (st.marks) { const vs = st.ids.map(i => by(i).mps); say(`1びょうで すすむ ${RU.mi}（${RU.bs}）：あ ${num(vs[0])}m、い ${num(vs[1])}m`, `1秒で進む道のり、秒速。あ${num(vs[0])}メートル、い${num(vs[1])}メートル`); }
    });
    say('「よーい どん」で はしらせて くらべよう', 'よーいどんで走らせて比べよう');
    api.test = { state: () => ({ races: st.races, busy }), auto: () => (busy ? { wait: 300 } : st.races >= 1 ? { done: true } : { click: 'data-k=go|' }) };
    return api;
  }

  /* ======================= さわる：じそく・ふんそく・びょうそく ======================= */
  if (mode === 'convert') {
    const list = R.filter(r => r.exact && r.id !== 'hikouki').concat(R.filter(r => r.id === 'hikouki'));
    const st = { i: 1, from: 'mps', plays: 0 };
    let busy = false;
    const build = (k = new Set([{ mps: 1, mpm: 2, kmh: 3 }[st.from]])) => { F.clearLayers(); convRows(F.layer('c'), area(), list[st.i], st.plays && k instanceof Set && k.size === 1 && st.shown === st.i + st.from ? 3 : k, st.from); };
    F.onResize(() => build()); build();
    panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="はじめの はやさ"><button type="button" data-from="mps" aria-pressed="true">${RU.bs}から</button><button type="button" data-from="mpm" aria-pressed="false">${RU.fs}から</button><button type="button" data-from="kmh" aria-pressed="false">${RU.js}から</button></div></div>
      <div class="row"><button class="btn sub small" type="button" data-k="next">つぎの のりもの</button><button class="btn" type="button" data-k="play">けいさんを みる</button></div>`;
    const play = async () => {
      if (busy) return; busy = true; const tag = S.token, r = list[st.i];
      const ord = st.from === 'kmh' ? [3, 2, 1] : st.from === 'mpm' ? [2, 1, 3] : [1, 2, 3];
      const vis = new Set();
      for (const k of ord) { vis.add(k); F.clearLayers(); convRows(F.layer('c'), area(), r, vis, st.from); sfx.tap(); if (!(await wait(0.9)) || !alive(tag)) { busy = false; return; } }
      busy = false; st.plays++; st.shown = st.i + st.from;
      say(`${r.name}：${spdKid(r.mps, 'mps')} ＝ ${spdKid(r.mpm, 'mpm')} ＝ ${spdKid(r.kmh, 'kmh')}`, `${r.name}、${spdSp(r.mps, 'mps')}は${spdSp(r.mpm, 'mpm')}、${spdSp(r.kmh, 'kmh')}`);
      ctx.register('hayasa', r.id); ctx.log('convert', { detail: { id: r.id, from: st.from } });
    };
    $$p(panel, '[data-from]').forEach(b => on(b, 'click', () => { sfx.tap(); if (busy) return; if (st.from === b.dataset.from) { ctx.toast('', `いまは「${b.textContent}」だよ`, 1.6); return; } st.from = b.dataset.from; $$p(panel, '[data-from]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.from === st.from))); build(new Set([{ mps: 1, mpm: 2, kmh: 3 }[st.from]])); say(`${{ mps: RU.bs, mpm: RU.fs, kmh: RU.js }[st.from]}から ほかの はやさに なおそう`, 'ほかの速さに直そう'); }));
    on($p(panel, '[data-k="next"]'), 'click', () => { sfx.tap(); if (busy) return; st.i = (st.i + 1) % list.length; build(); say(`${list[st.i].name}`, list[st.i].name); });
    on($p(panel, '[data-k="play"]'), 'click', () => { sfx.tap(); play(); });
    say('「けいさんを みる」で、60ばいずつ ならべて なおそう', '計算を見る、で60倍ずつ並べて直そう');
    api.test = { state: () => ({ plays: st.plays, busy }), auto: () => (busy ? { wait: 300 } : st.plays >= 1 ? { done: true } : { click: 'data-k=play|' }) };
    return api;
  }

  /* ======================= つくる：おなじ はやさを つくろう ======================= */
  if (mode === 'derby') {
    const targets = ['jitensha', 'hashiru', 'uma', 'densha', 'cheetah', 'hikouki'].map(by);
    const st = { ti: 0, v: 3, done: new Set(), raced: false };
    let ln = null, busy = false;
    const tg = () => targets[st.ti];
    const build = () => {
      F.clearLayers(); const A = area(), h = Math.min(A.h * 0.62, 210), t = tg();
      const g = F.layer('l');
      txt(g, A.x0 + A.w / 2, A.y0 + 16, `めあて：${t.name}　じそく ${num(t.kmh)}km`, { 'font-size': 18, class: 'ui', fill: C('ink'), 'font-weight': 900 });
      ln = makeLanes(g, { x: A.x0, y: A.y0 + 30 + (A.h - 30 - h) / 2, w: A.w, h, names: [t.name, 'わたし'], ids: [t.id, 'hashiru'], Dmax: Math.max(t.mps, st.v) * 10 * 1.08 });
      ln.lanes.forEach(L => L.set(0, ''));
      txt(g, A.x0 + A.w / 2, A.y1 - 4, `わたし：びょうそく ${st.v}m`, { 'font-size': 18, class: 'ui', fill: C('face-4'), 'font-weight': 900 });
    };
    F.onResize(build); build();
    const sayGoal = () => { const t = tg(); say(`${t.name}は ${RU.js} ${num(t.kmh)}km。おなじ はやさに なるように「わたし」の ${RU.bs}を きめよう`, `${t.name}は時速${num(t.kmh)}キロメートル。同じ速さになるように、わたしの秒速を決めよう`); };
    panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-dv="-10">−10m</button><button class="btn sub small" type="button" data-dv="-1">−1m</button><button class="btn sub small" type="button" data-dv="1">＋1m</button><button class="btn sub small" type="button" data-dv="10">＋10m</button><button class="btn" type="button" data-k="go">きょうそう</button></div>`;
    $$p(panel, '[data-dv]').forEach(b => on(b, 'click', () => {
      sfx.tap(); if (busy) return; const v = st.v + +b.dataset.dv;
      if (v < 1 || v > 300) { ctx.toast('', 'びょうそくは 1mから 300mまで', 1.8); return; }
      st.v = v; build(); say(`わたし：${RU.bs} ${v}m（${RU.js} ${num(r1(v * 3.6))}km）`, `わたし、秒速${v}メートル`);
    }));
    on($p(panel, '[data-k="go"]'), 'click', async () => {
      if (busy) return; sfx.pop(); busy = true; const tag = S.token, t = tg(); build();
      const res = await runRace(ln, [t.mps, st.v], { sameT: 10 }); if (!res || !alive(tag)) return;
      busy = false; const ok = Math.abs(t.mps - st.v) < 1e-9;
      ctx.log('derby', { correct: ok, detail: { id: t.id, v: st.v, want: t.mps } });
      if (ok) {
        sfx.good(); st.done.add(t.id); ctx.register('hayasa', t.id); ctx.register('hayasa', 'hashiru');
        hanamaru(F.svg, ln.lanes[1].ic ? (ln.lx1 - 40) : F.W / 2, ln.y + ln.lh, 40);
        ctx.toast(ICON.HANAMARU, `ならんで ゴール！ ${RU.js} ${num(t.kmh)}km ＝ ${RU.bs} ${num(t.mps)}m`, 3, `並んでゴール！時速${num(t.kmh)}キロメートルは秒速${num(t.mps)}メートル`);
        if (st.done.size === 1) ctx.done('derby');
        if (st.done.size < targets.length) setTimeout(() => { if (!alive(tag)) return; st.ti = targets.findIndex(x => !st.done.has(x.id)); build(); sayGoal(); }, 3100);
        else setTimeout(() => alive(tag) && say('ぜんぶ できた！ はやさ ずかんを みてね', '全部できた！速さ図鑑を見てね'), 3100);
      } else {
        sfx.bad();
        say(`10びょうで ${t.name} ${num(r1(t.mps * 10))}m、わたし ${st.v * 10}m。わたしが ${st.v > t.mps ? 'はやすぎる' : 'おそい'}。${RU.js} ÷ 3.6 ＝ ${RU.bs}`, `わたしが${st.v > t.mps ? '速すぎる' : '遅い'}。時速わる3.6で秒速`);
      }
    });
    sayGoal();
    api.test = {
      state: () => ({ done: st.done.size, v: st.v, busy }),
      auto() {
        if (busy) return { wait: 300 };
        if (st.done.size >= 2) return { done: true };
        const d = tg().mps - st.v;
        if (d === 0) return st.done.has(tg().id) ? { wait: 500 } : { click: 'data-k=go|' };
        const step = Math.abs(d) >= 10 ? 10 : 1;
        return { click: `data-dv=${d > 0 ? step : -step}|` };
      },
    };
    return api;
  }
  return api;
}

// 時速・分速・秒速の3段（1びょう → ×60 → 1ぷん → ×60 → 1じかん）。vis：見せる段（数 or Set）
export function convRows(g, A, r, vis = 3, from = 'mps') {
  clear(g);
  const show = k => (vis instanceof Set ? vis.has(k) : k <= vis);
  const rows = [
    { k: 1, lab: '1びょうで', v: `${num(r.mps)}m`, name: 'びょうそく' },
    { k: 2, lab: '1ぷん（60びょう）で', v: `${num(r.mpm)}m`, name: 'ふんそく' },
    { k: 3, lab: '1じかん（60ぷん）で', v: `${num(r.kmh)}km（${num(r.mpm * 60)}m）`, name: 'じそく' },
  ];
  const rh = Math.min(84, (A.h - 40) / 3), x = A.x0 + 6, w = A.w - 12, y0 = A.y0 + Math.max(0, (A.h - rh * 3 - 30) / 2);
  const ic = el('g', { transform: `translate(${x},${y0}) scale(${Math.min(1.1, rh / 50)})` }, g);
  ic.innerHTML = racerIcon(r.id).replace(/^<svg[^>]*>|<\/svg>$/g, '');
  txt(g, x + rh * 0.9 + 8, y0 + 24, r.name, { 'font-size': 18, class: 'ui', 'text-anchor': 'start', fill: C('ink'), 'font-weight': 900 });
  rows.forEach((o, i) => {
    const yy = y0 + 40 + i * rh, on = show(o.k), given = { mps: 1, mpm: 2, kmh: 3 }[from] === o.k;
    rect(g, x, yy, w, rh - 12, { rx: 12, fill: given ? C('hint-bg') : C('paper'), stroke: given ? C('hint') : C('line'), 'stroke-width': 2, opacity: on ? 1 : 0.35 });
    // 60こ ならぶ ぶろっく（1つ上の段の 1つぶん）
    const bw = Math.min(w * 0.42, 260), bx = x + w - bw - 12, n = o.k === 1 ? 1 : 60;
    for (let j = 0; j < n; j++) rect(g, bx + bw * j / n, yy + (rh - 12) * 0.55, Math.max(0.6, bw / n - (n > 1 ? 0.6 : 0)), (rh - 12) * 0.28, { fill: o.k === 1 ? C('face-1') : o.k === 2 ? C('face-2') : C('face-3'), opacity: on ? 0.9 : 0.25 });
    txt(g, x + 12, yy + (rh - 12) * 0.42, `${o.name}：${o.lab}`, { 'font-size': 15, class: 'ui', 'text-anchor': 'start', fill: C('ink-soft') });
    txt(g, x + 12, yy + (rh - 12) * 0.85, on ? o.v : '？', { 'font-size': 20, class: 'ui', 'text-anchor': 'start', fill: on ? C('ok') : C('ink-soft'), 'font-weight': 900 });
    if (i < 2) txt(g, bx - 10, yy + rh - 4, '×60 ↓', { 'font-size': 13, class: 'ui', 'text-anchor': 'end', fill: C('sora'), 'font-weight': 900 });
  });
}
