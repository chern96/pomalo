import { useEffect } from 'preact/hooks';
import { library as lib } from '../content';
import { useAppState } from '../app/store';
import { lessonUnlocked } from '../state/progress';
import { TipCard } from './common';

/** All grammar tips of units the learner has reached. */
export function Tips({ tipId }: { tipId?: string }) {
  const s = useAppState();
  useEffect(() => {
    if (tipId) document.getElementById(`tip-${tipId}`)?.scrollIntoView({ block: 'start' });
  }, [tipId]);
  const units = lib.units.filter((u) => u.lessons.some((l) => lessonUnlocked(s, lib, l.id)));
  return (
    <div class="screen with-nav">
      <div class="row">
        <a class="icon-btn" href="#/" aria-label="Zurück">←</a>
        <h1 style={{ margin: 0 }}>Tipps</h1>
      </div>
      {units.map((u) => (
        <section key={u.id}>
          <h2 style={{ marginTop: '20px' }}>Einheit {u.number}: {u.title}</h2>
          <div class="stack">
            {u.tips.map((t) => (
              <div id={`tip-${t.id}`} key={t.id}>
                <TipCard tip={t} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
