import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Listing from '@/components/Listing';
import { categories, categoryTextFor } from '@/lib/data';
import { catUrl, RESERVED } from '@/lib/format';
import { resolveCategory, one, type SP } from '@/lib/catRoute';
import { loadFresh } from '@/lib/live';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  await loadFresh();
  const { slug } = await params;
  const r = resolveCategory(slug);
  if (!r) return { title: 'Not Found' };
  const name = r.cat.name;
  return {
    title: `${name} Price in Bangladesh`,
    description: `Buy ${name} at the best price in Bangladesh from Munshiganj IT — official warranty, EMI and nationwide delivery.`,
    alternates: { canonical: catUrl(r.cat.slug) },
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  await loadFresh();
  const { slug } = await params;
  const r = resolveCategory(slug);
  if (!r) notFound();
  const sp = await searchParams;
  // old links (/category/cameras?sub=DSLR) → SEO path (/category/cameras/dslr)
  const legacySub = one(sp.sub);
  if (legacySub) permanentRedirect(catUrl(r.cat.slug, { sub: legacySub, brand: one(sp.brand) }));
  const initial = { brand: one(sp.brand), stock: one(sp.stock), sort: one(sp.sort) };
  // /category/<slug> -> /<slug> (the filters stay in the query)
  if (!RESERVED.has(r.cat.slug)) {
    const q = new URLSearchParams(Object.entries({ brand: initial.brand, stock: initial.stock, sort: initial.sort }).filter((e): e is [string, string] => !!e[1])).toString();
    permanentRedirect(`/${r.cat.slug}${q ? '?' + q : ''}`);
  }
  return <Listing key={[slug, initial.brand, initial.stock, initial.sort].join('|')} mode="category" catSlug={r.cat.slug} initial={initial} about={categoryTextFor(r.cat)?.description} />;
}
