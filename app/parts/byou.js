// 秒（T3）：秒針の時計。1秒・10秒・1分を体で感じる。てびょうしに合わせる。目をつぶって1分（10秒）を当てる。
// opts.mode：sec（さわる）・guess（つくる：1ぷんを あてよう）
// 時間は実際の秒（performance.now）で測る。画面の動きは「動きの量」の設定に合わせない（量感のため）。
import { el, C, txt, circle, line, path, polar, sector, clear, wait } from './_flat.js';
import { kidSec, spSec } from '../core/yomi.js';
import { S, alive, motion } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';

export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const mode = opts.mode || 'sec';
  const F = ctx.openFlat();
  const st = { sec: 0, run: false, hidden: false, t0: 0, beats: [], taps: [] };
  let e = {};
  // 実時間の1秒（E2E は ?speed= で縮める。子どもの端末では 1）
  const SEC = () => 1000 * motion.speed;
  function build() {
    F.clearLayers(); const g = F.layer('watch'), H = F.bottom - F.top - F.cap, R = Math.min(H * 0.42, F.W * 0.3), cx = F.W / 2, cy = F.top + F.cap + H / 2;
    e = { R, cx, cy };
    circle(g, cx, cy + 6, R * 1.06, { fill: C('line') });
    circle(g, cx, cy, R * 1.06, { fill: C('metal-dark') });
    circle(g, cx, cy, R, { fill: C('paper') });
    e.fill = path(g, '', { fill: C('sora-soft'), opacity: 0.55 });
    for (let i = 0; i < 60; i++) { const big = i % 5 === 0, [a, b] = polar(cx, cy, R * 0.95, i * 6), [c2, d] = polar(cx, cy, R * (big ? 0.82 : 0.9), i * 6); line(g, a, b, c2, d, { 'stroke-width': big ? 3 : 1.2 }); }
    for (let k = 0; k < 12; k++) { const [x, y] = polar(cx, cy, R * 0.68, k * 30); txt(g, x, y + R * 0.06, String(k * 5), { 'font-size': R * 0.15, class: 'ui' }); }
    e.hand = line(g, cx, cy + R * 0.12, cx, cy - R * 0.86, { stroke: C('ok'), 'stroke-width': Math.max(3, R * 0.025) });
    circle(g, cx, cy, Math.max(5, R * 0.04), { fill: C('ink') });
    e.big = txt(g, cx, cy + R * 0.42, '', { 'font-size': R * 0.2, class: 'ui', fill: C('mat-deep') });
    e.cover = el('g', {}, g);
    circle(e.cover, cx, cy, R * 1.07, { fill: C('ink'), opacity: 0.92 });
    e.coverTxt = txt(e.cover, cx, cy + 8, 'めを つぶって…', { 'font-size': Math.max(18, R * 0.14), fill: C('paper') });
    e.beat = circle(g, cx + R * 1.3 > F.W - 20 ? cx : cx + R * 1.25, cy - R * 0.9, Math.max(14, R * 0.09), { fill: C('yamabuki'), opacity: 0 });
    draw();
  }
  function draw() {
    const s = st.sec, a = (s % 60) * 6;
    e.hand.setAttribute('transform', `rotate(${a} ${e.cx} ${e.cy})`);
    e.fill.setAttribute('d', s >= 60 ? sector(e.cx, e.cy, e.R * 0.9, 0, 359.999) : sector(e.cx, e.cy, e.R * 0.9, 0, a));
    e.big.textContent = st.hidden ? '' : kidSec(Math.floor(s));
    e.cover.style.display = st.hidden ? '' : 'none';
  }
  F.onResize(build); build();
  // 実時間で動かす（終わり・打ち切りで止まる）
  function runFor(sec, { beat = false } = {}) {
    const tag = S.token; st.run = true; st.sec = 0; st.t0 = performance.now(); st.beats = [];
    return new Promise(res => {
      let lastBeat = -1;
      const f = () => {
        if (!alive(tag) || !st.run) { st.run = false; return res(false); }
        const s = (performance.now() - st.t0) / SEC(); st.sec = Math.min(sec, s); draw();
        if (Math.floor(s) !== lastBeat && s < sec) { lastBeat = Math.floor(s); sfx.tap(); if (beat) { st.beats.push(performance.now()); e.beat.setAttribute('opacity', 0.9); setTimeout(() => e.beat && e.beat.setAttribute('opacity', 0), 160); } }
        if (s < sec) requestAnimationFrame(f); else { st.run = false; res(true); }
      };
      f();
    });
  }
  const api = { dispose() { st.run = false; }, test: {} };

  /* ---------- さわる：1びょう・10びょう・1ぷん・てびょうし ---------- */
  if (mode === 'sec') {
    panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-run="1">1びょう</button><button class="btn sub small" type="button" data-run="10">10びょう</button><button class="btn sub small" type="button" data-run="60">1ぷん</button><button class="btn sub small" type="button" data-k="stop">とめる</button></div>
      <div class="row"><button class="btn" type="button" data-k="clap">てびょうし（10びょう）</button><button class="btn big" type="button" data-k="tap" disabled>たん！</button></div>`;
    let runs = 0;
    $$p(panel, '[data-run]').forEach(b => on(b, 'click', async () => {
      sfx.tap(); const n = +b.dataset.run, tag = S.token; st.hidden = false;
      ctx.caption(n === 60 ? 'びょうしんが ひとまわり すると <b>1ぷん</b>（60びょう）' : `${n}びょう…`, 0, n === 60 ? '秒針がひとまわりすると1分。60秒' : `${n}秒`);
      if (await runFor(n) && alive(tag)) { runs++; ctx.caption(`${kidSec(n)}${n === 60 ? '＝60びょう' : ''}`, 0, n === 60 ? '1分は60秒' : `${n}秒`); ctx.log('sec', { detail: { n } }); }
    }));
    on($p(panel, '[data-k="stop"]'), 'click', () => { sfx.tap(); st.run = false; ctx.caption(`${kidSec(Math.floor(st.sec))}で とめたよ`, 0, spSec(Math.floor(st.sec)) + 'で止めたよ'); draw(); });
    const tapBtn = $p(panel, '[data-k="tap"]');
    on($p(panel, '[data-k="clap"]'), 'click', async () => {
      sfx.tap(); const tag = S.token; st.taps = []; tapBtn.disabled = false;
      ctx.caption('ひかったら「たん！」を おそう。1びょうずつ', 0, '光ったら、たん、を押そう。1秒ずつ');
      if (!(await runFor(10, { beat: true })) || !alive(tag)) return;
      tapBtn.disabled = true;
      // それぞれの合図に一番近いタップのずれ（秒）
      const offs = st.beats.map(bt => st.taps.length ? Math.min(...st.taps.map(t => Math.abs(t - bt))) / SEC() : 1);
      const good = offs.filter(o => o < 0.25).length;
      ctx.caption(`${st.beats.length}かいの うち <b>${good}かい</b> ぴったり`, 0, `${st.beats.length}回のうち${good}回ぴったり`);
      ctx.log('clap', { detail: { good, n: st.beats.length } }); runs++;
    });
    on(tapBtn, 'click', () => { sfx.pop(); st.taps.push(performance.now()); e.beat.setAttribute('opacity', 0.4); });
    ctx.caption('ボタンを おして、びょうしんの はやさを かんじよう', 0, 'ボタンを押して、秒針の速さを感じよう');
    api.test = { state: () => ({ runs, run: st.run }), auto: () => (st.run ? (tapBtn.disabled ? { wait: 400 } : { click: 'data-k=tap|' }) : runs >= 2 ? { done: true } : { click: 'data-run=10|' }) };
    return api;
  }

  /* ---------- つくる：1ぷんを あてよう ---------- */
  if (mode === 'guess') {
    let target = opts.target || 60, phase = 'ready', rec = 0;
    panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="なんびょう？"><button type="button" data-tg="10" aria-pressed="${target === 10}">10びょう</button><button type="button" data-tg="30" aria-pressed="${target === 30}">30びょう</button><button type="button" data-tg="60" aria-pressed="${target === 60}">1ぷん</button></div></div>
      <div class="row"><button class="btn big" type="button" data-k="go">はじめ</button><button class="btn big" type="button" data-k="stop" hidden>たった！</button></div>`;
    const go = $p(panel, '[data-k="go"]'), stop = $p(panel, '[data-k="stop"]');
    const label = () => (target === 60 ? '1ぷん' : `${target}びょう`);
    $$p(panel, '[data-tg]').forEach(b => on(b, 'click', () => { sfx.tap(); if (+b.dataset.tg === target) { ctx.toast('', `いまは「${b.textContent}」だよ`, 1.6); return; } target = +b.dataset.tg; $$p(panel, '[data-tg]').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.tg === target))); ctx.caption(`${label()}を あてよう。「はじめ」を おしてね`); }));
    on(go, 'click', () => {
      sfx.pop(); phase = 'run'; st.hidden = true; st.sec = 0; draw(); go.hidden = true; stop.hidden = false;
      st.t0 = performance.now(); ctx.caption(`めを つぶって、${label()} たったと おもったら「たった！」`, 0, `目をつぶって、${target === 60 ? '1分' : target + '秒'}たったと思ったら、たった、を押そう`);
      const tag = S.token;
      const tick = () => { if (!alive(tag) || phase !== 'run') return; st.sec = (performance.now() - st.t0) / SEC(); if (st.sec > target * 3) { phase = 'ready'; st.hidden = false; go.hidden = false; stop.hidden = true; draw(); ctx.caption('ながすぎたよ。もういちど'); return; } requestAnimationFrame(tick); };
      tick();
    });
    on(stop, 'click', async () => {
      const got = Math.round((performance.now() - st.t0) / SEC() * 10) / 10, tag = S.token;
      phase = 'show'; stop.hidden = true; st.hidden = false; st.sec = 0; draw(); sfx.tap();
      // じっさいに たった じかんまで びょうしんを まわして みせる
      const t0 = performance.now(), dur = Math.min(2.4, got / 15);
      await new Promise(res => { const f = () => { if (!alive(tag)) return res(); const k = Math.min(1, (performance.now() - t0) / (dur * 1000)); st.sec = got * k; draw(); if (k < 1) requestAnimationFrame(f); else res(); }; f(); });
      if (!alive(tag)) return;
      const diff = Math.round((got - target) * 10) / 10, s = Math.round(got);
      rec++;
      ctx.register('guess', `${Date.now()}:${target}:${s}`);
      ctx.log('guess-minute', { correct: Math.abs(diff) <= target * 0.15, detail: { target, got, diff } });
      ctx.log('estimate', { correct: Math.abs(diff) <= target * 0.15, detail: { q: `${label()}あて`, guess: got, actual: target, unit: 'びょう', qty: 'time' } });
      if (Math.abs(diff) <= target * 0.1) { sfx.good(); ctx.toast(ICON.HANAMARU, `${kidSec(s)}！ ぴったりに ちかい！`, 3, `${spSec(s)}。ぴったりに近い`); }
      else ctx.caption(`${kidSec(s)} だったよ。${diff > 0 ? 'ながかった' : 'みじかかった'}（${Math.abs(Math.round(diff))}びょう）`, 0, `${spSec(s)}だったよ。${diff > 0 ? '長かった' : '短かった'}`);
      ctx.done('guess');
      phase = 'ready'; go.hidden = false; go.textContent = 'もういちど';
    });
    ctx.caption(`${label()}を あてよう。「はじめ」を おしてね`);
    api.test = { state: () => ({ phase, rec }), auto: () => (rec >= 1 ? { done: true } : phase === 'ready' ? { click: 'data-k=go|' } : phase === 'run' ? (st.sec >= target * 0.9 ? { click: 'data-k=stop|' } : { wait: 300 }) : { wait: 300 }) };
    return api;
  }
  return api;
}
