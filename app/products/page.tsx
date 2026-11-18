import type { Metadata } from 'next';
import Listing from '@/components/Listing';
import { loadFresh } from '@/lib/live';

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

async function read(searchParams: SP) {
  const sp = await searchParams;
  return { stock: one(sp.stock), brand: one(sp.brand), sort: one(sp.sort), deals: !!one(sp.deals) };
}
const titleFor = (i: { stock?: string; brand?: string; deals?: boolean }) =>
  i.deals ? 'Offers & Deals' : i.stock === 'preorder' ? 'Pre Order' : i.brand ? i.brand : 'All Products';

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  await loadFresh();
  const t = titleFor(await read(searchParams));
  return { title: `${t} Price in Bangladesh` };
}

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  await loadFresh();
  const initial = await read(searchParams);
  return <Listing key={[initial.stock, initial.brand, initial.sort, initial.deals].join('|')} mode="all" initial={initial} />;
}
