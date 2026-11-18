import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import PageJsonLd from '@/components/seo/PageJsonLd';
import PolicyClient, { type PolicyPages } from './PolicyClient';
import { getPage, pageDate } from '@/lib/pages';
import { fetchDelivery, fillDelivery } from '@/lib/delivery';

export const metadata: Metadata = pageMeta({ title: 'Policies', description: 'Munshiganj IT return & refund, warranty, EMI, payment, delivery, privacy policies and terms & conditions.', path: '/policy' });

/* tab id -> the page's slug in the admin's Website > Pages */
const SLUGS: Record<string, string> = { returns: 'refund-return', warranty: 'warranty-policy', emi: 'emi-policy', payment: 'payment-methods', delivery: 'shipping-charge', privacy: 'privacy-policy', terms: 'terms' };

export default async function PolicyPage() {
  const ids = Object.keys(SLUGS);
  const [got, delivery] = await Promise.all([Promise.all(ids.map(id => getPage(SLUGS[id]))), fetchDelivery()]);
  const pages: PolicyPages = {};
  const dates: Record<string, string> = {};
  ids.forEach((id, i) => { const p = got[i]; if (p) { pages[id] = { ...p, html: fillDelivery(p.html, delivery) }; dates[id] = pageDate(p.updated); } });
  return (
    <>
      <PageJsonLd name={'Policies'} path="/policy" description={'Munshiganj IT return & refund, warranty, EMI, payment, delivery, privacy policies and terms & conditions.'} />
      <PolicyClient pages={pages} dates={dates} delivery={delivery} />
    </>
  );
}
