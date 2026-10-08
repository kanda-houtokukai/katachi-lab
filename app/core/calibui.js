// がめんの ながさ あわせ（index.html の calibSheet）。1円玉またはカードを画面の形に当て、スライダーと±で合わせる。
import { $ } from './text.js';
import { sfx, hush } from './sound.js';
import { toast, hideHud, ICON } from './hud.js';
import { tok } from './theme.js';
import { bench } from './bench.js';
import { load, save, reset, ppm, calibrated, CSS_PX_PER_MM } from './calibrate.js';

const st = { mode: 'coin', v: 0, onDone: null };
const sheet = () => $('calibSheet');
const coinMM = () => (bench('coin1') || {}).len_mm || 20;
const cardMM = () => { const b = bench('card') || {}; return [b.len_mm || 85.6, b.len2_mm || 53.98]; };
function draw() {
  const k = st.v / 100, svg = $('cSvg');
  let w, h, inner;
  if (st.mode === 'coin') {
    const d = coinMM() * k; w = h = Math.ceil(d + 40);
    inner = `<circle cx="${w / 2}" cy="${h / 2}" r="${d / 2}" fill="none" stroke="${tok('ink')}" stroke-width="2"/><line x1="${w / 2 - d / 2}" y1="${h / 2}" x2="${w / 2 + d / 2}" y2="${h / 2}" stroke="${tok('sora')}" stroke-width="1.5" stroke-dasharray="4 4"/>`;
  } else {
    const [a, b] = cardMM(), cw = a * k, ch = b * k; w = Math.ceil(cw + 40); h = Math.ceil(ch + 40);
    inner = `<rect x="20" y="20" width="${cw}" height="${ch}" rx="${3.18 * k}" fill="none" stroke="${tok('ink')}" stroke-width="2"/>`;
  }
  svg.setAttribute('width', w); svg.setAttribute('height', h); svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.innerHTML = inner;
  $('cSlider').value = Math.round(st.v); $('cSlider').style.setProperty('--v', ((st.v - 200) / 600 * 100) + '%');
  $('cNote').innerHTML = st.mode === 'coin' ? '1えんだまを がめんの まるに あてて、ぴったり かさなる ように うごかしてね' : 'カードを がめんの しかくに あてて、ぴったり かさなる ように うごかしてね';
  const c = load();
  $('cState').textContent = calibrated() ? `あわせて あります（1mm＝${c.ppm.toFixed(2)}てん）` : 'まだ あわせて いません';
  document.querySelectorAll('[data-cmode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cmode === st.mode)));
}
export function openCalib(onDone) {
  sfx.tap(); hideHud(); hush();
  st.v = ppm() * 100; st.onDone = onDone || null;
  const c = load(); if (c && c.mode) st.mode = c.mode;
  draw(); sheet().hidden = false;
}
function close() { sheet().hidden = true; const f = st.onDone; st.onDone = null; f && f(); }
export function setupCalib() {
  $('cClose').addEventListener('click', () => { sfx.tap(); close(); });
  $('cSlider').addEventListener('input', e => { st.v = +e.target.value; draw(); });
  $('cMinus').addEventListener('click', () => { sfx.tap(); st.v = Math.max(200, st.v - 2); draw(); });
  $('cPlus').addEventListener('click', () => { sfx.tap(); st.v = Math.min(800, st.v + 2); draw(); });
  document.querySelectorAll('[data-cmode]').forEach(b => b.addEventListener('click', () => { sfx.tap(); if (st.mode === b.dataset.cmode) { toast('', `いまは「${b.textContent}」だよ`, 1.6); return; } st.mode = b.dataset.cmode; draw(); }));
  $('cSave').addEventListener('click', () => { save(st.v / 100, st.mode); sfx.good(); draw(); toast(ICON.HANAMARU, 'がめんの ながさを あわせたよ', 2.2); setTimeout(close, 700); });
  $('cReset').addEventListener('click', () => { sfx.tap(); reset(); st.v = CSS_PX_PER_MM * 100; draw(); toast('', 'はじめの おおきさに もどしたよ', 2); });
}
