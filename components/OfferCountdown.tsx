'use client';
/* "OFFER ENDS IN" on a product that has a live offer. When it reaches 0 the offer is over: the page reads the data again (a few times, as the
   catalog data is cached for a short while) so the price goes back to the regular one by itself. */
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import EndsIn from '@/components/EndsIn';

export default function OfferCountdown({ end, label = 'OFFER ENDS IN' }: { end: string; label?: string }) {
  const router = useRouter();
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const t = Date.parse(end);
  if (!Number.isFinite(t)) return null;
  return (
    <EndsIn
      className="pd-offer-ends"
      label={label}
      end={t}
      onEnd={() => { timers.current.push(...[2000, 15000, 45000].map(ms => window.setTimeout(() => router.refresh(), ms))); }}
    />
  );
}
