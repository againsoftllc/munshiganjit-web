'use client';
/* Offer Details, the Custom kind — StarTech layout: back + "Offer Details", OFFER ENDS IN countdown, banner, title / date range /
   outlet, then the description written in the admin (details, terms and links together), share. No product list.
   An offer of the old list (no description from the admin yet) gets the same page built from its intro, body, terms and links. */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { offers, offerLive, type Offer } from '@/lib/data';
import { dateRange, hasEnd } from '@/lib/format';
import { Crumb, Icon } from '@/components/ui';
import { useStore } from '@/components/store';
import OfferBanner from '@/components/OfferBanner';
import EndsIn from '@/components/EndsIn';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const bold = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
function legacyHtml(o: Offer): string {
  return '<p>' + esc(o.intro) + '</p><p>' + bold(o.body) + '</p>'
    + (o.terms.length ? '<h3>শর্তাবলিঃ</h3><ul>' + o.terms.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' : '')
    + (o.links.length ? '<h4>Click below links to check out our best prices:</h4><ul class="od-links">' + o.links.map(l => '<li><a href="' + esc(l[1]) + '">' + esc(l[0]) + '</a></li>').join('') + '</ul>' : '');
}

export default function OfferCustom({ id }: { id: string }) {
  const o = offers.find(x => x.id === id)!;
  const { toast } = useStore();
  const [ended, setEnded] = useState(false);
  const [url, setUrl] = useState('');
  useEffect(() => { setEnded(!offerLive(o)); setUrl(location.origin + location.pathname); }, [o]);
  const share = (net: 'fb' | 'wa') => window.open(net === 'fb' ? 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) : 'https://wa.me/?text=' + encodeURIComponent(o.title + ' — ' + url), '_blank', 'noopener');
  const html = o.descHtml ?? legacyHtml(o);

  return (
    <>
      <Crumb items={[['Offer', '/offers'], [o.title]]} />
      <section className="band">
        <div className="wrap">
          <article className="od">
            <div className="od-top">
              <Link href="/offers" className="od-back" aria-label="Back to offers"><Icon name="left" size={20} /></Link>
              <h1>Offer Details</h1>
              {!ended ? (hasEnd(o.endAt) ? <EndsIn label="OFFER ENDS IN" end={Date.parse(o.endAt)} onEnd={() => setEnded(true)} /> : <span />) : <span className="od-over">This offer has ended</span>}
            </div>
            <OfferBanner o={o} large />
            <h2 className="od-title">{o.title}</h2>
            <div className="of-meta od-meta">
              {dateRange(o.startAt, o.endAt) ? <span><Icon name="calendar" size={16} />{dateRange(o.startAt, o.endAt)}</span> : <span />}
              <span><Icon name="store" size={16} />{o.outlet}</span>
            </div>
            <div className="od-body" dangerouslySetInnerHTML={{ __html: html }} />
            <div className="od-share">
              <b>Share:</b>
              <button aria-label="Share on Facebook" onClick={() => share('fb')}><Icon name="facebook" size={18} /></button>
              <button aria-label="Share on WhatsApp" onClick={() => share('wa')}><Icon name="whatsapp" size={18} /></button>
              <button aria-label="Copy link" onClick={() => { navigator.clipboard?.writeText(url); toast('Offer link copied', 'copy'); }}><Icon name="copy" size={18} /></button>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
