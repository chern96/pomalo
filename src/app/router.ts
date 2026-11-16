import { useEffect, useState } from 'preact/hooks';

// Hash navigation (#/words) – GitHub Pages has no server-side routing.

export type Route =
  | { name: 'home' }
  | { name: 'lesson'; lessonId: string }
  | { name: 'review' }
  | { name: 'quick' }
  | { name: 'words' }
  | { name: 'stats' }
  | { name: 'settings' }
  | { name: 'tips'; tipId?: string };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  switch (parts[0]) {
    case 'lesson':
      return parts[1] ? { name: 'lesson', lessonId: parts[1] } : { name: 'home' };
    case 'review':
      return { name: 'review' };
    case 'quick':
      return { name: 'quick' };
    case 'words':
      return { name: 'words' };
    case 'stats':
      return { name: 'stats' };
    case 'settings':
      return { name: 'settings' };
    case 'tips':
      return { name: 'tips', tipId: parts[1] };
    default:
      return { name: 'home' };
  }
}

export function href(r: Route): string {
  switch (r.name) {
    case 'home':
      return '#/';
    case 'lesson':
      return `#/lesson/${encodeURIComponent(r.lessonId)}`;
    case 'tips':
      return r.tipId ? `#/tips/${encodeURIComponent(r.tipId)}` : '#/tips';
    default:
      return `#/${r.name}`;
  }
}

export function navigate(r: Route, replace = false): void {
  const h = href(r);
  if (replace) history.replaceState(null, '', h);
  else location.hash = h;
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
