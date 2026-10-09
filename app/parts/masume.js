// masume（方眼・H1・H4・H5・H6）：マスを敷く・数える・じんとり・同じ広さの形・cm²タイル・切って動かす（等積変形）・円を切って並べ替える・方眼で数えて見積もる。
// opts.mode で場面を選ぶ。場面は量の段ごとのファイル（_masume-h1.js〜_masume-h6.js）に分けた（1つの部品の中の場面）。
// 図形側の部品（3D の net-build-grid など）は方眼の上の「広さ」を扱わないので、2D の部品として新設した。
import * as H1 from './_masume-h1.js';
import * as H4 from './_masume-h4.js';
import * as H5 from './_masume-h5.js';
import * as H6 from './_masume-h6.js';

const MODES = {
  miru: ctx => ({ h1: H1.miru, h4: H4.miru, h5: H5.miru, h6: H6.miru }[ctx.opts.script || 'h1'] || H1.miru)(ctx),
  perim: H1.perim, jintori: H1.jintori, shapes: H1.shapes,
  tile: H4.tile, zoom: H4.zoom, sameperim: H4.sameperim, lshape: H4.lshape, rects: H4.rects,
  para: H5.para, double: H5.double, rhom: H5.rhom, shear: H5.shear,
  circle: H6.circle, estimate: H6.estimate, approx: H6.approx,
};
export function mount(ctx) { return (MODES[ctx.opts.mode] || MODES.miru)(ctx); }
