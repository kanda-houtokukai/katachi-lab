// 汎用の巡回：単元の全タブ・全活動を開き、「まだ押していないボタンを押す → なければ部品の auto() で1手進める」をくり返す。
// 押したボタンはすべて状態が変わること（harness の click が確かめる）。最後に、見えたのに押していないボタンが残らないこと。
const PANEL_SCOPE = () => {
  const vis = el => { if (el.disabled) return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; let e = el; while (e) { if (e.hidden) return false; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; e = e.parentElement; } return true; };
  const sheets = [...document.querySelectorAll('.sheet')].filter(s => !s.hidden);
  const roots = sheets.length ? [sheets[sheets.length - 1]] : [document.getElementById('panel'), document.getElementById('caption'), document.getElementById('toast')];
  return roots.flatMap(r => [...r.querySelectorAll('button, label.btn')]).filter(vis).map(b => ({ id: window.__bid(b), t: b.textContent.trim() }));
};

export async function crawlActivity(h, { maxSteps = 160, skip = [] } = {}) {
  const { page } = h;
  let idleAuto = 0;
  for (let step = 0; ; step++) {
    if (step >= maxSteps) { await h.shot('crawl-stuck'); throw new Error('巡回が終わらない（手数の上限）: ' + JSON.stringify(await h.test('T && T.state ? T.state() : null').catch(() => null))); }
    await page.waitForTimeout(120);
    await h.look();
    const list = await page.evaluate(PANEL_SCOPE);
    // 画面を切りかえるボタン（かたち・むずかしさ）は後まわし。いまの画面のボタンを先に押しきる
    const later = id => /data-(solid|level|i)=/.test(id);
    const cand = list.filter(b => !h.clicked.has(b.id) && !skip.some(s => b.id.includes(s)));
    const fresh = cand.find(b => !later(b.id)) || cand[0];
    // シートが開いていて、もう押すものがなければ閉じて棚へ戻る
    if (!fresh) { const close = await page.evaluate(() => { const s = [...document.querySelectorAll('.sheet')].filter(x => !x.hidden).pop(); const b = s && s.querySelector('.sheet-head .icon-btn'); return b ? b.id : null; }); if (close) { await h.click(`id=${close}|`, { expectChange: false }); continue; } }
    if (fresh) {
      if (fresh.id.startsWith('for=')) { h.clicked.set(fresh.id, true); continue; }
      try { await h.click(fresh.id); }
      catch (e) { if (!/ボタンが見つからない/.test(e.message)) throw e; }   // 押す直前に消えた（自動で消えるお知らせ）
      continue;
    }
    const a = await h.test('T && T.auto ? T.auto() : { done: true }').catch(e => ({ error: String(e) }));
    if (!a || a.done) {
      // 終わりの画面のボタンが出そろうのを待ってから、もう一度だけ確かめる
      await page.waitForTimeout(700); await h.look();
      const again = (await page.evaluate(PANEL_SCOPE)).find(b => !h.clicked.has(b.id) && !skip.some(s => b.id.includes(s)));
      if (again) continue;
      break;
    }
    if (a.error) throw new Error('auto() で例外: ' + a.error);
    if (a.wait) { await page.waitForTimeout(a.wait); if (++idleAuto > 80) throw new Error('auto() が待ち続ける'); if (!a.tap && !a.click) continue; }
    idleAuto = 0;
    if (a.click) { if (!(await h.visible(a.click))) { await page.waitForTimeout(300); continue; } await h.click(a.click, { expectChange: false }); }
    else if (a.clickNth) await h.clickNth(a.clickNth[0], a.clickNth[1], { expectChange: false });
    else if (a.tap) { await page.mouse.click(a.tap.x, a.tap.y); await page.waitForTimeout(80); }
    else if (a.slider) { await page.locator(a.slider[0]).fill(String(a.slider[1])); await page.waitForTimeout(150); }
    else if (a.drag) {
      // 指で回す（マットの上をなぞる）
      const r = await page.evaluate(() => { const c = document.getElementById('stage').getBoundingClientRect(); return { x: c.left + c.width / 2, y: c.top + c.height * 0.35 }; });
      await page.mouse.move(r.x, r.y); await page.mouse.down();
      for (let k = 1; k <= 8; k++) await page.mouse.move(r.x + a.drag[0] * k / 8, r.y + a.drag[1] * k / 8);
      await page.mouse.up(); await page.waitForTimeout(400);
    }
  }
}

// 単元を地図から開き、全タブ・全活動・ずかんを巡回する
export async function crawlUnit(h, unitId) {
  const { page } = h;
  if (await page.locator('#home').isVisible()) await h.click(`data-unit=${unitId}|`);
  const tabs = await page.evaluate(u => Object.fromEntries(Object.entries(window.__katachi.A.byId.get(u).tabs).map(([k, v]) => [k, v.length])), unitId);
  for (const mode of ['miru', 'sawaru', 'tamesu', 'tsukuru']) {
    const n = tabs[mode] || 0; if (!n) continue;
    const sel = await page.locator(`.tab[data-mode="${mode}"]`).getAttribute('aria-selected');
    if (sel !== 'true') await h.click(`data-mode=${mode}|`);
    for (let a = 0; a < n; a++) {
      if (n > 1 && (await page.locator(`#actSeg [data-act="${a}"]`).getAttribute('aria-pressed')) !== 'true') await h.click(`data-act=${a}|`);
      await page.waitForTimeout(400);
      await crawlActivity(h);
      // 開いたままのシート（かみで つくる など）は閉じる
      for (const id of ['pClose', 'zClose', 'msClose', 'prClose']) if (await page.locator('#' + id).isVisible()) await h.click(`id=${id}|`, { expectChange: false });
    }
  }
  // ずかん：コレクションを切りかえ（後ろから）、見つけたカードがあれば押して再生、「さがそう」で つくるへ
  const zs = await page.evaluate(u => (window.__katachi.A.byId.get(u).zukan || []).map(z => z.id), unitId);
  await h.click('data-mode=zukan|', { expectChange: false });
  let played = false;
  for (const z of [...zs].reverse()) {
    if (zs.length > 1 && (await page.locator(`#zTabs [data-z="${z}"]`).getAttribute('aria-pressed')) !== 'true') await h.click(`data-z=${z}|`);
    await page.waitForTimeout(300);
    if (!played && await page.locator('#zBody [data-no]').count()) { played = true; await h.click('data-no|'); await page.waitForTimeout(500); await h.click('data-mode=zukan|', { expectChange: false }); }
  }
  if (await page.locator('#zGo').isVisible()) { await h.click('id=zGo|'); await page.waitForTimeout(400); await h.click('data-mode=zukan|', { expectChange: false }); }
  await h.click('id=zClose|');
  // はじめから選ばれていた「みる」と最初の活動も押す
  await h.click('data-mode=miru|');
  if (await page.locator('#actSeg [data-act="0"]').isVisible() && (await page.locator('#actSeg [data-act="0"]').getAttribute('aria-pressed')) !== 'true') await h.click('data-act=0|');
}
