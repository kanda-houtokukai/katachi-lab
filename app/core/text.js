export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// ルビ付きの HTML から、読み上げ用の文（ルビの読みを使う）を作る
export function plain(html) {
  const d = document.createElement('div');
  d.innerHTML = String(html).replace(/<ruby>([^<]*)<rt>([^<]*)<\/rt><\/ruby>/g, '$2');
  return d.textContent.replace(/\s+/g, ' ').trim();
}
// 地の文（ルビを除いた表記）
export function bare(html) {
  const d = document.createElement('div');
  d.innerHTML = String(html).replace(/<rt>[^<]*<\/rt>/g, '');
  return d.textContent.replace(/\s+/g, ' ').trim();
}
export const shuffle = (a, rand = Math.random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const pick = (a, rand = Math.random) => a[Math.floor(rand() * a.length)];
export const $ = id => document.getElementById(id);
export function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
