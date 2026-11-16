import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { speak } from '../audio/tts';
import { sfx } from '../audio/sfx';
import type { Library } from '../content/library';
import type { Exercise } from '../engine/exercises';
import { grade, gradeTiles, normalize, type Verdict } from '../engine/grade';
import { CharBar, SpeakButtons, WordForms, WordTags } from './common';

export interface Outcome {
  verdict: Verdict;
  expected: string;
  given?: string;
  reason?: 'diacritics' | 'typo';
  /** Not graded (intro card, speaking self-check, skipped). */
  ungraded?: boolean;
}

export interface ExProps<K extends Exercise['kind']> {
  ex: Extract<Exercise, { kind: K }>;
  lib: Library;
  /** True after "Prüfen": inputs are frozen and the solution is shown. */
  locked: boolean;
  /** Offer a check function (enables the "Prüfen" button) or withdraw it. */
  setCheck: (fn: (() => Outcome) | null) => void;
  /** Finish directly (pairs, speaking). */
  done: (o: Outcome) => void;
  autoplay: boolean;
  audio: boolean;
}

function useAutoplay(text: string | undefined, on: boolean, id: string) {
  useEffect(() => {
    if (on && text) {
      const t = setTimeout(() => speak(text), 250);
      return () => clearTimeout(t);
    }
  }, [id]);
}

const LABEL: Record<string, string> = {
  'hr-de': 'Was bedeutet das?',
  'de-hr': 'Wie heißt das auf Kroatisch?',
};

export function IntroView({ ex, lib, autoplay, audio }: ExProps<'intro'>) {
  const w = lib.words.get(ex.wordId)!;
  useAutoplay(w.say ?? w.hr, autoplay && audio, ex.id);
  return (
    <div class="intro-card pop">
      <span class="badge-new">NEUES WORT</span>
      <div class="word">{w.hr}</div>
      <div class="meaning">{w.de.join(', ')}</div>
      <WordTags w={w} />
      {audio && (
        <div style={{ marginBottom: '16px' }}>
          <SpeakButtons text={w.say ?? w.hr} />
        </div>
      )}
      <div style={{ textAlign: 'left' }}>
        <WordForms w={w} />
      </div>
      <div class="example">
        <div class="row">
          <div class="grow" style={{ flex: 1 }}>
            <div class="ex-hr">{w.example.hr}</div>
            <div class="muted">{w.example.de}</div>
          </div>
          {audio && <SpeakButtons text={w.example.hr} slow={false} mini />}
        </div>
      </div>
      {w.note && <div class="note">ℹ️ {w.note}</div>}
    </div>
  );
}

function Options({ options, selected, onSelect, locked, answer }: {
  options: string[]; selected: string | null; onSelect: (o: string) => void; locked: boolean; answer: string;
}) {
  return (
    <div class="options">
      {options.map((o) => {
        let cls = 'option';
        if (locked && o === answer) cls += ' right';
        else if (locked && o === selected) cls += ' wrong';
        else if (o === selected) cls += ' selected';
        return (
          <button key={o} type="button" class={cls} disabled={locked} onClick={() => { sfx.tap(); onSelect(o); }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function ChoiceView({ ex, locked, setCheck, autoplay, audio }: ExProps<'choice'>) {
  const [sel, setSel] = useState<string | null>(null);
  useAutoplay(ex.audio, autoplay && audio, ex.id);
  useEffect(() => {
    setCheck(sel ? () => ({ verdict: sel === ex.answer ? 'correct' : 'wrong', expected: ex.answer, given: sel }) : null);
  }, [sel]);
  return (
    <div>
      <div class="task-label">{LABEL[ex.dir]}</div>
      <div class="prompt">
        <span class={ex.dir === 'hr-de' ? 'hr' : ''}>{ex.prompt}</span>
        {ex.audio && audio && <SpeakButtons text={ex.audio} slow={false} mini />}
      </div>
      <Options options={ex.options} selected={sel} onSelect={setSel} locked={locked} answer={ex.answer} />
    </div>
  );
}

export function FactView({ ex, locked, setCheck, autoplay, audio }: ExProps<'fact'>) {
  const [sel, setSel] = useState<string | null>(null);
  useAutoplay(ex.audio, autoplay && audio, ex.id);
  useEffect(() => {
    setCheck(sel ? () => ({ verdict: sel === ex.answer ? 'correct' : 'wrong', expected: ex.answer, given: sel }) : null);
  }, [sel]);
  return (
    <div>
      <div class="task-label">Aussprache & Regeln</div>
      <div class="prompt">
        <span>{ex.question}</span>
        {ex.audio && audio && <SpeakButtons text={ex.audio} mini />}
      </div>
      <Options options={ex.options} selected={sel} onSelect={setSel} locked={locked} answer={ex.answer} />
      {locked && ex.explain && <p class="note">💡 {ex.explain}</p>}
    </div>
  );
}

export function PairsView({ ex, done, audio }: ExProps<'pairs'>) {
  const right = useMemo(() => [...ex.pairs].sort(() => Math.random() - 0.5), [ex.id]);
  const [selHr, setSelHr] = useState<string | null>(null);
  const [selDe, setSelDe] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [shake, setShake] = useState<string | null>(null);
  const mistakes = useRef(0);

  useEffect(() => {
    if (!selHr || !selDe) return;
    if (selHr === selDe) {
      sfx.correct();
      const m = [...matched, selHr];
      setMatched(m);
      if (m.length === ex.pairs.length) {
        setTimeout(() => done({ verdict: mistakes.current ? 'almost' : 'correct', expected: '' }), 350);
      }
    } else {
      sfx.wrong();
      mistakes.current += 1;
      setShake(selDe);
      setTimeout(() => setShake(null), 400);
    }
    setSelHr(null);
    setSelDe(null);
  }, [selHr, selDe]);

  return (
    <div>
      <div class="task-label">Finde die Paare</div>
      <div class="pairs">
        <div class="col">
          {ex.pairs.map((p) => (
            <button
              key={p.wordId}
              type="button"
              class={`option${matched.includes(p.wordId) ? ' matched' : ''}${selHr === p.wordId ? ' selected' : ''}`}
              disabled={matched.includes(p.wordId)}
              onClick={() => {
                if (audio) speak(p.say);
                setSelHr(p.wordId);
              }}
            >
              {p.hr}
            </button>
          ))}
        </div>
        <div class="col">
          {right.map((p) => (
            <button
              key={p.wordId}
              type="button"
              class={`option${matched.includes(p.wordId) ? ' matched' : ''}${selDe === p.wordId ? ' selected' : ''}${shake === p.wordId ? ' shake' : ''}`}
              disabled={matched.includes(p.wordId)}
              onClick={() => { sfx.tap(); setSelDe(p.wordId); }}
            >
              {p.de}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TextInput({ value, onInput, lang, single, onEnter }: {
  value: string; onInput: (v: string) => void; lang: 'hr' | 'de'; single?: boolean; onEnter?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div>
      <textarea
        ref={ref}
        class={`text-answer${single ? ' single' : ''}`}
        value={value}
        lang={lang === 'hr' ? 'hr' : 'de'}
        placeholder={lang === 'hr' ? 'Auf Kroatisch …' : 'Auf Deutsch …'}
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck={false}
        enterkeyhint="done"
        rows={single ? 1 : 3}
        onInput={(e) => onInput((e.target as HTMLTextAreaElement).value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnter?.();
          }
        }}
      />
      {lang === 'hr' && <CharBar target={ref} onInput={onInput} />}
    </div>
  );
}

function useTyped(accepted: string[], lang: 'hr' | 'de', lib: Library, setCheck: ExProps<'translate'>['setCheck'], strict = false) {
  const [val, setVal] = useState('');
  useEffect(() => {
    setCheck(
      normalize(val)
        ? () => {
            const r = grade(val, accepted, { lang, strict, knownForms: lib.knownForms });
            return { verdict: r.verdict, expected: r.expected, given: val, reason: r.reason };
          }
        : null,
    );
  }, [val]);
  return [val, setVal] as const;
}

export function TranslateView({ ex, lib, locked, setCheck, autoplay, audio }: ExProps<'translate'>) {
  const target = ex.dir === 'de-hr' ? 'hr' : 'de';
  const [val, setVal] = useTyped(ex.accepted, target, lib, setCheck);
  useAutoplay(ex.audio, autoplay && audio, ex.id);
  return (
    <div>
      <div class="task-label">{target === 'hr' ? 'Schreib das auf Kroatisch' : 'Schreib das auf Deutsch'}{ex.hint ? ` (${ex.hint})` : ''}</div>
      <div class="prompt">
        <span class={ex.dir === 'hr-de' ? 'hr' : ''}>{ex.prompt}</span>
        {ex.audio && audio && <SpeakButtons text={ex.audio} mini />}
      </div>
      {!locked && <TextInput value={val} onInput={setVal} lang={target} single={ex.prompt.split(' ').length <= 2} />}
      {locked && <div class="card">{val}</div>}
    </div>
  );
}

export function TilesView({ ex, locked, setCheck, audio }: ExProps<'tiles'>) {
  const [chosen, setChosen] = useState<number[]>([]);
  useEffect(() => {
    setCheck(chosen.length ? () => {
      const built = chosen.map((i) => ex.tiles[i]!);
      const r = gradeTiles(built, ex.accepted);
      return { verdict: r.verdict, expected: r.expected, given: built.join(' ') };
    } : null);
  }, [chosen]);
  return (
    <div>
      <div class="task-label">Bau den Satz auf Kroatisch</div>
      <div class="prompt"><span>{ex.prompt}</span></div>
      <div class="tiles-answer">
        {chosen.map((i) => (
          <button key={i} type="button" class="tile" disabled={locked} onClick={() => { sfx.tap(); setChosen(chosen.filter((x) => x !== i)); }}>
            {ex.tiles[i]}
          </button>
        ))}
      </div>
      <div class="tiles-bank">
        {ex.tiles.map((t, i) => (
          <button
            key={i}
            type="button"
            class={`tile${chosen.includes(i) ? ' used' : ''}`}
            disabled={locked || chosen.includes(i)}
            onClick={() => {
              if (audio) speak(t);
              setChosen([...chosen, i]);
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ClozeView({ ex, lib, locked, setCheck }: ExProps<'cloze'>) {
  const [sel, setSel] = useState<string | null>(null);
  const [typed, setTyped] = useTyped(ex.answers, 'hr', lib, ex.options ? () => undefined : setCheck, true);
  useEffect(() => {
    if (ex.options) setCheck(sel ? () => ({ verdict: ex.answers.includes(sel) ? 'correct' : 'wrong', expected: ex.answers[0]!, given: sel }) : null);
  }, [sel]);
  const [before, after] = ex.hr.split('___');
  const fill = ex.options ? sel : typed;
  return (
    <div>
      <div class="task-label">Ergänze die Lücke</div>
      <div class="cloze-text">
        {before}
        <span class="gap">{locked ? (ex.answers.includes(fill ?? '') ? fill : ex.answers[0]) : fill || ' '}</span>
        {after}
      </div>
      <p class="muted">{ex.de}{ex.hint ? ` · 💡 ${ex.hint}` : ''}</p>
      {ex.options ? (
        <Options options={ex.options} selected={sel} onSelect={setSel} locked={locked} answer={ex.answers[0]!} />
      ) : (
        !locked && <TextInput value={typed} onInput={setTyped} lang="hr" single />
      )}
    </div>
  );
}

export function ListenView({ ex, lib, locked, setCheck, audio }: ExProps<'listen'>) {
  const [sel, setSel] = useState<string | null>(null);
  const [typed, setTyped] = useTyped(ex.accepted, 'hr', lib, ex.mode === 'type' ? setCheck : () => undefined);
  useAutoplay(ex.audio, audio, ex.id);
  useEffect(() => {
    if (ex.mode === 'choice') setCheck(sel ? () => ({ verdict: sel === ex.accepted[0] ? 'correct' : 'wrong', expected: ex.accepted[0]!, given: sel }) : null);
  }, [sel]);
  return (
    <div>
      <div class="task-label">{ex.mode === 'choice' ? 'Was hörst du?' : 'Schreib, was du hörst'}</div>
      <div class="row" style={{ justifyContent: 'center', margin: '12px 0 24px' }}>
        <SpeakButtons text={ex.audio} big />
      </div>
      {ex.mode === 'choice' && ex.options ? (
        <Options options={ex.options} selected={sel} onSelect={setSel} locked={locked} answer={ex.accepted[0]!} />
      ) : (
        !locked && <TextInput value={typed} onInput={setTyped} lang="hr" />
      )}
      {locked && <p class="muted" style={{ marginTop: '12px' }}>Bedeutung: {ex.de}</p>}
    </div>
  );
}

export function SpeakView({ ex, done, audio }: ExProps<'speak'>) {
  useAutoplay(ex.hr, audio, ex.id);
  return (
    <div>
      <div class="task-label">Hör zu und sprich laut nach</div>
      <div class="prompt"><span class="hr">{ex.hr}</span></div>
      <p class="muted">{ex.de}</p>
      <div class="row" style={{ justifyContent: 'center', margin: '18px 0 28px' }}>
        <SpeakButtons text={ex.hr} big />
      </div>
      <div class="stack">
        <button class="btn ok block" onClick={() => done({ verdict: 'correct', expected: ex.hr, ungraded: true })}>🗣️ Ich hab's gesagt</button>
        <button class="btn flat block" onClick={() => done({ verdict: 'correct', expected: ex.hr, ungraded: true })}>Gerade nicht – überspringen</button>
      </div>
    </div>
  );
}

export function ExerciseView(p: ExProps<Exercise['kind']>) {
  const ex = p.ex as Exercise;
  switch (ex.kind) {
    case 'intro': return <IntroView {...(p as ExProps<'intro'>)} />;
    case 'choice': return <ChoiceView {...(p as ExProps<'choice'>)} />;
    case 'pairs': return <PairsView {...(p as ExProps<'pairs'>)} />;
    case 'translate': return <TranslateView {...(p as ExProps<'translate'>)} />;
    case 'tiles': return <TilesView {...(p as ExProps<'tiles'>)} />;
    case 'cloze': return <ClozeView {...(p as ExProps<'cloze'>)} />;
    case 'listen': return <ListenView {...(p as ExProps<'listen'>)} />;
    case 'speak': return <SpeakView {...(p as ExProps<'speak'>)} />;
    case 'fact': return <FactView {...(p as ExProps<'fact'>)} />;
  }
}

/** Mark the characters of `expected` that the answer got wrong or left out. */
export function diffMarks(expected: string, given: string): { ch: string; mark: boolean }[] {
  const a = expected;
  const b = given.toLowerCase();
  const al = a.toLowerCase();
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i]![j] = al[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const out: { ch: string; mark: boolean }[] = [];
  let i = 0;
  let j = 0;
  while (i < m) {
    if (j < n && al[i] === b[j]) {
      out.push({ ch: a[i]!, mark: false });
      i++;
      j++;
    } else if (j < n && dp[i]![j + 1]! >= dp[i + 1]![j]!) {
      j++;
    } else {
      out.push({ ch: a[i]!, mark: !/[\s.,!?]/.test(a[i]!) });
      i++;
    }
  }
  return out;
}
