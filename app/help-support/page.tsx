import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import PageJsonLd from '@/components/seo/PageJsonLd';
import FaqClient from './FaqClient';
import { fetchDelivery } from '@/lib/delivery';

export const metadata: Metadata = pageMeta({ title: 'Help & Support — FAQ', description: 'Answers about orders, payment, delivery, EMI, warranty, returns and refunds at Munshiganj IT.', path: '/help-support' });

export default async function FaqPage() {
  const delivery = await fetchDelivery();
  return (
    <>
      <PageJsonLd name={'Help & Support — FAQ'} path="/help-support" description={'Answers about orders, payment, delivery, EMI, warranty, returns and refunds at Munshiganj IT.'} />
      <FaqClient delivery={delivery} />
    </>
  );
}
