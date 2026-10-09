// 重さの「ためす」（O3）。opts.type：
//  read（はかりの目もりを よむ：1kg・2kg・4kg）｜choose（はかり えらび・たんい えらび・1kgに ちかい物 を まぜる）
//  convert（g・kg・t の かんさん）｜think（大きさと重さ・形を変えても同じ）
// 誤答には つまずきの型（W1〜W5）を入れる。答え合わせは 針を動かして・てんびんを 傾けて 確かめる。
import { scaleScene, balanceScene, massOf, nameOfM } from './_scale.js';
import { el, C, txt, clear, wait } from './_flat.js';
import { makeQuiz } from './_quiz2d.js';
import { genReadG, genChooseCap, genUnitG, genNear1kg, genConvert, THINK } from './_omosa-gen.js';
import { CAPS, gText, gSpeech } from './_omosa.js';
import { monoSVG } from './_mono.js';
import { choices } from './_gen.js';
import { unitSpeech } from '../core/yomi.js';
import { S, alive } from '../stage/stage.js';
import { shuffle } from '../core/text.js';

const CAP_ITEMS = [['textbook'], ['pumpkin'], ['cabbage'], ['pumpkin', 'pumpkin'], ['water1L', 'water1L', 'water1L'], ['apple', 'orange']];
const UNIT_ITEMS = ['apple', 'egg', 'textbook', 'bicycle', 'child3', 'keicar', 'water1L'];
const NEAR = ['water1L', 'apple', 'egg', 'textbook', 'orange', 'cabbage', 'pumpkin'];
export function mount(ctx) {
  const { opts, sfx } = ctx;
  const type = opts.type || 'read';
  const F = ctx.openFlat();
  const say = (h, s) => ctx.caption(h, 0, s || null);
  let sc = null, bal = null;
  const deco = () => { const g = F.layer('qdeco'); F.svg.appendChild(g); return g; };
  let decoFn = null;
  const redraw = () => { const g = deco(); clear(g); if (decoFn) decoFn(g); };
  F.onResize(() => setTimeout(() => { if (!sc && !bal) redraw(); }, 0));
  const useScale = cap => { if (bal) { bal.dispose(); bal = null; F.clearLayers(); } if (!sc) sc = scaleScene(F, ctx, { cap, onLayout: () => redraw() }); else if (sc.cap !== cap) sc.setCap(cap); sc.lens = false; sc.tare = 0; sc.mark(null); sc.drawLens(); return sc; };
  const useBal = () => { if (sc) { sc.dispose(); sc = null; F.clearLayers(); } if (!bal) bal = balanceScene(F, ctx, { onLayout: () => redraw() }); bal.coins = 0; bal.blocks = 0; return bal; };
  const place = (s, items, box = 0) => { s.plate = items.slice(); s.box = box; s.needle.a = 0; s.needle.v = 0; s.clay = 0; s.key = null; s.drawPlate(); };

  const qRead = lv => {
    const g = genReadG(lv), s = useScale(g.cap), c = CAPS[g.cap], base = Math.floor(g.m / c.label) * c.label, n = Math.round((g.m - base) / c.minor);
    place(s, ['box'], g.m);
    return {
      say: `はりは なんg？（${g.cap / 1000}kgの はかり）`, sp: `はかりの針は何グラム？${g.cap / 1000}キログラムのはかり`, at: s.center(), detail: { type: 'read', g: g.m, cap: g.cap }, answerText: gText(g.m), answerSp: gSpeech(g.m),
      choices: g.choices,
      hint(k) { if (k === 1) { s.lens = true; s.drawLens(); say('むしめがねで ちかくを みよう', '虫めがねで近くを見よう'); } if (k === 2) say(`この はかりの めもり 1つは <b>${c.minor}g</b>`, `目もり1つは${c.minor}グラム`); if (k === 3) { s.mark(base); say(`<b>${gText(base)}</b> から めもりを かぞえよう`, `${gSpeech(base)}から目もりを数えよう`); } },
      async verify() { const tag = S.token; s.lens = true; s.drawLens(); say(`${gText(base)} から…`); for (let k = 1; k <= n; k++) { s.mark(base + k * c.minor); sfx.tick(k); say(gText(base + k * c.minor)); if (!(await wait(Math.max(0.1, 1 / n))) || !alive(tag)) return; } say(`<b>${gText(g.m)}</b>`, gSpeech(g.m)); await wait(0.6); },
    };
  };
  const qCap = i => {
    const items = CAP_ITEMS[(i + Math.floor(Math.random() * CAP_ITEMS.length)) % CAP_ITEMS.length], g = items.reduce((a, id) => a + massOf(id), 0), q = genChooseCap(g), s = useScale(1000);
    place(s, []);
    // はかる 物を はかりの よこに おく
    decoFn = dg => { const L = s.L, sz = Math.min(L.R * 0.75, 70), wid = items.length * sz * 0.95, gap = L.R * 1.45 + 16;
    const pos = L.cx + gap + wid < F.W - 6 ? k => [L.cx + gap + (k + 0.5) * sz * 0.95, L.tableY] : L.cx - gap - wid > 6 ? k => [L.cx - gap - (k + 0.5) * sz * 0.95, L.tableY] : k => [F.W / 2 + (k - (items.length - 1) / 2) * sz * 0.95, F.top + F.cap + (F.W < 500 ? 24 : 0) + sz];
    items.forEach((id, k) => { const [x, y] = pos(k), cg = el('g', { transform: `translate(${x},${y})` }, dg); cg.innerHTML = monoSVG(id, sz); }); };
    redraw();
    const what = [...new Set(items)].map(id => `${nameOfM(id)}${items.filter(x => x === id).length > 1 ? ' ' + items.filter(x => x === id).length + 'こ' : ''}`).join('と ');
    return {
      say: `<b>${what}</b>を はかる。いちばん よい はかりは？`, sp: `${what}をはかる。一番よいはかりは？`, at: s.center(), detail: { type: 'cap', g, right: q.right }, answerText: `${q.right / 1000}kgの はかり`,
      choices: q.choices,
      hint(k) { if (k === 1) say('はかりに かいて ある おもさまで はかれる', 'はかりに書いてある重さまで、はかれる'); if (k === 2) say(`${what}は やく ${gText(g)}`, `約${gSpeech(g)}`); if (k === 3) say('はかれる なかで いちばん ちいさい はかりが、めもりが こまかくて よい', 'はかれる中で一番小さいはかりが、目もりが細かくてよい'); },
      async verify(ok) {
        const tag = S.token;
        for (const c of [1000, 2000, 4000].filter(c => c <= q.right)) {
          decoFn = null; s.setCap(c); clear(deco()); place(s, items); sfx.land(); const r = await s.waitSettle(); if (!r || !alive(tag)) return;
          say(r.over ? `<b>はかれない！</b> ${c / 1000}kgの はかりでは たりない` : `${c / 1000}kgの はかりで <b>${gText(g)}</b>`, r.over ? `はかれない！` : gSpeech(g)); if (!(await wait(r.over ? 1.1 : 0.8)) || !alive(tag)) return;
        }
        void ok;
      },
    };
  };
  const qUnit = i => {
    const id = UNIT_ITEMS[(i * 3 + Math.floor(Math.random() * UNIT_ITEMS.length)) % UNIT_ITEMS.length], g = massOf(id), q = genUnitG(g);
    if (sc) { sc.dispose(); sc = null; } if (bal) { bal.dispose(); bal = null; } F.clearLayers();
    const s = Math.min(160, (F.bottom - F.top - F.cap) * 0.6);
    decoFn = dg => { const s2 = Math.min(160, (F.bottom - F.top - F.cap) * 0.6), cg = el('g', { transform: `translate(${F.W / 2},${F.top + F.cap + (F.bottom - F.top - F.cap) * 0.5 + s2 * 0.45})` }, dg); cg.innerHTML = monoSVG(id, s2); txt(dg, F.W / 2, F.bottom - 12, nameOfM(id), { 'font-size': 18, fill: C('ink-soft') }); };
    redraw();
    return {
      say: `<b>${nameOfM(id)}</b>の おもさは やく どれくらい？`, sp: `${nameOfM(id)}の重さは、約どれくらい？`, at: { x: F.W / 2, y: (F.top + F.bottom) / 2, r: s * 0.5 }, detail: { type: 'unit', id, g }, answerText: `やく ${q.n}${q.u}`, answerSp: unitSpeech(`約${q.n}${q.u}`),
      choices: q.choices,
      hint(k) { if (k === 1) say('1gは 1えんだま 1まい。1kgは 1Lの みずくらい', '1グラムは1円玉1枚。1キログラムは1リットルの水くらい'); if (k === 2) say('1t（トン）は 1000kg。くるま 1だいくらい', '1トンは1000キログラム。車1台くらい'); if (k === 3) say(`${q.u === 'g' ? 'てに のる かるい もの' : q.u === 'kg' ? 'りょうてで もつ くらい' : 'とても おもい もの'}だね`); },
      async verify() { say(`やく <b>${q.n}${q.u}</b>`, unitSpeech(`約${q.n}${q.u}`)); await wait(1); },
    };
  };
  const qNear = () => {
    const items = NEAR.map(id => ({ id, g: massOf(id) })), q = genNear1kg(items), s = useScale(2000);
    place(s, []);
    const list = shuffle(q.all.slice());
    return {
      say: '<b>1kg</b>に いちばん ちかいのは どれ？', sp: '1キログラムに一番近いのはどれ？', at: s.center(), detail: { type: 'near', right: q.right.id }, answerText: nameOfM(q.right.id),
      choices: list.map(x => ({ html: nameOfM(x.id), ok: x.id === q.right.id, mistake: 'W4' })),
      hint(k) { if (k === 1) say('1kgは 1000g', '1キログラムは1000グラム'); if (k === 2) say(`${nameOfM('egg')}は やく ${massOf('egg')}g`, `たまごは約${massOf('egg')}グラム`); if (k === 3) say('1Lの みずは やく 1kg', '1リットルの水は約1キログラム'); },
      async verify() { const tag = S.token; for (const x of list) { place(s, [x.id]); sfx.land(); const r = await s.waitSettle(); if (!r || !alive(tag)) return; say(`${nameOfM(x.id)} <b>${gText(x.g)}</b>`, `${nameOfM(x.id)}${gSpeech(x.g)}`); if (!(await wait(0.7)) || !alive(tag)) return; } },
    };
  };
  const qConvert = (lv, i) => {
    const q = genConvert(lv, i), show = q.g <= 4000, s = show ? useScale(4000) : null;
    if (!show) { if (sc) { sc.dispose(); sc = null; } if (bal) { bal.dispose(); bal = null; } F.clearLayers(); decoFn = dg => { const cg = el('g', { transform: `translate(${F.W / 2},${(F.top + F.cap + F.bottom) / 2 + 40})` }, dg); cg.innerHTML = monoSVG('keicar', Math.min(150, F.W * 0.35)); }; redraw(); }
    else place(s, []);
    return {
      say: q.q, sp: unitSpeech(q.q.replace('なんkg なんg', '何キログラム何グラム').replace('なんg', '何グラム').replace('なんkg', '何キログラム').replace('＋', 'たす')), at: show ? s.center() : { x: F.W / 2, y: (F.top + F.bottom) / 2, r: 60 }, detail: { type: 'convert', k: q.k }, answerText: q.right, answerSp: unitSpeech(q.right),
      choices: q.choices,
      hint(k) { if (k === 1) say(q.k === 't2kg' ? '1t＝1000kg' : '1kg＝1000g', q.k === 't2kg' ? '1トンは1000キログラム' : '1キログラムは1000グラム'); if (k === 2) say('k（キロ）が つくと 1000ばい', 'キロがつくと1000倍'); if (k === 3) say(q.k.startsWith('kg2g') ? 'kgの ぶんを gに して から たそう' : '1000gずつ まとめて kgに しよう'); },
      async verify() { const tag = S.token; if (show) { place(s, ['box'], q.g); sfx.land(); const r = await s.waitSettle(); if (!r || !alive(tag)) return; } say(`${q.q.replace(/は(.*)？$/, '')} → <b>${q.right}</b>`, unitSpeech(q.right)); await wait(0.8); },
    };
  };
  const qThink = (lv, i) => {
    const order = THINK.slice(), it = order[(i + (lv === 'easy' ? 0 : lv === 'normal' ? 1 : 2)) % order.length];
    let ver;
    if (it.how === 'balance') { const b = useBal(); b.L = [it.l]; b.R = [it.r]; b.hold = true; b.draw(); ver = async () => { const tag = S.token; b.hold = false; await b.waitSettle(); if (!alive(tag)) return; say(`<b>${it.ch[0][0]}</b>${it.ch[0][0] === 'おなじ' ? '' : 'の ほうが おもい'}`); await wait(0.8); }; }
    else { const s = useScale(1000); place(s, ['clay']); ver = async () => { const tag = S.token; const r0 = await s.waitSettle(); if (!r0 || !alive(tag)) return; s.clay = it.shape; s.drawPlate(); sfx.pop(); s.key = null; await wait(1); if (!alive(tag)) return; say(`はりは うごかない。<b>${gText(massOf('clay'))}</b>の まま`, `針は動かない。${gSpeech(massOf('clay'))}のまま`); await wait(0.8); }; }
    return {
      say: it.q, sp: it.q.replace(/<[^>]+>/g, ''), at: bal ? bal.center() : sc.center(), detail: { type: 'think', id: it.id }, answerText: it.ch[0][0],
      choices: shuffle(it.ch.map(([h, okc, mis]) => ({ html: h, ok: okc, mistake: mis }))),
      hint(k) { if (k === 1) say(it.how === 'balance' ? 'おおきさと おもさは おなじかな？' : 'ねんどの りょうは かわった？', null); if (k === 2) say(it.how === 'balance' ? 'てんびんで くらべて みよう' : 'ふえも へりも して いないね', null); if (k === 3) say(it.how === 'balance' ? 'さがった ほうが おもい' : 'かたちを かえても おもさは おなじ', null); },
      verify: ver,
    };
  };

  const gens = {
    read: qRead, convert: qConvert, think: qThink,
    choose: (lv, i) => [qCap, qUnit, qNear][i % 3](lv === 'easy' ? i : i + 1),
  };
  const gen = gens[type] || qRead;
  const kind = opts.kind || { read: 'read', choose: 'choose', convert: 'convert', think: 'think' }[type];
  const quiz = makeQuiz(ctx, F, { kind, n: opts.n || 5, gen: (lv, i) => { decoFn = null; const g = F.layer('qdeco'); clear(g); return gen(lv, i); } });
  quiz.start();
  void choices;
  return { dispose() { sc && sc.dispose(); bal && bal.dispose(); }, test: quiz.test };
}
