import { readFileSync } from 'node:fs';
import { setCatalogLoader } from '../../app/engine/catalog.js';
export const ROOT = new URL('../../', import.meta.url);
export const readJSON = rel => JSON.parse(readFileSync(new URL(rel, ROOT)));
setCatalogLoader(async id => readJSON(`data/nets/${id}.json`));
export const frozen = readJSON('reference/net-counts.json');
export const CATALOG_IDS = frozen.solids.filter(s => !['dodeca', 'icosa'].includes(s.id)).map(s => s.id);
// 再現できる乱数
export function rng(seed = 12345) { let s = seed >>> 0; return () => { s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0; s ^= s >>> 12; return (s >>> 0) / 4294967296; }; }
