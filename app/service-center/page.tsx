import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import PageJsonLd from '@/components/seo/PageJsonLd';
import ServiceClient from './ServiceClient';

export const metadata: Metadata = pageMeta({ title: 'Service Center', description: 'Warranty claims and repairs at the Munshiganj IT Service Center, Motalib Plaza, Hatirpool, Dhaka. Courier pickup from outside Dhaka.', path: '/service-center' });

export default function ServiceCenterPage() {
  return (
    <>
      <PageJsonLd name={'Service Center'} path="/service-center" description={'Warranty claims and repairs at the Munshiganj IT Service Center, Motalib Plaza, Hatirpool, Dhaka. Courier pickup from outside Dhaka.'} />
      <ServiceClient />
    </>
  );
}
