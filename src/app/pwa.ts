import { registerSW } from 'virtual:pwa-register';
import { isLessonActive } from './session';

// Updates: check on every start and whenever the app comes back to the foreground.
// A new version is applied automatically, but never during a running lesson.

let pending = false;
let apply: (() => void) | null = null;

export function initPwa(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      pending = true;
      tryApplyUpdate();
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => {
        if (navigator.onLine !== false) reg.update().catch(() => undefined);
      };
      check();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      setInterval(check, 60 * 60 * 1000);
    },
  });
  apply = () => void updateSW(true);
}

export function tryApplyUpdate(): void {
  if (pending && apply && !isLessonActive()) {
    pending = false;
    apply();
  }
}

export function isStandalone(): boolean {
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true
  );
}

export const APP_VERSION = __APP_VERSION__;
export const BUILD_DATE = __BUILD_DATE__;
