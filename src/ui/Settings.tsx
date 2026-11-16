import { useState } from 'preact/hooks';
import { setSfxEnabled } from '../audio/sfx';
import { voiceName } from '../audio/tts';
import { APP_VERSION, BUILD_DATE } from '../app/pwa';
import { getState, setState, update, useAppState } from '../app/store';
import { backupFileName, exportBackup, parseBackup, type ImportPreview } from '../state/backup';
import { dayKey } from '../state/dates';
import { StateError } from '../state/migrate';
import { DAILY_GOALS, defaultState, type Settings as S } from '../state/schema';
import { Confirm, Sheet, useVoice } from './common';
import { VoiceHelp } from './Onboarding';

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label class="switch">
      <input type="checkbox" role="switch" aria-label={label} checked={checked} onChange={(e) => onChange((e.target as HTMLInputElement).checked)} />
      <span />
    </label>
  );
}

export function Settings() {
  const s = useAppState();
  const voice = useVoice();
  const [msg, setMsg] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const set = <K extends keyof S>(k: K, v: S[K]) => update((st) => ({ ...st, settings: { ...st.settings, [k]: v } }));

  const exportFile = async () => {
    const text = exportBackup(getState());
    const name = backupFileName(dayKey());
    const file = new File([text], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Pomalo-Fortschritt' });
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const copyText = async () => {
    const text = exportBackup(getState());
    try {
      await navigator.clipboard.writeText(text);
      setMsg('Sicherung kopiert. Füge sie z. B. in eine Notiz ein.');
    } catch {
      setImportText(text);
      setImportOpen(true);
      setMsg('Kopieren ging nicht automatisch – markiere den Text unten und kopiere ihn.');
    }
  };

  const check = (text: string) => {
    try {
      setPreview(parseBackup(text, dayKey()));
      setImportError(null);
    } catch (e) {
      setPreview(null);
      setImportError(e instanceof StateError ? e.message : 'Die Sicherung konnte nicht gelesen werden.');
    }
  };

  return (
    <div class="screen with-nav">
      <h1>Einstellungen</h1>

      <div class="card" style={{ marginBottom: '14px' }}>
        <h3>Tagesziel</h3>
        <div class="segmented" role="radiogroup" aria-label="Tagesziel">
          {DAILY_GOALS.map((g) => (
            <button key={g} role="radio" aria-checked={s.settings.dailyGoal === g} class={s.settings.dailyGoal === g ? 'on' : ''} onClick={() => set('dailyGoal', g)}>
              {g}
            </button>
          ))}
        </div>
        <p class="small muted" style={{ margin: '8px 0 0' }}>Runden pro Tag (Lektionen und Wiederholungen).</p>
      </div>

      <div class="card" style={{ marginBottom: '14px' }}>
        <h3>Meine Ich-Form</h3>
        <div class="segmented">
          <button class={s.settings.speaker === 'm' ? 'on' : ''} onClick={() => set('speaker', 'm')}>umoran (m)</button>
          <button class={s.settings.speaker === 'f' ? 'on' : ''} onClick={() => set('speaker', 'f')}>umorna (w)</button>
        </div>
      </div>

      <div class="card" style={{ marginBottom: '14px' }}>
        <div class="setting"><span>Effekt-Töne</span><Switch label="Effekt-Töne" checked={s.settings.sfx} onChange={(v) => { setSfxEnabled(v); set('sfx', v); }} /></div>
        <div class="setting"><span>Wörter automatisch vorlesen</span><Switch label="Automatisch vorlesen" checked={s.settings.autoplay} onChange={(v) => set('autoplay', v)} /></div>
        <div class="setting"><span>Sprechübungen</span><Switch label="Sprechübungen" checked={s.settings.speaking} onChange={(v) => set('speaking', v)} /></div>
      </div>

      <div class="card" style={{ marginBottom: '14px' }}>
        <h3>Kroatische Stimme</h3>
        {voice.ready ? (
          <p style={{ margin: 0 }}>✅ Gefunden: {voiceName()}</p>
        ) : (
          <>
            <p>❌ Keine kroatische Stimme gefunden.</p>
            <VoiceHelp />
          </>
        )}
      </div>

      <div class="card" style={{ marginBottom: '14px' }}>
        <h3>Fortschritt sichern</h3>
        <p class="small muted">Dein Fortschritt liegt nur auf diesem Gerät. Sichere ihn ab und zu, z. B. in der Dateien-App oder als Notiz.</p>
        <div class="stack">
          <button class="btn block" onClick={exportFile}>💾 Als Datei sichern</button>
          <button class="btn ghost block" onClick={copyText}>📋 Als Text kopieren</button>
          <button class="btn ghost block" onClick={() => { setImportOpen(true); setImportText(''); setPreview(null); setImportError(null); }}>⬆️ Sicherung laden</button>
        </div>
        {msg && <p class="small" style={{ marginTop: '10px' }}>{msg}</p>}
      </div>

      <div class="card" style={{ marginBottom: '14px' }}>
        <h3>Über Pomalo</h3>
        <p class="small" style={{ margin: 0 }}>Version {APP_VERSION} · {new Date(BUILD_DATE).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        <p class="small muted" style={{ margin: '6px 0 0' }}><a href="#/tips">💡 Alle Grammatik-Tipps</a></p>
      </div>

      <button class="btn flat block" style={{ color: 'var(--coral)' }} onClick={() => setConfirmReset(true)}>Fortschritt löschen …</button>

      {importOpen && (
        <Sheet onClose={() => setImportOpen(false)}>
          <h2>Sicherung laden</h2>
          <label class="btn ghost block" style={{ marginBottom: '10px' }}>
            📄 Datei auswählen
            <input
              type="file"
              accept="application/json,.json,text/plain"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) {
                  const t = await f.text();
                  setImportText(t);
                  check(t);
                }
              }}
            />
          </label>
          <p class="small muted">… oder den Sicherungstext hier einfügen:</p>
          <textarea
            class="text-answer"
            value={importText}
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck={false}
            onInput={(e) => { const t = (e.target as HTMLTextAreaElement).value; setImportText(t); if (t.trim()) check(t); }}
          />
          {importError && <p style={{ color: 'var(--coral-dark)' }}>{importError}</p>}
          {preview && (
            <p class="small">
              Gefunden: <b>{preview.words}</b> Wörter, <b>{preview.lessons}</b> Lektionen, <b>{preview.xp}</b> XP
              {preview.exportedAt ? `, gesichert am ${new Date(preview.exportedAt).toLocaleDateString('de-DE')}` : ''}.
            </p>
          )}
          <div class="stack" style={{ marginTop: '10px' }}>
            <button class="btn ghost block" onClick={() => setImportOpen(false)}>Schließen</button>
          </div>
          {preview && (
            <Confirm
              title="Fortschritt ersetzen?"
              text={`Dein jetziger Fortschritt (${Object.keys(getState().words).length} Wörter, ${getState().xp} XP) wird durch die Sicherung ersetzt.`}
              yes="Ja, Sicherung laden"
              danger
              onYes={() => {
                setState({ ...preview.state, onboarded: true });
                setPreview(null);
                setImportOpen(false);
                setMsg('Sicherung geladen ✓');
              }}
              onNo={() => setPreview(null)}
            />
          )}
        </Sheet>
      )}

      {confirmReset && (
        <Confirm
          title="Wirklich alles löschen?"
          text="Alle Wörter, XP, Streak und Abzeichen auf diesem Gerät gehen verloren. Das lässt sich nicht rückgängig machen – außer mit einer Sicherung."
          yes="Ja, alles löschen"
          danger
          onYes={() => {
            setState({ ...defaultState(dayKey()), onboarded: false });
            setConfirmReset(false);
            location.hash = '#/';
          }}
          onNo={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
}
