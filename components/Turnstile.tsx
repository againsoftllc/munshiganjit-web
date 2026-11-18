'use client';
/* Cloudflare Turnstile — the real "verify you are human" check. The site key is NEXT_PUBLIC_TURNSTILE_SITE_KEY; without it nothing is shown
   and nothing is asked (the server skips the check as well when it has no secret key). */
import { useEffect, useRef } from 'react';

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

interface TurnstileApi {
  render: (el: HTMLElement, o: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}
declare global { interface Window { turnstile?: TurnstileApi; onTurnstileLoad?: () => void } }

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loading = null; reject(new Error('Turnstile could not load')); };
    document.head.appendChild(s);
  });
  return loading;
}

/** `onToken(token)` when the visitor passes; `onToken('')` when the check expires or fails. `resetKey` changes -> the check starts again. */
export default function Turnstile({ onToken, resetKey = 0 }: { onToken: (t: string) => void; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | undefined>(undefined);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    let dead = false;
    loadScript().then(() => {
      if (dead || !box.current || !window.turnstile) return;
      id.current = window.turnstile.render(box.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (t: string) => cb.current(t),
        'expired-callback': () => cb.current(''),
        'error-callback': () => cb.current(''),
      });
    }).catch(() => cb.current(''));
    return () => { dead = true; if (id.current && window.turnstile) window.turnstile.remove(id.current); id.current = undefined; };
  }, []);

  useEffect(() => { if (resetKey && id.current && window.turnstile) { cb.current(''); window.turnstile.reset(id.current); } }, [resetKey]);

  return <div ref={box} />;
}
