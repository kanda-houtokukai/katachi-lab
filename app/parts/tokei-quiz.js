// 時計の「ためす」（T1・T2・T3）。opts.type：
//  mix（よむ・あわせるを交互）｜read｜set｜life（ばめんと じこく）｜kind（じこく？ じかん？）｜dur（なんぷんかん）｜ampm｜hour（1じかん＝60ぷん・1にち＝24じかん）
//  ｜after（○ぷんご・まえ。正時を またがない）｜afterx（正時を またぐ）｜durx（正時を またぐ じかん）｜noon（正午を またぐ）｜sec（びょう）
// 誤答の選択肢には、つまずきの型（T1〜T8・pun）に当たるものを必ず混ぜる。答え合わせは針を動かして確かめる。
import { clockScene, bindHand, MIN, hour12, tod, SCENES, sceneIcon } from './_clock.js';
import { el, C, txt, rect, clear, wait, pathOf, rnd } from './_flat.js';
import { makeQuiz } from './_quiz2d.js';
import { choices, genTime, readChoices } from './_gen.js';
import { kidTime, spTime, kidDur, spDur, fun, kidSec, spSec } from '../core/yomi.js';
import { figSVG } from '../core/figs.js';
import { pick, shuffle } from '../core/text.js';
import { S, alive } from '../stage/stage.js';

const H12 = h => ((h - 1 + 120) % 12) + 1;
const hm = (h, m) => H12(h) * 60 + m;
// 分の読み（ふん／ぷん の問題）
const MINREAD = { 1: ['いっぷん', 'いちふん'], 2: ['にふん', 'にぷん'], 3: ['さんぷん', 'さんふん'], 4: ['よんぷん', 'よんふん'], 5: ['ごふん', 'ごぷん'], 6: ['ろっぷん', 'ろくふん'], 7: ['ななふん', 'ななぷん'], 8: ['はっぷん', 'はちふん'], 9: ['きゅうふん', 'きゅうぷん'], 10: ['じゅっぷん', 'じゅうふん'] };
const KIND = [
  ['あさ <b>7じ</b>に おきる', 'じこく'], ['はみがきを <b>3ぷん</b> する', 'じかん'], ['じゅぎょうは <b>45ふん</b>', 'じかん'], ['<b>12じ</b>に きゅうしょく', 'じこく'],
  ['こうえんで <b>1じかん</b> あそぶ', 'じかん'], ['<b>3じはん</b>に おやつ', 'じこく'], ['えきまで <b>15ふん</b> あるく', 'じかん'], ['<b>9じ</b>に ねる', 'じこく'],
  ['テレビを <b>30ぷん</b> みる', 'じかん'], ['<b>8じ 10ぷん</b>に がっこうに つく', 'じこく'], ['おふろに <b>20ぷん</b> はいる', 'じかん'], ['<b>6じ</b>に ゆうごはん', 'じこく'],
];
const AMPM = [
  { q: 'あさの 7じは？', t: 7 * 60, ch: ['ごぜん 7じ', 'ごご 7じ'], a: 0 }, { q: 'よるの 8じは？', t: 20 * 60, ch: ['ごご 8じ', 'ごぜん 8じ'], a: 0 },
  { q: 'おひるの 12じを なんと いう？', t: 12 * 60, ch: ['しょうご', 'ごぜん 12じ', 'よなか'], a: 0 }, { q: 'ゆうがたの 5じは？', t: 17 * 60, ch: ['ごご 5じ', 'ごぜん 5じ'], a: 0 },
  { q: 'ごぜん 10じは あさ？ よる？', t: 10 * 60, ch: ['あさ', 'よる'], a: 0 }, { q: 'ごご 9じは あさ？ よる？', t: 21 * 60, ch: ['よる', 'あさ'], a: 0 },
  { q: 'しょうごの つぎの 1じは？', t: 13 * 60, ch: ['ごご 1じ', 'ごぜん 1じ'], a: 0 }, { q: 'ごぜんは なんじかん？', t: 6 * 60, ch: ['12じかん', '24じかん', '6じかん'], a: 0 },
];
const HOUR = [
  { q: '1じかんは なんぷん？', ch: ['60ぷん', '100ぷん', '10ぷん'], a: 0, mis: ['T5', 'T5'] }, { q: '1にちは なんじかん？', ch: ['24じかん', '12じかん', '60じかん'], a: 0, mis: ['T6', 'T5'] },
  { q: 'ながい はりが ひとまわり すると？', ch: ['60ぷん', '12ふん', '1ぷん'], a: 0, mis: ['T3', 'T5'] }, { q: 'みじかい はりは 1にちに なんかい まわる？', ch: ['2かい', '1かい', '24かい'], a: 0, mis: ['T6', 'T6'] },
  { q: '1じかん 20ぷんは なんぷん？', ch: ['80ぷん', '120ぷん', '21ぷん'], a: 0, mis: ['T5', 'T5'] }, { q: '90ぷんは？', ch: ['1じかん 30ぷん', '9じかん', '1じかん 90ぷん'], a: 0, mis: ['T5', 'T5'] },
];

export function mount(ctx) {
  const { panel, opts } = ctx;
  const type = opts.type || 'mix';
  const F = ctx.openFlat();
  const needBand = opts.band ?? ['kind', 'dur', 'ampm', 'after', 'afterx', 'durx', 'noon'].includes(type);
  const needSky = opts.sky ?? type !== 'sec';
  let sc = null;
  const build = () => {
    const keep = sc ? Object.assign({}, sc.clock.st) : null;
    F.clearLayers(); sc = clockScene(F, { sky: needSky, band: needBand });
    if (keep) Object.assign(sc.clock.st, keep);
    sc.clock.update(); decor();
  };
  let decorFn = null; const decor = () => { const g = F.layer('decor'); clear(g); decorFn && decorFn(g); };
  F.onResize(build); build();
  const c = () => sc.clock;
  let canDrag = false;
  // 長針のドラッグ（あわせる問題）
  bindHand(F, { hit: p => sc.clock.hit(p), angMin: p => sc.clock.angMin(p), get st() { return sc.clock.st; }, update: () => sc.clock.update() }, { can: () => canDrag, onStart: () => ctx.hideHud() });
  const reset = () => { c().reset(); c().st.five = false; sc.flash = null; decorFn = null; decor(); if (sc.sky) sc.sky.digital = false; };
  const showT = t => { c().st.t = t; c().update(); };
  const at = () => ({ x: sc.L.cx, y: sc.L.cy, r: sc.L.R * 0.7 });
  const clockBtn = t => `<span style="display:inline-flex;align-items:center;gap:6px"><span style="width:52px;height:52px;display:inline-block">${figSVG(`clock:${Math.floor(t / 60) % 12 || 12}:${t % 60}`)}</span></span>`;

  const setMistake = target => () => {
    const cur = ((Math.round(c().st.t) % 720) + 720) % 720, tg = target % 720, cm = cur % 60, tm = tg % 60, ch = Math.floor(cur / 60) || 12, th = Math.floor(tg / 60) || 12;
    if (cm === tm && Math.abs(ch - th) === 1) return 'T1';
    if (Math.round(cm / 5) % 12 === th % 12) return 'T2';
    if (cm === tm / 5) return 'T3';
    return 'other';
  };
  const qRead = (level, i) => {
    const T = genTime(level, i); reset(); canDrag = false; showT(T < 6 * 60 ? T + 720 : T);
    return {
      say: 'なんじ なんぷん？', sp: '何時何分？', at: at(), choices: readChoices(T), detail: { type: 'read', t: T % 720 }, answerText: kidTime(T), answerSp: spTime(T),
      hint(k) { const cl = c(); if (k === 1) { cl.st.room = true; ctx.caption('みじかい はりの <b>へや</b>を みてね', 0, '短い針の部屋を見てね'); } if (k === 2) { cl.st.five = true; ctx.caption('ながい はりは <em>5とび</em>で かぞえる', 0, '長い針は5とびで数える'); } if (k === 3) { cl.st.minSector = true; ctx.caption(`ながい はりは <em>${MIN(T)}${fun(MIN(T))}</em>`, 0, `長い針は${MIN(T)}分`); } cl.update(); },
      async verify() { if (sc.sky) sc.sky.digital = true; c().st.room = true; c().update(); ctx.say(spTime(T), true); await wait(1); },
      kindOf: 'read',
    };
  };
  const qSet = (level, i) => {
    const T = genTime(level, i); reset();
    let s0 = T + pick([-1, 1]) * rnd(110, 260); while (s0 < 6 * 60) s0 += 720; while (s0 > 21 * 60) s0 -= 720;
    showT(s0); canDrag = true;
    return {
      set: true, say: `<b>${kidTime(T)}</b> に あわせてね`, sp: spTime(T) + 'に合わせてね', at: at(), detail: { type: 'set', t: T % 720 }, answerText: kidTime(T), answerSp: spTime(T),
      check: () => ((Math.round(c().st.t) % 720) + 720) % 720 === T % 720,
      mistakeNow: setMistake(T),
      solve: () => { let d = (T % 720) - (((c().st.t % 720) + 720) % 720); if (d > 360) d -= 720; if (d < -360) d += 720; return pathOf(F, c().dragPath(c().st.t + d)); },
      hint(k) { const cl = c(); if (k === 1) { cl.st.roomFor = hour12(T); ctx.caption(`みじかい はりは <b>${hour12(T)}</b> の へや`, 0, `短い針は${hour12(T)}の部屋`); } if (k === 2) { cl.st.five = true; ctx.caption('ながい はりは <em>5とび</em>で かぞえる', 0, '長い針は5とびで数える'); } if (k === 3) { cl.st.ghost = MIN(T); ctx.caption('ながい はりは この ばしょ', 0, '長い針はこの場所'); } cl.update(); },
      async verify(ok) {
        canDrag = false;
        if (!ok) { const cur = c().st.t % 720; let d = (T % 720) - cur; if (d > 360) d -= 720; if (d < -360) d += 720; await c().moveTo(c().st.t + d, 1.4); }
        if (sc.sky) sc.sky.digital = true; c().st.roomFor = null; c().st.room = true; c().update(); ctx.say(spTime(T), true); await wait(0.8);
        const m = MIN(T), h = hour12(T); if (m === 0) ctx.register('tokei', `${h}:00`); if (m === 30) ctx.register('tokei', `${h}:30`); ctx.register('fun', 'm' + m);
      },
    };
  };
  const qPun = () => {
    const n = rnd(1, 10), [r, w] = MINREAD[n]; reset(); showT(rnd(1, 11) * 60 + n);
    return { say: `${n}ふん？ ${n}ぷん？ どう よむ？`, sp: `${n}分は、どう読む？`, at: at(), choices: choices(r, [{ html: w, mistake: 'pun' }]), detail: { type: 'pun', n }, answerText: r,
      hint(k) { if (k === 1) ctx.caption('こえに だして よんで みよう'); if (k >= 2) ctx.caption(`1・3・4・6・8・10 は「ぷん」`, 0, '1、3、4、6、8、10は、ぷん'); },
      async verify() { c().st.minSector = true; c().update(); ctx.say(`${n}分`, true); await wait(0.9); } };
  };
  const qLife = (level, i) => {
    const pool = shuffle(SCENES.slice()), s = pool[i % pool.length]; reset();
    const far = SCENES.filter(x => Math.abs(x.t - s.t) >= 150);
    const wrong = shuffle(far).slice(0, level === 'easy' ? 1 : 2).map(x => ({ html: clockBtn(x.t), mistake: 'life', key: x.t }));
    showT(s.pm ? 13 * 60 : 6 * 60);
    decorFn = g => { const L = sc.L, sz = Math.max(44, Math.min(100, L.land ? L.sh - 56 : L.R * 0.7)), x = L.land ? L.sx + L.sw - sz - 22 : F.W - sz - 24, y = L.land ? L.sy + L.sh - sz - 36 : F.top + F.cap; const cg = el('g', { transform: `translate(${x},${y})` }, g); rect(cg, -6, -6, sz + 12, sz + 34, { rx: 14, fill: C('paper'), stroke: C('line'), 'stroke-width': 2 }); const ic = el('g', { transform: `scale(${sz / 40})` }, cg); ic.innerHTML = sceneIcon(s.id).replace(/^<svg[^>]*>|<\/svg>$/g, ''); txt(cg, sz / 2, sz + 22, s.label, { 'font-size': 18 }); };
    decor();
    return { say: `<b>${s.label}</b>の とけいは どれ？`, sp: `${s.label}の時計はどれ？`, at: at(), choices: choices(clockBtn(s.t), wrong, 3), detail: { type: 'life', scene: s.id }, answerText: kidTime(s.t), answerSp: spTime(s.t),
      hint(k) { if (k === 1) ctx.caption(`${s.pm ? 'ひるから よる' : 'あさ'}の ことだね`); if (k === 2) { showT(s.t); ctx.caption('そらの いろも みてね'); } if (k === 3) { c().st.room = true; c().update(); ctx.caption(`みじかい はりは ${hour12(s.t)} の へや`); } },
      async verify() { await c().moveTo(s.t, 1.2); ctx.say(spTime(s.t), true); await wait(0.6); } };
  };
  const qKind = (level, i) => {
    const pool = shuffle(KIND.slice()), [txtHTML, a] = pool[i % pool.length]; reset(); showT(7 * 60 + 30);
    const ans = a === 'じこく' ? 0 : 1;
    return { say: `${txtHTML}<br><small>この ことばは じこく？ じかん？</small>`, sp: `${txtHTML.replace(/<[^>]+>/g, '')}。この言葉は、時刻？時間？`, at: at(), detail: { type: 'kind', a },
      choices: [{ html: 'じこく（とけいの いち）', ok: ans === 0, mistake: 'T4' }, { html: 'じかん（あいだの ながさ）', ok: ans === 1, mistake: 'T4' }], answerText: a,
      hint(k) { if (k === 1) ctx.caption('「なんじ？」と きく ときは じこく', 0, '何時？と聞くときは時刻'); if (k >= 2) ctx.caption('「どれだけ かかる？」と きく ときは じかん', 0, 'どれだけかかる？と聞くときは時間'); },
      async verify() { const cl = c(); if (a === 'じこく') { cl.st.start = null; await cl.moveTo(8 * 60, 1); ctx.caption('じこくは とけいの <b>いち</b>（1つの てん）', 0, '時刻は時計の位置'); } else { cl.st.start = cl.st.t; await cl.moveTo(cl.st.t + 25, 1.2); ctx.caption('じかんは <b>あいだの ながさ</b>（いろの ところ）', 0, '時間はあいだの長さ'); } await wait(1.2); } };
  };
  const durWrong = (d, endM) => [{ html: kidDur(endM) + 'かん', mistake: 'T4' }, { html: kidDur(60 - d) + 'かん', mistake: 'T5' }, { html: kidDur(d + 10) + 'かん', mistake: 'other' }, { html: kidDur(d * 2) + 'かん', mistake: 'other' }];
  const qDur = level => {
    reset(); const h = rnd(7, 16);
    let s, d;
    if (level === 'easy') { s = h * 60; d = rnd(1, 5) * 10; } else if (level === 'normal') { s = h * 60 + rnd(0, 6) * 5; d = rnd(1, Math.floor((60 - (s % 60)) / 5)) * 5; } else { s = h * 60 + rnd(0, 6) * 5; d = rnd(1, 59 - (s % 60)); if (d % 5 === 0) d = Math.max(1, d - 2); }
    showT(s); c().st.start = s; c().st.t = s + d; c().update();
    return { say: `${kidTime(s)} から ${kidTime(s + d)} まで、なんぷんかん？`, sp: `${spTime(s)}から${spTime(s + d)}まで、何分間？`, at: at(), detail: { type: 'dur', d }, answerText: kidDur(d) + 'かん', answerSp: spDur(d) + '間',
      choices: choices(kidDur(d) + 'かん', durWrong(d, MIN(s + d))),
      hint(k) { const cl = c(); if (k === 1) ctx.caption('いろの ところが じかん'); if (k === 2) { cl.st.five = true; cl.update(); ctx.caption('ながい はりが うごいた めもりを かぞえよう'); } if (k === 3) ctx.caption(`${MIN(s)}${fun(MIN(s))} から ${MIN(s + d)}${fun(MIN(s + d))} まで`); },
      async verify() { const cl = c(); cl.st.t = s; cl.update(); await cl.moveTo(s + d, 1.6); ctx.caption(`${kidDur(d)}かん`, 0, spDur(d) + '間'); await wait(0.8); } };
  };
  const qAmpm = (level, i) => {
    const it = shuffle(AMPM.slice())[i % AMPM.length]; reset(); showT(it.t);
    if (level === 'easy') showT(it.t);
    return { say: it.q, at: at(), detail: { type: 'ampm', q: it.q }, answerText: it.ch[it.a],
      choices: shuffle(it.ch.map((h, k) => ({ html: h, ok: k === it.a, mistake: 'T6' }))),
      hint(k) { if (k === 1) ctx.caption('そらの いろを みてね'); if (k === 2) { sc.flash = 0; sc.sync(); ctx.caption('ひるの 12じ（しょうご）で ごぜんと ごごが かわる', 0, '昼の12時、正午で午前と午後がかわる'); } if (k === 3) { if (sc.sky) sc.sky.digital = true; sc.sync(); } },
      async verify() { if (sc.sky) sc.sky.digital = true; sc.flash = 0; sc.sync(); await wait(1.4); sc.flash = null; sc.sync(); } };
  };
  const qHour = (level, i) => {
    const it = shuffle(HOUR.slice())[i % HOUR.length]; reset(); showT(8 * 60);
    return { say: it.q, at: at(), detail: { type: 'hour', q: it.q }, answerText: it.ch[it.a],
      choices: shuffle(it.ch.map((h, k) => ({ html: h, ok: k === it.a, mistake: k === it.a ? null : it.mis[Math.min(k, 2) - 1] || 'T5' }))),
      hint(k) { if (k === 1) ctx.caption('ながい はりを ひとまわり させて みよう'); if (k >= 2) { c().st.start = c().st.t; c().update(); c().moveTo(c().st.t + 60, 2); } },
      async verify() { const cl = c(); cl.st.start = cl.st.t; await cl.moveTo(cl.st.t + 60, 2.2); ctx.caption('ひとまわりで 60ぷん＝1じかん', 0, 'ひとまわりで60分、1時間'); await wait(0.8); } };
  };
  // ○ぷんご・○ぷんまえ（cross：正時を またぐ）
  const qAfter = (level, i, cross) => {
    reset(); const after = level === 'easy' || i % 2 === 0;
    let s, d;
    for (let k = 0; k < 50; k++) {
      s = rnd(7, 16) * 60 + rnd(0, 11) * 5; d = level === 'challenge' ? rnd(11, 50) : rnd(1, 9) * 5;
      const e = after ? s + d : s - d, crosses = Math.floor(e / 60) !== Math.floor(s / 60) || (MIN(e) === 0 && false);
      if (cross === crosses && (cross || MIN(e) !== 0)) break;
    }
    const e = after ? s + d : s - d, word = after ? 'ご' : 'まえ';
    const wrong = [];
    if (cross) wrong.push({ html: kidTime((Math.floor(s / 60)) * 60 + MIN(e)), mistake: 'T7' });
    wrong.push({ html: kidTime(after ? s - d : s + d), mistake: 'dir' }, { html: kidTime(e + 60), mistake: 'T7' }, { html: kidTime(e + 10), mistake: 'other' });
    const useSet = !cross && level !== 'easy' && i % 2 === 1 && after;
    showT(s); c().st.start = after ? s : null; c().update();
    const base = { at: at(), detail: { type: cross ? 'afterx' : 'after', s, d, after }, answerText: kidTime(e), answerSp: spTime(e),
      hint(k) { const cl = c(); if (k === 1) { cl.st.five = true; cl.update(); ctx.caption('ながい はりを 5とびで すすめて みよう'); } if (k === 2 && cross) { sc.flash = Math.floor((after ? s + 60 - MIN(s) : s - MIN(s)) / 60) % 12; sc.sync(); ctx.caption(`ちょうどの ${hour12(after ? s + 60 - MIN(s) : s - MIN(s))}じで くぎろう`); } if (k === 3) ctx.caption(after ? `${60 - MIN(s)}${fun(60 - MIN(s))}で つぎの じに なる` : `${MIN(s)}${fun(MIN(s))} もどると ちょうどの じ`); },
      async verify(ok) { const cl = c(); cl.st.t = s; cl.st.start = after ? s : null; cl.update(); await cl.moveTo(e, 1.6); if (sc.sky) sc.sky.digital = true; sc.sync(); ctx.say(spTime(e), true); await wait(0.8); } };
    if (useSet) {
      canDrag = true;
      return Object.assign(base, { set: true, say: `${kidTime(s)}。${d}${fun(d)} たつと？ はりを うごかしてね`, sp: `${spTime(s)}。${d}分たつと？針を動かしてね`, check: () => ((Math.round(c().st.t) % 720) + 720) % 720 === e % 720, mistakeNow: () => 'other', solve: () => pathOf(F, c().dragPath(e)) });
    }
    canDrag = false;
    return Object.assign(base, { say: `${kidTime(s)}の ${d}${fun(d)}${word}は？`, sp: `${spTime(s)}の${d}分${after ? '後' : '前'}は？`, choices: choices(kidTime(e), wrong) });
  };
  // 正時を またぐ じかん：ちょうどの じで くぎって たす
  const qDurx = level => {
    reset(); let s, e;
    for (let k = 0; k < 40; k++) { s = rnd(7, 15) * 60 + (level === 'challenge' ? rnd(31, 57) : rnd(7, 11) * 5); e = s + (level === 'easy' ? rnd(2, 5) * 10 : level === 'normal' ? rnd(3, 11) * 5 : rnd(20, 80)); if (Math.floor(e / 60) !== Math.floor(s / 60) && MIN(e) !== 0) break; }
    const d = e - s, a1 = 60 - MIN(s), a2 = MIN(e);
    showT(s); c().st.start = s; c().st.t = e; c().update();
    const split = () => { decorFn = g => { const b = sc.band; if (!b) return; const hh = s - MIN(s) + 60; b.span(s, hh, C('sora'), 0.55, g); b.span(hh, e, C('face-2'), 0.7, g); const x = b.xOf(tod(hh)), y = b.rowY[b.rowOf(hh)]; rect(g, x - 2, y - 8, 4, b.rowH + 16, { fill: C('ok') }); }; decor(); };
    return { say: `${kidTime(s)} から ${kidTime(e)} まで、なんぷん？`, sp: `${spTime(s)}から${spTime(e)}まで、何分？`, at: at(), detail: { type: 'durx', d }, answerText: kidDur(d), answerSp: spDur(d),
      choices: choices(kidDur(d), [{ html: kidDur(Math.abs(a2 - MIN(s))), mistake: 'T7' }, { html: kidDur(d + 40), mistake: 'T5' }, { html: kidDur(a1), mistake: 'T7' }, { html: kidDur(d + 10), mistake: 'other' }]),
      hint(k) { if (k === 1) { split(); ctx.caption(`ちょうどの ${hour12(s - MIN(s) + 60)}じで くぎろう`); } if (k === 2) ctx.caption(`${kidTime(s)} から ${hour12(s - MIN(s) + 60)}じ まで ${kidDur(a1)}`); if (k === 3) ctx.caption(`${hour12(s - MIN(s) + 60)}じ から ${kidTime(e)} まで ${kidDur(a2)}`); },
      async verify() { split(); const cl = c(); cl.st.t = s; cl.update(); await cl.moveTo(s - MIN(s) + 60, 1.2); ctx.caption(`ここまで ${kidDur(a1)}`); await wait(1); await cl.moveTo(e, 1.2); ctx.caption(`${kidDur(a1)} ＋ ${kidDur(a2)} ＝ <b>${kidDur(d)}</b>`, 0, `${spDur(a1)}たす${spDur(a2)}で${spDur(d)}`); await wait(1); } };
  };
  const qNoon = level => {
    reset(); const s = rnd(9, 11) * 60 + (level === 'easy' ? 0 : pick([0, 30])), e = rnd(13, 15) * 60 + (level === 'challenge' ? pick([0, 30]) : 0), d = e - s;
    const lab = t => `${t < 720 ? 'ごぜん' : 'ごご'} ${kidTime(t)}`;
    showT(s); c().st.start = s; c().st.t = e; c().update();
    return { say: `${lab(s)} から ${lab(e)} まで、なんじかん？`, sp: `${t2s(s)}から${t2s(e)}まで、何時間？`, at: at(), detail: { type: 'noon', d }, answerText: kidDur(d), answerSp: spDur(d),
      choices: choices(kidDur(d), [{ html: kidDur(Math.abs(hour12(s) - hour12(e)) * 60 + Math.abs(MIN(e) - MIN(s))), mistake: 'T7' }, { html: kidDur(d + 60), mistake: 'T7' }, { html: kidDur(Math.max(30, d - 60)), mistake: 'other' }]),
      hint(k) { if (k === 1) { sc.flash = 0; sc.sync(); ctx.caption('しょうご（ひるの 12じ）で くぎろう', 0, '正午で区切ろう'); } if (k === 2) ctx.caption(`${lab(s)} から しょうごまで ${kidDur(720 - s)}`); if (k === 3) ctx.caption(`しょうごから ${lab(e)} まで ${kidDur(e - 720)}`); },
      async verify() { const cl = c(); cl.st.t = s; cl.update(); await cl.moveTo(720, 1.4); ctx.caption(`しょうごまで ${kidDur(720 - s)}`); await wait(0.9); await cl.moveTo(e, 1.4); ctx.caption(`ぜんぶで <b>${kidDur(d)}</b>`, 0, `全部で${spDur(d)}`); await wait(0.8); } };
  };
  const t2s = t => (t < 720 ? '午前' : '午後') + spTime(t);
  const qSec = (level, i) => {
    reset(); c().st.secOn = true; c().st.sec = 0; c().update();
    const kinds = level === 'easy' ? ['m2s1', 'm2s'] : ['s2m', 'm2s', 'cmp'];
    const k = kinds[i % kinds.length];
    if (k === 'm2s1') return { say: '1ぷんは なんびょう？', sp: '1分は何秒？', at: at(), detail: { type: 'sec', k }, answerText: '60びょう', choices: choices('60びょう', [{ html: '100びょう', mistake: 'T5' }, { html: '10びょう', mistake: 'T5' }]), hint() { ctx.caption('びょうしんが ひとまわりで 1ぷん'); }, async verify() { await secSpin(60); } };
    if (k === 's2m') { const s = rnd(61, level === 'challenge' ? 179 : 119); return { say: `${s}びょうは なんぷん なんびょう？`, sp: `${s}秒は何分何秒？`, at: at(), detail: { type: 'sec', k, s }, answerText: kidSec(s), answerSp: spSec(s), choices: choices(kidSec(s), [{ html: `${Math.floor(s / 100)}ぷん ${s % 100}びょう`, mistake: 'T5' }, { html: `${Math.floor(s / 10)}ぷん`, mistake: 'T5' }, { html: kidSec(s + 60), mistake: 'other' }].filter(w => w.html !== kidSec(s))), hint(k2) { if (k2 === 1) ctx.caption('60びょうで 1ぷん'); if (k2 >= 2) ctx.caption(`${s} から 60を ひくと ${s - 60}`); }, async verify() { await secSpin(Math.min(s, 90)); } }; }
    if (k === 'm2s') { const m = rnd(1, 2), r = rnd(5, 50), s = m * 60 + r; return { say: `${kidSec(s)}は なんびょう？`, sp: `${spSec(s)}は何秒？`, at: at(), detail: { type: 'sec', k, s }, answerText: `${s}びょう`, choices: choices(`${s}びょう`, [{ html: `${m * 100 + r}びょう`, mistake: 'T5' }, { html: `${m + r}びょう`, mistake: 'T5' }, { html: `${s + 10}びょう`, mistake: 'other' }]), hint(k2) { if (k2 === 1) ctx.caption('1ぷんは 60びょう'); if (k2 >= 2) ctx.caption(`60 ✕ ${m} ＝ ${m * 60}`); }, async verify() { await secSpin(Math.min(s, 90)); } }; }
    const a = rnd(65, 100), b = rnd(1, 1) * 60 + rnd(10, 40);
    const big = a > b ? kidSec(a) : kidSec(b);
    return { say: `ながいのは どっち？`, at: at(), detail: { type: 'sec', k: 'cmp', a, b }, answerText: big, choices: shuffle([{ html: kidSec(a) === big ? `${a}びょう` : `${a}びょう`, ok: a > b, mistake: 'T5' }, { html: kidSec(b), ok: b > a, mistake: 'T5' }]), hint() { ctx.caption('どちらも びょうに なおして くらべよう'); }, async verify() { ctx.caption(`${a}びょう と ${b}びょう`); await wait(1.2); } };
  };
  async function secSpin(s) { const cl = c(); cl.st.secOn = true; const tag = S.token; const t0 = performance.now(); const dur = Math.min(3, s / 30); await new Promise(res => { const f = () => { if (!alive(tag)) return res(); const k = Math.min(1, (performance.now() - t0) / (dur * 1000)); cl.st.sec = s * k; cl.update(); if (k < 1) requestAnimationFrame(f); else res(); }; f(); }); }

  const gens = {
    mix: (lv, i) => (lv !== 'easy' && i === 4 ? qPun() : i % 2 === 0 ? qRead(lv, i) : qSet(lv, i)),
    read: (lv, i) => (lv === 'challenge' && i === 2 ? qPun() : qRead(lv, i)), set: qSet, life: qLife, kind: qKind, dur: qDur, ampm: qAmpm, hour: qHour,
    after: (lv, i) => qAfter(lv, i, false), afterx: (lv, i) => (i % 3 === 2 ? qDurx(lv) : qAfter(lv, i, true)), durx: qDurx, noon: qNoon, sec: qSec,
    // T2 の「ことば」：じこく？ じかん？・ごぜん？ ごご？・1じかん＝60ぷん を まぜる
    words: (lv, i) => [qKind, qAmpm, qHour][i % 3](lv, Math.floor(i / 3)),
    // T3 の まとめ：またぐ ○ぷんご・またぐ じかん・しょうご・びょう
    t3mix: (lv, i) => [qAfter, qDurx, qNoon, qSec, qAfter][i % 5](lv, i, true),
  };
  const gen = gens[type] || gens.mix;
  const kind = opts.kind || ({ mix: 'read', read: 'read', set: 'set', life: 'life', kind: 'kind', dur: 'duration', ampm: 'ampm', hour: 'duration', after: 'after', afterx: 'after', durx: 'duration', noon: 'noon', sec: 'sec', words: 'kind', t3mix: 'after' }[type]);
  const quiz = makeQuiz(ctx, F, { kind, n: opts.n || (type === 'mix' ? 6 : 5), gen: (lv, i) => { canDrag = false; return gen(lv, i); } });
  quiz.start();
  return { dispose() {}, test: quiz.test };
}
