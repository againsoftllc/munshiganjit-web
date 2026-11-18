import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Listing from '@/components/Listing';
import { categoryTextFor } from '@/lib/data';
import { catUrl } from '@/lib/format';
import { resolveCategory, one, type SP } from '@/lib/catRoute';
import { loadFresh } from '@/lib/live';

type Params = Promise<{ slug: string; sub: string; brand: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  await loadFresh();
  const { slug, sub, brand } = await params;
  const r = resolveCategory(slug, sub, brand);
  if (!r?.sub || !r.brand) return { title: 'Not Found' };
  return {
    title: `${r.brand} ${r.sub} Price in Bangladesh`,
    description: `Buy ${r.brand} ${r.sub} at the best price in Bangladesh from Munshiganj IT — official warranty, EMI and nationwide delivery.`,
    alternates: { canonical: catUrl(r.cat.slug, { sub: r.sub, brand: r.brand }) },
  };
}

export default async function SubCategoryBrandPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  await loadFresh();
  const { slug, sub, brand } = await params;
  const r = resolveCategory(slug, sub, brand);
  if (!r?.sub || !r.brand) notFound();
  // a sub-category is its own address now (and a brand is a sub-category): /category/a/b/c -> /b-slug
  const flat = catUrl(r.cat.slug, { sub: r.sub });
  if (!flat.startsWith('/category/')) permanentRedirect(flat);
  const sp = await searchParams;
  const initial = { sub: r.sub, brand: r.brand, stock: one(sp.stock), sort: one(sp.sort) };
  return <Listing key={[slug, sub, brand, initial.stock, initial.sort].join('|')} mode="category" catSlug={r.cat.slug} initial={initial} about={categoryTextFor(r.cat, r.sub, r.brand)?.description} />;
}
