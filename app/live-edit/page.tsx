import type { Metadata } from 'next';
import LiveEditLogin from './LiveEditLogin';

export const metadata: Metadata = { title: 'Live Edit', robots: { index: false, follow: false } };

export default function Page() {
  return <LiveEditLogin />;
}
