/**
 * Озвучка через Web Speech API (без бэкенда). Используется для произношения
 * английского слова в сессии. Голос подбираем английский, если он есть.
 */
export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  return (
    voices.find((v) => /^en[-_]US/i.test(v.lang)) ??
    voices.find((v) => /^en[-_]GB/i.test(v.lang)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    null
  );
}

/** Произносит текст; прерывает предыдущее произношение. */
export function speak(text: string, lang = "en-US"): void {
  if (!ttsSupported() || !text.trim()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  const voice = pickEnglishVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 0.95;
  synth.speak(utterance);
}
