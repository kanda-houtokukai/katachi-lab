// 入口。service worker を登録して（オフラインで動くように）、地図を出す。
import { startApp } from './core/app.js';

startApp().catch(e => {
  console.error(e);
  document.getElementById('app').insertAdjacentHTML('beforeend', '<div class="nogl">よみこみに しっぱいしました。<br>ページを ひらきなおしてください。</div>');
});
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !new URLSearchParams(location.search).has('nosw')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
