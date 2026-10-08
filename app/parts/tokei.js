// 時計（T1・T2）：長針を指で回すと短針が歯車で連動する。へや・5とび・デジタル・なかを みる・たった時間の扇形・空。
// opts.mode：miru（opts.script：t1｜t2）・hand・room・five・elapse・hour60・day（わたしの いちにち。opts.ampm で午前午後を選ぶ）
import { clockScene, bindHand, MIN, hour12, tod, SCENES, sceneIcon } from './_clock.js';
import { el, C, txt, rect, circle, line, clear, show, dragOn, tapOf, pathOf, wait, polar } from './_flat.js';
import { kidTime, spTime, kidDur, spDur, ampm, ampmSp, fun } from '../core/yomi.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';

export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const mode = opts.mode || 'hand';
  const F = ctx.openFlat();
  const wantSky = opts.sky ?? (mode !== 'five' && mode !== 'room');
  const wantBand = opts.band ?? (['elapse', 'hour60', 'day', 'miru'].includes(mode) && !(mode === 'miru' && opts.script === 't1'));
  let sc = null, canDrag = mode !== 'miru';
  const extra = { draw: null };
  const st0 = { t: opts.t ?? (mode === 'room' ? 7 * 60 + 10 : 7 * 60 + 55) };
  function build() {
    const keep = sc ? Object.assign({}, sc.clock.st) : null;
    F.clearLayers();
    sc = clockScene(F, { sky: wantSky, band: wantBand, box: mode === 'hour60' ? 1 : 0 });
    if (keep) Object.assign(sc.clock.st, keep); else sc.clock.st.t = st0.t;
    if (mode === 'room') sc.clock.st.room = true;
    if (mode === 'five') sc.clock.st.five = true;
    if (sc.sky) sc.sky.digital = !!digital;
    extra.draw && extra.draw();
    sc.clock.update();
  }
  let digital = false;
  F.onResize(build);
  build();
  bindHand(F, { hit: p => sc.clock.hit(p), angMin: p => sc.clock.angMin(p), get st() { return sc.clock.st; }, update: () => sc.clock.update() }, {
    can: () => canDrag,
    onStart: () => ctx.hideHud(),
    onEnd: t => { sayNow(); collect(t); ctx.log('turn', { detail: { t: tod(t), mode } }); extra.onTurn && extra.onTurn(t); },
  });
  const C$ = () => sc.clock;
  function timeHTML(t) {
    let html = kidTime(t), sp = spTime(t);
    if (digital || opts.ampm) { html = ampm(t) + ' ' + html; sp = ampmSp(t) + sp; }
    if (C$().st.start != null) { const d = Math.max(0, t - C$().st.start); html += `　<em>${kidDur(d)} たった</em>`; sp += `、${spDur(d)}たった`; }
    return [html, sp];
  }
  function sayNow() { const [h, s] = timeHTML(C$().st.t); ctx.caption(h, 0, s); }
  // とけい ずかん（ちょうど・はん）・ふん ずかん（0〜59）
  function collect(t) {
    const m = MIN(t), h = hour12(t);
    if (m === 0) ctx.register('tokei', `${h}:00`); if (m === 30) ctx.register('tokei', `${h}:30`);
    ctx.register('fun', 'm' + m);
  }
  const step = d => { ctx.hideHud(); const tag = S.token; C$().moveTo(Math.max(0, C$().st.t + d), d >= 60 ? 0.9 : 0.36).then(() => { if (!alive(tag)) return; sayNow(); collect(C$().st.t); }); sfx.tap(); };
  const toggle = (k, label, fn) => `<button type="button" data-tg="${k}" aria-pressed="false">${label}</button>`;
  const bindToggles = map => $$p(panel, '[data-tg]').forEach(b => on(b, 'click', () => { sfx.tap(); const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(v)); map[b.dataset.tg](v); C$().update(); }));
  const api = { dispose() {}, test: {} };

  /* ---------- みる ---------- */
  if (mode === 'miru') {
    panel.innerHTML = `<div class="row"><button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again} もういちど みる</button></div>`;
    on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); run(); });
    let phase = 'play';
    async function run() {
      const tag = S.token; phase = 'play';
      const c = C$(), say = (h, s) => ctx.caption(h, 0, s), ok = () => alive(tag);
      c.reset(); canDrag = false; sc.flash = null;
      if (opts.script === 't2') {
        c.st.t = 7 * 60; c.st.start = 7 * 60; c.update();
        say('7じ から ながい はりを すすめるよ'); if (!(await wait(1.6)) || !ok()) return;
        await c.moveTo(7 * 60 + 20, 2.6); if (!ok()) return;
        say('ながい はりが うごいた ぶん（いろの ところ）が <b>じかん</b>。<b>20ぷんかん</b>', '長い針が動いた分が時間。20分間'); if (!(await wait(2.8)) || !ok()) return;
        say('いま なんじ？ は <b>じこく</b>。7じ 20ぷん', '今何時、は時刻。7時20分'); if (!(await wait(2.6)) || !ok()) return;
        await c.moveTo(8 * 60, 3.4); if (!ok()) return;
        say('ながい はりが ひとまわり すると <b>60ぷん</b>。<b>1じかん</b>', '長い針がひとまわりすると60分。1時間'); if (!(await wait(3)) || !ok()) return;
        c.st.start = null; c.update();
        say('おひるの 12じは <b>しょうご</b>。ここから <b>ごご</b>', 'お昼の12時は正午。ここから午後'); await c.moveTo(12 * 60, 3.2); if (!ok()) return;
        sc.flash = 0; sc.sync(); if (!(await wait(2)) || !ok()) return; sc.flash = null;
        say('よるの 7じ。あさの 7じと おなじ とけいの かたち', '夜の7時。朝の7時と同じ時計の形'); await c.moveTo(19 * 60, 3.4); if (!ok()) return;
        sc.flash = 7; sc.sync(); if (!(await wait(2.6)) || !ok()) return; sc.flash = null;
        say('みじかい はりが 2かい まわると <b>1にち</b>。<b>24じかん</b>', '短い針が2回まわると1日。24時間'); await c.moveTo(31 * 60, 3.8); if (!ok()) return;
        c.st.t = 7 * 60; c.update();
      } else {
        c.st.t = 7 * 60; c.st.gear = true; c.update();
        say('ながい はりが ひとまわり すると…'); if (!(await wait(1.4)) || !ok()) return;
        await c.moveTo(8 * 60, 5); if (!ok()) return;
        say('みじかい はりは 7から 8へ。<b>8じ</b>。なかの はぐるまが つながって いるよ', '短い針は7から8へ。8時。中の歯車がつながっているよ'); if (!(await wait(3)) || !ok()) return;
        c.st.gear = false; c.st.room = true; c.update();
        await c.moveTo(8 * 60 + 30, 2.6); if (!ok()) return;
        say('みじかい はりは 8と 9の あいだの <b>へや</b>。ちいさい ほうの 8を よむ。<b>8じはん</b>', '短い針は8と9のあいだの部屋。小さいほうの8を読む。8時半'); if (!(await wait(3.2)) || !ok()) return;
        c.st.five = true; c.update();
        await c.moveTo(8 * 60 + 55, 2.6); if (!ok()) return;
        say('ながい はりが 11 → <b>55ふん</b>。みじかい はりは まだ 8の へや。<b>8じ 55ふん</b>', '長い針が11で55分。短い針はまだ8の部屋。8時55分'); if (!(await wait(3.6)) || !ok()) return;
        c.reset();
        for (const s of [SCENES[0], SCENES[2], SCENES[4], SCENES[7]]) {
          await c.moveTo(s.t, 2.2); if (!ok()) return;
          say(`${s.pm && s.t >= 18 * 60 ? 'よる' : s.pm ? 'ひる' : 'あさ'} ${kidTime(s.t)}。${s.label}`, `${spTime(s.t)}。${s.label}`); if (!(await wait(2.2)) || !ok()) return;
        }
        c.st.t = 7 * 60; c.update();
      }
      say('つぎは「さわる」で はりを まわして みよう'); ctx.log('miru'); phase = 'done'; canDrag = true;
    }
    run();
    api.test = { state: () => ({ phase }), auto: () => (phase === 'done' ? { done: true } : { wait: 400 }) };
    return api;
  }

  /* ---------- さわる：はりを まわす ---------- */
  if (mode === 'hand') {
    panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-step="-5">−5ふん</button><button class="btn sub small" type="button" data-step="5">＋5ふん</button><button class="btn sub small" type="button" data-step="60">＋1じかん</button></div>
      <div class="row"><div class="seg" role="group" aria-label="みかた">${toggle('room', 'へや')}${toggle('five', '5とび')}${toggle('digital', 'デジタル')}${toggle('gear', 'なかを みる')}</div></div>`;
    $$p(panel, '[data-step]').forEach(b => on(b, 'click', () => step(+b.dataset.step)));
    bindToggles({
      room: v => { C$().st.room = v; if (v) ctx.caption('みじかい はりが いる <b>へや</b>。ちいさい ほうの かずを よむ', 0, '短い針がいる部屋。小さいほうの数を読む'); },
      five: v => { C$().st.five = v; if (v) ctx.caption('ながい はりは <b>5とび</b>で よむ。5、10、15…', 0, '長い針は5とびで読む'); },
      digital: v => { digital = v; if (sc.sky) sc.sky.digital = v; sc.sync(); sayNow(); },
      gear: v => { C$().st.gear = v; if (v) ctx.caption('なかの はぐるまが つながって いるから、いっしょに うごく', 0, '中の歯車がつながっているから、いっしょに動く'); },
    });
    $$p(panel, '[data-tg="five"]').forEach(b => b.setAttribute('aria-pressed', String(C$().st.five)));
    ctx.caption('ながい はりを ゆびで まわしてね', 0, '長い針を指で回してね');
    let turns = 0; extra.onTurn = () => { turns++; };
    api.test = {
      state: () => ({ t: C$().st.t, turns }),
      auto() { if (turns >= 1) return { done: true }; const target = C$().st.t + 25; return pathOf(F, C$().dragPath(target)); },
    };
    return api;
  }

  /* ---------- さわる：みじかい はりの へや ---------- */
  if (mode === 'room') {
    panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-step="-10">−10ぷん</button><button class="btn sub small" type="button" data-step="10">＋10ぷん</button><button class="btn sub small" type="button" data-step="60">＋1じかん</button><button class="btn small" type="button" data-k="read">よんで みる</button></div>`;
    $$p(panel, '[data-step]').forEach(b => on(b, 'click', () => step(+b.dataset.step)));
    let reads = 0;
    on($p(panel, '[data-k="read"]'), 'click', () => {
      sfx.tap(); reads++;
      const t = C$().st.t, h = hour12(t), n = h === 12 ? 1 : h + 1, m = MIN(t);
      ctx.caption(m === 0 ? `みじかい はりは ちょうど <b>${h}</b>。<b>${h}じ</b>` : `みじかい はりは <b>${h}</b>と ${n}の あいだ → <b>${h}じ</b>。ながい はりで ${m}${fun(m)}`, 0, m === 0 ? `短い針はちょうど${h}。${h}時` : `短い針は${h}と${n}のあいだ。${h}時。長い針で${m}分`);
      C$().st.room = true; C$().update(); sc.flash = null; tapHint();
    });
    const tapHint = () => { C$().e.room.setAttribute('opacity', 0.62); setTimeout(() => C$().e.room && C$().e.room.setAttribute('opacity', 0.38), 600); };
    ctx.caption('みじかい はりが いる <b>へや</b>（いろの ところ）を みてね', 0, '短い針がいる部屋を見てね');
    api.test = { state: () => ({ reads }), auto: () => (reads ? { done: true } : { click: 'data-k=read|' }) };
    return api;
  }

  /* ---------- さわる：5とびの カード ---------- */
  if (mode === 'five') {
    panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-k="count">5とびで かぞえる</button><button class="btn sub small" type="button" data-step="5">＋5ふん</button><button class="btn sub small" type="button" data-step="1">＋1ぷん</button></div>`;
    $$p(panel, '[data-step]').forEach(b => on(b, 'click', () => step(+b.dataset.step)));
    let taps = 0;
    on($p(panel, '[data-k="count"]'), 'click', async () => {
      sfx.tap(); const tag = S.token, c = C$(), m = MIN(c.st.t), base = c.st.t - m;
      c.st.minSector = true;
      for (let k = 5; k <= Math.max(5, Math.floor(m / 5) * 5); k += 5) { c.st.t = base + k; c.update(); ctx.caption(`${k}`, 0, String(k)); sfx.tap(); if (!(await wait(0.5)) || !alive(tag)) return; }
      c.st.t = base + m; c.st.minSector = false; c.update(); sayNow();
    });
    dragOn(F.svg, F, {
      hit: p => C$().e.fiveCards.find(f => Math.hypot(p.x - f.x, p.y - f.y) < Math.max(18, C$().R * 0.13)) || null,
      end: (p, f) => { taps++; const c = C$(), base = c.st.t - MIN(c.st.t); c.moveTo(base + f.m, 0.6).then(() => { ctx.caption(`ながい はりが ${f.m / 5 || 12} → <b>${f.m}${fun(f.m)}</b>`, 0, `長い針が${f.m / 5 || 12}で${f.m}分`); collect(c.st.t); }); ctx.log('turn', { detail: { five: f.m } }); },
    });
    ctx.caption('そとの <b>5とびの カード</b>を タッチしてね', 0, '外の5とびのカードをタッチしてね');
    api.test = { state: () => ({ taps }), auto: () => { if (taps >= 2) return { done: true }; const f = C$().e.fiveCards[(taps * 5 + 3) % 12]; return tapOf(F, f.x, f.y); } };
    return api;
  }

  /* ---------- さわる：たった じかん（T2） ---------- */
  if (mode === 'elapse') {
    panel.innerHTML = `<div class="row"><button class="btn small" type="button" data-k="meas" aria-pressed="false">はかる</button><button class="btn sub small" type="button" data-step="5">＋5ふん</button><button class="btn sub small" type="button" data-step="10">＋10ぷん</button><button class="btn sub small" type="button" data-step="30">＋30ぷん</button><button class="btn sub small" type="button" data-step="60">＋1じかん</button></div>`;
    $$p(panel, '[data-step]').forEach(b => on(b, 'click', () => step(+b.dataset.step)));
    const mb = $p(panel, '[data-k="meas"]');
    on(mb, 'click', () => {
      sfx.tap(); const c = C$(); c.st.start = c.st.start == null ? c.st.t : null; c.update();
      mb.setAttribute('aria-pressed', String(c.st.start != null)); mb.textContent = c.st.start != null ? 'やめる' : 'はかる';
      if (c.st.start != null) ctx.caption('はりを すすめてね。うごいた ぶんが <em>じかん</em>', 0, '針を進めてね。動いた分が時間'); else sayNow();
      ctx.log('turn', { detail: { measure: c.st.start != null } });
    });
    ctx.caption('「はかる」を おして から、はりを すすめよう', 0, '「はかる」を押してから、針を進めよう');
    let n = 0; extra.onTurn = () => { n++; };
    api.test = { state: () => ({ n, start: C$().st.start }), auto: () => (C$().st.start == null ? { click: 'data-k=meas|' } : n < 1 ? pathOf(F, C$().dragPath(C$().st.t + 20)) : { done: true }) };
    return api;
  }

  /* ---------- さわる：1じかん＝60ぷん（T2） ---------- */
  if (mode === 'hour60') {
    let cells = [];
    extra.draw = () => {
      const g = F.layer('cells'), B = sc.box; cells = [];
      if (!B) return;
      const cols = B.w / B.h > 3.2 ? 20 : 12, rows = 60 / cols, cw = B.w / cols, ch = Math.min(26, (B.h - 22) / rows - 4);
      txt(g, B.x, B.y + 14, '60の めもり', { 'font-size': 14, fill: C('ink-soft'), 'text-anchor': 'start' });
      for (let i = 0; i < 60; i++) cells.push(rect(g, B.x + (i % cols) * cw + 1, B.y + 22 + Math.floor(i / cols) * (ch + 4), cw - 2, ch, { rx: 4, fill: C('paper'), stroke: C('line'), 'stroke-width': 1.2 }));
      paint();
    };
    const paint = () => { const c = C$(), d = c.st.start == null ? 0 : Math.max(0, c.st.t - c.st.start); cells.forEach((r, i) => r.setAttribute('fill', i < Math.min(60, d) ? C('sora-soft') : C('paper'))); };
    if (wantBand && !sc.L.land) { /* 縦長は帯の上に置く */ }
    build();
    const prevUp = sc.clock.onUpdate; sc.clock.onUpdate = t => { prevUp(t); paint(); };
    const reb = () => { const p = sc.clock.onUpdate; sc.clock.onUpdate = t => { p(t); paint(); }; };
    F.onResize(reb);
    panel.innerHTML = `<div class="row"><button class="btn" type="button" data-k="hour">1じかん すすめる</button><button class="btn sub small" type="button" data-step="10">＋10ぷん</button><button class="btn sub small" type="button" data-k="reset">はじめから</button></div>`;
    $$p(panel, '[data-step]').forEach(b => on(b, 'click', () => { if (C$().st.start == null) C$().st.start = C$().st.t; step(+b.dataset.step); }));
    let hours = 0;
    on($p(panel, '[data-k="hour"]'), 'click', async () => {
      sfx.tap(); const tag = S.token, c = C$(); c.st.start = c.st.t; c.update();
      ctx.caption('ながい はりが ひとまわり…', 0);
      await c.moveTo(c.st.t + 60, 4); if (!alive(tag)) return;
      hours++; ctx.caption('60の めもりが ぜんぶ うまった。<b>1じかん</b>＝<b>60ぷん</b>', 0, '60の目盛りが全部うまった。1時間は60分'); ctx.log('turn', { detail: { hour: true } }); collect(c.st.t);
    });
    on($p(panel, '[data-k="reset"]'), 'click', () => { sfx.tap(); const c = C$(); c.st.start = null; c.st.t = 7 * 60; c.update(); paint(); ctx.caption('7じ から はじめよう', 0, '7時から始めよう'); });
    ctx.caption('「1じかん すすめる」を おしてね', 0, '「1時間すすめる」を押してね');
    api.test = { state: () => ({ hours }), auto: () => (hours ? { done: true } : { click: 'data-k=hour|' }) };
    return api;
  }

  /* ---------- つくる：わたしの いちにち ---------- */
  if (mode === 'day') {
    const placed = new Map();   // id → 0時からの分
    let sel = null, ap = 'am';
    extra.draw = () => {
      if (!sc.band) return;
      const g = F.layer('cards'); clear(g);
      for (const s of SCENES) if (placed.has(s.id)) {
        const T = placed.get(s.id), b = sc.band, x = b.xOf(T), y = b.rowY[b.rowOf(T)];
        const sz = Math.min(34, b.rowH * 1.3), cg = el('g', { transform: `translate(${x - sz / 2},${y - sz - 2})` }, g);
        rect(cg, 0, 0, sz, sz, { rx: 7, fill: C('paper'), stroke: s.id === sel ? C('ok') : C('line'), 'stroke-width': 2 });
        const ic = el('g', { transform: `scale(${sz / 40})` }, cg); ic.innerHTML = sceneIcon(s.id).replace(/^<svg[^>]*>|<\/svg>$/g, '');
      }
    };
    build();
    const chooser = SCENES.map(s => `<button type="button" class="chip" data-scene="${s.id}" aria-pressed="false">${sceneIcon(s.id).replace('<svg', '<svg width="22" height="22"')}${s.label}</button>`).join('');
    panel.innerHTML = `<div class="chips">${chooser}</div>
      <div class="row">${opts.ampm ? `<div class="seg" role="group" aria-label="ごぜん・ごご"><button type="button" data-ap="am" aria-pressed="true">ごぜん</button><button type="button" data-ap="pm" aria-pressed="false">ごご</button></div>` : ''}<button class="btn sub small" type="button" data-step="-60">−1じかん</button><button class="btn sub small" type="button" data-step="60">＋1じかん</button><button class="btn sub small" type="button" data-step="-5">−5ふん</button><button class="btn sub small" type="button" data-step="5">＋5ふん</button><button class="btn" type="button" data-k="place">おびに はる</button></div>`;
    $$p(panel, '[data-step]').forEach(b => on(b, 'click', () => step(+b.dataset.step)));
    const T24 = () => { const t = C$().st.t, h = hour12(t) % 12, m = MIN(t); return (ap === 'pm' ? 720 : 0) + h * 60 + m; };
    const setAp = v => { ap = v; $$p(panel, '[data-ap]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ap === v))); };
    $$p(panel, '[data-ap]').forEach(b => on(b, 'click', () => { sfx.tap(); if (ap === b.dataset.ap) { ctx.toast('', `いまは「${b.textContent}」だよ`, 1.6); return; } setAp(b.dataset.ap); C$().st.t = T24(); C$().update(); sayNow(); }));
    const pick = id => {
      sel = id; const s = SCENES.find(x => x.id === id);
      $$p(panel, '[data-scene]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scene === id)));
      if (!opts.ampm) ap = s.pm ? 'pm' : 'am'; else setAp(placed.has(id) ? (placed.get(id) >= 720 ? 'pm' : 'am') : ap);
      const base = placed.has(id) ? placed.get(id) : (s.pm ? 15 * 60 : 7 * 60);
      C$().st.t = base; C$().update(); extra.draw();
      ctx.caption(`<b>${s.label}</b>は なんじ？ とけいを あわせて「おびに はる」`, 0, `${s.label}は何時？時計を合わせて「帯に貼る」`);
    };
    $$p(panel, '[data-scene]').forEach(b => on(b, 'click', () => { sfx.tap(); if (sel === b.dataset.scene) { ctx.toast('', `いまは「${SCENES.find(s => s.id === sel).label}」だよ`, 1.6); return; } pick(b.dataset.scene); }));
    on($p(panel, '[data-k="place"]'), 'click', () => {
      if (!sel) { sfx.off(); ctx.toast('', 'うえの カードから ばめんを えらんでね', 2.2); $p(panel, '.chips').classList.add('pulse'); return; }
      sfx.pop(); const T = T24(); placed.set(sel, T); collect(T);
      const s = SCENES.find(x => x.id === sel);
      $$p(panel, `[data-scene="${sel}"]`).forEach(b => b.classList.add('picked'));
      if (opts.ampm) ctx.register('day', s.id);
      // ならべた となりの ばめんとの あいだの じかん（T2）
      const order = SCENES.filter(x => placed.has(x.id)).sort((a, b) => placed.get(a.id) - placed.get(b.id)), k = order.findIndex(x => x.id === sel);
      const prev = order[k - 1];
      const [h, sp] = timeHTML(T);
      ctx.caption(`${s.label}：${h}${opts.ampm && prev ? `。${prev.label}から ${kidDur(T - placed.get(prev.id))}` : ''}`, 0, `${s.label}、${sp}${opts.ampm && prev ? `。${prev.label}から${spDur(T - placed.get(prev.id))}` : ''}`);
      ctx.log('day-card', { detail: { scene: s.id, t: T } });
      extra.draw();
      if (placed.size === SCENES.length) {
        sfx.good(); ctx.toast(ICON.HANAMARU, 'わたしの いちにちが できた！', 3);
        ctx.log('day', { correct: true, detail: { n: placed.size, ampm: !!opts.ampm } }); ctx.done('day');
      }
      const next = SCENES.find(x => !placed.has(x.id)); if (next) setTimeout(() => { if (alive(tag0) && sel !== next.id) pick(next.id); }, 900);
    });
    const tag0 = S.token;
    ctx.caption('うえの カードから ばめんを えらんでね', 0, '上のカードから場面を選んでね');
    api.test = {
      state: () => ({ placed: placed.size, sel }),
      auto() {
        if (placed.size === SCENES.length) return { done: true };
        if (!sel || placed.has(sel)) { const n = SCENES.find(x => !placed.has(x.id)); return { click: `data-scene=${n.id}|` }; }
        const s = SCENES.find(x => x.id === sel), want = s.t;
        if (opts.ampm && (ap === 'pm') !== (want >= 720)) return { click: `data-ap=${want >= 720 ? 'pm' : 'am'}|` };
        const cur = T24(); if (Math.floor(cur / 60) !== Math.floor(want / 60)) return { click: `data-step=${cur < want ? 60 : -60}|` };
        if (cur !== want) return pathOf(F, C$().dragPath(C$().st.t + (want - cur)));
        return { click: 'data-k=place|' };
      },
    };
    return api;
  }
  return api;
}
