// ずかん：単元ごとのコレクション（展開図カタログ・見つけた数だけ数えるもの・物の一覧）。
import { $, esc } from './text.js';
import { zukanList, newlyFound } from './records.js';
import { sfx, hush } from './sound.js';
import { hideHud, gradeLabel } from './hud.js';
import { loadCatalog } from '../engine/catalog.js';
import { polysSVG, figSVG } from './figs.js';
import { faceColors, tok } from './theme.js';

let getCtx = null, Z = { unit: null, coll: null };
const sheet = () => $('zukanSheet');
export function setupZukan(ctxFn) {
  getCtx = ctxFn;
  $('zClose').addEventListener('click', () => { sfx.tap(); closeZukan(); });
  sheet().addEventListener('click', e => { if (e.target === sheet()) closeZukan(); });
}
function closeZukan() {
  sheet().hidden = true;
  const A = window.__katachi && window.__katachi.A;
  if (A) document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.mode === A.lastMain)));
}

export async function openZukanSheet(unit, coll) {
  sfx.tap(); hideHud(); hush();
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.mode === 'zukan')));
  const list = unit.zukan || [];
  Z.unit = unit; Z.coll = coll && list.find(z => z.id === coll) ? coll : (list[0] && list[0].id);
  $('zGrade').textContent = gradeLabel(unit.grade); $('zGrade').classList.toggle('ahead', unit.grade >= 4);
  $('zTabsRow').hidden = list.length < 2;
  $('zTabs').innerHTML = list.map(z => `<button type="button" data-z="${z.id}" aria-pressed="${z.id === Z.coll}">${z.label}</button>`).join('');
  $('zTabs').querySelectorAll('[data-z]').forEach(b => b.addEventListener('click', () => { sfx.tap(); Z.coll = b.dataset.z; $('zTabs').querySelectorAll('[data-z]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.z === Z.coll))); renderBody(); }));
  sheet().hidden = false;
  await renderBody();
}

async function renderBody() {
  const unit = Z.unit, z = (unit.zukan || []).find(x => x.id === Z.coll);
  const body = $('zBody');
  if (!z) { body.innerHTML = '<p class="note">まだ ずかんは ありません</p>'; $('zCount').textContent = ''; $('zTitle').textContent = 'ずかん'; return; }
  $('zTitle').innerHTML = z.title || z.label;
  const found = new Set([...(z.initial || []), ...zukanList(z.id)]);
  const goBtn = `<div class="zmore-row"><button class="btn small" type="button" id="zGo">${z.goLabel || '「つくる」で さがそう'}</button></div>`;
  if (z.kind === 'catalog') {
    const cat = await loadCatalog(z.solid);
    if (Z.coll !== z.id) return;
    $('zCount').textContent = `${found.size} / ${cat.count}`;
    const pal = faceColors();
    const cards = [];
    for (let no = 1; no <= cat.count; no++) {
      const isNew = newlyFound.has(z.id + ':' + no);
      cards.push(found.has(no)
        ? `<button class="zcard${isNew ? ' new' : ''}" type="button" data-no="${no}" aria-label="No.${no}"><span class="no">No.${no}</span>${polysSVG(cat.polys(no), pal)}</button>`
        : `<div class="zcard none" aria-label="まだ みつけていない"><span class="no">No.${no}</span><span class="q2">？</span></div>`);
    }
    body.innerHTML = `<div class="zgrid">${cards.join('')}</div>${goBtn}`;
    body.querySelectorAll('[data-no]').forEach(b => b.addEventListener('click', () => {
      closeZukan(); sfx.tap();
      const p = z.play || { mode: 'sawaru', act: 0 };
      getCtx && window.__katachi.setMode(p.mode, { act: p.act, params: { solid: z.solid, no: +b.dataset.no, play: true } });
    }));
  } else if (z.kind === 'counter') {
    const n = zukanList(z.id).length;
    $('zCount').textContent = `${n} / ${Number(z.total).toLocaleString('ja-JP')}`;
    body.innerHTML = `<p class="note" style="font-size:16px">みつけた ひらきかた <b style="font-family:var(--font-display);font-size:26px;color:var(--mat-deep)">${n}</b> / ${Number(z.total).toLocaleString('ja-JP')}</p><p class="note">${z.note || ''}</p>${goBtn}`;
  } else {
    const items = z.items || [];
    $('zCount').textContent = `${items.filter(it => found.has(it.id)).length} / ${items.length}`;
    body.innerHTML = `<div class="zgrid">${items.map(it => found.has(it.id)
      ? `<div class="zcard${newlyFound.has(z.id + ':' + it.id) ? ' new' : ''}">${it.svg || (it.fig ? figSVG(it.fig) : '')}<span class="lbl">${it.label}</span></div>`
      : `<div class="zcard none"><span class="q2">？</span><span class="lbl" style="color:${tok('ink-soft')}">${it.hint || ''}</span></div>`).join('')}</div>${goBtn}`;
  }
  [...newlyFound].filter(k => k.startsWith(z.id + ':')).forEach(k => newlyFound.delete(k));
  const go = $('zGo');
  if (go) go.addEventListener('click', () => { closeZukan(); sfx.tap(); const g = z.go || { mode: 'tsukuru', act: 0 }; window.__katachi.setMode(g.mode, { act: g.act }); });
}
export { esc };
