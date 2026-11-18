import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import BlogClient from './BlogClient';

export const metadata: Metadata = pageMeta({ title: 'Tech Blog — Buying Guides, Reviews & News', description: 'Buying guides, reviews and tech news for Bangladeshi buyers from the Munshiganj IT team.', path: '/blog' });

export default function BlogPage() {
  return <BlogClient />;
}
