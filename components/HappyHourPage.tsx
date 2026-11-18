/* The Happy Hour page on the server: the campaign + its products, the page's own title / card and the OfferCatalog schema.
   Used by /happy-hour and by any campaign's own address (app/[slug]). */
import type { Metadata } from 'next';
import HappyHourView from '@/components/HappyHourView';
import JsonLd from '@/components/seo/JsonLd';
import { site } from '@/lib/data';
import { happyHourItems, type HappyHour } from '@/lib/happyHour';
import { getSeoConfig, offerSchema, ogCard } from '@/lib/seo';

const plain = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export function happyHourMeta(hh: HappyHour): Metadata {
  const description = hh.subtitle || plain(hh.description).slice(0, 200) || 'Special prices for a few hours every night at Munshiganj IT.';
  const path = `/${hh.slug}`;
  return {
    title: hh.title,
    description,
    alternates: { canonical: path },
    openGraph: ogCard({ title: hh.title, description, path }, site.name || 'Munshiganj IT'),
    twitter: { card: 'summary_large_image' },
  };
}

export default async function HappyHourPage({ hh }: { hh: HappyHour }) {
  const seo = await getSeoConfig();
  const { items, sections } = happyHourItems(hh);
  const ld = seo.enabled && seo.pages.offers && items.length
    ? offerSchema({ name: hh.title, path: `/${hh.slug}`, description: hh.subtitle || plain(hh.description).slice(0, 200), startISO: hh.startISO || undefined, endISO: hh.endISO || undefined, products: items })
    : [];
  return (
    <>
      <JsonLd data={ld} />
      <HappyHourView
        hh={{ title: hh.title, subtitle: hh.subtitle, description: hh.description, startDate: hh.startDate, endDate: hh.endDate, live: hh.live, countdownISO: hh.countdownISO, dailyStartHour: hh.dailyStartHour, dailyEndHour: hh.dailyEndHour, outletLabel: hh.outletLabel, terms: hh.terms }}
        items={items}
        sections={sections}
      />
    </>
  );
}
