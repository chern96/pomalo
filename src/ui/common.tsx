import type { ComponentChildren, RefObject } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { hasCroatianVoice, onVoiceChange, speak, voicesChecked } from '../audio/tts';
import type { Tip, Word } from '../content/types';
import { strength } from '../engine/srs';
import type { WordProgress } from '../state/schema';

export function useVoice(): { ready: boolean; checked: boolean } {
  const [s, set] = useState({ ready: hasCroatianVoice(), checked: voicesChecked() });
  useEffect(() => onVoiceChange((ready) => set({ ready, checked: true })), []);
  return s;
}

export function SpeakButtons({ text, big = false, slow = true, mini = false }: { text: string; big?: boolean; slow?: boolean; mini?: boolean }) {
  return (
    <span class="row" style={{ gap: '8px', display: 'inline-flex' }}>
      <button
        type="button"
        class={`speaker${big ? ' big' : ''}${mini ? ' mini' : ''}`}
        aria-label="Anhören"
        onClick={(e) => {
          e.stopPropagation();
          speak(text);
        }}
      >
        🔊
      </button>
      {slow && (
        <button
          type="button"
          class="speaker slow"
          aria-label="Langsam anhören"
          onClick={(e) => {
            e.stopPropagation();
            speak(text, { slow: true });
          }}
        >
          🐢
        </button>
      )}
    </span>
  );
}

const CHARS = ['č', 'ć', 'đ', 'š', 'ž'];

/** Row of Croatian letters right above the keyboard. Keeps focus in the input. */
export function CharBar({ target, onInput }: { target: RefObject<HTMLTextAreaElement | HTMLInputElement | null>; onInput: (v: string) => void }) {
  const insert = (ch: string) => {
    const el = target.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const v = el.value.slice(0, start) + ch + el.value.slice(end);
    el.value = v;
    el.setSelectionRange(start + ch.length, start + ch.length);
    onInput(v);
  };
  return (
    <div class="charbar">
      {CHARS.map((c) => (
        <button
          type="button"
          key={c}
          // Prevent the input from losing focus (keyboard stays open).
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insert(c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

export function Sheet({ children, onClose }: { children: ComponentChildren; onClose?: () => void }) {
  return (
    <div class="backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div class="sheet" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

export function Confirm({ title, text, yes, no = 'Abbrechen', danger, onYes, onNo }: {
  title: string; text?: string; yes: string; no?: string; danger?: boolean; onYes: () => void; onNo: () => void;
}) {
  return (
    <Sheet onClose={onNo}>
      <h2>{title}</h2>
      {text && <p class="muted">{text}</p>}
      <div class="stack" style={{ marginTop: '16px' }}>
        <button class={`btn block${danger ? ' coral' : ''}`} onClick={onYes}>{yes}</button>
        <button class="btn ghost block" onClick={onNo}>{no}</button>
      </div>
    </Sheet>
  );
}

export function Confetti() {
  const colors = ['#0e8f9a', '#f5b72a', '#ef6a5b', '#1b2a30', '#2bb8c3'];
  const [pieces] = useState(() =>
    Array.from({ length: 46 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      dur: 1.8 + Math.random() * 1.6,
      size: 8 + Math.random() * 10,
      color: colors[i % colors.length],
    })),
  );
  return (
    <div class="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} style={{ left: `${p.left}%`, width: `${p.size}px`, height: `${p.size}px`, background: p.color, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }} />
      ))}
    </div>
  );
}

export function TipCard({ tip }: { tip: Tip }) {
  return (
    <div class="card tipcard">
      <h3>💡 {tip.title}</h3>
      <p>{tip.text}</p>
      <div class="ex">
        {tip.examples.map(([hr, de]) => (
          <>
            <span class="hr">{hr}</span>
            <span class="muted">{de}</span>
          </>
        ))}
      </div>
    </div>
  );
}

const POS: Record<string, string> = {
  noun: 'Nomen', verb: 'Verb', adj: 'Adjektiv', adv: 'Adverb', pron: 'Pronomen', num: 'Zahl',
  phrase: 'Ausdruck', particle: 'Partikel', prep: 'Präposition', conj: 'Bindewort', letter: 'Buchstabe',
};
const GENDER: Record<string, string> = { m: 'männlich', f: 'weiblich', n: 'sächlich' };

export function WordTags({ w }: { w: Word }) {
  return (
    <div class="meta">
      <span class="tag">{POS[w.pos] ?? w.pos}</span>
      {w.gender && <span class="tag">{GENDER[w.gender]}</span>}
      {w.pluralOnly && <span class="tag">nur Mehrzahl</span>}
      {w.isColloquial && <span class="tag ugs">umgangssprachlich</span>}
      {w.formal && <span class="tag formal">Sie-Form</span>}
    </div>
  );
}

export function WordForms({ w }: { w: Word }) {
  return (
    <>
      {w.present && <p class="small"><b>ich:</b> {w.present}</p>}
      {w.forms && <p class="small"><b>Formen:</b> {w.forms.m} (m) · {w.forms.f} (f) · {w.forms.n} (n)</p>}
      {!!w.colloquial?.length && <p class="small"><span class="tag ugs">umgangssprachlich</span> {w.colloquial.join(', ')}</p>}
      {!!w.hrAlt?.length && <p class="small muted">auch: {w.hrAlt.join(', ')}</p>}
    </>
  );
}

export function Strength({ p }: { p?: WordProgress }) {
  const n = Math.round(strength(p) * 5);
  return (
    <span class="strength" aria-label={`Stärke ${n} von 5`}>
      {[1, 2, 3, 4, 5].map((i) => <i key={i} class={i <= n ? 'on' : ''} />)}
    </span>
  );
}

const PRAISE = ['Bravo!', 'Odlično!', 'Svaka čast!', 'Super!', 'Tako je!', 'Točno!'];
const COMFORT = ['Nije strašno!', 'Kopf hoch!', 'Gleich nochmal!', 'Pomalo – Schritt für Schritt.'];
export function praise(): string {
  return PRAISE[Math.floor(Math.random() * PRAISE.length)]!;
}
export function comfort(): string {
  return COMFORT[Math.floor(Math.random() * COMFORT.length)]!;
}

/** Keeps the bottom bar above the iOS keyboard. */
export function useKeyboardInset(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const on = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb', `${Math.round(kb)}px`);
    };
    vv.addEventListener('resize', on);
    vv.addEventListener('scroll', on);
    on();
    return () => {
      vv.removeEventListener('resize', on);
      vv.removeEventListener('scroll', on);
      document.documentElement.style.setProperty('--kb', '0px');
    };
  }, []);
}
