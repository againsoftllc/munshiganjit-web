import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { brandUrl } from '@/lib/format';
import BrandsClient from './BrandsClient';
import { loadFresh } from '@/lib/live';

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  await loadFresh();
  const b = one((await searchParams).brand);
  return { title: b ? `${b} Products Price in Bangladesh` : 'All Brands' };
}

export default async function BrandsPage({ searchParams }: { searchParams: SP }) {
  await loadFresh();
  const brand = one((await searchParams).brand);
  // /brands?brand=Xiaomi -> /xiaomi
  if (brand && !brandUrl(brand).startsWith('/brands')) permanentRedirect(brandUrl(brand));
  return <BrandsClient key={brand || 'all'} brand={brand} />;
}
