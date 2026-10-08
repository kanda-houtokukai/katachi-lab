// 部品で共通に使う小さな道具（棚の HTML、ヒントの点、問題の点、むずかしさの切りかえ）。
import { ICONS_UI } from '../core/hud.js';
import { tok, faceColors } from '../core/theme.js';
import { THREE } from '../stage/stage.js';

export const $p = (panel, sel) => panel.querySelector(sel);
export const $$p = (panel, sel) => [...panel.querySelectorAll(sel)];
export const on = (el, ev, fn) => { if (el) el.addEventListener(ev, fn); };

export function hintDots(used) { return [0, 1, 2].map(i => `<i class="${i < used ? 'used' : ''}"></i>`).join(''); }
export function quizDots(list, results, i) {
  return list.map((q, k) => { const r = results[k]; const c = r ? (r.correct ? (r.hints ? 'okh' : 'ok') : 'ng') : (k === i ? 'now' : ''); return `<i class="${c}"></i>`; }).join('');
}
export const LEVELS = [['easy', 'やさしい'], ['normal', 'ふつう'], ['challenge', 'チャレンジ']];
export function levelSeg(cur) { return `<div class="seg" role="group" aria-label="むずかしさ">${LEVELS.map(([k, l]) => `<button type="button" data-level="${k}" aria-pressed="${k === cur}">${l}</button>`).join('')}</div>`; }
export function sliderRow(id, { left = 'とじる', right = 'ひらく', leftIcon = ICONS_UI.boxClosed, rightIcon = ICONS_UI.netOpen, min = 0, max = 100, value = 50, label = '' } = {}) {
  return `<div class="fold-row"><label class="end" for="${id}">${leftIcon}${left}</label><input type="range" id="${id}" min="${min}" max="${max}" value="${value}" aria-label="${label}"><span class="end">${rightIcon}${right}</span></div>`;
}
export function setSlider(el, v) { el.value = v; el.style.setProperty('--v', ((v - el.min) / (el.max - el.min) * 100) + '%'); }
export function starsHTML(results, ICON) {
  return results.map(r => ICON.STAR(r.correct ? (r.hints ? '#f8d77a' : tok('yamabuki')) : tok('room'), r.correct ? '#c48a12' : tok('line'))).join('');
}
export const PAL = () => faceColors();
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
