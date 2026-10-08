// つくる「さいころを つくる」（4年）：展開図に目（1〜6）を書き入れる。向かい合う目の和が7になるように置けたかを、組み立てて確かめる。
import { S, THREE, tween, wait, alive, burst, fitBox, rayFrom, glow, spinCamera, objScreen } from '../stage/stage.js';
import { makeFoldNet, mountNet, centerBase, fitLayout, frameBox, frameFlat, foldTo, hop, netBox, settleHolder, disposeNet } from '../stage/foldnet.js';
import { cellsToLayout, NETS11, randomOrient } from '../engine/grid.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, hintDots } from './_common.js';

const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
const pipSvg = n => `<svg viewBox="-12 -12 24 24" width="30" height="30"><rect x="-11" y="-11" width="22" height="22" rx="5" fill="#fff" stroke="currentColor" stroke-width="1.4"/>${PIPS[n].map(([x, y]) => `<circle cx="${x * 5.5}" cy="${y * 5.5}" r="2.3" fill="${n === 1 ? '#d9452f' : '#1f2b27'}"/>`).join('')}</svg>`;
// 目の札（面に貼る）
function pipTexture(n) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect ? g.roundRect(6, 6, 116, 116, 22) : g.rect(6, 6, 116, 116); g.fill();
  PIPS[n].forEach(([x, y]) => { g.fillStyle = n === 1 ? '#d9452f' : '#1f2b27'; g.beginPath(); g.arc(64 + x * 30, 64 + y * 30, n === 1 ? 18 : 12, 0, Math.PI * 2); g.fill(); });
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}

export function mount(ctx) {
  const { panel, sfx, toast, caption, ICON, ICONS_UI } = ctx;
  let L = null, net = null, nums = [], sel = 1, mode = 'edit', hints = 0, pips = [];
  panel.innerHTML = `
    <div class="row" data-k="edit">
      <div class="tray">${[1, 2, 3, 4, 5, 6].map(n => `<button class="stick" type="button" data-n="${n}" aria-pressed="${n === 1}">${pipSvg(n)}<small>${n}</small></button>`).join('')}</div>
      <button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hd"></span></button>
      <button class="btn small sub" type="button" data-k="clear" hidden>${ICONS_UI.trash}けす</button>
      <button class="btn big" type="button" data-k="build" hidden>${ICONS_UI.build}くみたてる</button>
    </div>
    <div class="row" data-k="after" hidden>
      <button class="btn small sub" type="button" data-k="redo">かきなおす</button>
      <button class="btn small sub" type="button" data-k="other">${ICONS_UI.again}べつの てんかいず</button>
    </div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  function newNet() {
    if (net) { disposeNet(net); net = null; }
    L = fitLayout(cellsToLayout(randomOrient(NETS11[Math.floor(Math.random() * 11)])), ctx.portrait());
    net = mountNet(makeFoldNet(L, L.faces.map(() => tok('paper'))), centerBase(L, -0.5, true));
    net.setProgress(0); nums = Array(6).fill(0); pips = []; mode = 'edit'; hints = 0;
    S.allowRotate = false; frameFlat(net, 0.2, 0, 1.15);
    render();
    caption('目を えらんで、めんを タッチしよう。むかいあう 目を たすと 7 だよ');
  }
  function render() {
    pips.forEach(p => { p.parent && p.parent.remove(p); p.material.map.dispose(); p.material.dispose(); p.geometry.dispose(); }); pips = [];
    nums.forEach((n, i) => {
      if (!n) return;
      const f = L.faces[i], c = net.nodes[i].center;
      // 表（ひらいているとき見える）と裏（組み立てると外側になる）の両方に貼る
      for (const up of [true, false]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.78), new THREE.MeshStandardMaterial({ map: pipTexture(n), roughness: 0.8 }));
        m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2; m.position.set(c[0], up ? 0.032 : -0.004, c[1]); net.nodes[i].g.add(m); pips.push(m);
      }
    });
    $$p(panel, '[data-n]').forEach(b => { const n = +b.dataset.n; b.setAttribute('aria-pressed', String(n === sel)); b.disabled = nums.includes(n); });
    q$('hd').innerHTML = hintDots(hints);
    q$('clear').hidden = !nums.some(Boolean);
    q$('build').hidden = !nums.every(Boolean);
    q$('hint').hidden = nums.every(Boolean);
  }
  $$p(panel, '[data-n]').forEach(b => on(b, 'click', () => { if (mode !== 'edit') return; sfx.tap(); if (sel === +b.dataset.n) { toast('', `めんを タッチすると ${sel}の 目を かけるよ`, 2); return; } sel = +b.dataset.n; render(); }));
  on(q$('clear'), 'click', () => { sfx.off(); nums = Array(6).fill(0); sel = 1; render(); });
  on(q$('hint'), 'click', () => {
    if (mode !== 'edit') return;
    if (hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。じぶんで かんがえて みよう', 2.4); return; }
    sfx.tap(); hints++;
    if (hints === 1) toast(ICON.HINT, '1と6、2と5、3と4が むかいあうよ', 3);
    else if (hints === 2) {
      // むかいあう めんを おなじ いろに
      const pal = [tok('face-1'), tok('face-4'), tok('face-3')], done = new Set();
      net.analysis.opposite.forEach((j, i) => { if (done.has(i)) return; const c = pal[done.size / 2]; [i, j].forEach(k => { done.add(k); net.nodes[k].mat.color.set(c).convertSRGBToLinear(); }); });
      toast(ICON.HINT, 'おなじ いろの めんが むかいあうよ', 3);
    } else { const i = nums.findIndex(n => !n) >= 0 ? nums.findIndex(n => !n) : 0; const j = net.analysis.opposite[i]; nums[i] = nums[i] || 1; nums[j] = 7 - nums[i]; toast(ICON.HINT, `${nums[i]}の むかいに ${nums[j]}を おいたよ`, 2.6); }
    render();
  });
  on(q$('build'), 'click', async () => {
    if (mode !== 'edit' || !nums.every(Boolean)) return;
    sfx.tap(); mode = 'fold'; const tag = S.token;
    S.allowRotate = true;
    const b = netBox(net); b.max.y += 1; fitBox(b, 0.9, 0.5, 1.15);
    sfx.swish(1.4); await foldTo(net, 1, 1.9); if (!alive(tag)) return;
    frameBox(net, 0.95, S.goal.theta, 2.4);
    const opp = net.analysis.opposite, wrong = new Set();
    nums.forEach((n, i) => { if (n + nums[opp[i]] !== 7) wrong.add(i); });
    if (!wrong.size) { await hop(net, 0.4); if (!alive(tag)) return; sfx.good(); burst(net.home); toast(ICON.HANAMARU, 'さいころが できた！ むかいあう 目を たすと どれも 7', 3.4); ctx.done('dice'); }
    else { sfx.bad(); wrong.forEach(i => { glow(net.nodes[i].mesh, tok('glow-red'), 3, 0.7, 0.4); S.held.add(net.nodes[i].mat); }); spinCamera(3.2, Math.PI); toast(ICON.X, 'あかい めんは、むかいあう 目を たしても 7に ならないよ', 3.6); }
    ctx.log('dice', { correct: !wrong.size, hints, detail: { wrong: wrong.size / 2 } });
    mode = 'done'; q$('edit').hidden = true; q$('after').hidden = false;
  });
  on(q$('redo'), 'click', async () => {
    sfx.tap(); const tag = S.token; ctx.hideHud();
    await settleHolder(net); S.allowRotate = false; frameFlat(net, 0.2, 0, 1.15);
    sfx.swish(1); await foldTo(net, 0, 1.2); if (!alive(tag)) return;
    ctx.S && net.nodes.forEach(n => { n.mat.emissive.setRGB(0, 0, 0); n.mat.color.set(tok('paper')).convertSRGBToLinear(); });
    S.held.clear();
    mode = 'edit'; q$('edit').hidden = false; q$('after').hidden = true; render();
  });
  on(q$('other'), 'click', () => { sfx.tap(); ctx.hideHud(); q$('edit').hidden = false; q$('after').hidden = true; newNet(); });
  newNet();
  return {
    onTap(e) {
      if (mode !== 'edit') return;
      const h = rayFrom(e).intersectObjects(net.meshes(), false)[0]; if (!h) return;
      const i = h.object.userData.face;
      if (nums[i]) { sfx.off(); nums[i] = 0; }
      else { if (nums.includes(sel)) return; nums[i] = sel; sfx.pop(); const nx = [1, 2, 3, 4, 5, 6].find(n => !nums.includes(n)); if (nx) sel = nx; }
      render();
    },
    onResize() { if (mode === 'edit') frameFlat(net, 0.2, 0, 1.15); },
    dispose() {},
    test: { auto() {
        if (mode === 'done') return { done: true };
        if (mode !== 'edit') return { wait: 300 };
        if (nums.every(Boolean)) return { click: 'data-k=build|' };
        const opp = net.analysis.opposite, i = nums.findIndex(n => !n);
        const want = nums[opp[i]] ? 7 - nums[opp[i]] : [1, 2, 3, 4, 5, 6].find(n => !nums.includes(n) && !nums.includes(7 - n));
        if (sel !== want) return { click: `data-n=${want}|` };
        return { tap: this.facePoint(i) };
      }, state: () => ({ mode, nums: [...nums], opposite: net.analysis.opposite }), facePoint: i => objScreen(net.nodes[i].mesh, new THREE.Vector3(net.nodes[i].center[0], 0.03, net.nodes[i].center[1])) },
  };
}
