import type { Metadata } from 'next';
import ReviewsClient from './ReviewsClient';

export const metadata: Metadata = {
  title: 'Customer Reviews',
  description: 'What customers say about shopping with Munshiganj IT — latest reviews first.',
};

export default function ReviewsPage() {
  return <ReviewsClient />;
}
