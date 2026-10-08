// 字幕・お知らせ・数の表示（見本v2 と同じ見せ方）。指示は必要な瞬間だけ出して読み上げる。
import { $ } from './text.js';
import { say } from './sound.js';
import { tok } from './theme.js';

const captionEl = () => $('caption'), toastEl = () => $('toast'), counterEl = () => $('counter');
let captionTimer = 0, toastTimer = 0;

// sp：読み上げの文（画面の文と分けるとき。量の単元の「7じ 55ふん」→「7時55分」など）
export function caption(text, hold = 0, sp = null) {
  clearTimeout(captionTimer);
  const c = captionEl();
  if (!text) { c.classList.add('off'); return; }
  toastEl().hidden = true; counterEl().hidden = true;
  c.querySelector('.txt').innerHTML = text; c.classList.remove('off');
  c.dataset.sp = sp || '';
  say(sp || text);
  if (hold) captionTimer = setTimeout(() => c.classList.add('off'), hold * 1000);
}
export function toast(mark, html, hold = 2.6, sp = null) {
  clearTimeout(toastTimer);
  captionEl().classList.add('off'); counterEl().hidden = true;
  const t = toastEl();
  t.querySelector('.mk').innerHTML = mark || ''; t.querySelector('.txt').innerHTML = html; t.hidden = false;
  t.dataset.sp = sp || '';
  say(sp || html);
  if (hold) toastTimer = setTimeout(() => { t.hidden = true; }, hold * 1000);
}
export function hideHud() { clearTimeout(toastTimer); clearTimeout(captionTimer); toastEl().hidden = true; counterEl().hidden = true; captionEl().classList.add('off'); }
export function setCounter(lab, n, unit) {
  captionEl().classList.add('off'); toastEl().hidden = true;
  const c = counterEl();
  c.hidden = false; $('cLab').textContent = lab; $('cNum').textContent = n; $('cUnit').textContent = unit;
  c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
}
export function hideCounter() { counterEl().hidden = true; }
export function setGrade(g) {
  const el = $('gradeTag');
  el.textContent = gradeLabel(g); el.classList.toggle('ahead', g >= 4);
}
export const gradeLabel = g => (g >= 7 ? 'ちゅう1' : g + 'ねん');

export function setupHud() {
  $('caption').querySelector('.say').addEventListener('click', () => say($('caption').dataset.sp || $('caption').querySelector('.txt').innerHTML, true));
  $('toast').querySelector('.say').addEventListener('click', () => say($('toast').dataset.sp || $('toast').querySelector('.txt').innerHTML, true));
}

// しるし（はなまる・ばつ・箱・ヒント）
export const ICON = {};
export function makeIcons() {
  let d = '';
  for (let i = 0; i <= 120; i++) { const t = i / 120, a = t * Math.PI * 2 * 2.2 - 1.2, r = 3 + t * 10; d += (i ? 'L' : 'M') + (24 + Math.cos(a) * r).toFixed(2) + ' ' + (24 + Math.sin(a) * r).toFixed(2); }
  for (let i = 0; i <= 160; i++) { const t = i / 160, a = t * Math.PI * 2 + 0.6, r = 17 + 4.2 * Math.abs(Math.sin(t * Math.PI * 7)); d += 'L' + (24 + Math.cos(a) * r).toFixed(2) + ' ' + (24 + Math.sin(a) * r).toFixed(2); }
  ICON.HANAMARU = `<svg class="mark" viewBox="0 0 48 48"><path d="${d}" fill="none" stroke="${tok('ok')}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" from="1" to="0" dur="0.9s" fill="freeze"/></path></svg>`;
  ICON.X = `<svg class="mark" viewBox="0 0 48 48"><g fill="none" stroke="${tok('sora')}" stroke-width="3.4" stroke-linecap="round"><circle cx="24" cy="24" r="17" stroke-opacity=".25"/><path d="M17 17l14 14M31 17L17 31"/></g></svg>`;
  ICON.BOX = `<svg class="mark" viewBox="0 0 48 48"><g fill="none" stroke="${tok('mat-deep')}" stroke-width="3" stroke-linejoin="round"><path d="M10 17l14-7 14 7v15l-14 7-14-7z"/><path d="M10 17l14 7 14-7M24 24v15"/></g></svg>`;
  ICON.HINT = `<svg class="mark" viewBox="0 0 48 48"><g fill="none" stroke="${tok('hint')}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M24 8a11 11 0 0 0-6.5 19.8c1.4 1 2.5 2.6 2.5 4.2v1h8v-1c0-1.6 1.1-3.2 2.5-4.2A11 11 0 0 0 24 8z"/><path d="M20 38h8"/></g></svg>`;
  ICON.STAR = (fill, stroke) => `<svg viewBox="0 0 24 24"><path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6 6.6 19.5l1.1-6.1-4.5-4.2 6.1-.8z" fill="${fill}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
  ICON.GRADE = g => `<span class="grade${g >= 4 ? ' ahead' : ''}">${gradeLabel(g)}</span>`;
}
export const ICONS_UI = {
  again: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg>',
  boxClosed: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 11l10-5 10 5v11l-10 5-10-5z"/><path d="M6 11l10 5 10-5M16 16v11"/></svg>',
  netOpen: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="11" y="3" width="8" height="8"/><rect x="3" y="11" width="8" height="8"/><rect x="11" y="11" width="8" height="8"/><rect x="19" y="11" width="8" height="8"/><rect x="11" y="19" width="8" height="8"/></svg>',
  build: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v9"/></svg>',
  scissors: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="17" r="2.6"/><circle cx="6" cy="7" r="2.6"/><path d="M8.2 15.6L20 5M8.2 8.4L20 19"/></svg>',
  roll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15a8 8 0 0 1 15-4"/><path d="M19 5v6h-6"/></svg>',
  yes: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="4.5"><circle cx="20" cy="20" r="13"/></svg>',
  no: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"><path d="M10 10l20 20M30 10L10 30"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  turn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4.5h-4.5"/></svg>',
};
