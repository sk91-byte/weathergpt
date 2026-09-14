/** Speak with a device/browser voice, waiting for mobile voice packs to load. */
export function speakWithBrowserVoice(
  text: string,
  locale: string,
  onStart?: () => void,
  onEnd?: () => void,
  onUnavailable?: () => void,
): void {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    onUnavailable?.();
    return;
  }

  const synthesis = window.speechSynthesis;
  const requestedLocale = locale.toLowerCase();
  const baseLanguage = requestedLocale.split('-')[0];
  let settled = false;

  const speak = () => {
    if (settled) return;
    settled = true;
    synthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    const voices = synthesis.getVoices();
    const matchingVoice = voices.find((voice) => voice.lang.toLowerCase() === requestedLocale)
      || voices.find((voice) => voice.lang.toLowerCase().startsWith(`${baseLanguage}-`))
      || voices.find((voice) => voice.lang.toLowerCase() === baseLanguage);

    if (!matchingVoice) {
      onUnavailable?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = matchingVoice.lang || locale;
    utterance.voice = matchingVoice;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    (window as any)._activeVoiceUtterance = utterance;
    synthesis.speak(utterance);
  };

  const handleVoicesChanged = () => speak();
  synthesis.cancel();
  if (synthesis.getVoices().length > 0) {
    speak();
    return;
  }
  synthesis.addEventListener('voiceschanged', handleVoicesChanged);
  window.setTimeout(() => { if (!settled) speak(); }, 1500);
}
