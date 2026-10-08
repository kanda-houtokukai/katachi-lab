// つくる（中1）：正十二面体・正二十面体。「ひらく」を押すたびに違う展開図が生まれる（全域木を一様に選ぶ Wilson のアルゴリズム）。
// 見つけた種類を合同判定のキーで数え、「みつけた ○ / 43,380」を記録する。
import { S, THREE, tween, wait, alive, burst, fitBox, spinCamera, disposeObject } from '../stage/stage.js';
import { makeFoldNet, mountNet, centerBase, frameBox, frameFlat, foldTo, hop, disposeNet } from '../stage/foldnet.js';
import { randomLayout } from './_nets.js';
import { canonKey, keyHash } from '../engine/nets.js';
import { tok, faceColors } from '../core/theme.js';
import { on, $p, $$p } from './_common.js';

const NAMES = { dodeca: ['せいじゅうにめんたい', '<ruby>正十二面体<rt>せいじゅうにめんたい</rt></ruby>'], icosa: ['せいにじゅうめんたい', '<ruby>正二十面体<rt>せいにじゅうめんたい</rt></ruby>'] };
const mem = { s: 'dodeca' };
export function mount(ctx) {
  const { panel, sfx, toast, caption, ICON, ICONS_UI } = ctx;
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="せいためんたい">${Object.keys(NAMES).map(k => `<button type="button" data-s="${k}" aria-pressed="${k === mem.s}">${NAMES[k][1]}</button>`).join('')}</div></div>
    <div class="row"><button class="btn big" type="button" data-k="open">${ICONS_UI.netOpen}ひらく</button><button class="btn small sub" type="button" data-k="paper" hidden>${ICONS_UI.scissors}かみで つくる</button><span class="status" data-k="st"></span></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  let net = null, busy = false;
  const status = () => { q$('st').innerHTML = `みつけた <b>${ctx.zukanList(mem.s).length.toLocaleString('ja-JP')}</b> / 43,380`; };
  async function open() {
    if (busy) return; busy = true; const tag = S.token;
    if (net) { await foldTo(net, 1, 0.8); if (!alive(tag)) return; disposeNet(net); net = null; }
    const L = randomLayout(mem.s);
    net = mountNet(makeFoldNet(L, faceColors()), centerBase(L, -0.5)); net.setProgress(1);
    frameBox(net, 0.95, 0.6, 2.0);
    caption(`${NAMES[mem.s][1]}を ひらくと…`);
    await hop(net, 0.4); if (!alive(tag)) return;
    sfx.swish(1.6); frameFlat(net, 0.5, S.goal.theta, 1.05);
    await foldTo(net, 0, 2.4); if (!alive(tag)) return;
    const key = keyHash(canonKey(L.faces.map(f => f.pts)));
    const isNew = ctx.register(mem.s, key);
    sfx.good();
    toast(isNew ? ICON.HANAMARU : ICON.BOX, isNew ? 'あたらしい ひらきかた！ ずかんに とうろく' : 'まえに みつけた ひらきかたと おなじ', 2.8);
    ctx.log('random-net', { detail: { solid: mem.s, isNew } });
    if (isNew) ctx.done('random-net');
    q$('paper').hidden = false; status(); busy = false;
  }
  $$p(panel, '[data-s]').forEach(b => on(b, 'click', () => { sfx.tap(); if (mem.s === b.dataset.s) { toast('', `いまは「${NAMES[mem.s][0]}」だよ`, 1.6); return; } mem.s = b.dataset.s; ctx.restart(); }));
  on(q$('open'), 'click', () => { sfx.tap(); open(); });
  on(q$('paper'), 'click', () => {
    if (!net) return; sfx.tap();
    ctx.openPaper({ layout: net.L, colors: net.colors, title: `${NAMES[mem.s][0]}の てんかいず`, sub: 'ランダムに うまれた ひらきかた', unitText: 'へんの ながさ 1', foot: ctx.unit.plain, file: `tenkaizu-${mem.s}` });
    ctx.log('paper', { detail: { solid: mem.s, name: mem.s === 'dodeca' ? '正十二面体' : '正二十面体' } });
  });
  status();
  fitBox(new THREE.Box3(new THREE.Vector3(-1.5, 0, -2), new THREE.Vector3(1.5, 1.8, 1)), 0.95, 0.6, 1.2);
  caption('「ひらく」を おすたびに ちがう てんかいずが うまれるよ');
  return { dispose() {}, test: { auto() { if (busy) return { wait: 300 }; if (net) return { done: true }; return { click: 'data-k=open|' }; } } };
}
