// さわる の道具（4年以降）：重なる辺・重なる頂点・平行と垂直・見取図（設計書 R4「さわる」）。
// fold-explore の上で動く。make(api) は { onTap, onFold, leave, reset, test } を返す。
import { S, THREE, tween, rayFrom, glow, stopGlows, col, plainMaterial, disposeObject, onFrame, objScreen, toScreen, fitBox } from '../stage/stage.js';
import { foldTo, frameBox, frameFlat, settleHolder, T } from '../stage/foldnet.js';
import { outerEdges, edgePairs, vertexGroups } from '../engine/fold.js';
import { tok, faceColors } from '../core/theme.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
// 面の上の点（平面座標）を、タッチした所から求める
function hitFace(net, e) {
  const hit = rayFrom(e).intersectObjects(net.meshes(), false)[0]; if (!hit) return null;
  const i = hit.object.userData.face, g = net.nodes[i].g;
  g.updateMatrixWorld(true);
  const local = hit.point.clone().applyMatrix4(new THREE.Matrix4().copy(g.matrixWorld).invert());
  return { face: i, p: [local.x, local.z], world: hit.point };
}
const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)); return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]); };
function rod(a, b, hex, r = 0.03, opts = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 10), plainMaterial(hex, Object.assign({ emissive: col(hex), emissiveIntensity: 0.35 }, opts)));
  m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}
function ball(p, hex, r = 0.08) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), plainMaterial(hex, { emissive: col(hex), emissiveIntensity: 0.4 })); m.position.copy(p); return m; }

function base(api) {
  const objs = [];
  const add = (parent, o) => { parent.add(o); objs.push(o); return o; };
  const clear = () => { objs.forEach(o => { o.parent && o.parent.remove(o); disposeObject(o); }); objs.length = 0; };
  return { objs, add, clear };
}

export const TOOLS = {
  opposite: { label: 'むかいあう めん', make: () => ({ leave() {} }) },

  // 重なる辺：外周の辺をタッチすると、組み立てたときにくっつく相手の辺が同じ色で光る
  edge: {
    label: 'かさなる へん',
    make(api) {
      const { ctx } = api, net = api.net, B = base(api), pal = faceColors();
      const outer = outerEdges(net.L), pairs = edgePairs(net.L, net.folded);
      let n = 0;
      // 外周の辺を白くうすく示す
      outer.forEach(e => B.add(net.nodes[e.face].g, rod(V3(e.a[0], T + 0.008, e.a[1]), V3(e.b[0], T + 0.008, e.b[1]), tok('glow-white'), 0.012, { transparent: true, opacity: 0.6 })));
      ctx.caption('へんを タッチしよう。くっつく へんが おなじ いろに なるよ');
      const t = {
        onTap(e) {
          const h = hitFace(api.net, e); if (!h) return;
          let best = null, bd = 0.28;
          for (const ed of outer) if (ed.face === h.face) { const d = segDist(h.p, ed.a, ed.b); if (d < bd) { bd = d; best = ed; } }
          if (!best) { ctx.toast('', 'そとがわの へんの ちかくを タッチしよう', 2); return; }
          const pr = pairs.find(p => p.some(x => x.face === best.face && x.k === best.k)); if (!pr) return;
          const hex = pal[n++ % pal.length];
          pr.forEach(x => B.add(net.nodes[x.face].g, rod(V3(x.a[0], T + 0.012, x.a[1]), V3(x.b[0], T + 0.012, x.b[1]), hex, 0.04)));
          ctx.sfx.pop(); ctx.toast('', 'この 2ほんが くっつくよ。スライダーで おって たしかめよう', 2.8);
          ctx.log('edge-match', { detail: { solid: api.cur().key, no: net.info.no } });
        },
        reset() {}, leave() { B.clear(); },
        test: { edgePoint: i => { const e = outer[i]; return objScreen(net.nodes[e.face].g, V3((e.a[0] + e.b[0]) / 2, T, (e.a[1] + e.b[1]) / 2)); }, n: () => outer.length },
      };
      return t;
    },
  },

  // 重なる頂点：頂点をタッチすると、同じ角に集まる頂点が光る
  vertex: {
    label: 'あつまる ちょうてん',
    make(api) {
      const { ctx } = api, net = api.net, B = base(api), pal = faceColors();
      const groups = vertexGroups(net.L, net.folded);
      let n = 0;
      ctx.caption('ちょうてんを タッチしよう。おなじ かどに あつまる ちょうてんが ひかるよ');
      const where = p => net.L.faces.findIndex(f => f.pts.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6));
      return {
        onTap(e) {
          const h = hitFace(api.net, e); if (!h) return;
          const f = net.L.faces[h.face];
          let best = null, bd = 0.3;
          for (const q of f.pts) { const d = Math.hypot(q[0] - h.p[0], q[1] - h.p[1]); if (d < bd) { bd = d; best = q; } }
          if (!best) { ctx.toast('', 'かどの ちかくを タッチしよう', 2); return; }
          const g = groups.find(G => G.some(q => Math.hypot(q[0] - best[0], q[1] - best[1]) < 1e-6));
          const hex = pal[n++ % pal.length];
          g.forEach(q => B.add(net.nodes[where(q)].g, ball(V3(q[0], T + 0.03, q[1]), hex)));
          ctx.sfx.pop(); ctx.toast('', `${g.length}つの ちょうてんが 1つの かどに あつまるよ`, 2.8);
          ctx.log('vertex-match', { detail: { solid: api.cur().key, n: g.length } });
        },
        reset() {}, leave() { B.clear(); },
        test: { vertexPoint: i => { const q = groups[i][0]; return objScreen(net.nodes[where(q)].g, V3(q[0], T, q[1])); }, n: () => groups.length },
      };
    },
  },

  // 平行と垂直：組み立てた箱で、面や辺をタッチする
  paraperp: {
    label: 'へいこう・すいちょく',
    make(api) {
      const { ctx } = api, net = api.net, B = base(api), sol = net.solid;
      const V = sol.verts.map(v => V3(...v));
      const tag = S.token;
      (async () => { await settleHolder(net); ctx.sfx.swish(0.9); const from = net.progress; await tween(1.0 * (1 - from) + 0.1, k => { const p = from + (1 - from) * k; net.setProgress(p); api.syncSlider(p); }); frameBox(net, 0.95, S.goal.theta, 2.0); })();
      ctx.caption('めんや へんを タッチしよう');
      const nrm = i => V3(...net.folded[i].inward);
      return {
        onTap(e) {
          if (net.progress < 0.99) { ctx.toast('', 'はこを とじてから さわろう', 2); return; }
          const h = hitFace(api.net, e); if (!h) return;
          B.clear(); stopGlows();
          const f = net.L.faces[h.face];
          // 辺の近く → 辺、そうでなければ面
          let ek = -1, bd = 0.13;
          f.pts.forEach((a, k) => { const d = segDist(h.p, a, f.pts[(k + 1) % f.pts.length]); if (d < bd) { bd = d; ek = k; } });
          if (ek >= 0) {
            const A = V3(...net.folded[h.face].pts[ek]), Bv = V3(...net.folded[h.face].pts[(ek + 1) % f.pts.length]);
            const dir = Bv.clone().sub(A).normalize();
            let par = 0, per = 0;
            for (const ed of sol.edges) {
              const a = V[ed.v[0]], b = V[ed.v[1]], d = b.clone().sub(a).normalize();
              const isSelf = (a.distanceTo(A) < 1e-3 && b.distanceTo(Bv) < 1e-3) || (a.distanceTo(Bv) < 1e-3 && b.distanceTo(A) < 1e-3);
              if (isSelf) { B.add(net.overlay, rod(a, b, tok('glow-white'), 0.045)); continue; }
              const touch = [a, b].some(p => p.distanceTo(A) < 1e-3 || p.distanceTo(Bv) < 1e-3);
              if (Math.abs(Math.abs(d.dot(dir)) - 1) < 1e-3) { B.add(net.overlay, rod(a, b, tok('flat-blue'), 0.04)); par++; }
              else if (touch && Math.abs(d.dot(dir)) < 1e-3) { B.add(net.overlay, rod(a, b, tok('curve-yellow'), 0.04)); per++; }
            }
            ctx.sfx.pop(); ctx.toast('', `あおは へいこうな へん（${par}ほん）、きいろは すいちょくな へん（${per}ほん）`, 3.4);
            ctx.log('para-perp', { detail: { what: 'edge', par, per } });
          } else {
            const n0 = nrm(h.face);
            glow(net.nodes[h.face].mesh, tok('glow-white'), 3, 0.6);
            let par = 0, per = 0;
            net.L.faces.forEach((g, j) => { if (j === h.face) return; const d = n0.dot(nrm(j)); if (Math.abs(Math.abs(d) - 1) < 1e-3) { glow(net.nodes[j].mesh, tok('flat-blue'), 3, 0.8, 0.45); S.held.add(net.nodes[j].mat); par++; } else if (Math.abs(d) < 1e-3) { glow(net.nodes[j].mesh, tok('curve-yellow'), 3, 0.8, 0.45); S.held.add(net.nodes[j].mat); per++; } });
            ctx.sfx.pop(); ctx.toast('', `あおは へいこうな めん（${par}まい）、きいろは すいちょくな めん（${per}まい）`, 3.4);
            ctx.log('para-perp', { detail: { what: 'face', par, per } });
          }
        },
        onFold() { B.clear(); stopGlows(); },
        reset() { B.clear(); }, leave() { B.clear(); stopGlows(); },
        test: { ready: () => net.progress > 0.99 && S.idle, facePoint: i => objScreen(net.nodes[i].mesh, V3(net.nodes[i].center[0], 0.03, net.nodes[i].center[1])), edgePoint: (i, k) => { const f = net.L.faces[i], a = f.pts[k], b = f.pts[(k + 1) % f.pts.length], c = net.nodes[i].center; return objScreen(net.nodes[i].mesh, V3(a[0] * 0.47 + b[0] * 0.47 + c[0] * 0.06, 0.03, a[1] * 0.47 + b[1] * 0.47 + c[1] * 0.06)); } },
      };
    },
  },

  // 見取図：箱を回すと、見えない辺が点線になる
  sketch: {
    label: 'みとりず',
    make(api) {
      const { ctx } = api, net = api.net, B = base(api), sol = net.solid;
      const V = sol.verts.map(v => V3(...v));
      const ink = tok('ink');
      net.nodes.forEach(n => { n.mat.transparent = true; n.mat.opacity = 0.55; n.mat.depthWrite = false; n.mat.needsUpdate = true; });
      const edges = sol.edges.map(ed => {
        const a = V[ed.v[0]], b = V[ed.v[1]];
        const solid = B.add(net.overlay, rod(a, b, ink, 0.022, { depthTest: false, emissiveIntensity: 0 }));
        solid.renderOrder = 20;
        const dashed = new THREE.Group(); const L = a.distanceTo(b), n = Math.max(3, Math.round(L / 0.16));
        for (let k = 0; k < n; k++) { if (k % 2) continue; const p = a.clone().lerp(b, k / n), q = a.clone().lerp(b, Math.min(1, (k + 1) / n)); const m = rod(p, q, ink, 0.02, { depthTest: false, emissiveIntensity: 0 }); m.renderOrder = 20; dashed.add(m); }
        B.add(net.overlay, dashed);
        return { ed, solid, dashed };
      });
      const tag = S.token;
      (async () => { await settleHolder(net); const from = net.progress; await tween(1.0 * (1 - from) + 0.1, k => { const p = from + (1 - from) * k; net.setProgress(p); api.syncSlider(p); }); frameBox(net, 0.95, S.goal.theta, 2.0); })();
      ctx.caption('ゆびで まわして みよう。みえない へんは てんせんに なるよ');
      const front = fi => { const f = net.folded[fi]; const c = V3(...f.center), outward = V3(...f.inward).negate(); net.overlay.updateMatrixWorld(true); const cw = c.clone().applyMatrix4(net.overlay.matrixWorld), nw = outward.clone().transformDirection(net.overlay.matrixWorld); return nw.dot(S.camera.position.clone().sub(cw)) > 1e-3; };
      let shown = false;
      const off = onFrame(() => {
        const vis = net.progress > 0.99; if (vis && !shown) ctx.log('sketch-look', { detail: { solid: api.cur().key } }); shown = vis;
        edges.forEach(x => { const seen = x.ed.f.some(front); x.solid.visible = vis && seen; x.dashed.visible = vis && !seen; });
      });
      return {
        onTap() { ctx.toast('', 'ゆびで まわすと、てんせんの へんが かわるよ', 2.4); },
        onFold() {}, reset() {},
        leave() { off(); B.clear(); net.nodes.forEach(n => { n.mat.transparent = false; n.mat.opacity = 1; n.mat.depthWrite = true; n.mat.needsUpdate = true; }); },
        test: { hidden: () => edges.filter(x => x.dashed.visible).length },
      };
    },
  },
};
