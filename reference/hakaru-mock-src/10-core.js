'use strict';
/* ---------- 小さな道具 ---------- */
const $ = (s, r = document) => r.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
function S(tag, a, p) { const e = document.createElementNS(NS, tag); if (a) for (const k in a) { if (a[k] != null) e.setAttribute(k, a[k]); } if (p) p.appendChild(e); return e; }
function H(tag, a, kids) {
  const e = document.createElement(tag);
  if (a) for (const k in a) {
    const v = a[k]; if (v == null) continue;
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
  }
  if (kids) for (const c of [].concat(kids)) { if (c == null) continue; e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
  return e;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const E = {
  io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  lin: t => t,
  back: t => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
};
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPEED = RM ? 0.2 : 1;
const RUN = { id: 0 };
class Cancel extends Error {}
function tween(ms, fn, e = E.io) {
  const id = RUN.id; ms = Math.max(1, ms * SPEED);
  return new Promise((res, rej) => {
    const t0 = performance.now();
    const f = now => {
      if (id !== RUN.id) { rej(new Cancel()); return; }
      const p = clamp((now - t0) / ms, 0, 1); fn(e(p), p);
      if (p < 1) requestAnimationFrame(f); else res();
    };
    requestAnimationFrame(f);
  });
}
function wait(ms) { const id = RUN.id; return new Promise((res, rej) => setTimeout(() => id === RUN.id ? res() : rej(new Cancel()), ms * SPEED)); }
function cancelRuns() { RUN.id++; }
async function run(fn) { try { await fn(); } catch (e) { if (!(e instanceof Cancel)) console.error(e); } }
const store = {
  get(k, d) { try { const v = localStorage.getItem('hakaru-mock.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('hakaru-mock.' + k, JSON.stringify(v)); } catch (e) {} }
};
function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

/* ---------- 音 ---------- */
let userActed = false;
const SFX = {
  ctx: null, water: null,
  init() { if (this.ctx) return; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} },
  tone(f, d = .12, type = 'sine', g = .1, when = 0) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when, o = c.createOscillator(), v = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + .01); v.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(v).connect(c.destination); o.start(t); o.stop(t + d + .03);
  },
  _last: 0,
  tick() { const n = performance.now(); if (n - this._last < 28) return; this._last = n; this.tone(2100, .025, 'square', .025); },
  pop() { this.tone(660, .08, 'triangle', .09); this.tone(990, .1, 'triangle', .05, .05); },
  good() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .2, 'triangle', .08, i * .08)); },
  soft() { this.tone(330, .2, 'sine', .07); this.tone(262, .24, 'sine', .05, .1); },
  clink() { this.tone(2600, .06, 'triangle', .05); this.tone(3400, .05, 'sine', .03, .02); },
  thud() { this.tone(120, .16, 'sine', .14); },
  pourStart() {
    const c = this.ctx; if (!c || this.water) return;
    const n = c.createBufferSource(), b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    n.buffer = b; n.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 850; f.Q.value = .9;
    const g = c.createGain(); g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(.05, c.currentTime + .12);
    n.connect(f).connect(g).connect(c.destination); n.start(); this.water = { n, g };
  },
  pourStop() { const w = this.water; if (!w) return; const c = this.ctx; w.g.gain.linearRampToValueAtTime(0, c.currentTime + .15); w.n.stop(c.currentTime + .2); this.water = null; }
};
document.addEventListener('pointerdown', () => {
  userActed = true; SFX.init();
  if (SFX.ctx && SFX.ctx.state === 'suspended') SFX.ctx.resume();
}, { capture: true });

/* ---------- 読み上げ ---------- */
const TTS = {
  ok: 'speechSynthesis' in window, on: store.get('tts', true), voice: null,
  pick() {
    if (!this.ok) return;
    const vs = speechSynthesis.getVoices().filter(v => /^ja/i.test(v.lang));
    this.voice = vs.find(v => /Kyoko|O-ren|Otoya|Google/i.test(v.name)) || vs[0] || null;
    $('#ttsBtn').hidden = !this.voice; $('#hudSay').hidden = !this.voice;
  },
  speak(t) {
    if (!this.ok || !this.on || !this.voice || !userActed || !t) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.voice = this.voice; u.lang = 'ja-JP'; u.rate = .95; u.pitch = 1.05; speechSynthesis.speak(u); } catch (e) {}
  },
  stop() { try { if (this.ok) speechSynthesis.cancel(); } catch (e) {} }
};

/* ---------- 字幕 ---------- */
const HUD = {
  last: '', timer: 0,
  say(html, o = {}) {
    clearTimeout(this.timer);
    $('#hudTxt').innerHTML = html; $('#hud').classList.remove('off');
    const sp = o.speech != null ? o.speech : html.replace(/<rt>.*?<\/rt>/g, '').replace(/<[^>]+>/g, '');
    this.last = sp; if (o.speak !== false) TTS.speak(sp);
    if (o.ms) this.timer = setTimeout(() => this.hide(), o.ms);
  },
  hide() { $('#hud').classList.add('off'); }
};
$('#hudSay').addEventListener('click', () => TTS.speak(HUD.last));

/* ---------- シート ---------- */
function openSheet(build, o = {}) {
  closeSheet();
  const card = H('div', { class: 'sheet-card', role: 'dialog', 'aria-modal': 'true' });
  const sh = H('div', { class: 'sheet', id: 'sheet', onclick: e => { if (e.target === sh && !o.modal) closeSheet(); } }, card);
  const close = H('button', { class: 'icon-btn', 'aria-label': 'とじる', onclick: closeSheet, html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' });
  build(card, close);
  $('#sheetHost').appendChild(sh);
  const f = card.querySelector('button'); if (f) f.focus({ preventScroll: true });
}
function closeSheet() { const s = $('#sheet'); if (s) s.remove(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

/* ---------- 絵（アイコン） ---------- */
const ICON = {
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V5.5a1.5 1.5 0 013 0V12"/><path d="M11 11.5v-7a1.5 1.5 0 013 0V12"/><path d="M14 11.5V6a1.5 1.5 0 013 0v8.5"/><path d="M8 12.5L6.6 11a1.6 1.6 0 00-2.4 2.1l3.3 4.6A6 6 0 0012.4 20H13a5 5 0 005-5"/></svg>',
  try: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8"/><path d="M3 3v5h5"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0012 3z"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  star: (on) => `<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.3L12 17.1l-5.7 3.1 1.2-6.3L2.8 9.5l6.4-.8z" fill="${on ? 'var(--yamabuki)' : 'none'}" stroke="${on ? '#d79a12' : 'var(--line)'}" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  door: {
    nagasa: `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="#fdf1e2"/><g transform="rotate(-24 60 60)"><rect x="12" y="46" width="96" height="28" rx="4" fill="#f4dc9f" stroke="#c9a06b" stroke-width="2.5"/>${Array.from({ length: 19 }, (_, i) => `<line x1="${18 + i * 4.8}" y1="46" x2="${18 + i * 4.8}" y2="${i % 5 === 0 ? 60 : i % 5 === 0 ? 56 : 53}" stroke="#7a5a2a" stroke-width="2"/>`).join('')}</g><circle cx="88" cy="88" r="13" fill="#d7dce0" stroke="#8e979b" stroke-width="2.5"/><text x="88" y="93" text-anchor="middle" font-size="14" fill="#5e6b66" font-family="Zen Maru Gothic,sans-serif" font-weight="900">1</text></svg>`,
    kasa: `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="#e6f1fa"/><path d="M34 30h52l-5 66a6 6 0 01-6 5H45a6 6 0 01-6-5z" fill="#f7fbff" stroke="#4f8fc6" stroke-width="3"/><path d="M37 58c8-4 16 4 23 0s15-4 23 0l-3 38a6 6 0 01-6 5H46a6 6 0 01-6-5z" fill="#7fb8e6"/><path d="M80 40h-8M81 52h-8M80 64h-8M79 76h-8" stroke="#4f8fc6" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    omosa: `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="#eef3e6"/><ellipse cx="60" cy="31" rx="34" ry="7" fill="#c7cdd0" stroke="#8e979b" stroke-width="2.5"/><rect x="56" y="34" width="8" height="10" fill="#8e979b"/><rect x="24" y="42" width="72" height="62" rx="14" fill="#f2b833" stroke="#c48a10" stroke-width="2.5"/><circle cx="60" cy="74" r="22" fill="#fbfbf7" stroke="#c48a10" stroke-width="2"/>${Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180; return `<line x1="${60 + 17 * Math.sin(a)}" y1="${74 - 17 * Math.cos(a)}" x2="${60 + 21 * Math.sin(a)}" y2="${74 - 21 * Math.cos(a)}" stroke="#5e6b66" stroke-width="2"/>`; }).join('')}<line x1="60" y1="74" x2="72" y2="62" stroke="#d9452f" stroke-width="3" stroke-linecap="round"/></svg>`,
    jikan: `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="#fff4dc"/><circle cx="60" cy="62" r="38" fill="#fbfbf7" stroke="#1f2b27" stroke-width="4"/>${Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180; return `<circle cx="${60 + 31 * Math.sin(a)}" cy="${62 - 31 * Math.cos(a)}" r="${i % 3 === 0 ? 3 : 2}" fill="#1f2b27"/>`; }).join('')}<line x1="60" y1="62" x2="60" y2="34" stroke="#3f6aa0" stroke-width="4.5" stroke-linecap="round"/><line x1="60" y1="62" x2="76" y2="70" stroke="#d9452f" stroke-width="6" stroke-linecap="round"/><circle cx="60" cy="62" r="4" fill="#1f2b27"/></svg>`,
    hirosa: `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="#f6eefb"/><g stroke="#cfc6dc" stroke-width="1.5">${Array.from({ length: 7 }, (_, i) => `<line x1="${24 + i * 12}" y1="24" x2="${24 + i * 12}" y2="96"/><line x1="24" y1="${24 + i * 12}" x2="96" y2="${24 + i * 12}"/>`).join('')}</g><rect x="24" y="36" width="48" height="36" fill="#9a77cf" opacity=".85"/><rect x="48" y="60" width="36" height="24" fill="#f2b833" opacity=".9"/></svg>`,
    katachi: `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="#e9f3ee"/><path d="M60 26l30 15v34L60 92 30 75V41z" fill="#8cc152" stroke="#2f6b57" stroke-width="2.5" stroke-linejoin="round"/><path d="M60 26l30 15-30 16-30-16z" fill="#b6dc8a" stroke="#2f6b57" stroke-width="2.5" stroke-linejoin="round"/><path d="M60 57v35" stroke="#2f6b57" stroke-width="2.5"/></svg>`
  }
};

/* ---------- 入口と単元（設計書 hakaru-design.md §0-1 と同じ並び） ---------- */
const AREAS = [
  { id: 'nagasa', name: 'ながさ' },
  { id: 'kasa', name: 'かさ・たいせき' },
  { id: 'omosa', name: 'おもさ' },
  { id: 'jikan', name: 'じかん' },
  { id: 'hirosa', name: 'ひろさ' },
  { id: 'katachi', name: 'かたち' }
];
const UNITS = [
  { id: 'n1', g: 1, areas: ['nagasa'], t: 'ながさくらべ', aim: 'はしを そろえて くらべる。テープに うつして くらべる。えんぴつ なんぼんぶん かで あらわす。' },
  { id: 'n2', g: 2, areas: ['nagasa'], t: 'ながさの たんい', sub: 'cm・mm', aim: 'だれが はかっても おなじ 1cm と 1mm。ものさしの 0に あわせて はかる。', play: 'ruler' },
  { id: 'n2m', g: 2, areas: ['nagasa'], t: 'ながい ものの ながさ', sub: 'm', aim: '1m は 100cm。りょうてを ひろげた ながさや きょうしつを はかる。' },
  { id: 'n3', g: 3, areas: ['nagasa'], t: 'ながい ながさ', sub: 'km・まきじゃく', aim: '1km は 1000m。みちのりと きょり。まきじゃくで まるい ものの まわりを はかる。' },
  { id: 'u3', g: 3, areas: ['nagasa', 'kasa', 'omosa'], t: 'たんいの しくみ', sub: 'k と m', aim: 'k が つくと 1000ばい、m が つくと 1000ぶんの1。ながさ・かさ・おもさで おなじ しくみ。', play: 'units' },
  { id: 'e5', g: 5, ahead: true, areas: ['nagasa'], t: 'えんしゅうと えんしゅうりつ', aim: 'えんを ころがして まわりの ながさを まっすぐに のばす。ちょっけいの 3.14ばい。' },
  { id: 'ej', g: 7, ahead: true, areas: ['nagasa', 'hirosa'], t: 'おうぎがたの こと めんせき', aim: 'ちゅうしんかくを うごかすと、こ の ながさと めんせきが かわる。' },
  { id: 'k1', g: 1, areas: ['kasa'], t: 'かさくらべ', aim: 'みずを うつしかえて くらべる。おなじ コップ なんばいぶん かで くらべる。', play: 'water' },
  { id: 'k2', g: 2, areas: ['kasa'], t: 'みずの かさの たんい', sub: 'L・dL・mL', aim: '1dLますで 10ぱい いれると 1L。めもりを よむ。', play: 'water' },
  { id: 'r5b', g: 5, ahead: true, areas: ['kasa', 'katachi'], owner: 'katachi', t: 'たいせき', sub: 'cm³・m³', aim: '1cm³の つみきで はこを うめる。1L は 1000cm³。' },
  { id: 'r6', g: 6, ahead: true, areas: ['kasa', 'katachi'], owner: 'katachi', t: 'かくちゅうと えんちゅうの たいせき', aim: 'そこめんを つみかさねる。' },
  { id: 'o3', g: 3, areas: ['omosa'], t: 'おもさ', sub: 'g・kg・t', aim: 'てんびんと 1えんだまで くらべる。はかりの めもりを よむ。かたちを かえても おもさは おなじ。', play: 'scale' },
  { id: 't1', g: 1, areas: ['jikan'], t: 'とけい', sub: 'なんじ・なんぷん', aim: 'ながい はりが ひとまわり すると、みじかい はりが つぎの かずへ。', play: 'clock' },
  { id: 't2', g: 2, areas: ['jikan'], t: 'じこくと じかん', aim: 'じこくは とけいの いち、じかんは あいだの ながさ。1にちは 24じかん。', play: 'clock' },
  { id: 't3', g: 3, areas: ['jikan'], t: 'じこくと じかんの もとめかた', sub: 'びょう', aim: 'ちょうどの じこくで くぎって かんがえる。1ぷんを めを つぶって あてる。' },
  { id: 's5', g: 5, ahead: true, areas: ['jikan'], t: 'たんいりょう あたりの おおきさ・はやさ', aim: 'じかんを そろえて くらべる。みちのりを そろえて くらべる。' },
  { id: 'h1', g: 1, areas: ['hirosa'], t: 'ひろさくらべ', aim: 'かさねて くらべる。おなじ おおきさの マスの いくつぶん。', play: 'area' },
  { id: 'h4', g: 4, ahead: true, areas: ['hirosa'], t: 'めんせき', sub: 'cm²・m²・a・ha', aim: '1cm²の タイルを しきつめる。まわりの ながさが おなじでも ひろさは かわる。' },
  { id: 'h5', g: 5, ahead: true, areas: ['hirosa'], t: 'さんかくけいや へいこうしへんけいの めんせき', aim: 'きって うごかして ながしかくに する。' },
  { id: 'h6', g: 6, ahead: true, areas: ['hirosa'], t: 'えんの めんせき・およその めんせき', aim: 'えんを こまかく きって ならべかえる。' },
  { id: 'a4', g: 4, ahead: true, areas: ['katachi'], t: 'かくの おおきさ', sub: 'ど・ぶんどき', aim: 'かくを まわる おおきさと して みる。ぶんどきの 0の せんを あわせる。' },
  { id: 'r1', g: 1, areas: ['katachi'], owner: 'katachi', t: 'かたちあそび', aim: 'はこ・つつ・ボールの かたち。' },
  { id: 'r2', g: 2, areas: ['katachi'], owner: 'katachi', t: 'はこの かたち', aim: 'めん・へん・ちょうてん。' },
  { id: 'r4', g: 4, ahead: true, areas: ['katachi'], owner: 'katachi', t: 'ちょくほうたいと りっぽうたい', aim: 'てんかいず 11しゅ・54しゅ。' },
  { id: 'r5a', g: 5, ahead: true, areas: ['katachi'], owner: 'katachi', t: 'かくちゅうと えんちゅう', aim: 'かくちゅうが そだつ。' },
  { id: 'rj', g: 7, ahead: true, areas: ['katachi'], owner: 'katachi', t: 'くうかんずけい', aim: 'せいためんたい 5しゅるい。' }
];
const gradeLabel = g => g === 7 ? 'ちゅう1' : g + 'ねん';

/* ---------- ホーム ---------- */
function renderHome() {
  const home = $('#home'); home.innerHTML = '';
  const inner = H('div', { class: 'home-in' });
  inner.appendChild(H('div', { class: 'home-top' }, [H('h1', { html: 'さんすう<small>みほん：はかる（ながさ・かさ・おもさ・じかん・ひろさ）</small>' })]));
  const doors = H('div', { class: 'doors' });
  for (const a of AREAS) {
    const us = UNITS.filter(u => u.areas.includes(a.id));
    const playable = us.filter(u => u.play).length;
    const btn = H('button', { class: 'door', onclick: () => openArea(a.id) }, [
      H('span', { html: ICON.door[a.id] }).firstChild,
      H('b', { text: a.name }),
      H('span', { class: 'n', text: us.length + ' たんげん' })
    ]);
    if (playable) btn.appendChild(H('span', { class: 'tag go', text: 'うごく ' + playable }));
    else if (a.id === 'katachi') btn.appendChild(H('span', { class: 'tag', text: 'べつの みほん' }));
    doors.appendChild(btn);
  }
  inner.appendChild(doors);
  home.appendChild(inner);
}
function show(view) {
  $('#home').hidden = view !== 'home'; $('#areaView').hidden = view !== 'area'; $('#play').hidden = view !== 'play';
}
function openArea(id) {
  const a = AREAS.find(x => x.id === id);
  const v = $('#areaView'); v.innerHTML = '';
  const inner = H('div', { class: 'area-in' });
  const back = H('button', { class: 'icon-btn', 'aria-label': 'もどる', onclick: goHome, html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>' });
  const ic = H('span', { html: ICON.door[id] }).firstChild; ic.classList.add('ic');
  inner.appendChild(H('div', { class: 'area-head' }, [back, ic, H('h2', { text: a.name })]));
  const us = UNITS.filter(u => u.areas.includes(id)).sort((x, y) => x.g - y.g);
  const grades = [...new Set(us.map(u => u.g))];
  for (const g of grades) {
    const list = H('div', { class: 'ulist' });
    for (const u of us.filter(x => x.g === g)) {
      const cls = 'ucard' + (u.play ? ' play' : '') + (u.owner === 'katachi' ? ' other' : '') + (u.ahead ? ' ahead' : '');
      const st = u.play ? H('span', { class: 'st', html: ICON.play + 'うごく' }) : H('span', { class: 'st', text: u.owner === 'katachi' ? 'かたちの みほん' : 'じゅんびちゅう' });
      list.appendChild(H('button', { class: cls, onclick: () => openUnit(u) }, [H('span', { class: 'ut', html: u.t + (u.sub ? `<small>${u.sub}</small>` : '') }), st]));
    }
    inner.appendChild(H('div', { class: 'grade-row' }, [H('span', { class: 'gl' + (us.find(x => x.g === g).ahead ? ' ahead' : ''), text: gradeLabel(g) }), list]));
  }
  v.appendChild(inner); show('area'); v.scrollTop = 0;
  App.area = id;
}
function openUnit(u) {
  if (u.play) { openScene(u.play, u); return; }
  openSheet((card, close) => {
    card.appendChild(H('div', { class: 'sheet-head' }, [H('h2', { text: gradeLabel(u.g) + '　' + u.t }), close]));
    card.appendChild(H('p', { class: 'aim', text: u.aim }));
    if (u.owner === 'katachi') card.appendChild(H('p', { class: 'meta', text: 'この たんげんは「かたち」の がわで つくっています。べつの みほん「はこの形と展開図」で うごいています。' }));
    else card.appendChild(H('p', { class: 'meta', text: 'つぎに つくる たんげんです。せっけいしょ（hakaru-design.md）に なかみが あります。' }));
    card.appendChild(H('div', { class: 'row' }, [H('button', { class: 'btn', onclick: closeSheet, text: 'わかった' })]));
  });
}
function goHome() { leaveScene(); show('home'); }

/* ---------- 場面の入れもの ---------- */
const SCENES = {};
const App = { area: null, scene: null, unit: null, tab: null, W: 0, H: 0 };
const TABS = [{ id: 'miru', label: 'みる', icon: ICON.eye }, { id: 'sawaru', label: 'さわる', icon: ICON.hand }, { id: 'tamesu', label: 'ためす', icon: ICON.try }];
function openScene(key, unit) {
  leaveScene();
  const sc = SCENES[key]; App.scene = sc; App.unit = unit;
  $('#unitTitle').textContent = sc.title; $('#gradeTag').textContent = sc.grade;
  show('play');
  const tabs = $('#tabs'); tabs.innerHTML = '';
  for (const t of TABS) tabs.appendChild(H('button', { class: 'tab', role: 'tab', 'aria-selected': 'false', 'data-tab': t.id, onclick: () => setTab(t.id) }, [H('span', { class: 'ic', html: t.icon }), H('span', { text: t.label })]));
  requestAnimationFrame(() => {
    measure(); const svg = $('#stage'); svg.innerHTML = '';
    sc.mount({ svg, W: App.W, H: App.H }, unit);
    setTab(sc.firstTab ? sc.firstTab(unit) : 'miru');
  });
}
function leaveScene() {
  cancelRuns(); TTS.stop(); SFX.pourStop(); HUD.hide(); closeSheet();
  if (App.scene && App.scene.unmount) App.scene.unmount();
  App.scene = null; $('#stage').innerHTML = ''; $('#panel').innerHTML = '';
}
function setTab(id) {
  cancelRuns(); TTS.stop(); SFX.pourStop(); HUD.hide();
  App.tab = id;
  document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === id ? 'true' : 'false'));
  $('#panel').innerHTML = '';
  App.scene.setTab(id, $('#panel'));
}
function measure() { const r = $('#stageWrap').getBoundingClientRect(); App.W = Math.max(200, Math.round(r.width)); App.H = Math.max(160, Math.round(r.height)); const svg = $('#stage'); svg.setAttribute('viewBox', `0 0 ${App.W} ${App.H}`); }
let resizeT = 0;
new ResizeObserver(() => {
  if (!App.scene) return;
  clearTimeout(resizeT);
  resizeT = setTimeout(() => { const pw = App.W, ph = App.H; measure(); if (Math.abs(pw - App.W) > 2 || Math.abs(ph - App.H) > 2) App.scene.layout(App.W, App.H); }, 60);
}).observe($('#stageWrap'));
$('#backBtn').addEventListener('click', () => { const a = App.area; leaveScene(); if (a) openArea(a); else goHome(); });
$('#homeBtn').addEventListener('click', goHome);
$('#ttsBtn').addEventListener('click', () => { TTS.on = !TTS.on; store.set('tts', TTS.on); $('#ttsBtn').setAttribute('aria-pressed', String(TTS.on)); if (!TTS.on) TTS.stop(); else TTS.speak(HUD.last); });
$('#ttsBtn').setAttribute('aria-pressed', String(TTS.on));

/* 場面の点の座標（SVGはステージのCSSピクセルと同じ単位） */
function ptr(e) { const r = $('#stage').getBoundingClientRect(); return { x: (e.clientX - r.left) * App.W / r.width, y: (e.clientY - r.top) * App.H / r.height }; }

/* ---------- 共通の部品 ---------- */
function seg(items, cur, onPick, o = {}) {
  const s = H('div', { class: 'seg', role: 'group', 'aria-label': o.label || '' });
  for (const it of items) {
    s.appendChild(H('button', { 'aria-pressed': String(it.id === cur), html: it.html || it.label, onclick: () => { s.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', 'false')); s.querySelector(`[data-id="${it.id}"]`).setAttribute('aria-pressed', 'true'); onPick(it.id); }, 'data-id': it.id }));
  }
  return s;
}
/* いくつでも同時に入る切りかえ（ひとつの棚に並べる） */
function multiSeg(items) {
  const s = H('div', { class: 'seg', role: 'group' });
  for (const it of items) {
    const b = H('button', { 'aria-pressed': String(!!it.on), text: it.label, onclick: () => { const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(v)); it.f(v); } });
    s.appendChild(b);
  }
  return s;
}
function toggleBtn(label, on, onChange) {
  const b = H('button', { class: 'btn sub small', 'aria-pressed': String(!!on), text: label, onclick: () => { const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(v)); onChange(v); } });
  return b;
}
function hanamaru(svg, x, y, r) {
  const g = S('g', { 'pointer-events': 'none' }, svg);
  const pts = []; const turns = 2.6, n = 90;
  for (let i = 0; i <= n; i++) { const t = i / n, a = t * turns * Math.PI * 2 - Math.PI / 2, rr = r * (0.35 + 0.65 * t); pts.push((x + rr * Math.cos(a)).toFixed(1) + ',' + (y + rr * Math.sin(a) * 0.92).toFixed(1)); }
  const p = S('polyline', { points: pts.join(' '), fill: 'none', stroke: css('--ok'), 'stroke-width': Math.max(5, r * .09), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .9 }, g);
  let L = 2000; try { L = p.getTotalLength(); } catch (e) {}
  p.setAttribute('stroke-dasharray', L); p.setAttribute('stroke-dashoffset', L);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; S('ellipse', { cx: x + Math.cos(a) * r * 1.08, cy: y + Math.sin(a) * r * 1.0, rx: r * .16, ry: r * .1, transform: `rotate(${a * 180 / Math.PI} ${x + Math.cos(a) * r * 1.08} ${y + Math.sin(a) * r})`, fill: css('--ok'), opacity: 0 }, g); }
  const id = RUN.id; const t0 = performance.now();
  const f = now => {
    if (!g.isConnected) return;
    const k = clamp((now - t0) / (650 * SPEED), 0, 1);
    p.setAttribute('stroke-dashoffset', L * (1 - E.out(k)));
    g.querySelectorAll('ellipse').forEach((el, i) => el.setAttribute('opacity', clamp(k * 3 - 1.6 - i * .1, 0, .85)));
    if (k < 1) requestAnimationFrame(f); else setTimeout(() => { if (g.isConnected) g.remove(); }, 900);
  };
  requestAnimationFrame(f);
}

/* ---------- ためす（問題の進め方は全場面で共通） ----------
   gen(level, i) は問題を返す：{ say, speech, show(), choices:[{label, ok}], set:true（合わせる問題）, check(), hint(stage), verify(ok)→Promise, at:{x,y,r} }
   まちがえたら1回めはヒントを1段すすめてもう一度。2回めは動きで確かめて次へ。 */
const LEVELS = [{ id: 'easy', label: 'やさしい' }, { id: 'normal', label: 'ふつう' }, { id: 'challenge', label: 'チャレンジ' }];
function makeQuiz(o) {
  const Q = { level: store.get('lv.' + o.key, 'normal'), i: 0, res: [], cur: null, hint: 0, miss: 0, busy: false };
  const n = o.n || 5;
  function start() { Q.i = 0; Q.res = []; next(); }
  function next() {
    if (Q.i >= n) { finish(); return; }
    Q.hint = 0; Q.miss = 0; Q.busy = false;
    Q.cur = o.gen(Q.level, Q.i);
    Q.cur.show && Q.cur.show();
    draw();
    HUD.say(Q.cur.say, { speech: Q.cur.speech });
  }
  function draw(after) {
    const p = o.panel(); p.innerHTML = '';
    const r1 = H('div', { class: 'row' });
    r1.appendChild(seg(LEVELS, Q.level, id => { Q.level = id; store.set('lv.' + o.key, id); cancelRuns(); start(); }, { label: 'むずかしさ' }));
    const dots = H('div', { class: 'dots', 'aria-label': `${n}もん中 ${Q.i + 1}もんめ` });
    for (let k = 0; k < n; k++) dots.appendChild(H('i', { class: Q.res[k] || (k === Q.i ? 'now' : '') }));
    r1.appendChild(dots);
    if (!after) {
      const hb = H('button', { class: 'hint-btn', onclick: () => useHint(true) }, [H('span', { html: ICON.bulb }).firstChild, 'ヒント']);
      for (let k = 0; k < 3; k++) hb.appendChild(H('i', { class: k < Q.hint ? 'used' : '' }));
      r1.appendChild(hb);
    }
    p.appendChild(r1);
    const r2 = H('div', { class: 'row' });
    if (after) {
      r2.appendChild(H('button', { class: 'btn', onclick: () => { Q.i++; next(); }, html: (Q.i + 1 >= n ? 'けっか' : 'つぎへ') + ICON.next }));
    } else if (Q.cur.set) {
      r2.appendChild(H('button', { class: 'btn big', onclick: () => answer(null), text: Q.cur.setLabel || 'できた' }));
    } else {
      for (const c of Q.cur.choices) {
        const b = H('button', { class: 'btn ans' + (c.dead ? ' ng' : ''), html: c.html || c.label, onclick: () => answer(c, b) });
        c.el = b; r2.appendChild(b);
      }
    }
    p.appendChild(r2);
  }
  async function useHint(byUser) {
    if (Q.busy || Q.hint >= 3) return;
    Q.hint++; draw();
    await run(async () => { await (Q.cur.hint && Q.cur.hint(Q.hint)); });
  }
  async function answer(c, b) {
    if (Q.busy) return;
    const ok = c ? c.ok : Q.cur.check();
    if (ok) {
      Q.busy = true;
      await run(async () => { if (Q.cur.verify) await Q.cur.verify(true); });
      SFX.good(); const at = Q.cur.at || { x: App.W / 2, y: App.H / 2, r: Math.min(App.W, App.H) * .18 };
      hanamaru($('#stage'), at.x, at.y, at.r);
      if (c && c.el) c.el.classList.add('right');
      Q.res[Q.i] = Q.hint || Q.miss ? 'okh' : 'ok';
      HUD.say(pick(['せいかい！', 'できたね！', 'ぴったり！']) + (Q.cur.after ? ' ' + Q.cur.after : ''));
      draw(true);
    } else {
      SFX.soft(); Q.miss++;
      if (c) c.dead = true;
      if (Q.miss < 2) {
        HUD.say('もう いちど。ヒントを みてね');
        if (Q.hint < 3) Q.hint++;
        draw();
        await run(async () => { await (Q.cur.hint && Q.cur.hint(Q.hint)); });
      } else {
        Q.busy = true;
        HUD.say('うごかして たしかめよう');
        await run(async () => { if (Q.cur.verify) await Q.cur.verify(false); });
        Q.res[Q.i] = 'ng';
        if (Q.cur.choices) Q.cur.choices.forEach(cc => { if (cc.ok && cc.el) cc.el.classList.add('right'); });
        draw(true);
      }
    }
  }
  function finish() {
    const p = o.panel(); p.innerHTML = '';
    const good = Q.res.filter(r => r === 'ok' || r === 'okh').length;
    const stars = good >= n ? 3 : good >= n - 1 ? 2 : good >= Math.ceil(n / 2) ? 1 : 0;
    const box = H('div', { class: 'result' }, [H('div', { class: 'score', text: `${n}もん中 ${good}もん できた` }), H('div', { class: 'stars', html: [0, 1, 2].map(k => ICON.star(k < stars)).join('') })]);
    p.appendChild(box);
    const lvIdx = LEVELS.findIndex(l => l.id === Q.level);
    const row = H('div', { class: 'row' }, [H('button', { class: 'btn sub', onclick: start, html: ICON.replay + 'もういちど' })]);
    if (lvIdx < 2) row.appendChild(H('button', { class: 'btn', onclick: () => { Q.level = LEVELS[lvIdx + 1].id; store.set('lv.' + o.key, Q.level); start(); }, html: LEVELS[lvIdx + 1].label + ' へ' + ICON.next }));
    p.appendChild(row);
    HUD.say(stars === 3 ? 'ぜんぶ できたね！' : 'よく がんばったね');
    o.onFinish && o.onFinish();
  }
  return { start, Q };
}
