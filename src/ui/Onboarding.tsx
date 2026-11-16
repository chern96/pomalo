import { useState } from 'preact/hooks';
import { sfx } from '../audio/sfx';
import { initVoices, speak } from '../audio/tts';
import { update } from '../app/store';
import { DAILY_GOALS, type DailyGoal } from '../state/schema';
import { requestPersistence } from '../state/storage';
import { useVoice } from './common';
import { Mascot } from './Mascot';

export function VoiceHelp() {
  return (
    <div class="card" style={{ textAlign: 'left' }}>
      <b>Kroatische Stimme laden (iPhone)</b>
      <ol style={{ paddingLeft: '20px', margin: '8px 0', lineHeight: 1.5 }}>
        <li>Öffne <b>Einstellungen</b> → <b>Bedienungshilfen</b>.</li>
        <li>Tippe auf <b>Lesen &amp; Sprechen</b> (bei älteren iOS-Versionen: <b>Gesprochene Inhalte</b>).</li>
        <li>Tippe auf <b>Stimmen</b> → <b>Kroatisch</b>.</li>
        <li>Lade die Stimme <b>Lana</b> herunter (am besten „Erweitert“).</li>
        <li>Schließe Pomalo ganz und öffne es neu.</li>
      </ol>
      <p class="small muted" style={{ margin: 0 }}>Bis dahin überspringt Pomalo alle Höraufgaben.</p>
    </div>
  );
}

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<DailyGoal>(1);
  const [speaker, setSpeaker] = useState<'m' | 'f' | null>(null);
  const [heard, setHeard] = useState<boolean | null>(null);
  const voice = useVoice();

  const finish = () => {
    update((s) => ({ ...s, onboarded: true, settings: { ...s.settings, dailyGoal: goal, speaker: speaker ?? 'm' } }));
    void requestPersistence();
  };

  return (
    <div class="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      {step === 0 && (
        <div class="stack center" style={{ flex: 1, justifyContent: 'center' }}>
          <div class="bubble">Bok! Ja sam Točka. 🐾<br />Ich lerne mit dir Kroatisch – pomalo, also Schritt für Schritt.</div>
          <Mascot mood="happy" size={180} bob />
          <h1>Willkommen bei Pomalo</h1>
          <p class="muted">Ein paar Minuten am Tag reichen. Los geht's!</p>
          <button class="btn block" onClick={() => { sfx.unlock(); setStep(1); }}>Los geht's</button>
        </div>
      )}

      {step === 1 && (
        <div class="stack" style={{ flex: 1 }}>
          <Mascot mood="cheer" size={110} />
          <h2 class="center">Wie viel möchtest du am Tag schaffen?</h2>
          <p class="center muted">Eine Runde dauert etwa 5 Minuten. Du kannst das jederzeit ändern.</p>
          <div class="options">
            {DAILY_GOALS.map((g) => (
              <button key={g} class={`option${g === goal ? ' selected' : ''}`} onClick={() => setGoal(g)}>
                {g} {g === 1 ? 'Runde' : 'Runden'} · {['locker', 'normal', 'ehrgeizig', '', 'sehr ehrgeizig'][g - 1]}
              </button>
            ))}
          </div>
          <span class="spacer" />
          <button class="btn block" onClick={() => setStep(2)}>Weiter</button>
        </div>
      )}

      {step === 2 && (
        <div class="stack" style={{ flex: 1 }}>
          <Mascot mood="happy" size={110} />
          <h2 class="center">Welche Ich-Form brauchst du?</h2>
          <p class="center muted">
            Manche Wörter ändern sich mit dem Geschlecht der sprechenden Person: <b>umoran sam</b> / <b>umorna sam</b> (ich bin müde).
            Sätze über dich nutzen deine Form – die andere lernst du trotzdem kennen.
          </p>
          <div class="options">
            <button class={`option${speaker === 'm' ? ' selected' : ''}`} onClick={() => setSpeaker('m')}>
              Männlich – <b>umoran sam</b>
            </button>
            <button class={`option${speaker === 'f' ? ' selected' : ''}`} onClick={() => setSpeaker('f')}>
              Weiblich – <b>umorna sam</b>
            </button>
          </div>
          <span class="spacer" />
          <button class="btn block" disabled={!speaker} onClick={() => { void initVoices(); setStep(3); }}>Weiter</button>
        </div>
      )}

      {step === 3 && (
        <div class="stack center" style={{ flex: 1 }}>
          <Mascot mood="cheer" size={110} />
          <h2>Hörst du die kroatische Stimme?</h2>
          <p class="muted">Mach den Ton an und tippe auf den Lautsprecher.</p>
          <div>
            <button
              class="speaker big"
              aria-label="Testsatz abspielen"
              onClick={() => {
                sfx.unlock();
                speak('Dobar dan! Ja sam Točka.');
              }}
            >
              🔊
            </button>
          </div>
          {voice.checked && !voice.ready && (
            <>
              <p><b>Auf diesem Gerät fehlt die kroatische Stimme.</b></p>
              <VoiceHelp />
            </>
          )}
          {heard === false && voice.ready && (
            <p class="small muted">Prüfe den Stummschalter an der Seite des iPhones und die Lautstärke. Klappt es nicht, lade die Stimme neu:</p>
          )}
          {heard === false && voice.ready && <VoiceHelp />}
          <span class="spacer" />
          <div class="stack">
            <button class="btn ok block" onClick={() => { setHeard(true); finish(); }}>Ja, ich höre sie</button>
            <button class="btn ghost block" onClick={() => (heard === false || !voice.ready ? finish() : setHeard(false))}>
              {heard === false || (voice.checked && !voice.ready) ? 'Trotzdem weiter' : 'Nein, ich höre nichts'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function InstallGuide({ onContinue }: { onContinue: () => void }) {
  return (
    <div class="screen">
      <div class="stack center">
        <Mascot mood="happy" size={120} />
        <h1>Hol dir Pomalo aufs iPhone</h1>
        <p class="muted">Als App auf dem Home-Bildschirm läuft Pomalo im Vollbild und auch offline.</p>
      </div>
      <div class="card" style={{ margin: '16px 0' }}>
        <ol style={{ paddingLeft: '20px', margin: 0, lineHeight: 1.7 }}>
          <li>Tippe in Safari unten auf <b>Teilen</b> (das Quadrat mit dem Pfeil nach oben ⬆️). Siehst du keine Leiste, tippe erst auf <b>•••</b>.</li>
          <li>Wähle <b>Zum Home-Bildschirm</b>.</li>
          <li>Tippe oben rechts auf <b>Hinzufügen</b>.</li>
          <li>Öffne Pomalo ab jetzt über das neue Symbol.</li>
        </ol>
      </div>
      <div class="card" style={{ marginBottom: '16px' }}>
        <b>⚠️ Wichtig</b>
        <p class="small" style={{ margin: '6px 0 0' }}>
          Safari und die installierte App speichern getrennt. Was du hier im Browser lernst, siehst du in der App nicht.
        </p>
      </div>
      <button class="btn ghost block" onClick={onContinue}>Trotzdem im Browser weiter</button>
    </div>
  );
}
