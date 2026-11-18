'use client';
/* Sign in once on this browser so the site shows its "Live Edit" button; then go to the admin's Live Edit. */
import { useState, type FormEvent } from 'react';
import { adminOrigins } from '@/lib/live-edit/embed';

export default function LiveEditLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError('');
    const res = await fetch('/api/live-edit/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: f.get('email'), password: f.get('password') }) }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    if (res?.ok) { window.location.href = adminOrigins()[0] + '/website/live-edit/home'; return; }
    setError(data?.error || 'Could not sign in'); setBusy(false);
  };

  return (
    <div className="wrap" style={{ maxWidth: 420, padding: '48px 16px' }}>
      <h1 style={{ marginBottom: 6 }}>Live Edit</h1>
      <p className="muted" style={{ marginBottom: 18 }}>Sign in with your admin account. A “Live Edit” button then shows on the home and product pages in this browser.</p>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field"><label htmlFor="le-e">E-mail or username</label><input className="input" id="le-e" name="email" autoComplete="username" required /></div>
        <div className="field"><label htmlFor="le-p">Password</label><input className="input" id="le-p" name="password" type="password" autoComplete="current-password" required /></div>
        {error && <p role="alert" style={{ color: '#c0392b', margin: 0 }}>{error}</p>}
        <button className="btn btn-accent btn-block" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
