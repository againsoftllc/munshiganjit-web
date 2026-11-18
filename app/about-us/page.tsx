import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import PageJsonLd from '@/components/seo/PageJsonLd';
import AboutClient from './AboutClient';

export const metadata: Metadata = pageMeta({ title: 'About Us', description: 'Munshiganj IT is a Bangladeshi technology retailer: genuine products, honest prices, official warranty and nationwide support. Authorized distributor of Hoco and Acefast.', path: '/about-us' });

export default function AboutPage() {
  return (
    <>
      <PageJsonLd name={'About Us'} path="/about-us" description={'Munshiganj IT is a Bangladeshi technology retailer: genuine products, honest prices, official warranty and nationwide support. Authorized distributor of Hoco and Acefast.'} />
      <AboutClient />
    </>
  );
}
