// 単元の外のボタン（地図・上の帯・ミッション・おうちのひとへ・休けい）を全部押す流れ
export const longPress = async (h, sel) => {
  const b = await h.page.locator(sel).boundingBox();
  await h.page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await h.page.mouse.down(); await h.page.waitForTimeout(2200); await h.page.mouse.up();
  await h.page.waitForTimeout(250);
};
const visible = (h, sel) => h.page.locator(sel).isVisible();

// 地図：入口を全部ひらき、じゅんび中の単元を押して案内を出し、入口の一覧へ戻る
export async function doorsFlow(h) {
  const { page } = h;
  if (!(await page.locator('#home').isVisible())) await h.click('id=homeBtn|');
  if (await page.locator('#areaBack').isVisible()) await h.click('id=areaBack|');
  const areas = await page.evaluate(() => window.__katachi.A.areas.map(a => a.id));
  for (const a of areas) {
    await h.click(`data-area=${a}|`);
    const soon = await page.evaluate(() => [...document.querySelectorAll('#map .home-unit.soon')].map(b => b.dataset.unit));
    for (const u of soon) if (!h.clicked.has(`data-unit=${u}|`)) await h.click(`data-unit=${u}|`);
    await h.click('id=areaBack|');
  }
}
// ミッション：思い出し問題に答え、「やる」から単元へ行って戻る
export async function missionFlow(h, btn) {
  const { page } = h;
  await h.click(`id=${btn}|`);
  if (await page.locator('#msBody [data-go="review"]').count()) {
    await h.click('data-go=review|');
    if (await visible(h, '#rSay')) await h.click('id=rSay|');
    for (let i = 0; i < 4; i++) { if (!(await page.locator('#msBody [data-ch]').count())) break; await h.click('data-ch|'); await page.waitForTimeout(1900); }
  }
  await h.click('id=msClose|', { expectChange: false });
  for (const key of ['tamesu', 'rot']) {
    await h.click(`id=${btn}|`, { expectChange: false });
    const gos = await page.evaluate(() => [...document.querySelectorAll('#msBody [data-go]')].map(b => b.dataset.go));
    const g = key === 'tamesu' ? gos.find(x => x === 'tamesu') : gos.find(x => x !== 'review' && x !== 'tamesu');
    if (g) { await h.click(`data-go=${g}|`); await page.waitForTimeout(500); await h.click('id=homeBtn|'); }
    else await h.click('id=msClose|', { expectChange: false });
  }
}

// がめんの ながさ あわせ：全ボタンを押す。とじる → もう一度ひらく（reopen）→ きめる（自動でとじる）
export async function calibFlow(h, reopen) {
  await h.until(() => !document.getElementById('calibSheet').hidden);
  await h.click('id=cPlus|'); await h.click('id=cMinus|');
  await h.page.locator('#cSlider').fill('520'); await h.page.waitForTimeout(150);
  await h.click('data-cmode=card|'); await h.click('data-cmode=card|'); await h.click('data-cmode=coin|');
  await h.click('id=cReset|');
  await h.click('id=cClose|');
  await reopen();
  await h.until(() => !document.getElementById('calibSheet').hidden);
  await h.click('id=cSave|');
  await h.until(() => document.getElementById('calibSheet').hidden);
}
// おうちのひとへ：設定・きょうだい・記録の保存と読み込み・見本・消す
export async function parentFlow(h, btn, { lockAhead = true } = {}) {
  const { page } = h;
  await h.click(`id=${btn}|`);                       // 短く押す → 案内
  await longPress(h, '#' + btn); h.clicked.set(`id=${btn}|`, true);
  await h.until(() => !document.getElementById('parentSheet').hidden);
  await h.click('data-read=0|'); await h.click('data-read=1|');
  await h.click('data-motion=less|'); await h.click('data-motion=full|');
  if (lockAhead) {
    await h.click('data-ahead=0|'); await h.click('id=prClose|');
    // とじた「ちょっと先」の単元を押す → 案内
    if (await visible(h, '#home')) {
      if (!(await h.page.locator('[data-unit="r4"]').count())) { if (await visible(h, '#areaBack')) await h.click('id=areaBack|'); await h.click('data-area=katachi|'); }
      await h.click('data-unit=r4|');
    }
    await longPress(h, '#' + btn); await h.until(() => !document.getElementById('parentSheet').hidden);
    await h.click('data-ahead=1|');
  } else { await h.click('data-ahead=0|'); await h.click('data-ahead=1|'); }
  await page.selectOption('#sLevel', 'easy'); await page.selectOption('#sLevel', 'normal');
  // 時計の表示・がめんの ながさ あわせ（量の単元で足した設定）
  await h.click('data-cnum=0|'); await h.click('data-cnum=1|'); await h.click('data-cfive=1|'); await h.click('data-cfive=0|');
  await h.click('id=sCalib|');
  await calibFlow(h, async () => { await h.until(() => !document.getElementById('parentSheet').hidden); await h.page.waitForTimeout(700); await h.click('id=sCalib|'); });
  await h.until(() => !document.getElementById('parentSheet').hidden);
  await h.page.waitForTimeout(700);   // シートがせり上がるのを待つ
  await h.click('id=nAdd|');
  await page.fill('#nName', 'たろう'); await h.click('id=nAdd|');
  const dl = page.waitForEvent('download', { timeout: 15000 }); await h.click('id=xSave|'); await dl;
  await h.click('id=xDemo|');
  await h.click((id, t) => id.startsWith('data-pid') && t.includes('たろう'));
  await h.click('id=xDel|'); await h.click('id=dNo|');
  await h.click('id=xDel|'); await h.click('id=dYes|');
  const file = { name: 'k.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'katachi-lab', v: 1, profiles: [{ id: 'pz', name: 'ぜっと', grade: 2, color: '#e5654b' }], data: {} })) };
  await page.setInputFiles('#xFile', file); await h.until(() => document.getElementById('xYes')); await h.click('id=xNo|');
  await page.setInputFiles('#xFile', file); await h.until(() => document.getElementById('xYes')); await h.click('id=xYes|');
  h.clicked.set('for=xFile|', true);            // ファイル選択の窓は setInputFiles で代わりに操作した
  // 休けい：目安を1分にして、利用時間を進める
  await page.selectOption('#sLimit', '1');
  await h.click('id=prClose|');
  await page.evaluate(() => window.__katachi.addUsage(65));
  await h.until(() => !document.getElementById('breakSheet').hidden);
  await h.until(() => !document.getElementById('bkGo').hidden, null, 30000);
  await h.click('id=bkGo|');
  await longPress(h, '#' + btn); await h.until(() => !document.getElementById('parentSheet').hidden);
  await page.selectOption('#sLimit', '0');
  await h.click('id=prClose|', { expectChange: false });
}
