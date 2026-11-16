import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { sfx } from '../audio/sfx';
import { stopSpeaking } from '../audio/tts';
import { library as lib } from '../content';
import { isGraded, isTask, type Exercise } from '../engine/exercises';
import { generateLesson, generateQuick, generateReview, withoutAudio } from '../engine/generate';
import { pickReviewWords } from '../engine/srs';
import { dayKey } from '../state/dates';
import { completeActivity, nextStage, type ActivityOutcome } from '../state/progress';
import { getState, setState, update } from '../app/store';
import { navigate } from '../app/router';
import { loadSession, saveSession, setLessonActive, type SavedSession, type SessionKind } from '../app/session';
import { tryApplyUpdate } from '../app/pwa';
import { comfort, Confirm, praise, TipCard, useKeyboardInset, useVoice } from './common';
import { diffMarks, ExerciseView, type Outcome } from './exercises';
import { LessonEnd } from './LessonEnd';
import { Mascot } from './Mascot';

function sessionKey(kind: SessionKind, lessonId?: string) {
  return kind === 'lesson' ? `lesson:${lessonId}` : kind;
}

function buildSession(kind: SessionKind, lessonId: string | undefined, audio: boolean): SavedSession | null {
  const s = getState();
  const opts = { speaker: s.settings.speaker, audio, speaking: s.settings.speaking };
  let queue: Exercise[] = [];
  let stage: number | undefined;
  if (kind === 'lesson' && lessonId) {
    stage = nextStage(s, lessonId);
    queue = generateLesson(lib, lessonId, stage, opts);
  } else if (kind === 'review') {
    const ids = pickReviewWords(s.words, dayKey(), 12);
    if (!ids.length) return null;
    const boxes = Object.fromEntries(Object.entries(s.words).map(([k, v]) => [k, v.box]));
    queue = generateReview(lib, ids, boxes, opts, 12);
  } else {
    const ids = pickReviewWords(s.words, dayKey(), 10);
    if (ids.length < 4) return null;
    queue = generateQuick(lib, ids, opts, 7);
  }
  if (!queue.length) return null;
  return {
    key: sessionKey(kind, lessonId),
    kind,
    lessonId,
    stage,
    queue,
    index: 0,
    answers: [],
    missed: [],
    introduced: [],
    audioOff: !audio,
    startedAt: Date.now(),
  };
}

export function Player({ kind, lessonId }: { kind: SessionKind; lessonId?: string }) {
  const voice = useVoice();
  const lesson = lessonId ? lib.lessonById.get(lessonId) : undefined;
  const settings = getState().settings;
  const [session, setSession] = useState<SavedSession | null>(() => loadSession(sessionKey(kind, lessonId)));
  const [empty, setEmpty] = useState(false);
  const tip = lesson?.tip ? lib.tips.get(lesson.tip) : undefined;
  const [showTip, setShowTip] = useState(() => !!tip && !session && nextStage(getState(), lessonId ?? '') === 1);
  const [check, setCheckFn] = useState<(() => Outcome) | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [result, setResult] = useState<ActivityOutcome | null>(null);
  const footRef = useRef<HTMLDivElement>(null);
  useKeyboardInset();

  useEffect(() => {
    setLessonActive(true);
    return () => {
      setLessonActive(false);
      stopSpeaking();
      tryApplyUpdate();
    };
  }, []);

  // Build the exercise list once the voice check is done (or resume a saved one).
  useEffect(() => {
    if (session || !voice.checked) return;
    const s = buildSession(kind, lessonId, voice.ready);
    if (!s) setEmpty(true);
    else setSession(s);
  }, [voice.checked]);

  useEffect(() => {
    if (session && !result) saveSession(session);
  }, [session]);

  // Tip seen
  useEffect(() => {
    if (showTip && tip && !getState().seenTips.includes(tip.id)) {
      update((s) => ({ ...s, seenTips: [...s.seenTips, tip.id] }));
    }
  }, [showTip]);

  const audio = !!session && !session.audioOff && voice.ready;
  const ex = session?.queue[session.index];
  const total = useMemo(() => session?.queue.filter(isTask).length ?? 1, [session?.queue.length]);
  const doneCount = session ? session.queue.slice(0, session.index).filter(isTask).length : 0;

  const setCheck = (fn: (() => Outcome) | null) => setCheckFn(() => fn);

  function finish(s: SavedSession) {
    const out = completeActivity(
      getState(),
      { kind: s.kind, lessonId: s.lessonId, perfect: s.missed.length === 0, introduced: s.introduced, answers: s.answers },
      dayKey(),
      lib,
    );
    setState(out.state);
    saveSession(null);
    setLessonActive(false);
    setResult(out);
  }

  function advance(o: Outcome | null) {
    if (!session || !ex) return;
    const s: SavedSession = { ...session, answers: [...session.answers], missed: [...session.missed], queue: [...session.queue], introduced: [...session.introduced] };
    if (ex.kind === 'intro') s.introduced.push(ex.wordId);
    if (o && isGraded(ex) && !o.ungraded) {
      const correct = o.verdict !== 'wrong';
      s.answers.push({ wordIds: ex.wordIds, correct });
      if (!correct && !ex.id.endsWith(':again')) {
        s.missed.push(ex.id);
        s.queue.push({ ...ex, id: ex.id + ':again', ...(ex.kind === 'choice' || ex.kind === 'fact' ? { options: [...ex.options].reverse() } : {}) } as Exercise);
      }
    }
    s.index += 1;
    setOutcome(null);
    setCheckFn(null);
    if (s.index >= s.queue.length) finish(s);
    else setSession(s);
  }

  function onCheck() {
    if (!check) return;
    const o = check();
    setOutcome(o);
    if (o.verdict === 'wrong') sfx.wrong();
    else sfx.correct();
  }

  function soundOff() {
    if (!session) return;
    const rest = session.queue.slice(session.index).map(withoutAudio).filter((e): e is Exercise => !!e);
    stopSpeaking();
    setOutcome(null);
    setCheckFn(null);
    setSession({ ...session, audioOff: true, queue: [...session.queue.slice(0, session.index), ...rest] });
  }

  function quit() {
    saveSession(null);
    navigate({ name: 'home' }, true);
  }

  if (result) {
    return <LessonEnd outcome={result} kind={kind} lessonTitle={lesson?.title} />;
  }

  if (empty) {
    return (
      <div class="screen center">
        <Mascot mood="comfort" />
        <h2>Noch nichts zu wiederholen</h2>
        <p class="muted">Mach zuerst ein paar Lektionen – dann hat Točka Wörter zum Üben für dich.</p>
        <button class="btn block" onClick={quit}>Zum Lernpfad</button>
      </div>
    );
  }

  if (showTip && tip) {
    return (
      <div class="player">
        <div class="player-top">
          <button class="icon-btn" aria-label="Schließen" onClick={quit}>✕</button>
        </div>
        <div class="player-body">
          <Mascot mood="cheer" size={110} />
          <p class="center muted" style={{ marginTop: '6px' }}>Neues Thema! Kurz lesen, dann geht's los.</p>
          <TipCard tip={tip} />
        </div>
        <div class="player-foot">
          <button class="btn block" onClick={() => setShowTip(false)}>Los geht's</button>
        </div>
      </div>
    );
  }

  if (!session || !ex) {
    return (
      <div class="screen center">
        <Mascot mood="happy" bob />
        <p class="muted">Einen Moment …</p>
      </div>
    );
  }

  const isIntro = ex.kind === 'intro';
  const selfDone = ex.kind === 'pairs' || ex.kind === 'speak';
  const fb = outcome?.verdict;

  return (
    <div class="player">
      <div class="player-top">
        <button class="icon-btn" aria-label="Lektion abbrechen" onClick={() => setConfirmQuit(true)}>✕</button>
        <div class="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={doneCount}>
          <div style={{ width: `${Math.min(100, (doneCount / total) * 100)}%` }} />
        </div>
        {audio ? (
          <button class="icon-btn" aria-label="Gerade kein Ton" title="Gerade kein Ton" onClick={soundOff}>🔇</button>
        ) : (
          <span class="icon-btn" aria-hidden="true" style={{ opacity: 0.35 }}>🔇</span>
        )}
      </div>
      <div class="player-body" key={ex.id}>
        <ExerciseView
          ex={ex}
          lib={lib}
          locked={!!outcome}
          setCheck={setCheck}
          done={(o) => advance(o)}
          autoplay={settings.autoplay}
          audio={audio}
        />
      </div>
      {!selfDone && (
        <div ref={footRef} class={`player-foot${fb === 'correct' ? ' ok' : fb === 'almost' ? ' almost' : fb === 'wrong' ? ' wrong' : ''}`}>
          {outcome && <Feedback o={outcome} />}
          {isIntro ? (
            <button class="btn block" onClick={() => advance(null)}>Weiter</button>
          ) : outcome ? (
            <button class={`btn block${fb === 'wrong' ? ' coral' : fb === 'almost' ? ' sun' : ' ok'}`} onClick={() => advance(outcome)} autoFocus>
              Weiter
            </button>
          ) : (
            <button class="btn block" disabled={!check} onClick={onCheck}>Prüfen</button>
          )}
        </div>
      )}
      {confirmQuit && (
        <Confirm
          title="Lektion abbrechen?"
          text="Dein Fortschritt in dieser Lektion geht verloren."
          yes="Abbrechen"
          no="Weiterlernen"
          danger
          onYes={quit}
          onNo={() => setConfirmQuit(false)}
        />
      )}
    </div>
  );
}

function Feedback({ o }: { o: Outcome }) {
  const [title] = useState(() => (o.verdict === 'wrong' ? comfort() : praise()));
  if (o.verdict === 'correct') {
    return <div class="feedback-title ok">✓ {title}</div>;
  }
  if (o.verdict === 'almost') {
    return (
      <>
        <div class="feedback-title almost">Fast richtig!</div>
        <div class="feedback-text">
          {o.reason === 'diacritics' ? 'Achte auf die Zeichen: ' : 'Kleiner Tippfehler: '}
          <b>
            {diffMarks(o.expected, o.given ?? '').map((c, i) => (c.mark ? <mark key={i}>{c.ch}</mark> : c.ch))}
          </b>
        </div>
      </>
    );
  }
  return (
    <>
      <div class="feedback-title wrong">✗ {title}</div>
      {o.expected && (
        <div class="feedback-text">
          Richtig ist: <b>{o.expected}</b>
        </div>
      )}
    </>
  );
}
