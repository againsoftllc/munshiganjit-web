import type { Metadata } from 'next';
import Listing from '@/components/Listing';
import { loadFresh } from '@/lib/live';

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  await loadFresh();
  const q = (one((await searchParams).q) || '').trim();
  return { title: (q ? '“' + q + '” — ' : '') + 'Search', robots: { index: false } };
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  await loadFresh();
  const q = (one((await searchParams).q) || '').trim();
  return <Listing key={q} mode="search" initial={{ q }} />;
}
