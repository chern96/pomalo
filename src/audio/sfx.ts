// Effect sounds generated with Web Audio (no audio files).

let ctx: AudioContext | null = null;
let enabled = true;

export function setSfxEnabled(on: boolean): void {
  enabled = on;
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.18): void {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const sfx = {
  /** Unlock audio on iOS during a user gesture. */
  unlock(): void {
    audio();
  },
  correct(): void {
    tone(660, 0, 0.12, 'triangle');
    tone(990, 0.09, 0.2, 'triangle');
  },
  wrong(): void {
    tone(220, 0, 0.18, 'sawtooth', 0.08);
    tone(180, 0.12, 0.25, 'sawtooth', 0.07);
  },
  tap(): void {
    tone(520, 0, 0.05, 'sine', 0.06);
  },
  finish(): void {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.16));
  },
};
