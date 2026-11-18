import type { Metadata } from 'next';
import PartnerClient from './PartnerClient';

export const metadata: Metadata = { title: 'Partner Account', robots: { index: false } };

export default function PartnerPage() {
  return <PartnerClient />;
}
