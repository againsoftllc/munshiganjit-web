import type { Metadata } from 'next';
import CompareClient from './CompareClient';

export const metadata: Metadata = {
  title: 'Product Comparison',
  description: 'Find and select products to see the differences and similarities between them.',
};

export default function ComparePage() {
  return <CompareClient />;
}
