import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import CategoriesClient from './CategoriesClient';

export const metadata: Metadata = pageMeta({ title: 'All Categories', description: 'Browse every Munshiganj IT category: power banks, earbuds, chargers, cables, gadgets and more.', path: '/categories' });

export default function CategoriesPage() {
  return <CategoriesClient />;
}
