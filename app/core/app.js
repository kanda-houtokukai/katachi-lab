// 画面の司令塔：地図（ホーム）と単元画面。単元は app/units/*.json（部品の組み合わせ＋文言・問題・ヒント）で決まる。
// 部品（app/parts/*.js）は mount(ctx) で棚と 3D に出し、dispose で片づける。
import { $, esc, h } from './text.js';
import { R, initRecords, onChange, log as addLog, register, hasZukan, zukanList, touchUnit, prof, markStage } from './records.js';
import { sfx, say, hush, sound, setSound, decorateSay, speech } from './sound.js';
import { caption, toast, hideHud, setCounter, hideCounter, setGrade, setupHud, makeIcons, ICON, ICONS_UI, gradeLabel } from './hud.js';
import { S, initStage, measure, newToken, alive, killTweens, stopGlows, stopConfetti, fitBox, disposeObject, showMat, isPortrait, snapCamera, toScreen, objScreen, fitCheck } from '../stage/stage.js';
import { openZukanSheet, setupZukan } from './zukan.js';
import { openPaper, setupPaper } from './paper.js';
import { setupMission, missionDone, renderMissionBtns } from './mission.js';
import { setupParent } from './parent.js';
import { setupBreak, addUsage } from './breaktime.js';
import { openFlat, closeFlat, refitFlat, flatFit } from '../stage/flat.js';
import { loadBench } from './bench.js';
import { areaIcon } from './areas.js';
import { setupCalib, openCalib } from './calibui.js';
import { needsRecheck } from './calibrate.js';

export const A = { units: [], areas: [], area: null, byId: new Map(), unit: null, mode: null, lastMain: 'miru', act: {}, current: null, partCache: new Map() };
const TABS = () => [...document.querySelectorAll('.tab')];

export async function startApp() {
  initRecords();
  makeIcons(); setupHud();
  const okGL = initStage($('stage'));
  if (!okGL) $('app').insertAdjacentHTML('beforeend', '<div class="nogl">この たんまつでは 3Dを ひょうじ できませんでした。</div>');
  const idx = await (await fetch(new URL('../units/index.json', import.meta.url))).json();
  A.units = idx.units;
  const [ar] = await Promise.all([(await fetch(new URL('../units/areas.json', import.meta.url))).json(), loadBench()]);
  A.areas = ar.areas;
  const loaded = await Promise.all(A.units.filter(u => u.ready).map(async u => Object.assign({}, u, await (await fetch(new URL('../units/' + u.file, import.meta.url))).json())));
  loaded.forEach(u => A.byId.set(u.id, u));
  setupSoundBtn();
  setupZukan(ctxBase); setupPaper(); setupMission(A); setupParent(A); setupCalib(); setupBreak(() => { if (A.unit) setMode(A.lastMain); });
  $('homeBtn').addEventListener('click', () => { sfx.tap(); goHome(); });
  TABS().forEach(t => t.addEventListener('click', () => { if (!A.unit) return; sfx.tap(); setMode(t.dataset.mode); }));
  onChange(() => { renderMissionBtns(); if (!$('home').hidden) renderMap(); });
  renderMissionBtns();
  window.addEventListener('resize', onResize);
  if (window.ResizeObserver) new ResizeObserver(() => {
    measure();
    // 棚の高さが、最後に枠どりしたときと変わっていたら、いまの見え方のまま枠に収め直す
    const now = S.view.bottom + ',' + S.view.top + ',' + S.view.W + ',' + S.view.H;
    if (S.ok && S.lastFit && S.lastFit.view !== now) fitBox(S.lastFit.box, S.goal.phi, S.goal.theta, S.lastFit.pad, true);
    refitFlat();
  }).observe($('dock'));
  // 棚の中身が変わったら（問題の行が出る・消える）、2D の舞台を測り直す。ResizeObserver が来ない場合があるので、中身の変化でも確かめる
  let refitT = 0;
  const refitSoon = () => { clearTimeout(refitT); refitT = setTimeout(() => { measure(); refitFlat(); }, 30); };
  new MutationObserver(refitSoon).observe($('dock'), { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
  decorateSay();
  const q = new URLSearchParams(location.search);
  if (q.get('area') && A.areas.some(a => a.id === q.get('area'))) A.area = q.get('area');
  if (q.get('unit') && A.byId.has(q.get('unit'))) openUnit(q.get('unit'), q.get('mode') || 'miru');
  else goHome();
  checkCalib();
  window.__katachi = { A, S, R, speech, addUsage, setMode, openUnit, goHome, openArea, openCalib, toScreen, objScreen, fitCheck: () => flatFit() || fitCheck(), test: () => (A.current && A.current.test) || null };
}

/* ---------------- 地図 ---------------- */
export function goHome() {
  if (A.unit) teardown();
  A.unit = null;
  $('home').hidden = false; $('topBar').hidden = true; $('dock').hidden = true;
  hideHud(); renderMap(); renderMissionBtns(); measure();
  showMat(true);
  if (S.ok) { fitBox(new S.THREE.Box3(new S.THREE.Vector3(-6, 0, -5), new S.THREE.Vector3(6, 0.1, 4)), 0.7, 0.4, 1.0); snapCamera(); }
}
function unitProgress(u) {
  const st = (R.data.units[u.id] || {}).stages || {};
  const unit = A.byId.get(u.id);
  let found = 0, total = 0;
  // ランダムに生む正十二面体・正二十面体（counter）は「見つけた数」だけなので、合計には入れない。量の単元は物の一覧（list）も数える
  if (unit && unit.zukan) for (const z of unit.zukan) {
    if (z.total && z.kind === 'catalog') { total += z.total; found += Math.min(z.total, new Set([...(z.initial || []), ...zukanList(z.id)]).size); }
    else if (u.owner === 'hakaru' && z.kind === 'list' && z.items) { const ids = new Set(z.items.map(i => i.id)); total += ids.size; found += [...new Set(zukanList(z.id))].filter(i => ids.has(i)).length; }
  }
  return { st, found, total };
}
const unitsOf = areaId => A.units.filter(u => (u.areas || ['katachi']).includes(areaId));
// 入口を開く（null で1段目＝入口の一覧へ）
export function openArea(id) { A.area = id; renderMap(); $('home').scrollTop = 0; }
export function renderMap() {
  if (!A.area || !A.areas.some(a => a.id === A.area)) { A.area = null; renderDoors(); return; }
  const area = A.areas.find(a => a.id === A.area);
  const bands = [
    { key: 'main', label: 'いまの がくねん' },
    { key: 'ahead', label: 'ちょっと さき（4ねん〜ちゅうがく）' },
  ];
  const card = u => {
    const ready = !!u.ready, locked = u.band === 'ahead' && !R.settings.ahead;
    const { st, found, total } = unitProgress(u);
    const steps = ['miru', 'sawaru', 'tamesu', 'tsukuru'].map(s => `<i class="${st[s] ? 'on' : ''}"></i>`).join('');
    const meta = ready ? `<div class="meta"><span class="steps" aria-label="すすみぐあい">${steps}</span>${total ? `<span>ずかん ${found} / ${total}</span>` : ''}</div>` : '';
    const tag = !ready ? '<span class="soon-tag">じゅんび中</span>' : locked ? '<span class="soon-tag">おうちのひとが ひらけます</span>' : '';
    return `<button type="button" class="home-unit ${u.band}${ready && !locked ? '' : ' soon'}" data-unit="${u.id}">${tag}<span>${ICON.GRADE(u.grade)}</span><span class="t">${u.title}</span>${u.sub ? `<span class="sub">${u.sub}</span>` : ''}${meta}</button>`;
  };
  const us = unitsOf(area.id);
  $('map').innerHTML = `<div class="area-head"><button class="icon-btn" type="button" id="areaBack" aria-label="いりぐちに もどる"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>${areaIcon(area, 'ic')}<h2>${area.name}</h2></div>` + bands.map(b => {
    const bu = us.filter(u => u.band === b.key).sort((x, y) => x.grade - y.grade);
    if (!bu.length) return '';
    return `<div class="map-band"><h2>${b.label}</h2><div class="map-row">${bu.map(card).join('<span class="map-arrow" aria-hidden="true">→</span>')}</div></div>`;
  }).join('');
  $('areaBack').addEventListener('click', () => { sfx.tap(); openArea(null); });
  $('map').querySelectorAll('[data-unit]').forEach(b => b.addEventListener('click', () => {
    const u = A.units.find(x => x.id === b.dataset.unit);
    if (!u.ready) { sfx.off(); toast('', 'つぎに できるよ。もうすこし まってね', 2.4); return; }
    if (u.band === 'ahead' && !R.settings.ahead) { sfx.off(); toast('', 'おうちのひとに「おうちのひとへ」の せっていで ひらいて もらおう', 3); return; }
    sfx.tap(); openUnit(u.id);
  }));
}
// 1段目：入口（絵・名前・単元の数・うごく単元の数）
function renderDoors() {
  $('map').innerHTML = `<div class="doors">${A.areas.map(a => {
    const us = unitsOf(a.id), ready = us.filter(u => u.ready).length;
    return `<button type="button" class="door" data-area="${a.id}">${areaIcon(a)}<b>${a.name}</b><span class="n">${us.length} たんげん</span>${ready ? `<span class="tag">うごく ${ready}</span>` : ''}</button>`;
  }).join('')}</div>`;
  $('map').querySelectorAll('[data-area]').forEach(b => b.addEventListener('click', () => { sfx.tap(); openArea(b.dataset.area); }));
}

/* ---------------- 単元画面 ---------------- */
export function openUnit(id, mode = 'miru', opts = {}) {
  const unit = A.byId.get(id); if (!unit) return;
  if (A.unit && A.unit.id !== id) teardown();
  A.unit = unit; touchUnit(id);
  // 地図に戻ったとき、その単元の入口を開く
  if (!A.area || !(unit.areas || ['katachi']).includes(A.area)) A.area = (unit.areas || ['katachi'])[0];
  $('home').hidden = true; $('topBar').hidden = false; $('dock').hidden = false;
  $('unitTitle').innerHTML = unit.title;
  showMat(true);
  measure();
  setMode(mode, opts);
}
function teardown() { newToken(); clearStage(); hideHud(); A.mode = null; }

export function clearStage() {
  stopGlows(); killTweens(); hush(); stopConfetti();
  if (A.current) { try { A.current.dispose && A.current.dispose(); } catch (e) { console.error(e); } A.current = null; }
  closeFlat();
  if (S.ok) {
    for (const o of [...S.stage.children]) { S.stage.remove(o); disposeObject(o); }
    for (const o of [...S.ghosts.children]) { S.ghosts.remove(o); disposeObject(o); }
    showMat(true);
  }
  S.onTap = null; S.onUserTouch = null; S.onDrag = null; S.allowRotate = true;
}

const STAGES = ['miru', 'sawaru', 'tamesu', 'tsukuru'];
export async function setMode(m, opts = {}) {
  const unit = A.unit; if (!unit) return;
  if (m === 'zukan') { openZukanSheet(unit, opts.coll); return; }
  const tag = newToken(); hideHud(); clearStage();
  A.mode = m; A.lastMain = m;
  TABS().forEach(t => t.setAttribute('aria-selected', String(t.dataset.mode === m)));
  const acts = unit.tabs[m] || [];
  let ai = opts.act != null ? opts.act : (A.act[unit.id + ':' + m] || 0);
  if (ai >= acts.length) ai = 0;
  A.act[unit.id + ':' + m] = ai;
  renderActSeg(acts, ai, m);
  const act = acts[ai];
  const panel = $('panel'); panel.innerHTML = '';
  setGrade(act && act.grade ? act.grade : unit.grade);
  measure();
  if (!act) return;
  const mod = await loadPart(act.part);
  if (!alive(tag)) return;
  const ctx = makeCtx(unit, act, Object.assign({}, act.opts || {}, opts.params || {}), panel, m, ai);
  try { A.current = mod.mount(ctx) || {}; } catch (e) { console.error(e); toast(ICON.X, 'うまく ひらけませんでした', 2.4); A.current = {}; }
  S.onTap = e => A.current && A.current.onTap && A.current.onTap(e);
  decorateSay(panel);
  measure(); refitFlat();
}
function renderActSeg(acts, ai, m) {
  const row = $('actRow'), seg = $('actSeg');
  row.hidden = acts.length < 2;
  seg.innerHTML = acts.map((a, i) => `<button type="button" data-act="${i}" aria-pressed="${i === ai}">${a.label}${a.grade && a.grade !== A.unit.grade ? ` <span class="g">${gradeLabel(a.grade)}</span>` : ''}</button>`).join('');
  seg.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => { if (+b.dataset.act === ai) { sfx.tap(); toast('', `いまは「${b.textContent.trim()}」だよ`, 1.6); return; } sfx.tap(); setMode(m, { act: +b.dataset.act }); }));
}
async function loadPart(name) {
  if (!A.partCache.has(name)) A.partCache.set(name, import(`../parts/${name}.js`));
  return A.partCache.get(name);
}

// 部品に渡す道具一式
function ctxBase() { return { S, sfx, say, caption, toast, hideHud, setCounter, hideCounter, setGrade, ICON, ICONS_UI, R, openFlat, openCalib }; }
function makeCtx(unit, act, opts, panel, mode, actIndex) {
  return Object.assign(ctxBase(), {
    unit, act, opts, panel, mode, actIndex,
    restart: (params = {}) => setMode(mode, { act: actIndex, params }),
    log: (kind, info = {}) => addLog(unit.id, unit.id + '.' + kind, info, STAGES.includes(mode) ? mode : null),
    stageDone: () => { markStage(unit.id, mode); },
    register: (coll, id) => register(coll, id),
    hasZukan, zukanList,
    done: key => missionDone(key, unit.id),
    openPaper, openZukan: coll => openZukanSheet(unit, coll),
    go: (m, o = {}) => setMode(m, o),
    level: () => R.settings.startLevel,
    portrait: isPortrait,
    alive: t => alive(t),
    token: () => S.token,
    decorate: () => decorateSay(panel),
  });
}

// 実寸を合わせたあとで画面が変わった（ブラウザの拡大・別の端末）→ 合わせ直しを一度だけ促す
function checkCalib() { if (needsRecheck()) setTimeout(() => toast('', 'がめんの おおきさが かわったよ。おうちのひとと「がめんの ながさ あわせ」を しなおそう', 4), 600); }
function onResize() {
  clearTimeout(onResize.t);
  onResize.t = setTimeout(() => { measure(); refitFlat(); checkCalib(); if (A.current && A.current.onResize) A.current.onResize(); else if (S.lastFit) fitBox(S.lastFit.box, S.goal.phi, S.goal.theta, S.lastFit.pad, true); }, 160);
}

function setupSoundBtn() {
  const b = $('soundBtn');
  const render = () => {
    b.setAttribute('aria-pressed', String(sound.on)); b.setAttribute('aria-label', sound.on ? 'おとを けす' : 'おとを だす');
    b.querySelector('.mute').style.display = sound.on ? 'none' : '';
    b.querySelector('.w1').style.display = sound.on ? '' : 'none'; b.querySelector('.w2').style.display = sound.on ? '' : 'none';
  };
  b.addEventListener('click', () => { setSound(!sound.on); render(); });
  render();
}
export { prof, h, esc };
