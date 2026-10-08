// 利用時間と ひとやすみ。画面が隠れているとき・保護者画面を開いている間は時間を数えない。
// 時間は setInterval で数える（requestAnimationFrame は画面が隠れると止まるため、終了の判定に使わない）。
import { $ } from './text.js';
import { R, day, saveData } from './records.js';
import { sfx, say, hush } from './sound.js';
import { killTweens, newToken, speedNow } from '../stage/stage.js';

export const breakState = { next: 0, on: false };
let lastPoke = Date.now();
export function setupBreak(resume) {
  breakState.next = (R.settings.limitMin || 0) * 60;
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { lastPoke = Date.now(); }, true));
  setInterval(() => {
    if (document.hidden || Date.now() - lastPoke > 90000 || !$('parentSheet').hidden) return;
    const d = day(); d.sec = (d.sec || 0) + 1;
    if (d.sec % 10 === 0) saveData();
    if (R.settings.limitMin && !breakState.on && d.sec >= breakState.next) startBreak();
  }, 1000);
  $('bkGo').addEventListener('click', () => {
    sfx.tap(); $('breakSheet').hidden = true; breakState.on = false;
    breakState.next = day().sec + R.settings.limitMin * 60; resume();
  });
}
function startBreak() {
  breakState.on = true; hush(); newToken(); killTweens();
  $('breakSheet').hidden = false; $('bkGo').hidden = true;
  let n = 30; $('bkNum').textContent = n; say('ひと やすみ しよう。めを とじて、とおくを みよう');
  const iv = setInterval(() => { n--; $('bkNum').textContent = Math.max(0, n); if (n <= 0) { clearInterval(iv); $('bkGo').hidden = false; } }, 1000 * Math.min(1, speedNow()));
}
