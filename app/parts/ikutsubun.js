// ikutsubun（量の部品の入口）。opts.mode で量ごとの中身（app/parts/_ikutsubun-*.js）を読み分ける。
// 量ごとに別のファイルにしているのは、長さ・かさ・重さ・広さで絵と動きがまったく違うため（設計書 §1 の「モードを持つ」）。
import { S } from '../stage/stage.js';

const MODS = {
  nagasa: () => import('./_ikutsubun-nagasa.js'),
  kasa: () => import('./_ikutsubun-kasa.js'),
  omosa: () => import('./_ikutsubun-omosa.js'),
  hirosa: () => import('./_ikutsubun-hirosa.js'),
};
export function mount(ctx) {
  const qty = ctx.opts.qty || 'nagasa';
  const api = {
    inner: null,
    dispose() { api.inner && api.inner.dispose && api.inner.dispose(); },
    onResize() { api.inner && api.inner.onResize && api.inner.onResize(); },
    test: {
      state: () => (api.inner && api.inner.test && api.inner.test.state ? api.inner.test.state() : { phase: 'load' }),
      auto: () => (api.inner && api.inner.test && api.inner.test.auto ? api.inner.test.auto() : { wait: 200 }),
    },
  };
  const tag = S.token;
  (MODS[qty] || MODS.nagasa)().then(m => { if (S.token !== tag) return; api.inner = m.mount(ctx) || {}; ctx.decorate && ctx.decorate(); }).catch(e => { console.error(e); ctx.toast('', 'うまく ひらけませんでした', 2.4); });
  return api;
}
