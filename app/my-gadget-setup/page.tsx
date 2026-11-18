import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import GadgetSetupClient from './GadgetSetupClient';

export const metadata: Metadata = pageMeta({ title: 'My Gadget Setup', description: 'Choose gadgets and accessories compatible with your mobile phone brand and model — power banks, chargers, cables, converters and card readers.', path: '/my-gadget-setup' });

export default function Page() {
  return <GadgetSetupClient />;
}
