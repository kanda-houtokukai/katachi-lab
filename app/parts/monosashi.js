// monosashi（ものさし）：実寸の ものさし（cm・mm）と、1mものさし・まきじゃく（m・km の単元）。
// opts.mode で中身を読み分ける。cm・mm の実寸は _monosashi-cm.js、長い物と まきじゃくは _monosashi-m.js。
//   cm・mm：miru｜ruler｜zero｜estimate｜draw｜find10
//   m・まきじゃく：miru-m｜m1｜fold｜make1m｜maki
import { mountCm } from './_monosashi-cm.js';
import { mountM } from './_monosashi-m.js';

const M_MODES = ['miru-m', 'm1', 'fold', 'make1m', 'maki'];
export function mount(ctx) {
  return (M_MODES.includes(ctx.opts.mode) ? mountM : mountCm)(ctx);
}
