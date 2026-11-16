import { useMemo, useState } from 'preact/hooks';
import { library as lib } from '../content';
import type { Word } from '../content/types';
import { matchesWord } from '../engine/search';
import { useAppState } from '../app/store';
import { Sheet, SpeakButtons, Strength, useVoice, WordForms, WordTags } from './common';
import { Mascot } from './Mascot';

export function Words() {
  const s = useAppState();
  const voice = useVoice();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Word | null>(null);
  const learned = useMemo(
    () => lib.wordOrder.filter((id) => s.words[id]).map((id) => lib.words.get(id)!).filter(Boolean),
    [s.words],
  );
  const shown = learned.filter((w) => matchesWord(w, q));

  return (
    <div class="screen with-nav">
      <h1>Meine Wörter</h1>
      <p class="muted">{learned.length} Wörter gelernt</p>
      {learned.length === 0 ? (
        <div class="center">
          <Mascot mood="comfort" size={110} />
          <p class="muted">Hier erscheinen deine Wörter, sobald du die erste Lektion gemacht hast.</p>
        </div>
      ) : (
        <>
          <input
            class="search"
            type="search"
            placeholder="Suchen (z. B. sto, Haus) …"
            value={q}
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck={false}
            onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          />
          <div class="list">
            {shown.map((w) => (
              <button key={w.id} class="list-item" onClick={() => setOpen(w)}>
                <div class="grow">
                  <div class="t1">{w.hr}</div>
                  <div class="t2">{w.de.join(', ')}</div>
                </div>
                <Strength p={s.words[w.id]} />
              </button>
            ))}
            {shown.length === 0 && <p class="muted center">Nichts gefunden.</p>}
          </div>
        </>
      )}
      {open && (
        <Sheet onClose={() => setOpen(null)}>
          <div class="row">
            <h1 style={{ color: 'var(--sea)', flex: 1 }}>{open.hr}</h1>
            {voice.ready && <SpeakButtons text={open.say ?? open.hr} />}
          </div>
          <p style={{ fontSize: '19px', fontWeight: 600 }}>{open.de.join(', ')}</p>
          <WordTags w={open} />
          <WordForms w={open} />
          <div class="example" style={{ margin: '10px 0' }}>
            <div class="row">
              <div style={{ flex: 1 }}>
                <div class="ex-hr">{open.example.hr}</div>
                <div class="muted">{open.example.de}</div>
              </div>
              {voice.ready && <SpeakButtons text={open.example.hr} slow={false} mini />}
            </div>
          </div>
          {open.note && <p class="note">ℹ️ {open.note}</p>}
          <div class="row" style={{ margin: '12px 0' }}>
            <span class="muted small">Stärke</span>
            <Strength p={s.words[open.id]} />
          </div>
          <button class="btn ghost block" onClick={() => setOpen(null)}>Schließen</button>
        </Sheet>
      )}
    </div>
  );
}
