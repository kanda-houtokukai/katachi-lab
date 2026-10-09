// おうちのひとへ（設計書 §4-4・§4-5）。家のアイコンを2秒長押しで開く。
// 取り組んだ日・時間・ずかん・思い出しの正答率、つまずきの見立て、ほめどころ、学校の学習との対応表、最近の記録、設定。
// 文面は下書き（reviewed:false）。正式公開の前にユーザーが教科書と照らして確認する。
import { $, esc } from './text.js';
import { R, prof, loadData, saveSettings, addProfile, exportAll, replaceAll, clearProfile, storeData, day, blankData, saveData, emitChange } from './records.js';
import { today, addDays, fmtTime, dayKey } from './dates.js';
import { sfx, hush, speech } from './sound.js';
import { hideHud, toast } from './hud.js';
import { evaluate, fill, labelOf, estSeries, QTY } from './rules.js';
import { tok } from './theme.js';
import { openCalib } from './calibui.js';
import { calibrated } from './calibrate.js';
import { renderWho, renderMissionBtns } from './mission.js';
import { breakState } from './breaktime.js';
import { avColors } from './theme.js';

let A = null, prView = null;
const sheet = () => $('parentSheet');
export const parentOpen = () => !sheet().hidden;

export function setupParent(app) {
  A = app;
  for (const id of ['parentBtn', 'homeParentBtn']) {
    const btn = $(id);
    let timer = 0, opened = false;
    btn.addEventListener('pointerdown', () => { opened = false; btn.classList.add('holding'); timer = setTimeout(() => { opened = true; btn.classList.remove('holding'); openParent(); }, 2000); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, () => { clearTimeout(timer); btn.classList.remove('holding'); }));
    btn.addEventListener('click', () => { if (!opened) { sfx.tap(); toast('', 'おうちのひとは 2びょう ながおし してね', 2.2); } });
    btn.addEventListener('keydown', e => { if (e.key === 'Enter' && e.shiftKey) openParent(); });
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }
  $('prClose').addEventListener('click', () => { sfx.tap(); sheet().hidden = true; renderMissionBtns(); emitChange(); });
}
export function openParent() { sfx.pop(); hideHud(); hush(); prView = R.activeId; renderParent(); sheet().hidden = false; }

const units = () => [...A.byId.values()];
const fmtMin = s => Math.round(s / 60);

function renderParent() {
  const pid = prView || R.activeId, p = R.profiles.find(x => x.id === pid) || prof();
  const D = pid === R.activeId ? R.data : loadData(pid), L = D.logs;
  const t = today();
  let weekSec = 0; for (let i = 0; i < 7; i++) { const d = D.days[addDays(t, -i)]; if (d) weekSec += d.sec || 0; }
  const daysN = Object.keys(D.days).filter(k => D.days[k].act > 0).length;
  const rvLogs = L.filter(l => /\.?review$/.test(l.kind)), rvRate = rvLogs.length ? Math.round(rvLogs.filter(l => l.correct).length / rvLogs.length * 100) + '%' : '—';
  let zf = 0, zt = 0;
  for (const u of units()) for (const z of u.zukan || []) if (z.kind === 'catalog' && z.total) { const s = new Set([...(z.initial || []), ...(D.zukan[z.id] || [])]); zf += s.size; zt += z.total; }
  // 共有のコレクション（直方体など）が二重に数えられないよう、id ごとにまとめ直す
  const seen = new Map();
  for (const u of units()) for (const z of u.zukan || []) if (z.kind === 'catalog' && z.total && !seen.has(z.id)) seen.set(z.id, new Set([...(z.initial || []), ...(D.zukan[z.id] || [])]).size + '/' + z.total);
  zf = [...seen.values()].reduce((a, s) => a + +s.split('/')[0], 0); zt = [...seen.values()].reduce((a, s) => a + +s.split('/')[1], 0);

  const ins = [], prs = [], rows = [], labels = {};
  for (const u of units()) {
    const UL = L.filter(l => l.unit === u.id);
    Object.assign(labels, u.labels || {});
    for (const x of u.insights || []) { const r = evaluate(x.test, UL, D); if (r.ok) ins.push({ x, u, obs: fill(x.obs, r.vars) }); }
    for (const x of u.praises || []) { const r = evaluate(x.test, UL, D); if (r.ok) prs.push(fill(x.text, r.vars)); }
    for (const m of u.map || []) {
      const done = evaluate(m.done, UL, D).ok, mid = evaluate(m.mid || m.done, UL, D);
      const anyLog = mid.ok || (m.mid ? false : UL.some(l => (m.kinds || []).includes(l.kind)));
      const note = m.note ? evaluate(m.note.test, UL, D) : null;
      rows.push({ u, m, done, mid: anyLog, note: note && note.ok ? fill(m.note.text, note.vars) : '' });
    }
  }
  const dayPr = evaluate({ type: 'days', min: 3 }, L, D); if (dayPr.ok) prs.push(`これまでに${dayPr.vars.n}日取り組みました。`);
  const st = (done, mid) => done ? '<span class="st ok">できた</span>' : (mid ? '<span class="st mid">とりくみ中</span>' : '<span class="st no">まだ</span>');
  const demo = /見本/.test(p.name);
  const S = R.settings;
  const opt = (arr, cur) => arr.map(([v, l]) => `<option value="${v}"${String(cur) === String(v) ? ' selected' : ''}>${l}</option>`).join('');
  const unitLabel = id => { const u = A.byId.get(id); return u ? u.plain : ''; };
  $('prBody').innerHTML = `
  <div><h3>だれの ようす？</h3><div class="who" id="prWho"></div></div>
  ${demo ? '<div class="banner">これは見本の記録です。保護者画面の見え方を確かめるために入れた例で、実際のお子さんの記録ではありません。</div>' : ''}
  <div class="ptiles">
    <div class="ptile"><b>${daysN}</b><span>取り組んだ日</span></div>
    <div class="ptile"><b>${fmtMin(weekSec)}<small style="font-size:14px">分</small></b><span>この7日間</span></div>
    <div class="ptile"><b>${zf}<small style="font-size:14px">/${zt}</small></b><span>展開図ずかん</span></div>
    <div class="ptile"><b>${rvRate}</b><span>思い出し問題の正答率</span></div>
  </div>
  ${estHTML(L)}
  <div><h3>つまずきの見立て</h3>${ins.length ? ins.map(o => `<div class="pcard"><div class="tt">${esc(o.x.title)}<span class="tag">${esc(o.x.tag || unitLabel(o.u.id))}</span>${o.x.reviewed ? '' : '<span class="draft">下書き</span>'}</div><p>${esc(o.obs)}${esc(o.x.body)}</p><div class="home"><b>おうちでできること</b>　${esc(o.x.home)}</div></div>`).join('<div style="height:8px"></div>') : '<p>目立ったつまずきは、まだ見えていません。「ためす」や「つくる」を何回か遊ぶと、間違え方の傾向からここに見立てが出ます。</p>'}</div>
  <div><h3>ほめどころ</h3>${prs.length ? `<ul class="plist">${prs.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : '<p>まだ記録が少ないため、これから表示されます。</p>'}</div>
  <div><h3>学校の学習との対応</h3>${rows.some(r => r.u.owner === 'hakaru') ? '<p class="note" style="text-align:left;margin:0 0 6px">量（長さ・かさ・重さ・時間・広さ）の単元は、教科書会社によって学ぶ時期が違います。</p>' : ''}<div style="overflow-x:auto"><table class="pmap">
    <tr><th>学年・内容</th><th>このアプリでの活動</th><th>ようす</th></tr>
    ${rows.map(r => `<tr><td>${esc(r.m.school || r.u.school || r.u.plain)}</td><td>${esc(r.m.activity)}</td><td>${st(r.done, r.mid)} ${r.note ? `<small>${esc(r.note)}</small>` : ''}</td></tr>`).join('')}
  </table></div></div>
  <div><h3>さいきんの きろく</h3><div class="plog">${L.length ? L.slice(-12).reverse().map(l => `<div><time>${fmtTime(l.t)}</time><span>${esc(labelOf(l, labels))}</span></div>`).join('') : '<p>まだ記録がありません。</p>'}</div></div>
  <div class="pset"><h3>せってい</h3>
    <div><label class="lab" for="sLimit">1日の利用時間の目安（こえると休けいの合図が出ます）</label><div class="prof-edit"><select id="sLimit">${opt([[0, 'なし'], [15, '15分'], [20, '20分'], [30, '30分'], [1, '1分（おためし）']], S.limitMin)}</select></div></div>
    <div><label class="lab">文字の読み上げ</label><div class="seg" role="group"><button type="button" data-read="1" aria-pressed="${S.readAuto}">じどうで読む</button><button type="button" data-read="0" aria-pressed="${!S.readAuto}">スピーカーを押したときだけ</button></div>${speech.available ? '' : '<p class="note" style="text-align:left;margin-top:6px">この端末のブラウザには日本語の読み上げの声がないため、読み上げボタンを隠しています。</p>'}</div>
    <div><label class="lab" for="sLevel">「ためす」のはじめの難しさ</label><div class="prof-edit"><select id="sLevel">${opt([['easy', 'やさしい'], ['normal', 'ふつう'], ['challenge', 'チャレンジ']], S.startLevel)}</select></div></div>
    <div><label class="lab">動きの量</label><div class="seg" role="group"><button type="button" data-motion="full" aria-pressed="${S.motion !== 'less'}">ふつう</button><button type="button" data-motion="less" aria-pressed="${S.motion === 'less'}">すくなめ（ゆっくり・紙ふぶきなし）</button></div></div>
    <div><label class="lab">画面の長さ合わせ（ものさしを実物と同じ長さにする）</label><div class="row" style="justify-content:flex-start"><button class="btn small sub" type="button" id="sCalib">がめんの ながさ あわせ</button><span class="note" style="text-align:left">${calibrated() ? '合わせてあります' : 'まだ合わせていません'}</span></div></div>
    <div><label class="lab">時計の表示</label><div class="seg" role="group"><button type="button" data-cnum="1" aria-pressed="${S.clockNums !== false}">数字あり</button><button type="button" data-cnum="0" aria-pressed="${S.clockNums === false}">数字なし</button></div> <div class="seg" role="group"><button type="button" data-cfive="0" aria-pressed="${!S.clockFive}">5とびは押したときだけ</button><button type="button" data-cfive="1" aria-pressed="${!!S.clockFive}">5とびをはじめから出す</button></div></div>
    <div><label class="lab">「ちょっと先」（4年〜中学）の単元</label><div class="seg" role="group"><button type="button" data-ahead="1" aria-pressed="${S.ahead}">ひらく</button><button type="button" data-ahead="0" aria-pressed="${!S.ahead}">とじる</button></div></div>
    <div><label class="lab">きょうだいの登録</label><div class="prof-edit"><input id="nName" maxlength="6" placeholder="よびな（6文字まで）" aria-label="よびな"><select id="nGrade" aria-label="学年"><option value="1">1年</option><option value="2" selected>2年</option><option value="3">3年</option></select><button class="btn small" type="button" id="nAdd"${R.profiles.length >= 4 ? ' disabled' : ''}>追加する</button></div>${R.profiles.length >= 4 ? '<p class="note" style="text-align:left">登録できるのは4人までです。</p>' : ''}</div>
    <div><label class="lab">記録</label><div class="row" style="justify-content:flex-start">
      <button class="btn small sub" type="button" id="xSave">記録をファイルに保存</button>
      <label class="btn small sub" for="xFile" style="cursor:pointer">保存した記録を読み込む</label><input type="file" id="xFile" class="vh" accept=".json,application/json">
      <button class="btn small sub" type="button" id="xDemo">見本の記録で表示</button>
      <button class="btn small sub" type="button" id="xDel">${esc(p.name)}の記録を消す</button>
    </div><div id="xConfirm"></div>
    <p class="note" style="text-align:left;margin-top:6px">記録はこの端末の中だけに保存され、外部には送られません。機種変更のときは、ファイルに保存して新しい端末で読み込んでください。</p></div>
  </div>`;
  renderWho($('prWho'), id => { sfx.tap(); prView = id; renderParent(); });
  $('sLimit').addEventListener('change', e => {
    S.limitMin = +e.target.value; saveSettings();
    // きょう すでに こえていたら、この画面を閉じてから1分後に合図を出す
    breakState.next = Math.max(S.limitMin * 60, day().sec + 60);
  });
  $('sLevel').addEventListener('change', e => { S.startLevel = e.target.value; saveSettings(); });
  $('prBody').querySelectorAll('[data-read]').forEach(b => b.addEventListener('click', () => { S.readAuto = b.dataset.read === '1'; saveSettings(); renderParent(); }));
  $('prBody').querySelectorAll('[data-motion]').forEach(b => b.addEventListener('click', () => { S.motion = b.dataset.motion; saveSettings(); renderParent(); }));
  $('sCalib').addEventListener('click', () => { sheet().hidden = true; openCalib(() => { renderParent(); sheet().hidden = false; }); });
  $('prBody').querySelectorAll('[data-cnum]').forEach(b => b.addEventListener('click', () => { S.clockNums = b.dataset.cnum === '1'; saveSettings(); renderParent(); }));
  $('prBody').querySelectorAll('[data-cfive]').forEach(b => b.addEventListener('click', () => { S.clockFive = b.dataset.cfive === '1'; saveSettings(); renderParent(); }));
  $('prBody').querySelectorAll('[data-ahead]').forEach(b => b.addEventListener('click', () => { S.ahead = b.dataset.ahead === '1'; saveSettings(); renderParent(); emitChange(); }));
  $('nAdd').addEventListener('click', () => {
    const name = $('nName').value.trim().slice(0, 6); if (!name) { $('nName').focus(); $('nName').placeholder = 'よびなを入れてください'; return; }
    const np = addProfile(name, +$('nGrade').value); prView = np.id; renderParent(); renderMissionBtns();
  });
  $('xSave').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(exportAll(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `katachi-kiroku-${today()}.json`; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    $('xConfirm').innerHTML = '<p class="note" style="text-align:left">保存しました。</p>';
  });
  $('xFile').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const j = JSON.parse(r.result);
        if (!j || j.app !== 'katachi-lab' || !Array.isArray(j.profiles) || !j.data) throw new Error('bad');
        $('xConfirm').innerHTML = `<div class="confirm">いまの記録を、ファイルの記録（${j.profiles.length}人分）で置きかえます。<button class="btn small" type="button" id="xYes">置きかえる</button><button class="btn small sub" type="button" id="xNo">やめる</button></div>`;
        $('xYes').addEventListener('click', () => { replaceAll(j); prView = R.activeId; renderParent(); renderMissionBtns(); });
        $('xNo').addEventListener('click', () => { $('xConfirm').innerHTML = ''; });
      } catch (err) { $('xConfirm').innerHTML = '<p class="note" style="text-align:left">このファイルは読み込めませんでした。このアプリで保存した記録ファイルを選んでください。</p>'; }
    };
    r.readAsText(f); e.target.value = '';
  });
  $('xDemo').addEventListener('click', () => { prView = addDemoProfile(); renderParent(); renderMissionBtns(); });
  $('xDel').addEventListener('click', () => {
    $('xConfirm').innerHTML = `<div class="confirm">${esc(p.name)}の記録をすべて消します。元にはもどせません。<button class="btn small" type="button" id="dYes">消す</button><button class="btn small sub" type="button" id="dNo">やめる</button></div>`;
    $('dYes').addEventListener('click', () => { clearProfile(pid); prView = R.profiles.find(x => x.id === pid) ? pid : R.activeId; renderParent(); renderMissionBtns(); });
    $('dNo').addEventListener('click', () => { $('xConfirm').innerHTML = ''; });
  });
}

// 見当の力：量ごとに、見当と実測のずれ（％）を小さな折れ線で出す。件数が3未満の量は「まだ記録が少ない」
function spark(pts) {
  const W = 140, H = 46, n = pts.length, mx = Math.max(50, ...pts);
  const xy = pts.map((v, i) => [n < 2 ? W / 2 : 6 + (W - 12) * i / (n - 1), H - 6 - (H - 12) * Math.min(v, mx) / mx]);
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><line x1="0" y1="${H - 6}" x2="${W}" y2="${H - 6}" stroke="${tok('line')}" stroke-width="1.5"/><polyline points="${xy.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${tok('sora')}" stroke-width="2.5" stroke-linejoin="round"/>${xy.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${tok('sora')}"/>`).join('')}</svg>`;
}
function estHTML(L) {
  const ser = estSeries(L);
  const box = ([k, name]) => {
    const s = ser[k].slice(-10);
    if (s.length < 3) return `<div class="estbox"><b>${name}</b><small>まだ記録が少ない（${s.length}件）</small></div>`;
    const first = s.slice(0, Math.ceil(s.length / 2)), last = s.slice(-Math.floor(s.length / 2));
    const avg = a => Math.round(a.reduce((x, y) => x + y.err, 0) / a.length);
    return `<div class="estbox"><b>${name}</b>${spark(s.map(x => x.err))}<small>ずれ ${avg(first)}% → ${avg(last)}%（${s.length}件）</small></div>`;
  };
  return `<div><h3>見当の力</h3><p class="note" style="text-align:left;margin:0 0 6px">「みとおし」の問題で、見当と実際の量のずれ（％）です。小さいほど量の感覚が育っています。</p><div class="ptiles est">${QTY.map(box).join('')}</div></div>`;
}

// 見本の記録：各単元の demo（日・時刻・記録）を並べる。実際のお子さんの記録ではないことを画面に出す
function addDemoProfile() {
  let p = R.profiles.find(x => /見本/.test(x.name));
  if (!p) { p = { id: 'pdemo', name: 'れい（見本）', grade: 2, color: avColors()[3] }; R.profiles.push(p); try { localStorage.setItem('katachi-profiles', JSON.stringify(R.profiles)); } catch (e) {} }
  const D = blankData(), now = Date.now(), H = 36e5, Dy = 864e5, t0 = now - 9 * Dy;
  for (const u of units()) for (const d of u.demo || []) {
    D.logs.push({ t: t0 + d.d * Dy + d.h * H, unit: u.id, kind: d.kind.includes('.') || d.kind === 'review' ? d.kind : u.id + '.' + d.kind, correct: d.correct ?? null, hints: d.hints ?? null, level: d.level ?? null, detail: d.detail || {} });
    const st = (D.units[u.id] || (D.units[u.id] = { stages: {}, last: 0 }));
    if (d.stage) st.stages[d.stage] = true;
  }
  D.logs.sort((a, b) => a.t - b.t);
  for (const u of units()) for (const z of u.zukan || []) if (u.demoZukan && u.demoZukan[z.id]) D.zukan[z.id] = u.demoZukan[z.id];
  [0, 1, 3, 5, 7, 8].forEach((d, i) => { D.days[dayKey(new Date(t0 + d * Dy))] = { sec: [380, 720, 540, 900, 660, 300][i], act: 4 }; });
  storeData(p.id, D);
  return p.id;
}
