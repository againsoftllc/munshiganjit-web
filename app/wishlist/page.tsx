import type { Metadata } from 'next';
import WishlistClient from './WishlistClient';

export const metadata: Metadata = { title: 'My Wish List' };

export default function WishlistPage() {
  return <WishlistClient />;
}
