import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import PageJsonLd from '@/components/seo/PageJsonLd';
import ResellerClient from './ResellerClient';

export const metadata: Metadata = pageMeta({ title: 'Become a Reseller', description: 'Run a computer shop? Apply as an Munshiganj IT reseller for dealer pricing, priority stock and marketing support.', path: '/reseller' });

export default function ResellerPage() {
  return (
    <>
      <PageJsonLd name={'Become a Reseller'} path="/reseller" description={'Run a computer shop? Apply as an Munshiganj IT reseller for dealer pricing, priority stock and marketing support.'} />
      <ResellerClient />
    </>
  );
}
