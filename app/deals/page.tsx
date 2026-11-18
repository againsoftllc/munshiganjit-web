import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import DealsClient from './DealsClient';

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export const metadata: Metadata = pageMeta({ title: 'Special Deals', description: 'Time-bound special deals on power banks, earbuds, chargers, cables and gadgets at Munshiganj IT.', path: '/deals' });

export default async function DealsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  return <DealsClient key={one(sp.cat) || ''} initCat={one(sp.cat)} />;
}
