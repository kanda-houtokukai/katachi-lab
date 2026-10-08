// 効果音（端末で合成）と読み上げ（端末の音声）。外部の音声ファイルや API は使わない（D3）。
import { store } from './store.js';
import { R } from './records.js';
import { plain } from './text.js';

let actx = null;
export const sound = { on: store.get('sound', true) };
export function ensureAudio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
  if (actx && actx.state === 'suspended') actx.resume();
}
['pointerdown', 'touchend', 'click'].forEach(ev => document.addEventListener(ev, ensureAudio, true));
function tone(f, dur, { type = 'sine', vol = 0.16, to = null, delay = 0 } = {}) {
  if (!sound.on || !actx) return;
  const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
}
function swish(dur = 0.5, vol = 0.07) {
  if (!sound.on || !actx) return;
  const n = Math.floor(actx.sampleRate * dur), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n);
  const s = actx.createBufferSource(); s.buffer = buf;
  const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.7;
  const g = actx.createGain(); g.gain.value = vol; s.connect(f).connect(g).connect(actx.destination); s.start();
}
function pour(dur = 1.2) {
  if (!sound.on || !actx) return;
  for (let i = 0; i < 6; i++) tone(500 + Math.random() * 500, 0.08, { type: 'sine', vol: 0.04, delay: i * dur / 6 });
  swish(dur, 0.04);
}
export const sfx = {
  pop: () => tone(620, 0.13, { to: 300, vol: 0.18 }),
  off: () => tone(300, 0.1, { to: 180, vol: 0.1, type: 'triangle' }),
  tap: () => tone(980, 0.06, { vol: 0.06, type: 'triangle' }),
  tick: i => tone(523 * Math.pow(2, (i % 12) / 12 * 2), 0.11, { type: 'triangle', vol: 0.13 }),
  land: () => tone(180, 0.16, { to: 90, vol: 0.2 }),
  stamp: () => { tone(140, 0.12, { to: 70, vol: 0.24 }); tone(900, 0.05, { vol: 0.05, type: 'triangle', delay: 0.02 }); },
  good: () => { tone(784, 0.16, { vol: 0.14 }); tone(1047, 0.32, { vol: 0.14, delay: 0.12 }); tone(1319, 0.42, { vol: 0.1, delay: 0.24 }); },
  bad: () => { tone(240, 0.22, { type: 'triangle', vol: 0.14, to: 170 }); tone(200, 0.3, { type: 'triangle', vol: 0.12, to: 140, delay: 0.16 }); },
  roll: () => { for (let i = 0; i < 5; i++) tone(120 + i * 8, 0.09, { type: 'triangle', vol: 0.08, delay: i * 0.09 }); },
  swish, pour,
};

// 読み上げ：日本語の声がない端末では読み上げボタンを隠す（声の一覧は後から届く＝onvoiceschanged）
const TTS = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
let jaVoice = null, lastLine = '';
const voiceListeners = new Set();
export const speech = { available: false };
function pickVoice() {
  try {
    const vs = speechSynthesis.getVoices();
    jaVoice = vs.find(v => /^ja[-_]JP/i.test(v.lang)) || vs.find(v => /^ja/i.test(v.lang)) || null;
  } catch (e) { jaVoice = null; }
  speech.available = !!jaVoice;
  voiceListeners.forEach(f => f(speech.available));
}
if (TTS) { pickVoice(); try { speechSynthesis.addEventListener ? speechSynthesis.addEventListener('voiceschanged', pickVoice) : (speechSynthesis.onvoiceschanged = pickVoice); } catch (e) {} }
export const onVoices = fn => { voiceListeners.add(fn); fn(speech.available); };

export function say(text, force) {
  if (text != null) lastLine = plain(text);
  if (force) speech.forced = (speech.forced || 0) + 1;
  if (!speech.available || !sound.on || !lastLine) return;
  if (!force && !R.settings.readAuto) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(lastLine.replace(/No\./g, 'ナンバー'));
    u.lang = 'ja-JP'; if (jaVoice) u.voice = jaVoice; u.rate = 0.95; u.pitch = 1.08;
    speechSynthesis.speak(u);
  } catch (e) {}
}
export function hush() { if (TTS) try { speechSynthesis.cancel(); } catch (e) {} }
export const SAY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/></svg>';
// 画面内の .say ボタンに絵を入れ、声がなければ隠す
export function decorateSay(root = document) {
  root.querySelectorAll('.say').forEach(b => { if (!b.innerHTML.trim()) b.innerHTML = SAY_ICON; b.hidden = !speech.available; });
}
onVoices(() => decorateSay());
export function setSound(on) { sound.on = on; store.set('sound', on); if (on) { ensureAudio(); sfx.pop(); } else hush(); }
