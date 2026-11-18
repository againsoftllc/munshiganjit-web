/* The AgainERP API calls this after the admin saves something, so the next request fetches fresh data.
   POST with header  x-revalidate-secret: <REVALIDATE_SECRET>  */
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { DATA_TAG } from '@/lib/live';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get('x-revalidate-secret') !== secret) return NextResponse.json({ ok: false }, { status: 401 });
  revalidateTag(DATA_TAG);
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
