/* ---------- 起動 ---------- */
renderHome(); show('home');
if (TTS.ok) { TTS.pick(); speechSynthesis.onvoiceschanged = () => TTS.pick(); } else { $('#ttsBtn').hidden = true; $('#hudSay').hidden = true; }
/* 見本の確認用：#clock などで場面を直接ひらく */
(function () { const k = (location.hash || '').slice(1); const u = UNITS.find(x => x.play === k); if (u) { App.area = u.areas[0]; openScene(k, u); } })();
