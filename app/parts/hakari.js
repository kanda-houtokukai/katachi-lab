// はかり（重さ O3）：見本 v1 の 40-scale を移したもの。
// opts.mode：
//   miru（手 → てんびん → 1円玉 → g の じゅんに 比べ方を とおす。形を変えても同じ・振り切れ・1t）
//   scale（はかりに のせる。秤量 1kg・2kg・4kg、むしめがね、ねんどの形。量った物を ずかん o3-mass に）
//   net（いれものごと はかる：ボウルを のせて 0に あわせる・正味）
//   ton（1t：1Lの みず 1000ぼん・クラスの みんなの 体重）
//   kg（つくる「1kg を つくろう」：ちょうど 1000g の 組を ずかん o3-kg に）
import { scaleScene, balanceScene, handsScene, massOf, nameOfM } from './_scale.js';
import { el, C, txt, rect, clear, wait, hanamaru, tween, E, clamp } from './_flat.js';
import { gText, gSpeech, KG_ITEMS, kgCombos, comboId, CAPS } from './_omosa.js';
import { monoSVG } from './_mono.js';
import { bench } from '../core/bench.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';
import { pick } from '../core/text.js';

const SHELF = ['apple', 'egg', 'carrot', 'banana', 'orange', 'potato', 'textbook', 'clay', 'water1L', 'pumpkin', 'cabbage'];
export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const mode = opts.mode || 'scale';
  const F = ctx.openFlat();
  const say = (h, s) => ctx.caption(h, 0, s || null);
  let cur = null;   // いまの 舞台（はかり／てんびん）
  const api = { dispose() { cur && cur.dispose && cur.dispose(); }, test: {} };
  const capSeg = c => `<div class="seg" role="group" aria-label="はかり">${[1000, 2000, 4000].map(v => `<button type="button" data-cap="${v}" aria-pressed="${v === c}">${v / 1000}kg</button>`).join('')}</div>`;

  /* ---------- みる ---------- */
  if (mode === 'miru') {
    panel.innerHTML = `<div class="row"><button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again} もういちど みる</button></div>`;
    let phase = 'play', runId = 0, hands = null;
    const swap = make => { if (cur) cur.dispose(); if (hands) { hands.clear(); hands = null; } F.clearLayers(); cur = make ? make() : null; return cur; };
    on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); run(); });
    async function run() {
      const my = ++runId, tag = S.token; phase = 'play';
      const ok = () => alive(tag) && my === runId, w = async s => (await wait(s)) && ok();
      swap(null); hands = handsScene(F, 'sponge', 'ironball');
      say('おおきい スポンジと ちいさい てつの たま。てで もつと…', '大きいスポンジと、小さい鉄の玉。手で持つと'); if (!(await w(2.8))) return;
      say('てでは はっきり しない。<b>てんびん</b>で くらべよう', '手でははっきりしない。てんびんでくらべよう'); if (!(await w(2))) return;
      const bal = swap(() => balanceScene(F, ctx, { L: ['sponge'], R: ['ironball'] })); bal.hold = true; bal.draw();
      if (!(await w(1.2))) return; bal.hold = false; await bal.waitSettle(); if (!ok()) return;
      say('<b>てつの たま</b>の ほうが おもい。おおきい ほうが おもい とは かぎらない', '鉄の玉のほうが重い。大きいほうが重いとは限らない'); if (!(await w(3.2))) return;
      bal.L = ['egg']; bal.R = []; bal.coins = 0; bal.draw();
      say('たまごと <b>1えんだま</b>で くらべよう', 'たまごと1円玉でくらべよう'); if (!(await w(1.4))) return;
      const egg = massOf('egg');
      for (let i = 10; i <= egg; i += 10) { bal.coins = i; bal.setLabel(`1えんだま ${i}まい`); sfx.tick(i / 10); bal.draw(); if (!(await w(0.5))) return; }
      await bal.waitSettle(); if (!ok()) return;
      say(`1えんだま <b>${egg}まい</b>で つりあった。1えんだま 1まいは <b>1g</b>。たまごは <b>${egg}g</b>`, `1円玉${egg}枚でつりあった。1円玉1枚は1グラム。たまごは${egg}グラム`); if (!(await w(4))) return;
      const sc = swap(() => scaleScene(F, ctx, { cap: 1000 }));
      say('<b>はかり</b>に のせると…', 'はかりにのせると'); if (!(await w(1))) return;
      sc.plate = ['egg']; sfx.land(); sc.drawPlate(); await sc.waitSettle(); if (!ok()) return;
      sc.lens = true; sc.drawLens(); say(`<b>${gText(egg)}</b>。めもり 1つは <b>${CAPS[1000].minor}g</b>`, `${gSpeech(egg)}。目もり1つは${CAPS[1000].minor}グラム`); if (!(await w(3.6))) return;
      sc.lens = false; sc.drawLens();
      const clay = massOf('clay'); sc.plate = ['clay']; sc.clay = 0; sfx.land(); sc.drawPlate(); await sc.waitSettle(); if (!ok()) return;
      say(`ねんど <b>${gText(clay)}</b>。かたちを かえると…`, `ねんど${gSpeech(clay)}。形を変えると`); if (!(await w(2))) return;
      sc.clay = 1; sc.drawPlate(); sfx.pop(); if (!(await w(1.4))) return; sc.clay = 2; sc.drawPlate(); sfx.pop(); if (!(await w(1.4))) return;
      say('かたちを かえても <b>おもさは おなじ</b>', '形を変えても、重さは同じ'); if (!(await w(2.8))) return;
      sc.plate = ['pumpkin']; sfx.land(); sc.drawPlate(); await sc.waitSettle(); if (!ok()) return;
      say('<b>はかれない！</b> 1kgより おもい', 'はかれない！1キログラムより重い'); if (!(await w(2.2))) return;
      sc.setCap(2000); say('2kgまで はかれる はかりに かえよう', '2キログラムまではかれるはかりにかえよう'); await sc.waitSettle(); if (!ok()) return;
      say(`かぼちゃは <b>${gText(massOf('pumpkin'))}</b>`, `かぼちゃは${gSpeech(massOf('pumpkin'))}`); if (!(await w(2.4))) return;
      sc.plate = ['water1L']; sfx.land(); sc.drawPlate(); await sc.waitSettle(); if (!ok()) return;
      say('1Lの みずは やく <b>1kg</b>', '1リットルの水は、約1キログラム'); if (!(await w(2.8))) return;
      swap(null); await tonCard(ok); if (!ok()) return;
      say('つぎは「さわる」で はかって みよう', '次は「さわる」で、はかってみよう'); ctx.log('miru'); phase = 'done';
    }
    // 1t（1000kg）の カード
    async function tonCard(ok) {
      const g = F.layer('ton'); clear(g);
      const top0 = F.top + F.cap + 10 + (F.W < 500 ? 24 : 0), H = F.bottom - top0 - 10, s = Math.min(30, H / 13.5, (F.W - 30) / 25), top = top0 + Math.max(0, (H - s * 12.5) / 2), x0 = F.W / 2 - s * 12;
      say('1000kgを <b>1t</b>（トン）と いう', '1000キログラムを1トンという');
      for (let i = 0; i < 100; i++) { rect(g, x0 + (i % 10) * s * 1.05, top + Math.floor(i / 10) * s * 1.05, s, s, { rx: 2, fill: C('water'), stroke: C('water-deep'), 'stroke-width': 1 }); if (i % 10 === 9) { sfx.tick(i / 10); if (!(await wait(0.08)) || !ok()) return; } }
      txt(g, x0 + s * 5.2, top + s * 11.9, '1Lの みず 10ぽんが 100こ', { 'font-size': Math.max(13, s * 0.7), fill: C('ink-soft') });
      const cg = el('g', { transform: `translate(${x0 + s * 18.5},${top + s * 9})` }, g); cg.innerHTML = monoSVG('keicar', s * 7);
      txt(g, x0 + s * 18.5, top + s * 11.9, 'くるま やく 1t', { 'font-size': Math.max(13, s * 0.7), fill: C('ink-soft') });
      say('1Lの みず <b>1000ぼん</b>で <b>1t</b>。くるま 1だいくらい', '1リットルの水1000本で1トン。車1台くらい');
      if (!(await wait(3.4)) || !ok()) return; clear(g);
    }
    run();
    api.test = { state: () => ({ phase }), auto: () => (phase === 'done' ? { done: true } : { wait: 400 }) };
    return api;
  }

  /* ---------- さわる：はかりに のせる ---------- */
  if (mode === 'scale') {
    const shelf = opts.shelf || SHELF, coll = opts.coll || 'o3-mass';
    let weighed = 0;
    panel.innerHTML = `<div class="row">${capSeg(1000)}<button class="btn sub small" type="button" data-k="lens" aria-pressed="false">むしめがね</button><button class="btn sub small" type="button" data-k="clay">ねんどの かたち</button><button class="btn sub small" type="button" data-k="clear">ぜんぶ おろす</button></div>`;
    const sc = cur = scaleScene(F, ctx, { cap: 1000, shelf, max: 1, onSettle: (m, over) => settledMsg(m, over), onTapShelf: id => tapShelf(id), onTapPlate: id => tapPlate(id) });
    function settledMsg(m, over) {
      if (!sc.plate.length) return;
      if (over) { say(`<b>はかれない！</b> ${sc.cap / 1000}kgより おもい。おおきい はかりに しよう`, `はかれない！${sc.cap / 1000}キログラムより重い。大きいはかりにしよう`); ctx.log('weigh', { detail: { over: true, cap: sc.cap, items: sc.plate.join('+') } }); return; }
      say(`<b>${gText(m)}</b>${sc.plate.length === 1 ? `（${nameOfM(sc.plate[0])}）` : ''}`, gSpeech(m));
      if (sc.plate.length === 1) { ctx.register(coll, sc.plate[0]); weighed++; }
      ctx.log('weigh', { detail: { g: m, cap: sc.cap, items: sc.plate.join('+'), clay: sc.plate.includes('clay') ? sc.clay : null } });
    }
    const tapShelf = id => { if (sc.count(id)) return tapPlate(id); sc.plate.push(id); sfx.land(); sc.drawPlate(); ctx.hideHud(); };
    const tapPlate = id => { sc.plate = sc.plate.filter(x => x !== id); sfx.pop(); sc.drawPlate(); if (!sc.plate.length) say('たなの ものを タッチして のせよう', '棚の物をタッチしてのせよう'); };
    $$p(panel, '[data-cap]').forEach(b => on(b, 'click', () => {
      sfx.tap(); const c = +b.dataset.cap;
      if (c === sc.cap) { ctx.toast('', `いまは「${c / 1000}kgの はかり」だよ`, 1.6); return; }
      sc.setCap(c); $$p(panel, '[data-cap]').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.cap === c)));
      say(`${c / 1000}kgまで はかれる はかり。めもり 1つは <b>${CAPS[c].minor}g</b>`, `${c / 1000}キログラムまではかれるはかり。目もり1つは${CAPS[c].minor}グラム`);
    }));
    on($p(panel, '[data-k="lens"]'), 'click', e => { sfx.tap(); sc.lens = !sc.lens; e.currentTarget.setAttribute('aria-pressed', String(sc.lens)); sc.drawLens(); if (sc.lens) say('はりの さきを ちかくで みよう', '針の先を近くで見よう'); else ctx.hideHud(); });
    on($p(panel, '[data-k="clay"]'), 'click', () => {
      sfx.tap();
      if (!sc.plate.includes('clay')) { sfx.off(); ctx.toast('', 'さきに <b>ねんど</b>を のせてね', 1.8); return; }
      sc.clay = (sc.clay + 1) % 3; sc.drawPlate(); sfx.pop(); say(['まるめた', 'ほそく のばした', 'ちぎった'][sc.clay] + ' ねんど。はりは うごいた？', null);
      ctx.log('conserve', { detail: { shape: sc.clay, g: sc.reading() } });
    });
    on($p(panel, '[data-k="clear"]'), 'click', () => { sfx.tap(); if (!sc.plate.length) { sfx.off(); ctx.toast('', 'はかりには なにも のって いないよ', 1.6); return; } sc.plate = []; sc.drawPlate(); say('ぜんぶ おろしたよ', '全部おろしたよ'); });
    say('たなの ものを タッチして はかりに のせよう', '棚の物をタッチして、はかりにのせよう');
    api.test = {
      state: () => ({ cap: sc.cap, plate: sc.plate.slice(), weighed, g: sc.reading() }),
      auto() { if (weighed >= 1) return { done: true }; if (sc.plate.length) return { wait: 400 }; const p = sc.tapShelf(pick(shelf.filter(id => massOf(id) <= sc.cap))); return { tap: p }; },
    };
    return api;
  }

  /* ---------- さわる：いれものごと はかる（正味） ---------- */
  if (mode === 'net') {
    const shelf = opts.shelf || ['apple', 'orange', 'potato', 'egg'];
    let nets = 0;
    panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-k="bowl" aria-pressed="false">ボウルを のせる</button><button class="btn sub small" type="button" data-k="zero">0に あわせる</button><button class="btn sub small" type="button" data-k="clear">ぜんぶ おろす</button></div>`;
    const sc = cur = scaleScene(F, ctx, { cap: 1000, shelf, max: 1, onSettle: m => settledMsg(m), onTapShelf: id => tapShelf(id), onTapPlate: id => tapPlate(id) });
    const bowlG = massOf('bowl');
    const bb = $p(panel, '[data-k="bowl"]');
    const syncBowl = () => { const on2 = sc.plate[0] === 'bowl'; bb.setAttribute('aria-pressed', String(on2)); bb.textContent = on2 ? 'ボウルを おろす' : 'ボウルを のせる'; };
    function settledMsg(m) {
      const hasB = sc.plate[0] === 'bowl', inner = sc.plate.filter(x => x !== 'bowl');
      if (!sc.plate.length) { if (sc.tare) say(`なにも のって いないのに <b>−${sc.tare}g</b>？ 0に あわせなおそう`); return; }
      if (hasB && !inner.length) { say(sc.tare ? '0に あわせたよ。ボウルの なかに いれよう' : `ボウルは <b>${gText(m)}</b>`, sc.tare ? '0に合わせたよ。ボウルの中に入れよう' : `ボウルは${gSpeech(m)}`); return; }
      if (hasB && inner.length) {
        const net = sc.mass() - bowlG;
        if (sc.tare === bowlG) say(`ボウルの ぶんを 0に したので、<b>${gText(net)}</b>が ${inner.map(nameOfM).join('と ')}の おもさ`, `${gSpeech(net)}が中身の重さ`);
        else say(`ぜんぶで ${gText(m)}。ボウルの ${gText(bowlG)}を ひくと <b>${gText(net)}</b>（しょうみ）`, `全部で${gSpeech(m)}。ボウルの${gSpeech(bowlG)}を引くと${gSpeech(net)}`);
        nets++; ctx.log('net', { detail: { total: sc.mass(), bowl: bowlG, net, tare: sc.tare } }); return;
      }
      say(`<b>${gText(m)}</b>`, gSpeech(m));
    }
    const tapShelf = id => { if (sc.count(id)) return tapPlate(id); sc.plate.push(id); sfx.land(); sc.drawPlate(); ctx.hideHud(); };
    const tapPlate = id => { sc.plate = sc.plate.filter(x => x !== id); sfx.pop(); sc.drawPlate(); syncBowl(); };
    on(bb, 'click', () => { sfx.tap(); if (sc.plate[0] === 'bowl') sc.plate = sc.plate.filter(x => x !== 'bowl'); else sc.plate.unshift('bowl'); sc.drawPlate(); syncBowl(); ctx.hideHud(); });
    on($p(panel, '[data-k="zero"]'), 'click', () => {
      sfx.tap(); const m = sc.mass();
      if (m === sc.tare) { ctx.toast('', 'はりは もう 0を さして いるよ', 1.6); return; }
      sc.tare = m; sc.L.knob && sc.L.knob.setAttribute('fill', C('yamabuki')); say(m ? `ねじを まわして、${gText(m)}の ところを 0に したよ` : 'はりを 0に もどしたよ', null);
    });
    on($p(panel, '[data-k="clear"]'), 'click', () => { sfx.tap(); if (!sc.plate.length && !sc.tare) { sfx.off(); ctx.toast('', 'はかりには なにも のって いないよ', 1.6); return; } sc.plate = []; sc.tare = 0; sc.drawPlate(); syncBowl(); say('ぜんぶ おろして、0に もどしたよ', null); });
    say('<b>ボウル</b>を のせて から、なかに いれて はかろう', 'ボウルをのせてから、中に入れてはかろう');
    api.test = {
      state: () => ({ plate: sc.plate.slice(), tare: sc.tare, nets }),
      auto() { if (nets >= 1) return { done: true }; if (sc.plate[0] !== 'bowl') return { click: 'data-k=bowl|' }; if (sc.plate.length < 2) return { tap: sc.tapShelf(shelf[0]) }; return { wait: 400 }; },
    };
    return api;
  }

  /* ---------- さわる：1t ---------- */
  if (mode === 'ton') {
    let n = 0, view = 'water';
    const child = massOf('child3'), kids = Math.round(1e6 / Math.max(1, child));
    panel.innerHTML = `<div class="row"><button class="btn small" type="button" data-k="add">＋100ぼん</button><button class="btn sub small" type="button" data-k="class" aria-pressed="false">クラスの みんな</button><button class="btn sub small" type="button" data-k="reset">${ctx.ICONS_UI.again} はじめから</button></div><div class="status" data-k="st"></div>`;
    const g = F.layer('ton');
    const status = () => { $p(panel, '[data-k="st"]').innerHTML = view === 'water' ? `1Lの みず <b>${n}</b>ぼん → <b>${n}</b>kg${n >= 1000 ? '＝<b>1t</b>' : ''}` : `${kids}にん → やく <b>${Math.round(kids * child / 1000)}</b>kg（やく 1t）`; };
    function draw() {
      clear(g); const top = F.top + F.cap + 6 + (F.W < 500 ? 24 : 0), H = F.bottom - top - 12, W = F.W;
      if (view === 'water') {
        // 100ぼんを 10×10 の 1まいに。10まい（1000ぼん）で 1t
        const cols = W >= 640 ? 5 : 2, rows = Math.ceil(10 / cols), cell = Math.min((W - 40) / cols - 10, H / rows - 12, 150), s = cell / 10.5;
        const x0 = (W - cols * (cell + 10)) / 2;
        for (let b = 0; b < 10; b++) {
          const bx = x0 + (b % cols) * (cell + 10), by = top + Math.floor(b / cols) * (cell + 12);
          rect(g, bx - 2, by - 2, cell + 4, cell + 4, { rx: 6, fill: 'none', stroke: C('line'), 'stroke-width': 1.5, 'stroke-dasharray': b * 100 < n ? '' : '4 4' });
          if (b * 100 < n) for (let i = 0; i < 100; i++) rect(g, bx + (i % 10) * s * 1.05, by + Math.floor(i / 10) * s * 1.05, s, s, { rx: 1.5, fill: C('water'), stroke: C('water-deep'), 'stroke-width': 0.6 });
        }
      } else {
        const per = W >= 640 ? 13 : 7, s = Math.min(58, (W - 30) / per, H / Math.ceil(kids / per) - 4), x0 = (W - per * s) / 2;
        for (let i = 0; i < kids; i++) { const cg = el('g', { transform: `translate(${x0 + (i % per) * s + s / 2},${top + (Math.floor(i / per) + 1) * s})` }, g); cg.innerHTML = monoSVG('child3', s * 0.9); }
      }
      status();
    }
    F.onResize(draw);
    on($p(panel, '[data-k="add"]'), 'click', () => {
      sfx.tap(); if (view !== 'water') { view = 'water'; $p(panel, '[data-k="class"]').setAttribute('aria-pressed', 'false'); }
      if (n >= 1000) { ctx.toast('', 'もう 1000ぼん。<b>1t</b>に なったよ', 1.8); draw(); return; }
      n += 100; sfx.land(); draw();
      if (n >= 1000) { sfx.good(); ctx.toast(ICON.HANAMARU, '1Lの みず 1000ぼんで <b>1000kg＝1t</b>', 3, '1リットルの水1000本で、1000キログラム、1トン'); ctx.log('ton', { detail: { n } }); setTimeout(() => { if (alive(tag0)) say('1000Lの みずは 1m³（1ぺん 1mの はこ）に ぴったり。「かさ・たいせき」の 5ねんで まなぶよ', '1000リットルの水は、1立方メートルの箱にぴったり'); }, 3200); }
      else say(`${n}ぼん → <b>${n}kg</b>`, `${n}本、${n}キログラム`);
    });
    on($p(panel, '[data-k="class"]'), 'click', e => {
      sfx.tap(); view = view === 'water' ? 'class' : 'water'; e.currentTarget.setAttribute('aria-pressed', String(view === 'class')); draw();
      if (view === 'class') { say(`3ねんせい ひとり やく ${child / 1000}kg。${kids}にん あつまると やく <b>1t</b>`, `3年生1人、約${child / 1000}キログラム。${kids}人集まると、約1トン`); ctx.log('ton', { detail: { kids } }); } else say('1Lの みずに もどったよ', null);
    });
    on($p(panel, '[data-k="reset"]'), 'click', () => { sfx.tap(); if (!n && view === 'water') { ctx.toast('', 'まだ はじめの ままだよ', 1.6); return; } n = 0; view = 'water'; $p(panel, '[data-k="class"]').setAttribute('aria-pressed', 'false'); draw(); say('はじめから。「＋100ぼん」を おそう', null); });
    const tag0 = S.token;
    draw(); say('1Lの みず（1kg）を 100ぼんずつ ならべよう', '1リットルの水、1キログラムを、100本ずつ並べよう');
    api.test = { state: () => ({ n, view }), auto: () => (n >= 1000 ? { done: true } : { click: 'data-k=add|' }) };
    return api;
  }

  /* ---------- つくる：1kg を つくろう ---------- */
  if (mode === 'kg') {
    const coll = opts.coll || 'o3-kg';
    const items = KG_ITEMS.map(id => ({ id, g: massOf(id) })), all = kgCombos(items);
    let ok = false;
    panel.innerHTML = `<div class="status" data-k="st"></div><div class="row"><button class="btn" type="button" data-k="check">できた</button><button class="btn sub small" type="button" data-k="hint">ヒント</button><button class="btn sub small" type="button" data-k="clear">ぜんぶ おろす</button></div>`;
    const sc = cur = scaleScene(F, ctx, { cap: 2000, shelf: KG_ITEMS, max: 2, onTapShelf: id => tapShelf(id), onTapPlate: (id, i) => tapPlate(i) });
    const found = () => new Set(ctx.zukanList(coll));
    const counts = () => { const o = {}; for (const id of sc.plate) o[id] = (o[id] || 0) + 1; return o; };
    const status = () => { $p(panel, '[data-k="st"]').innerHTML = `1kg ずかん <b>${[...found()].filter(id => all.some(c => comboId(c) === id)).length}</b> / ${all.length}`; };
    const tapShelf = id => { if (ok) { ok = false; sc.plate = []; } if (sc.count(id) >= 2) { sfx.off(); ctx.toast('', 'おなじ ものは 2こまで', 1.6); return; } sc.plate.push(id); sfx.land(); sc.drawPlate(); ctx.hideHud(); };
    const tapPlate = i => { sc.plate.splice(i, 1); sfx.pop(); sc.drawPlate(); };
    on($p(panel, '[data-k="check"]'), 'click', () => {
      sfx.tap(); const m = sc.mass();
      if (!sc.plate.length) { sfx.off(); ctx.toast('', 'たなの ものを のせてね', 1.6); return; }
      if (!sc.isSettled()) { ctx.toast('', 'はりが とまるまで まってね', 1.4); return; }
      if (ok) { ctx.toast('', 'できて いるよ。ほかの くみあわせも さがそう', 1.8); return; }
      if (m === 1000) {
        ok = true; const id = comboId(counts()), isNew = !found().has(id);
        ctx.register(coll, id); sfx.good(); const c = sc.center(); hanamaru(F.svg, c.x, c.y, c.r);
        ctx.toast(ICON.HANAMARU, `ちょうど <b>1kg</b>！${isNew ? '' : '<br><small>この くみあわせは もう ずかんに あるよ</small>'}`, 3, 'ちょうど1キログラム');
        ctx.log('make', { correct: true, detail: { id, isNew } }); ctx.done('kg'); status();
      } else {
        sfx.bad(); ctx.toast(ICON.X, `いまは ${gText(m)}。${m > 1000 ? `${gText(m - 1000)} おおい` : `あと ${gText(1000 - m)}`}`, 2.6, gSpeech(m));
        ctx.log('make', { correct: false, detail: { g: m, mistake: 'W4' } });
      }
    });
    on($p(panel, '[data-k="hint"]'), 'click', () => {
      sfx.tap(); const f = found(), left = all.filter(c => !f.has(comboId(c)));
      if (!left.length) { ctx.toast(ICON.HANAMARU, 'ぜんぶ みつけたね！', 2); return; }
      const c = pick(left), ids = Object.keys(c), id = pick(ids);
      say(`<b>${nameOfM(id)}</b>を ${c[id]}こ つかう くみあわせが あるよ`, `${nameOfM(id)}を${c[id]}個使う組み合わせがあるよ`);
    });
    on($p(panel, '[data-k="clear"]'), 'click', () => { sfx.tap(); if (!sc.plate.length) { sfx.off(); ctx.toast('', 'はかりには なにも のって いないよ', 1.6); return; } sc.plate = []; ok = false; sc.drawPlate(); say('ぜんぶ おろしたよ', null); });
    status(); say('ものを のせて、ちょうど <b>1kg</b>（1000g）を つくろう', '物をのせて、ちょうど1キログラムを作ろう');
    api.test = {
      state: () => ({ ok, plate: sc.plate.slice(), g: sc.mass() }),
      auto() {
        if (ok) return { done: true };
        const f = found(), plan = all.find(c => !f.has(comboId(c))) || all[0], have = counts();
        const extra = sc.plate.findIndex(id => (have[id] || 0) > (plan[id] || 0));
        if (extra >= 0) return { tap: sc.tapPlate(extra) };
        const need = KG_ITEMS.find(id => (plan[id] || 0) > (have[id] || 0));
        if (need) return { tap: sc.tapShelf(need) };
        if (!sc.isSettled()) return { wait: 300 };
        return { click: 'data-k=check|' };
      },
    };
    return api;
  }
  void bench; void tween; void E; void clamp; void rect;
  return api;
}
