import { useEffect, useState } from 'preact/hooks';
import { library as lib } from '../content';
import type { Lesson } from '../content/types';
import { countDue } from '../engine/srs';
import { getState, update, useAppState, useToday } from '../app/store';
import { href, navigate } from '../app/router';
import { anySession } from '../app/session';
import { goalProgress, lessonUnlocked, liveStreak, MAX_STAGE, playedToday } from '../state/progress';
import { Sheet } from './common';
import { Mascot } from './Mascot';

export function Home() {
  const s = useAppState();
  const today = useToday();
  const [open, setOpen] = useState<Lesson | null>(null);
  const streak = liveStreak(s, today);
  const goal = goalProgress(s, today);
  const learned = Object.keys(s.words).length;
  const due = countDue(s.words, today);
  const resume = anySession();
  const currentId = lib.lessons.find((l) => lessonUnlocked(s, lib, l.id) && !(s.lessons[l.id]?.stage))?.id;

  useEffect(() => {
    document.getElementById('current-node')?.scrollIntoView({ block: 'center' });
  }, []);

  const dismissNotice = () => update((st) => ({ ...st, notices: st.notices.slice(1) }));
  const notice = s.notices[0];

  return (
    <div class="screen with-nav">
      <div class="topstats">
        <span class={`pill flame${playedToday(s, today) ? '' : ' off'}`} aria-label={`Streak ${streak} Tage`}>🔥 {streak}</span>
        {s.streak.freezes > 0 && <span class="pill" aria-label={`${s.streak.freezes} Streak-Schutz`}>🧊 {s.streak.freezes}</span>}
        <span class="pill xp">⭐ {s.xp} XP</span>
        <span class="spacer" />
      </div>

      {notice && (
        <div class="card notice pop">
          <Mascot mood={notice.type === 'freeze-used' ? 'sleep' : 'comfort'} size={72} />
          <div style={{ flex: 1 }}>
            {notice.type === 'freeze-used' ? (
              <p style={{ margin: 0 }}>
                <b>Streak gerettet!</b> Du hast {notice.days === 1 ? 'einen Tag' : `${notice.days} Tage`} verpasst – dein Streak-Schutz ist eingesprungen. 🧊
              </p>
            ) : (
              <p style={{ margin: 0 }}>
                <b>Dein Streak ist weg</b> ({notice.was} Tage). Nije strašno – heute fängst du neu an!
              </p>
            )}
            <button class="btn flat small" onClick={dismissNotice}>Okay</button>
          </div>
        </div>
      )}

      <div class="card" style={{ marginBottom: '12px' }}>
        <div class="row" style={{ marginBottom: '8px' }}>
          <b>Tagesziel</b>
          <span class="spacer" />
          <span class="muted small">{Math.min(goal.done, goal.goal)} von {goal.goal} {goal.goal === 1 ? 'Runde' : 'Runden'}</span>
        </div>
        <div class="goal">
          <div class="goalbar"><div style={{ width: `${Math.min(100, (goal.done / goal.goal) * 100)}%` }} /></div>
          <span>{goal.done >= goal.goal ? '🏆' : '🎯'}</span>
        </div>
      </div>

      {resume && (
        <a class="btn sun block" style={{ marginBottom: '12px' }} href={resume.kind === 'lesson' && resume.lessonId ? href({ name: 'lesson', lessonId: resume.lessonId }) : `#/${resume.kind}`}>
          ▶ Angefangene Runde fortsetzen
        </a>
      )}

      {learned > 0 && (
        <div class="card" style={{ marginBottom: '8px' }}>
          <div class="row" style={{ marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <b>{due > 0 ? `${due} ${due === 1 ? 'Wort ist' : 'Wörter sind'} fällig` : 'Alles wiederholt 👍'}</b>
              <div class="small muted">{learned} Wörter gelernt</div>
            </div>
          </div>
          <div class="row">
            <a class="btn small" style={{ flex: 1 }} href="#/review">🔁 Wiederholen</a>
            <a class={`btn small ghost${learned < 4 ? ' disabled' : ''}`} style={{ flex: 1 }} href={learned >= 4 ? '#/quick' : undefined} aria-disabled={learned < 4}>
              ⚡ Schnell üben
            </a>
          </div>
        </div>
      )}

      {lib.path.map(({ entry, unit }) => (
        <section key={entry.id}>
          <div class={`unit-head${unit ? '' : ' soon'}`}>
            <div class="num">Einheit {entry.number}{unit ? '' : ' · kommt bald'}</div>
            <h2>{entry.title}</h2>
            <div class="gram">{entry.grammar}</div>
            {unit && unit.tips.length > 0 && <a class="tiplink" href={href({ name: 'tips', tipId: unit.tips[0]!.id })}>💡 Tipps lesen</a>}
          </div>
          {unit ? (
            <div class="path">
              {unit.lessons.map((l, i) => {
                const stage = s.lessons[l.id]?.stage ?? 0;
                const unlocked = lessonUnlocked(s, lib, l.id);
                const offset = Math.round(Math.sin((i + entry.number) * 1.3) * 60);
                const cls = !unlocked ? 'locked' : stage >= MAX_STAGE ? 'gold' : '';
                return (
                  <div class="node-wrap" key={l.id} style={{ transform: `translateX(${offset}px)` }}>
                    <button
                      id={l.id === currentId ? 'current-node' : undefined}
                      class={`node ${cls}${l.id === currentId ? ' current' : ''}`}
                      disabled={!unlocked}
                      aria-label={`${l.title}${unlocked ? '' : ' (gesperrt)'}`}
                      onClick={() => setOpen(l)}
                    >
                      {!unlocked ? '🔒' : stage >= MAX_STAGE ? '👑' : stage > 0 ? '★' : '●'}
                    </button>
                    <div class="crowns" aria-label={`Stufe ${stage} von 3`}>{'👑'.repeat(stage)}</div>
                    <div class="node-label">{l.title}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div class="list" style={{ opacity: 0.6 }}>
              {entry.lessons.map((t) => (
                <div class="small muted" key={t} style={{ paddingLeft: '8px' }}>🔒 {t}</div>
              ))}
            </div>
          )}
        </section>
      ))}

      <div class="center" style={{ marginTop: '32px' }}>
        <Mascot mood="sleep" size={90} />
        <p class="muted small">Mehr Einheiten kommen bald. Pomalo – immer mit der Ruhe!</p>
      </div>

      {open && <LessonSheet lesson={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function LessonSheet({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const s = getState();
  const stage = s.lessons[lesson.id]?.stage ?? 0;
  const unit = lib.unitOfLesson.get(lesson.id)!;
  const words = lesson.newWords.map((id) => lib.words.get(id)!.hr);
  const next = Math.min(MAX_STAGE, stage + 1);
  const desc = ['Kennenlernen: viel Auswählen und Zuordnen.', 'Festigen: mehr Bauen und Hören.', 'Meistern: vor allem Tippen und Hören.'];
  return (
    <Sheet onClose={onClose}>
      <div class="muted small">Einheit {unit.number} · {unit.title}</div>
      <h2>{lesson.title}</h2>
      <p class="small">{words.join(' · ')}</p>
      <div class="row" style={{ margin: '8px 0 12px' }}>
        <span style={{ fontSize: '22px' }}>{'👑'.repeat(stage)}{'♔'.repeat(MAX_STAGE - stage)}</span>
        <span class="muted small">Stufe {stage} von {MAX_STAGE}</span>
      </div>
      <p class="muted small">{stage >= MAX_STAGE ? 'Alle Stufen geschafft – üben geht immer!' : `Stufe ${next}: ${desc[next - 1]}`}</p>
      <div class="stack">
        <button class="btn block" onClick={() => { onClose(); navigate({ name: 'lesson', lessonId: lesson.id }); }}>
          {stage === 0 ? 'Starten' : stage >= MAX_STAGE ? 'Nochmal üben' : `Stufe ${next} starten`}
        </button>
        <button class="btn ghost block" onClick={onClose}>Schließen</button>
      </div>
    </Sheet>
  );
}
