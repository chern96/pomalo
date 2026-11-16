import { useEffect } from 'preact/hooks';
import { sfx } from '../audio/sfx';
import { navigate } from '../app/router';
import type { SessionKind } from '../app/session';
import { BADGES } from '../state/badges';
import { dayKey } from '../state/dates';
import { goalProgress, type ActivityOutcome } from '../state/progress';
import { Confetti } from './common';
import { Mascot } from './Mascot';

const CHEERS = ['Bravo!', 'Odlično!', 'Svaka čast!', 'Super si!'];

export function LessonEnd({ outcome, kind, lessonTitle }: { outcome: ActivityOutcome; kind: SessionKind; lessonTitle?: string }) {
  useEffect(() => sfx.finish(), []);
  const { state } = outcome;
  const goal = goalProgress(state, dayKey());
  const cheer = CHEERS[state.xp % CHEERS.length];
  const title = kind === 'lesson' ? 'Lektion geschafft!' : kind === 'review' ? 'Wiederholung geschafft!' : 'Schnell geübt!';
  const streakUp = outcome.streakAfter > outcome.streakBefore;

  return (
    <div class="screen center">
      <Confetti />
      <Mascot mood="cheer" size={150} bob />
      <h1 class="pop" style={{ color: 'var(--sea)' }}>{cheer}</h1>
      <h2>{title}</h2>
      {lessonTitle && <p class="muted">{lessonTitle}{outcome.stageAfter ? ` · Stufe ${outcome.stageAfter} ${'👑'.repeat(outcome.stageAfter)}` : ''}</p>}

      <div class="statgrid" style={{ margin: '18px 0' }}>
        <div class="card stat pop">
          <div class="v" style={{ color: 'var(--sea)' }}>+{outcome.xp}</div>
          <div class="l">XP</div>
        </div>
        <div class="card stat pop">
          <div class="v" style={{ color: 'var(--sun-dark)' }}>🔥 {outcome.streakAfter}</div>
          <div class="l">{streakUp ? 'Streak verlängert!' : 'Tage Streak'}</div>
        </div>
      </div>

      <div class="card" style={{ marginBottom: '12px' }}>
        <div class="goal">
          <span>🎯</span>
          <div class="goalbar"><div style={{ width: `${Math.min(100, (goal.done / goal.goal) * 100)}%` }} /></div>
          <b>{Math.min(goal.done, goal.goal)}/{goal.goal}</b>
        </div>
        {outcome.goalReachedNow && <p style={{ margin: '10px 0 0', fontWeight: 700 }}>Tagesziel erreicht! 🎉</p>}
      </div>

      {outcome.freezeEarned && (
        <div class="card" style={{ marginBottom: '12px' }}>
          <b>🧊 Streak-Schutz verdient!</b>
          <p class="small muted" style={{ margin: '4px 0 0' }}>Verpasst du einen Tag, rettet er deinen Streak. Du hast jetzt {state.streak.freezes}.</p>
        </div>
      )}

      {outcome.newBadges.length > 0 && (
        <div class="card" style={{ marginBottom: '12px' }}>
          <b>Neues Abzeichen!</b>
          <div class="badges" style={{ marginTop: '10px' }}>
            {outcome.newBadges.map((id) => {
              const b = BADGES.find((x) => x.id === id)!;
              return (
                <div class="badge pop" key={id}>
                  <div class="bi">{b.icon}</div>
                  <div class="bt">{b.title}</div>
                  <div class="bd">{b.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button class="btn block" style={{ marginTop: '8px' }} onClick={() => navigate({ name: 'home' }, true)}>
        Weiter
      </button>
    </div>
  );
}
