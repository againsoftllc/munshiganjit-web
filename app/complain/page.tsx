import type { Metadata } from 'next';
import ComplainClient from './ComplainClient';

export const metadata: Metadata = {
  title: 'Complain & Feedback',
  description: 'Share a complaint or feedback with Munshiganj IT. Our team will review it and follow up as soon as possible.',
};

export default function ComplainPage() {
  return <ComplainClient />;
}
