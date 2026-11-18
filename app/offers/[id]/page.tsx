import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { offers, byId, site } from '@/lib/data';
import JsonLd from '@/components/seo/JsonLd';
import { getSeoConfig, offerSchema, ogCard } from '@/lib/seo';
import { NO_END, NO_START } from '@/lib/format';
import OfferDetail from './OfferDetail';
import OfferCustom from './OfferCustom';
import { loadFresh } from '@/lib/live';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await loadFresh();
  const { id } = await params;
  const o = offers.find(x => x.id === id);
  if (!o) return { title: 'Offer not found' };
  const seo = await getSeoConfig();
  const siteName = seo.business.name.trim() || site.name || 'Munshiganj IT';
  return { title: o.title, description: o.desc, openGraph: ogCard({ title: o.title, description: o.desc, path: `/offers/${o.id}` }, siteName), twitter: { card: 'summary_large_image' } };
}

export default async function OfferDetailsPage({ params }: Props) {
  await loadFresh();
  const { id } = await params;
  const o = offers.find(x => x.id === id);
  if (!o) notFound();
  if (o.customLink) redirect(o.customLink); // set in the admin: the offer's page is somewhere else
  // Custom: the page is the description written in the admin (an offer of the old list, with no admin data, keeps that page too)
  const seo = await getSeoConfig();
  // the products on offer (the banner's list), with the period the offer runs (an open start / end is left out)
  const on = o.banner.products.map(byId).filter((p): p is NonNullable<ReturnType<typeof byId>> => !!p);
  const start = Date.parse(o.startAt), end = Date.parse(o.endAt);
  const ld = seo.enabled && seo.pages.offers && on.length
    ? offerSchema({ name: o.title, path: `/offers/${o.id}`, description: o.desc, startISO: start > NO_START ? new Date(start).toISOString() : undefined, endISO: end < NO_END ? new Date(end).toISOString() : undefined, products: on })
    : [];
  return (
    <>
      <JsonLd data={ld} />
      {o.mode === 'auto' ? <OfferDetail id={o.id} /> : <OfferCustom id={o.id} />}
    </>
  );
}
