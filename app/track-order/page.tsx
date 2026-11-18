import type { Metadata } from 'next';
import TrackClient from './TrackClient';

export const metadata: Metadata = { title: 'Track Your Order' };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';

export default async function TrackOrderPage({ searchParams }: { searchParams: Promise<{ id?: string | string[]; phone?: string | string[] }> }) {
  const sp = await searchParams;
  const id = one(sp.id), phone = one(sp.phone);
  return <TrackClient key={id + '|' + phone} id={id} phone={phone} />;
}
