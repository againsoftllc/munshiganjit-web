import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import Link from 'next/link';
import { offers, offerLive } from '@/lib/data';
import { dateRange } from '@/lib/format';
import { Crumb, Icon } from '@/components/ui';
import OfferBanner from '@/components/OfferBanner';

export const metadata: Metadata = pageMeta({ title: 'Latest Offers', description: 'All running Munshiganj IT offers — Mega Tech Fest, gaming monitor deals, PC build gifts and more.', path: '/offers' });

// offers switch off by themselves at endAt (StarTech) — re-check every minute

export default function OffersPage() {
  const live = offers.filter(o => o.showInList !== false && offerLive(o)).sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt));
  return (
    <>
      <Crumb items={[['Offer']]} />
      <section className="band">
        <div className="wrap">
          {live.length === 0 && <div className="brands-hint"><Icon name="tag" size={18} />No offers are running right now. Check our <Link href="/deals">Deals</Link>.</div>}
          <div className="of-grid">
            {live.map(o => (
              <article key={o.id} className="of-card">
                <Link href={o.customLink || '/offers/' + o.id} className="of-art"><OfferBanner o={o} /></Link>
                <div className="of-meta">
                  {dateRange(o.startAt, o.endAt) ? <span><Icon name="calendar" size={16} />{dateRange(o.startAt, o.endAt)}</span> : <span />}
                  <span><Icon name="store" size={16} />{o.outlet}</span>
                </div>
                <h2 className="of-title">{o.title}</h2>
                <p className="of-desc">{o.desc}</p>
                <Link className="btn btn-brand of-btn" href={o.customLink || '/offers/' + o.id}>View Details</Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
