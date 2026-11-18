import type { Metadata } from 'next';
import PartnerProductsClient from './PartnerProductsClient';

export const metadata: Metadata = { title: 'Partner Prices', robots: { index: false } };

export default function PartnerProductsPage() {
  return <PartnerProductsClient />;
}
