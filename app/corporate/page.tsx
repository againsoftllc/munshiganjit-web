import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import PageJsonLd from '@/components/seo/PageJsonLd';
import PartnerLanding from '@/components/PartnerLanding';

export const metadata: Metadata = pageMeta({ title: 'Corporate Buyer', description: 'Corporate prices on bulk gadget and accessories orders with VAT invoice, quantity-based pricing and a dedicated account manager.', path: '/corporate' });

export default function CorporatePage() {
  return (
    <>
      <PageJsonLd name={'Corporate Buyer'} path="/corporate" description={'Corporate prices on bulk gadget and accessories orders with VAT invoice, quantity-based pricing and a dedicated account manager.'} />
      <PartnerLanding type="corporate" />
    </>
  );
}
