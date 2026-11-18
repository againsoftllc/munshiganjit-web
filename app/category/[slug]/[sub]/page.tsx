import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Listing from '@/components/Listing';
import { categories, categoryTextFor } from '@/lib/data';
import { catUrl, slugify } from '@/lib/format';
import { resolveCategory, one, type SP } from '@/lib/catRoute';
import { loadFresh } from '@/lib/live';

type Params = Promise<{ slug: string; sub: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  await loadFresh();
  const { slug, sub } = await params;
  const r = resolveCategory(slug, sub);
  if (!r?.sub) return { title: 'Not Found' };
  return {
    title: `${r.sub} Price in Bangladesh`,
    description: `Buy ${r.sub} (${r.cat.name}) at the best price in Bangladesh from Munshiganj IT — official warranty, EMI and nationwide delivery.`,
    alternates: { canonical: catUrl(r.cat.slug, { sub: r.sub }) },
  };
}

export default async function SubCategoryPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  await loadFresh();
  const { slug, sub } = await params;
  const r = resolveCategory(slug, sub);
  if (!r?.sub) notFound();
  // /category/earbuds/hoco-earbuds (or the older /category/earbuds/hoco) -> /hoco-earbuds
  const canonical = catUrl(r.cat.slug, { sub: r.sub });
  if (canonical !== `/category/${slug}/${sub}`) permanentRedirect(canonical);
  const sp = await searchParams;
  const initial = { sub: r.sub, stock: one(sp.stock), sort: one(sp.sort) };
  return <Listing key={[slug, sub, initial.stock, initial.sort].join('|')} mode="category" catSlug={r.cat.slug} initial={initial} about={categoryTextFor(r.cat, r.sub)?.description} />;
}
