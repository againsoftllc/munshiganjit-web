import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import ProductDetail from '@/components/ProductDetail';
import { products, byId, detailsOf } from '@/lib/data';
import { loadFresh } from '@/lib/live';
import { RESERVED } from '@/lib/format';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  await loadFresh();
  const p = byId((await params).id);
  if (!p) return { title: 'Not Found' };
  const d = detailsOf(p.id);
  return { title: d.seoTitle || p.name, description: d.seoDesc || undefined };
}

export default async function ProductPage({ params }: { params: Params }) {
  await loadFresh();
  const { id } = await params;
  if (!byId(id)) notFound();
  // /product/<slug> -> /<slug>
  if (!RESERVED.has(id)) permanentRedirect(`/${id}`);
  return <ProductDetail key={id} id={id} />;
}
