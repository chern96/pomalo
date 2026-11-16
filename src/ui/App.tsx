import { useEffect, useState } from 'preact/hooks';
import { initVoices } from '../audio/tts';
import { setSfxEnabled } from '../audio/sfx';
import { isStandalone } from '../app/pwa';
import { useRoute, type Route } from '../app/router';
import { update, useAppState } from '../app/store';
import { Home } from './Home';
import { InstallGuide, Onboarding } from './Onboarding';
import { Player } from './Player';
import { Settings } from './Settings';
import { Stats } from './Stats';
import { Tips } from './Tips';
import { Words } from './Words';

const TABS: { route: Route['name']; href: string; icon: string; label: string }[] = [
  { route: 'home', href: '#/', icon: '🏝️', label: 'Lernen' },
  { route: 'words', href: '#/words', icon: '📖', label: 'Wörter' },
  { route: 'stats', href: '#/stats', icon: '📊', label: 'Statistik' },
  { route: 'settings', href: '#/settings', icon: '⚙️', label: 'Einstellungen' },
];

export function App() {
  const s = useAppState();
  const route = useRoute();
  const [standalone] = useState(isStandalone);

  useEffect(() => {
    void initVoices();
  }, []);
  useEffect(() => setSfxEnabled(s.settings.sfx), [s.settings.sfx]);

  if (!standalone && !s.settings.browserOk) {
    return <InstallGuide onContinue={() => update((st) => ({ ...st, settings: { ...st.settings, browserOk: true } }))} />;
  }
  if (!s.onboarded) return <Onboarding />;

  if (route.name === 'lesson') return <Player key={route.lessonId} kind="lesson" lessonId={route.lessonId} />;
  if (route.name === 'review') return <Player key="review" kind="review" />;
  if (route.name === 'quick') return <Player key="quick" kind="quick" />;

  return (
    <>
      {route.name === 'home' && <Home />}
      {route.name === 'words' && <Words />}
      {route.name === 'stats' && <Stats />}
      {route.name === 'settings' && <Settings />}
      {route.name === 'tips' && <Tips tipId={route.tipId} />}
      <nav class="tabbar">
        {TABS.map((t) => (
          <a key={t.route} href={t.href} class={route.name === t.route ? 'active' : ''} aria-current={route.name === t.route ? 'page' : undefined}>
            <span class="ti">{t.icon}</span>
            {t.label}
          </a>
        ))}
      </nav>
    </>
  );
}
