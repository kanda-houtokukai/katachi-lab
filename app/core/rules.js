// 保護者画面の規則（つまずきの見立て・ほめどころ・学校の学習との対応・記録の文）を、単元データの宣言から評価する。
// 描画に依存しない（単体テストで確かめる）。
const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
export function match(l, where = {}) {
  for (const [k, v] of Object.entries(where)) {
    const x = get(l, k);
    if (Array.isArray(v)) { if (!v.includes(x)) return false; }
    else if (v && typeof v === 'object' && ('gte' in v || 'lte' in v)) { if (x == null || ('gte' in v && x < v.gte) || ('lte' in v && x > v.lte)) return false; }
    else if (x !== v) return false;
  }
  return true;
}
export const filter = (L, where) => L.filter(l => match(l, where));

// cond を評価して { ok, vars } を返す
export function evaluate(c, L, D = { days: {} }) {
  if (!c) return { ok: false, vars: {} };
  const q = c.where ? filter(L, c.where) : L;
  switch (c.type) {
    case 'any': return { ok: (c.of || [c.where]).some(w => L.some(l => match(l, w))), vars: {} };
    case 'all': return { ok: (c.of || []).every(w => L.some(l => match(l, w))), vars: {} };
    case 'count': { const n = q.length; return { ok: n >= (c.min ?? 1), vars: { n } }; }
    case 'wrongRate': {
      const n = q.length, w = q.filter(l => l.correct === false).length;
      return { ok: n >= (c.minN ?? 2) && w >= (c.minWrong ?? 2) && (c.ratio == null || w / n >= c.ratio), vars: { n, w } };
    }
    case 'rate': {
      const n = q.length, k = q.filter(l => l.correct === true).length;
      return { ok: n >= (c.minN ?? 1) && k / Math.max(1, n) >= (c.min ?? 0.7), vars: { n, k } };
    }
    case 'distinct': { const u = new Set(q.map(l => get(l, c.field)).filter(v => v != null)).size; return { ok: u >= (c.min ?? 1), vars: { u } }; }
    case 'sum': { const s = q.reduce((a, l) => a + (+get(l, c.field) || 0), 0); return { ok: s >= (c.min ?? 1), vars: { s } }; }
    case 'streak': {
      let best = 0, run = 0;
      q.forEach(l => { if (l.correct && !l.hints) { run++; best = Math.max(best, run); } else run = 0; });
      return { ok: best >= (c.min ?? 3), vars: { best } };
    }
    case 'days': { const n = Object.keys(D.days || {}).filter(k => D.days[k].act > 0).length; return { ok: n >= (c.min ?? 3), vars: { n } }; }
    default: return { ok: false, vars: {} };
  }
}
export const fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));

// 記録1件の文（保護者向け・漢字かな交じり）
export function labelOf(l, labels = {}) {
  let spec = labels[l.kind];
  if (Array.isArray(spec)) { const hit = spec.find(s => match(l, s.where || {})); spec = hit ? hit.text : null; }
  if (!spec) return l.kind;
  const vars = Object.assign({}, l.detail || {}, {
    ok: l.correct === true ? '正解' : l.correct === false ? '不正解' : '',
    hints: l.hints ? `（ヒント${l.hints}回）` : '',
    level: { easy: 'やさしい', normal: 'ふつう', challenge: 'チャレンジ' }[l.level] || '',
  });
  return fill(spec, vars);
}
