// みる（2年「はこの形」）：箱が落ちてきて回り、ひらいて面に番号がつき、また閉じる（見本v2 runMiru）。
import { S, tween, wait, alive, easeOutBounce, glow, spinCamera, snapCamera } from '../stage/stage.js';
import { makeFoldNet, mountNet, centerBase, fitLayout, frameBox, frameFlat, foldTo, hop } from '../stage/foldnet.js';
import { cellsToLayout, NETS11 } from '../engine/grid.js';
import { boxCrossLayout } from './_nets.js';
import { tok } from '../core/theme.js';
import { PAL, on } from './_common.js';

let netIndex = 4;
export function mount(ctx) {
  const { panel, sfx, caption, opts } = ctx;
  panel.innerHTML = `<button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again}べつの はこで みる</button>`;
  on(panel.querySelector('[data-k="again"]'), 'click', () => { sfx.tap(); netIndex = (netIndex + 1) % 11; ctx.restart(); });
  const tag = S.token;
  run(tag);
  async function run(tag) {
    const L = fitLayout(opts.box ? boxCrossLayout(...opts.box) : cellsToLayout(NETS11[netIndex]), ctx.portrait());
    const net = mountNet(makeFoldNet(L, PAL()), centerBase(L, -0.5, !opts.box));
    net.setProgress(1);
    const drop = 3.2;
    net.holder.position.y = net.home.y + drop;
    frameBox(net, 1.0, 0.62, 1.9);
    S.rig.theta = S.goal.theta - 0.5; S.rig.radius = S.goal.radius * 1.25; S.rig.phi = S.goal.phi; S.rig.target.copy(S.goal.target);
    if (!(await wait(0.25))) return;
    caption('はこを よく みてね');
    await tween(0.75, k => { net.holder.position.y = net.home.y + drop * (1 - easeOutBounce(k)); }); if (!alive(tag)) return;
    sfx.land();
    await tween(0.2, k => { const s = Math.sin(k * Math.PI) * 0.08; net.holder.scale.set(1 + s, 1 - s, 1 + s); });
    await spinCamera(2.0, Math.PI * 0.9); if (!alive(tag)) return;
    caption('ひらいて みよう');
    if (!(await wait(0.5))) return;
    sfx.swish(1.4); frameFlat(net, 0.38, S.goal.theta);
    await foldTo(net, 0, 2.4); if (!alive(tag)) return;
    caption(`${L.faces.length}まいの めんが つながって いるね`);
    const order = [...L.faces.keys()].sort((a, b) => L.depth[a] - L.depth[b]);
    for (let k = 0; k < order.length; k++) {
      net.addBadge(order[k], String(k + 1), tok('ink'), '#ffffff', 0.34);
      glow(net.nodes[order[k]].mesh, tok('glow-white'), 1, 0.5); sfx.tick(k);
      if (!(await wait(0.42))) return;
    }
    if (!(await wait(1.2))) return;
    net.clearBadges();
    caption('とじると もとの はこに もどるよ');
    frameBox(net, 0.95, S.goal.theta + 0.4, 1.7); sfx.swish(1.2);
    await foldTo(net, 1, 2.2); if (!alive(tag)) return;
    await hop(net, 0.4); if (!alive(tag)) return;
    sfx.good(); ctx.log('miru', { detail: { net: netIndex + 1 } });
    caption('つぎは「さわる」で うごかして みよう', 4);
  }
  return { dispose() {} };
}
export { snapCamera };
