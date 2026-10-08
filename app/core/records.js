// 学習記録（設計書 §4-2）。きょうだいごとに端末内へ保存し、外部へは送らない。
// 記録の形は全単元共通：{ t, unit, kind, correct, hints, level, detail }。将来の項目は null で予約する。
import { store } from './store.js';
import { today, addDays } from './dates.js';
import { avColors } from './theme.js';

export const SCHEMA = 1;
export const SETTINGS_DEF = { readAuto: true, limitMin: 0, startLevel: 'normal', motion: 'full', ahead: true };
const listeners = new Set();
export const onChange = fn => listeners.add(fn);
const emit = () => listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } });

export const R = {
  settings: Object.assign({}, SETTINGS_DEF, store.get('settings', {})),
  profiles: null,
  activeId: null,
  data: null,
};

export function blankData() {
  return { schema: SCHEMA, logs: [], zukan: {}, review: {}, days: {}, mission: null, units: {}, lastUnit: null, reserved: null };
}
export function loadData(id) {
  const d = Object.assign(blankData(), store.get('d-' + id, {}));
  if (!Array.isArray(d.logs)) d.logs = [];
  if (!d.zukan || Array.isArray(d.zukan)) d.zukan = {};
  if (!d.units) d.units = {};
  d.schema = SCHEMA;
  return d;
}
export function saveData() { if (R.data) store.set('d-' + R.activeId, R.data); }
export function saveSettings() { store.set('settings', R.settings); }
export function saveProfiles() { store.set('profiles', R.profiles); }

export function initRecords() {
  let profiles = store.get('profiles', null);
  if (!Array.isArray(profiles) || !profiles.length) {
    profiles = [{ id: 'p' + Date.now().toString(36), name: 'こども1', grade: 2, color: avColors()[0] }];
    store.set('profiles', profiles);
  }
  R.profiles = profiles;
  R.activeId = store.get('active', profiles[0].id);
  if (!profiles.find(p => p.id === R.activeId)) R.activeId = profiles[0].id;
  R.data = loadData(R.activeId);
}
export const prof = () => R.profiles.find(p => p.id === R.activeId);
export function switchProfile(id) {
  if (id === R.activeId) return;
  saveData(); R.activeId = id; store.set('active', id); R.data = loadData(id); newlyFound.clear(); emit();
}

export function day(k = today(), D = R.data) { if (!D.days[k]) D.days[k] = { sec: 0, act: 0 }; return D.days[k]; }

// 記録を1件足す。stage は「みる・さわる・ためす・つくる」のどれで取り組んだか（地図の進み具合に使う）
export function log(unit, kind, info = {}, stage = null) {
  const e = {
    t: Date.now(), unit, kind,
    correct: info.correct ?? null, hints: info.hints ?? null, level: info.level ?? null,
    detail: info.detail || {},
  };
  R.data.logs.push(e);
  if (R.data.logs.length > 1500) R.data.logs.splice(0, R.data.logs.length - 1500);
  day().act++;
  if (unit && stage) markStage(unit, stage);
  saveData(); emit();
  return e;
}
export function markStage(unit, stage) {
  const u = R.data.units[unit] || (R.data.units[unit] = { stages: {}, last: 0 });
  u.stages[stage] = true; u.last = Date.now();
}
export function touchUnit(unit) {
  const u = R.data.units[unit] || (R.data.units[unit] = { stages: {}, last: 0 });
  u.last = Date.now(); R.data.lastUnit = unit; saveData();
}

// ずかん：コレクションごとに見つけた番号（またはキー）を持つ
export const newlyFound = new Set();
export function zukanList(coll, D = R.data) { return D.zukan[coll] || []; }
export function hasZukan(coll, id) { return zukanList(coll).includes(id); }
export function register(coll, id) {
  if (id == null || id === 0 || id === -1 || hasZukan(coll, id)) return false;
  (R.data.zukan[coll] || (R.data.zukan[coll] = [])).push(id);
  newlyFound.add(coll + ':' + id);
  saveData(); emit();
  return true;
}

// 思い出し問題の間隔（正解で 1・3・7・14・30 日後、間違いで翌日）
export const INTERVALS = [0, 1, 3, 7, 14, 30];
export function answerReview(id, ok) {
  const t = today(), s = R.data.review[id] || { box: 0 };
  s.box = ok ? Math.min(INTERVALS.length - 1, s.box + 1) : 0;
  s.due = addDays(t, ok ? INTERVALS[s.box] : 1); s.last = t;
  R.data.review[id] = s; saveData();
  return s;
}

export function addProfile(name, grade) {
  const np = { id: 'p' + Date.now().toString(36), name, grade, color: avColors()[R.profiles.length % 4] };
  R.profiles.push(np); saveProfiles(); emit();
  return np;
}
export function replaceAll(j) {
  R.profiles = j.profiles; saveProfiles();
  R.profiles.forEach(p => store.set('d-' + p.id, j.data[p.id] || blankData()));
  if (j.settings) { R.settings = Object.assign({}, SETTINGS_DEF, j.settings); saveSettings(); }
  R.activeId = R.profiles[0].id; store.set('active', R.activeId); R.data = loadData(R.activeId); emit();
}
export function exportAll() {
  saveData();
  return { app: 'katachi-lab', v: SCHEMA, at: new Date().toISOString(), settings: R.settings, profiles: R.profiles, data: Object.fromEntries(R.profiles.map(p => [p.id, p.id === R.activeId ? R.data : loadData(p.id)])) };
}
export function clearProfile(pid) {
  if (pid === R.activeId) { R.data = blankData(); saveData(); } else store.set('d-' + pid, blankData());
  const p = R.profiles.find(x => x.id === pid);
  if (p && /見本/.test(p.name) && R.profiles.length > 1) {
    R.profiles = R.profiles.filter(x => x.id !== pid); saveProfiles(); store.del('d-' + pid);
    if (R.activeId === pid) { R.activeId = R.profiles[0].id; store.set('active', R.activeId); R.data = loadData(R.activeId); }
  }
  emit();
}
export function storeData(pid, D) { store.set('d-' + pid, D); if (pid === R.activeId) R.data = D; emit(); }
export const emitChange = emit;
