import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import PageJsonLd from '@/components/seo/PageJsonLd';
import ContactClient from './ContactClient';

export const metadata: Metadata = pageMeta({ title: 'Contact Us', description: 'Call 0134-7561290, email, visit our Motalib Plaza, Hatirpool head office, find a sales outlet, or contact our wholesale and reseller desks.', path: '/contact' });

export default function ContactPage() {
  return (
    <>
      <PageJsonLd name={'Contact Us'} path="/contact" description={'Call 0134-7561290, email, visit our Motalib Plaza, Hatirpool head office, find a sales outlet, or contact our wholesale and reseller desks.'} />
      <ContactClient />
    </>
  );
}
