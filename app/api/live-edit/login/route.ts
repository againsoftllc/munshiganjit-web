/* Live Edit sign-in with an AgainERP admin account (e-mail or username + password). The credentials are only
   checked against the admin API; nothing but the harmless "editor" marker cookie is kept, which makes the
   "Live Edit" button show on this browser. Editing still needs the admin site's own sign-in. */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { LIVE_EDIT_MARKER_COOKIE } from '@/lib/live-edit/cookie';

export const dynamic = 'force-dynamic';
const API = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_AGAINERP_API || process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim() ?? '';
  const password = body?.password ?? '';
  if (!email || !password) return NextResponse.json({ error: 'Enter your admin e-mail and password' }, { status: 400 });
  if (!API) return NextResponse.json({ error: 'The admin API is not configured' }, { status: 502 });

  let res: Response;
  try {
    res = await fetch(`${API}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }), cache: 'no-store' });
  } catch {
    return NextResponse.json({ error: 'The admin API is not reachable' }, { status: 502 });
  }
  const data = (await res.json().catch(() => null)) as { token?: string; detail?: string } | null;
  if (!res.ok || !data?.token) return NextResponse.json({ error: typeof data?.detail === 'string' ? data.detail : 'Wrong e-mail or password' }, { status: 401 });

  (await cookies()).set(LIVE_EDIT_MARKER_COOKIE, '1', { httpOnly: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 8 * 60 * 60 });
  return NextResponse.json({ ok: true });
}

/** sign out of Live Edit on this browser (the button goes away) */
export async function DELETE() {
  (await cookies()).delete(LIVE_EDIT_MARKER_COOKIE);
  return NextResponse.json({ ok: true });
}
