// きょうの ミッション（設計書 §4-3）：①思い出し問題 ②取り組み中の単元の「ためす」1回 ③日がわりの「つくる」。
// 思い出し問題は全単元の期限が来たものから出す（正解で 1・3・7・14・30 日後、間違いで翌日）。
import { $, esc, shuffle } from './text.js';
import { R, prof, saveData, day, log, answerReview, INTERVALS, switchProfile, emitChange } from './records.js';
import { today, addDays } from './dates.js';
import { sfx, say, hush, SAY_ICON, speech } from './sound.js';
import { toast, hideHud, ICON } from './hud.js';
import { figSVG } from './figs.js';

let A = null;
const sheet = () => $('missionSheet');
const ICONS_M = {
  review: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/><path d="M12 8v4l3 2"/></svg>',
  tamesu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="7.5" cy="12" r="4.5"/><path d="M14.5 8l7 8M21.5 8l-7 8"/></svg>',
  make: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7.5" height="7.5"/><rect x="13" y="3.5" width="7.5" height="7.5" stroke-dasharray="2.4 2"/><rect x="3.5" y="13" width="7.5" height="7.5" stroke-dasharray="2.4 2"/></svg>',
  zukan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 6.5C10 5 7 4.5 3.5 5v13.5c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z"/></svg>',
};

export function setupMission(app) {
  A = app;
  $('missionBtn').addEventListener('click', openMission);
  $('homeMissionBtn').addEventListener('click', openMission);
  $('msClose').addEventListener('click', () => { sfx.tap(); sheet().hidden = true; hush(); });
  sheet().addEventListener('click', e => { if (e.target === sheet()) { sheet().hidden = true; hush(); } });
}

const readyUnits = () => [...A.byId.values()];
function currentUnitId() { return (A.unit && A.unit.id) || R.data.lastUnit || (readyUnits()[0] && readyUnits()[0].id); }
// 思い出し問題の候補：取り組んだ単元＋いまの単元
export function reviewPool() {
  const touched = new Set(Object.keys(R.data.units || {}));
  const cu = currentUnitId(); if (cu) touched.add(cu);
  const out = [];
  for (const u of readyUnits()) if (touched.has(u.id)) for (const r of u.review || []) out.push(Object.assign({ unit: u.id, key: u.id + ':' + r.id }, r));
  return out;
}
export function dueReviews() {
  const t = today();
  return reviewPool().filter(r => { const s = R.data.review[r.key]; return !s || s.due <= t; }).sort((a, b) => ((R.data.review[a.key] || {}).box || 0) - ((R.data.review[b.key] || {}).box || 0));
}

export function ensureMission() {
  const t = today();
  if (R.data.mission && R.data.mission.date === t && R.data.mission.v === 2) return R.data.mission;
  const uid = currentUnitId(), unit = A.byId.get(uid);
  const dueN = Math.max(1, Math.min(3, dueReviews().length || 2));
  const rot = (unit && unit.mission) || [];
  const dayIdx = Math.floor(Date.now() / 864e5);
  const m3 = rot.length ? rot[dayIdx % rot.length] : null;
  R.data.mission = { v: 2, date: t, done: false, tasks: [
    { key: 'review', goal: dueN, n: 0, label: `おもいだし ${dueN}もん`, icon: 'review' },
    { key: 'tamesu', unit: uid, goal: 1, n: 0, label: '「ためす」を 1かい', icon: 'tamesu' },
    ...(m3 ? [{ key: m3.key, unit: uid, goal: 1, n: 0, label: m3.label, icon: m3.icon || 'make', go: m3.go }] : []),
  ] };
  saveData();
  return R.data.mission;
}
export function missionDone(key, unitId) {
  const m = ensureMission(), t = m.tasks.find(x => x.key === key && (!x.unit || !unitId || x.unit === unitId));
  if (!t || t.n >= t.goal) return;
  t.n = Math.min(t.goal, t.n + 1);
  const finished = m.tasks.every(x => x.n >= x.goal);
  if (finished && !m.done) { m.done = true; day().done = true; setTimeout(() => { sfx.good(); toast(ICON.HANAMARU, 'きょうの ミッション ぜんぶ できた！', 3.2); }, 1600); }
  saveData(); renderMissionBtns(); emitChange();
}
export function renderMissionBtns() {
  if (!A) return;
  const m = ensureMission(), p = prof(), n = m.tasks.filter(x => x.n >= x.goal).length, all = m.tasks.length;
  for (const [btn, av, cnt] of [['missionBtn', 'mAv', 'mCount'], ['homeMissionBtn', 'hAv', 'hCount']]) {
    $(cnt).textContent = `${n}/${all}`; $(av).textContent = p.name.slice(0, 1); $(av).style.background = p.color;
    $(btn).classList.toggle('done', n === all);
  }
}

function openMission() {
  sfx.tap(); hideHud(); ensureMission();
  $('msWho').hidden = R.profiles.length < 2;
  openBody(); sheet().hidden = false;
}
function renderWho(el, onPick) {
  el.innerHTML = R.profiles.map(p => `<button type="button" data-pid="${p.id}" aria-pressed="${p.id === R.activeId}"><span class="av" style="background:${p.color}">${esc(p.name.slice(0, 1))}</span>${esc(p.name)}</button>`).join('');
  el.querySelectorAll('[data-pid]').forEach(b => b.addEventListener('click', () => onPick(b.dataset.pid)));
}
export { renderWho };
function openBody() {
  const m = ensureMission();
  renderWho($('msWho'), id => { sfx.tap(); switchProfile(id); renderMissionBtns(); openBody(); });
  const unitName = id => { const u = A.byId.get(id); return u ? u.plain || '' : ''; };
  const rows = m.tasks.map(t => {
    const done = t.n >= t.goal;
    const sub = done ? 'できた！' : `${t.n} / ${t.goal}${t.unit ? '　' + unitName(t.unit) : ''}`;
    return `<div class="mrow${done ? ' done' : ''}"><span class="mi">${ICONS_M[t.icon] || ICONS_M.make}</span><span class="ml">${t.label}<small>${esc(sub)}</small></span>${done ? ICON.HANAMARU.replace('class="mark"', 'class="mark" style="width:40px;height:40px"') : `<button class="btn small" type="button" data-go="${t.key}">やる</button>`}</div>`;
  }).join('');
  const t = today(), daysAll = Object.keys(R.data.days).filter(k => R.data.days[k].act > 0).length;
  let strip = '';
  for (let i = 13; i >= 0; i--) { const k = addDays(t, -i); strip += `<i class="${R.data.days[k] && R.data.days[k].act > 0 ? 'on' : ''}${i === 0 ? ' today' : ''}" title="${k}"></i>`; }
  $('msBody').innerHTML = `<div class="mlist">${rows}</div><div class="days-wrap"><div><div class="rmeta">がんばった 日（さいきん 14日）</div><div class="days">${strip}</div></div><div class="rmeta">ぜんぶで <b>${daysAll}</b> 日</div></div>`;
  $('msBody').querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
    sfx.tap(); const task = m.tasks.find(x => x.key === b.dataset.go);
    if (task.key === 'review') { startReview(); return; }
    sheet().hidden = true;
    const K = window.__katachi;
    if (task.key === 'tamesu') K.openUnit(task.unit, 'tamesu');
    else if (task.go) K.openUnit(task.unit, task.go.mode, { act: task.go.act });
  }));
}

let rv = null;
function startReview() {
  let items = dueReviews();
  const goal = ensureMission().tasks.find(t => t.key === 'review');
  const pool = reviewPool();
  if (items.length < goal.goal) items = items.concat(shuffle(pool.filter(r => !items.includes(r))));
  rv = { items: items.slice(0, Math.max(goal.goal - goal.n, 1)), i: 0 };
  if (!rv.items.length) { $('msBody').innerHTML = '<p class="note">まだ おもいだし もんだいは ありません</p>'; return; }
  showReview();
}
function showReview() {
  const r = rv.items[rv.i];
  $('msBody').innerHTML = `<div class="rcard"><div class="rmeta">おもいだし ${rv.i + 1} / ${rv.items.length}</div><div class="rq"><button class="say" type="button" id="rSay" aria-label="もんだいを きく">${SAY_ICON}</button><span>${r.q}</span></div><div class="rq-fig">${figSVG(r.fig)}</div><div class="rchoices">${r.ch.map((c, i) => `<button class="btn sub" type="button" data-ch="${i}">${c}</button>`).join('')}</div><div id="rFeed" class="rmeta" style="min-height:1.5em"></div></div>`;
  $('rSay').hidden = !speech.available;
  $('rSay').addEventListener('click', () => say(r.q, true));
  say(r.q);
  $('msBody').querySelectorAll('[data-ch]').forEach(b => b.addEventListener('click', () => answer(+b.dataset.ch)));
}
function answer(i) {
  const r = rv.items[rv.i], ok = i === r.a;
  const s = answerReview(r.key, ok);
  log(r.unit, 'review', { correct: ok, detail: { id: r.id } });
  missionDone('review');
  $('msBody').querySelectorAll('[data-ch]').forEach((b, k) => { b.disabled = true; if (k === r.a) b.classList.add('right'); });
  if (ok) { sfx.good(); $('rFeed').innerHTML = `せいかい！ つぎは ${INTERVALS[s.box]}日ごに また でるよ`; say('せいかい！'); }
  else { sfx.bad(); $('rFeed').innerHTML = `こたえは「${r.ch[r.a]}」。あした もういちど でるよ`; say(`こたえは ${r.ch[r.a]}`); }
  setTimeout(() => { if (sheet().hidden) return; rv.i++; if (rv.i < rv.items.length) showReview(); else openBody(); }, 1700);
}
