import { BADGES } from '../state/badges';
import { weekdayShort } from '../state/dates';
import { liveStreak, xpLastDays } from '../state/progress';
import { useAppState, useToday } from '../app/store';

export function Stats() {
  const s = useAppState();
  const today = useToday();
  const days = xpLastDays(s, today, 7);
  const max = Math.max(10, ...days.map((d) => d.xp));
  const lessonsDone = Object.values(s.lessons).filter((l) => l.stage > 0).length;

  return (
    <div class="screen with-nav">
      <h1>Statistik</h1>
      <div class="statgrid" style={{ margin: '12px 0' }}>
        <div class="card stat"><div class="v">{Object.keys(s.words).length}</div><div class="l">Wörter gelernt</div></div>
        <div class="card stat"><div class="v">{s.xp}</div><div class="l">XP gesamt</div></div>
        <div class="card stat"><div class="v">🔥 {liveStreak(s, today)}</div><div class="l">Streak aktuell</div></div>
        <div class="card stat"><div class="v">🏆 {s.streak.best}</div><div class="l">Streak-Rekord</div></div>
        <div class="card stat"><div class="v">{lessonsDone}</div><div class="l">Lektionen geschafft</div></div>
        <div class="card stat"><div class="v">🧊 {s.streak.freezes}</div><div class="l">Streak-Schutz (max. 2)</div></div>
      </div>

      <div class="card" style={{ marginBottom: '16px' }}>
        <b>XP der letzten 7 Tage</b>
        <div class="bars" role="img" aria-label="XP der letzten 7 Tage">
          {days.map((d) => (
            <div class="bar" key={d.day}>
              <b>{d.xp || ''}</b>
              <div style={{ height: `${(d.xp / max) * 100}%` }} />
              <span>{d.day === today ? 'Heute' : weekdayShort(d.day)}</span>
            </div>
          ))}
        </div>
      </div>

      <h2>Abzeichen</h2>
      <p class="muted small">{Object.keys(s.badges).length} von {BADGES.length}</p>
      <div class="badges">
        {BADGES.map((b) => (
          <div key={b.id} class={`badge${s.badges[b.id] ? '' : ' locked'}`}>
            <div class="bi">{b.icon}</div>
            <div class="bt">{b.title}</div>
            <div class="bd">{b.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
