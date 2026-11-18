import type { Metadata } from 'next';
import HappyHourPage, { happyHourMeta } from '@/components/HappyHourPage';
import { NoHappyHour } from '@/components/HappyHourView';
import { getHappyHour } from '@/lib/happyHour';
import { loadFresh } from '@/lib/live';
import { pageMeta } from '@/lib/seo';

/* /happy-hour: the campaign with that address, else the one running now. Any other campaign is served at /<its slug> (app/[slug]). */
export async function generateMetadata(): Promise<Metadata> {
  await loadFresh();
  const hh = await getHappyHour('happy-hour').then(x => x ?? getHappyHour());
  return hh ? happyHourMeta(hh) : pageMeta({ title: 'Happy Hour', description: 'Munshiganj IT Happy Hour: special prices for a few hours every night.', path: '/happy-hour' });
}

export default async function Page() {
  await loadFresh();
  const hh = await getHappyHour('happy-hour').then(x => x ?? getHappyHour());
  return hh ? <HappyHourPage hh={hh} /> : <NoHappyHour />;
}
