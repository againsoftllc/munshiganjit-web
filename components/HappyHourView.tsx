'use client';
/* Happy Hour page, laid out like Offer Details and the Deals page: an info box on top (title, red subtitle, details, the nightly window, the
   countdown: HAPPY HOUR ENDS IN while tonight's window is open, STARTS IN until it opens), then the campaign's products with their filters
   (the same shelf as the Deals page; section tabs above it when the campaign has more than one) and the terms at the bottom. */
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/data';
import { Crumb, Icon } from '@/components/ui';
import EndsIn from '@/components/EndsIn';
import ProductShelf from '@/components/ProductShelf';

export interface HappyHourData {
  title: string; subtitle: string; description: string; startDate: string; endDate: string; live: boolean; countdownISO: string;
  dailyStartHour: number; dailyEndHour: number; outletLabel: string; terms: string[];
}

/** 22 -> "10:00 PM", 24 -> "12:00 AM" */
const hour = (h: number) => `${(h % 24) % 12 || 12}:00 ${(h % 24) >= 12 ? 'PM' : 'AM'}`;

/** how the window reads, from its own hours: 10 PM - 12 AM is "Every night", 10 AM - 12 AM is "Every day", a whole day is "All day" */
function windowText(start: number, end: number): string {
  if (start % 24 === 0 && end >= 24) return 'Every day, all day';
  const night = start >= 18 || start < 5; // it opens in the evening / after midnight
  return `${night ? 'Every night' : 'Every day'} ${hour(start)} – ${hour(end)}`;
}

/** "today" / "tomorrow" for a moment, by the Bangladesh calendar (so the opening time reads right whatever the visitor's clock says) */
function dayWord(iso: string): string {
  const t = new Date(iso);
  if (isNaN(+t)) return '';
  const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(d);
  if (day(t) === day(new Date())) return 'today ';
  return day(t) === day(new Date(Date.now() + 86_400_000)) ? 'tomorrow ' : '';
}

export default function HappyHourView({ hh, items, sections }: { hh: HappyHourData; items: Product[]; sections: { key: string; label: string; ids: string[] }[] }) {
  const router = useRouter();
  const [tab, setTab] = useState('');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // when the countdown reaches 0 the window has opened / closed: read the page again (twice, as the data cache lasts 10 s)
  const refresh = () => { timers.current.push(window.setTimeout(() => router.refresh(), 1500), window.setTimeout(() => router.refresh(), 11500)); };

  const end = Date.parse(hh.countdownISO);
  const shown = useMemo(() => {
    const s = sections.find(x => x.key === tab);
    if (!s) return items;
    const keep = new Set(s.ids);
    return items.filter(p => keep.has(p.id));
  }, [items, sections, tab]);

  return (
    <>
      <Crumb items={[['Happy Hour']]} />
      <section className="band">
        <div className="wrap">
          <div className="dl-head hh-head">
            <span className={'hh-badge ' + (hh.live ? 'live' : 'soon')}>
              <Icon name="bolt" size={13} />{hh.live ? `Live now · closes at ${hour(hh.dailyEndHour)}` : `Opens ${dayWord(hh.countdownISO)}at ${hour(hh.dailyStartHour)}`}
            </span>
            <h1>{hh.title}</h1>
            {hh.subtitle && <p className="dl-tag">{hh.subtitle}</p>}
            {hh.description && <div className="dl-body" dangerouslySetInnerHTML={{ __html: hh.description }} />}
            <div className="hh-meta">
              <span><Icon name="clock" size={15} />{windowText(hh.dailyStartHour, hh.dailyEndHour)}</span>
              {hh.startDate && hh.endDate && <span><Icon name="calendar" size={15} />{hh.startDate} – {hh.endDate}</span>}
              {hh.outletLabel && <span><Icon name="store" size={15} />{hh.outletLabel}</span>}
            </div>
            {Number.isFinite(end) && <EndsIn className="dl-ends" label={hh.live ? 'HAPPY HOUR ENDS IN' : 'HAPPY HOUR STARTS IN'} end={end} onEnd={refresh} />}
            {!hh.live && <p className="hh-note">The prices below are the regular prices. The Happy Hour prices apply from {hour(hh.dailyStartHour)} to {hour(hh.dailyEndHour)}.</p>}
          </div>

          {items.length > 0 ? (
            <>
              {sections.length > 1 && (
                <div className="hh-tabs" role="tablist" aria-label="Happy Hour sections">
                  <button role="tab" aria-selected={!tab} className={!tab ? 'on' : ''} onClick={() => setTab('')}>All <em>{items.length}</em></button>
                  {sections.map(s => <button key={s.key} role="tab" aria-selected={tab === s.key} className={tab === s.key ? 'on' : ''} onClick={() => setTab(s.key)}>{s.label} <em>{s.ids.length}</em></button>)}
                </div>
              )}
              <ProductShelf
                key={tab}
                items={shown}
                sortBySaving
                heading={sections.find(s => s.key === tab)?.label || 'Happy Hour Deals'}
                blurb={n => <>{hh.live ? 'Happy Hour prices are on right now!' : 'Happy Hour products.'} <b>{n}</b> product{n === 1 ? '' : 's'}</>}
                allLabel="All Products"
                noneTitle="No products here"
                noneHint="Try another category or discount range."
                noneButton="Show all products"
              />
            </>
          ) : (
            <div className="dl-head hh-none"><h2>No products in this Happy Hour yet</h2><p className="dl-tag">Please check back soon, or see our latest offers.</p><Link className="btn btn-brand" href="/offers">See Offers</Link></div>
          )}

          {hh.terms.length > 0 && (
            <div className="dl-head od-terms-box">
              <div className="od-terms"><b>শর্তাবলিঃ</b><ul>{hh.terms.map(t => <li key={t}>{t}</li>)}</ul></div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/** No campaign is running */
export function NoHappyHour() {
  return (
    <>
      <Crumb items={[['Happy Hour']]} />
      <section className="band"><div className="wrap">
        <div className="dl-head"><h1>No Happy Hour is running right now</h1><p className="dl-tag">The next Happy Hour is coming soon. Meanwhile see our latest offers.</p>
          <Link className="btn btn-brand" href="/offers">See Offers</Link></div>
      </div></section>
    </>
  );
}
