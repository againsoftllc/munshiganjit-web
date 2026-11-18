/* After the admin's Live Edit saves the home page, the page asks for its data to be fetched again right away
   (not when the 10 s data cache expires). Purges cached data only, never changes anything: the call must come
   from this site's own pages (same Origin plus a custom header, which a browser will not send across sites)
   and runs at most once every two seconds. */
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { DATA_TAG } from '@/lib/live';

export const dynamic = 'force-dynamic';
let lastRun = 0;

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('x-live-edit') !== '1') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }
  if (Date.now() - lastRun < 2000) return NextResponse.json({ ok: true, skipped: true });
  lastRun = Date.now();
  revalidateTag(DATA_TAG);
  return NextResponse.json({ ok: true });
}
