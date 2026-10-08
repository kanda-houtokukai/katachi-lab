// 端末内の保存。localStorage は例外を投げることがある（プライベートモード等）ので、読み書きはすべて try/catch。
const P = 'katachi-';
export const store = {
  get(k, d) { try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(P + k); } catch (e) {} },
  keys() { try { return Object.keys(localStorage).filter(k => k.startsWith(P)).map(k => k.slice(P.length)); } catch (e) { return []; } },
};
