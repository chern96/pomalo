// Croatian speech output via the Web Speech API.
// iOS: sound only after a user tap, voice list loads late, cancel before speaking again.

type Listener = (ready: boolean) => void;

let voice: SpeechSynthesisVoice | null = null;
let checked = false;
const listeners = new Set<Listener>();

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

function findVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  const voices = s.getVoices();
  const hr = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('hr'));
  return hr.find((v) => v.localService) ?? hr[0] ?? null;
}

function refresh(): void {
  const v = findVoice();
  if (v !== voice || !checked) {
    voice = v;
    checked = true;
    listeners.forEach((l) => l(!!voice));
  }
}

/** Starts looking for a Croatian voice. Resolves after at most ~3 s. */
export function initVoices(): Promise<boolean> {
  const s = synth();
  if (!s) {
    checked = true;
    return Promise.resolve(false);
  }
  refresh();
  if (voice) return Promise.resolve(true);
  s.addEventListener?.('voiceschanged', refresh);
  return new Promise((resolve) => {
    let tries = 0;
    const t = setInterval(() => {
      refresh();
      tries += 1;
      if (voice || tries > 12) {
        clearInterval(t);
        resolve(!!voice);
      }
    }, 250);
  });
}

export function hasCroatianVoice(): boolean {
  return !!voice;
}

export function voicesChecked(): boolean {
  return checked;
}

export function onVoiceChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function voiceName(): string | null {
  return voice?.name ?? null;
}

export function speak(text: string, opts: { slow?: boolean; onEnd?: () => void } = {}): boolean {
  const s = synth();
  if (!s) return false;
  if (!voice) refresh();
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'hr-HR';
  if (voice) u.voice = voice;
  u.rate = opts.slow ? 0.55 : 0.9;
  if (opts.onEnd) {
    u.onend = opts.onEnd;
    u.onerror = opts.onEnd;
  }
  s.speak(u);
  return !!voice;
}

export function stopSpeaking(): void {
  synth()?.cancel();
}
