export function speak(text: string, lang = "tr-TR") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.85;
  utterance.pitch = 1;

  const voices = window.speechSynthesis.getVoices();
  const trVoice = voices.find((v) => v.lang.startsWith("tr"));
  if (trVoice) utterance.voice = trVoice;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window === "undefined") return;
  window.speechSynthesis?.cancel();
}
